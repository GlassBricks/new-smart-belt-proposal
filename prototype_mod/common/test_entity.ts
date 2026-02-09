import type { Direction } from "./geometry"

export type TestEntity =
  | { kind: "belt"; direction: Direction; tier: number }
  | {
      kind: "underground-belt"
      direction: Direction
      tier: number
      ioType: "input" | "output"
    }
  | { kind: "splitter"; direction: Direction; tier: number }
  | {
      kind: "loader"
      direction: Direction
      tier: number
      ioType: "input" | "output"
    }
  | { kind: "obstacle" }
  | { kind: "impassable" }
  | { kind: "ghost-belt"; direction: Direction; tier: number }
  | {
      kind: "ghost-underground-belt"
      direction: Direction
      tier: number
      ioType: "input" | "output"
    }
  | { kind: "deconstructed-belt"; direction: Direction; tier: number }
  | { kind: "tree" }
