import { Splitter, UndergroundBelt, type BeltTier } from "../belts"
import {
  Direction,
  createRay,
  directionAxis,
  getRayPosition,
  rayDistance,
  type Ray,
  type TilePosition,
} from "../geometry"
import { WorldOps, type World } from "../world"
import { Action, ActionError } from "./action"
import {
  DragState,
  DragStepResult,
  deferredError,
  takeStep,
  type DragContext,
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

export class LineDrag {
  private constructor(
    private world: WorldOps,
    private ray: Ray,
    private tier: BeltTier,
    private lastState: DragState,
    private lastPosition: number,
    private tileHistory: TileHistory | undefined,
    private errors: Array<[TilePosition, ActionError]>,
  ) {}

  static startDrag(
    world: World,
    tier: BeltTier,
    startPos: TilePosition,
    beltDirection: Direction,
  ): LineDrag {
    const worldOps = new WorldOps(world)
    const errors: Array<[TilePosition, ActionError]> = []
    const canPlace = worldOps.canPlaceBeltOnTile(startPos)
    const tileHistory: TileHistory | undefined = canPlace
      ? [startPos, worldOps.beltConnectionsAt(startPos)]
      : undefined

    if (canPlace) {
      worldOps.placeBelt(startPos, beltDirection, tier)
    } else {
      errors.push([startPos, ActionError.EntityInTheWay])
    }

    const initialState = DragState.initialState(canPlace)

    return new LineDrag(
      worldOps,
      createRay(startPos, beltDirection),
      tier,
      initialState,
      0,
      tileHistory,
      errors,
    )
  }

  getErrors(): Array<[TilePosition, ActionError]> {
    return this.errors
  }

  private nextPosition(direction: DragDirection): number {
    return this.lastPosition + directionMultiplier(direction)
  }

  interpolateTo(newPosition: TilePosition): void {
    const targetPos = rayDistance(this.ray, newPosition)

    while (this.lastPosition < targetPos) {
      const ctx = this.createContext()
      const result = takeStep(this.lastState, ctx, DragDirection.Forward)
      this.applyStep(result, DragDirection.Forward)
    }

    while (this.lastPosition > targetPos) {
      const ctx = this.createContext()
      const result = takeStep(this.lastState, ctx, DragDirection.Backward)
      this.applyStep(result, DragDirection.Backward)
    }
  }

  private applyStep(step: DragStepResult, direction: DragDirection): void {
    this.applyAction(step.action, direction)

    const deferred = deferredError(this.lastState, direction)
    if (deferred !== undefined) {
      this.addError(deferred, direction)
    }

    if (step.error !== undefined) {
      this.addError(step.error, direction)
    }

    this.lastState = step.nextState
    this.lastPosition = this.nextPosition(direction)
  }

  private applyAction(action: Action, direction: DragDirection): void {
    const position = this.nextPosition(direction)
    const worldPos = getRayPosition(this.ray, position)

    const innerWorld = this.world.world

    switch (action.type) {
      case "None":
        break

      case "PlaceBelt": {
        const tileHistory = this.world.placeBelt(
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

        this.world.placeUndergroundBelt(
          inputWorldPos,
          this.ray.direction,
          direction === DragDirection.Forward,
          this.tier,
        )

        const tileHistory = this.world.placeUndergroundBelt(
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

        innerWorld.remove(previousOutputWorldPos)

        const tileHistory = this.world.placeUndergroundBelt(
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
        const ug = innerWorld.get(worldPos)
        if (!(ug instanceof UndergroundBelt)) {
          throw new Error("Expected UndergroundBelt at position")
        }

        if (ug.isInput !== (direction === DragDirection.Forward)) {
          innerWorld.flipUg(worldPos)
        }

        const [outputWorldPos] = this.world.getUgPair(worldPos, ug)!
        const outputPos = rayDistance(this.ray, outputWorldPos)

        if (ug.tier != this.tier) {
          if (
            canUpgradeUnderground(
              this.tier,
              innerWorld,
              this.ray,
              position,
              outputPos,
            )
          ) {
            innerWorld.upgradeUnderground(worldPos, this.tier)
          } else {
            this.addError(ActionError.CannotUpgradeUnderground, direction)
          }
        }
        break
      }

      case "IntegrateSplitter": {
        const entity = innerWorld.get(worldPos)
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
    this.errors.push([worldPos, error])
  }

  private createContext(): DragContext {
    return {
      world: this.world.world,
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
