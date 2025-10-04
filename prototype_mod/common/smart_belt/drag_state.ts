import { ImpassableTile, UndergroundBelt, type BeltTier } from "../belts"
import { directionAxis, getRayPosition, type Ray } from "../geometry"
import type { World } from "../world"
import { Action, ActionError } from "./action"
import {
  directionMultiplier,
  DragDirection,
  swapIfBackwards,
} from "./DragDirection"
import { TileClassifier } from "./tile_classification"
import type { TileHistory } from "./tile_history_view"
import { DragWorldView } from "./world_view"

export type DragStepResult = [
  action: Action,
  nextState: DragState,
  error?: ActionError,
]

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
  tileHistory: TileHistory[]
  furthestPlacementPos: number
}

export function takeStep(
  state: DragState,
  ctx: DragContext,
  direction: DragDirection,
): DragStepResult {
  const dragEnd = getDragEnd(state, ctx.lastPosition, direction)
  if (dragEnd === undefined) {
    return [Action.None(), state]
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
      return [Action.IntegrateSplitter(), DragState.OverSplitter()]
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
    return [Action.PlaceBelt(), DragState.OverBelt()]
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

  return [Action.None(), newState, error]
}

function handleImpassableObstacle(
  dragEnd: DragEndShape,
  direction: DragDirection,
): DragStepResult {
  const nextState =
    dragEnd.type === "Error"
      ? DragState.ErrorRecovery()
      : DragState.OverImpassable(direction)
  return [Action.None(), nextState]
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
    return [Action.PlaceBelt(), DragState.OverBelt(), error]
  }

  const action =
    lastOutputPos !== undefined
      ? Action.ExtendUnderground(lastOutputPos, nextPosition)
      : Action.CreateUnderground(inputPos, nextPosition)

  return [
    action,
    DragState.BuildingUnderground(inputPos, nextPosition, direction),
  ]
}

function integrateUndergroundPair(
  ctx: DragContext,
  direction: DragDirection,
  outputPos: number,
): DragStepResult {
  const action = Action.IntegrateUndergroundPair()

  const inputPos = ctx.lastPosition + directionMultiplier(direction)
  const [leftPos, rightPos] = swapIfBackwards(direction, inputPos, outputPos)

  if (outputPos === ctx.furthestPlacementPos) {
    // This is an ug we placed (probably)! Extend instead of integrate.
    return [
      action,
      DragState.BuildingUnderground(inputPos, outputPos, direction),
    ]
  } else {
    return [action, DragState.PassThrough(leftPos, rightPos)]
  }
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
    const worldPos = getRayPosition(ctx.ray, pos)
    const entity = ctx.world.get(worldPos)

    if (!entity) {
      return undefined
    }

    if (entity instanceof ImpassableTile) {
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
