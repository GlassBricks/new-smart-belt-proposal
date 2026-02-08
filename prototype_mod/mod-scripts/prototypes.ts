import { CollisionMaskConnector } from "factorio:prototype"
import { BeltTier } from "../common/belts"

export const ALL_BELT_TYPES = [
  "transport-belt",
  "underground-belt",
  "splitter",
  "lane-splitter",
  "linked-belt",
  "loader-1x1",
  "loader",
] as const
export type AllBeltTypes = (typeof ALL_BELT_TYPES)[number]

const beltTiers: Record<string, BeltTier> = {}
const beltTiersByUgName: Record<string, BeltTier> = {}
const ugCollisionMasks: Record<string, CollisionMaskConnector> = {}

function loadBeltTiers() {
  const ugData =
    prototypes.mod_data["smarter-belt-underground-collision-masks"]!

  for (const [beltName, belt] of prototypes.get_entity_filtered([
    { filter: "type", type: "transport-belt" },
  ])) {
    const undergroundProto = belt.related_underground_belt
    if (!undergroundProto) continue
    const undergroundDistance = undergroundProto.max_underground_distance!
    const ugCollisionMask = ugData.get(
      undergroundProto.name,
    ) as CollisionMaskConnector
    beltTiers[beltName] = {
      beltName,
      undergroundName: undergroundProto.name,
      undergroundDistance,
    }
    beltTiersByUgName[undergroundProto.name] = beltTiers[beltName]
    ugCollisionMasks[beltName] = ugCollisionMask
  }
}

script.on_init(loadBeltTiers)
script.on_load(loadBeltTiers)

export function beltTierFromBeltName(beltName: string): BeltTier | undefined {
  return beltTiers[beltName]
}

export function beltTierFromUndergroundName(
  undergroundName: string,
): BeltTier | undefined {
  return beltTiersByUgName[undergroundName]
}

export function ugCollisionMaskFromBeltName(
  beltName: string,
): CollisionMaskConnector | undefined {
  return ugCollisionMasks[beltName]
}
