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
