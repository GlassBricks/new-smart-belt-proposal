import {
  Belt,
  BeltConnectable,
  LoaderLike,
  Splitter,
  UndergroundBelt,
  type BeltTier,
} from "./belts.js"
import { Entity } from "./entity.js"
import type {
  BoundingBox,
  Direction,
  TilePosition,
  Transform,
} from "./geometry.js"
import {
  boundsNew,
  keyToPosition,
  oppositeDirection,
  pos,
  posEquals,
  positionToKey,
  transformDirection,
  transformPosition,
} from "./geometry.js"
import {
  beltCurvedInputDirection,
  type BeltConnections,
} from "./smart_belt/belt_curving.js"
import { ReadonlyWorldOps, type World } from "./world.js"

export type { BeltConnections }
export type TileHistory = [TilePosition, BeltConnections]

export class SimulatedWorld implements World {
  private entities: Map<string, Entity>

  constructor() {
    this.entities = new Map()
  }

  private ops(): ReadonlyWorldOps {
    return new ReadonlyWorldOps(this)
  }

  private posKey(pos: TilePosition): string {
    return positionToKey(pos)
  }

  get(position: TilePosition): Entity | undefined {
    return this.entities.get(this.posKey(position)) ?? undefined
  }

  set(position: TilePosition, entity: Entity): void {
    if (entity instanceof UndergroundBelt) {
      const flipped = this.handleUndergroundBelt(position, entity)
      if (flipped) {
        this.entities.set(this.posKey(position), flipped)
        return
      }
    }
    this.entities.set(this.posKey(position), entity)
  }

  trySet(position: TilePosition, entity: BeltConnectable): boolean {
    const existing = this.get(position)
    if (existing instanceof BeltConnectable && entity.equals(existing)) {
      return false
    }
    this.set(position, entity)
    return true
  }

  outputDirectionAt(position: TilePosition): Direction | undefined {
    const belt = this.getBelt(position)
    return belt ? belt.outputDirection() : undefined
  }

  inputDirectionAt(position: TilePosition): Direction | undefined {
    const entity = this.get(position)
    if (!(entity instanceof Belt)) {
      const belt = this.getBelt(position)
      return belt ? belt.primaryInputDirection() : undefined
    }

    return beltCurvedInputDirection(this, position, entity.direction)
  }

  upgradeUnderground(position: TilePosition, tier: BeltTier): void {
    this.upgradeUgChecked(position, tier)
  }

  flipUg(position: TilePosition): boolean {
    const entity = this.get(position)
    if (!(entity instanceof UndergroundBelt)) {
      return false
    }

    const pairResult = this.ops().getUgPair(position, entity)
    if (!pairResult) {
      return false
    }

    const [pairPos, pairEntity] = pairResult
    const flippedUg = entity.flip()
    const flippedPair = pairEntity.flip()

    this.setWithoutHandling(position, flippedUg)
    this.setWithoutHandling(pairPos, flippedPair)

    return true
  }

  private setWithoutHandling(position: TilePosition, entity: Entity): void {
    this.entities.set(this.posKey(position), entity)
  }

  private getBelt(position: TilePosition): BeltConnectable | undefined {
    const entity = this.get(position)
    return entity instanceof BeltConnectable ? entity : undefined
  }

  private handleUndergroundBelt(
    position: TilePosition,
    ug: UndergroundBelt,
  ): UndergroundBelt | undefined {
    const pairResult = this.ops().getUgPair(position, ug)
    if (!pairResult) {
      return undefined
    }

    const [pairPos, pairUg] = pairResult

    const pairPairResult = this.ops().getUgPair(pairPos, pairUg)
    if (pairPairResult) {
      const [pairPairPos, pairPairUg] = pairPairResult
      if (!posEquals(pairPairPos, position) && pairPairUg !== ug) {
        throw new Error(
          `Placing this belt at (${position.x},${position.y}) would break an existing belt pair between (${pairPos.x},${pairPos.y}) and (${pairPairPos.x},${pairPairPos.y})`,
        )
      }
    }

    if (pairUg.isInput === ug.isInput) {
      console.debug("Flipping at", position)
      return ug.flip()
    }

    return undefined
  }

  upgradeUgChecked(position: TilePosition, newTier: BeltTier): void {
    const entity = this.get(position)
    if (!(entity instanceof UndergroundBelt)) {
      return
    }

    const pairResult = this.ops().getUgPair(position, entity)
    if (!pairResult) {
      return
    }

    const [pairPos, pairEntity] = pairResult

    const upgradedUg = new UndergroundBelt(
      entity.direction,
      entity.isInput,
      newTier,
    )
    const upgradedPair = new UndergroundBelt(
      pairEntity.direction,
      pairEntity.isInput,
      newTier,
    )

    this.setWithoutHandling(position, upgradedUg)
    this.setWithoutHandling(pairPos, upgradedPair)

    const newPairResult = this.ops().getUgPair(pairPos, upgradedPair)
    if (!newPairResult) {
      throw new Error("Upgrading removed ug pair")
    }
    const [newPairPos] = newPairResult
    if (!posEquals(newPairPos, position)) {
      throw new Error("Upgrading changed ug pair position")
    }
  }

  remove(position: TilePosition): void {
    this.entities.delete(this.posKey(position))
  }

  getEntities(): IterableIterator<[TilePosition, Entity]> {
    const self = this
    return (function* () {
      for (const [key, entity] of self.entities) {
        yield [keyToPosition(key), entity]
      }
    })()
  }

  bounds(): BoundingBox {
    if (this.entities.size === 0) {
      return boundsNew(pos(0, 0), pos(0, 0))
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const key of this.entities.keys()) {
      const position = keyToPosition(key)
      minX = Math.min(minX, position.x)
      minY = Math.min(minY, position.y)
      maxX = Math.max(maxX, position.x)
      maxY = Math.max(maxY, position.y)
    }

    return boundsNew(pos(minX, minY), pos(maxX + 1, maxY + 1))
  }

  transformWorld(transform: Transform): SimulatedWorld {
    const newWorld = new SimulatedWorld()

    for (const [key, entity] of this.entities.entries()) {
      const parts = key.split(",").map(Number)
      const x = parts[0]!
      const y = parts[1]!
      const oldPos = pos(x, y)
      const newPos = transformPosition(transform, oldPos)
      const newEntity = this.transformEntity(transform, entity)
      newWorld.set(newPos, newEntity)
    }

    return newWorld
  }

  private transformEntity(transform: Transform, entity: Entity): Entity {
    if (entity instanceof Belt) {
      return new Belt(
        transformDirection(transform, entity.direction),
        entity.tier,
      )
    } else if (entity instanceof UndergroundBelt) {
      return new UndergroundBelt(
        transformDirection(transform, entity.direction),
        entity.isInput,
        entity.tier,
      )
    } else if (entity instanceof Splitter) {
      return new Splitter(
        transformDirection(transform, entity.direction),
        entity.tier,
      )
    } else if (entity instanceof LoaderLike) {
      return new LoaderLike(
        transformDirection(transform, entity.direction),
        entity.isInput,
        entity.tier,
      )
    } else {
      return entity
    }
  }

  flipAllEntities(): SimulatedWorld {
    const newWorld = new SimulatedWorld()

    for (const [key, entity] of this.entities.entries()) {
      const parts = key.split(",").map(Number)
      const x = parts[0]!
      const y = parts[1]!
      const oldPos = pos(x, y)

      let newEntity: Entity
      if (entity instanceof Belt) {
        const inputDirection = this.inputDirectionAt(oldPos)!
        newEntity = new Belt(oppositeDirection(inputDirection), entity.tier)
      } else if (entity instanceof UndergroundBelt) {
        newEntity = new UndergroundBelt(
          oppositeDirection(entity.direction),
          !entity.isInput,
          entity.tier,
        )
      } else if (entity instanceof Splitter) {
        newEntity = new Splitter(
          oppositeDirection(entity.direction),
          entity.tier,
        )
      } else if (entity instanceof LoaderLike) {
        newEntity = new LoaderLike(
          oppositeDirection(entity.direction),
          !entity.isInput,
          entity.tier,
        )
      } else {
        newEntity = entity
      }

      newWorld.set(oldPos, newEntity)
    }

    return newWorld
  }

  equals(other: SimulatedWorld): boolean {
    if (this.entities.size !== other.entities.size) {
      return false
    }

    for (const [key, entity] of this.entities.entries()) {
      const otherEntity = other.entities.get(key)
      if (!otherEntity) {
        return false
      }

      if (entity.entityType !== otherEntity.entityType) {
        return false
      }

      if (entity instanceof Belt && otherEntity instanceof Belt) {
        if (
          entity.direction !== otherEntity.direction ||
          entity.tier !== otherEntity.tier
        ) {
          return false
        }
      } else if (
        entity instanceof UndergroundBelt &&
        otherEntity instanceof UndergroundBelt
      ) {
        if (
          entity.direction !== otherEntity.direction ||
          entity.isInput !== otherEntity.isInput ||
          entity.tier !== otherEntity.tier
        ) {
          return false
        }
      } else if (
        entity instanceof Splitter &&
        otherEntity instanceof Splitter
      ) {
        if (
          entity.direction !== otherEntity.direction ||
          entity.tier !== otherEntity.tier
        ) {
          return false
        }
      } else if (
        entity instanceof LoaderLike &&
        otherEntity instanceof LoaderLike
      ) {
        if (
          entity.direction !== otherEntity.direction ||
          entity.isInput !== otherEntity.isInput ||
          entity.tier !== otherEntity.tier
        ) {
          return false
        }
      }
    }

    return true
  }

  clone(): SimulatedWorld {
    const newWorld = new SimulatedWorld()
    for (const [key, entity] of this.entities.entries()) {
      newWorld.entities.set(key, entity)
    }
    return newWorld
  }

  getAllPositions(): TilePosition[] {
    const positions: TilePosition[] = []
    for (const key of this.entities.keys()) {
      const parts = key.split(",").map(Number)
      const x = parts[0]!
      const y = parts[1]!
      positions.push(pos(x, y))
    }
    return positions
  }
}
