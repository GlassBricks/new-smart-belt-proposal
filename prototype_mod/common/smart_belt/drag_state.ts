import {
  Belt,
  BeltConnectable,
  ImpassableTile,
  LoaderLike,
  Splitter,
  UndergroundBelt,
  type BeltTier,
} from "../belts"
import {
  axisSign,
  directionAxis,
  getRayPosition,
  isBeforeOnRay,
  type Ray,
} from "../geometry"
import { Action, ActionError } from "./action"
import { RaySense, senseMultiplier } from "./RaySense"
import { TileClassifier } from "./tile_classification"
import { SmartBeltWorldView } from "./world_view"

export interface LastBuiltEntity {
  entity: BeltConnectable
  position: number
}

export const LastBuiltEntity = {
  new(entity: BeltConnectable, position: number): LastBuiltEntity {
    return { entity, position }
  },
}

export type DragStepResult = [action: Action, error: ActionError | undefined]

type ExtendableEnd =
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

const ExtendableEnd = {
  Belt: (): ExtendableEnd => ({ type: "Belt" }),
  IntegratedOutput: (): ExtendableEnd => ({ type: "IntegratedOutput" }),
  ExtendableUnderground: (inputPos: number): ExtendableEnd => ({
    type: "ExtendableUnderground",
    inputPos,
  }),
  TraversingObstacle: (
    inputPos: number,
    outputPos: number | undefined,
  ): ExtendableEnd => ({
    type: "TraversingObstacle",
    inputPos,
    outputPos,
  }),
  OverImpassableObstacle: (raySense: RaySense): ExtendableEnd => ({
    type: "OverImpassableObstacle",
    raySense,
  }),
  Error: (): ExtendableEnd => ({ type: "Error" }),
}

type DragState =
  | { type: "Extendable"; end: ExtendableEnd }
  | { type: "OverlappingOutputUnderground" }
  | { type: "InBetweenUndergrounds" }

const DragState = {
  Extendable: (end: ExtendableEnd): DragState => ({ type: "Extendable", end }),
  OverlappingOutputUnderground: (): DragState => ({
    type: "OverlappingOutputUnderground",
  }),
  InBetweenUndergrounds: (): DragState => ({ type: "InBetweenUndergrounds" }),
}

function getDragEndShape(
  lastBuiltEntity: LastBuiltEntity | undefined,
  overImpassable: RaySense | undefined,
  view: SmartBeltWorldView,
): DragState {
  if (overImpassable !== undefined) {
    return DragState.Extendable(ExtendableEnd.OverImpassableObstacle(overImpassable))
  }
  if (lastBuiltEntity === undefined) {
    return DragState.Extendable(ExtendableEnd.Error())
  }
  const { entity } = lastBuiltEntity
  if (entity instanceof Belt) {
    return getBeltEndShape(lastBuiltEntity.position, view)
  } else if (entity instanceof Splitter || entity instanceof LoaderLike) {
    return DragState.Extendable(ExtendableEnd.IntegratedOutput())
  } else if (entity instanceof UndergroundBelt) {
    const pos = lastBuiltEntity.position
    const pairPos = view.getUgPairPos(pos, entity)
    if (pos !== view.senseFurthestPos) {
      return getEndShapeIntegratedUnderground(pos, pairPos, view)
    } else {
      return getEndShapeBuiltUnderground(pos, pairPos, view)
    }
  }
  throw new Error("Unknown entity type")
}

function getBeltEndShape(
  lbePosition: number,
  view: SmartBeltWorldView,
): DragState {
  if (lbePosition === view.lastPosition()) {
    return DragState.Extendable(ExtendableEnd.Belt())
  }
  return DragState.Extendable(
    ExtendableEnd.TraversingObstacle(lbePosition, undefined),
  )
}

function getEndShapeIntegratedUnderground(
  ugPos: number,
  pairPos: number | undefined,
  view: SmartBeltWorldView,
): DragState {
  if (pairPos === undefined) {
    return DragState.Extendable(ExtendableEnd.Error())
  }
  const min = Math.min(pairPos, ugPos)
  const max = Math.max(pairPos, ugPos)
  const stepSign = view.stepSign()
  const forwardPos = stepSign > 0 ? max : min
  const lastPos = view.lastPosition()

  if (lastPos === forwardPos - stepSign) {
    return DragState.OverlappingOutputUnderground()
  } else if (lastPos === forwardPos) {
    return DragState.Extendable(ExtendableEnd.IntegratedOutput())
  } else if (lastPos >= min && lastPos <= max) {
    return DragState.InBetweenUndergrounds()
  } else {
    return DragState.Extendable(ExtendableEnd.Error())
  }
}

function getEndShapeBuiltUnderground(
  outputPos: number,
  pairPos: number | undefined,
  view: SmartBeltWorldView,
): DragState {
  if (pairPos === undefined) {
    return DragState.Extendable(ExtendableEnd.Error())
  }
  const inputPos = pairPos

  const originalSense = isBeforeOnRay(view.ray, inputPos, outputPos)
    ? RaySense.Forward
    : RaySense.Backward

  if (view.raySense === originalSense) {
    if (outputPos === view.lastPosition()) {
      return DragState.Extendable(
        ExtendableEnd.ExtendableUnderground(inputPos),
      )
    } else {
      return DragState.Extendable(
        ExtendableEnd.TraversingObstacle(inputPos, outputPos),
      )
    }
  } else if (view.lastPosition() === inputPos) {
    return DragState.Extendable(ExtendableEnd.IntegratedOutput())
  } else {
    return DragState.InBetweenUndergrounds()
  }
}

export function step(
  lastBuiltEntity: LastBuiltEntity | undefined,
  overImpassable: RaySense | undefined,
  view: SmartBeltWorldView,
): DragStepResult {
  const dragEnd = getDragEndShape(lastBuiltEntity, overImpassable, view)

  if (dragEnd.type === "OverlappingOutputUnderground") {
    return [Action.IntegrateOutputUnderground(), undefined]
  }
  if (dragEnd.type === "InBetweenUndergrounds") {
    return [Action.None(), undefined]
  }

  const end = dragEnd.end
  const nextTile = new TileClassifier(
    view,
    canEnterNextTile(end),
    undergroundInputPos(end, view.lastPosition()),
    isErrorState(end),
  ).classifyNextTile()

  switch (nextTile) {
    case "Usable":
      return placeBeltOrUnderground(end, view)
    case "IntegratedSplitter":
      return [Action.IntegrateSplitter(), errorOnImpassableExit(end, view)]
    case "IntegratedUnderground": {
      const entity = view.getEntity(view.nextPosition())
      if (!(entity instanceof UndergroundBelt)) {
        throw new Error("Expected UndergroundBelt for IntegratedUnderground")
      }
      const outputPos = view.getUgPairPos(view.nextPosition(), entity)
      if (outputPos === undefined) {
        throw new Error("Expected paired underground for IntegratedUnderground")
      }
      return integrateUndergroundPair(end, view, outputPos)
    }
    case "Obstacle":
      return handleObstacle(end)
    case "ImpassableObstacle":
      return handleImpassableObstacle(end, view)
  }
}

function canEnterNextTile(end: ExtendableEnd): boolean {
  return end.type !== "TraversingObstacle"
}

export function isErrorState(end: ExtendableEnd): boolean {
  return end.type === "Error" || end.type === "OverImpassableObstacle"
}

function errorOnImpassableExit(
  end: ExtendableEnd,
  view: SmartBeltWorldView,
): ActionError | undefined {
  if (
    end.type === "OverImpassableObstacle" &&
    end.raySense === view.raySense
  ) {
    return ActionError.BeltLineBroken
  }
  return undefined
}

function undergroundInputPos(
  end: ExtendableEnd,
  lastPosition: number,
): number | undefined {
  switch (end.type) {
    case "Belt":
      return lastPosition
    case "ExtendableUnderground":
      return end.inputPos
    case "TraversingObstacle":
      return end.inputPos
    default:
      return undefined
  }
}

function placeBeltOrUnderground(
  end: ExtendableEnd,
  view: SmartBeltWorldView,
): DragStepResult {
  const err = errorOnImpassableExit(end, view)
  if (err !== undefined) {
    return [Action.PlaceBelt(), err]
  }
  if (end.type === "TraversingObstacle") {
    return placeUnderground(view, end.inputPos, end.outputPos)
  } else {
    return [Action.PlaceBelt(), undefined]
  }
}

function handleObstacle(end: ExtendableEnd): DragStepResult {
  switch (end.type) {
    case "Belt":
    case "ExtendableUnderground":
    case "TraversingObstacle":
      return [Action.None(), undefined]
    case "IntegratedOutput":
      return [Action.ClearEntity(), ActionError.EntityInTheWay]
    case "OverImpassableObstacle":
      return [Action.SetImpassable(end.raySense), undefined]
    case "Error":
      return [Action.ClearEntity(), undefined]
  }
}

function handleImpassableObstacle(
  end: ExtendableEnd,
  view: SmartBeltWorldView,
): DragStepResult {
  const raySense =
    end.type === "OverImpassableObstacle" ? end.raySense : view.raySense
  return [Action.SetImpassable(raySense), undefined]
}

function placeUnderground(
  view: SmartBeltWorldView,
  inputPos: number,
  lastOutputPos: number | undefined,
): DragStepResult {
  const nextPosition = view.nextPosition()

  const error = canBuildUnderground(view, inputPos, lastOutputPos)

  if (error !== undefined) {
    return [Action.PlaceBelt(), error]
  }

  const action =
    lastOutputPos !== undefined
      ? Action.ExtendUnderground(lastOutputPos, nextPosition)
      : Action.CreateUnderground(inputPos, nextPosition)

  return [action, undefined]
}

function integrateUndergroundPair(
  end: ExtendableEnd,
  view: SmartBeltWorldView,
  outputPos: number,
): DragStepResult {
  const err = errorOnImpassableExit(end, view)
  return [Action.IntegrateInputUnderground(outputPos), err]
}

function canBuildUnderground(
  view: SmartBeltWorldView,
  inputPos: number,
  lastOutputPos: number | undefined,
): ActionError | undefined {
  const nextPosition = view.nextPosition()
  const distance = Math.abs(nextPosition - inputPos)

  if (distance > view.tier.undergroundDistance) {
    return ActionError.TooFarToConnect
  }

  const checkFromPos = lastOutputPos ?? inputPos
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
