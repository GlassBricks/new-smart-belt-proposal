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
  CollidingEntityOrTile,
  ImpassableTile,
  LoaderLike,
  Splitter,
  UndergroundBelt,
} from "../common/belts"
import {
  Direction,
  oppositeDirection,
  TilePosition,
  type Ray,
} from "../common/geometry"
import { ActionError, ErrorHandler } from "../common/smart_belt"
import { World } from "../common/world"
import { SmartBeltBuildMode, toFactorioBuildMode } from "./build_mode"
import { CursorManager } from "./cursor_manager"
import {
  ALL_BELT_TYPES,
  AllBeltTypes,
  beltTierFromBeltName,
  beltTierFromUndergroundName,
  ugCollisionMaskFromBeltName,
} from "./prototypes"

let recordedErrors: string[] | undefined

export function startErrorRecording(): void {
  recordedErrors = []
}

export function stopErrorRecording(): string[] {
  const result = recordedErrors ?? []
  recordedErrors = undefined
  return result
}

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
  includeGhosts: boolean,
): LuaEntity | undefined {
  const mapPosition = toMapPosition(position)
  const beltEntity = surface.find_entities_filtered({
    position: mapPosition,
    radius: 0,
    type: ALL_BELT_TYPES,
    limit: 1,
  })[0]
  if (beltEntity) return beltEntity

  if (includeGhosts) {
    const ghostEntity = surface.find_entities_filtered({
      position: mapPosition,
      radius: 0,
      type: "entity-ghost",
      limit: 1,
    })[0]
    if (ghostEntity) return ghostEntity
  }

  return beltEntity
}
function findBeltCollidingAtTile(
  surface: LuaSurface,
  position: TilePosition,
  beltName: string,
  isGhostBuild: boolean,
): LuaEntity | undefined {
  const beltProto = prototypes.entity[beltName]!
  const beltEntity = surface.find_entities_filtered({
    position: toMapPosition(position),
    collision_mask: beltProto.collision_mask.layers,
    limit: 1,
  })[0]
  if (beltEntity) return beltEntity

  if (isGhostBuild) {
    const ghostEntity = surface.find_entities_filtered({
      position: toMapPosition(position),
      type: "entity-ghost",
      limit: 1,
    })[0]
    if (ghostEntity) return ghostEntity
  }

  return undefined
}

function translateBeltEntity(beltEntity: LuaEntity): BeltCollider | undefined {
  const type = (
    beltEntity.type === "entity-ghost" ? beltEntity.ghost_type : beltEntity.type
  ) as AllBeltTypes
  const name =
    beltEntity.type === "entity-ghost" ? beltEntity.ghost_name : beltEntity.name
  switch (type) {
    case "transport-belt": {
      const tier = beltTierFromBeltName(name)
      return tier && new Belt(translateDirection(beltEntity.direction), tier)
    }
    case "underground-belt": {
      const tier = beltTierFromUndergroundName(name)
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
      return new Splitter(translateDirection(beltEntity.direction), name)
    }
    case "loader":
    case "loader-1x1": {
      return new LoaderLike(
        translateDirection(beltEntity.direction),
        beltEntity.loader_type == "input",
        name,
      )
    }
    case "linked-belt": {
      return new LoaderLike(
        translateDirection(beltEntity.direction),
        beltEntity.linked_belt_type == "input",
        name,
      )
    }

    default:
      return undefined
    // assertNever(type)
  }
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

export class RealWorld implements World {
  private readonly isGhostBuild: boolean
  readonly currentDirection: defines.direction
  currentRay: Ray | undefined

  constructor(
    private surface: LuaSurface,
    private tier: BeltTier,
    private player: LuaPlayer,
    readonly buildMode: SmartBeltBuildMode,
    public isFirst: boolean,
    beltDirection: Direction,
    private cursorManager?: CursorManager,
  ) {
    this.isGhostBuild = buildMode !== "real"
    this.currentDirection = revTranslateDirection(beltDirection)
  }

  private findBeltEntityForMode(position: TilePosition): LuaEntity | undefined {
    const mapPosition = toMapPosition(position)

    const realEntity = this.surface.find_entities_filtered({
      position: mapPosition,
      radius: 0,
      type: ALL_BELT_TYPES,
      limit: 1,
    })[0]

    if (
      realEntity &&
      (this.buildMode === "real" || !realEntity.to_be_deconstructed())
    ) {
      return realEntity
    }

    if (this.buildMode !== "real") {
      return this.surface.find_entities_filtered({
        position: mapPosition,
        radius: 0,
        type: "entity-ghost",
        limit: 1,
      })[0]
    }

    return undefined
  }

  private findBeltForCurvature(
    position: TilePosition,
  ): BeltCollider | undefined {
    const entity = findBeltAtTile(this.surface, position, true)
    return entity ? translateBeltEntity(entity) : undefined
  }

  private classifyObstacle(position: TilePosition): BeltCollider {
    const impassableTile = checkForImpassableTile(
      this.surface,
      position,
      this.tier,
    )
    if (impassableTile) return impassableTile

    const collidingEntity = findBeltCollidingAtTile(
      this.surface,
      position,
      this.tier.beltName,
      this.isGhostBuild,
    )
    return new CollidingEntityOrTile(collidingEntity?.name ?? "<unknown>")
  }

  getWithGhosts(position: TilePosition): BeltCollider | undefined {
    if (this.buildMode !== "superforce") {
      const beltEntity = this.findBeltEntityForMode(position)
      if (beltEntity) {
        const translated = translateBeltEntity(beltEntity)
        if (translated) return translated
      }
    }

    if (
      this.player.can_build_from_cursor({
        position: toMapPosition(position),
        direction: this.currentDirection,
        build_mode: toFactorioBuildMode(this.buildMode),
      })
    ) {
      return undefined
    }

    return this.classifyObstacle(position)
  }

  get(position: TilePosition): BeltCollider | undefined {
    return this.getWithGhosts(position)
  }

  tryBuild(position: TilePosition, entity: Belt | UndergroundBelt): boolean {
    const mapPosition = toMapPosition(position)
    const inOutType =
      entity.isInput === true
        ? "input"
        : entity.isInput === false
          ? "output"
          : undefined
    const direction = revTranslateDirection(entity.direction)
    const realEntity = this.surface.find_entities_filtered({
      type: ["transport-belt", "underground-belt"],
      position: mapPosition,
    })[0]

    let luaEntity: LuaEntity | undefined
    if (!this.isGhostBuild) {
      luaEntity = this.tryBuildRealEntity(
        entity,
        realEntity,
        mapPosition,
        direction,
        inOutType,
      )
    } else {
      luaEntity = this.tryBuildGhostEntity(
        entity,
        realEntity,
        mapPosition,
        direction,
        inOutType,
      )
    }

    const built = luaEntity !== undefined && luaEntity.valid
    if (built) {
      this.playBuildSound(mapPosition, entity.name)
    }
    return built
  }

  private getUndoIndex(): number {
    if (this.isFirst) {
      this.isFirst = false
      return 0
    } else {
      return 1
    }
  }

  private tryBuildRealEntity(
    entity: Belt | UndergroundBelt,
    realEntity: LuaEntity | undefined,
    mapPosition: MapPosition,
    direction: defines.direction,
    inOutType: "input" | "output" | undefined,
  ): LuaEntity | undefined {
    let luaEntity: LuaEntity | undefined

    if (entity.type === "underground-belt") {
      luaEntity = this.handleRealUndergroundBelt(entity, realEntity)
    }

    luaEntity ??= this.surface.create_entity({
      name: entity.name,
      position: mapPosition,
      direction,
      fast_replace: true,
      player: this.player,
      force: this.player.force,
      type: inOutType,
      undo_index: this.getUndoIndex(),
    })

    return luaEntity
  }

  private handleRealUndergroundBelt(
    entity: UndergroundBelt,
    realEntity: LuaEntity | undefined,
  ): LuaEntity | undefined {
    if (realEntity?.valid && realEntity?.type === "underground-belt") {
      if (
        (translateBeltEntity(realEntity) as UndergroundBelt).shapeDirection() !=
        entity.shapeDirection()
      ) {
        realEntity.destroy({
          player: this.player,
          undo_index: this.getUndoIndex(),
        })
      } else if (realEntity.name == entity.name) {
        return realEntity
      }
    }
    return undefined
  }

  private tryBuildGhostEntity(
    entity: Belt | UndergroundBelt,
    realEntity: LuaEntity | undefined,
    mapPosition: MapPosition,
    direction: defines.direction,
    inOutType: "input" | "output" | undefined,
  ): LuaEntity | undefined {
    let luaEntity: LuaEntity | undefined

    if (realEntity && realEntity.type != entity.type) {
      realEntity.order_deconstruction(
        this.player.force,
        this.player,
        this.getUndoIndex(),
      )
    } else if (realEntity) {
      luaEntity = this.handleGhostRealEntity(entity, realEntity, direction)
    }

    if (luaEntity) {
      this.orderUpgrade(luaEntity, entity.name)
    } else {
      // create ghost
      luaEntity = this.surface.create_entity({
        name: "entity-ghost",
        inner_name: entity.name,
        position: mapPosition,
        direction,
        player: this.player,
        force: this.player.force,
        type: inOutType,
        fast_replace: !realEntity,
        undo_index: this.getUndoIndex(),
      })
    }

    return luaEntity
  }

  private handleGhostRealEntity(
    entity: Belt | UndergroundBelt,
    realEntity: LuaEntity,
    direction: defines.direction,
  ): LuaEntity | undefined {
    if (entity.type === "transport-belt") {
      realEntity.direction = direction
      return realEntity
    } else {
      const ug = translateBeltEntity(realEntity) as UndergroundBelt
      if (ug.shapeDirection() == entity.shapeDirection()) {
        if (ug.direction != entity.direction) {
          realEntity.rotate({
            by_player: this.player,
          })
        }
        return realEntity
      } else {
        realEntity.order_deconstruction(
          this.player.force,
          this.player,
          this.getUndoIndex(),
        )
        return undefined
      }
    }
  }
  mine(pos: TilePosition): void {
    const entity = findBeltAtTile(this.surface, pos, this.isGhostBuild)
    if (entity) {
      this.player.mine_entity(entity)
    }
  }
  flipUg(position: TilePosition): void {
    const entity = findBeltAtTile(this.surface, position, true)
    if (entity && entity.type == "underground-belt") {
      entity.rotate()
    }
  }
  upgradeUg(position: TilePosition, tier: BeltTier): void {
    const entity = findBeltAtTile(this.surface, position, true)
    if (!entity || !entity.valid) return
    const type = entity.type == "entity-ghost" ? entity.ghost_type : entity.type
    if (type != "underground-belt") return
    const name = entity.type == "entity-ghost" ? entity.ghost_name : entity.name

    const pair = entity.neighbours as LuaEntity | undefined
    const pairMapPosition = pair?.position

    if (!this.isGhostBuild) {
      const existingBelt = translateBeltEntity(entity) as UndergroundBelt
      const pairBelt = pair && (translateBeltEntity(pair) as UndergroundBelt)

      existingBelt.name = tier.undergroundName
      this.tryBuild(position, existingBelt)
      if (pairBelt) {
        pairBelt.name = tier.undergroundName
        this.tryBuild(toTilePosition(pairMapPosition!), pairBelt)
      }
    } else {
      this.orderUpgrade(entity, tier.undergroundName)
      if (pair?.valid) {
        this.orderUpgrade(pair, tier.undergroundName)
      }
    }
  }

  private playBuildSound(position: TilePosition, name: string) {
    if (!this.isGhostBuild) {
      this.surface.play_sound({
        path: "entity-build/" + name,
        position: position,
      })
    }
  }

  upgradeSplitter(position: TilePosition, newName: string): void {
    // todo: decide if we actually want this
    const entity = findBeltAtTile(this.surface, position, false)
    if (entity && entity.type == "splitter" && entity.name != newName) {
      entity.order_upgrade({
        target: newName,
        force: this.player.force,
      })
      entity.apply_upgrade()
    }
  }
  outputDirectionAt(position: TilePosition): Direction | undefined {
    const beltEntity = this.findBeltForCurvature(position)
    if (beltEntity instanceof BeltConnectable) {
      return beltEntity.outputDirection()
    }
    return undefined
  }

  inputDirectionAt(position: TilePosition): Direction | undefined {
    const entity = this.findBeltForCurvature(position)
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
    allowFastReplace: boolean,
  ): boolean {
    const existingEntity = this.get(position)
    if (!existingEntity) return true
    if (!(existingEntity instanceof BeltConnectable)) return false
    if (existingEntity instanceof Belt) {
      return existingEntity.direction !== oppositeDirection(beltDirection)
    }
    return allowFastReplace
  }
  private orderUpgrade(luaEntity: LuaEntity, target: string) {
    const position = luaEntity.position
    if (
      luaEntity.name != target &&
      luaEntity.order_upgrade({
        target: target,
        force: this.player.force,
        player: this.player,
        undo_index: this.isFirst ? 0 : 1,
      })
    ) {
      this.surface.play_sound({
        path: "utility/build_ghost_upgrade",
        position,
      })
    }
  }
}

export class RealErrorHandler implements ErrorHandler {
  constructor(
    private player: LuaPlayer,
    private world: RealWorld,
  ) {}
  handleError(position: TilePosition, error: ActionError) {
    recordedErrors?.push(`${position.x},${position.y}:${error}`)
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
      case ActionError.BeltLineBroken:
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
