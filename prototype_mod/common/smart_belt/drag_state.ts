import { ImpassableTile, UndergroundBelt } from "../belts"
import {
  axisSign,
  directionAxis,
  getRayPosition,
  isBeforeOnRay,
  type Ray,
} from "../geometry"
import { Action, ActionError } from "./action"
import { RaySense, senseMultiplier, swapIfBackwards } from "./RaySense"
import { TileClassifier } from "./tile_classification"
import { SmartBeltWorldView } from "./world_view"

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

export function takeStep(
  state: DragState,
  view: SmartBeltWorldView,
): DragStepResult {
  const dragEnd = getDragEnd(state, view.lastPosition, view.raySense, view.ray)
  if (dragEnd === undefined) {
    return [Action.None(), state, undefined]
  }

  const nextTile = new TileClassifier(
    view,
    canEnterNextTile(dragEnd),
    undergroundInputPos(dragEnd, view.lastPosition),
    isErrorState(dragEnd),
  ).classifyNextTile()

  switch (nextTile) {
    case "Usable":
      return placeBeltOrUnderground(dragEnd, view)
    case "IntegratedSplitter":
      return [
        Action.IntegrateSplitter(),
        DragState.OverSplitter(),
        errorOnImpassableExit(dragEnd, view),
      ]
    case "IntegratedUnderground": {
      const entity = view.getEntity(view.nextPosition())
      if (!(entity instanceof UndergroundBelt)) {
        throw new Error("Expected UndergroundBelt for IntegratedUnderground")
      }
      const outputPos = view.getUgPairPos(view.nextPosition(), entity)
      if (outputPos === undefined) {
        throw new Error("Expected paired underground for IntegratedUnderground")
      }
      return integrateUndergroundPair(dragEnd, view, outputPos)
    }
    case "Obstacle":
      return handleObstacle(dragEnd, view)
    case "ImpassableObstacle":
      return handleImpassableObstacle(dragEnd, view)
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
  view: SmartBeltWorldView,
): ActionError | undefined {
  if (
    dragEnd.type === "OverImpassableObstacle" &&
    dragEnd.raySense === view.raySense
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
  view: SmartBeltWorldView,
): DragStepResult {
  const err = errorOnImpassableExit(dragEnd, view)
  if (err !== undefined) {
    return [Action.PlaceBelt(), DragState.OverBelt(), err]
  }
  if (dragEnd.type === "TraversingObstacle") {
    return placeUnderground(view, dragEnd.inputPos, dragEnd.outputPos)
  } else {
    return [Action.PlaceBelt(), DragState.OverBelt(), undefined]
  }
}

function handleObstacle(
  dragEnd: DragEndShape,
  view: SmartBeltWorldView,
): DragStepResult {
  let newState: DragState
  let error: ActionError | undefined = undefined

  switch (dragEnd.type) {
    case "Belt":
      newState = DragState.BuildingUnderground(
        view.lastPosition,
        undefined,
        view.raySense,
      )
      break
    case "ExtendableUnderground":
      newState = DragState.BuildingUnderground(
        dragEnd.inputPos,
        view.lastPosition,
        view.raySense,
      )
      break
    case "TraversingObstacle":
      newState = DragState.BuildingUnderground(
        dragEnd.inputPos,
        dragEnd.outputPos,
        view.raySense,
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
  view: SmartBeltWorldView,
): DragStepResult {
  const raySense =
    dragEnd.type === "OverImpassableObstacle" ? dragEnd.raySense : view.raySense
  return [Action.None(), DragState.OverImpassable(raySense), undefined]
}

function placeUnderground(
  view: SmartBeltWorldView,
  inputPos: number,
  lastOutputPos: number | undefined,
): DragStepResult {
  const isExtension = lastOutputPos !== undefined
  const nextPosition = view.nextPosition()

  const error = canBuildUnderground(view, inputPos, isExtension)

  if (error !== undefined) {
    return [Action.PlaceBelt(), DragState.OverBelt(), error]
  }

  const action =
    lastOutputPos !== undefined
      ? Action.ExtendUnderground(lastOutputPos, nextPosition)
      : Action.CreateUnderground(inputPos, nextPosition)

  return [
    action,
    DragState.BuildingUnderground(inputPos, nextPosition, view.raySense),
    undefined,
  ]
}

function integrateUndergroundPair(
  dragEnd: DragEndShape,
  view: SmartBeltWorldView,
  outputPos: number,
): DragStepResult {
  const action = Action.IntegrateUndergroundPair()
  const nextPosition = view.nextPosition()

  const [nearPos, farPos] = swapIfBackwards(
    view.raySense,
    nextPosition,
    outputPos,
  )

  const nextState =
    outputPos === view.furthestPlacementPos
      ? DragState.BuildingUnderground(nextPosition, outputPos, view.raySense)
      : DragState.PassThrough(nearPos, farPos)

  const err = errorOnImpassableExit(dragEnd, view)
  return [action, nextState, err]
}

function canBuildUnderground(
  view: SmartBeltWorldView,
  inputPos: number,
  isExtension: boolean,
): ActionError | undefined {
  const nextPosition = view.nextPosition()
  const distance = Math.abs(nextPosition - inputPos)

  if (distance > view.tier.undergroundDistance) {
    return ActionError.TooFarToConnect
  }

  const checkFromPos = isExtension ? view.lastPosition : inputPos
  const start = Math.min(checkFromPos, nextPosition) + 1
  const end = Math.max(checkFromPos, nextPosition) - 1

  for (let pos = start; pos <= end; pos++) {
    const worldPos = getRayPosition(view.ray, pos)
    const entity = view.world.get(worldPos)

    if (!entity) continue

    if (entity instanceof ImpassableTile) {
      return ActionError.BeltLineBroken
    }

    if (entity instanceof UndergroundBelt) {
      const entityAxis = directionAxis(entity.direction)
      const rayAxis = directionAxis(view.ray.direction)

      if (entityAxis === rayAxis && entity.tier === view.tier) {
        return ActionError.BeltLineBroken
      }
    }
  }

  return undefined
}
