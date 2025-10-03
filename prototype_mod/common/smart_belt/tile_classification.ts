import {
  Belt,
  BeltConnectable,
  LoaderLike,
  Splitter,
  UndergroundBelt,
  type BeltTier,
} from "../belts"
import { Direction, directionAxis } from "../geometry"

import { directionMultiplier, DragDirection } from "./DragDirection"

import type { DragContext } from "./drag_state"
import { DragWorldView } from "./world_view"

export type TileType =
  | "Usable"
  | "Obstacle"
  | "IntegratedSplitter"
  | "IntegratedUnderground"
  | "ImpassableObstacle"

export class TileClassifier {
  private worldView: DragWorldView
  private lastPosition: number
  private tier: BeltTier

  constructor(
    ctx: DragContext,
    direction: DragDirection,
    private canEnterNextTile: boolean,
    private undergroundInputPos: number | undefined,
  ) {
    this.worldView = new DragWorldView(
      ctx.world,
      ctx.ray,
      ctx.tileHistory,
      direction,
    )
    this.lastPosition = ctx.lastPosition
    this.tier = ctx.tier
  }

  private dragDirection(): DragDirection {
    return this.worldView.direction
  }

  private directionMultiplier(): number {
    return directionMultiplier(this.dragDirection())
  }

  private nextPosition(): number {
    return this.lastPosition + this.directionMultiplier()
  }

  private rayDirection(): Direction {
    return this.worldView.rayDirection()
  }

  private beltDirection(): Direction {
    return this.worldView.beltDirection()
  }

  private isPerpendicular(direction: Direction): boolean {
    return directionAxis(this.rayDirection()) !== directionAxis(direction)
  }

  classifyNextTile(): TileType {
    const entity = this.worldView.getEntity(this.nextPosition())

    if (!entity) {
      return "Usable"
    }

    if (!(entity instanceof BeltConnectable)) {
      return "Obstacle"
    }

    if (entity instanceof Belt) {
      return this.classifyBelt(entity)
    } else if (entity instanceof UndergroundBelt) {
      return this.classifyUnderground(entity)
    } else if (entity instanceof Splitter) {
      return this.classifySplitter(entity)
    } else if (entity instanceof LoaderLike) {
      return this.classifyLoader(entity)
    }

    return "Obstacle"
  }

  private classifyBelt(belt: Belt): TileType {
    if (this.worldView.beltWasCurved(this.nextPosition(), belt)) {
      return this.classifyCurvedBelt()
    } else {
      return this.classifyStraightBelt(belt)
    }
  }

  private classifyCurvedBelt(): TileType {
    if (this.isConnectedToPreviousIntegratedBelt()) {
      return "ImpassableObstacle"
    } else {
      return "Obstacle"
    }
  }

  private classifyStraightBelt(belt: Belt): TileType {
    if (
      this.isPerpendicular(belt.direction) ||
      this.isConnectedToPreviousBeltAsObstacle()
    ) {
      return "Obstacle"
    } else if (
      belt.direction === this.beltDirection() ||
      this.isConnectedToPreviousIntegratedBelt() ||
      this.shouldIntegrateBeltSegment(false, false)
    ) {
      return "Usable"
    } else {
      return "Obstacle"
    }
  }

  private classifyUnderground(ug: UndergroundBelt): TileType {
    if (
      this.isPerpendicular(ug.direction) ||
      this.isConnectedToPreviousBeltAsObstacle()
    ) {
      return "Obstacle"
    }

    const outputPos = this.worldView.getUgPairPos(this.nextPosition(), ug)
    if (outputPos !== undefined) {
      return this.classifyPairedUndergroundBelt(ug, outputPos)
    } else {
      return this.classifyUnpairedUndergroundBelt(ug)
    }
  }

  private classifyPairedUndergroundBelt(
    ug: UndergroundBelt,
    outputPos: number,
  ): TileType {
    if (this.ugIsEnterable(ug) && this.canEnterNextTile) {
      return "IntegratedUnderground"
    } else {
      return "Obstacle"
    }
  }

  private classifyUnpairedUndergroundBelt(ug: UndergroundBelt): TileType {
    if (this.ugIsEnterable(ug)) {
      return "Usable"
    } else {
      if (
        ug.tier === this.tier ||
        this.shouldIntegrateBeltSegment(
          ug.direction === this.beltDirection(),
          false,
        )
      ) {
        return "Usable"
      } else {
        return "Obstacle"
      }
    }
  }

  private ugIsEnterable(ug: UndergroundBelt): boolean {
    const shapeDirection = ug.shapeDirection()
    const oppositeDirection = ((shapeDirection + 2) % 4) as Direction
    return this.rayDirection() === oppositeDirection
  }

  private classifySplitter(splitter: Splitter): TileType {
    const splitterDirectionMatches = this.beltDirection() === splitter.direction

    if (this.isConnectedToPreviousIntegratedBelt()) {
      if (splitterDirectionMatches) {
        return "IntegratedSplitter"
      } else {
        return "ImpassableObstacle"
      }
    } else if (!(splitterDirectionMatches && this.canEnterNextTile)) {
      return "Obstacle"
    } else {
      if (this.shouldIntegrateBeltSegment(true, true)) {
        return "IntegratedSplitter"
      } else {
        return "Obstacle"
      }
    }
  }

  private classifyLoader(loader: LoaderLike): TileType {
    if (this.beltConnectsIntoLoader(loader)) {
      return "ImpassableObstacle"
    } else {
      return "Obstacle"
    }
  }

  private beltConnectsIntoLoader(loader: LoaderLike): boolean {
    const shapeDirection = loader.shapeDirection()
    const oppositeRayDirection = ((this.rayDirection() + 2) % 4) as Direction
    return (
      shapeDirection === oppositeRayDirection &&
      loader.isInput === (this.dragDirection() === DragDirection.Forward)
    )
  }

  private isConnectedToPreviousBeltAsObstacle(): boolean {
    return (
      !this.canEnterNextTile &&
      this.worldView.isBeltConnectedToPreviousTile(this.nextPosition())
    )
  }

  private isConnectedToPreviousIntegratedBelt(): boolean {
    return (
      this.canEnterNextTile &&
      this.worldView.isBeltConnectedToPreviousTile(this.nextPosition())
    )
  }

  private shouldIntegrateBeltSegment(
    segmentBeltDirectionMatches: boolean,
    skipInitialSplitters: boolean,
  ): boolean {
    const maxUndergroundPosition = this.maxUndergroundPosition()
    if (maxUndergroundPosition === undefined) {
      return true
    }

    const dirMult = this.directionMultiplier()
    const startPos = this.nextPosition()
    let scanPos = startPos + dirMult

    if (skipInitialSplitters) {
      while (scanPos * dirMult < maxUndergroundPosition * dirMult) {
        const entity = this.worldView.getBeltEntity(scanPos)
        if (
          entity instanceof Splitter &&
          entity.direction === this.beltDirection()
        ) {
          scanPos += dirMult
        } else {
          break
        }
      }
    }

    while (scanPos * dirMult < maxUndergroundPosition * dirMult) {
      const beltConnectable = this.worldView.getBeltEntity(scanPos)
      if (!beltConnectable) {
        break
      }

      if (!this.worldView.isBeltConnectedToPreviousTile(scanPos)) {
        break
      }

      if (beltConnectable instanceof Belt) {
        if (this.worldView.beltWasCurved(scanPos, beltConnectable)) {
          return false
        }
      } else if (beltConnectable instanceof UndergroundBelt) {
        if (beltConnectable.tier === this.tier) {
          break
        }

        const pairPos = this.worldView.getUgPairPos(scanPos, beltConnectable)
        if (pairPos === undefined) {
          break
        }

        scanPos = pairPos
      } else if (
        beltConnectable instanceof Splitter ||
        beltConnectable instanceof LoaderLike
      ) {
        return segmentBeltDirectionMatches
      }

      scanPos += dirMult
    }

    return true
  }

  private maxUndergroundPosition(): number | undefined {
    if (this.undergroundInputPos === undefined) {
      return undefined
    }
    return (
      this.undergroundInputPos +
      this.tier.undergroundDistance * this.directionMultiplier()
    )
  }
}
