import {
  LuaPlayer,
  LuaSurface,
  OnBuiltEntityEvent,
  OnPreBuildEvent,
  PlayerIndex,
} from "factorio:runtime"
import { Direction, TilePosition } from "../common/geometry"
import { LineDrag } from "../common/smart_belt"
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
}
declare const storage: {
  players: Record<PlayerIndex, PlayerDragData>
}
script.on_configuration_changed(() => {
  storage.players ??= {}
})

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
  const player = game.get_player(event.player_index)!
  const surface = player.surface
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
  const entity = event.entity
  if (!entity.valid) return
  const isGhost = entity.name == "entity-ghost"
  const name = isGhost ? entity.ghost_name : entity.name
  if (!name.startsWith("smarter-")) return
  const player = game.get_player(event.player_index)!
  const surface = entity.surface
  const pos = toTilePosition(entity.position)
  const direction = translateDirection(entity.direction)
  entity.destroy()

  const beltName = name.substring(8)

  handlePlayerBuilt(player, beltName, surface, pos, direction)
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
) {
  const data = getPlayerData(player.index)
  if (!data.preBuildData) return
  const { createdByMoving, mode } = data.preBuildData

  const tier = beltTierFromBeltName(name)
  if (!tier) {
    return
  }

  const existingDrag = createdByMoving ? data.drag : undefined
  const isFirst = existingDrag === undefined

  const world = new RealWorld(
    player.surface,
    tier,
    player,
    mode == defines.build_mode.forced,
    isFirst,
  )
  const errHandler = new RealErrorHandler(surface, player, world)

  if (!existingDrag) {
    const drag = LineDrag.startDrag(world, errHandler, tier, pos, direction)
    data.drag = drag
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
}

// script.on_nth_tick(60 * 5, () => {
//   game.reload_mods()
// })
