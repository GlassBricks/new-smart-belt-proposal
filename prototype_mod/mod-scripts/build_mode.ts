export type SmartBeltBuildMode = "real" | "ghost" | "force" | "superforce"

export function toFactorioBuildMode(
  mode: SmartBeltBuildMode,
): defines.build_mode {
  if (mode === "force") return defines.build_mode.forced
  if (mode === "superforce") return defines.build_mode.superforced
  return defines.build_mode.normal
}

export function detectBuildMode(
  mode: defines.build_mode,
  isGhost: boolean,
): SmartBeltBuildMode {
  if (mode === defines.build_mode.superforced) return "superforce"
  if (mode === defines.build_mode.forced) return "force"
  if (isGhost) return "ghost"
  return "real"
}
