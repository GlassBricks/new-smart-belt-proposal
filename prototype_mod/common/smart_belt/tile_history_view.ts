import { beltCurvedInputDirection, type BeltConnections } from "../belt_curving"
import type { BeltCollider } from "../belts"
import { Belt, BeltConnectable, UndergroundBelt } from "../belts"
import type { Direction, TilePosition } from "../geometry"
import { ReadonlyWorldOps, type ReadonlyWorld } from "../world"

export type TileHistory = [TilePosition, BeltConnections]
export class TileHistoryView implements ReadonlyWorld {
  constructor(
    private world: ReadonlyWorld,
    private tileHistory: TileHistory | undefined,
  ) {}

  get(position: TilePosition): BeltCollider | undefined {
    return this.world.get(position)
  }

  canPlaceOrFastReplace(
    position: TilePosition,
    beltDirection: Direction,
  ): boolean {
    return this.world.canPlaceOrFastReplace(position, beltDirection)
  }

  getUgPairPos(
    position: TilePosition,
    underground: UndergroundBelt,
  ): TilePosition | undefined {
    const ops = new ReadonlyWorldOps(this)
    const pair = ops.getUgPair(position, underground)
    return pair ? pair[0] : undefined
  }

  outputDirectionAt(position: TilePosition): Direction | undefined {
    if (
      this.tileHistory &&
      this.tileHistory[0].x === position.x &&
      this.tileHistory[0].y === position.y
    ) {
      return this.tileHistory[1].output
    }
    return this.world.outputDirectionAt(position)
  }

  inputDirectionAt(position: TilePosition): Direction | undefined {
    if (
      this.tileHistory &&
      this.tileHistory[0].x === position.x &&
      this.tileHistory[0].y === position.y
    ) {
      return this.tileHistory[1].input
    }

    const entity = this.get(position)
    if (!entity || !(entity instanceof BeltConnectable)) {
      return undefined
    }

    if (entity instanceof Belt) {
      return beltCurvedInputDirection(this, position, entity.direction)
    }

    return entity.primaryInputDirection()
  }
}
