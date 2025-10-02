import type { BeltConnections } from "./belt_curving"
import {
  Belt,
  BeltConnectable,
  Colliding,
  UndergroundBelt,
  type BeltTier,
  type Entity as EntityLike,
} from "./belts"
import {
  addVec,
  directionToVector,
  mulVec,
  oppositeDirection,
  type Direction,
  type TilePosition,
} from "./geometry"
import type { TileHistory } from "./smart_belt/tile_history_view"

export interface ReadonlyWorld {
  get(position: TilePosition): EntityLike | undefined
  outputDirectionAt(position: TilePosition): Direction | undefined
  inputDirectionAt(position: TilePosition): Direction | undefined
}

export interface World extends ReadonlyWorld {
  tryBuild(position: TilePosition, entity: BeltConnectable): boolean
  remove(pos: TilePosition): void

  flipUg(position: TilePosition): void
  upgradeUg(position: TilePosition, tier: BeltTier): void
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

  canPlaceBeltOnTile(position: TilePosition): boolean {
    const entity = this.world.get(position)
    if (!entity) {
      return true
    }
    return !(entity instanceof Colliding)
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
  ): TileHistory | undefined {
    let history = this.beltConnectionsAt(position)

    const newBelt = new Belt(direction, tier)
    if (this.world.tryBuild(position, newBelt)) {
      return [position, history]
    }
  }

  placeUndergroundBelt(
    position: TilePosition,
    direction: Direction,
    isInput: boolean,
    tier: BeltTier,
  ): TileHistory | undefined {
    let history = this.beltConnectionsAt(position)

    const newUg = new UndergroundBelt(direction, isInput, tier)
    if (this.world.tryBuild(position, newUg)) {
      return [position, history]
    }
  }
}
