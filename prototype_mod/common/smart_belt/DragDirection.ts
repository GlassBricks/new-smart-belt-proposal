export const enum DragDirection {
  Forward = "forward",
  Backward = "backward",
}

export function directionMultiplier(direction: DragDirection): number {
  return direction === DragDirection.Forward ? 1 : -1
}

export function swapIfBackwards<T>(
  direction: DragDirection,
  a: T,
  b: T,
): [T, T] {
  return direction === DragDirection.Forward ? [a, b] : [b, a]
}
