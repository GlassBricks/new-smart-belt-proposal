import {
  LuaPlayer,
  LuaSurface,
  OnBuiltEntityEvent,
  OnPreBuildEvent,
  PlayerIndex,
} from "factorio:runtime"
import { Direction, TilePosition } from "../common/geometry"
import { LineDrag } from "../common/smart_belt"
import { detectBuildMode, SmartBeltBuildMode } from "./build_mode"
import { CursorManager } from "./cursor_manager"
import { beltTierFromBeltName } from "./prototypes"
import {
  RealErrorHandler,
  RealWorld,
  toTilePosition,
  translateDirection,
} from "./real_world"

interface PlayerDragData {
  preBuildData?: {
    mode: defines.build_mode
    createdByMoving: boolean
  }
  drag?: LineDrag
  previousDirection?: Direction
  buildMode?: SmartBeltBuildMode
}
declare const storage: {
  players: Record<PlayerIndex, PlayerDragData>
}
script.on_configuration_changed(() => {
  storage.players ??= {}
})

let processingSmartBelt = false

function getPlayerData(player: PlayerIndex): PlayerDragData {
  if (!storage.players) {
    storage.players = {}
  }
  if (!storage.players[player]) {
    storage.players[player] = {}
  }
  return storage.players[player]
}
script.on_event(defines.events.on_pre_build, (event: OnPreBuildEvent) => {
  if (processingSmartBelt) return
  const player = game.get_player(event.player_index)!
  const stack = player.cursor_stack
  if (stack && stack.valid_for_read && stack.name.startsWith("smarter-")) {
    const data = getPlayerData(player.index)
    data.preBuildData = {
      mode: event.build_mode,
      createdByMoving: event.created_by_moving,
    }
  }
})

script.on_event(defines.events.on_built_entity, (event: OnBuiltEntityEvent) => {
  if (processingSmartBelt) return
  const entity = event.entity
  if (!entity.valid) return
  const isGhost = entity.name == "entity-ghost"
  const name = isGhost ? entity.ghost_name : entity.name
  if (!name.startsWith("smarter-")) return
  const player = game.get_player(event.player_index)!
  const data = getPlayerData(player.index)
  const buildMode = detectBuildMode(
    data.preBuildData?.mode ?? defines.build_mode.normal,
    isGhost,
  )
  data.buildMode = buildMode
  const surface = entity.surface
  const pos = toTilePosition(entity.position)
  const direction = translateDirection(entity.direction)
  entity.destroy()

  const beltName = name.substring(8)

  handlePlayerBuilt(player, beltName, surface, pos, direction, buildMode)
})

script.on_event(defines.events.on_player_cursor_stack_changed, (event) => {
  const player = game.get_player(event.player_index)!
  const stack = player.cursor_stack
  if (stack && stack.valid_for_read && stack.name.startsWith("smarter-")) {
    stack.count = 42
  }
})

function handlePlayerBuilt(
  player: LuaPlayer,
  name: string,
  surface: LuaSurface,
  pos: TilePosition,
  direction: Direction,
  buildMode: SmartBeltBuildMode,
) {
  const data = getPlayerData(player.index)
  if (!data.preBuildData) return
  const { createdByMoving } = data.preBuildData

  const tier = beltTierFromBeltName(name)
  if (!tier) return

  const existingDrag = createdByMoving ? data.drag : undefined
  const isFirst = existingDrag === undefined

  const cursorManager = new CursorManager(player)
  const savedCursor = cursorManager.save()

  const world = new RealWorld(
    player.surface,
    tier,
    player,
    buildMode,
    isFirst,
    cursorManager,
  )
  const errHandler = new RealErrorHandler(surface, player, world)

  cursorManager.setupForBelt(tier.beltName, buildMode)
  processingSmartBelt = true
  try {
    if (!existingDrag) {
      const drag = LineDrag.startDrag(world, errHandler, tier, pos, direction)
      data.drag = drag
      data.previousDirection = direction
    } else {
      if (data.previousDirection != direction) {
        world.isFirst = true
        data.previousDirection = direction
        const [newDrag, ok] = existingDrag.rotate(world, errHandler, pos)
        data.drag = newDrag
      } else {
        existingDrag.interpolateTo(world, errHandler, pos)
      }
    }
  } finally {
    processingSmartBelt = false
    cursorManager.restore(savedCursor)
  }
}
