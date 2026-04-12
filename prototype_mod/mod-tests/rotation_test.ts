import { Direction, type TilePosition } from "../common/geometry"
import type { TestEntity } from "../common/test_entity"
import {
  startErrorRecording,
  stopErrorRecording,
} from "../mod-scripts/real_world"
import {
  assertEntities,
  assertErrors,
  boundsFromPositions,
  fireSmartBeltEvent,
  OFFSET_X,
  OFFSET_Y,
  setupTestWorld,
  toFacDir,
} from "./test_helpers"

interface DragEvent {
  pos: TilePosition
  direction: Direction
}

interface RotationTestCase {
  before: [TilePosition, TestEntity][]
  after: [TilePosition, TestEntity][]
  beltName: string
  events: DragEvent[]
  expectedErrors: string[]
}

function expandEvents(events: DragEvent[]): DragEvent[] {
  const result: DragEvent[] = [events[0]!]
  for (let i = 1; i < events.length; i++) {
    const prev = events[i - 1]!
    const curr = events[i]!
    const dx = Math.sign(curr.pos.x - prev.pos.x)
    const dy = Math.sign(curr.pos.y - prev.pos.y)
    let cx = prev.pos.x + dx
    let cy = prev.pos.y + dy
    while (cx !== curr.pos.x || cy !== curr.pos.y) {
      result.push({ pos: { x: cx, y: cy }, direction: curr.direction })
      cx += dx
      cy += dy
    }
    result.push(curr)
  }
  return result
}

function runRotationTest(tc: RotationTestCase): void {
  const allPositions = [
    ...tc.before.map(([p]) => p),
    ...tc.after.map(([p]) => p),
    ...tc.events.map((ev) => ev.pos),
  ]
  const bounds = boundsFromPositions(allPositions)
  const { player } = setupTestWorld(tc.before, tc.beltName, bounds)
  const smarterName = "smarter-" + tc.beltName

  startErrorRecording()

  const expanded = expandEvents(tc.events)
  for (let i = 0; i < expanded.length; i++) {
    const ev = expanded[i]!
    fireSmartBeltEvent(
      player,
      smarterName,
      { x: ev.pos.x + OFFSET_X + 0.5, y: ev.pos.y + OFFSET_Y + 0.5 },
      toFacDir(ev.direction),
      i > 0,
      defines.build_mode.normal,
    )
  }

  player.clear_cursor()
  const errors = stopErrorRecording()

  assertEntities(player.surface, tc.after, bounds)
  assertErrors(tc.expectedErrors, errors, undefined)
}

function p(x: number, y: number): TilePosition {
  return { x, y }
}

function belt(dir: Direction): TestEntity {
  return { kind: "belt", direction: dir, tier: 1 }
}

function ugInput(dir: Direction): TestEntity {
  return { kind: "underground-belt", direction: dir, tier: 1, ioType: "input" }
}

function ugOutput(dir: Direction): TestEntity {
  return { kind: "underground-belt", direction: dir, tier: 1, ioType: "output" }
}

function obstacle(): TestEntity {
  return { kind: "obstacle" }
}

const E = Direction.East
const S = Direction.South
const W = Direction.West
const N = Direction.North

describe("rotation", () => {
  test("basic forward rotation", () => {
    runRotationTest({
      before: [],
      after: [
        [p(0, 0), belt(E)],
        [p(1, 0), belt(E)],
        [p(2, 0), belt(S)],
        [p(2, 1), belt(S)],
      ],
      beltName: "transport-belt",
      events: [
        { pos: p(0, 0), direction: E },
        { pos: p(2, 0), direction: E },
        { pos: p(2, 1), direction: S },
      ],
      expectedErrors: [],
    })
  })

  test("basic backward rotation", () => {
    runRotationTest({
      before: [],
      after: [
        [p(0, 0), belt(E)],
        [p(1, 0), belt(E)],
        [p(2, 0), belt(E)],
        [p(0, 1), belt(N)],
        [p(0, 2), belt(N)],
      ],
      beltName: "transport-belt",
      events: [
        { pos: p(2, 0), direction: E },
        { pos: p(0, 0), direction: E },
        { pos: p(0, 1), direction: S },
        { pos: p(0, 2), direction: S },
      ],
      expectedErrors: [],
    })
  })

  test("drag over forwards bend creates t-shape", () => {
    runRotationTest({
      before: [],
      after: [
        [p(0, 0), belt(W)],
        [p(1, 0), belt(W)],
        [p(2, 0), belt(W)],
        [p(1, 1), belt(N)],
        [p(1, 2), belt(N)],
      ],
      beltName: "transport-belt",
      events: [
        { pos: p(1, 2), direction: N },
        { pos: p(1, 0), direction: N },
        { pos: p(0, 0), direction: W },
        { pos: p(2, 0), direction: W },
      ],
      expectedErrors: [],
    })
  })

  test("drag over backwards bend is error", () => {
    runRotationTest({
      before: [],
      after: [
        [p(2, 0), belt(N)],
        [p(2, 1), belt(N)],
        [p(0, 2), belt(E)],
        [p(1, 2), belt(E)],
        [p(2, 2), belt(N)],
        [p(3, 2), belt(E)],
      ],
      beltName: "transport-belt",
      events: [
        { pos: p(2, 0), direction: N },
        { pos: p(2, 2), direction: N },
        { pos: p(0, 2), direction: W },
        { pos: p(3, 2), direction: E },
      ],
      expectedErrors: ["3,2:belt_line_broken"],
    })
  })

  test("rotation at output ug is error", () => {
    runRotationTest({
      before: [[p(2, 0), obstacle()]],
      after: [
        [p(0, 0), belt(E)],
        [p(1, 0), ugInput(E)],
        [p(3, 0), ugOutput(E)],
        [p(3, 1), belt(S)],
      ],
      beltName: "transport-belt",
      events: [
        { pos: p(0, 0), direction: E },
        { pos: p(3, 0), direction: E },
        { pos: p(3, 1), direction: S },
      ],
      expectedErrors: ["3,0:entity_in_the_way"],
    })
  })
})
