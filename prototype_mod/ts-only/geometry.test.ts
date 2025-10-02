import { describe, expect, test } from "bun:test"
import {
  Axis,
  boundsContains,
  boundsNew,
  boundsUnion,
  createRay,
  createTransform,
  Direction,
  directionAxis,
  getRayPosition,
  pos,
  rayDistance,
  transformDirection,
  transformPosition,
} from "../common/geometry"

describe("geometry", () => {
  describe("Direction", () => {
    test("directionAxis returns correct axis", () => {
      expect(directionAxis(Direction.North)).toBe(Axis.Y)
      expect(directionAxis(Direction.South)).toBe(Axis.Y)
      expect(directionAxis(Direction.East)).toBe(Axis.X)
      expect(directionAxis(Direction.West)).toBe(Axis.X)
    })
  })

  describe("Ray", () => {
    test("rayPosition calculates distance along ray - North", () => {
      const ray = createRay(pos(0, 0), Direction.North)
      expect(rayDistance(ray, pos(0, -5))).toBe(5)
      expect(rayDistance(ray, pos(0, 5))).toBe(-5)
    })

    test("rayPosition calculates distance along ray - East", () => {
      const ray = createRay(pos(0, 0), Direction.East)
      expect(rayDistance(ray, pos(5, 0))).toBe(5)
      expect(rayDistance(ray, pos(-5, 0))).toBe(-5)
    })

    test("rayPosition calculates distance along ray - South", () => {
      const ray = createRay(pos(0, 0), Direction.South)
      expect(rayDistance(ray, pos(0, 5))).toBe(5)
      expect(rayDistance(ray, pos(0, -5))).toBe(-5)
    })

    test("rayPosition calculates distance along ray - West", () => {
      const ray = createRay(pos(0, 0), Direction.West)
      expect(rayDistance(ray, pos(5, 0))).toBe(-5)
      expect(rayDistance(ray, pos(-5, 0))).toBe(5)
    })

    test("getPositionOnRay returns position at index - North", () => {
      const ray = createRay(pos(1, 1), Direction.North)
      const result = getRayPosition(ray, 5)
      expect(result).toEqual(pos(1, -4))
    })

    test("getPositionOnRay returns position at index - East", () => {
      const ray = createRay(pos(1, 1), Direction.East)
      const result = getRayPosition(ray, 5)
      expect(result).toEqual(pos(6, 1))
    })

    test("getPositionOnRay returns position at index - South", () => {
      const ray = createRay(pos(1, 1), Direction.South)
      const result = getRayPosition(ray, 5)
      expect(result).toEqual(pos(1, 6))
    })

    test("getPositionOnRay returns position at index - West", () => {
      const ray = createRay(pos(1, 1), Direction.West)
      const result = getRayPosition(ray, 5)
      expect(result).toEqual(pos(-4, 1))
    })
  })

  describe("BoundingBox", () => {
    test("boundsUnion combines two boxes", () => {
      const b1 = boundsNew(pos(0, 0), pos(5, 5))
      const b2 = boundsNew(pos(3, 3), pos(8, 8))
      const result = boundsUnion(b1, b2)
      expect(result.min).toEqual(pos(0, 0))
      expect(result.max).toEqual(pos(8, 8))
    })

    test("boundsContains checks if position is inside", () => {
      const bounds = boundsNew(pos(0, 0), pos(5, 5))
      expect(boundsContains(bounds, pos(2, 3))).toBe(true)
      expect(boundsContains(bounds, pos(0, 0))).toBe(true)
      expect(boundsContains(bounds, pos(5, 5))).toBe(true)
      expect(boundsContains(bounds, pos(-1, 3))).toBe(false)
      expect(boundsContains(bounds, pos(6, 3))).toBe(false)
      expect(boundsContains(bounds, pos(3, -1))).toBe(false)
      expect(boundsContains(bounds, pos(3, 6))).toBe(false)
    })
  })

  describe("Transform", () => {
    test("transformPosition with flipX", () => {
      const t = createTransform(true, false, false)
      expect(transformPosition(t, pos(2, 3))).toEqual(pos(-2, 3))
    })

    test("transformPosition with flipY", () => {
      const t = createTransform(false, true, false)
      expect(transformPosition(t, pos(2, 3))).toEqual(pos(2, -3))
    })

    test("transformPosition with both flips", () => {
      const t = createTransform(true, true, false)
      expect(transformPosition(t, pos(2, 3))).toEqual(pos(-2, -3))
    })

    test("transformPosition with swapXY", () => {
      const t = createTransform(false, false, true)
      expect(transformPosition(t, pos(2, 3))).toEqual(pos(3, 2))
    })

    test("transformPosition with 90° CW (flipX + swapXY)", () => {
      const t = createTransform(true, false, true)
      expect(transformPosition(t, pos(2, 3))).toEqual(pos(-3, 2))
    })

    test("transformPosition with 180° (flipX + flipY)", () => {
      const t = createTransform(true, true, false)
      expect(transformPosition(t, pos(2, 3))).toEqual(pos(-2, -3))
    })

    test("transformPosition with 90° CCW (flipY + swapXY)", () => {
      const t = createTransform(false, true, true)
      expect(transformPosition(t, pos(2, 3))).toEqual(pos(3, -2))
    })

    test("transformDirection with flipX", () => {
      const t = createTransform(true, false, false)
      expect(transformDirection(t, Direction.East)).toBe(Direction.West)
      expect(transformDirection(t, Direction.West)).toBe(Direction.East)
      expect(transformDirection(t, Direction.North)).toBe(Direction.North)
    })

    test("transformDirection with flipY", () => {
      const t = createTransform(false, true, false)
      expect(transformDirection(t, Direction.North)).toBe(Direction.South)
      expect(transformDirection(t, Direction.South)).toBe(Direction.North)
      expect(transformDirection(t, Direction.East)).toBe(Direction.East)
    })

    test("transformDirection with 90° CW", () => {
      const t = createTransform(true, false, true)
      expect(transformDirection(t, Direction.North)).toBe(Direction.East)
      expect(transformDirection(t, Direction.East)).toBe(Direction.South)
    })

    test("transformDirection with 180°", () => {
      const t = createTransform(true, true, false)
      expect(transformDirection(t, Direction.North)).toBe(Direction.South)
    })

    test("transformDirection with 90° CCW", () => {
      const t = createTransform(false, true, true)
      expect(transformDirection(t, Direction.North)).toBe(Direction.West)
    })

    test("combined flip and rotation", () => {
      const posTest = pos(3, 4)
      const t = createTransform(true, true, true)
      const result = transformPosition(t, posTest)
      expect(result).toEqual(pos(-4, -3))

      const dirResult = transformDirection(t, Direction.North)
      expect(dirResult).toBe(Direction.East)
    })
  })
})
