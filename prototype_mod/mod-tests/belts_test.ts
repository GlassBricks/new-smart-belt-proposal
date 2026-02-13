import { UndergroundBelt } from "../common/belts"
import { Direction } from "../common/geometry"
import { RED_BELT, YELLOW_BELT } from "../common/belt_tiers"

describe("belts", () => {
  describe("UndergroundBelt.flip", () => {
    test("flips input to output", () => {
      const ugInput = new UndergroundBelt(Direction.North, true, YELLOW_BELT)
      const flipped = ugInput.flip()
      assert(flipped.isInput === false)
      assert(flipped.direction === Direction.South)
      assert(flipped.tier === YELLOW_BELT)
    })

    test("flips output to input", () => {
      const ugOutput = new UndergroundBelt(Direction.East, false, RED_BELT)
      const flipped = ugOutput.flip()
      assert(flipped.isInput === true)
      assert(flipped.direction === Direction.West)
      assert(flipped.tier === RED_BELT)
    })
  })
})
