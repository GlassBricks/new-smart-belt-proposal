import {
  Belt,
  BeltCollider,
  BeltConnectable,
  UndergroundBelt,
  type BeltTier,
} from "../belts"
import {
  Direction,
  axisSign,
  directionAxis,
  directionToVector,
  getRayPosition,
  oppositeDirection,
  rayPosition,
  subPos,
  type Ray,
  type TilePosition,
} from "../geometry"
import type { BeltConnections, World } from "../world"
import { WorldOps } from "../world"
import { RaySense, senseMultiplier } from "./RaySense"

export type TileHistory = [TilePosition, BeltConnections]

export class SmartBeltWorldView {
  constructor(
    readonly world: World,
    readonly tileHistory: TileHistory[],
    readonly ray: Ray,
    readonly raySense: RaySense,
    readonly tier: BeltTier,
    private readonly _nextPosition: number,
    readonly senseFurthestPos: number,
  ) {}

  lastPosition(): number {
    return this._nextPosition - this.stepSign()
  }

  nextPosition(): number {
    return this._nextPosition
  }

  stepSign(): number {
    return axisSign(this.ray.direction) * senseMultiplier(this.raySense)
  }

  beltDirection(): Direction {
    return this.ray.direction
  }

  rayDirection(): Direction {
    return this.raySense === RaySense.Forward
      ? this.ray.direction
      : oppositeDirection(this.ray.direction)
  }

  getEntity(position: number): BeltCollider | undefined {
    return this.world.get(getRayPosition(this.ray, position))
  }

  getBeltConnectable(position: number): BeltConnectable | undefined {
    const entity = this.getEntity(position)
    return entity instanceof BeltConnectable ? entity : undefined
  }

  beltWasCurved(position: number, belt: Belt): boolean {
    const worldPos = getRayPosition(this.ray, position)
    const input = this.inputDirectionAt(worldPos)
    return (
      input !== undefined &&
      directionAxis(input) !== directionAxis(belt.direction)
    )
  }

  isBeltConnectedToPreviousTile(nextPos: number): boolean {
    let lastPos: TilePosition
    let curPos: TilePosition
    const fwd = axisSign(this.ray.direction)

    if (this.raySense === RaySense.Forward) {
      lastPos = getRayPosition(this.ray, nextPos - fwd)
      curPos = getRayPosition(this.ray, nextPos)
    } else {
      lastPos = getRayPosition(this.ray, nextPos)
      curPos = getRayPosition(this.ray, nextPos + fwd)
    }

    const connectsForward =
      this.outputDirectionAt(lastPos) === this.beltDirection() &&
      this.inputDirectionAt(curPos) === this.beltDirection()

    if (connectsForward) {
      return true
    }

    const oppositeDir = oppositeDirection(this.beltDirection())
    return (
      this.inputDirectionAt(lastPos) === oppositeDir &&
      this.outputDirectionAt(curPos) === oppositeDir
    )
  }

  removingBeltWillChangePreviousBeltCurvature(
    nextPos: number,
    inputUgPos: number | undefined,
  ): boolean {
    const dragStep = this.stepSign()
    if (inputUgPos === nextPos - 2 * dragStep) {
      return false
    }
    const lastWorldPos = getRayPosition(this.ray, nextPos - dragStep)
    const entity = this.world.get(lastWorldPos)
    if (!(entity instanceof Belt)) {
      return false
    }
    return this.inputDependenciesContains(
      lastWorldPos,
      entity.direction,
      oppositeDirection(this.rayDirection()),
    )
  }

  getUgPairPos(index: number, ug: UndergroundBelt): number | undefined {
    const worldPosition = getRayPosition(this.ray, index)
    const ops = new WorldOps(this.world)
    const pair = ops.getUgPair(worldPosition, ug)
    return pair ? rayPosition(this.ray, pair[0]) : undefined
  }

  // -- History-aware world queries --

  private findInHistory(position: TilePosition): BeltConnections | undefined {
    for (const [p, connections] of this.tileHistory) {
      if (p.x === position.x && p.y === position.y) {
        return connections
      }
    }
    return undefined
  }

  outputDirectionAt(position: TilePosition): Direction | undefined {
    const hist = this.findInHistory(position)
    if (hist) {
      return hist.output
    }
    return this.world.outputDirectionAt(position)
  }

  inputDirectionAt(position: TilePosition): Direction | undefined {
    const hist = this.findInHistory(position)
    if (hist) {
      return hist.input
    }
    const entity = this.world.get(position)
    if (!entity || !(entity instanceof BeltConnectable)) {
      return undefined
    }
    if (entity instanceof Belt) {
      return this.beltCurvedInputDirection(position, entity.direction)
    }
    return entity.primaryInputDirection()
  }

  private beltCurvedInputDirection(
    position: TilePosition,
    beltDirection: Direction,
  ): Direction {
    const hasInputIn = (direction: Direction): boolean => {
      const queryPos = subPos(position, directionToVector(direction))
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

  private inputDependenciesContains(
    position: TilePosition,
    beltDirection: Direction,
    query: Direction,
  ): boolean {
    const hasInputIn = (direction: Direction): boolean => {
      const queryPos = subPos(position, directionToVector(direction))
      return this.outputDirectionAt(queryPos) === direction
    }

    if (hasInputIn(beltDirection)) {
      return query === beltDirection
    }
    return query % 2 !== beltDirection % 2 && hasInputIn(query)
  }
}
