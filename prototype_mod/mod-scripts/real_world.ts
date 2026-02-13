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

// Mod prototype uses Factorio's 3 build modes (normal/forced/superforced) directly.
// C++ implementation will have 4 behaviors, splitting forced into separate force and ghost modes
// with different entity visibility and obstacle handling rules.
export class RealWorld implements World {
  private readonly isGhostBuild: boolean
  readonly currentDirection: defines.direction

  constructor(
    private surface: LuaSurface,
    private tier: BeltTier,
    private player: LuaPlayer,
    readonly buildMode: defines.build_mode,
    public isFirst: boolean,
    beltDirection: Direction,
    private cursorManager?: CursorManager,
  ) {
    this.isGhostBuild = buildMode !== defines.build_mode.normal
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
      (this.buildMode === defines.build_mode.normal || !realEntity.to_be_deconstructed())
    ) {
      return realEntity
    }

    if (this.buildMode !== defines.build_mode.normal) {
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

  get(position: TilePosition): BeltCollider | undefined {
    if (this.buildMode !== defines.build_mode.superforced) {
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
        build_mode: this.buildMode,
      })
    ) {
      return undefined
    }

    if (this.buildMode === defines.build_mode.superforced) {
      const beltEntity = this.findBeltEntityForMode(position)
      if (beltEntity) {
        const translated = translateBeltEntity(beltEntity)
        if (
          translated instanceof Belt &&
          translated.direction === translateDirection(this.currentDirection)
        ) {
          return undefined
        }
      }
    }

    return this.classifyObstacle(position)
  }

  tryBuild(position: TilePosition, entity: Belt | UndergroundBelt): boolean {
    const mapPosition = toMapPosition(position)
    const direction = revTranslateDirection(entity.direction)

    if (entity instanceof UndergroundBelt) {
      return this.tryBuildUnderground(entity, mapPosition)
    }

    this.player.build_from_cursor({
      position: mapPosition,
      direction,
      build_mode: this.buildMode,
    })
    return true
  }

  private tryBuildUnderground(
    entity: UndergroundBelt,
    mapPosition: MapPosition,
  ): boolean {
    if (!this.cursorManager) {
      return false
    }

    const shapeDirection = revTranslateDirection(
      oppositeDirection(entity.shapeDirection()),
    )
    this.cursorManager.setupForUnderground(entity.name)
    this.player.build_from_cursor({
      position: mapPosition,
      direction: shapeDirection,
      build_mode: this.buildMode,
    })

    const placed = this.surface.find_entities_filtered({
      position: mapPosition,
      type: "underground-belt",
      ghost_type: "underground-belt",
      limit: 1,
    })[0]

    if (!placed?.valid) return false

    if (entity.isInput !== (placed.belt_to_ground_type === "input")) {
      placed.rotate({ by_player: this.player })
    }

    return true
  }

  private getUndoIndex(): number {
    if (this.isFirst) {
      this.isFirst = false
      return 0
    } else {
      return 1
    }
  }
  mine(pos: TilePosition): void {
    const entity = findBeltAtTile(this.surface, pos, this.isGhostBuild)
    if (!entity) return

    if (!this.isGhostBuild || entity.type === "entity-ghost") {
      this.player.mine_entity(entity)
    } else {
      entity.order_deconstruction(
        this.player.force,
        this.player,
        this.getUndoIndex(),
      )
    }
  }
  flipUg(position: TilePosition): void {
    const entity = findBeltAtTile(this.surface, position, true)
    if (!entity) return
    const type =
      entity.type === "entity-ghost" ? entity.ghost_type : entity.type
    if (type === "underground-belt") {
      entity.rotate()
    }
  }
  upgradeUg(position: TilePosition, tier: BeltTier): void {
    const entity = findBeltAtTile(this.surface, position, true)
    if (!entity || !entity.valid) return
    const type = entity.type == "entity-ghost" ? entity.ghost_type : entity.type
    if (type != "underground-belt") return
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
