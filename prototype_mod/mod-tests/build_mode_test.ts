import { detectBuildMode, toFactorioBuildMode } from "../mod-scripts/build_mode"

describe("detectBuildMode", () => {
  test.each([
    ["normal + real entity → real", defines.build_mode.normal, false, "real"],
    ["normal + ghost entity → ghost", defines.build_mode.normal, true, "ghost"],
    ["forced + ghost entity → force", defines.build_mode.forced, true, "force"],
    [
      "superforced + ghost entity → superforce",
      defines.build_mode.superforced,
      true,
      "superforce",
    ],
    ["forced + real entity → force", defines.build_mode.forced, false, "force"],
    [
      "superforced + real entity → superforce",
      defines.build_mode.superforced,
      false,
      "superforce",
    ],
  ] as const)("%s", (_, buildMode, isGhost, expected) => {
    assert(detectBuildMode(buildMode, isGhost) === expected)
  })
})

describe("toFactorioBuildMode", () => {
  test.each([
    ["real → normal", "real", defines.build_mode.normal],
    ["ghost → forced", "ghost", defines.build_mode.forced],
    ["force → forced", "force", defines.build_mode.forced],
    ["superforce → superforced", "superforce", defines.build_mode.superforced],
  ] as const)("%s", (_, mode, expected) => {
    assert(toFactorioBuildMode(mode) === expected)
  })
})
