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
  error: ActionError | undefined,
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
  | { type: "OverImpassableObstacle"; direction: DragDirection }
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
  OverImpassableObstacle: (direction: DragDirection): DragEndShape => ({
    type: "OverImpassableObstacle",
    direction,
  }),
  Error: (): DragEndShape => ({ type: "Error" }),
}

export interface DragContext {
  world: World
  ray: Ray
  tier: BeltTier
  lastPosition: number
  nextPosition: number
  tileHistory: TileHistory[]
  furthestPlacementPos: number
  direction: DragDirection
}

export function takeStep(state: DragState, ctx: DragContext): DragStepResult {
  const dragEnd = getDragEnd(state, ctx.lastPosition, ctx.direction)
  if (dragEnd === undefined) {
    return [Action.None(), state, undefined]
  }

  const worldView = new DragWorldView(
    ctx.world,
    ctx.ray,
    ctx.tileHistory,
    ctx.direction,
  )

  const nextTile = new TileClassifier(
    ctx,
    canEnterNextTile(dragEnd),
    undergroundInputPos(dragEnd, ctx.lastPosition),
    isErrorState(dragEnd),
  ).classifyNextTile()

  switch (nextTile) {
    case "Usable":
      return placeBeltOrUnderground(dragEnd, ctx)
    case "IntegratedSplitter":
      return [
        Action.IntegrateSplitter(),
        DragState.OverSplitter(),
        errorOnImpassableExit(dragEnd, ctx),
      ]
    case "IntegratedUnderground": {
      const entity = worldView.getEntity(ctx.nextPosition)
      if (!(entity instanceof UndergroundBelt)) {
        throw new Error("Expected UndergroundBelt for IntegratedUnderground")
      }
      const outputPos = worldView.getUgPairPos(ctx.nextPosition, entity)
      if (outputPos === undefined) {
        throw new Error("Expected paired underground for IntegratedUnderground")
      }
      return integrateUndergroundPair(dragEnd, ctx, outputPos)
    }
    case "Obstacle":
      return handleObstacle(dragEnd, ctx)
    case "ImpassableObstacle":
      return handleImpassableObstacle(dragEnd, ctx)
  }
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
      return DragEndShape.OverImpassableObstacle(state.direction)
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

export function isErrorState(dragEnd: DragEndShape): boolean {
  return dragEnd.type === "Error" || dragEnd.type === "OverImpassableObstacle"
}

function errorOnImpassableExit(
  dragEnd: DragEndShape,
  ctx: DragContext,
): ActionError | undefined {
  if (
    dragEnd.type === "OverImpassableObstacle" &&
    dragEnd.direction === ctx.direction
  ) {
    return ActionError.BeltLineBroken
  }
  return undefined
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
): DragStepResult {
  const err = errorOnImpassableExit(dragEnd, ctx)
  if (err !== undefined) {
    return [Action.PlaceBelt(), DragState.OverBelt(), err]
  }
  if (dragEnd.type === "TraversingObstacle") {
    return placeUnderground(ctx, dragEnd.inputPos, dragEnd.outputPos)
  } else {
    return [Action.PlaceBelt(), DragState.OverBelt(), undefined]
  }
}

function handleObstacle(
  dragEnd: DragEndShape,
  ctx: DragContext,
): DragStepResult {
  let newState: DragState
  let error: ActionError | undefined = undefined

  switch (dragEnd.type) {
    case "Belt":
      newState = DragState.BuildingUnderground(
        ctx.lastPosition,
        undefined,
        ctx.direction,
      )
      break
    case "ExtendableUnderground":
      newState = DragState.BuildingUnderground(
        dragEnd.inputPos,
        ctx.lastPosition,
        ctx.direction,
      )
      break
    case "TraversingObstacle":
      newState = DragState.BuildingUnderground(
        dragEnd.inputPos,
        dragEnd.outputPos,
        ctx.direction,
      )
      break
    case "IntegratedOutput":
      error = ActionError.EntityInTheWay
      newState = DragState.ErrorRecovery()
      break
    case "OverImpassableObstacle":
      newState = DragState.OverImpassable(dragEnd.direction)
      break
    case "Error":
      newState = DragState.ErrorRecovery()
      break
  }

  return [Action.None(), newState, error]
}

function handleImpassableObstacle(
  dragEnd: DragEndShape,
  ctx: DragContext,
): DragStepResult {
  const direction =
    dragEnd.type === "OverImpassableObstacle"
      ? dragEnd.direction
      : ctx.direction
  return [Action.None(), DragState.OverImpassable(direction), undefined]
}

function placeUnderground(
  ctx: DragContext,
  inputPos: number,
  lastOutputPos: number | undefined,
): DragStepResult {
  const isExtension = lastOutputPos !== undefined

  const error = canBuildUnderground(ctx, inputPos, isExtension)

  if (error !== undefined) {
    return [Action.PlaceBelt(), DragState.OverBelt(), error]
  }

  const action =
    lastOutputPos !== undefined
      ? Action.ExtendUnderground(lastOutputPos, ctx.nextPosition)
      : Action.CreateUnderground(inputPos, ctx.nextPosition)

  return [
    action,
    DragState.BuildingUnderground(inputPos, ctx.nextPosition, ctx.direction),
    undefined,
  ]
}

function integrateUndergroundPair(
  dragEnd: DragEndShape,
  ctx: DragContext,
  outputPos: number,
): DragStepResult {
  const action = Action.IntegrateUndergroundPair()

  const [leftPos, rightPos] = swapIfBackwards(
    ctx.direction,
    ctx.nextPosition,
    outputPos,
  )

  const nextState =
    outputPos === ctx.furthestPlacementPos
      ? DragState.BuildingUnderground(ctx.nextPosition, outputPos, ctx.direction)
      : DragState.PassThrough(leftPos, rightPos)

  const err = errorOnImpassableExit(dragEnd, ctx)
  return [action, nextState, err]
}

function canBuildUnderground(
  ctx: DragContext,
  inputPos: number,
  isExtension: boolean,
): ActionError | undefined {
  const distance = Math.abs(ctx.nextPosition - inputPos)

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
      return ActionError.BeltLineBroken
    }

    if (entity instanceof UndergroundBelt) {
      const entityAxis = directionAxis(entity.direction)
      const rayAxis = directionAxis(ctx.ray.direction)

      if (entityAxis === rayAxis && entity.tier === ctx.tier) {
        return ActionError.BeltLineBroken
      }
    }

    return undefined
  }

  if (ctx.direction === DragDirection.Forward) {
    for (let pos = startPos + 1; pos <= ctx.nextPosition - 1; pos++) {
      const error = checkPos(pos)
      if (error !== undefined) {
        return error
      }
    }
  } else {
    for (let pos = startPos; pos >= ctx.nextPosition + 1; pos--) {
      const error = checkPos(pos)
      if (error !== undefined) {
        return error
      }
    }
  }

  return undefined
}
