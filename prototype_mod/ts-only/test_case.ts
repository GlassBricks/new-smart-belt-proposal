import * as yaml from "js-yaml"
import {
  Belt,
  BeltConnectable,
  CollidingEntity,
  ImpassableTile,
  LoaderLike,
  Splitter,
  UndergroundBelt,
  type BeltCollider,
  type BeltTier,
} from "../common/belts"
import {
  boundsUnion,
  createRay,
  Direction,
  directionToVector,
  getRayPosition,
  oppositeDirection,
  pos,
  rayDistance,
  type BoundingBox,
  type Ray,
  type TilePosition,
} from "../common/geometry"
import {
  LineDrag,
  type ActionError,
  type ErrorHandler,
} from "../common/smart_belt/index"
import { BELT_TIERS } from "./belt_tiers"
import { SimulatedWorld } from "./simulated_world"
import {
  allUniqueTransforms,
  transformDirection,
  transformPosition,
  type Transform,
} from "./test-utils"

export enum TestVariant {
  Normal,
  Wiggle,
  MegaWiggle,
  ForwardBack,
}

export interface DragTestCase {
  name: string
  entities: TestCaseEntities
  afterForReverse: SimulatedWorld | undefined
  notReversible: boolean
  forwardBack: boolean
}

export interface TestCaseEntities {
  before: SimulatedWorld
  after: SimulatedWorld
  leftmostPos: TilePosition
  startPos: TilePosition
  beltDirection: Direction
  endPos: TilePosition
  tier: BeltTier
  expectedErrors: Set<string>
}

interface TestCaseSerialized {
  name?: string
  before: string
  after: string
  after_for_reverse?: string
  expected_errors?: string[]
  not_reversible?: boolean
  forward_back?: boolean
}

export type WorldParse = [SimulatedWorld, TilePosition[]]

export function serializeError(pos: TilePosition, error: ActionError): string {
  return `${pos.x},${pos.y}:${error}`
}

export function deserializeError(str: string): [TilePosition, ActionError] {
  const [posStr, errorStr] = str.split(":")
  const [xStr, yStr] = posStr!.split(",")
  return [pos(Number(xStr), Number(yStr)), errorStr as ActionError]
}

export function parseWorld(input: string): WorldParse {
  const world = new SimulatedWorld()
  const markers: TilePosition[] = []

  const lines = input.split("\n")
  for (let y = 0; y < lines.length; y++) {
    const line = lines[y]
    if (!line) continue
    const words = line.split(/\s+/).filter((w) => w.length > 0)
    for (let x = 0; x < words.length; x++) {
      const position = pos(x, y)
      let word = words[x]
      if (!word) continue

      while (word.startsWith("*")) {
        markers.push(position)
        word = word.slice(1)
      }

      const entity = parseWord(word)
      if (entity !== undefined) {
        world.set(position, entity)
      }
    }
  }

  return [world, markers]
}

function parseWord(input: string): BeltCollider | undefined {
  if (input === "" || input === "_") {
    return undefined
  }
  if (input === "X") {
    return new CollidingEntity("X")
  }
  if (input === "#") {
    return new ImpassableTile("#")
  }

  let i = 0

  let tierNum = 1
  if (i < input.length && input[i]! >= "1" && input[i]! <= "9") {
    tierNum = parseInt(input[i]!, 10)
    i++
  }

  if (tierNum < 1 || tierNum > BELT_TIERS.length) {
    throw new Error(`Invalid tier: ${tierNum}`)
  }
  const tier = BELT_TIERS[tierNum - 1]!

  if (i >= input.length) {
    throw new Error(`Missing direction in: ${input}`)
  }

  const direction = directionFromChar(input[i]!)
  if (direction === undefined) {
    throw new Error(`Invalid direction: ${input[i]}`)
  }
  i++

  const typeChar = i < input.length ? input[i] : undefined

  switch (typeChar) {
    case undefined:
    case "b":
      return new Belt(direction, tier)
    case "i":
      return new UndergroundBelt(direction, true, tier)
    case "o":
      return new UndergroundBelt(direction, false, tier)
    case "s":
      return new Splitter(direction, tier.splitterName!)
    case "I":
      return new LoaderLike(direction, true, tier.beltName + "-loader")
    case "O":
      return new LoaderLike(direction, false, tier.beltName + "-loader")
    default:
      throw new Error(`Invalid entity type: ${typeChar}`)
  }
}

export function directionToChar(dir: Direction): string {
  switch (dir) {
    case Direction.North:
      return "^"
    case Direction.East:
      return ">"
    case Direction.South:
      return "v"
    case Direction.West:
      return "<"
  }
}

export function directionFromChar(char: string): Direction | undefined {
  switch (char) {
    case "^":
      return Direction.North
    case ">":
      return Direction.East
    case "v":
      return Direction.South
    case "<":
      return Direction.West
    default:
      return undefined
  }
}

function printEntity(entity: BeltCollider): string {
  if (entity instanceof Belt) {
    const tierNum = BELT_TIERS.indexOf(entity.tier) + 1
    const dirChar = directionToChar(entity.direction)
    return tierNum === 1 ? dirChar : `${tierNum}${dirChar}`
  } else if (entity instanceof UndergroundBelt) {
    const tierNum = BELT_TIERS.indexOf(entity.tier) + 1
    const dirChar = directionToChar(entity.direction)
    const typeChar = entity.isInput ? "i" : "o"
    return tierNum === 1
      ? `${dirChar}${typeChar}`
      : `${tierNum}${dirChar}${typeChar}`
  } else if (entity instanceof Splitter) {
    const tierNum =
      BELT_TIERS.findIndex((tier) => entity.name == tier.splitterName) + 1
    const dirChar = directionToChar(entity.direction)
    return tierNum === 1 ? `${dirChar}s` : `${tierNum}${dirChar}s`
  } else if (entity instanceof LoaderLike) {
    const tierNum = BELT_TIERS.findIndex(
      (tier) => entity.name == tier.beltName + "-loader",
    )
    const dirChar = directionToChar(entity.direction)
    const typeChar = entity.isInput ? "I" : "O"
    return tierNum === 1
      ? `${dirChar}${typeChar}`
      : `${tierNum}${dirChar}${typeChar}`
  } else if (entity instanceof CollidingEntity) {
    return "X"
  } else if (entity instanceof ImpassableTile) {
    return "#"
  } else {
    return "?"
  }
}

export function printWorld(
  world: SimulatedWorld,
  bounds: BoundingBox,
  markers: TilePosition[],
): string {
  if (
    bounds.left_top.x === bounds.right_bottom.x ||
    bounds.left_top.y === bounds.right_bottom.y
  ) {
    return "<Empty>"
  }

  const lines: string[] = []
  for (let y = bounds.left_top.y; y < bounds.right_bottom.y; y++) {
    const words: string[] = []
    for (let x = bounds.left_top.x; x < bounds.right_bottom.x; x++) {
      const position = pos(x, y)
      const entity = world.get(position)

      let word: string
      if (entity) {
        word = printEntity(entity)
        if (markers.some((m) => m.x === position.x && m.y === position.y)) {
          word = "*" + word
        }
      } else {
        word = "_"
      }

      words.push(word.padEnd(4))
    }

    let line = words.join("").trimEnd()
    lines.push(line)
  }

  return lines.join("\n")
}

export function parseTestCase(yamlContent: string): DragTestCase {
  const serialized = yaml.load(yamlContent) as TestCaseSerialized

  const name = serialized.name || "Unnamed"
  const notReversible = serialized.not_reversible || false
  const forwardBack = serialized.forward_back || false

  const entities = getEntities(serialized)

  let afterForReverse: SimulatedWorld | undefined = undefined
  if (serialized.after_for_reverse) {
    const [world] = parseWorld(serialized.after_for_reverse)
    afterForReverse = world
  }

  return {
    name,
    entities,
    afterForReverse,
    notReversible,
    forwardBack,
  }
}

function getEntities(serde: TestCaseSerialized): TestCaseEntities {
  const [before, beforeMarkers] = parseWorld(serde.before)
  const [after, afterMarkers] = parseWorld(serde.after)

  const expectedErrorsList = serde.expected_errors || []

  if (afterMarkers.length !== expectedErrorsList.length) {
    throw new Error(
      `Expected number of markers (${afterMarkers.length}) to match number of expected errors (${expectedErrorsList.length})`,
    )
  }

  const expectedErrors = new Set<string>()
  for (let i = 0; i < afterMarkers.length; i++) {
    const position = afterMarkers[i]!
    const error = expectedErrorsList[i]!
    expectedErrors.add(serializeError(position, error as ActionError))
  }

  let startPos: TilePosition
  if (beforeMarkers.length > 0) {
    if (beforeMarkers.length > 1) {
      throw new Error("Expected exactly one marker for drag start position")
    }
    startPos = beforeMarkers[0]!
  } else {
    const entities = Array.from(after.getEntities())
    const firstAtX0 = entities.find(([pos]) => pos.x === 0)
    if (!firstAtX0) {
      throw new Error("No first position found")
    }
    startPos = firstAtX0[0]
  }

  const entitiesInRow = Array.from(after.getEntities())
    .filter(([p]) => p.y === startPos.y && p.x >= startPos.x)
    .sort((a, b) => a[0].x - b[0].x)

  const firstBelt = entitiesInRow.find(
    ([, ent]) => ent instanceof BeltConnectable,
  )
  if (!firstBelt) {
    throw new Error("No belt found in drag row")
  }

  const firstBeltEntity = firstBelt[1] as BeltConnectable
  const tier =
    firstBeltEntity.tier ??
    BELT_TIERS.find((tier) => tier.splitterName == firstBeltEntity.name)!
  const direction = firstBeltEntity.direction

  const maxX = Math.max(
    ...Array.from(before.getEntities())
      .map(([p]) => p.x)
      .concat(Array.from(after.getEntities()).map(([p]) => p.x)),
  )
  const endPos = pos(maxX, startPos.y)

  const leftmostPos = pos(0, startPos.y)

  return {
    before,
    after,
    tier,
    leftmostPos,
    startPos,
    endPos,
    beltDirection: direction,
    expectedErrors,
  }
}

export function runTestCase(
  test: TestCaseEntities,
  testVariant: TestVariant,
): [SimulatedWorld, Set<string>] {
  const { leftmostPos, startPos, beltDirection, endPos, tier } = test

  const ray = createRay(startPos, beltDirection)

  const snapped = getRayPosition(ray, rayDistance(ray, endPos))
  if (snapped.x !== endPos.x || snapped.y !== endPos.y) {
    throw new Error(
      "end_pos must be on the same line as start_pos in drag_direction",
    )
  }

  const result = test.before.clone()
  class TestErrorHandler implements ErrorHandler {
    errors: Array<[TilePosition, ActionError]> = []

    handleError(position: TilePosition, error: ActionError): void {
      this.errors.push([position, error])
    }
  }
  const errorHandler = new TestErrorHandler()
  const drag = LineDrag.startDrag(
    result,
    tier,
    startPos,
    beltDirection,
    errorHandler,
  )

  switch (testVariant) {
    case TestVariant.MegaWiggle:
      runMegaWiggle(drag, result, errorHandler, startPos, endPos, beltDirection)
      break
    case TestVariant.Wiggle:
      runWiggle(
        drag,
        result,
        errorHandler,
        startPos,
        endPos,
        beltDirection,
        ray,
      )
      break
    case TestVariant.ForwardBack:
      runForwardBack(drag, result, errorHandler, leftmostPos, endPos)
      break
    case TestVariant.Normal:
      drag.interpolateTo(result, errorHandler, endPos)
      break
  }

  const errors = new Set<string>()
  for (const [position, error] of errorHandler.errors) {
    errors.add(serializeError(position, error))
  }

  return [result, errors]
}

function runWiggle(
  drag: LineDrag,
  world: SimulatedWorld,
  errorHandler: ErrorHandler,
  startPos: TilePosition,
  endPos: TilePosition,
  dragDirection: Direction,
  ray: Ray,
): void {
  const endPosRay = rayDistance(ray, endPos)
  const dirVec = directionToVector(dragDirection)

  let currentPos = startPos

  while (rayDistance(ray, currentPos) + 2 < endPosRay) {
    const forward2 = pos(
      currentPos.x + dirVec.x * 2,
      currentPos.y + dirVec.y * 2,
    )
    drag.interpolateTo(world, errorHandler, forward2)
    const back1 = pos(currentPos.x + dirVec.x, currentPos.y + dirVec.y)
    drag.interpolateTo(world, errorHandler, back1)
    currentPos = back1
  }

  if (rayDistance(ray, currentPos) !== endPosRay) {
    drag.interpolateTo(world, errorHandler, endPos)
  }
}

function runMegaWiggle(
  drag: LineDrag,
  world: SimulatedWorld,
  errorHandler: ErrorHandler,
  startPos: TilePosition,
  endPos: TilePosition,
  dragDirection: Direction,
): void {
  const ray = createRay(startPos, dragDirection)
  const endPosRay = rayDistance(ray, endPos)
  const dirVec = directionToVector(dragDirection)

  let n = 1
  while (n < endPosRay) {
    const forwardN = pos(startPos.x + dirVec.x * n, startPos.y + dirVec.y * n)
    drag.interpolateTo(world, errorHandler, forwardN)
    drag.interpolateTo(world, errorHandler, startPos)
    n += 1
  }
  drag.interpolateTo(world, errorHandler, endPos)
}

function runForwardBack(
  drag: LineDrag,
  world: SimulatedWorld,
  errorHandler: ErrorHandler,
  leftmostPos: TilePosition,
  endPos: TilePosition,
): void {
  drag.interpolateTo(world, errorHandler, endPos)
  drag.interpolateTo(world, errorHandler, leftmostPos)
}

export function checkTestCase(
  test: TestCaseEntities,
  reverse: boolean,
  testVariant: TestVariant,
): string | undefined {
  const testToRun = reverse ? flipTestCase(test, undefined) : test

  const [result, actualErrors] = runTestCase(testToRun, testVariant)

  const expectedWorld = testToRun.after
  const expectedErrors = testToRun.expectedErrors

  const nonEmptySubsetOnly =
    testVariant === TestVariant.Wiggle || testVariant === TestVariant.MegaWiggle

  const errorsMatch = nonEmptySubsetOnly
    ? expectedErrors.size === 0
      ? actualErrors.size === 0
      : isSubset(expectedErrors, actualErrors)
    : setsEqual(actualErrors, expectedErrors)

  if (!result.equals(expectedWorld) || !errorsMatch) {
    const bounds = boundsUnion(
      testToRun.before.bounds(),
      testToRun.after.bounds(),
    )
    const expectedMarkers = Array.from(expectedErrors).map((e) => {
      const [position] = deserializeError(e)
      return position
    })
    const actualMarkers = Array.from(actualErrors).map((e) => {
      const [position] = deserializeError(e)
      return position
    })

    let message = "\nBefore:\n\n"
    message += printWorld(testToRun.before, bounds, [])
    message += "\n\nExpected:\n\n"
    message += printWorld(expectedWorld, bounds, expectedMarkers)
    message += "\n\nGot:\n\n"
    message += printWorld(result, bounds, actualMarkers)

    if (!errorsMatch) {
      message += "\n\nExpected errors:\n"
      message += JSON.stringify(Array.from(expectedErrors).sort())
      message += "\n\nGot errors:\n"
      message += JSON.stringify(Array.from(actualErrors).sort())
    }

    return message
  }

  return undefined
}

export function transformTestCase(
  test: TestCaseEntities,
  transform: Transform,
): TestCaseEntities {
  return {
    before: test.before.transformWorld(transform),
    after: test.after.transformWorld(transform),
    leftmostPos: transformPosition(transform, test.leftmostPos),
    startPos: transformPosition(transform, test.startPos),
    endPos: transformPosition(transform, test.endPos),
    beltDirection: transformDirection(transform, test.beltDirection),
    tier: test.tier,
    expectedErrors: new Set(
      Array.from(test.expectedErrors).map((e) => {
        const [position, error] = deserializeError(e)
        const transformed = transformPosition(transform, position)
        return serializeError(transformed, error)
      }),
    ),
  }
}

export function flipTestCase(
  test: TestCaseEntities,
  afterForReverse: SimulatedWorld | undefined,
): TestCaseEntities {
  return {
    before: test.before.flipAllEntities(),
    after: (afterForReverse || test.after).flipAllEntities(),
    leftmostPos: test.leftmostPos,
    startPos: test.startPos,
    endPos: test.endPos,
    beltDirection: oppositeDirection(test.beltDirection),
    tier: test.tier,
    expectedErrors: test.expectedErrors,
  }
}

function isSubset<T>(a: Set<T>, b: Set<T>): boolean {
  for (const item of a) {
    if (!b.has(item)) {
      return false
    }
  }
  return true
}

function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  return a.size === b.size && isSubset(a, b)
}

export function checkTestCaseAllTransforms(
  test: DragTestCase,
  reverse: boolean,
  testVariant: TestVariant,
): string | undefined {
  const transforms = allUniqueTransforms()

  for (let i = 0; i < transforms.length; i++) {
    const transform = transforms[i]!
    const transformedTest = transformTestCase(test.entities, transform)

    const testToCheck = reverse
      ? flipTestCase(
          transformedTest,
          test.afterForReverse
            ? test.afterForReverse.transformWorld(transform)
            : undefined,
        )
      : transformedTest

    let testName: string
    if (reverse) {
      switch (testVariant) {
        case TestVariant.Wiggle:
          testName = `[transform ${i}] [flip] [wiggle]`
          break
        case TestVariant.MegaWiggle:
          testName = `[transform ${i}] [flip] [mega_wiggle]`
          break
        case TestVariant.ForwardBack:
          testName = `[transform ${i}] [flip] [forward_back]`
          break
        case TestVariant.Normal:
          testName = `[transform ${i}] [flip]`
          break
      }
    } else {
      switch (testVariant) {
        case TestVariant.Wiggle:
          testName = `[transform ${i}] [wiggle]`
          break
        case TestVariant.MegaWiggle:
          testName = `[transform ${i}] [mega_wiggle]`
          break
        case TestVariant.ForwardBack:
          testName = `[transform ${i}] [forward_back]`
          break
        case TestVariant.Normal:
          testName = `[transform ${i}]`
          break
      }
    }

    const error = checkTestCase(testToCheck, false, testVariant)
    if (error !== undefined) {
      return `${testName}\n${error}`
    }
  }

  return undefined
}
