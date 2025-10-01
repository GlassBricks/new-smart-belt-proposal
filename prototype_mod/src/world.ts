import { BeltCurveView, type BeltConnections } from "./smart_belt/belt_curving.js"
import {
  Belt,
  BeltConnectable,
  LoaderLike,
  Splitter,
  UndergroundBelt,
  type BeltTier,
} from "./belts"
import { Colliding, Entity } from "./entity"
import type {
  BoundingBox,
  Direction,
  TilePosition,
  Transform,
} from "./geometry"
import {
  addVec,
  boundsNew,
  directionToVector,
  keyToPosition,
  mulVec,
  oppositeDirection,
  pos,
  posEquals,
  positionToKey,
  transformDirection,
  transformPosition,
} from "./geometry"

export type { BeltConnections }
export type TileHistory = [TilePosition, BeltConnections]

export class World extends BeltCurveView {
  private entities: Map<string, Entity>

  constructor() {
    super()
    this.entities = new Map()
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

  private setWithoutHandling(position: TilePosition, entity: Entity): void {
    this.entities.set(this.posKey(position), entity)
  }

  private handleUndergroundBelt(
    position: TilePosition,
    ug: UndergroundBelt,
  ): UndergroundBelt | undefined {
    const pairResult = this.getUgPair(position, ug)
    if (!pairResult) {
      return undefined
    }

    const [pairPos, pairUg] = pairResult

    const pairPairResult = this.getUgPair(pairPos, pairUg)
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

  getUgPair(
    position: TilePosition,
    underground: UndergroundBelt,
  ): [TilePosition, UndergroundBelt] | undefined {
    const queryDirection = oppositeDirection(underground.shapeDirection())
    const maxDistance = underground.tier.undergroundDistance

    for (let i = 1; i <= maxDistance; i++) {
      const queryPos = addVec(
        position,
        mulVec(directionToVector(queryDirection), i),
      )
      const entity = this.get(queryPos)

      if (
        entity instanceof UndergroundBelt &&
        entity.tier === underground.tier
      ) {
        const entityShapeDir = entity.shapeDirection()
        const undergroundShapeDir = underground.shapeDirection()

        if (entityShapeDir === queryDirection) {
          return [queryPos, entity]
        } else if (entityShapeDir === undergroundShapeDir) {
          return undefined
        }
      }
    }

    return undefined
  }

  flipUg(position: TilePosition): boolean {
    const entity = this.get(position)
    if (!(entity instanceof UndergroundBelt)) {
      return false
    }

    const pairResult = this.getUgPair(position, entity)
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

  upgradeUgChecked(position: TilePosition, newTier: BeltTier): void {
    const entity = this.get(position)
    if (!(entity instanceof UndergroundBelt)) {
      return
    }

    const pairResult = this.getUgPair(position, entity)
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

    const newPairResult = this.getUgPair(pairPos, upgradedPair)
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

  getBelt(position: TilePosition): BeltConnectable | undefined {
    const entity = this.get(position)
    return entity instanceof BeltConnectable ? entity : undefined
  }

  canPlaceBeltOnTile(position: TilePosition): boolean {
    const entity = this.get(position)
    if (!entity) {
      return true
    }
    return !(entity instanceof Colliding)
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

    return this.beltCurvedInputDirection(position, entity.direction)
  }

  placeBelt(
    position: TilePosition,
    direction: Direction,
    tier: BeltTier,
  ): TileHistory | undefined {
    const newBelt = new Belt(direction, tier)
    const existingEntity = this.get(position)

    if (
      existingEntity instanceof Belt &&
      existingEntity.direction === direction &&
      existingEntity.tier === tier
    ) {
      return undefined
    }

    const connections = this.beltConnectionsAt(position)
    this.set(position, newBelt)
    return [position, connections]
  }

  placeUndergroundBelt(
    position: TilePosition,
    direction: Direction,
    isInput: boolean,
    tier: BeltTier,
  ): TileHistory | undefined {
    const newUg = new UndergroundBelt(direction, isInput, tier)
    const existingEntity = this.get(position)

    if (
      existingEntity instanceof UndergroundBelt &&
      existingEntity.direction === direction &&
      existingEntity.isInput === isInput &&
      existingEntity.tier === tier
    ) {
      return undefined
    }

    const connections = this.beltConnectionsAt(position)
    this.set(position, newUg)
    return [position, connections]
  }

  transformWorld(transform: Transform): World {
    const newWorld = new World()

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

  flipAllEntities(): World {
    const newWorld = new World()

    for (const [key, entity] of this.entities.entries()) {
      const parts = key.split(",").map(Number)
      const x = parts[0]!
      const y = parts[1]!
      const oldPos = pos(x, y)

      let newEntity: Entity
      if (entity instanceof Belt) {
        const inputDirection = this.beltCurvedInputDirection(
          oldPos,
          entity.direction,
        )
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

  equals(other: World): boolean {
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

  clone(): World {
    const newWorld = new World()
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
