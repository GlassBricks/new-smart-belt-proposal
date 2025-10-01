import { describe, expect, test } from "bun:test"
import {
  BELT_TIERS,
  BLUE_BELT,
  Belt,
  BeltConnectable,
  LoaderLike,
  RED_BELT,
  Splitter,
  UndergroundBelt,
  YELLOW_BELT,
} from "./belts"
import { Direction } from "./geometry"

describe("belts", () => {
  describe("BeltTier", () => {
    test("BELT_TIERS contains all tiers", () => {
      expect(BELT_TIERS.length).toBe(3)
      expect(BELT_TIERS).toContain(YELLOW_BELT)
      expect(BELT_TIERS).toContain(RED_BELT)
      expect(BELT_TIERS).toContain(BLUE_BELT)
    })

    test("belt tiers are reference-equal to themselves", () => {
      expect(YELLOW_BELT).toBe(YELLOW_BELT)
      expect(RED_BELT).toBe(RED_BELT)
      expect(BLUE_BELT).toBe(BLUE_BELT)
    })

    test("belt tiers are not reference-equal to each other", () => {
      expect(YELLOW_BELT).not.toBe(RED_BELT)
      expect(YELLOW_BELT).not.toBe(BLUE_BELT)
      expect(RED_BELT).not.toBe(BLUE_BELT)
    })
  })

  describe("Belt", () => {
    test("new Belt creates a Belt entity", () => {
      const belt = new Belt(Direction.North, YELLOW_BELT)
      expect(belt.entityType).toBe("Belt")
      expect(belt.direction).toBe(Direction.North)
      expect(belt.tier).toBe(YELLOW_BELT)
    })

    test("Belt has output", () => {
      const belt = new Belt(Direction.South, YELLOW_BELT)
      expect(belt.hasOutput()).toBe(true)
    })

    test("Belt has backwards input", () => {
      const belt = new Belt(Direction.East, YELLOW_BELT)
      expect(belt.hasBackwardsInput()).toBe(true)
    })

    test("instanceof identifies Belt entities", () => {
      const belt = new Belt(Direction.West, YELLOW_BELT)
      expect(belt instanceof Belt).toBe(true)
      expect(belt instanceof BeltConnectable).toBe(true)
    })
  })

  describe("UndergroundBelt", () => {
    test("new UndergroundBelt creates an UndergroundBelt entity", () => {
      const ug = new UndergroundBelt(Direction.North, true, YELLOW_BELT)
      expect(ug.entityType).toBe("UndergroundBelt")
      expect(ug.direction).toBe(Direction.North)
      expect(ug.isInput).toBe(true)
      expect(ug.tier).toBe(YELLOW_BELT)
    })

    test("input UndergroundBelt has no output", () => {
      const ugInput = new UndergroundBelt(Direction.North, true, YELLOW_BELT)
      expect(ugInput.hasOutput()).toBe(false)
    })

    test("output UndergroundBelt has output", () => {
      const ugOutput = new UndergroundBelt(Direction.North, false, YELLOW_BELT)
      expect(ugOutput.hasOutput()).toBe(true)
    })

    test("input UndergroundBelt has backwards input", () => {
      const ugInput = new UndergroundBelt(Direction.North, true, YELLOW_BELT)
      expect(ugInput.hasBackwardsInput()).toBe(true)
    })

    test("output UndergroundBelt has no backwards input", () => {
      const ugOutput = new UndergroundBelt(Direction.North, false, YELLOW_BELT)
      expect(ugOutput.hasBackwardsInput()).toBe(false)
    })

    test("shapeDirection for input belt", () => {
      const ugInput = new UndergroundBelt(Direction.North, true, YELLOW_BELT)
      expect(ugInput.shapeDirection()).toBe(Direction.South)
    })

    test("shapeDirection for output belt", () => {
      const ugOutput = new UndergroundBelt(Direction.South, false, YELLOW_BELT)
      expect(ugOutput.shapeDirection()).toBe(Direction.South)
    })

    test("flip flips input to output", () => {
      const ugInput = new UndergroundBelt(Direction.North, true, YELLOW_BELT)
      const flipped = ugInput.flip()
      expect(flipped.isInput).toBe(false)
      expect(flipped.direction).toBe(Direction.South)
      expect(flipped.tier).toBe(YELLOW_BELT)
    })

    test("flip flips output to input", () => {
      const ugOutput = new UndergroundBelt(Direction.East, false, RED_BELT)
      const flipped = ugOutput.flip()
      expect(flipped.isInput).toBe(true)
      expect(flipped.direction).toBe(Direction.West)
      expect(flipped.tier).toBe(RED_BELT)
    })

    test("instanceof identifies UndergroundBelt entities", () => {
      const ug = new UndergroundBelt(Direction.West, true, YELLOW_BELT)
      expect(ug instanceof UndergroundBelt).toBe(true)
      expect(ug instanceof BeltConnectable).toBe(true)
    })
  })

  describe("LoaderLike", () => {
    test("new LoaderLike creates a LoaderLike entity", () => {
      const loader = new LoaderLike(Direction.North, true, YELLOW_BELT)
      expect(loader.entityType).toBe("LoaderLike")
      expect(loader.direction).toBe(Direction.North)
      expect(loader.isInput).toBe(true)
      expect(loader.tier).toBe(YELLOW_BELT)
    })

    test("input LoaderLike has no output", () => {
      const loaderInput = new LoaderLike(Direction.North, true, YELLOW_BELT)
      expect(loaderInput.hasOutput()).toBe(false)
    })

    test("output LoaderLike has output", () => {
      const loaderOutput = new LoaderLike(Direction.North, false, YELLOW_BELT)
      expect(loaderOutput.hasOutput()).toBe(true)
    })

    test("input LoaderLike has backwards input", () => {
      const loaderInput = new LoaderLike(Direction.North, true, YELLOW_BELT)
      expect(loaderInput.hasBackwardsInput()).toBe(true)
    })

    test("output LoaderLike has no backwards input", () => {
      const loaderOutput = new LoaderLike(Direction.North, false, YELLOW_BELT)
      expect(loaderOutput.hasBackwardsInput()).toBe(false)
    })

    test("shapeDirection for input loader", () => {
      const loaderInput = new LoaderLike(Direction.North, true, YELLOW_BELT)
      expect(loaderInput.shapeDirection()).toBe(Direction.South)
    })

    test("shapeDirection for output loader", () => {
      const loaderOutput = new LoaderLike(Direction.South, false, YELLOW_BELT)
      expect(loaderOutput.shapeDirection()).toBe(Direction.South)
    })

    test("instanceof identifies LoaderLike entities", () => {
      const loader = new LoaderLike(Direction.West, true, YELLOW_BELT)
      expect(loader instanceof LoaderLike).toBe(true)
      expect(loader instanceof BeltConnectable).toBe(true)
    })
  })

  describe("Splitter", () => {
    test("new Splitter creates a Splitter entity", () => {
      const splitter = new Splitter(Direction.North, YELLOW_BELT)
      expect(splitter.entityType).toBe("Splitter")
      expect(splitter.direction).toBe(Direction.North)
      expect(splitter.tier).toBe(YELLOW_BELT)
    })

    test("Splitter has output", () => {
      const splitter = new Splitter(Direction.South, YELLOW_BELT)
      expect(splitter.hasOutput()).toBe(true)
    })

    test("Splitter has backwards input", () => {
      const splitter = new Splitter(Direction.East, YELLOW_BELT)
      expect(splitter.hasBackwardsInput()).toBe(true)
    })

    test("withTier updates tier", () => {
      const splitter = new Splitter(Direction.North, YELLOW_BELT)
      const upgraded = splitter.withTier(BLUE_BELT)
      expect(upgraded.tier).toBe(BLUE_BELT)
      expect(upgraded.direction).toBe(Direction.North)
    })

    test("instanceof identifies Splitter entities", () => {
      const splitter = new Splitter(Direction.West, YELLOW_BELT)
      expect(splitter instanceof Splitter).toBe(true)
      expect(splitter instanceof BeltConnectable).toBe(true)
    })
  })

  describe("BeltConnectable common methods", () => {
    test("outputDirection returns direction when belt has output", () => {
      const belt = new Belt(Direction.South, YELLOW_BELT)
      expect(belt.outputDirection()).toBe(Direction.South)
    })

    test("outputDirection returns undefined when belt has no output", () => {
      const ugInput = new UndergroundBelt(Direction.North, true, YELLOW_BELT)
      expect(ugInput.outputDirection()).toBe(undefined)
    })

    test("hasOutputGoing returns true when directions match", () => {
      const belt = new Belt(Direction.East, YELLOW_BELT)
      expect(belt.hasOutputGoing(Direction.East)).toBe(true)
    })

    test("hasOutputGoing returns false when directions don't match", () => {
      const belt = new Belt(Direction.East, YELLOW_BELT)
      expect(belt.hasOutputGoing(Direction.West)).toBe(false)
    })

    test("primaryInputDirection returns direction when belt has input", () => {
      const belt = new Belt(Direction.West, YELLOW_BELT)
      expect(belt.primaryInputDirection()).toBe(Direction.West)
    })

    test("primaryInputDirection returns undefined when belt has no input", () => {
      const ugOutput = new UndergroundBelt(Direction.North, false, YELLOW_BELT)
      expect(ugOutput.primaryInputDirection()).toBe(undefined)
    })

    test("hasInputGoing returns true when directions match", () => {
      const belt = new Belt(Direction.East, YELLOW_BELT)
      expect(belt.hasInputGoing(Direction.East)).toBe(true)
    })

    test("hasInputGoing returns false when directions don't match", () => {
      const belt = new Belt(Direction.East, YELLOW_BELT)
      expect(belt.hasInputGoing(Direction.West)).toBe(false)
    })
  })
})
