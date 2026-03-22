import { beltCurveDependencies, beltIsCurvedAt } from "../belt_curving"
import { Belt, BeltCollider, BeltConnectable, UndergroundBelt } from "../belts"
import {
  Direction,
  axisSign,
  getRayPosition,
  oppositeDirection,
  rayPosition,
  type Ray,
  type TilePosition,
} from "../geometry"
import type { ReadonlyWorld } from "../world"
import { RaySense, senseMultiplier } from "./RaySense"

import { TileHistoryView, type TileHistory } from "./tile_history_view"

export class DragWorldView {
  private historyView: TileHistoryView
  readonly raySense: RaySense
  private ray: Ray

  constructor(
    world: ReadonlyWorld,
    ray: Ray,
    tileHistory: TileHistory[],
    raySense: RaySense,
  ) {
    this.historyView = new TileHistoryView(world, tileHistory)
    this.ray = ray
    this.raySense = raySense
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
    return this.historyView.get(getRayPosition(this.ray, position))
  }

  getBeltEntity(position: number): BeltConnectable | undefined {
    const entity = this.getEntity(position)
    return entity instanceof BeltConnectable ? entity : undefined
  }

  beltWasCurved(position: number, belt: Belt): boolean {
    const worldPos = getRayPosition(this.ray, position)
    return beltIsCurvedAt(this.historyView, worldPos, belt)
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
      this.historyView.outputDirectionAt(lastPos) === this.beltDirection() &&
      this.historyView.inputDirectionAt(curPos) === this.beltDirection()

    if (connectsForward) {
      return true
    }

    const oppositeDir = ((this.beltDirection() + 2) % 4) as Direction
    return (
      this.historyView.inputDirectionAt(lastPos) === oppositeDir &&
      this.historyView.outputDirectionAt(curPos) === oppositeDir
    )
  }

  getUgPairPos(index: number, ug: UndergroundBelt): number | undefined {
    const worldPosition = getRayPosition(this.ray, index)
    const pairPos = this.historyView.getUgPairPos(worldPosition, ug)
    return pairPos ? rayPosition(this.ray, pairPos) : undefined
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
    const entity = this.historyView.get(lastWorldPos)
    if (!(entity instanceof Belt)) {
      return false
    }
    const dependencies = beltCurveDependencies(
      this.historyView,
      lastWorldPos,
      entity.direction,
    )
    return dependencies.includes(oppositeDirection(this.rayDirection()))
  }
}
