export function debugPrint(...msg: unknown[]) {
  const messageLen = select("#", ...msg)
  const msgs = Array.from({ length: messageLen }, (_, i) => {
    const e = msg[i]
    return typeof e === "string" ? e : serpent.block(e)
  })
  game.print(msgs.join(" "), {
    skip: defines.print_skip.never,
  })
}
