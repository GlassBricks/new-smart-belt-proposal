import { describe, expect, test } from "bun:test"
import {
  addVec,
  Axis,
  boundsContains,
  boundsNew,
  boundsUnion,
  createRay,
  createTransform,
  Direction,
  directionAxis,
  directionFromOrdinal,
  directionToVector,
  dotVec,
  getPositionOnRay,
  identityTransform,
  mulVec,
  oppositeDirection,
  pos,
  posEquals,
  rayPosition,
  rotateCCW,
  rotateCW,
  snapToRay,
  subPos,
  transformDirection,
  transformPosition,
  vec2,
} from "../common/geometry"

describe("geometry", () => {
  describe("Vector operations", () => {
    test("pos creates a position", () => {
      const p = pos(2, 3)
      expect(p.x).toBe(2)
      expect(p.y).toBe(3)
    })

    test("vec2 creates a vector", () => {
      const v = vec2(2, 3)
      expect(v.x).toBe(2)
      expect(v.y).toBe(3)
    })

    test("addVec adds vector to position", () => {
      const p = pos(1, 2)
      const v = vec2(3, 4)
      const result = addVec(p, v)
      expect(result.x).toBe(4)
      expect(result.y).toBe(6)
    })

    test("subPos subtracts positions", () => {
      const p1 = pos(5, 7)
      const p2 = pos(2, 3)
      const result = subPos(p1, p2)
      expect(result.x).toBe(3)
      expect(result.y).toBe(4)
    })

    test("mulVec multiplies vector by scalar", () => {
      const v = vec2(2, 3)
      const result = mulVec(v, 3)
      expect(result.x).toBe(6)
      expect(result.y).toBe(9)
    })

    test("dotVec computes dot product", () => {
      const v1 = vec2(2, 3)
      const v2 = vec2(4, 5)
      expect(dotVec(v1, v2)).toBe(2 * 4 + 3 * 5)
    })

    test("posEquals compares positions", () => {
      expect(posEquals(pos(1, 2), pos(1, 2))).toBe(true)
      expect(posEquals(pos(1, 2), pos(1, 3))).toBe(false)
      expect(posEquals(pos(1, 2), pos(2, 2))).toBe(false)
    })
  })

  describe("Direction", () => {
    test("directionToVector returns correct vectors", () => {
      expect(directionToVector(Direction.North)).toEqual({ x: 0, y: -1 })
      expect(directionToVector(Direction.East)).toEqual({ x: 1, y: 0 })
      expect(directionToVector(Direction.South)).toEqual({ x: 0, y: 1 })
      expect(directionToVector(Direction.West)).toEqual({ x: -1, y: 0 })
    })

    test("oppositeDirection returns correct opposites", () => {
      expect(oppositeDirection(Direction.North)).toBe(Direction.South)
      expect(oppositeDirection(Direction.East)).toBe(Direction.West)
      expect(oppositeDirection(Direction.South)).toBe(Direction.North)
      expect(oppositeDirection(Direction.West)).toBe(Direction.East)
    })

    test("rotateCW rotates clockwise", () => {
      expect(rotateCW(Direction.North)).toBe(Direction.East)
      expect(rotateCW(Direction.East)).toBe(Direction.South)
      expect(rotateCW(Direction.South)).toBe(Direction.West)
      expect(rotateCW(Direction.West)).toBe(Direction.North)
    })

    test("rotateCCW rotates counter-clockwise", () => {
      expect(rotateCCW(Direction.North)).toBe(Direction.West)
      expect(rotateCCW(Direction.East)).toBe(Direction.North)
      expect(rotateCCW(Direction.South)).toBe(Direction.East)
      expect(rotateCCW(Direction.West)).toBe(Direction.South)
    })

    test("directionAxis returns correct axis", () => {
      expect(directionAxis(Direction.North)).toBe(Axis.Y)
      expect(directionAxis(Direction.South)).toBe(Axis.Y)
      expect(directionAxis(Direction.East)).toBe(Axis.X)
      expect(directionAxis(Direction.West)).toBe(Axis.X)
    })

    test("directionFromOrdinal converts numbers to directions", () => {
      expect(directionFromOrdinal(0)).toBe(Direction.North)
      expect(directionFromOrdinal(1)).toBe(Direction.East)
      expect(directionFromOrdinal(2)).toBe(Direction.South)
      expect(directionFromOrdinal(3)).toBe(Direction.West)
      expect(directionFromOrdinal(4)).toBe(undefined)
      expect(directionFromOrdinal(-1)).toBe(undefined)
    })
  })

  describe("Ray", () => {
    test("rayPosition calculates distance along ray - North", () => {
      const ray = createRay(pos(0, 0), Direction.North)
      expect(rayPosition(ray, pos(0, -5))).toBe(5)
      expect(rayPosition(ray, pos(0, 5))).toBe(-5)
    })

    test("rayPosition calculates distance along ray - East", () => {
      const ray = createRay(pos(0, 0), Direction.East)
      expect(rayPosition(ray, pos(5, 0))).toBe(5)
      expect(rayPosition(ray, pos(-5, 0))).toBe(-5)
    })

    test("rayPosition calculates distance along ray - South", () => {
      const ray = createRay(pos(0, 0), Direction.South)
      expect(rayPosition(ray, pos(0, 5))).toBe(5)
      expect(rayPosition(ray, pos(0, -5))).toBe(-5)
    })

    test("rayPosition calculates distance along ray - West", () => {
      const ray = createRay(pos(0, 0), Direction.West)
      expect(rayPosition(ray, pos(5, 0))).toBe(-5)
      expect(rayPosition(ray, pos(-5, 0))).toBe(5)
    })

    test("getPositionOnRay returns position at index - North", () => {
      const ray = createRay(pos(1, 1), Direction.North)
      const result = getPositionOnRay(ray, 5)
      expect(result).toEqual(pos(1, -4))
    })

    test("getPositionOnRay returns position at index - East", () => {
      const ray = createRay(pos(1, 1), Direction.East)
      const result = getPositionOnRay(ray, 5)
      expect(result).toEqual(pos(6, 1))
    })

    test("getPositionOnRay returns position at index - South", () => {
      const ray = createRay(pos(1, 1), Direction.South)
      const result = getPositionOnRay(ray, 5)
      expect(result).toEqual(pos(1, 6))
    })

    test("getPositionOnRay returns position at index - West", () => {
      const ray = createRay(pos(1, 1), Direction.West)
      const result = getPositionOnRay(ray, 5)
      expect(result).toEqual(pos(-4, 1))
    })

    test("snapToRay snaps position to ray - North", () => {
      const ray = createRay(pos(1, 1), Direction.North)
      expect(snapToRay(ray, pos(5, -4))).toEqual(pos(1, -4))
    })

    test("snapToRay snaps position to ray - East", () => {
      const ray = createRay(pos(1, 1), Direction.East)
      expect(snapToRay(ray, pos(6, 5))).toEqual(pos(6, 1))
    })

    test("snapToRay snaps position to ray - South", () => {
      const ray = createRay(pos(1, 1), Direction.South)
      expect(snapToRay(ray, pos(5, 6))).toEqual(pos(1, 6))
    })

    test("snapToRay snaps position to ray - West", () => {
      const ray = createRay(pos(1, 1), Direction.West)
      expect(snapToRay(ray, pos(-4, 5))).toEqual(pos(-4, 1))
    })
  })

  describe("BoundingBox", () => {
    test("boundsNew creates bounding box", () => {
      const bounds = boundsNew(pos(1, 2), pos(5, 7))
      expect(bounds.min).toEqual(pos(1, 2))
      expect(bounds.max).toEqual(pos(5, 7))
    })

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
    test("identityTransform creates identity", () => {
      const t = identityTransform()
      expect(t.flipX).toBe(false)
      expect(t.flipY).toBe(false)
      expect(t.swapXY).toBe(false)
    })

    test("transformPosition with identity returns same position", () => {
      const t = identityTransform()
      const result = transformPosition(t, pos(2, 3))
      expect(result).toEqual(pos(2, 3))
    })

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

    test("transformDirection with identity", () => {
      const t = identityTransform()
      expect(transformDirection(t, Direction.North)).toBe(Direction.North)
      expect(transformDirection(t, Direction.East)).toBe(Direction.East)
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
