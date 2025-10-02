import { BeltTier } from "../common/belts"

export const ALL_BELT_TYPES = [
  "transport-belt",
  "underground-belt",
  "splitter",
  // todo
  // "lane-splitter",
  // "linked-belt",
  // "loader-1x1",
  // "loader",
] as const
export type AllBeltTypes = (typeof ALL_BELT_TYPES)[number]
export interface BeltTierPrototypes extends BeltTier {
  undergroundName: string
  splitterName?: string
}

const beltTiers: Record<string, BeltTierPrototypes> = {}
const beltTiersByUgName: Record<string, BeltTierPrototypes> = {}
script.on_load(() => {
  for (const [name, belt] of prototypes.get_entity_filtered([
    { filter: "type", type: "transport-belt" },
  ])) {
    const undergroundProto = belt.related_underground_belt
    if (!undergroundProto) continue
    const undergroundDistance = undergroundProto.max_underground_distance!
    beltTiers[name] = {
      name,
      undergroundName: undergroundProto.name,
      undergroundDistance,
    }
    beltTiersByUgName[undergroundProto.name] = beltTiers[name]
  }
})

export function beltTierFromBeltName(
  beltName: string,
): BeltTierPrototypes | undefined {
  return beltTiers[beltName]
}

export function beltTierFromUndergroundName(
  undergroundName: string,
): BeltTierPrototypes | undefined {
  return beltTiersByUgName[undergroundName]
}
