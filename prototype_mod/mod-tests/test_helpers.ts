import {
    LuaPlayer,
    LuaSurface,
    PlayerIndex,
    SurfaceCreateEntity,
    TileWrite,
} from "factorio:runtime"
import { Direction } from "../common/geometry"
import {
    startErrorRecording,
    stopErrorRecording,
    toTilePosition,
    translateDirection,
} from "../mod-scripts/real_world"

export interface EntityData {
    x: number
    y: number
    kind:
        | "belt"
        | "underground-input"
        | "underground-output"
        | "obstacle"
        | "impassable"
        | "splitter"
        | "loader-input"
        | "loader-output"
    name: string
    direction: number
}

export interface DragConfig {
    startX: number
    startY: number
    endX: number
    endY: number
    direction: number
    beltName: string
    forwardBack?: boolean
    leftmostX?: number
    leftmostY?: number
    variant?: "wiggle" | "mega_wiggle"
}

const OFFSET_X = 0
const OFFSET_Y = 0

declare const storage: { players: Record<number, object> }

function resetPlayerDragState(player: LuaPlayer): void {
    storage.players ??= {} as any
    storage.players[player.index as number] = {}
}

function toFacDir(direction: number): defines.direction {
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

function dirVecFromDirection(direction: number): { dx: number; dy: number } {
    switch (direction) {
        case Direction.North:
            return { dx: 0, dy: -1 }
        case Direction.East:
            return { dx: 1, dy: 0 }
        case Direction.South:
            return { dx: 0, dy: 1 }
        case Direction.West:
            return { dx: -1, dy: 0 }
        default:
            error(`Invalid direction: ${direction}`)
    }
}

function formatEntities(entities: EntityData[]): string {
    return entities
        .map((e) => `  (${e.x},${e.y}) ${e.kind} ${e.name} dir=${e.direction}`)
        .join("\n")
}

export function runDragTest(
    before: EntityData[],
    after: EntityData[],
    drag: DragConfig,
    expectedErrors: string[] = [],
): void {
    const player = game.get_player(1 as PlayerIndex)!
    const surface = player.surface

    resetPlayerDragState(player)

    const bounds = computeBounds(before, after, drag)

    clearArea(surface, bounds)
    resetTiles(surface, bounds)

    player.get_main_inventory()?.clear()

    placeImpassableTiles(surface, before)
    placeBeforeEntities(surface, before, player)

    const cursorStack = player.cursor_stack
    if (!cursorStack) {
        error("player.cursor_stack is nil")
    }
    cursorStack.set_stack({ name: "smarter-" + drag.beltName, count: 42 })
    if (!cursorStack.valid_for_read) {
        error("cursor_stack not valid_for_read after set_stack")
    }

    startErrorRecording()

    if (drag.variant === "wiggle") {
        simulateWiggleDragEvents(player, surface, drag)
    } else if (drag.variant === "mega_wiggle") {
        simulateMegaWiggleDragEvents(player, surface, drag)
    } else {
        simulateDragEvents(player, surface, drag)
        if (drag.forwardBack) {
            simulateBackwardDragEvents(player, surface, drag)
        }
    }
    player.clear_cursor()

    const actualErrors = stopErrorRecording()

    assertEntities(surface, after, bounds)
    assertErrors(expectedErrors, actualErrors, drag.variant)
}

interface Bounds {
    minX: number
    minY: number
    maxX: number
    maxY: number
}

function computeBounds(
    before: EntityData[],
    after: EntityData[],
    drag: DragConfig,
): Bounds {
    let minX = Math.min(drag.startX, drag.endX)
    let maxX = Math.max(drag.startX, drag.endX)
    let minY = Math.min(drag.startY, drag.endY)
    let maxY = Math.max(drag.startY, drag.endY)
    if (drag.forwardBack && drag.leftmostX !== undefined) {
        minX = Math.min(minX, drag.leftmostX)
    }
    if (drag.forwardBack && drag.leftmostY !== undefined) {
        minY = Math.min(minY, drag.leftmostY)
    }
    for (const e of [...before, ...after]) {
        minX = Math.min(minX, e.x)
        maxX = Math.max(maxX, e.x)
        minY = Math.min(minY, e.y)
        maxY = Math.max(maxY, e.y)
    }
    return { minX: minX - 2, minY: minY - 2, maxX: maxX + 3, maxY: maxY + 3 }
}

function boundsToArea(b: Bounds) {
    return {
        left_top: { x: b.minX + OFFSET_X, y: b.minY + OFFSET_Y },
        right_bottom: { x: b.maxX + OFFSET_X, y: b.maxY + OFFSET_Y },
    }
}

function clearArea(surface: LuaSurface, bounds: Bounds): void {
    for (const entity of surface.find_entities(boundsToArea(bounds))) {
        if (entity.type !== "character") {
            entity.destroy()
        }
    }
}

function resetTiles(surface: LuaSurface, bounds: Bounds): void {
    surface.build_checkerboard(boundsToArea(bounds))
}

function placeImpassableTiles(
    surface: LuaSurface,
    entities: EntityData[],
): void {
    const tiles: TileWrite[] = []
    for (const e of entities) {
        if (e.kind === "impassable") {
            tiles.push({
                name: "smarter-belt-impassable",
                position: { x: e.x + OFFSET_X, y: e.y + OFFSET_Y },
            })
        }
    }
    if (tiles.length > 0) {
        surface.set_tiles(tiles)
    }
}

function placeBeforeEntities(
    surface: LuaSurface,
    entities: EntityData[],
    player: LuaPlayer,
): void {
    for (const e of entities) {
        if (e.kind === "impassable") continue

        const mapPos = { x: e.x + OFFSET_X + 0.5, y: e.y + OFFSET_Y + 0.5 }

        if (e.kind === "obstacle") {
            surface.create_entity({
                name: "stone-wall",
                position: mapPos,
                force: player.force,
            } as SurfaceCreateEntity)
        } else if (e.kind === "splitter") {
            const isVertical =
                e.direction === Direction.North || e.direction === Direction.South
            surface.create_entity({
                name: isVertical ? "lane-splitter" : e.name,
                position: mapPos,
                direction: toFacDir(e.direction),
                force: player.force,
            } as SurfaceCreateEntity)
        } else if (e.kind === "belt") {
            surface.create_entity({
                name: e.name,
                position: mapPos,
                direction: toFacDir(e.direction),
                force: player.force,
            } as SurfaceCreateEntity)
        } else if (e.kind === "loader-input" || e.kind === "loader-output") {
            surface.create_entity({
                name: e.name,
                position: mapPos,
                direction: toFacDir(e.direction),
                type: e.kind === "loader-input" ? "input" : "output",
                force: player.force,
            } as SurfaceCreateEntity)
        } else {
            surface.create_entity({
                name: e.name,
                position: mapPos,
                direction: toFacDir(e.direction),
                type: e.kind === "underground-input" ? "input" : "output",
                force: player.force,
            } as SurfaceCreateEntity)
        }
    }
}

function simulateDragEvents(
    player: LuaPlayer,
    surface: LuaSurface,
    drag: DragConfig,
): void {
    const preBuildHandler = script.get_event_handler(
        defines.events.on_pre_build,
    )
    const builtHandler = script.get_event_handler(
        defines.events.on_built_entity,
    )
    if (!preBuildHandler || !builtHandler) {
        error("Smarter belt event handlers not registered")
    }

    const facDir = toFacDir(drag.direction)
    const smarterName = "smarter-" + drag.beltName

    const dx = Math.sign(drag.endX - drag.startX)
    const dy = Math.sign(drag.endY - drag.startY)
    let cx = drag.startX
    let cy = drag.startY
    let first = true

    while (true) {
        fireSmartBeltEvent(
            preBuildHandler,
            builtHandler,
            player,
            surface,
            smarterName,
            cx + OFFSET_X + 0.5,
            cy + OFFSET_Y + 0.5,
            facDir,
            !first,
        )
        first = false
        if (cx === drag.endX && cy === drag.endY) break
        cx += dx
        cy += dy
    }
}

function simulateBackwardDragEvents(
    player: LuaPlayer,
    surface: LuaSurface,
    drag: DragConfig,
): void {
    const preBuildHandler = script.get_event_handler(
        defines.events.on_pre_build,
    )
    const builtHandler = script.get_event_handler(
        defines.events.on_built_entity,
    )
    if (!preBuildHandler || !builtHandler) {
        error("Smarter belt event handlers not registered")
    }

    const facDir = toFacDir(drag.direction)
    const smarterName = "smarter-" + drag.beltName

    const leftmostX = drag.leftmostX ?? 0
    const leftmostY = drag.leftmostY ?? drag.startY
    const dx = Math.sign(leftmostX - drag.endX)
    const dy = Math.sign(leftmostY - drag.endY)
    let cx = drag.endX + dx
    let cy = drag.endY + dy

    while (true) {
        fireSmartBeltEvent(
            preBuildHandler,
            builtHandler,
            player,
            surface,
            smarterName,
            cx + OFFSET_X + 0.5,
            cy + OFFSET_Y + 0.5,
            facDir,
            true,
        )
        if (cx === leftmostX && cy === leftmostY) break
        cx += dx
        cy += dy
    }
}

function simulateWiggleDragEvents(
    player: LuaPlayer,
    surface: LuaSurface,
    drag: DragConfig,
): void {
    const preBuildHandler = script.get_event_handler(
        defines.events.on_pre_build,
    )
    const builtHandler = script.get_event_handler(
        defines.events.on_built_entity,
    )
    if (!preBuildHandler || !builtHandler) {
        error("Smarter belt event handlers not registered")
    }

    const facDir = toFacDir(drag.direction)
    const smarterName = "smarter-" + drag.beltName

    const dx = Math.sign(drag.endX - drag.startX)
    const dy = Math.sign(drag.endY - drag.startY)
    const dirVec = dirVecFromDirection(drag.direction)
    const signedDist =
        (drag.endX - drag.startX) * dirVec.dx +
        (drag.endY - drag.startY) * dirVec.dy

    let cx = drag.startX
    let cy = drag.startY

    fireSmartBeltEvent(
        preBuildHandler, builtHandler, player, surface, smarterName,
        cx + OFFSET_X + 0.5, cy + OFFSET_Y + 0.5, facDir, false,
    )

    function interpolateTo(tx: number, ty: number) {
        const sdx = Math.sign(tx - cx)
        const sdy = Math.sign(ty - cy)
        while (cx !== tx || cy !== ty) {
            cx += sdx
            cy += sdy
            fireSmartBeltEvent(
                preBuildHandler, builtHandler, player, surface, smarterName,
                cx + OFFSET_X + 0.5, cy + OFFSET_Y + 0.5, facDir, true,
            )
        }
    }

    let baseDist = 0
    while (baseDist + 2 < signedDist) {
        const f2x = drag.startX + dx * (baseDist + 2)
        const f2y = drag.startY + dy * (baseDist + 2)
        interpolateTo(f2x, f2y)

        baseDist += 1
        const b1x = drag.startX + dx * baseDist
        const b1y = drag.startY + dy * baseDist
        interpolateTo(b1x, b1y)
    }

    if (cx !== drag.endX || cy !== drag.endY) {
        interpolateTo(drag.endX, drag.endY)
    }
}

function simulateMegaWiggleDragEvents(
    player: LuaPlayer,
    surface: LuaSurface,
    drag: DragConfig,
): void {
    const preBuildHandler = script.get_event_handler(
        defines.events.on_pre_build,
    )
    const builtHandler = script.get_event_handler(
        defines.events.on_built_entity,
    )
    if (!preBuildHandler || !builtHandler) {
        error("Smarter belt event handlers not registered")
    }

    const facDir = toFacDir(drag.direction)
    const smarterName = "smarter-" + drag.beltName

    const dx = Math.sign(drag.endX - drag.startX)
    const dy = Math.sign(drag.endY - drag.startY)
    const dirVec = dirVecFromDirection(drag.direction)
    const signedDist =
        (drag.endX - drag.startX) * dirVec.dx +
        (drag.endY - drag.startY) * dirVec.dy

    let cx = drag.startX
    let cy = drag.startY

    fireSmartBeltEvent(
        preBuildHandler, builtHandler, player, surface, smarterName,
        cx + OFFSET_X + 0.5, cy + OFFSET_Y + 0.5, facDir, false,
    )

    function interpolateTo(tx: number, ty: number) {
        const sdx = Math.sign(tx - cx)
        const sdy = Math.sign(ty - cy)
        while (cx !== tx || cy !== ty) {
            cx += sdx
            cy += sdy
            fireSmartBeltEvent(
                preBuildHandler, builtHandler, player, surface, smarterName,
                cx + OFFSET_X + 0.5, cy + OFFSET_Y + 0.5, facDir, true,
            )
        }
    }

    let n = 1
    while (n < signedDist) {
        const fnx = drag.startX + dx * n
        const fny = drag.startY + dy * n
        interpolateTo(fnx, fny)
        interpolateTo(drag.startX, drag.startY)
        n += 1
    }

    interpolateTo(drag.endX, drag.endY)
}

function fireSmartBeltEvent(
    preBuildHandler: (event: any) => void,
    builtHandler: (event: any) => void,
    player: LuaPlayer,
    surface: LuaSurface,
    smarterName: string,
    mapX: number,
    mapY: number,
    facDir: defines.direction,
    createdByMoving: boolean,
): void {
    const position = { x: mapX, y: mapY }

    preBuildHandler({
        player_index: player.index,
        position,
        direction: facDir,
        build_mode: defines.build_mode.normal,
        created_by_moving: createdByMoving,
        shift_build: false,
        flip_horizontal: false,
        flip_vertical: false,
        tick: game.tick,
        name: defines.events.on_pre_build,
    })

    const entity = surface.create_entity({
        name: smarterName,
        position,
        direction: facDir,
        force: player.force,
    } as SurfaceCreateEntity)
    if (!entity) {
        error(`Failed to create ${smarterName} at (${mapX}, ${mapY})`)
    }

    builtHandler({
        entity,
        player_index: player.index,
        tick: game.tick,
        name: defines.events.on_built_entity,
    })

}

function assertEntities(
    surface: LuaSurface,
    expected: EntityData[],
    b: Bounds,
): void {
    const expectedBelts = expected.filter(
        (e) =>
            e.kind === "belt" ||
            e.kind === "underground-input" ||
            e.kind === "underground-output",
    )

    const actualLuaEntities = surface.find_entities_filtered({
        area: {
            left_top: { x: b.minX + OFFSET_X, y: b.minY + OFFSET_Y },
            right_bottom: { x: b.maxX + OFFSET_X, y: b.maxY + OFFSET_Y },
        },
        type: ["transport-belt", "underground-belt"],
    })

    const actualBelts: EntityData[] = []
    for (const entity of actualLuaEntities) {
        const tilePos = toTilePosition(entity.position)
        const x = tilePos.x - OFFSET_X
        const y = tilePos.y - OFFSET_Y
        const dir = translateDirection(entity.direction) as number

        if (entity.type === "transport-belt") {
            actualBelts.push({
                x,
                y,
                kind: "belt",
                name: entity.name,
                direction: dir,
            })
        } else if (entity.type === "underground-belt") {
            actualBelts.push({
                x,
                y,
                kind:
                    entity.belt_to_ground_type === "input"
                        ? "underground-input"
                        : "underground-output",
                name: entity.name,
                direction: dir,
            })
        }
    }

    function sortKey(this: unknown, a: EntityData, b: EntityData) {
        return a.x !== b.x ? a.x - b.x : a.y - b.y
    }
    expectedBelts.sort(sortKey)
    actualBelts.sort(sortKey)

    if (expectedBelts.length !== actualBelts.length) {
        error(
            `Entity count mismatch: expected ${expectedBelts.length}, got ${actualBelts.length}\n` +
                `Expected:\n${formatEntities(expectedBelts)}\nActual:\n${formatEntities(actualBelts)}`,
        )
    }

    for (let i = 0; i < expectedBelts.length; i++) {
        const exp = expectedBelts[i]!
        const act = actualBelts[i]!
        if (
            exp.x !== act.x ||
            exp.y !== act.y ||
            exp.kind !== act.kind ||
            exp.name !== act.name ||
            exp.direction !== act.direction
        ) {
            error(
                `Entity mismatch at index ${i}:\n` +
                    `  Expected: (${exp.x},${exp.y}) ${exp.kind} ${exp.name} dir=${exp.direction}\n` +
                    `  Actual:   (${act.x},${act.y}) ${act.kind} ${act.name} dir=${act.direction}\n\n` +
                    `All expected:\n${formatEntities(expectedBelts)}\nAll actual:\n${formatEntities(actualBelts)}`,
            )
        }
    }
}

function arrayToSet(arr: string[]): Record<string, true> {
    const set: Record<string, true> = {}
    for (const item of arr) {
        set[item] = true
    }
    return set
}

function setsEqual(a: Record<string, true>, b: Record<string, true>): boolean {
    for (const key in a) {
        if (!b[key]) return false
    }
    for (const key in b) {
        if (!a[key]) return false
    }
    return true
}

function isSubset(
    subset: Record<string, true>,
    superset: Record<string, true>,
): boolean {
    for (const key in subset) {
        if (!superset[key]) return false
    }
    return true
}

function assertErrors(
    expected: string[],
    actual: string[],
    variant: "wiggle" | "mega_wiggle" | undefined,
): void {
    const expectedSet = arrayToSet(expected)
    const actualSet = arrayToSet(actual)

    const isWiggleVariant = variant === "wiggle" || variant === "mega_wiggle"
    const match = isWiggleVariant
        ? expected.length === 0
            ? actual.length === 0
            : isSubset(expectedSet, actualSet)
        : setsEqual(expectedSet, actualSet)

    if (!match) {
        const expectedSorted = [...expected].sort()
        const actualSorted = [...actual].sort()
        error(
            `Error mismatch (variant=${variant ?? "normal"}):\n` +
                `  Expected errors: [${expectedSorted.join(", ")}]\n` +
                `  Actual errors:   [${actualSorted.join(", ")}]`,
        )
    }
}
