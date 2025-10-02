import { Splitter, UndergroundBelt, type BeltTier } from "../belts"
import {
  Direction,
  createRay,
  directionAxis,
  getRayPosition,
  rayDistance,
  rayRelativeDirection,
  type Ray,
  type TilePosition,
} from "../geometry"
import { WorldOps, type World } from "../world"
import { Action, ActionError } from "./action"
import {
  DragState,
  deferredError,
  takeStep,
  type DragContext,
  type DragStepResult,
} from "./drag_state"
import type { TileHistory } from "./tile_history_view"

export const enum DragDirection {
  Forward = "forward",
  Backward = "backward",
}

export function directionMultiplier(direction: DragDirection): number {
  return direction === DragDirection.Forward ? 1 : -1
}

export function swapIfBackwards<T>(
  direction: DragDirection,
  a: T,
  b: T,
): [T, T] {
  return direction === DragDirection.Forward ? [a, b] : [b, a]
}

export interface ErrorHandler {
  handleError(position: TilePosition, error: ActionError): void
}

export class LineDrag {
  private constructor(
    public ray: Ray,
    private tier: BeltTier,
    private lastState: DragState,
    private lastPosition: number,
    private tileHistory: TileHistory | undefined,
    private errorHandler: ErrorHandler,
  ) {}

  static startDrag(
    world: World,
    tier: BeltTier,
    startPos: TilePosition,
    beltDirection: Direction,
    errorHandler: ErrorHandler,
  ): LineDrag {
    const worldOps = new WorldOps(world)
    const canPlace = worldOps.canPlaceBeltOnTile(startPos)
    const tileHistory: TileHistory | undefined = canPlace
      ? [startPos, worldOps.beltConnectionsAt(startPos)]
      : undefined

    if (canPlace) {
      worldOps.placeBelt(startPos, beltDirection, tier)
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
      errorHandler,
    )
  }

  private nextPosition(direction: DragDirection): number {
    return this.lastPosition + directionMultiplier(direction)
  }

  curWorldPosition(): TilePosition {
    return getRayPosition(this.ray, this.lastPosition)
  }

  interpolateTo(world: World, newPosition: TilePosition): void {
    const targetPos = rayDistance(this.ray, newPosition)

    while (this.lastPosition < targetPos) {
      const ctx = this.createContext(world)
      const result = takeStep(this.lastState, ctx, DragDirection.Forward)
      this.applyStep(world, result, DragDirection.Forward)
    }

    while (this.lastPosition > targetPos) {
      const ctx = this.createContext(world)
      const result = takeStep(this.lastState, ctx, DragDirection.Backward)
      this.applyStep(world, result, DragDirection.Backward)
    }
  }

  private applyStep(
    world: World,
    step: DragStepResult,
    direction: DragDirection,
  ): void {
    let [action, nextState, err] = step
    this.applyAction(world, action, direction)

    const deferred = deferredError(this.lastState, direction)
    if (deferred !== undefined) {
      this.addError(deferred, direction)
    }

    if (err !== undefined) {
      this.addError(err, direction)
    }

    this.lastState = nextState
    this.lastPosition = this.nextPosition(direction)
  }

  private applyAction(
    world: World,
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

        world.remove(previousOutputWorldPos)

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
            this.addError(ActionError.CannotUpgradeUnderground, direction)
          }
        }
        break
      }

      case "IntegrateSplitter": {
        const entity = world.get(worldPos)
        if (!(entity instanceof Splitter)) {
          throw new Error("Expected Splitter at position")
        }

        if (entity.tier !== this.tier) {
          entity.tier = this.tier
        }
        break
      }
    }
  }

  private setTileHistory(tileHistory: TileHistory): void {
    this.tileHistory = tileHistory
  }

  private addError(error: ActionError, direction: DragDirection): void {
    const worldPos = getRayPosition(this.ray, this.nextPosition(direction))
    this.errorHandler.handleError(worldPos, error)
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

export class FullDrag {
  private currentLine!: LineDrag
  private constructor(
    private world: World,
    private tier: BeltTier,
    private errorHandler: ErrorHandler,
    startPos: TilePosition,
    beltDirection: Direction,
  ) {
    this.switchDrag(startPos, beltDirection)
  }

  private switchDrag(pos: TilePosition, direction: Direction) {
    this.currentLine = LineDrag.startDrag(
      this.world,
      this.tier,
      pos,
      direction,
      this.errorHandler,
    )
  }

  static startDrag(
    world: World,
    tier: BeltTier,
    startPos: TilePosition,
    beltDirection: Direction,
    errorHandler: ErrorHandler,
  ): FullDrag {
    return new FullDrag(world, tier, errorHandler, startPos, beltDirection)
  }

  public interpolateTo(pos: TilePosition) {
    this.currentLine.interpolateTo(this.world, pos)
  }

  public rotate(pos: TilePosition): boolean {
    let newDirection = rayRelativeDirection(this.currentLine.ray, pos)
    if (newDirection === undefined) {
      return false
    }
    let newStart = this.currentLine.curWorldPosition()
    this.switchDrag(newStart, newDirection)
    return true
  }
}
