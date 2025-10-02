import { beltIsCurvedAt } from "../belt_curving"
import { Belt, BeltConnectable, UndergroundBelt } from "../belts"
import { Entity } from "../belts"
import {
  Direction,
  getRayPosition,
  oppositeDirection,
  rayDistance,
  type Ray,
  type TilePosition,
} from "../geometry"
import type { ReadonlyWorld } from "../world"
import { DragDirection } from "./drag"

import { TileHistoryView, type TileHistory } from "./tile_history_view"

export class DragWorldView {
  private historyView: TileHistoryView
  public direction: DragDirection
  private ray: Ray

  constructor(
    world: ReadonlyWorld,
    ray: Ray,
    tileHistory: TileHistory | undefined,
    direction: DragDirection,
  ) {
    this.historyView = new TileHistoryView(world, tileHistory)
    this.ray = ray
    this.direction = direction
  }

  beltDirection(): Direction {
    return this.ray.direction
  }

  rayDirection(): Direction {
    return this.direction === DragDirection.Forward
      ? this.ray.direction
      : oppositeDirection(this.ray.direction)
  }

  getEntity(position: number): Entity | undefined {
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

    if (this.direction === DragDirection.Forward) {
      lastPos = getRayPosition(this.ray, nextPos - 1)
      curPos = getRayPosition(this.ray, nextPos)
    } else {
      lastPos = getRayPosition(this.ray, nextPos)
      curPos = getRayPosition(this.ray, nextPos + 1)
    }

    const connectsForward =
      this.historyView.outputDirectionAt(lastPos) === this.beltDirection() &&
      this.historyView.inputDirectionAt(curPos) === this.beltDirection()

    if (connectsForward) {
      return true
    }

    const oppositeDirection = ((this.beltDirection() + 2) % 4) as Direction
    return (
      this.historyView.inputDirectionAt(lastPos) === oppositeDirection &&
      this.historyView.outputDirectionAt(curPos) === oppositeDirection
    )
  }

  getUgPairPos(index: number, ug: UndergroundBelt): number | undefined {
    const worldPosition = getRayPosition(this.ray, index)
    const pairPos = this.historyView.getUgPairPos(worldPosition, ug)
    return pairPos ? rayDistance(this.ray, pairPos) : undefined
  }
}
