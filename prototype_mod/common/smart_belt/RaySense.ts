export const enum RaySense {
  Forward = "forward",
  Backward = "backward",
}

export function senseMultiplier(sense: RaySense): number {
  return sense === RaySense.Forward ? 1 : -1
}

export function swapIfBackwards<T>(sense: RaySense, a: T, b: T): [T, T] {
  return sense === RaySense.Forward ? [a, b] : [b, a]
}
