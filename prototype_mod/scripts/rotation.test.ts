import { describe, expect, test } from "bun:test"
import { YELLOW_BELT } from "../common/belt_tiers"
import { Direction, pos, type TilePosition } from "../common/geometry"
import { ActionError, LineDrag, type ErrorHandler } from "../common/smart_belt/index"
import { SimulatedWorld } from "./simulated_world"
import {
  parseWorld,
  printWorld,
  serializeError,
  toSimulatedWorld,
} from "./test_case"
import {
  allUniqueTransforms,
  transformDirection,
  transformPosition,
} from "./test-utils"

type DragStep =
  | { type: "moveTo"; target: TilePosition }
  | { type: "rotate"; cursor: TilePosition }

interface RotationTestCase {
  before: string
  after: string
  start: TilePosition
  direction: Direction
  steps: DragStep[]
  expectedErrors: Set<string>
}

function runRotationSteps(
  world: SimulatedWorld,
  start: TilePosition,
  direction: Direction,
  steps: DragStep[],
): Set<string> {
  const errors: Array<[TilePosition, ActionError]> = []
  const errorHandler: ErrorHandler = {
    handleError(position, error) {
      errors.push([position, error])
    },
  }

  let drag = LineDrag.startDrag(world, errorHandler, YELLOW_BELT, start, direction)
  for (const step of steps) {
    if (step.type === "moveTo") {
      drag.interpolateTo(world, errorHandler, step.target)
    } else {
      const [newDrag, rotated] = drag.rotate(world, errorHandler, step.cursor)
      expect(rotated).toBe(true)
      drag = newDrag
    }
  }

  return new Set(errors.map(([p, e]) => serializeError(p, e)))
}

function checkRotationTest(tc: RotationTestCase): void {
  for (const [i, transform] of allUniqueTransforms().entries()) {
    const tStart = transformPosition(transform, tc.start)
    const tDirection = transformDirection(transform, tc.direction)
    const tSteps: DragStep[] = tc.steps.map((s) =>
      s.type === "moveTo"
        ? { type: "moveTo", target: transformPosition(transform, s.target) }
        : { type: "rotate", cursor: transformPosition(transform, s.cursor) },
    )

    const beforeParsed = parseWorld(tc.before)
    const tBefore = toSimulatedWorld(beforeParsed.entities).transformWorld(transform)

    const afterParsed = parseWorld(tc.after)
    const tExpected = toSimulatedWorld(afterParsed.entities).transformWorld(transform)

    const tExpectedErrors = new Set(
      Array.from(tc.expectedErrors).map((e) => {
        const [posStr, errorStr] = e.split(":")
        const [xStr, yStr] = posStr!.split(",")
        const p = pos(Number(xStr), Number(yStr))
        const tp = transformPosition(transform, p)
        return serializeError(tp, errorStr as ActionError)
      }),
    )

    const result = tBefore.clone()
    const actualErrors = runRotationSteps(result, tStart, tDirection, tSteps)

    const bounds = tBefore.bounds()
    const expectedBounds = tExpected.bounds()
    const resultBounds = result.bounds()
    const combinedBounds = {
      left_top: {
        x: Math.min(bounds.left_top.x, expectedBounds.left_top.x, resultBounds.left_top.x),
        y: Math.min(bounds.left_top.y, expectedBounds.left_top.y, resultBounds.left_top.y),
      },
      right_bottom: {
        x: Math.max(bounds.right_bottom.x, expectedBounds.right_bottom.x, resultBounds.right_bottom.x),
        y: Math.max(bounds.right_bottom.y, expectedBounds.right_bottom.y, resultBounds.right_bottom.y),
      },
    }

    if (!result.equals(tExpected) || !setsEqual(actualErrors, tExpectedErrors)) {
      const expectedMarkers = Array.from(tExpectedErrors).map((e) => {
        const [posStr] = e.split(":")
        const [x, y] = posStr!.split(",")
        return pos(Number(x), Number(y))
      })
      const actualMarkers = Array.from(actualErrors).map((e) => {
        const [posStr] = e.split(":")
        const [x, y] = posStr!.split(",")
        return pos(Number(x), Number(y))
      })

      let msg = `[transform ${i}]\n\nBefore:\n${printWorld(tBefore, combinedBounds, [])}`
      msg += `\n\nExpected:\n${printWorld(tExpected, combinedBounds, expectedMarkers)}`
      msg += `\n\nGot:\n${printWorld(result, combinedBounds, actualMarkers)}`
      if (!setsEqual(actualErrors, tExpectedErrors)) {
        msg += `\n\nExpected errors: ${JSON.stringify([...tExpectedErrors].sort())}`
        msg += `\nGot errors: ${JSON.stringify([...actualErrors].sort())}`
      }
      throw new Error(msg)
    }
  }
}

function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false
  for (const item of a) {
    if (!b.has(item)) return false
  }
  return true
}

describe("rotation", () => {
  test("basic forward rotation", () => {
    checkRotationTest({
      before: "_ _ _\n_ _ _\n_ _ _",
      after: "> > v\n_ _ v\n_ _ _",
      start: pos(0, 0),
      direction: Direction.East,
      steps: [
        { type: "moveTo", target: pos(2, 0) },
        { type: "rotate", cursor: pos(2, 1) },
        { type: "moveTo", target: pos(2, 1) },
      ],
      expectedErrors: new Set(),
    })
  })

  test("basic backward rotation", () => {
    checkRotationTest({
      before: "_ _ _\n_ _ _\n_ _ _",
      after: "> > >\n^\n^",
      start: pos(2, 0),
      direction: Direction.East,
      steps: [
        { type: "moveTo", target: pos(0, 0) },
        { type: "rotate", cursor: pos(0, 2) },
      ],
      expectedErrors: new Set(),
    })
  })

  test("drag over forwards bend creates t-shape", () => {
    checkRotationTest({
      before: "_ _ _\n_ _ _\n_ _ _",
      after: "< < <\n_ ^ _\n_ ^ _",
      start: pos(1, 2),
      direction: Direction.North,
      steps: [
        { type: "moveTo", target: pos(1, 0) },
        { type: "rotate", cursor: pos(0, 0) },
        { type: "moveTo", target: pos(2, 0) },
      ],
      expectedErrors: new Set(),
    })
  })

  test("drag over backwards bend is error", () => {
    checkRotationTest({
      before: "",
      after: "_ _ ^ _\n_ _ ^ _\n> > ^ *>",
      start: pos(2, 0),
      direction: Direction.North,
      steps: [
        { type: "moveTo", target: pos(2, 2) },
        { type: "rotate", cursor: pos(0, 2) },
        { type: "moveTo", target: pos(3, 2) },
      ],
      expectedErrors: new Set([serializeError(pos(3, 2), ActionError.BeltLineBroken)]),
    })
  })

  test("rotation at output ug is error", () => {
    checkRotationTest({
      before: "_ _ X _ _\n_ _ _ _ _\n_ _ _ _ _",
      after: "> >i X >o _\n_ _ _ v _\n_ _ _ _ _",
      start: pos(0, 0),
      direction: Direction.East,
      steps: [
        { type: "moveTo", target: pos(3, 0) },
        { type: "rotate", cursor: pos(3, 1) },
      ],
      expectedErrors: new Set([serializeError(pos(3, 0), ActionError.EntityInTheWay)]),
    })
  })

  test("rotation over obstacle is error", () => {
    checkRotationTest({
      before: "_ _ X X _\n_ _ _ _ _\n_ _ _ _ _",
      after: "> > X X _\n_ _ _ v _\n_ _ _ _ _",
      start: pos(0, 0),
      direction: Direction.East,
      steps: [
        { type: "moveTo", target: pos(3, 0) },
        { type: "rotate", cursor: pos(3, 1) },
      ],
      expectedErrors: new Set([serializeError(pos(3, 0), ActionError.EntityInTheWay)]),
    })
  })
})
