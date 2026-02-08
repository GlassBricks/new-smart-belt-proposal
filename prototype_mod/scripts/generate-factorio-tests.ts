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
import {
    Belt,
    CollidingEntityOrTile,
    ImpassableTile,
    LoaderLike,
    Splitter,
    UndergroundBelt,
    type BeltCollider,
} from "../common/belts"
import { oppositeDirection, type TilePosition } from "../common/geometry"
import {
    getTestVariants,
    loadTestCasesFromYaml,
    sanitizeTestName,
    type TestCaseYaml,
} from "../ts-only/test-utils"
import { parseTestCase, type DragTestCase } from "../ts-only/test_case"

const SKIPPED_FILES = new Set<string>([])

interface EntityDataLiteral {
    x: number
    y: number
    kind: string
    name: string
    direction: number
}

interface DragConfigLiteral {
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

function worldToEntityData(
    entities: IterableIterator<[TilePosition, BeltCollider]>,
): EntityDataLiteral[] {
    const result: EntityDataLiteral[] = []
    for (const [pos, entity] of entities) {
        if (entity instanceof Belt) {
            result.push({
                x: pos.x,
                y: pos.y,
                kind: "belt",
                name: entity.tier.beltName,
                direction: entity.direction,
            })
        } else if (entity instanceof UndergroundBelt) {
            result.push({
                x: pos.x,
                y: pos.y,
                kind: entity.isInput
                    ? "underground-input"
                    : "underground-output",
                name: entity.tier.undergroundName,
                direction: entity.direction,
            })
        } else if (entity instanceof CollidingEntityOrTile) {
            result.push({
                x: pos.x,
                y: pos.y,
                kind: "obstacle",
                name: "stone-wall",
                direction: 0,
            })
        } else if (entity instanceof ImpassableTile) {
            result.push({
                x: pos.x,
                y: pos.y,
                kind: "impassable",
                name: "smarter-belt-impassable",
                direction: 0,
            })
        } else if (entity instanceof Splitter) {
            result.push({
                x: pos.x,
                y: pos.y,
                kind: "splitter",
                name: entity.name,
                direction: entity.direction,
            })
        } else if (entity instanceof LoaderLike) {
            result.push({
                x: pos.x,
                y: pos.y,
                kind: entity.isInput ? "loader-input" : "loader-output",
                name: "loader-1x1",
                direction: entity.direction,
            })
        }
    }
    return result
}

function entityDataToCode(entities: EntityDataLiteral[]): string {
    if (entities.length === 0) return "[]"
    const items = entities.map(
        (e) =>
            `{ x: ${e.x}, y: ${e.y}, kind: "${e.kind}", name: "${e.name}", direction: ${e.direction} }`,
    )
    return `[\n        ${items.join(",\n        ")},\n      ]`
}

function dragConfigToCode(drag: DragConfigLiteral): string {
    let code = `{ startX: ${drag.startX}, startY: ${drag.startY}, endX: ${drag.endX}, endY: ${drag.endY}, direction: ${drag.direction}, beltName: "${drag.beltName}"`
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
        const beforeData = worldToEntityData(entities.before.getEntities())
        const afterData = worldToEntityData(entities.after.getEntities())

        let reverseBeforeData: EntityDataLiteral[] | undefined
        let reverseAfterData: EntityDataLiteral[] | undefined
        if (!notReversible) {
            const flippedBefore = entities.before.flipAllEntities()
            const flippedAfter = (
                afterForReverse || entities.after
            ).flipAllEntities()
            reverseBeforeData = worldToEntityData(flippedBefore.getEntities())
            reverseAfterData = worldToEntityData(flippedAfter.getEntities())
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
                    `      ${entityDataToCode(bd)},\n` +
                    `      ${entityDataToCode(ad)},\n` +
                    `      ${dragConfigToCode(dragData)},\n` +
                    `    )\n` +
                    `  })`,
            )
        }
    }

    if (tests.length === 0) return undefined

    return (
        `import { runDragTest } from "../test_helpers"\n\n` +
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
