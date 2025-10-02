import type { BeltTier } from "../common/belts"
export const YELLOW_BELT: BeltTier = {
  name: "yellow",
  undergroundDistance: 5,
}
export const RED_BELT: BeltTier = {
  name: "red",
  undergroundDistance: 7,
}
export const BLUE_BELT: BeltTier = {
  name: "blue",
  undergroundDistance: 9,
}
export const BELT_TIERS: readonly BeltTier[] = [
  YELLOW_BELT,
  RED_BELT,
  BLUE_BELT,
]
