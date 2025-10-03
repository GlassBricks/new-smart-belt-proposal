export function debugPrint(...msg: unknown[]) {
  const msgs = msg.map((m) => (typeof m === "string" ? m : serpent.block(m)))
  game.print(msgs.join(","))
}
