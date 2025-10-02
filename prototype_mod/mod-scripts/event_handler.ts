import {
  LuaPlayer,
  LuaSurface,
  MapPosition,
  OnBuiltEntityEvent,
  OnPreBuildEvent,
  TilePosition,
} from "factorio:runtime"

script.on_event(defines.events.on_built_entity, (event: OnBuiltEntityEvent) => {
  const entity = event.entity
  if (!entity.valid) return
  const isGhost = entity.name == "entity-ghost"
  const name = isGhost ? entity.ghost_name : entity.name
  if (!name.startsWith("smarter-")) return
  entity.destroy()
})

script.on_event(defines.events.on_pre_build, (event: OnPreBuildEvent) => {
  const player = game.get_player(event.player_index)!
  const surface = player.surface
  const stack = player.cursor_stack
  if (stack && stack.valid_for_read && stack.name.startsWith("smarter-")) {
    handleEntityBuilt(
      player,
      stack.name.substring("smarter-".length),
      event.build_mode,
      surface,
      event.position,
      event.direction,
    )
  }
})

function handleEntityBuilt(
  player: LuaPlayer,
  name: string,
  mode: defines.build_mode,
  surface: LuaSurface,
  position: MapPosition,
  direction: defines.direction,
) {
  const tilePosition: TilePosition = {
    x: Math.floor(position.x),
    y: Math.floor(position.y),
  }
  game.print("" + name + serpent.block(tilePosition))
}
