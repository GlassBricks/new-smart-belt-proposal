import {
  Belt,
  BeltConnectable,
  Splitter,
  UndergroundBelt,
  type BeltTier,
} from "../belts"
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
import { LastBuiltEntity, step, type DragStepResult } from "./drag_state"
import { RaySense, senseMultiplier } from "./RaySense"
import { SmartBeltWorldView, type TileHistory } from "./world_view"

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
    private lastBuiltEntity: LastBuiltEntity | undefined,
    private overImpassable: RaySense | undefined,
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

    const ray = createRay(startPos, beltDirection)
    const startCoord = rayPosition(ray, startPos)

    const lastBuiltEntity = canPlace
      ? LastBuiltEntity.fromBuild(
          new Belt(firstBeltDirection, tier),
          startCoord,
        )
      : undefined

    return new LineDrag(
      ray,
      tier,
      lastBuiltEntity,
      undefined,
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
      const view = this.createWorldView(world, RaySense.Forward)
      const result = step(this.lastBuiltEntity, this.overImpassable, view)
      this.applyStep(world, errorHandler, result, RaySense.Forward)
    }

    while (isBeforeOnRay(this.ray, targetPos, this.lastPosition)) {
      const view = this.createWorldView(world, RaySense.Backward)
      const result = step(this.lastBuiltEntity, this.overImpassable, view)
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
    result: DragStepResult,
    raySense: RaySense,
  ): void {
    const [action, err] = result
    const nextPosition = this.nextPosition(raySense)
    if (Action.isPlacement(action)) {
      this.updateFurthestPlacement(nextPosition, raySense, world)
    }

    this.applyAction(world, errorHandler, action, nextPosition, raySense)

    if (err !== undefined) {
      const worldPos = getRayPosition(this.ray, nextPosition)
      errorHandler.handleError(worldPos, err)
    }

    this.lastPosition = nextPosition
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
    nextPosition: number,
    raySense: RaySense,
  ): void {
    const worldOps = new WorldOps(world)
    const worldPos = getRayPosition(this.ray, nextPosition)

    switch (action.type) {
      case "None":
        break

      case "PlaceBelt": {
        worldOps.placeBelt(worldPos, this.ray.direction, this.tier)
        const belt = new Belt(this.ray.direction, this.tier)
        this.setLastBuiltEntity(
          LastBuiltEntity.fromBuild(belt, nextPosition),
        )
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

        this.fetchAndSetBuild(world, action.outputPos)
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

        this.fetchAndSetBuild(world, action.newOutputPos)
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

        if (ug.tier != this.tier) {
          const view = this.createWorldView(world, raySense)
          if (canUpgradeUnderground(view, action.outputPos)) {
            world.upgradeUg(worldPos, this.tier)
          } else {
            LineDrag.reportError(
              errorHandler,
              ActionError.CannotUpgradeUnderground,
              worldPos,
            )
          }
        }

        const senseFurthest =
          raySense === RaySense.Forward
            ? this.forwardPlacement
            : this.backwardPlacement
        if (action.outputPos === senseFurthest) {
          this.fetchAndSetBuild(world, action.outputPos)
        } else {
          this.fetchAndSetOverbuild(world, nextPosition)
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

        this.fetchAndSetOverbuild(world, nextPosition)
        break
      }

      case "SetImpassable":
        this.overImpassable = action.raySense
        break

      case "ClearEntity":
        this.lastBuiltEntity = undefined
        this.overImpassable = undefined
        break
    }
  }

  private setLastBuiltEntity(entity: LastBuiltEntity): void {
    this.lastBuiltEntity = entity
    this.overImpassable = undefined
  }

  private fetchAndSetBuild(world: World, pos: number): void {
    const worldPos = getRayPosition(this.ray, pos)
    const entity = world.get(worldPos)
    if (entity instanceof BeltConnectable) {
      this.setLastBuiltEntity(LastBuiltEntity.fromBuild(entity, pos))
    }
  }

  private fetchAndSetOverbuild(world: World, pos: number): void {
    const worldPos = getRayPosition(this.ray, pos)
    const entity = world.get(worldPos)
    if (entity instanceof BeltConnectable) {
      this.setLastBuiltEntity(LastBuiltEntity.fromOverbuild(entity, pos))
    }
  }

  private static reportError(
    errorHandler: ErrorHandler,
    error: ActionError,
    worldPos: TilePosition,
  ): void {
    errorHandler.handleError(worldPos, error)
  }

  private furthestPlacementPos(): number {
    return this.furthestPlacementSense === RaySense.Forward
      ? this.forwardPlacement
      : this.backwardPlacement
  }

  private createWorldView(
    world: World,
    raySense: RaySense,
  ): SmartBeltWorldView {
    const tileHistory: TileHistory[] = [
      ...(this.tileHistory ? [this.tileHistory] : []),
      ...(this.lastEndTileHistory ? [this.lastEndTileHistory] : []),
    ]
    return new SmartBeltWorldView(
      world,
      tileHistory,
      this.ray,
      raySense,
      this.tier,
      this.lastPosition,
    )
  }
}

function canUpgradeUnderground(
  view: SmartBeltWorldView,
  outputPos: number,
): boolean {
  const inputPos = view.nextPosition()

  if (Math.abs(outputPos - inputPos) > view.tier.undergroundDistance) {
    return false
  }

  const start = Math.min(inputPos, outputPos) + 1
  const end = Math.max(inputPos, outputPos) - 1

  for (let pos = start; pos <= end; pos++) {
    const worldPos = getRayPosition(view.ray, pos)
    const entity = view.world.get(worldPos)

    if (entity instanceof UndergroundBelt) {
      const entityAxis = directionAxis(entity.direction)
      const rayAxis = directionAxis(view.ray.direction)

      if (entityAxis === rayAxis && entity.tier === view.tier) {
        return false
      }
    }
  }

  return true
}
