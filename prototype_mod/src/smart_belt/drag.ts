import { Splitter, UndergroundBelt, type BeltTier } from "../belts.js"
import {
  Direction,
  createRay,
  getPositionOnRay,
  rayPosition,
  type Ray,
  type TilePosition,
} from "../geometry.js"
import { type TileHistory, type World } from "../world.js"
import {
  Action,
  ActionError,
  DragDirection,
  directionMultiplier,
} from "./action.js"
import {
  DragState,
  DragStepResult,
  deferredError,
  stepDragState,
  type DragContext,
} from "./drag_state.js"

export class LineDrag {
  private constructor(
    private world: World,
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
    const errors: Array<[TilePosition, ActionError]> = []
    const canPlace = world.canPlaceBeltOnTile(startPos)
    const tileHistory: TileHistory | undefined = canPlace
      ? [startPos, world.beltConnectionsAt(startPos)]
      : undefined

    if (canPlace) {
      world.placeBelt(startPos, beltDirection, tier)
    } else {
      errors.push([startPos, ActionError.EntityInTheWay])
    }

    const initialState = DragState.initialState(canPlace)

    return new LineDrag(
      world,
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
    const targetPos = rayPosition(this.ray, newPosition)

    while (this.lastPosition < targetPos) {
      const ctx = this.createContext()
      const result = stepDragState(this.lastState, ctx, DragDirection.Forward)
      this.applyStep(result, DragDirection.Forward)
    }

    while (this.lastPosition > targetPos) {
      const ctx = this.createContext()
      const result = stepDragState(this.lastState, ctx, DragDirection.Backward)
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
    const worldPos = getPositionOnRay(this.ray, position)

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
        const inputWorldPos = getPositionOnRay(this.ray, action.inputPos)
        const outputWorldPos = getPositionOnRay(this.ray, action.outputPos)

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
        const previousOutputWorldPos = getPositionOnRay(
          this.ray,
          action.lastOutputPos,
        )
        const newOutputWorldPos = getPositionOnRay(
          this.ray,
          action.newOutputPos,
        )

        this.world.remove(previousOutputWorldPos)

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
        const entity = this.world.get(worldPos)
        if (!(entity instanceof UndergroundBelt)) {
          throw new Error("Expected UndergroundBelt at position")
        }

        const isInput = entity.isInput
        const tier = entity.tier

        if (isInput !== (direction === DragDirection.Forward)) {
          this.world.flipUg(worldPos)
        }

        if (action.doUpgrade && tier !== this.tier) {
          this.world.upgradeUgChecked(worldPos, this.tier)
        }
        break
      }

      case "IntegrateSplitter": {
        const entity = this.world.get(worldPos)
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
    const worldPos = getPositionOnRay(this.ray, this.nextPosition(direction))
    this.errors.push([worldPos, error])
  }

  private createContext(): DragContext {
    return {
      world: this.world,
      ray: this.ray,
      tier: this.tier,
      lastPosition: this.lastPosition,
      tileHistory: this.tileHistory,
    }
  }
}
