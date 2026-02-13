import {
  Axis,
  boundsContains,
  boundsNew,
  boundsUnion,
  createRay,
  Direction,
  directionAxis,
  getRayPosition,
  pos,
  rayDistance,
  rayRelativeDirection,
} from "../common/geometry"

describe("geometry", () => {
  describe("directionAxis", () => {
    test("returns correct axis", () => {
      assert(directionAxis(Direction.North) === Axis.Y)
      assert(directionAxis(Direction.South) === Axis.Y)
      assert(directionAxis(Direction.East) === Axis.X)
      assert(directionAxis(Direction.West) === Axis.X)
    })
  })

  describe("rayDistance", () => {
    test("North", () => {
      const ray = createRay(pos(0, 0), Direction.North)
      assert(rayDistance(ray, pos(0, -5)) === 5)
      assert(rayDistance(ray, pos(0, 5)) === -5)
    })

    test("East", () => {
      const ray = createRay(pos(0, 0), Direction.East)
      assert(rayDistance(ray, pos(5, 0)) === 5)
      assert(rayDistance(ray, pos(-5, 0)) === -5)
    })

    test("South", () => {
      const ray = createRay(pos(0, 0), Direction.South)
      assert(rayDistance(ray, pos(0, 5)) === 5)
      assert(rayDistance(ray, pos(0, -5)) === -5)
    })

    test("West", () => {
      const ray = createRay(pos(0, 0), Direction.West)
      assert(rayDistance(ray, pos(5, 0)) === -5)
      assert(rayDistance(ray, pos(-5, 0)) === 5)
    })
  })

  describe("getRayPosition", () => {
    test("North", () => {
      const ray = createRay(pos(1, 1), Direction.North)
      const result = getRayPosition(ray, 5)
      assert(result.x === 1 && result.y === -4)
    })

    test("East", () => {
      const ray = createRay(pos(1, 1), Direction.East)
      const result = getRayPosition(ray, 5)
      assert(result.x === 6 && result.y === 1)
    })

    test("South", () => {
      const ray = createRay(pos(1, 1), Direction.South)
      const result = getRayPosition(ray, 5)
      assert(result.x === 1 && result.y === 6)
    })

    test("West", () => {
      const ray = createRay(pos(1, 1), Direction.West)
      const result = getRayPosition(ray, 5)
      assert(result.x === -4 && result.y === 1)
    })
  })

  describe("rayRelativeDirection", () => {
    test("East ray with North/South positions", () => {
      const ray = createRay(pos(0, 0), Direction.East)
      assert(rayRelativeDirection(ray, pos(5, -3)) === Direction.North)
      assert(rayRelativeDirection(ray, pos(5, 3)) === Direction.South)
      assert(rayRelativeDirection(ray, pos(5, 0)) === undefined)
    })

    test("North ray with East/West positions", () => {
      const ray = createRay(pos(0, 0), Direction.North)
      assert(rayRelativeDirection(ray, pos(-3, -5)) === Direction.West)
      assert(rayRelativeDirection(ray, pos(3, -5)) === Direction.East)
      assert(rayRelativeDirection(ray, pos(0, -5)) === undefined)
    })

    test("South ray with East/West positions", () => {
      const ray = createRay(pos(0, 0), Direction.South)
      assert(rayRelativeDirection(ray, pos(3, 5)) === Direction.East)
      assert(rayRelativeDirection(ray, pos(-3, 5)) === Direction.West)
      assert(rayRelativeDirection(ray, pos(0, 5)) === undefined)
    })

    test("West ray with North/South positions", () => {
      const ray = createRay(pos(0, 0), Direction.West)
      assert(rayRelativeDirection(ray, pos(-5, 3)) === Direction.South)
      assert(rayRelativeDirection(ray, pos(-5, -3)) === Direction.North)
      assert(rayRelativeDirection(ray, pos(-5, 0)) === undefined)
    })
  })

  describe("boundsUnion", () => {
    test("combines two boxes", () => {
      const b1 = boundsNew(pos(0, 0), pos(5, 5))
      const b2 = boundsNew(pos(3, 3), pos(8, 8))
      const result = boundsUnion(b1, b2)
      assert(result.left_top.x === 0 && result.left_top.y === 0)
      assert(result.right_bottom.x === 8 && result.right_bottom.y === 8)
    })
  })

  describe("boundsContains", () => {
    test("checks if position is inside", () => {
      const bounds = boundsNew(pos(0, 0), pos(5, 5))
      assert(boundsContains(bounds, pos(2, 3)) === true)
      assert(boundsContains(bounds, pos(0, 0)) === true)
      assert(boundsContains(bounds, pos(5, 5)) === true)
      assert(boundsContains(bounds, pos(-1, 3)) === false)
      assert(boundsContains(bounds, pos(6, 3)) === false)
      assert(boundsContains(bounds, pos(3, -1)) === false)
      assert(boundsContains(bounds, pos(3, 6)) === false)
    })
  })
})
