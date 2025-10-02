import { UndergroundBelt, type BeltTier } from "../belts.js"
import { Impassable } from "../entity.js"
import { directionAxis, getPositionOnRay, type Ray } from "../geometry.js"
import { type TileHistory } from "../simulated_world.js"
import type { World } from "../world.js"
import {
  Action,
  ActionError,
  DragDirection,
  directionMultiplier,
  swapIfBackwards,
} from "./action.js"
import { TileClassifier } from "./tile_classification.js"
import { DragWorldView } from "./world_view.js"

export class DragStepResult {
  constructor(
    public action: Action,
    public error: ActionError | undefined,
    public nextState: DragState,
  ) {}
}

export type DragState =
  | { type: "OverBelt" }
  | { type: "OverSplitter" }
  | {
      type: "BuildingUnderground"
      inputPos: number
      outputPos: number | undefined
      direction: DragDirection
    }
  | { type: "PassThrough"; leftPos: number; rightPos: number }
  | { type: "OverImpassable"; direction: DragDirection }
  | { type: "ErrorRecovery" }

export const DragState = {
  OverBelt: (): DragState => ({ type: "OverBelt" }),
  OverSplitter: (): DragState => ({ type: "OverSplitter" }),
  BuildingUnderground: (
    inputPos: number,
    outputPos: number | undefined,
    direction: DragDirection,
  ): DragState => ({
    type: "BuildingUnderground",
    inputPos,
    outputPos,
    direction,
  }),
  PassThrough: (leftPos: number, rightPos: number): DragState => ({
    type: "PassThrough",
    leftPos,
    rightPos,
  }),
  OverImpassable: (direction: DragDirection): DragState => ({
    type: "OverImpassable",
    direction,
  }),
  ErrorRecovery: (): DragState => ({ type: "ErrorRecovery" }),

  initialState: (successfulPlacement: boolean): DragState => {
    return successfulPlacement
      ? DragState.OverBelt()
      : DragState.ErrorRecovery()
  },
}

type DragEndShape =
  | { type: "Belt" }
  | { type: "IntegratedOutput" }
  | { type: "ExtendableUnderground"; inputPos: number }
  | {
      type: "TraversingObstacle"
      inputPos: number
      outputPos: number | undefined
    }
  | { type: "Error" }

const DragEndShape = {
  Belt: (): DragEndShape => ({ type: "Belt" }),
  IntegratedOutput: (): DragEndShape => ({ type: "IntegratedOutput" }),
  ExtendableUnderground: (inputPos: number): DragEndShape => ({
    type: "ExtendableUnderground",
    inputPos,
  }),
  TraversingObstacle: (
    inputPos: number,
    outputPos: number | undefined,
  ): DragEndShape => ({
    type: "TraversingObstacle",
    inputPos,
    outputPos,
  }),
  Error: (): DragEndShape => ({ type: "Error" }),
}

export interface DragContext {
  world: World
  ray: Ray
  tier: BeltTier
  lastPosition: number
  tileHistory: TileHistory | undefined
}

export function takeStep(
  state: DragState,
  ctx: DragContext,
  direction: DragDirection,
): DragStepResult {
  const dragEnd = getDragEnd(state, ctx.lastPosition, direction)
  if (dragEnd === undefined) {
    return new DragStepResult(Action.None(), undefined, state)
  }

  const worldView = new DragWorldView(
    ctx.world,
    ctx.ray,
    ctx.tileHistory,
    direction,
  )

  const nextTile = new TileClassifier(
    ctx,
    direction,
    canEnterNextTile(dragEnd),
    undergroundInputPos(dragEnd, ctx.lastPosition),
  ).classifyNextTile()

  switch (nextTile) {
    case "Usable":
      return placeBeltOrUnderground(dragEnd, ctx, direction)
    case "Obstacle":
      return handleObstacle(dragEnd, ctx, direction)
    case "IntegratedSplitter":
      return new DragStepResult(
        Action.IntegrateSplitter(),
        undefined,
        DragState.OverSplitter(),
      )
    case "ImpassableObstacle":
      return handleImpassableObstacle(dragEnd, direction)
    case "IntegratedUnderground": {
      const nextPosition = ctx.lastPosition + directionMultiplier(direction)
      const entity = worldView.getEntity(nextPosition)
      if (!(entity instanceof UndergroundBelt)) {
        throw new Error("Expected UndergroundBelt for IntegratedUnderground")
      }
      const outputPos = worldView.getUgPairPos(nextPosition, entity)
      if (outputPos === undefined) {
        throw new Error("Expected paired underground for IntegratedUnderground")
      }
      return integrateUndergroundPair(ctx, direction, outputPos)
    }
  }
}

export function deferredError(
  state: DragState,
  direction: DragDirection,
): ActionError | undefined {
  if (state.type === "OverImpassable" && state.direction === direction) {
    return ActionError.CannotTraversePastEntity
  }
  return undefined
}

function getDragEnd(
  state: DragState,
  lastPosition: number,
  direction: DragDirection,
): DragEndShape | undefined {
  switch (state.type) {
    case "OverBelt":
      return DragEndShape.Belt()
    case "OverSplitter":
      return DragEndShape.IntegratedOutput()
    case "OverImpassable":
    case "ErrorRecovery":
      return DragEndShape.Error()
    case "BuildingUnderground": {
      const { inputPos, outputPos, direction: lastDir } = state
      if (direction !== lastDir) {
        if (outputPos !== undefined) {
          return lastPosition === inputPos
            ? DragEndShape.IntegratedOutput()
            : undefined
        } else {
          const nextPosition = lastPosition + directionMultiplier(direction)
          return nextPosition === inputPos ? DragEndShape.Belt() : undefined
        }
      } else if (outputPos === lastPosition) {
        return DragEndShape.ExtendableUnderground(inputPos)
      } else {
        return DragEndShape.TraversingObstacle(inputPos, outputPos)
      }
    }
    case "PassThrough": {
      const { leftPos, rightPos } = state
      const inBetween =
        direction === DragDirection.Forward
          ? lastPosition < rightPos
          : lastPosition > leftPos
      return inBetween ? undefined : DragEndShape.IntegratedOutput()
    }
  }
}

function canEnterNextTile(dragEnd: DragEndShape): boolean {
  return dragEnd.type !== "TraversingObstacle"
}

function undergroundInputPos(
  dragEnd: DragEndShape,
  lastPosition: number,
): number | undefined {
  switch (dragEnd.type) {
    case "Belt":
      return lastPosition
    case "ExtendableUnderground":
      return dragEnd.inputPos
    case "TraversingObstacle":
      return dragEnd.inputPos
    default:
      return undefined
  }
}

function placeBeltOrUnderground(
  dragEnd: DragEndShape,
  ctx: DragContext,
  direction: DragDirection,
): DragStepResult {
  if (dragEnd.type === "TraversingObstacle") {
    return placeUnderground(ctx, direction, dragEnd.inputPos, dragEnd.outputPos)
  } else {
    return new DragStepResult(
      Action.PlaceBelt(),
      undefined,
      DragState.OverBelt(),
    )
  }
}

function handleObstacle(
  dragEnd: DragEndShape,
  ctx: DragContext,
  direction: DragDirection,
): DragStepResult {
  let newState: DragState
  let error: ActionError | undefined = undefined

  switch (dragEnd.type) {
    case "Belt":
      newState = DragState.BuildingUnderground(
        ctx.lastPosition,
        undefined,
        direction,
      )
      break
    case "ExtendableUnderground":
      newState = DragState.BuildingUnderground(
        dragEnd.inputPos,
        ctx.lastPosition,
        direction,
      )
      break
    case "TraversingObstacle":
      newState = DragState.BuildingUnderground(
        dragEnd.inputPos,
        dragEnd.outputPos,
        direction,
      )
      break
    case "IntegratedOutput":
      error = ActionError.EntityInTheWay
      newState = DragState.ErrorRecovery()
      break
    case "Error":
      newState = DragState.ErrorRecovery()
      break
  }

  return new DragStepResult(Action.None(), error, newState)
}

function handleImpassableObstacle(
  dragEnd: DragEndShape,
  direction: DragDirection,
): DragStepResult {
  const nextState =
    dragEnd.type === "Error"
      ? DragState.ErrorRecovery()
      : DragState.OverImpassable(direction)
  return new DragStepResult(Action.None(), undefined, nextState)
}

function placeUnderground(
  ctx: DragContext,
  direction: DragDirection,
  inputPos: number,
  lastOutputPos: number | undefined,
): DragStepResult {
  const nextPosition = ctx.lastPosition + directionMultiplier(direction)
  const isExtension = lastOutputPos !== undefined

  const error = canBuildUnderground(ctx, inputPos, direction, isExtension)

  if (error !== undefined) {
    return new DragStepResult(Action.PlaceBelt(), error, DragState.OverBelt())
  }

  const action =
    lastOutputPos !== undefined
      ? Action.ExtendUnderground(lastOutputPos, nextPosition)
      : Action.CreateUnderground(inputPos, nextPosition)

  return new DragStepResult(
    action,
    undefined,
    DragState.BuildingUnderground(inputPos, nextPosition, direction),
  )
}

function integrateUndergroundPair(
  ctx: DragContext,
  direction: DragDirection,
  outputPos: number,
): DragStepResult {
  const canUpgrade = canUpgradeUnderground(ctx, direction, outputPos)
  const action = Action.IntegrateUndergroundPair(canUpgrade)
  const error = canUpgrade ? undefined : ActionError.CannotUpgradeUnderground

  const nextPos = ctx.lastPosition + directionMultiplier(direction)
  const [leftPos, rightPos] = swapIfBackwards(direction, nextPos, outputPos)

  return new DragStepResult(
    action,
    error,
    DragState.PassThrough(leftPos, rightPos),
  )
}

function canBuildUnderground(
  ctx: DragContext,
  inputPos: number,
  direction: DragDirection,
  isExtension: boolean,
): ActionError | undefined {
  const outputPos = ctx.lastPosition + directionMultiplier(direction)
  const distance = Math.abs(outputPos - inputPos)

  if (distance > ctx.tier.undergroundDistance) {
    return ActionError.TooFarToConnect
  }

  const startPos = isExtension ? ctx.lastPosition : inputPos
  const checkPos = (pos: number): ActionError | undefined => {
    const worldPos = getPositionOnRay(ctx.ray, pos)
    const entity = ctx.world.get(worldPos)

    if (!entity) {
      return undefined
    }

    if (entity instanceof Impassable) {
      return ActionError.CannotTraversePastTile
    }

    if (entity instanceof UndergroundBelt) {
      const entityAxis = directionAxis(entity.direction)
      const rayAxis = directionAxis(ctx.ray.direction)

      if (entityAxis === rayAxis && entity.tier === ctx.tier) {
        return ActionError.CannotTraversePastEntity
      }
    }

    return undefined
  }

  if (direction === DragDirection.Forward) {
    for (let pos = startPos + 1; pos <= outputPos - 1; pos++) {
      const error = checkPos(pos)
      if (error !== undefined) {
        return error
      }
    }
  } else {
    for (let pos = startPos; pos >= outputPos + 1; pos--) {
      const error = checkPos(pos)
      if (error !== undefined) {
        return error
      }
    }
  }

  return undefined
}

function canUpgradeUnderground(
  ctx: DragContext,
  direction: DragDirection,
  outputPos: number,
): boolean {
  const inputPos = ctx.lastPosition + directionMultiplier(direction)

  if (Math.abs(outputPos - inputPos) > ctx.tier.undergroundDistance) {
    return false
  }

  const start = Math.min(inputPos, outputPos) + 1
  const end = Math.max(inputPos, outputPos) - 1

  for (let pos = start; pos <= end; pos++) {
    const worldPos = getPositionOnRay(ctx.ray, pos)
    const entity = ctx.world.get(worldPos)

    if (entity instanceof UndergroundBelt) {
      const entityAxis = directionAxis(entity.direction)
      const rayAxis = directionAxis(ctx.ray.direction)

      if (entityAxis === rayAxis && entity.tier === ctx.tier) {
        return false
      }
    }
  }

  return true
}
