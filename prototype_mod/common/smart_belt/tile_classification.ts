import {
  Belt,
  BeltConnectable,
  LoaderLike,
  Splitter,
  UndergroundBelt,
} from "../belts"
import { Direction, directionAxis } from "../geometry"

import { RaySense } from "./RaySense"
import { SmartBeltWorldView } from "./world_view"

export type TileType =
  | "Usable"
  | "Obstacle"
  | "IntegratedSplitter"
  | "IntegratedUnderground"
  | "ImpassableObstacle"

export class TileClassifier {
  constructor(
    private view: SmartBeltWorldView,
    private canEnterNextTile: boolean,
    private undergroundInputPos: number | undefined,
    private isErrorState: boolean,
  ) {}

  private isPerpendicular(direction: Direction): boolean {
    return directionAxis(this.view.rayDirection()) !== directionAxis(direction)
  }

  classifyNextTile(): TileType {
    const entity = this.view.getEntity(this.view.nextPosition())

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
    if (this.view.beltWasCurved(this.view.nextPosition(), belt)) {
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
      (belt.direction === this.view.beltDirection() && this.canEnterNextTile) ||
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

    const outputPos = this.view.getUgPairPos(this.view.nextPosition(), ug)
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
    } else if (
      ug.tier === this.view.tier ||
      this.shouldIntegrateBeltSegment(
        ug.direction === this.view.beltDirection(),
        false,
      )
    ) {
      return "Usable"
    } else {
      return "Obstacle"
    }
  }

  private ugIsEnterable(ug: UndergroundBelt): boolean {
    return this.view.rayDirection() === ug.structureDirection()
  }

  private classifySplitter(splitter: Splitter): TileType {
    const splitterDirectionMatches =
      this.view.beltDirection() === splitter.direction

    if (this.isConnectedToPreviousIntegratedBelt()) {
      if (splitterDirectionMatches) {
        return "IntegratedSplitter"
      } else {
        return "ImpassableObstacle"
      }
    } else if (!(splitterDirectionMatches && this.canEnterNextTile)) {
      return "Obstacle"
    } else if (this.shouldIntegrateBeltSegment(true, true)) {
      return "IntegratedSplitter"
    } else {
      return "Obstacle"
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
      loader.structureDirection() === this.view.rayDirection() &&
      loader.isInput === (this.view.raySense === RaySense.Forward)
    )
  }

  private isConnectedToPreviousBeltAsObstacle(): boolean {
    const nextPos = this.view.nextPosition()
    return (
      (!this.canEnterNextTile || this.isErrorState) &&
      (this.view.isBeltConnectedToPreviousTile(nextPos) ||
        this.view.removingBeltWillChangePreviousBeltCurvature(
          nextPos,
          this.undergroundInputPos,
        ))
    )
  }

  private isConnectedToPreviousIntegratedBelt(): boolean {
    return (
      this.canEnterNextTile &&
      this.view.isBeltConnectedToPreviousTile(this.view.nextPosition())
    )
  }

  private isTrivialObstacle(entity: unknown, pos: number): boolean {
    if (!(entity instanceof BeltConnectable)) {
      return true
    }

    if (entity instanceof Belt) {
      return (
        directionAxis(entity.direction) !==
        directionAxis(this.view.beltDirection())
      )
    } else if (entity instanceof UndergroundBelt) {
      return !this.ugIsEnterable(entity)
    } else if (entity instanceof Splitter) {
      return entity.direction !== this.view.beltDirection()
    } else if (entity instanceof LoaderLike) {
      return !this.view.isBeltConnectedToPreviousTile(pos)
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

    const ss = this.view.stepSign()
    const startPos = this.view.nextPosition()
    let scanPos = startPos + ss

    if (skipInitialSplitters) {
      while (scanPos * ss < maxUndergroundPosition * ss) {
        const entity = this.view.getBeltConnectable(scanPos)
        if (
          entity instanceof Splitter &&
          entity.direction === this.view.beltDirection()
        ) {
          scanPos += ss
        } else {
          break
        }
      }
      if (scanPos * ss < maxUndergroundPosition * ss) {
        const entity = this.view.getEntity(scanPos)
        if (entity && this.isTrivialObstacle(entity, scanPos)) {
          return false
        }
      }
    }

    while (scanPos * ss < maxUndergroundPosition * ss) {
      const beltConnectable = this.view.getBeltConnectable(scanPos)
      if (!beltConnectable) {
        break
      }

      if (!this.view.isBeltConnectedToPreviousTile(scanPos)) {
        break
      }

      if (beltConnectable instanceof Belt) {
        if (this.view.beltWasCurved(scanPos, beltConnectable)) {
          return false
        }
      } else if (beltConnectable instanceof UndergroundBelt) {
        if (beltConnectable.tier === this.view.tier) {
          break
        }

        const pairPos = this.view.getUgPairPos(scanPos, beltConnectable)
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
      this.undergroundInputPos +
      this.view.tier.undergroundDistance * this.view.stepSign()
    )
  }
}
