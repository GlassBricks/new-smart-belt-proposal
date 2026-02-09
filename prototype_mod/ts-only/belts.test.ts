import { describe, expect, test } from "bun:test"
import { UndergroundBelt } from "../common/belts"
import { Direction } from "../common/geometry"
import { RED_BELT, YELLOW_BELT } from "../common/belt_tiers"

describe("belts", () => {
  describe("UndergroundBelt", () => {
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
  })
})
