import type { BeltConnections } from "./belt_curving"
import {
  Belt,
  BeltConnectable,
  UndergroundBelt,
  type BeltTier,
  type BeltCollider as EntityLike,
} from "./belts"
import {
  addVec,
  Direction,
  directionToVector,
  mulVec,
  oppositeDirection,
  type TilePosition,
} from "./geometry"

export interface ReadonlyWorld {
  get(position: TilePosition): EntityLike | undefined
  outputDirectionAt(position: TilePosition): Direction | undefined
  inputDirectionAt(position: TilePosition): Direction | undefined
  canPlaceOrFastReplace(
    position: TilePosition,
    beltDirection: Direction,
    allowFastReplace: boolean,
  ): boolean
}

export interface World extends ReadonlyWorld {
  mine(pos: TilePosition): void

  tryBuild(position: TilePosition, entity: Belt | UndergroundBelt): boolean

  flipUg(position: TilePosition): void
  upgradeUg(position: TilePosition, tier: BeltTier): void
  upgradeSplitter(position: TilePosition, newName: string): void
}

export class ReadonlyWorldOps {
  constructor(protected readonly world: ReadonlyWorld) {}

  getUgPair(
    position: TilePosition,
    underground: UndergroundBelt,
  ): [TilePosition, UndergroundBelt] | undefined {
    const queryDirection = oppositeDirection(underground.shapeDirection())
    const maxDistance = underground.tier.undergroundDistance

    for (let i = 1; i <= maxDistance; i++) {
      const queryPos = addVec(
        position,
        mulVec(directionToVector(queryDirection), i),
      )
      const entity = this.world.get(queryPos)

      if (
        entity instanceof UndergroundBelt &&
        entity.tier === underground.tier
      ) {
        const entityShapeDir = entity.shapeDirection()
        const undergroundShapeDir = underground.shapeDirection()

        if (entityShapeDir === queryDirection) {
          return [queryPos, entity]
        } else if (entityShapeDir === undergroundShapeDir) {
          return undefined
        }
      }
    }

    return undefined
  }

  getBelt(position: TilePosition): BeltConnectable | undefined {
    const entity = this.world.get(position)
    return entity instanceof BeltConnectable ? entity : undefined
  }

  beltConnectionsAt(position: TilePosition): BeltConnections {
    return {
      input: this.world.inputDirectionAt(position),
      output: this.world.outputDirectionAt(position),
    }
  }
}

export class WorldOps extends ReadonlyWorldOps {
  declare world: World
  constructor(world: World) {
    super(world)
  }

  placeBelt(
    position: TilePosition,
    direction: Direction,
    tier: BeltTier,
  ): void {
    const newBelt = new Belt(direction, tier)
    this.world.tryBuild(position, newBelt)
  }

  placeUndergroundBelt(
    position: TilePosition,
    direction: Direction,
    isInput: boolean,
    tier: BeltTier,
    verifyDirection: boolean,
  ): void {
    this.world.tryBuild(position, new UndergroundBelt(direction, isInput, tier))

    const belt = this.world.get(position)
    if (belt instanceof UndergroundBelt && belt.direction != direction) {
      this.world.flipUg(position)
    }
  }
}
