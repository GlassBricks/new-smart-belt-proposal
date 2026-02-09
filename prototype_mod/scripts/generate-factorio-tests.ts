#!/usr/bin/env bun

import {
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    writeFileSync,
} from "fs"
import * as yaml from "js-yaml"
import { join } from "path"
import { BELT_TIERS } from "../common/belt_tiers"
import {
    Belt,
    CollidingEntityOrTile,
    ImpassableTile,
    LoaderLike,
    Splitter,
    UndergroundBelt,
    type BeltCollider,
} from "../common/belts"
import {
    Direction,
    oppositeDirection,
    type TilePosition,
} from "../common/geometry"
import type { TestEntity } from "../common/test_entity"
import {
    getTestVariants,
    loadTestCasesFromYaml,
    sanitizeTestName,
    type TestCaseYaml,
} from "../ts-only/test-utils"
import { parseTestCase, type DragTestCase } from "../ts-only/test_case"

const SKIPPED_FILES = new Set<string>([])

interface DragConfigLiteral {
    startX: number
    startY: number
    endX: number
    endY: number
    direction: Direction
    beltName: string
    forwardBack?: boolean
    leftmostX?: number
    leftmostY?: number
    variant?: "wiggle" | "mega_wiggle"
}

interface EntityWithPos {
    pos: TilePosition
    entity: TestEntity
}

function beltColliderToTestEntity(collider: BeltCollider): TestEntity {
    if (collider instanceof Belt) {
        return {
            kind: "belt",
            direction: collider.direction,
            tier: BELT_TIERS.indexOf(collider.tier) + 1,
        }
    }
    if (collider instanceof UndergroundBelt) {
        return {
            kind: "underground-belt",
            direction: collider.direction,
            tier: BELT_TIERS.indexOf(collider.tier) + 1,
            ioType: collider.isInput ? "input" : "output",
        }
    }
    if (collider instanceof Splitter) {
        return {
            kind: "splitter",
            direction: collider.direction,
            tier:
                BELT_TIERS.findIndex(
                    (t) => t.splitterName === collider.name,
                ) + 1,
        }
    }
    if (collider instanceof LoaderLike) {
        return {
            kind: "loader",
            direction: collider.direction,
            tier:
                BELT_TIERS.findIndex(
                    (t) => collider.name === t.beltName + "-loader",
                ) + 1,
            ioType: collider.isInput ? "input" : "output",
        }
    }
    if (collider instanceof CollidingEntityOrTile) {
        return { kind: "obstacle" }
    }
    return { kind: "impassable" }
}

function worldToEntities(
    entries: IterableIterator<[TilePosition, BeltCollider]>,
): EntityWithPos[] {
    const result: EntityWithPos[] = []
    for (const [pos, collider] of entries) {
        result.push({ pos, entity: beltColliderToTestEntity(collider) })
    }
    return result
}

function directionName(dir: Direction): string {
    switch (dir) {
        case Direction.North:
            return "Direction.North"
        case Direction.East:
            return "Direction.East"
        case Direction.South:
            return "Direction.South"
        case Direction.West:
            return "Direction.West"
    }
}

function entityTupleToCode(pos: TilePosition, entity: TestEntity): string {
    switch (entity.kind) {
        case "belt":
            return `[{ x: ${pos.x}, y: ${pos.y} }, { kind: "belt", direction: ${directionName(entity.direction)}, tier: ${entity.tier} }]`
        case "underground-belt":
            return `[{ x: ${pos.x}, y: ${pos.y} }, { kind: "underground-belt", direction: ${directionName(entity.direction)}, tier: ${entity.tier}, ioType: "${entity.ioType}" }]`
        case "splitter":
            return `[{ x: ${pos.x}, y: ${pos.y} }, { kind: "splitter", direction: ${directionName(entity.direction)}, tier: ${entity.tier} }]`
        case "loader":
            return `[{ x: ${pos.x}, y: ${pos.y} }, { kind: "loader", direction: ${directionName(entity.direction)}, tier: ${entity.tier}, ioType: "${entity.ioType}" }]`
        case "obstacle":
            return `[{ x: ${pos.x}, y: ${pos.y} }, { kind: "obstacle" }]`
        case "impassable":
            return `[{ x: ${pos.x}, y: ${pos.y} }, { kind: "impassable" }]`
    }
}

function entitiesToCode(entities: EntityWithPos[]): string {
    if (entities.length === 0) return "[]"
    const items = entities.map((e) => entityTupleToCode(e.pos, e.entity))
    return `[\n        ${items.join(",\n        ")},\n      ]`
}

function errorsToCode(errors: string[]): string {
    if (errors.length === 0) return "[]"
    const items = errors.map((e) => `"${e}"`)
    return `[${items.join(", ")}]`
}

function dragConfigToCode(drag: DragConfigLiteral): string {
    let code = `{ startX: ${drag.startX}, startY: ${drag.startY}, endX: ${drag.endX}, endY: ${drag.endY}, direction: ${directionName(drag.direction)}, beltName: "${drag.beltName}"`
    if (drag.forwardBack) {
        code += `, forwardBack: true, leftmostX: ${drag.leftmostX}, leftmostY: ${drag.leftmostY}`
    }
    if (drag.variant) {
        code += `, variant: "${drag.variant}"`
    }
    code += ` }`
    return code
}

function generateTestFile(
    fileStem: string,
    testCases: TestCaseYaml[],
): string | undefined {
    const tests: string[] = []

    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i]!
        const testName =
            testCase.name || `test_${String(i + 1).padStart(3, "0")}`
        const sanitizedName = sanitizeTestName(testName)

        const yamlContent = yaml.dump(testCase)
        let parsed: DragTestCase
        try {
            parsed = parseTestCase(yamlContent)
        } catch (e) {
            console.warn(`  Skipping test "${testName}": ${e}`)
            continue
        }

        const { entities, forwardBack, notReversible, afterForReverse } = parsed
        const beforeData = worldToEntities(entities.before.getEntities())
        const afterData = worldToEntities(entities.after.getEntities())
        const expectedErrors = Array.from(entities.expectedErrors).sort()

        let reverseBeforeData: EntityWithPos[] | undefined
        let reverseAfterData: EntityWithPos[] | undefined
        if (!notReversible) {
            const flippedBefore = entities.before.flipAllEntities()
            const flippedAfter = (
                afterForReverse || entities.after
            ).flipAllEntities()
            reverseBeforeData = worldToEntities(flippedBefore.getEntities())
            reverseAfterData = worldToEntities(flippedAfter.getEntities())
        }

        const variants = getTestVariants({
            forward_back: forwardBack,
            not_reversible: notReversible,
        })

        for (const variant of variants) {
            const isReverse = variant.reverse
            const bd = isReverse ? reverseBeforeData! : beforeData
            const ad = isReverse ? reverseAfterData! : afterData
            const dragDir = isReverse
                ? oppositeDirection(entities.beltDirection)
                : entities.beltDirection

            const dragData: DragConfigLiteral = {
                startX: entities.startPos.x,
                startY: entities.startPos.y,
                endX: entities.endPos.x,
                endY: entities.endPos.y,
                direction: dragDir,
                beltName: entities.tier.beltName,
            }

            if (variant.variantType === "ForwardBack") {
                dragData.forwardBack = true
                dragData.leftmostX = entities.leftmostPos.x
                dragData.leftmostY = entities.leftmostPos.y
            }

            if (variant.variantType === "Wiggle") {
                dragData.variant = "wiggle"
            } else if (variant.variantType === "MegaWiggle") {
                dragData.variant = "mega_wiggle"
            }

            const variantName = sanitizedName + variant.suffix

            tests.push(
                `  test("${variantName}", () => {\n` +
                    `    runDragTest(\n` +
                    `      ${entitiesToCode(bd)},\n` +
                    `      ${entitiesToCode(ad)},\n` +
                    `      ${dragConfigToCode(dragData)},\n` +
                    `      ${errorsToCode(expectedErrors)},\n` +
                    `    )\n` +
                    `  })`,
            )
        }
    }

    if (tests.length === 0) return undefined

    return (
        `import { Direction } from "../../common/geometry"\nimport { runDragTest } from "../test_helpers"\n\n` +
        `describe("${fileStem}", () => {\n` +
        tests.join("\n\n") +
        `\n})\n`
    )
}

function generateInitFile(moduleNames: string[]): string {
    const filesList = moduleNames
        .map((name) => `  "mod-tests.generated.${name}",`)
        .join("\n")
    return (
        `const init = require("__factorio-test__/init") as (files: string[], config?: object) => void\n` +
        `init([\n${filesList}\n])\n`
    )
}

function main() {
    const testSuiteDir = join(import.meta.dir, "..", "..", "test_suite")
    const generatedDir = join(import.meta.dir, "..", "mod-tests", "generated")

    console.log(`Reading test suite from: ${testSuiteDir}`)
    console.log(`Generating factorio tests to: ${generatedDir}`)

    if (!existsSync(generatedDir)) {
        mkdirSync(generatedDir, { recursive: true })
    }

    const yamlFiles = readdirSync(testSuiteDir, { withFileTypes: true })
        .filter(
            (entry) =>
                entry.isFile() &&
                entry.name.endsWith(".yaml") &&
                !SKIPPED_FILES.has(entry.name),
        )
        .map((entry) => entry.name)

    if (yamlFiles.length === 0) {
        console.log("No YAML test files found")
        return
    }

    console.log(
        `Found ${yamlFiles.length} test files (skipping ${SKIPPED_FILES.size})`,
    )

    const moduleNames: string[] = []
    let totalTests = 0

    for (const yamlFile of yamlFiles) {
        const content = readFileSync(join(testSuiteDir, yamlFile), "utf-8")
        const testCases = loadTestCasesFromYaml(content)
        const fileStem = yamlFile.replace(/\.yaml$/, "")

        const code = generateTestFile(fileStem, testCases)
        if (!code) {
            console.log(`  ${yamlFile} -> (no valid tests)`)
            continue
        }

        const testFileName = `${fileStem}.ts`
        writeFileSync(join(generatedDir, testFileName), code)
        moduleNames.push(fileStem)

        const testCount = (code.match(/\btest\(/g) || []).length
        totalTests += testCount
        console.log(`  ${yamlFile} -> ${testFileName} (${testCount} tests)`)
    }

    const initCode = generateInitFile(moduleNames)
    writeFileSync(join(generatedDir, "init_tests.ts"), initCode)

    console.log(
        `\nGenerated ${totalTests} tests across ${moduleNames.length} files`,
    )
}

main()
