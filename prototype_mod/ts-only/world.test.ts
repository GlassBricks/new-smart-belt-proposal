import { describe, expect, test } from "bun:test"
import { beltCurvedInputDirection } from "../common/belt_curving"
import { Belt, Splitter, UndergroundBelt } from "../common/belts"
import { Direction, pos } from "../common/geometry"
import { WorldOps } from "../common/world"
import { BLUE_BELT, RED_BELT, YELLOW_BELT } from "./belt_tiers"
import { SimulatedWorld } from "./simulated_world"
import { createTransform } from "./test-utils"

describe("world", () => {
  describe("Bounds calculation", () => {
    test("bounds includes all entities", () => {
      const world = new SimulatedWorld()
      world.set(pos(1, 2), new Belt(Direction.North, YELLOW_BELT))
      world.set(pos(5, 7), new Belt(Direction.South, YELLOW_BELT))
      const bounds = world.bounds()
      expect(bounds.left_top).toEqual(pos(1, 2))
      expect(bounds.right_bottom).toEqual(pos(6, 8))
    })

    test("bounds with negative coordinates", () => {
      const world = new SimulatedWorld()
      world.set(pos(-2, -3), new Belt(Direction.North, YELLOW_BELT))
      world.set(pos(4, 5), new Belt(Direction.South, YELLOW_BELT))
      const bounds = world.bounds()
      expect(bounds.left_top).toEqual(pos(-2, -3))
      expect(bounds.right_bottom).toEqual(pos(5, 6))
    })
  })

  describe("Underground belt pairing", () => {
    test("finds pair for input underground", () => {
      const world = new SimulatedWorld()
      const ugInput = new UndergroundBelt(Direction.North, true, YELLOW_BELT)
      const ugOutput = new UndergroundBelt(Direction.North, false, YELLOW_BELT)
      const ops = new WorldOps(world)

      world.set(pos(0, 0), ugInput)
      world.set(pos(0, -3), ugOutput)

      const pair = ops.getUgPair(pos(0, 0), ugInput)
      expect(pair).not.toBe(undefined)
      expect(pair![0]).toEqual(pos(0, -3))
      expect(pair![1]).toBe(ugOutput)

      const pairReverse = ops.getUgPair(pos(0, -3), ugOutput)
      expect(pairReverse).not.toBe(undefined)
      expect(pairReverse![0]).toEqual(pos(0, 0))
      expect(pairReverse![1]).toBe(ugInput)
    })

    test("finds pair for output underground", () => {
      const world = new SimulatedWorld()
      const ugInput = new UndergroundBelt(Direction.South, true, YELLOW_BELT)
      const ugOutput = new UndergroundBelt(Direction.South, false, YELLOW_BELT)
      const ops = new WorldOps(world)

      world.set(pos(5, 5), ugInput)
      world.set(pos(5, 8), ugOutput)

      const pair = ops.getUgPair(pos(5, 8), ugOutput)
      expect(pair).not.toBe(undefined)
      expect(pair![0]).toEqual(pos(5, 5))
      expect(pair![1]).toBe(ugInput)

      const pairReverse = ops.getUgPair(pos(5, 5), ugInput)
      expect(pairReverse).not.toBe(undefined)
      expect(pairReverse![0]).toEqual(pos(5, 8))
      expect(pairReverse![1]).toBe(ugOutput)
    })

    test("no pair when too far", () => {
      const world = new SimulatedWorld()
      const ugInput = new UndergroundBelt(Direction.East, true, YELLOW_BELT)
      world.set(pos(0, 0), ugInput)
      world.set(
        pos(10, 0),
        new UndergroundBelt(Direction.East, false, YELLOW_BELT),
      )

      const ops = new WorldOps(world)

      const pair = ops.getUgPair(pos(0, 0), ugInput)
      expect(pair).toBe(undefined)
    })

    test("no pair when same direction belts block", () => {
      const world = new SimulatedWorld()
      const ug1 = new UndergroundBelt(Direction.North, true, YELLOW_BELT)
      const ug2 = new UndergroundBelt(Direction.North, true, YELLOW_BELT)

      world.set(pos(0, 0), ug1)
      world.set(pos(0, 2), ug2)

      const ops = new WorldOps(world)
      const pair = ops.getUgPair(pos(0, 0), ug1)
      expect(pair).toBe(undefined)
    })
  })

  describe("flipUg", () => {
    test("flips both underground belts in pair", () => {
      const world = new SimulatedWorld()
      world.set(
        pos(0, 0),
        new UndergroundBelt(Direction.East, true, YELLOW_BELT),
      )
      world.set(
        pos(3, 0),
        new UndergroundBelt(Direction.East, false, YELLOW_BELT),
      )

      const result = world.flipUg(pos(0, 0))
      expect(result).toBe(true)

      const ug1 = world.get(pos(0, 0)) as UndergroundBelt
      const ug2 = world.get(pos(3, 0)) as UndergroundBelt

      expect(ug1.isInput).toBe(false)
      expect(ug1.direction).toBe(Direction.West)
      expect(ug2.isInput).toBe(true)
      expect(ug2.direction).toBe(Direction.West)
    })

    test("returns false when no pair", () => {
      const world = new SimulatedWorld()
      world.set(
        pos(0, 0),
        new UndergroundBelt(Direction.North, true, YELLOW_BELT),
      )

      const result = world.flipUg(pos(0, 0))
      expect(result).toBe(false)
    })

    test("returns false for non-underground belt", () => {
      const world = new SimulatedWorld()
      world.set(pos(0, 0), new Belt(Direction.North, YELLOW_BELT))

      const result = world.flipUg(pos(0, 0))
      expect(result).toBe(false)
    })
  })

  describe("upgradeUgChecked", () => {
    test("upgrades both underground belts in pair", () => {
      const world = new SimulatedWorld()
      world.set(
        pos(0, 0),
        new UndergroundBelt(Direction.North, true, YELLOW_BELT),
      )
      world.set(
        pos(0, -3),
        new UndergroundBelt(Direction.North, false, YELLOW_BELT),
      )

      world.upgradeUgChecked(pos(0, 0), BLUE_BELT)

      const ug1 = world.get(pos(0, 0)) as UndergroundBelt
      const ug2 = world.get(pos(0, -3)) as UndergroundBelt

      expect(ug1.tier).toBe(BLUE_BELT)
      expect(ug2.tier).toBe(BLUE_BELT)
    })

    test("does nothing when no pair", () => {
      const world = new SimulatedWorld()
      world.set(
        pos(0, 0),
        new UndergroundBelt(Direction.North, true, YELLOW_BELT),
      )

      world.upgradeUgChecked(pos(0, 0), BLUE_BELT)

      const ug = world.get(pos(0, 0)) as UndergroundBelt
      expect(ug.tier).toBe(YELLOW_BELT)
    })
  })

  describe("Belt curving", () => {
    test("belt curves from left", () => {
      const world = new SimulatedWorld()
      world.set(pos(1, 0), new Belt(Direction.South, YELLOW_BELT))
      const dir = beltCurvedInputDirection(world, pos(1, 1), Direction.East)
      expect(dir).toBe(Direction.South)
    })

    test("belt curves from right", () => {
      const world = new SimulatedWorld()
      world.set(pos(1, 2), new Belt(Direction.North, YELLOW_BELT))
      const dir = beltCurvedInputDirection(world, pos(1, 1), Direction.East)
      expect(dir).toBe(Direction.North)
    })

    test("belt prefers straight when both sides available", () => {
      const world = new SimulatedWorld()
      world.set(pos(0, 1), new Belt(Direction.East, YELLOW_BELT))
      world.set(pos(1, 0), new Belt(Direction.South, YELLOW_BELT))
      world.set(pos(1, 2), new Belt(Direction.North, YELLOW_BELT))
      const dir = beltCurvedInputDirection(world, pos(1, 1), Direction.East)
      expect(dir).toBe(Direction.East)
    })
  })

  describe("World transformation", () => {
    test("transformWorld applies transform to all entities", () => {
      const world = new SimulatedWorld()
      world.set(pos(1, 2), new Belt(Direction.North, YELLOW_BELT))
      world.set(pos(3, 4), new Splitter(Direction.East, RED_BELT))

      const transform = createTransform(true, false, false)
      const transformed = world.transformWorld(transform)

      const belt = transformed.get(pos(-1, 2)) as Belt
      expect(belt).toBeInstanceOf(Belt)
      expect(belt.direction).toBe(Direction.North)

      const splitter = transformed.get(pos(-3, 4)) as Splitter
      expect(splitter).toBeInstanceOf(Splitter)
      expect(splitter.direction).toBe(Direction.West)
    })
  })

  describe("flipAllEntities", () => {
    test("flips all belt entities", () => {
      const world = new SimulatedWorld()
      world.set(pos(0, 0), new Belt(Direction.North, YELLOW_BELT))
      world.set(pos(1, 1), new UndergroundBelt(Direction.East, true, RED_BELT))
      world.set(pos(2, 2), new Splitter(Direction.South, BLUE_BELT))

      const flipped = world.flipAllEntities()

      const belt = flipped.get(pos(0, 0)) as Belt
      expect(belt.direction).toBe(Direction.South)

      const ug = flipped.get(pos(1, 1)) as UndergroundBelt
      expect(ug.direction).toBe(Direction.West)
      expect(ug.isInput).toBe(false)

      const splitter = flipped.get(pos(2, 2)) as Splitter
      expect(splitter.direction).toBe(Direction.North)
    })
  })

  describe("World equality", () => {
    test("worlds with different entities are not equal", () => {
      const world1 = new SimulatedWorld()
      const world2 = new SimulatedWorld()

      world1.set(pos(1, 1), new Belt(Direction.North, YELLOW_BELT))
      world2.set(pos(1, 1), new Belt(Direction.South, YELLOW_BELT))

      expect(world1.equals(world2)).toBe(false)
    })

    test("worlds with different positions are not equal", () => {
      const world1 = new SimulatedWorld()
      const world2 = new SimulatedWorld()

      world1.set(pos(1, 1), new Belt(Direction.North, YELLOW_BELT))
      world2.set(pos(2, 2), new Belt(Direction.North, YELLOW_BELT))

      expect(world1.equals(world2)).toBe(false)
    })
  })
})
