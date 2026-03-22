import { ImpassableTile, UndergroundBelt, type BeltTier } from "../belts"
import {
  axisSign,
  directionAxis,
  getRayPosition,
  isBeforeOnRay,
  type Ray,
} from "../geometry"
import type { World } from "../world"
import { Action, ActionError } from "./action"
import { RaySense, senseMultiplier, swapIfBackwards } from "./RaySense"
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
      raySense: RaySense
    }
  | { type: "PassThrough"; nearPos: number; farPos: number }
  | { type: "OverImpassable"; raySense: RaySense }
  | { type: "ErrorRecovery" }

export const DragState = {
  OverBelt: (): DragState => ({ type: "OverBelt" }),
  OverSplitter: (): DragState => ({ type: "OverSplitter" }),
  BuildingUnderground: (
    inputPos: number,
    outputPos: number | undefined,
    raySense: RaySense,
  ): DragState => ({
    type: "BuildingUnderground",
    inputPos,
    outputPos,
    raySense,
  }),
  PassThrough: (nearPos: number, farPos: number): DragState => ({
    type: "PassThrough",
    nearPos,
    farPos,
  }),
  OverImpassable: (raySense: RaySense): DragState => ({
    type: "OverImpassable",
    raySense,
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
  | { type: "OverImpassableObstacle"; raySense: RaySense }
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
  OverImpassableObstacle: (raySense: RaySense): DragEndShape => ({
    type: "OverImpassableObstacle",
    raySense,
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
  raySense: RaySense
}

export function takeStep(state: DragState, ctx: DragContext): DragStepResult {
  const dragEnd = getDragEnd(state, ctx.lastPosition, ctx.raySense, ctx.ray)
  if (dragEnd === undefined) {
    return [Action.None(), state, undefined]
  }

  const worldView = new DragWorldView(
    ctx.world,
    ctx.ray,
    ctx.tileHistory,
    ctx.raySense,
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
  raySense: RaySense,
  ray: Ray,
): DragEndShape | undefined {
  switch (state.type) {
    case "OverBelt":
      return DragEndShape.Belt()
    case "OverSplitter":
      return DragEndShape.IntegratedOutput()
    case "OverImpassable":
      return DragEndShape.OverImpassableObstacle(state.raySense)
    case "ErrorRecovery":
      return DragEndShape.Error()
    case "BuildingUnderground": {
      const { inputPos, outputPos, raySense: lastSense } = state
      if (raySense !== lastSense) {
        if (outputPos !== undefined) {
          return lastPosition === inputPos
            ? DragEndShape.IntegratedOutput()
            : undefined
        } else {
          const nextPosition =
            lastPosition + axisSign(ray.direction) * senseMultiplier(raySense)
          return nextPosition === inputPos ? DragEndShape.Belt() : undefined
        }
      } else if (outputPos === lastPosition) {
        return DragEndShape.ExtendableUnderground(inputPos)
      } else {
        return DragEndShape.TraversingObstacle(inputPos, outputPos)
      }
    }
    case "PassThrough": {
      const { nearPos, farPos } = state
      const inBetween =
        raySense === RaySense.Forward
          ? isBeforeOnRay(ray, lastPosition, farPos)
          : isBeforeOnRay(ray, nearPos, lastPosition)
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
    dragEnd.raySense === ctx.raySense
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
        ctx.raySense,
      )
      break
    case "ExtendableUnderground":
      newState = DragState.BuildingUnderground(
        dragEnd.inputPos,
        ctx.lastPosition,
        ctx.raySense,
      )
      break
    case "TraversingObstacle":
      newState = DragState.BuildingUnderground(
        dragEnd.inputPos,
        dragEnd.outputPos,
        ctx.raySense,
      )
      break
    case "IntegratedOutput":
      error = ActionError.EntityInTheWay
      newState = DragState.ErrorRecovery()
      break
    case "OverImpassableObstacle":
      newState = DragState.OverImpassable(dragEnd.raySense)
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
  const raySense =
    dragEnd.type === "OverImpassableObstacle" ? dragEnd.raySense : ctx.raySense
  return [Action.None(), DragState.OverImpassable(raySense), undefined]
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
    DragState.BuildingUnderground(inputPos, ctx.nextPosition, ctx.raySense),
    undefined,
  ]
}

function integrateUndergroundPair(
  dragEnd: DragEndShape,
  ctx: DragContext,
  outputPos: number,
): DragStepResult {
  const action = Action.IntegrateUndergroundPair()

  const [nearPos, farPos] = swapIfBackwards(
    ctx.raySense,
    ctx.nextPosition,
    outputPos,
  )

  const nextState =
    outputPos === ctx.furthestPlacementPos
      ? DragState.BuildingUnderground(ctx.nextPosition, outputPos, ctx.raySense)
      : DragState.PassThrough(nearPos, farPos)

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

  const checkFromPos = isExtension ? ctx.lastPosition : inputPos
  const start = Math.min(checkFromPos, ctx.nextPosition) + 1
  const end = Math.max(checkFromPos, ctx.nextPosition) - 1

  for (let pos = start; pos <= end; pos++) {
    const worldPos = getRayPosition(ctx.ray, pos)
    const entity = ctx.world.get(worldPos)

    if (!entity) continue

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
  }

  return undefined
}
