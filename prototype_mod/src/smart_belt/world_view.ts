import { Belt, BeltConnectable, UndergroundBelt } from "../belts.js"
import { Entity } from "../entity.js"
import {
  Direction,
  getPositionOnRay,
  oppositeDirection,
  rayPosition,
  type Ray,
  type TilePosition,
} from "../geometry.js"
import { World, type TileHistory } from "../world.js"
import { DragDirection } from "./action.js"
import { TileHistoryView } from "./belt_curving.js"

export class DragWorldView {
  private historyView: TileHistoryView
  public direction: DragDirection
  private ray: Ray

  constructor(
    world: World,
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
    return this.historyView.getEntity(getPositionOnRay(this.ray, position))
  }

  getBeltEntity(position: number): BeltConnectable | undefined {
    const entity = this.getEntity(position)
    return entity instanceof BeltConnectable ? entity : undefined
  }

  beltWasCurved(position: number, belt: Belt): boolean {
    const worldPos = getPositionOnRay(this.ray, position)
    return this.historyView.beltIsCurvedAt(worldPos, belt)
  }

  isBeltConnectedToPreviousTile(nextPos: number): boolean {
    let lastPos: TilePosition
    let curPos: TilePosition

    if (this.direction === DragDirection.Forward) {
      lastPos = getPositionOnRay(this.ray, nextPos - 1)
      curPos = getPositionOnRay(this.ray, nextPos)
    } else {
      lastPos = getPositionOnRay(this.ray, nextPos)
      curPos = getPositionOnRay(this.ray, nextPos + 1)
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
    const worldPosition = getPositionOnRay(this.ray, index)
    const pairPos = this.historyView.getUgPairPos(worldPosition, ug)
    return pairPos ? rayPosition(this.ray, pairPos) : undefined
  }
}
