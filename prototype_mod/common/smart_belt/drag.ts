import { Splitter, UndergroundBelt, type BeltTier } from "../belts"
import {
  Direction,
  createRay,
  directionAxis,
  getRayPosition,
  oppositeDirection,
  rayDistance,
  rayRelativeDirection,
  type Ray,
  type TilePosition,
} from "../geometry"
import { tryRegister } from "../metatable"
import { WorldOps, type World } from "../world"
import { Action, ActionError } from "./action"
import {
  DragState,
  deferredError,
  takeStep,
  type DragContext,
  type DragStepResult,
} from "./drag_state"
import { DragDirection, directionMultiplier } from "./DragDirection"
import type { TileHistory } from "./tile_history_view"

export interface ErrorHandler {
  handleError(position: TilePosition, error: ActionError): void
}

@tryRegister
export class LineDrag {
  maxPlacementPos: number = 0
  minPlacementPos: number = 0
  maxPos: number = 0
  minPos: number = 0
  rotationPivotDirection: DragDirection = DragDirection.Forward
  furthestPlacementDirection: DragDirection = DragDirection.Forward
  private constructor(
    public ray: Ray,
    private tier: BeltTier,
    private lastState: DragState,
    private lastPosition: number,
    private tileHistory: TileHistory | undefined,
    private lastEndTileHistory: TileHistory | undefined,
  ) {}

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

    return new LineDrag(
      createRay(startPos, beltDirection),
      tier,
      initialState,
      0,
      tileHistory,
      undefined,
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

  private nextPosition(direction: DragDirection): number {
    return this.lastPosition + directionMultiplier(direction)
  }

  interpolateTo(
    world: World,
    errorHandler: ErrorHandler,
    newPosition: TilePosition,
  ): void {
    const targetPos = rayDistance(this.ray, newPosition)

    while (this.lastPosition < targetPos) {
      const ctx = this.createContext(world, DragDirection.Forward)
      const result = takeStep(this.lastState, ctx)
      this.applyStep(world, errorHandler, result, DragDirection.Forward)
    }

    while (this.lastPosition > targetPos) {
      const ctx = this.createContext(world, DragDirection.Backward)
      const result = takeStep(this.lastState, ctx)
      this.applyStep(world, errorHandler, result, DragDirection.Backward)
    }
    this.updateFurthestPosition(targetPos)
  }

  updateFurthestPosition(targetPos: number): void {
    if (targetPos > this.maxPos) {
      this.maxPos = targetPos
      this.rotationPivotDirection = DragDirection.Forward
    }
    if (targetPos < this.minPos) {
      this.minPos = targetPos
      this.rotationPivotDirection = DragDirection.Backward
    }
  }

  getRotationPivot(): [position: TilePosition, isBackward: boolean] {
    const furthestPos =
      this.rotationPivotDirection === DragDirection.Forward
        ? this.maxPos
        : this.minPos
    return [
      getRayPosition(this.ray, furthestPos),
      this.rotationPivotDirection === DragDirection.Backward,
    ]
  }

  rotate(
    world: World,
    errorHandler: ErrorHandler,
    cursorPos: TilePosition,
  ): boolean {
    const turnDirection = rayRelativeDirection(this.ray, cursorPos)
    if (turnDirection === undefined) {
      return false
    }

    const [pivot, backward] = this.getRotationPivot()
    const oldDirection = this.ray.direction
    const newBeltDirection = backward
      ? oppositeDirection(turnDirection)
      : turnDirection
    const firstBeltDirection = backward ? oldDirection : turnDirection

    const lastTileHistory =
      this.tileHistory !== undefined &&
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

    // Copy state from new drag to this
    this.ray = newLineDrag.ray
    this.lastState = newLineDrag.lastState
    this.lastPosition = newLineDrag.lastPosition
    this.tileHistory = newLineDrag.tileHistory
    this.lastEndTileHistory = newLineDrag.lastEndTileHistory
    this.maxPlacementPos = newLineDrag.maxPlacementPos
    this.minPlacementPos = newLineDrag.minPlacementPos
    this.maxPos = newLineDrag.maxPos
    this.minPos = newLineDrag.minPos
    this.rotationPivotDirection = newLineDrag.rotationPivotDirection
    this.furthestPlacementDirection = newLineDrag.furthestPlacementDirection

    return true
  }

  private applyStep(
    world: World,
    errorHandler: ErrorHandler,
    step: DragStepResult,
    direction: DragDirection,
  ): void {
    let [action, nextState, err] = step
    const nextPosition = this.nextPosition(direction)
    if (action.type !== "None") {
      this.updateFurthestPlacement(nextPosition, direction, world)
    }

    this.applyAction(world, errorHandler, action, direction)

    const deferred = deferredError(this.lastState, direction)
    if (deferred !== undefined) {
      this.addError(errorHandler, deferred, direction)
    }

    if (err !== undefined) {
      this.addError(errorHandler, err, direction)
    }

    this.lastState = nextState
    this.lastPosition = this.nextPosition(direction)
  }

  private storeTileHistory(position: number, world: World): void {
    const worldOps = new WorldOps(world)
    const worldPos = getRayPosition(this.ray, position)
    this.tileHistory = [worldPos, worldOps.beltConnectionsAt(worldPos)]
  }

  private updateFurthestPlacement(
    position: number,
    direction: DragDirection,
    world: World,
  ): void {
    if (direction === DragDirection.Forward) {
      if (position > this.maxPlacementPos) {
        this.maxPlacementPos = position
        this.storeTileHistory(position, world)
        this.furthestPlacementDirection = DragDirection.Forward
      }
    } else {
      if (position < this.minPlacementPos) {
        this.minPlacementPos = position
        this.storeTileHistory(position, world)
        this.furthestPlacementDirection = DragDirection.Backward
      }
    }
  }

  private applyAction(
    world: World,
    errorHandler: ErrorHandler,
    action: Action,
    direction: DragDirection,
  ): void {
    const worldOps = new WorldOps(world)
    const position = this.nextPosition(direction)
    const worldPos = getRayPosition(this.ray, position)

    switch (action.type) {
      case "None":
        break

      case "PlaceBelt": {
        const tileHistory = worldOps.placeBelt(
          worldPos,
          this.ray.direction,
          this.tier,
        )
        if (tileHistory !== undefined) {
          this.setTileHistory(tileHistory)
        }
        break
      }

      case "CreateUnderground": {
        const inputWorldPos = getRayPosition(this.ray, action.inputPos)
        const outputWorldPos = getRayPosition(this.ray, action.outputPos)

        worldOps.placeUndergroundBelt(
          inputWorldPos,
          this.ray.direction,
          direction === DragDirection.Forward,
          this.tier,
          false,
        )

        const tileHistory = worldOps.placeUndergroundBelt(
          outputWorldPos,
          this.ray.direction,
          direction === DragDirection.Backward,
          this.tier,
          true,
        )
        if (tileHistory !== undefined) {
          this.setTileHistory(tileHistory)
        }
        break
      }

      case "ExtendUnderground": {
        const previousOutputWorldPos = getRayPosition(
          this.ray,
          action.lastOutputPos,
        )
        const newOutputWorldPos = getRayPosition(this.ray, action.newOutputPos)

        world.mine(previousOutputWorldPos)

        const tileHistory = worldOps.placeUndergroundBelt(
          newOutputWorldPos,
          this.ray.direction,
          direction === DragDirection.Backward,
          this.tier,
          false,
        )
        if (tileHistory !== undefined) {
          this.setTileHistory(tileHistory)
        }
        break
      }

      case "IntegrateUndergroundPair": {
        const ug = world.get(worldPos)
        if (!(ug instanceof UndergroundBelt)) {
          throw new Error("Expected UndergroundBelt at position")
        }

        if (ug.isInput !== (direction === DragDirection.Forward)) {
          world.flipUg(worldPos)
        }

        const [outputWorldPos] = worldOps.getUgPair(worldPos, ug)!
        const outputPos = rayDistance(this.ray, outputWorldPos)

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
              direction,
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

  private setTileHistory(tileHistory: TileHistory): void {
    this.tileHistory = tileHistory
  }

  private addError(
    errorHandler: ErrorHandler,
    error: ActionError,
    direction: DragDirection,
  ): void {
    const worldPos = getRayPosition(this.ray, this.nextPosition(direction))
    errorHandler.handleError(worldPos, error)
  }

  private furthestPlacementPos(): number {
    return this.furthestPlacementDirection === DragDirection.Forward
      ? this.maxPlacementPos
      : this.minPlacementPos
  }

  private createContext(world: World, direction: DragDirection): DragContext {
    const tileHistory: TileHistory[] = [
      ...(this.tileHistory ? [this.tileHistory] : []),
      ...(this.lastEndTileHistory ? [this.lastEndTileHistory] : []),
    ]
    const furthestPlacementPos =
      direction === DragDirection.Forward
        ? this.maxPlacementPos
        : this.minPlacementPos
    const nextPosition = this.lastPosition + directionMultiplier(direction)
    return {
      world: world,
      ray: this.ray,
      tier: this.tier,
      lastPosition: this.lastPosition,
      nextPosition,
      tileHistory,
      furthestPlacementPos,
      direction,
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
