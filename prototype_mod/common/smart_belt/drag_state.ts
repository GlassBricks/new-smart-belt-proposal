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
  wasOverbuild: boolean
}

export const LastBuiltEntity = {
  fromBuild(entity: BeltConnectable, position: number): LastBuiltEntity {
    return { entity, position, wasOverbuild: false }
  },
  fromOverbuild(entity: BeltConnectable, position: number): LastBuiltEntity {
    return { entity, position, wasOverbuild: true }
  },
}

export type DragStepResult = [action: Action, error: ActionError | undefined]

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

// --- Derivation from LastBuiltEntity ---

function deriveDragEnd(
  lastBuiltEntity: LastBuiltEntity | undefined,
  overImpassable: RaySense | undefined,
  view: SmartBeltWorldView,
): DragEndShape | undefined {
  if (overImpassable !== undefined) {
    return DragEndShape.OverImpassableObstacle(overImpassable)
  }
  if (lastBuiltEntity === undefined) {
    return DragEndShape.Error()
  }
  const { entity } = lastBuiltEntity
  if (entity instanceof Belt) {
    return deriveBeltEnd(lastBuiltEntity, view)
  } else if (entity instanceof Splitter) {
    return DragEndShape.IntegratedOutput()
  } else if (entity instanceof UndergroundBelt) {
    const pairPos = view.getUgPairPos(lastBuiltEntity.position, entity)
    if (lastBuiltEntity.wasOverbuild) {
      return derivePassthroughEnd(lastBuiltEntity, pairPos, view)
    } else {
      return deriveBuildingUndergroundEnd(lastBuiltEntity, pairPos, view)
    }
  } else if (entity instanceof LoaderLike) {
    return DragEndShape.IntegratedOutput()
  }
  throw new Error("Unknown entity type")
}

function deriveBeltEnd(
  lbe: LastBuiltEntity,
  view: SmartBeltWorldView,
): DragEndShape | undefined {
  if (lbe.position === view.lastPosition) {
    return DragEndShape.Belt()
  }
  const stepSign = view.stepSign()
  const diff = (view.lastPosition - lbe.position) * stepSign
  if (diff > 0) {
    return DragEndShape.TraversingObstacle(lbe.position, undefined)
  } else {
    const nextPos = view.nextPosition()
    return nextPos === lbe.position ? DragEndShape.Belt() : undefined
  }
}

function deriveBuildingUndergroundEnd(
  lbe: LastBuiltEntity,
  pairPos: number | undefined,
  view: SmartBeltWorldView,
): DragEndShape | undefined {
  if (pairPos === undefined) {
    throw new Error("UG pair missing for BuildingUnderground derivation")
  }
  const inputPos = pairPos
  const outputPos = lbe.position

  const originalSense = isBeforeOnRay(view.ray, inputPos, outputPos)
    ? RaySense.Forward
    : RaySense.Backward

  if (view.raySense === originalSense) {
    if (outputPos === view.lastPosition) {
      return DragEndShape.ExtendableUnderground(inputPos)
    } else {
      return DragEndShape.TraversingObstacle(inputPos, outputPos)
    }
  } else if (view.lastPosition === inputPos) {
    return DragEndShape.IntegratedOutput()
  } else {
    return undefined
  }
}

function derivePassthroughEnd(
  lbe: LastBuiltEntity,
  pairPos: number | undefined,
  view: SmartBeltWorldView,
): DragEndShape | undefined {
  if (pairPos === undefined) {
    throw new Error("UG pair missing for PassThrough derivation")
  }
  const otherPos = pairPos
  const [nearPos, farPos] = isBeforeOnRay(view.ray, lbe.position, otherPos)
    ? [lbe.position, otherPos]
    : [otherPos, lbe.position]

  const within =
    view.raySense === RaySense.Forward
      ? isBeforeOnRay(view.ray, view.lastPosition, farPos)
      : isBeforeOnRay(view.ray, nearPos, view.lastPosition)

  return within ? undefined : DragEndShape.IntegratedOutput()
}

export function step(
  lastBuiltEntity: LastBuiltEntity | undefined,
  overImpassable: RaySense | undefined,
  view: SmartBeltWorldView,
): DragStepResult {
  const dragEnd = deriveDragEnd(lastBuiltEntity, overImpassable, view)
  if (dragEnd === undefined) {
    return [Action.None(), undefined]
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
      return [Action.IntegrateSplitter(), errorOnImpassableExit(dragEnd, view)]
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
      return handleObstacle(dragEnd)
    case "ImpassableObstacle":
      return handleImpassableObstacle(dragEnd, view)
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
    return [Action.PlaceBelt(), err]
  }
  if (dragEnd.type === "TraversingObstacle") {
    return placeUnderground(view, dragEnd.inputPos, dragEnd.outputPos)
  } else {
    return [Action.PlaceBelt(), undefined]
  }
}

function handleObstacle(dragEnd: DragEndShape): DragStepResult {
  switch (dragEnd.type) {
    case "Belt":
    case "ExtendableUnderground":
    case "TraversingObstacle":
      return [Action.None(), undefined]
    case "IntegratedOutput":
      return [Action.ClearEntity(), ActionError.EntityInTheWay]
    case "OverImpassableObstacle":
      return [Action.SetImpassable(dragEnd.raySense), undefined]
    case "Error":
      return [Action.ClearEntity(), undefined]
  }
}

function handleImpassableObstacle(
  dragEnd: DragEndShape,
  view: SmartBeltWorldView,
): DragStepResult {
  const raySense =
    dragEnd.type === "OverImpassableObstacle" ? dragEnd.raySense : view.raySense
  return [Action.SetImpassable(raySense), undefined]
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
    return [Action.PlaceBelt(), error]
  }

  const action =
    lastOutputPos !== undefined
      ? Action.ExtendUnderground(lastOutputPos, nextPosition)
      : Action.CreateUnderground(inputPos, nextPosition)

  return [action, undefined]
}

function integrateUndergroundPair(
  dragEnd: DragEndShape,
  view: SmartBeltWorldView,
  outputPos: number,
): DragStepResult {
  const err = errorOnImpassableExit(dragEnd, view)
  return [Action.IntegrateUndergroundPair(outputPos), err]
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
