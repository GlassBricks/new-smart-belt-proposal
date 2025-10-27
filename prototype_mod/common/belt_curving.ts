import { Belt } from "./belts"
import {
  Direction,
  directionAxis,
  directionToVector,
  subPos,
  type TilePosition,
} from "./geometry"
import { type ReadonlyWorld } from "./world"

export interface BeltConnections {
  readonly input: Direction | undefined
  readonly output: Direction | undefined
}

export function beltCurvedInputDirection(
  world: ReadonlyWorld,
  position: TilePosition,
  beltDirection: Direction,
): Direction {
  const hasInputIn = (direction: Direction): boolean => {
    const dirVec = directionToVector(direction)
    const queryPos = subPos(position, dirVec)
    return world.outputDirectionAt(queryPos) === direction
  }

  if (hasInputIn(beltDirection)) {
    return beltDirection
  }

  const rotateCW = ((beltDirection + 1) % 4) as Direction
  const rotateCCW = ((beltDirection + 3) % 4) as Direction

  const leftInput = hasInputIn(rotateCW)
  const rightInput = hasInputIn(rotateCCW)

  if (leftInput && !rightInput) {
    return rotateCW
  } else if (!leftInput && rightInput) {
    return rotateCCW
  }

  return beltDirection
}

export function beltIsCurvedAt(
  world: ReadonlyWorld,
  position: TilePosition,
  belt: Belt,
): boolean {
  const input = world.inputDirectionAt(position)
  if (input === undefined) {
    return false
  }
  return directionAxis(input) !== directionAxis(belt.direction)
}

export function beltCurveDependencies(
  world: ReadonlyWorld,
  position: TilePosition,
  beltDirection: Direction,
): Direction[] {
  const hasInputIn = (direction: Direction): boolean => {
    const dirVec = directionToVector(direction)
    const queryPos = subPos(position, dirVec)
    return world.outputDirectionAt(queryPos) === direction
  }

  if (hasInputIn(beltDirection)) {
    return [beltDirection]
  }

  const rotateCW = ((beltDirection + 1) % 4) as Direction
  const rotateCCW = ((beltDirection + 3) % 4) as Direction

  const dependencies: Direction[] = []
  if (hasInputIn(rotateCW)) {
    dependencies.push(rotateCW)
  }
  if (hasInputIn(rotateCCW)) {
    dependencies.push(rotateCCW)
  }
  return dependencies
}
