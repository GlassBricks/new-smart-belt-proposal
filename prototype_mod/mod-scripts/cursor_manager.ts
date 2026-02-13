import { LuaPlayer } from "factorio:runtime"

interface SavedCursorState {
  type: "stack" | "ghost"
  name: string
  count?: number
}

export class CursorManager {
  constructor(private player: LuaPlayer) {}

  save(): SavedCursorState {
    const ghost = this.player.cursor_ghost
    if (ghost) {
      return { type: "ghost", name: ghost.name.name }
    }
    const stack = this.player.cursor_stack
    if (stack && stack.valid_for_read) {
      return { type: "stack", name: stack.name, count: stack.count }
    }
    return { type: "stack", name: "", count: 0 }
  }

  setupForBelt(beltName: string): void {
    this.setupCursor(beltName)
  }

  setupForUnderground(ugName: string): void {
    this.setupCursor(ugName)
  }

  restore(saved: SavedCursorState): void {
    if (saved.type === "ghost") {
      this.player.cursor_stack?.clear()
      this.player.cursor_ghost = saved.name
    } else if (saved.name !== "") {
      this.player.cursor_ghost = undefined
      this.player.cursor_stack?.set_stack({
        name: saved.name,
        count: saved.count ?? 1,
      })
    } else {
      this.player.cursor_ghost = undefined
      this.player.cursor_stack?.clear()
    }
  }

  private setupCursor(itemName: string): void {
    this.player.cursor_ghost = undefined
    this.player.cursor_stack?.set_stack({ name: itemName, count: 99 })
  }
}
