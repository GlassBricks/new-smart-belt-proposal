import {
  Belt,
  BeltConnectable,
  LoaderLike,
  Splitter,
  UndergroundBelt,
  type BeltTier,
} from "../belts"
import { Direction, directionAxis } from "../geometry"

import { RaySense } from "./RaySense"

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
    private canEnterNextTile: boolean,
    private undergroundInputPos: number | undefined,
    private isErrorState: boolean,
  ) {
    this.worldView = new DragWorldView(
      ctx.world,
      ctx.ray,
      ctx.tileHistory,
      ctx.raySense,
    )
    this.lastPosition = ctx.lastPosition
    this.tier = ctx.tier
  }

  private raySense(): RaySense {
    return this.worldView.raySense
  }

  private stepSign(): number {
    return this.worldView.stepSign()
  }

  private nextPosition(): number {
    return this.lastPosition + this.stepSign()
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
      (belt.direction === this.beltDirection() && this.canEnterNextTile) ||
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
    return this.rayDirection() === ug.structureDirection()
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
    return (
      loader.structureDirection() === this.rayDirection() &&
      loader.isInput === (this.raySense() === RaySense.Forward)
    )
  }

  private isConnectedToPreviousBeltAsObstacle(): boolean {
    return (
      (!this.canEnterNextTile || this.isErrorState) &&
      (this.worldView.isBeltConnectedToPreviousTile(this.nextPosition()) ||
        this.worldView.removingBeltWillChangePreviousBeltCurvature(
          this.nextPosition(),
          this.undergroundInputPos,
        ))
    )
  }

  private isConnectedToPreviousIntegratedBelt(): boolean {
    return (
      this.canEnterNextTile &&
      this.worldView.isBeltConnectedToPreviousTile(this.nextPosition())
    )
  }

  private isTrivialObstacle(entity: unknown, pos: number): boolean {
    if (!(entity instanceof BeltConnectable)) {
      return true
    }

    if (entity instanceof Belt) {
      return (
        directionAxis(entity.direction) !== directionAxis(this.beltDirection())
      )
    } else if (entity instanceof UndergroundBelt) {
      return !this.ugIsEnterable(entity)
    } else if (entity instanceof Splitter) {
      return entity.direction !== this.beltDirection()
    } else if (entity instanceof LoaderLike) {
      return !this.worldView.isBeltConnectedToPreviousTile(pos)
    }

    return true
  }

  private shouldIntegrateBeltSegment(
    segmentBeltDirectionMatches: boolean,
    skipInitialSplitters: boolean,
  ): boolean {
    const maxUndergroundPosition = this.maxUndergroundPosition()
    if (maxUndergroundPosition === undefined) {
      return true
    }

    const ss = this.stepSign()
    const startPos = this.nextPosition()
    let scanPos = startPos + ss

    if (skipInitialSplitters) {
      while (scanPos * ss < maxUndergroundPosition * ss) {
        const entity = this.worldView.getBeltEntity(scanPos)
        if (
          entity instanceof Splitter &&
          entity.direction === this.beltDirection()
        ) {
          scanPos += ss
        } else {
          break
        }
      }
      if (scanPos * ss < maxUndergroundPosition * ss) {
        const entity = this.worldView.getEntity(scanPos)
        if (entity && this.isTrivialObstacle(entity, scanPos)) {
          return false
        }
      }
    }

    while (scanPos * ss < maxUndergroundPosition * ss) {
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

      scanPos += ss
    }

    return true
  }

  private maxUndergroundPosition(): number | undefined {
    if (this.undergroundInputPos === undefined) {
      return undefined
    }
    return (
      this.undergroundInputPos + this.tier.undergroundDistance * this.stepSign()
    )
  }
}
