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
  subPos,
  type TilePosition,
} from "./geometry"

export interface BeltConnections {
  readonly input: Direction | undefined
  readonly output: Direction | undefined
}

export interface World {
  get(position: TilePosition): EntityLike | undefined
  outputDirectionAt(position: TilePosition): Direction | undefined
  inputDirectionAt(position: TilePosition): Direction | undefined
  canPlaceOrFastReplace(
    position: TilePosition,
    beltDirection: Direction,
    allowFastReplace: boolean,
  ): boolean

  mine(pos: TilePosition): void
  tryBuild(position: TilePosition, entity: Belt | UndergroundBelt): boolean
  flipUg(position: TilePosition): void
  upgradeUg(position: TilePosition, tier: BeltTier): void
  upgradeSplitter(position: TilePosition, newName: string): void
}

export function beltCurvedInputDirection(
  world: World,
  position: TilePosition,
  beltDirection: Direction,
): Direction {
  const hasInputIn = (direction: Direction): boolean => {
    const dirVec = directionToVector(direction)
    const queryPos = subPos(position, dirVec)
    return world.outputDirectionAt(queryPos) === direction
  }

  if (hasInputIn(beltDirection)) {
    return beltDirection
  }

  const rotateCW = ((beltDirection + 1) % 4) as Direction
  const rotateCCW = ((beltDirection + 3) % 4) as Direction

  const leftInput = hasInputIn(rotateCW)
  const rightInput = hasInputIn(rotateCCW)

  if (leftInput && !rightInput) {
    return rotateCW
  } else if (!leftInput && rightInput) {
    return rotateCCW
  }

  return beltDirection
}

export class WorldOps {
  constructor(protected readonly world: World) {}

  getUgPair(
    position: TilePosition,
    underground: UndergroundBelt,
  ): [TilePosition, UndergroundBelt] | undefined {
    const scanDirection = underground.structureDirection()
    const maxDistance = underground.tier.undergroundDistance

    for (let i = 1; i <= maxDistance; i++) {
      const queryPos = addVec(
        position,
        mulVec(directionToVector(scanDirection), i),
      )
      const entity = this.world.get(queryPos)

      if (
        entity instanceof UndergroundBelt &&
        entity.tier === underground.tier
      ) {
        if (entity.structureDirection() === oppositeDirection(scanDirection)) {
          return [queryPos, entity]
        } else if (entity.structureDirection() === scanDirection) {
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

  placeBelt(
    position: TilePosition,
    direction: Direction,
    tier: BeltTier,
  ): Belt {
    const newBelt = new Belt(direction, tier)
    this.world.tryBuild(position, newBelt)
    return newBelt
  }

  placeUndergroundBelt(
    position: TilePosition,
    direction: Direction,
    isInput: boolean,
    tier: BeltTier,
    verifyDirection: boolean,
  ): BeltConnectable {
    this.world.tryBuild(position, new UndergroundBelt(direction, isInput, tier))

    const entity = this.world.get(position)
    if (entity instanceof UndergroundBelt && entity.direction != direction) {
      this.world.flipUg(position)
    }
    return this.world.get(position) as BeltConnectable
  }
}
