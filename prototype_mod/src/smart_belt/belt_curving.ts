import { Belt, BeltConnectable, UndergroundBelt } from "../belts.js"
import type { Entity } from "../entity.js"
import {
  Direction,
  directionAxis,
  directionToVector,
  subPos,
  type TilePosition,
} from "../geometry.js"
import type { TileHistory } from "../simulated_world.js"
import { ReadonlyWorldOps, type ReadonlyWorld } from "../world.js"

export interface BeltConnections {
  readonly input: Direction | undefined
  readonly output: Direction | undefined
}

export function beltCurvedInputDirection(
  world: ReadonlyWorld,
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

export function beltIsCurvedAt(
  world: ReadonlyWorld,
  position: TilePosition,
  belt: Belt,
): boolean {
  const input = world.inputDirectionAt(position)
  if (input === undefined) {
    return false
  }
  return directionAxis(input) !== directionAxis(belt.direction)
}

export class TileHistoryView implements ReadonlyWorld {
  constructor(
    private world: ReadonlyWorld,
    private tileHistory: TileHistory | undefined,
  ) {}

  get(position: TilePosition): Entity | undefined {
    return this.world.get(position)
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
