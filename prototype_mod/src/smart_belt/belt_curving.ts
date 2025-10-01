import { Belt, BeltConnectable, UndergroundBelt } from "../belts.js"
import type { Entity } from "../entity.js"
import {
  Direction,
  directionAxis,
  directionToVector,
  subPos,
  type TilePosition,
} from "../geometry.js"
import type { TileHistory, World } from "../world.js"

export interface BeltConnections {
  readonly input: Direction | undefined
  readonly output: Direction | undefined
}

export abstract class BeltCurveView {
  abstract outputDirectionAt(position: TilePosition): Direction | undefined
  abstract inputDirectionAt(position: TilePosition): Direction | undefined

  beltConnectionsAt(position: TilePosition): BeltConnections {
    return {
      input: this.inputDirectionAt(position),
      output: this.outputDirectionAt(position),
    }
  }

  beltCurvedInputDirection(
    position: TilePosition,
    beltDirection: Direction,
  ): Direction {
    const hasInputIn = (direction: Direction): boolean => {
      const dirVec = directionToVector(direction)
      const queryPos = subPos(position, dirVec)
      return this.outputDirectionAt(queryPos) === direction
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

  beltIsCurvedAt(position: TilePosition, belt: Belt): boolean {
    const input = this.inputDirectionAt(position)
    if (input === undefined) {
      return false
    }
    return directionAxis(input) !== directionAxis(belt.direction)
  }
}

export class TileHistoryView extends BeltCurveView {
  constructor(
    private world: World,
    private tileHistory: TileHistory | undefined,
  ) {
    super()
  }

  getEntity(position: TilePosition): Entity | undefined {
    return this.world.get(position)
  }

  getUgPairPos(
    position: TilePosition,
    underground: UndergroundBelt,
  ): TilePosition | undefined {
    const pair = this.world.getUgPair(position, underground)
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

    const entity = this.getEntity(position)
    if (!entity || !(entity instanceof BeltConnectable)) {
      return undefined
    }

    if (entity instanceof Belt) {
      return this.beltCurvedInputDirection(position, entity.direction)
    }

    return entity.primaryInputDirection()
  }
}
