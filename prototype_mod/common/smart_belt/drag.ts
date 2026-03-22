import { Splitter, UndergroundBelt, type BeltTier } from "../belts"
import {
  Direction,
  axisSign,
  createRay,
  directionAxis,
  getRayPosition,
  isBeforeOnRay,
  oppositeDirection,
  rayPosition,
  rayRelativeDirection,
  type Ray,
  type TilePosition,
} from "../geometry"
import { tryRegister } from "../metatable"
import { WorldOps, type World } from "../world"
import { Action, ActionError } from "./action"
import {
  DragState,
  takeStep,
  type DragContext,
  type DragStepResult,
} from "./drag_state"
import { RaySense, senseMultiplier } from "./RaySense"
import type { TileHistory } from "./tile_history_view"

export interface ErrorHandler {
  handleError(position: TilePosition, error: ActionError): void
}

@tryRegister
export class LineDrag {
  forwardPlacement: number
  backwardPlacement: number
  forwardPos: number
  backwardPos: number
  rotationPivotSense: RaySense = RaySense.Forward
  furthestPlacementSense: RaySense = RaySense.Forward
  private constructor(
    public ray: Ray,
    private tier: BeltTier,
    private lastState: DragState,
    private lastPosition: number,
    private tileHistory: TileHistory | undefined,
    private lastEndTileHistory: TileHistory | undefined,
    startCoord: number,
  ) {
    this.forwardPlacement = startCoord
    this.backwardPlacement = startCoord
    this.forwardPos = startCoord
    this.backwardPos = startCoord
  }

  private static newDrag(
    world: World,
    errorHandler: ErrorHandler,
    tier: BeltTier,
    startPos: TilePosition,
    beltDirection: Direction,
    firstBeltDirection: Direction,
    allowFastReplace: boolean,
  ): LineDrag {
    const worldOps = new WorldOps(world)
    const canPlace = world.canPlaceOrFastReplace(
      startPos,
      beltDirection,
      allowFastReplace,
    )
    const tileHistory: TileHistory | undefined = canPlace
      ? [startPos, worldOps.beltConnectionsAt(startPos)]
      : undefined

    if (canPlace) {
      worldOps.placeBelt(startPos, firstBeltDirection, tier)
    } else {
      errorHandler.handleError(startPos, ActionError.EntityInTheWay)
    }

    const initialState = DragState.initialState(canPlace)
    const ray = createRay(startPos, beltDirection)
    const startCoord = rayPosition(ray, startPos)

    return new LineDrag(
      ray,
      tier,
      initialState,
      startCoord,
      tileHistory,
      undefined,
      startCoord,
    )
  }

  static startDrag(
    world: World,
    errorHandler: ErrorHandler,
    tier: BeltTier,
    startPos: TilePosition,
    beltDirection: Direction,
  ): LineDrag {
    return LineDrag.newDrag(
      world,
      errorHandler,
      tier,
      startPos,
      beltDirection,
      beltDirection,
      true,
    )
  }

  private stepSign(raySense: RaySense): number {
    return axisSign(this.ray.direction) * senseMultiplier(raySense)
  }

  private nextPosition(raySense: RaySense): number {
    return this.lastPosition + this.stepSign(raySense)
  }

  interpolateTo(
    world: World,
    errorHandler: ErrorHandler,
    newPosition: TilePosition,
  ): void {
    const targetPos = rayPosition(this.ray, newPosition)

    while (isBeforeOnRay(this.ray, this.lastPosition, targetPos)) {
      const ctx = this.createContext(world, RaySense.Forward)
      const result = takeStep(this.lastState, ctx)
      this.applyStep(world, errorHandler, result, RaySense.Forward)
    }

    while (isBeforeOnRay(this.ray, targetPos, this.lastPosition)) {
      const ctx = this.createContext(world, RaySense.Backward)
      const result = takeStep(this.lastState, ctx)
      this.applyStep(world, errorHandler, result, RaySense.Backward)
    }
    this.updateFurthestPosition(targetPos)
  }

  updateFurthestPosition(targetPos: number): void {
    if (isBeforeOnRay(this.ray, this.forwardPos, targetPos)) {
      this.forwardPos = targetPos
      this.rotationPivotSense = RaySense.Forward
    }
    if (isBeforeOnRay(this.ray, targetPos, this.backwardPos)) {
      this.backwardPos = targetPos
      this.rotationPivotSense = RaySense.Backward
    }
  }

  getRotationPivot(): [position: TilePosition, isBackward: boolean] {
    const furthestPos =
      this.rotationPivotSense === RaySense.Forward
        ? this.forwardPos
        : this.backwardPos
    return [
      getRayPosition(this.ray, furthestPos),
      this.rotationPivotSense === RaySense.Backward,
    ]
  }

  rotate(
    world: World,
    errorHandler: ErrorHandler,
    cursorPos: TilePosition,
  ): [newDrag: LineDrag, ok: boolean] {
    const turnDirection = rayRelativeDirection(this.ray, cursorPos)
    if (turnDirection === undefined) {
      return [this, false]
    }

    const [pivot, backward] = this.getRotationPivot()
    const oldDirection = this.ray.direction
    const newBeltDirection = backward
      ? oppositeDirection(turnDirection)
      : turnDirection
    const firstBeltDirection = backward ? oldDirection : turnDirection

    // lastTileHistory is only for the quick sideload case. If we are backwards, this doesn't apply.
    const lastTileHistory =
      this.tileHistory !== undefined &&
      !backward &&
      this.furthestPlacementPos() === this.lastPosition
        ? this.tileHistory
        : undefined

    const newLineDrag = LineDrag.newDrag(
      world,
      errorHandler,
      this.tier,
      pivot,
      newBeltDirection,
      firstBeltDirection,
      false,
    )
    newLineDrag.lastEndTileHistory = lastTileHistory
    newLineDrag.interpolateTo(world, errorHandler, cursorPos)
    return [newLineDrag, true]
  }

  private applyStep(
    world: World,
    errorHandler: ErrorHandler,
    step: DragStepResult,
    raySense: RaySense,
  ): void {
    let [action, nextState, err] = step
    const nextPosition = this.nextPosition(raySense)
    if (action.type !== "None") {
      this.updateFurthestPlacement(nextPosition, raySense, world)
    }

    this.applyAction(world, errorHandler, action, raySense)

    if (err !== undefined) {
      this.addError(errorHandler, err, raySense)
    }

    this.lastState = nextState
    this.lastPosition = this.nextPosition(raySense)
  }

  private storeTileHistory(position: number, world: World): void {
    const worldOps = new WorldOps(world)
    const worldPos = getRayPosition(this.ray, position)
    this.tileHistory = [worldPos, worldOps.beltConnectionsAt(worldPos)]
  }

  private updateFurthestPlacement(
    position: number,
    raySense: RaySense,
    world: World,
  ): void {
    if (raySense === RaySense.Forward) {
      if (isBeforeOnRay(this.ray, this.forwardPlacement, position)) {
        this.forwardPlacement = position
        this.storeTileHistory(position, world)
        this.furthestPlacementSense = RaySense.Forward
      }
    } else {
      if (isBeforeOnRay(this.ray, position, this.backwardPlacement)) {
        this.backwardPlacement = position
        this.storeTileHistory(position, world)
        this.furthestPlacementSense = RaySense.Backward
      }
    }
  }

  private applyAction(
    world: World,
    errorHandler: ErrorHandler,
    action: Action,
    raySense: RaySense,
  ): void {
    const worldOps = new WorldOps(world)
    const position = this.nextPosition(raySense)
    const worldPos = getRayPosition(this.ray, position)

    switch (action.type) {
      case "None":
        break

      case "PlaceBelt": {
        worldOps.placeBelt(worldPos, this.ray.direction, this.tier)
        break
      }

      case "CreateUnderground": {
        const inputWorldPos = getRayPosition(this.ray, action.inputPos)
        const outputWorldPos = getRayPosition(this.ray, action.outputPos)

        worldOps.placeUndergroundBelt(
          inputWorldPos,
          this.ray.direction,
          raySense === RaySense.Forward,
          this.tier,
          false,
        )

        worldOps.placeUndergroundBelt(
          outputWorldPos,
          this.ray.direction,
          raySense === RaySense.Backward,
          this.tier,
          true,
        )
        break
      }

      case "ExtendUnderground": {
        const previousOutputWorldPos = getRayPosition(
          this.ray,
          action.lastOutputPos,
        )
        const newOutputWorldPos = getRayPosition(this.ray, action.newOutputPos)

        world.mine(previousOutputWorldPos)

        worldOps.placeUndergroundBelt(
          newOutputWorldPos,
          this.ray.direction,
          raySense === RaySense.Backward,
          this.tier,
          false,
        )
        break
      }

      case "IntegrateUndergroundPair": {
        const ug = world.get(worldPos)
        if (!(ug instanceof UndergroundBelt)) {
          throw new Error("Expected UndergroundBelt at position")
        }

        if (ug.isInput !== (raySense === RaySense.Forward)) {
          world.flipUg(worldPos)
        }

        const [outputWorldPos] = worldOps.getUgPair(worldPos, ug)!
        const outputPos = rayPosition(this.ray, outputWorldPos)

        if (ug.tier != this.tier) {
          if (
            canUpgradeUnderground(
              this.tier,
              world,
              this.ray,
              position,
              outputPos,
            )
          ) {
            world.upgradeUg(worldPos, this.tier)
          } else {
            this.addError(
              errorHandler,
              ActionError.CannotUpgradeUnderground,
              raySense,
            )
          }
        }
        break
      }

      case "IntegrateSplitter": {
        const entity = world.get(worldPos)
        if (!(entity instanceof Splitter)) {
          throw new Error("Expected Splitter at position")
        }

        if (
          this.tier.splitterName !== undefined &&
          entity.name !== this.tier.splitterName &&
          this.tier.splitterName !== undefined
        ) {
          world.upgradeSplitter(worldPos, this.tier.splitterName)
        }
        break
      }
    }
  }

  private addError(
    errorHandler: ErrorHandler,
    error: ActionError,
    raySense: RaySense,
  ): void {
    const worldPos = getRayPosition(this.ray, this.nextPosition(raySense))
    errorHandler.handleError(worldPos, error)
  }

  private furthestPlacementPos(): number {
    return this.furthestPlacementSense === RaySense.Forward
      ? this.forwardPlacement
      : this.backwardPlacement
  }

  private createContext(world: World, raySense: RaySense): DragContext {
    const tileHistory: TileHistory[] = [
      ...(this.tileHistory ? [this.tileHistory] : []),
      ...(this.lastEndTileHistory ? [this.lastEndTileHistory] : []),
    ]
    const furthestPlacementPos =
      raySense === RaySense.Forward
        ? this.forwardPlacement
        : this.backwardPlacement
    const nextPosition = this.lastPosition + this.stepSign(raySense)
    return {
      world: world,
      ray: this.ray,
      tier: this.tier,
      lastPosition: this.lastPosition,
      nextPosition,
      tileHistory,
      furthestPlacementPos,
      raySense,
    }
  }
}

function canUpgradeUnderground(
  tier: BeltTier,
  world: World,
  ray: Ray,
  inputPos: number,
  outputPos: number,
): boolean {
  if (Math.abs(outputPos - inputPos) > tier.undergroundDistance) {
    return false
  }

  const start = Math.min(inputPos, outputPos) + 1
  const end = Math.max(inputPos, outputPos) - 1

  for (let pos = start; pos <= end; pos++) {
    const worldPos = getRayPosition(ray, pos)
    const entity = world.get(worldPos)

    if (entity instanceof UndergroundBelt) {
      const entityAxis = directionAxis(entity.direction)
      const rayAxis = directionAxis(ray.direction)

      if (entityAxis === rayAxis && entity.tier === tier) {
        return false
      }
    }
  }

  return true
}
