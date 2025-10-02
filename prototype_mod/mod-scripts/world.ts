import { LuaEntity, LuaSurface, MapPosition } from "factorio:runtime"
import {
  Belt,
  BeltConnectable,
  BeltTier,
  Entity,
  Splitter,
  UndergroundBelt,
} from "../common/belts"
import { Direction, TilePosition } from "../common/geometry"
import { World } from "../common/world"
import {
  ALL_BELT_TYPES,
  AllBeltTypes,
  beltTierFromBeltName,
  beltTierFromUndergroundName,
} from "./prototypes"

function toMapPosition(position: TilePosition): MapPosition {
  return { x: position.x + 0.5, y: position.y + 0.5 }
}

function translateDirection(facDirection: defines.direction): Direction {
  switch (facDirection) {
    case defines.direction.north:
      return Direction.North
    case defines.direction.east:
      return Direction.East
    case defines.direction.south:
      return Direction.South
    case defines.direction.west:
      return Direction.West
    default:
      error(`Invalid direction: ${facDirection}`)
  }
}

function assertNever(value: never): never {
  error(`Unexpected value: ${value}`)
}

@tryRegister
class RealWorld implements World {
  constructor(private surface: LuaSurface) {}

  get(position: TilePosition): Entity | undefined {
    // todo
    const beltEntity = this.surface.find_entities_filtered({
      position: toMapPosition(position),
      type: ALL_BELT_TYPES,
      limit: 1,
    })[0]

    if (beltEntity) {
      return this.translateBeltEntity(beltEntity)
    }
  }

  private translateBeltEntity(beltEntity: LuaEntity): Entity | undefined {
    const type = beltEntity.type as AllBeltTypes
    switch (type) {
      case "transport-belt": {
        const tier = beltTierFromBeltName(beltEntity.name)
        return tier && new Belt(translateDirection(beltEntity.direction), tier)
      }
      case "underground-belt": {
        const tier = beltTierFromUndergroundName(beltEntity.name)
        return (
          tier &&
          new UndergroundBelt(
            translateDirection(beltEntity.direction),
            beltEntity.belt_to_ground_type == "input",
            tier,
          )
        )
      }
      case "splitter": {
        return new Splitter(translateDirection(beltEntity.direction), undefined)
      }
      default:
        assertNever(type)
    }
    return
  }

  set(position: TilePosition, entity: Entity): void {
    throw new Error("Method not implemented.")
  }
  remove(pos: TilePosition): void {
    throw new Error("Method not implemented.")
  }
  tryBuild(position: TilePosition, entity: BeltConnectable): boolean {
    throw new Error("Method not implemented.")
  }
  flipUg(position: TilePosition): void {
    throw new Error("Method not implemented.")
  }
  upgradeUg(position: TilePosition, tier: BeltTier): void {
    throw new Error("Method not implemented.")
  }
  outputDirectionAt(position: TilePosition): Direction | undefined {
    throw new Error("Method not implemented.")
  }
  inputDirectionAt(position: TilePosition): Direction | undefined {
    throw new Error("Method not implemented.")
  }
}
