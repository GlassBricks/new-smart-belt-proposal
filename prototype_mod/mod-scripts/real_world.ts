import {
  LocalisedString,
  LuaEntity,
  LuaPlayer,
  LuaSurface,
  MapPosition,
} from "factorio:runtime"
import { beltCurvedInputDirection } from "../common/belt_curving"
import {
  Belt,
  BeltCollider,
  BeltConnectable,
  BeltTier,
  CollidingEntity,
  ImpassableTile,
  LoaderLike,
  Splitter,
  UndergroundBelt,
} from "../common/belts"
import { Direction, TilePosition } from "../common/geometry"
import { ActionError, ErrorHandler } from "../common/smart_belt"
import { World } from "../common/world"
import {
  ALL_BELT_TYPES,
  AllBeltTypes,
  beltTierFromBeltName,
  beltTierFromUndergroundName,
  ugCollisionMaskFromBeltName,
} from "./prototypes"

export function toMapPosition(position: TilePosition): MapPosition {
  return { x: position.x + 0.5, y: position.y + 0.5 }
}

export function toTilePosition(pos: MapPosition): TilePosition {
  return {
    x: Math.floor(pos.x),
    y: Math.floor(pos.y),
  }
}

export function translateDirection(facDirection: defines.direction): Direction {
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

function revTranslateDirection(direction: Direction): defines.direction {
  switch (direction) {
    case Direction.North:
      return defines.direction.north
    case Direction.East:
      return defines.direction.east
    case Direction.South:
      return defines.direction.south
    case Direction.West:
      return defines.direction.west
    default:
      error(`Invalid direction: ${direction}`)
  }
}

function assertNever(value: never): never {
  error(`Unexpected value: ${value}`)
}

function findBeltAtTile(
  surface: LuaSurface,
  position: TilePosition,
): LuaEntity | undefined {
  const beltEntity = surface.find_entities_filtered({
    position: toMapPosition(position),
    radius: 0,
    type: ALL_BELT_TYPES,
    limit: 1,
  })[0]

  return beltEntity
}
function findBeltCollidingAtTile(
  surface: LuaSurface,
  position: TilePosition,
  beltName: string,
): LuaEntity | undefined {
  const beltProto = prototypes.entity[beltName]!
  const beltEntity = surface.find_entities_filtered({
    position: toMapPosition(position),
    collision_mask: beltProto.collision_mask.layers,
    limit: 1,
  })[0]
  return beltEntity
}

function checkForImpassableTile(
  surface: LuaSurface,
  position: TilePosition,
  beltTier: BeltTier,
): ImpassableTile | undefined {
  const ugCollisionMask = ugCollisionMaskFromBeltName(beltTier.beltName)!
  const tile = surface.get_tile(position)
  for (const key in ugCollisionMask.layers) {
    if (tile.collides_with(key)) {
      return new ImpassableTile(tile.name)
    }
  }
  return undefined
}

// TODO: ghosts
export class RealWorld implements World {
  constructor(
    private surface: LuaSurface,
    private tier: BeltTier,
    private player: LuaPlayer,
  ) {}

  get(position: TilePosition): BeltCollider | undefined {
    // todo
    const beltEntity = findBeltAtTile(this.surface, position)
    if (beltEntity) {
      return this.translateBeltEntity(beltEntity)
    }
    if (
      !this.surface.can_place_entity({
        name: this.tier.beltName,
        position,
        build_check_type: defines.build_check_type.manual,
        force: "player",
      })
    ) {
      const impassableTile = checkForImpassableTile(
        this.surface,
        position,
        this.tier,
      )
      if (impassableTile) {
        return impassableTile
      }
      const collidingEntity = findBeltCollidingAtTile(
        this.surface,
        position,
        this.tier.beltName,
      )
      return new CollidingEntity(collidingEntity?.name ?? "<unknown>")
    }
    return undefined
  }

  private translateBeltEntity(beltEntity: LuaEntity): BeltCollider | undefined {
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
      case "splitter":
      case "lane-splitter": {
        return new Splitter(
          translateDirection(beltEntity.direction),
          beltEntity.name,
        )
      }
      case "loader":
      case "loader-1x1": {
        return new LoaderLike(
          translateDirection(beltEntity.direction),
          beltEntity.loader_type == "input",
          beltEntity.name,
        )
      }
      case "linked-belt": {
        return new LoaderLike(
          translateDirection(beltEntity.direction),
          beltEntity.linked_belt_type == "input",
          beltEntity.name,
        )
      }

      default:
        assertNever(type)
    }
  }
  tryBuild(
    position: TilePosition,
    entity: Belt | UndergroundBelt,
    isFirst?: boolean,
  ): boolean {
    const entityPosition = toMapPosition(position)
    const luaEntity = this.surface.create_entity({
      name: entity.name,
      position: entityPosition,
      direction: revTranslateDirection(entity.direction),
      fast_replace: true,
      player: this.player,
      force: this.player.force,
      type:
        entity.isInput === true
          ? "input"
          : entity.isInput === false
            ? "output"
            : undefined,
      undo_index: isFirst ? 0 : 1,
    })
    const built = luaEntity !== undefined && luaEntity.valid
    if (built) {
      this.surface.play_sound({
        path: "entity-build/" + entity.name,
        position: entityPosition,
      })
    }
    return built
  }
  mine(pos: TilePosition): void {
    const entity = findBeltAtTile(this.surface, pos)
    if (entity) {
      this.player.mine_entity(entity)
    }
  }
  flipUg(position: TilePosition): void {
    const entity = findBeltAtTile(this.surface, position)
    if (entity && entity.type == "underground-belt") {
      entity.rotate()
    }
  }
  upgradeUg(position: TilePosition, tier: BeltTier): void {
    const entity = findBeltAtTile(this.surface, position)
    if (
      entity &&
      entity.valid &&
      entity.type == "underground-belt" &&
      entity.name != tier.undergroundName
    ) {
      const name = entity.name
      const pair = entity.neighbours as LuaEntity | undefined
      const mapPosition = entity.position
      const pairPosition = pair?.position

      entity.order_upgrade({
        target: tier.undergroundName,
        force: this.player.force,
      })
      if (pair?.valid) {
        pair.order_upgrade({
          target: tier.undergroundName,
          force: this.player.force,
        })
      }
      if (entity.valid) entity.apply_upgrade()
      if (pair?.valid) pair?.apply_upgrade()

      this.surface.play_sound({
        path: "entity-build/" + name,
        position: mapPosition,
      })
      if (pairPosition) {
        this.surface.play_sound({
          path: "entity-build/" + name,
          position: pairPosition,
        })
      }
    }
  }
  upgradeSplitter(position: TilePosition, newName: string): void {
    const entity = findBeltAtTile(this.surface, position)
    if (entity && entity.type == "splitter" && entity.name != newName) {
      entity.order_upgrade({
        target: newName,
        force: this.player.force,
      })
      entity.apply_upgrade()
    }
  }
  outputDirectionAt(position: TilePosition): Direction | undefined {
    const beltEntity = this.get(position)
    if (beltEntity instanceof BeltConnectable) {
      return beltEntity.outputDirection()
    }
    return undefined
  }
  inputDirectionAt(position: TilePosition): Direction | undefined {
    const entity = this.get(position)
    if (entity instanceof Belt) {
      return beltCurvedInputDirection(this, position, entity.direction)
    }
    if (entity instanceof BeltConnectable) {
      return entity.primaryInputDirection()
    }
    return undefined
  }
  canPlaceOrFastReplace(
    position: TilePosition,
    beltDirection: Direction,
  ): boolean {
    const existingEntity = this.get(position)
    if (
      existingEntity instanceof Belt &&
      existingEntity.direction == beltDirection
    ) {
      return true
    }
    const mapPosition = toMapPosition(position)
    const params = {
      name: this.tier.beltName,
      position: mapPosition,
      direction: revTranslateDirection(beltDirection),
      force: "player",
    }
    return (
      this.surface.can_place_entity(params) ||
      this.surface.can_fast_replace(params)
    )
  }
}

export class RealErrorHandler implements ErrorHandler {
  constructor(
    private surface: LuaSurface,
    private player: LuaPlayer,
    private world: RealWorld,
  ) {}
  handleError(position: TilePosition, error: ActionError) {
    const entity = this.world.get(position)
    const entityName = entity?.name
    const mapPosition = toMapPosition(position)
    let message: LocalisedString
    switch (error) {
      case ActionError.TooFarToConnect:
        message = ["cant-build-reason.too-far-to-connect"]
        break
      case ActionError.EntityInTheWay: {
        const entityNameLocale: LocalisedString =
          entityName !== undefined ? ["entity-name." + entityName] : "Entity"
        message = ["cant-build-reason.entity-in-the-way", entityNameLocale]
        break
      }
      case ActionError.CannotUpgradeUnderground:
        message = "Cannot upgrade underground"
        break
      case ActionError.CannotTraversePastEntity:
      case ActionError.CannotTraversePastTile:
        message = "Belt line broken"
        break
    }
    this.player.create_local_flying_text({
      text: message,
      position: mapPosition,
    })
    this.player.play_sound({
      path: "utility/cannot_build",
    })
  }
}
