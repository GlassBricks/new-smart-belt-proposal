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
  maxPos: number = 0
  minPos: number = 0
  furthestPos: number = 0
  private constructor(
    public ray: Ray,
    private tier: BeltTier,
    private lastState: DragState,
    private lastPosition: number,
    private tileHistory: TileHistory | undefined,
  ) {}

  static startDrag(
    world: World,
    tier: BeltTier,
    startPos: TilePosition,
    beltDirection: Direction,
    errorHandler: ErrorHandler,
  ): LineDrag {
    const worldOps = new WorldOps(world)
    const canPlace = world.canPlaceOrFastReplace(startPos, beltDirection)
    const tileHistory: TileHistory | undefined = canPlace
      ? [startPos, worldOps.beltConnectionsAt(startPos)]
      : undefined

    if (canPlace) {
      worldOps.placeBelt(startPos, beltDirection, tier, true)
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
      const ctx = this.createContext(world)
      const result = takeStep(this.lastState, ctx, DragDirection.Forward)
      this.applyStep(world, errorHandler, result, DragDirection.Forward)
    }

    while (this.lastPosition > targetPos) {
      const ctx = this.createContext(world)
      const result = takeStep(this.lastState, ctx, DragDirection.Backward)
      this.applyStep(world, errorHandler, result, DragDirection.Backward)
    }
    this.updateFurthestPosition(targetPos)
  }

  updateFurthestPosition(targetPos: number): void {
    if (targetPos > this.maxPos) {
      this.maxPos = targetPos
      this.furthestPos = targetPos
    }
    if (targetPos < this.minPos) {
      this.minPos = targetPos
      this.furthestPos = targetPos
    }
  }

  getRotationPivot(): [position: TilePosition, isBackward: boolean] {
    return [
      getRayPosition(this.ray, this.furthestPos),
      this.maxPos != 0 && this.minPos == this.furthestPos,
    ]
  }

  private applyStep(
    world: World,
    errorHandler: ErrorHandler,
    step: DragStepResult,
    direction: DragDirection,
  ): void {
    let [action, nextState, err] = step
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
        )

        const tileHistory = worldOps.placeUndergroundBelt(
          outputWorldPos,
          this.ray.direction,
          direction === DragDirection.Backward,
          this.tier,
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

  private createContext(world: World): DragContext {
    return {
      world: world,
      ray: this.ray,
      tier: this.tier,
      lastPosition: this.lastPosition,
      tileHistory: this.tileHistory,
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

@tryRegister
export class FullDrag {
  private currentLine!: LineDrag
  private constructor(
    private tier: BeltTier,
    private startPos: TilePosition,
  ) {}

  static startDrag(
    tier: BeltTier,
    startPos: TilePosition,
    beltDirection: Direction,
    world: World,
    errorHandler: ErrorHandler,
  ): FullDrag {
    const drag = new FullDrag(tier, startPos)
    drag.currentLine = LineDrag.startDrag(
      world,
      drag.tier,
      drag.startPos,
      beltDirection,
      errorHandler,
    )
    return drag
  }

  public interpolateTo(
    world: World,
    errorHandler: ErrorHandler,
    pos: TilePosition,
  ) {
    this.currentLine.interpolateTo(world, errorHandler, pos)
  }

  public rotate(
    world: World,
    errorHandler: ErrorHandler,
    pos: TilePosition,
  ): boolean {
    let newDirection = rayRelativeDirection(this.currentLine.ray, pos)
    if (newDirection === undefined) {
      return false
    }
    let [pivot, backward] = this.currentLine.getRotationPivot()
    this.currentLine = LineDrag.startDrag(
      world,
      this.tier,
      pivot,
      !backward ? newDirection : oppositeDirection(newDirection),
      errorHandler,
    )
    this.currentLine.interpolateTo(world, errorHandler, pos)
    return true
  }
}
