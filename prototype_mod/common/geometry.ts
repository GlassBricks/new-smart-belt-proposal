export type TileSpace = { readonly _brand: "TileSpace" }

export interface Point2D<T> {
  readonly x: number
  readonly y: number
}

export interface Vector2D<T> {
  readonly x: number
  readonly y: number
}

export type TilePosition = Point2D<TileSpace>
export type TileVec = Vector2D<TileSpace>

export function pos(x: number, y: number): TilePosition {
  return { x, y }
}

export function vec2(x: number, y: number): TileVec {
  return { x, y }
}

export function addVec(p: TilePosition, v: TileVec): TilePosition {
  return { x: p.x + v.x, y: p.y + v.y }
}

export function subPos(p1: TilePosition, p2: TilePosition): TileVec {
  return { x: p1.x - p2.x, y: p1.y - p2.y }
}

export function mulVec(v: TileVec, scalar: number): TileVec {
  return { x: v.x * scalar, y: v.y * scalar }
}

export function dotVec(v1: TileVec, v2: TileVec): number {
  return v1.x * v2.x + v1.y * v2.y
}

export function posEquals(p1: TilePosition, p2: TilePosition): boolean {
  return p1.x === p2.x && p1.y === p2.y
}

export enum Direction {
  North = 0,
  East = 1,
  South = 2,
  West = 3,
}

export enum Axis {
  X = "X",
  Y = "Y",
}

export function directionToVector(dir: Direction): TileVec {
  switch (dir) {
    case Direction.North:
      return vec2(0, -1)
    case Direction.East:
      return vec2(1, 0)
    case Direction.South:
      return vec2(0, 1)
    case Direction.West:
      return vec2(-1, 0)
  }
}

export function oppositeDirection(dir: Direction): Direction {
  switch (dir) {
    case Direction.North:
      return Direction.South
    case Direction.East:
      return Direction.West
    case Direction.South:
      return Direction.North
    case Direction.West:
      return Direction.East
  }
}

export function rotateCW(dir: Direction): Direction {
  switch (dir) {
    case Direction.North:
      return Direction.East
    case Direction.East:
      return Direction.South
    case Direction.South:
      return Direction.West
    case Direction.West:
      return Direction.North
  }
}

export function rotateCCW(dir: Direction): Direction {
  switch (dir) {
    case Direction.North:
      return Direction.West
    case Direction.East:
      return Direction.North
    case Direction.South:
      return Direction.East
    case Direction.West:
      return Direction.South
  }
}

export function directionAxis(dir: Direction): Axis {
  switch (dir) {
    case Direction.North:
    case Direction.South:
      return Axis.Y
    case Direction.East:
    case Direction.West:
      return Axis.X
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

export function directionFromOrdinal(ordinal: number): Direction | undefined {
  switch (ordinal) {
    case 0:
      return Direction.North
    case 1:
      return Direction.East
    case 2:
      return Direction.South
    case 3:
      return Direction.West
    default:
      return undefined
  }
}

export interface Ray {
  readonly startPosition: TilePosition
  readonly direction: Direction
}

export function createRay(position: TilePosition, direction: Direction): Ray {
  return { startPosition: position, direction }
}

export function rayPosition(ray: Ray, position: TilePosition): number {
  const offset = subPos(position, ray.startPosition)
  const dirVec = directionToVector(ray.direction)
  return dotVec(offset, dirVec)
}

export function getPositionOnRay(ray: Ray, index: number): TilePosition {
  return addVec(
    ray.startPosition,
    mulVec(directionToVector(ray.direction), index),
  )
}

export function snapToRay(ray: Ray, position: TilePosition): TilePosition {
  return getPositionOnRay(ray, rayPosition(ray, position))
}

export interface BoundingBox {
  readonly min: TilePosition
  readonly max: TilePosition
}

export function boundsNew(
  topLeft: TilePosition,
  bottomRight: TilePosition,
): BoundingBox {
  return { min: topLeft, max: bottomRight }
}

export function boundsUnion(b1: BoundingBox, b2: BoundingBox): BoundingBox {
  return {
    min: pos(Math.min(b1.min.x, b2.min.x), Math.min(b1.min.y, b2.min.y)),
    max: pos(Math.max(b1.max.x, b2.max.x), Math.max(b1.max.y, b2.max.y)),
  }
}

export function boundsContains(
  bounds: BoundingBox,
  position: TilePosition,
): boolean {
  return (
    position.x >= bounds.min.x &&
    position.x <= bounds.max.x &&
    position.y >= bounds.min.y &&
    position.y <= bounds.max.y
  )
}

export interface Transform {
  readonly flipX: boolean
  readonly flipY: boolean
  readonly swapXY: boolean
}

export function createTransform(
  flipX: boolean,
  flipY: boolean,
  swapXY: boolean,
): Transform {
  return { flipX, flipY, swapXY }
}

export function identityTransform(): Transform {
  return { flipX: false, flipY: false, swapXY: false }
}

export function transformPosition(
  transform: Transform,
  position: TilePosition,
): TilePosition {
  let result = position

  if (transform.swapXY) {
    result = pos(result.y, result.x)
  }

  if (transform.flipX) {
    result = pos(-result.x, result.y)
  }

  if (transform.flipY) {
    result = pos(result.x, -result.y)
  }

  return result
}

export function transformDirection(
  transform: Transform,
  dir: Direction,
): Direction {
  let ordinal = dir as number

  if (transform.swapXY) {
    ordinal = [3, 2, 1, 0][ordinal]!
  }

  if (transform.flipX) {
    ordinal = [0, 3, 2, 1][ordinal]!
  }

  if (transform.flipY) {
    ordinal = [2, 1, 0, 3][ordinal]!
  }

  return ordinal as Direction
}

export function allUniqueTransforms(): Transform[] {
  return [
    createTransform(false, false, false),
    createTransform(true, false, true),
    createTransform(true, true, false),
    createTransform(false, true, true),
    createTransform(true, false, false),
    createTransform(true, true, true),
    createTransform(false, true, false),
    createTransform(false, false, true),
  ]
}

export function positionToKey(pos: TilePosition): string {
  return `${pos.x},${pos.y}`
}

export function keyToPosition(key: string): TilePosition {
  const parts = key.split(",")
  return pos(Number(parts[0]), Number(parts[1]))
}
