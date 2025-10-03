import type { BeltTier } from "../common/belts"
export const YELLOW_BELT: BeltTier = {
  beltName: "transport-belt",
  undergroundName: "underground-belt",
  splitterName: "splitter",
  undergroundDistance: 5,
}
export const RED_BELT: BeltTier = {
  beltName: "fast-transport-belt",
  undergroundName: "fast-underground-belt",
  splitterName: "fast-splitter",
  undergroundDistance: 7,
}
export const BLUE_BELT: BeltTier = {
  beltName: "express-transport-belt",
  undergroundName: "express-underground-belt",
  splitterName: "express-splitter",
  undergroundDistance: 9,
}
export const BELT_TIERS: readonly BeltTier[] = [
  YELLOW_BELT,
  RED_BELT,
  BLUE_BELT,
]
