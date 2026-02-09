import {
    LuaPlayer,
    LuaSurface,
    PlayerIndex,
    SurfaceCreateEntity,
    TileWrite,
} from "factorio:runtime"
import { BELT_TIERS } from "../common/belt_tiers"
import { Direction, type TilePosition } from "../common/geometry"
import type { TestEntity } from "../common/test_entity"
import {
    toFactorioBuildMode,
    type SmartBeltBuildMode,
} from "../mod-scripts/build_mode"
import {
    startErrorRecording,
    stopErrorRecording,
    toTilePosition,
    translateDirection,
} from "../mod-scripts/real_world"

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
    buildMode?: SmartBeltBuildMode
}

const OFFSET_X = 0
const OFFSET_Y = 0

declare const storage: { players: Record<number, object> }

function entityName(entity: TestEntity): string {
    switch (entity.kind) {
        case "belt":
            return BELT_TIERS[entity.tier - 1]!.beltName
        case "underground-belt":
            return BELT_TIERS[entity.tier - 1]!.undergroundName
        case "splitter":
            return BELT_TIERS[entity.tier - 1]!.splitterName!
        case "loader":
            return "loader-1x1"
        case "obstacle":
            return "stone-wall"
        case "impassable":
            return "smarter-belt-impassable"
        case "ghost-belt":
        case "deconstructed-belt":
            return BELT_TIERS[entity.tier - 1]!.beltName
        case "ghost-underground-belt":
            return BELT_TIERS[entity.tier - 1]!.undergroundName
        case "tree":
            return "tree-01"
    }
}

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

export function runDragTest(
    before: [TilePosition, TestEntity][],
    after: [TilePosition, TestEntity][],
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
    before: [TilePosition, TestEntity][],
    after: [TilePosition, TestEntity][],
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
    for (const [pos] of [...before, ...after]) {
        minX = Math.min(minX, pos.x)
        maxX = Math.max(maxX, pos.x)
        minY = Math.min(minY, pos.y)
        maxY = Math.max(maxY, pos.y)
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
    entities: [TilePosition, TestEntity][],
): void {
    const tiles: TileWrite[] = []
    for (const [pos, entity] of entities) {
        if (entity.kind === "impassable") {
            tiles.push({
                name: "smarter-belt-impassable",
                position: { x: pos.x + OFFSET_X, y: pos.y + OFFSET_Y },
            })
        }
    }
    if (tiles.length > 0) {
        surface.set_tiles(tiles)
    }
}

function placeBeforeEntities(
    surface: LuaSurface,
    entities: [TilePosition, TestEntity][],
    player: LuaPlayer,
): void {
    for (const [pos, entity] of entities) {
        if (entity.kind === "impassable") continue

        const mapPos = { x: pos.x + OFFSET_X + 0.5, y: pos.y + OFFSET_Y + 0.5 }
        const name = entityName(entity)

        if (entity.kind === "obstacle") {
            surface.create_entity({
                name,
                position: mapPos,
                force: player.force,
            })
        } else if (entity.kind === "splitter") {
            const isVertical =
                entity.direction === Direction.North ||
                entity.direction === Direction.South
            surface.create_entity({
                name: isVertical ? "lane-splitter" : name,
                position: mapPos,
                direction: toFacDir(entity.direction),
                force: player.force,
            })
        } else if (entity.kind === "belt") {
            surface.create_entity({
                name,
                position: mapPos,
                direction: toFacDir(entity.direction),
                force: player.force,
            })
        } else if (entity.kind === "loader") {
            surface.create_entity({
                name,
                position: mapPos,
                direction: toFacDir(entity.direction),
                type: entity.ioType,
                force: player.force,
            })
        } else if (entity.kind === "underground-belt") {
            surface.create_entity({
                name,
                position: mapPos,
                direction: toFacDir(entity.direction),
                type: entity.ioType,
                force: player.force,
            })
        } else if (entity.kind === "ghost-belt") {
            surface.create_entity({
                name: "entity-ghost",
                inner_name: name,
                position: mapPos,
                direction: toFacDir(entity.direction),
                force: player.force,
            })
        } else if (entity.kind === "ghost-underground-belt") {
            surface.create_entity({
                name: "entity-ghost",
                inner_name: name,
                position: mapPos,
                direction: toFacDir(entity.direction),
                type: entity.ioType,
                force: player.force,
            })
        } else if (entity.kind === "deconstructed-belt") {
            const placed = surface.create_entity({
                name,
                position: mapPos,
                direction: toFacDir(entity.direction),
                force: player.force,
            })
            if (placed) {
                placed.order_deconstruction(player.force, player)
            }
        } else if (entity.kind === "tree") {
            surface.create_entity({
                name,
                position: mapPos,
            })
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
    const buildMode = drag.buildMode ?? "real"

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
            buildMode,
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
    const buildMode = drag.buildMode ?? "real"

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
            buildMode,
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
    const buildMode = drag.buildMode ?? "real"

    const dx = Math.sign(drag.endX - drag.startX)
    const dy = Math.sign(drag.endY - drag.startY)
    const dirVec = dirVecFromDirection(drag.direction)
    const signedDist =
        (drag.endX - drag.startX) * dirVec.dx +
        (drag.endY - drag.startY) * dirVec.dy

    let cx = drag.startX
    let cy = drag.startY

    fireSmartBeltEvent(
        preBuildHandler,
        builtHandler,
        player,
        surface,
        smarterName,
        cx + OFFSET_X + 0.5,
        cy + OFFSET_Y + 0.5,
        facDir,
        false,
        buildMode,
    )

    function interpolateTo(tx: number, ty: number) {
        const sdx = Math.sign(tx - cx)
        const sdy = Math.sign(ty - cy)
        while (cx !== tx || cy !== ty) {
            cx += sdx
            cy += sdy
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
                buildMode,
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
    const buildMode = drag.buildMode ?? "real"

    const dx = Math.sign(drag.endX - drag.startX)
    const dy = Math.sign(drag.endY - drag.startY)
    const dirVec = dirVecFromDirection(drag.direction)
    const signedDist =
        (drag.endX - drag.startX) * dirVec.dx +
        (drag.endY - drag.startY) * dirVec.dy

    let cx = drag.startX
    let cy = drag.startY

    fireSmartBeltEvent(
        preBuildHandler,
        builtHandler,
        player,
        surface,
        smarterName,
        cx + OFFSET_X + 0.5,
        cy + OFFSET_Y + 0.5,
        facDir,
        false,
        buildMode,
    )

    function interpolateTo(tx: number, ty: number) {
        const sdx = Math.sign(tx - cx)
        const sdy = Math.sign(ty - cy)
        while (cx !== tx || cy !== ty) {
            cx += sdx
            cy += sdy
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
                buildMode,
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
    buildMode: SmartBeltBuildMode,
): void {
    const position = { x: mapX, y: mapY }
    const isGhostBuild = buildMode !== "real"

    preBuildHandler({
        player_index: player.index,
        position,
        direction: facDir,
        build_mode: toFactorioBuildMode(buildMode),
        created_by_moving: createdByMoving,
        shift_build: false,
        flip_horizontal: false,
        flip_vertical: false,
        tick: game.tick,
        name: defines.events.on_pre_build,
    })

    let entity
    if (isGhostBuild) {
        entity = surface.create_entity({
            name: "entity-ghost",
            inner_name: smarterName,
            position,
            direction: facDir,
            force: player.force,
        } as SurfaceCreateEntity)
    } else {
        entity = surface.create_entity({
            name: smarterName,
            position,
            direction: facDir,
            force: player.force,
        } as SurfaceCreateEntity)
    }
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

type EntityState = "real" | "ghost" | "deconstructed"

interface ResolvedBelt {
    x: number
    y: number
    kind: "belt" | "underground-belt"
    name: string
    direction: number
    ioType?: "input" | "output"
    state: EntityState
}

function formatBelts(entities: ResolvedBelt[]): string {
    return entities
        .map((e) => {
            let str = `  (${e.x},${e.y}) ${e.state} ${e.kind} ${e.name} dir=${e.direction}`
            if (e.ioType) str += ` ioType=${e.ioType}`
            return str
        })
        .join("\n")
}

function testEntityToState(kind: TestEntity["kind"]): EntityState {
    if (kind === "ghost-belt" || kind === "ghost-underground-belt")
        return "ghost"
    if (kind === "deconstructed-belt") return "deconstructed"
    return "real"
}

function assertEntities(
    surface: LuaSurface,
    expected: [TilePosition, TestEntity][],
    b: Bounds,
): void {
    const expectedBelts: ResolvedBelt[] = []
    for (const [pos, entity] of expected) {
        if (
            entity.kind === "belt" ||
            entity.kind === "ghost-belt" ||
            entity.kind === "deconstructed-belt"
        ) {
            expectedBelts.push({
                x: pos.x,
                y: pos.y,
                kind: "belt",
                name: entityName(entity),
                direction: entity.direction,
                state: testEntityToState(entity.kind),
            })
        } else if (
            entity.kind === "underground-belt" ||
            entity.kind === "ghost-underground-belt"
        ) {
            expectedBelts.push({
                x: pos.x,
                y: pos.y,
                kind: "underground-belt",
                name: entityName(entity),
                direction: entity.direction,
                ioType: entity.ioType,
                state: testEntityToState(entity.kind),
            })
        }
    }

    const area = {
        left_top: { x: b.minX + OFFSET_X, y: b.minY + OFFSET_Y },
        right_bottom: { x: b.maxX + OFFSET_X, y: b.maxY + OFFSET_Y },
    }

    const actualBelts: ResolvedBelt[] = []

    const realEntities = surface.find_entities_filtered({
        area,
        type: ["transport-belt", "underground-belt"],
    })
    for (const luaEntity of realEntities) {
        const tilePos = toTilePosition(luaEntity.position)
        const x = tilePos.x - OFFSET_X
        const y = tilePos.y - OFFSET_Y
        const dir = translateDirection(luaEntity.direction) as number
        const state: EntityState = luaEntity.to_be_deconstructed()
            ? "deconstructed"
            : "real"

        if (luaEntity.type === "transport-belt") {
            actualBelts.push({
                x,
                y,
                kind: "belt",
                name: luaEntity.name,
                direction: dir,
                state,
            })
        } else if (luaEntity.type === "underground-belt") {
            actualBelts.push({
                x,
                y,
                kind: "underground-belt",
                name: luaEntity.name,
                direction: dir,
                ioType: luaEntity.belt_to_ground_type as "input" | "output",
                state,
            })
        }
    }

    const ghostEntities = surface.find_entities_filtered({
        area,
        type: "entity-ghost",
    })
    for (const luaEntity of ghostEntities) {
        const ghostType = luaEntity.ghost_type
        if (
            ghostType !== "transport-belt" &&
            ghostType !== "underground-belt"
        ) {
            continue
        }
        const tilePos = toTilePosition(luaEntity.position)
        const x = tilePos.x - OFFSET_X
        const y = tilePos.y - OFFSET_Y
        const dir = translateDirection(luaEntity.direction) as number

        if (ghostType === "transport-belt") {
            actualBelts.push({
                x,
                y,
                kind: "belt",
                name: luaEntity.ghost_name,
                direction: dir,
                state: "ghost",
            })
        } else {
            actualBelts.push({
                x,
                y,
                kind: "underground-belt",
                name: luaEntity.ghost_name,
                direction: dir,
                ioType: luaEntity.belt_to_ground_type as "input" | "output",
                state: "ghost",
            })
        }
    }

    function sortKey(this: unknown, a: ResolvedBelt, b: ResolvedBelt) {
        if (a.x !== b.x) return a.x - b.x
        if (a.y !== b.y) return a.y - b.y
        if (a.state !== b.state) return a.state < b.state ? -1 : 1
        return 0
    }
    expectedBelts.sort(sortKey)
    actualBelts.sort(sortKey)

    if (expectedBelts.length !== actualBelts.length) {
        error(
            `Entity count mismatch: expected ${expectedBelts.length}, got ${actualBelts.length}\n` +
                `Expected:\n${formatBelts(expectedBelts)}\nActual:\n${formatBelts(actualBelts)}`,
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
            exp.direction !== act.direction ||
            exp.ioType !== act.ioType ||
            exp.state !== act.state
        ) {
            error(
                `Entity mismatch at index ${i}:\n` +
                    `  Expected: (${exp.x},${exp.y}) ${exp.state} ${exp.kind} ${exp.name} dir=${exp.direction}${exp.ioType ? ` ioType=${exp.ioType}` : ""}\n` +
                    `  Actual:   (${act.x},${act.y}) ${act.state} ${act.kind} ${act.name} dir=${act.direction}${act.ioType ? ` ioType=${act.ioType}` : ""}\n\n` +
                    `All expected:\n${formatBelts(expectedBelts)}\nAll actual:\n${formatBelts(actualBelts)}`,
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
