export interface Point2D<T> {
  readonly x: number
  readonly y: number
}

export interface Vector2D<T> {
  readonly x: number
  readonly y: number
}

export interface TilePosition {
  readonly x: number
  readonly y: number
}
export interface TileVec {
  readonly x: number
  readonly y: number
}

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

export const enum Direction {
  North = 0,
  East = 1,
  South = 2,
  West = 3,
}

export const enum Axis {
  X = 0,
  Y = 1,
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

export function axisSign(dir: Direction): number {
  switch (dir) {
    case Direction.North:
      return -1
    case Direction.South:
      return 1
    case Direction.East:
      return 1
    case Direction.West:
      return -1
  }
}

export interface Ray {
  readonly crossAxisValue: number
  readonly direction: Direction
}

export function createRay(position: TilePosition, direction: Direction): Ray {
  const crossAxisValue =
    directionAxis(direction) === Axis.Y ? position.x : position.y
  return { crossAxisValue, direction }
}

export function rayDirection(ray: Ray): Direction {
  return ray.direction
}

export function rayPosition(ray: Ray, position: TilePosition): number {
  return directionAxis(ray.direction) === Axis.Y ? position.y : position.x
}

export function getRayPosition(ray: Ray, pos: number): TilePosition {
  return directionAxis(ray.direction) === Axis.Y
    ? { x: ray.crossAxisValue, y: pos }
    : { x: pos, y: ray.crossAxisValue }
}

export function raySnap(ray: Ray, position: TilePosition): TilePosition {
  return getRayPosition(ray, rayPosition(ray, position))
}

export function isBeforeOnRay(ray: Ray, a: number, b: number): boolean {
  return (b - a) * axisSign(ray.direction) > 0
}

export function rayRelativeDirection(
  ray: Ray,
  position: TilePosition,
): Direction | undefined {
  const cross =
    directionAxis(ray.direction) === Axis.Y
      ? position.x - ray.crossAxisValue
      : position.y - ray.crossAxisValue

  switch (ray.direction) {
    case Direction.North:
    case Direction.South:
      if (cross === 0) return undefined
      return cross > 0 ? Direction.East : Direction.West
    case Direction.East:
    case Direction.West:
      if (cross === 0) return undefined
      return cross > 0 ? Direction.South : Direction.North
  }
}

export interface BoundingBox {
  readonly left_top: TilePosition
  readonly right_bottom: TilePosition
}

export function boundsNew(
  topLeft: TilePosition,
  bottomRight: TilePosition,
): BoundingBox {
  return { left_top: topLeft, right_bottom: bottomRight }
}

export function boundsUnion(b1: BoundingBox, b2: BoundingBox): BoundingBox {
  return {
    left_top: pos(
      Math.min(b1.left_top.x, b2.left_top.x),
      Math.min(b1.left_top.y, b2.left_top.y),
    ),
    right_bottom: pos(
      Math.max(b1.right_bottom.x, b2.right_bottom.x),
      Math.max(b1.right_bottom.y, b2.right_bottom.y),
    ),
  }
}

export function boundsContains(
  bounds: BoundingBox,
  position: TilePosition,
): boolean {
  return (
    position.x >= bounds.left_top.x &&
    position.x <= bounds.right_bottom.x &&
    position.y >= bounds.left_top.y &&
    position.y <= bounds.right_bottom.y
  )
}
