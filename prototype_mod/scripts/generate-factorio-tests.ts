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
import {
  parseTestCase,
  parseWorld,
  type DragTestCase,
} from "../ts-only/test_case"

import type { SmartBeltBuildMode } from "../mod-scripts/build_mode"

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
  buildMode?: SmartBeltBuildMode
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
      tier: BELT_TIERS.findIndex((t) => t.splitterName === collider.name) + 1,
    }
  }
  if (collider instanceof LoaderLike) {
    return {
      kind: "loader",
      direction: collider.direction,
      tier:
        BELT_TIERS.findIndex((t) => collider.name === t.beltName + "-loader") +
        1,
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

function entitiesToJson(entities: EntityWithPos[]): string {
  if (entities.length === 0) return "[]"
  const items = entities.map((e) => JSON.stringify([e.pos, e.entity]))
  return `[\n        ${items.join(",\n        ")},\n      ]`
}

function generateTestFile(
  fileStem: string,
  testCases: TestCaseYaml[],
): string | undefined {
  const tests: string[] = []

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i]!
    const testName = testCase.name || `test_${String(i + 1).padStart(3, "0")}`
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
      const flippedAfter = (afterForReverse || entities.after).flipAllEntities()
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
          `      ${entitiesToJson(bd)},\n` +
          `      ${entitiesToJson(ad)},\n` +
          `      ${JSON.stringify(dragData)},\n` +
          `      ${JSON.stringify(expectedErrors)},\n` +
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

interface ModOnlyTestCaseYaml {
  name?: string
  before: string
  after: string
  build_mode?: SmartBeltBuildMode
  expected_errors?: string[]
  not_reversible?: boolean
}

function isBeltLikeEntity(
  entity: TestEntity,
): entity is Extract<TestEntity, { direction: Direction }> {
  return (
    entity.kind !== "obstacle" &&
    entity.kind !== "impassable" &&
    entity.kind !== "tree"
  )
}

function generateModOnlyTestFile(
  fileStem: string,
  testCases: ModOnlyTestCaseYaml[],
): string | undefined {
  const tests: string[] = []

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i]!
    const testName = testCase.name || `test_${String(i + 1).padStart(3, "0")}`
    const sanitizedName = sanitizeTestName(testName)
    const buildMode = testCase.build_mode ?? "real"

    let beforeEntities: [TilePosition, TestEntity][]
    let afterEntities: [TilePosition, TestEntity][]
    let afterMarkers: TilePosition[]
    let beforeMarkers: TilePosition[]
    try {
      const beforeResult = parseWorld(testCase.before)
      const afterResult = parseWorld(testCase.after)
      beforeEntities = beforeResult.entities
      afterEntities = afterResult.entities
      afterMarkers = afterResult.markers
      beforeMarkers = beforeResult.markers
    } catch (e) {
      console.warn(`  Skipping mod-only test "${testName}": ${e}`)
      continue
    }

    const expectedErrorsList = testCase.expected_errors || []
    const expectedErrors: string[] = []
    for (
      let j = 0;
      j < afterMarkers.length && j < expectedErrorsList.length;
      j++
    ) {
      const pos = afterMarkers[j]!
      expectedErrors.push(`${pos.x},${pos.y}:${expectedErrorsList[j]}`)
    }

    let startPos: TilePosition
    if (beforeMarkers.length > 0) {
      startPos = beforeMarkers[0]!
    } else {
      const firstAtX0 = afterEntities.find(([p]) => p.x === 0)
      if (!firstAtX0) {
        console.warn(
          `  Skipping mod-only test "${testName}": no start position`,
        )
        continue
      }
      startPos = firstAtX0[0]
    }

    const firstBelt = afterEntities
      .filter(([p]) => p.y === startPos.y && p.x >= startPos.x)
      .sort((a, b) => a[0].x - b[0].x)
      .find(([, ent]) => isBeltLikeEntity(ent))

    if (!firstBelt) {
      console.warn(
        `  Skipping mod-only test "${testName}": no belt in drag row`,
      )
      continue
    }

    const firstBeltEntity = firstBelt[1] as Extract<
      TestEntity,
      { direction: Direction }
    >
    const tier = BELT_TIERS[firstBeltEntity.tier - 1]!
    const direction = firstBeltEntity.direction

    const allPositions = [...beforeEntities, ...afterEntities].map(([p]) => p.x)
    const maxX = Math.max(...allPositions)

    const beforeData = beforeEntities.map(([pos, entity]) => ({ pos, entity }))
    const afterData = afterEntities.map(([pos, entity]) => ({ pos, entity }))

    const dragData: DragConfigLiteral = {
      startX: startPos.x,
      startY: startPos.y,
      endX: maxX,
      endY: startPos.y,
      direction,
      beltName: tier.beltName,
      buildMode,
    }

    tests.push(
      `  test("${sanitizedName}", () => {\n` +
        `    runDragTest(\n` +
        `      ${entitiesToJson(beforeData)},\n` +
        `      ${entitiesToJson(afterData)},\n` +
        `      ${JSON.stringify(dragData)},\n` +
        `      ${JSON.stringify(expectedErrors)},\n` +
        `    )\n` +
        `  })`,
    )

    if (!testCase.not_reversible) {
      const reverseDragData: DragConfigLiteral = {
        ...dragData,
        direction: oppositeDirection(direction),
      }
      const reverseBeforeData = beforeData.map((e) => ({
        pos: e.pos,
        entity: flipEntityDirection(e.entity),
      }))
      const reverseAfterData = afterData.map((e) => ({
        pos: e.pos,
        entity: flipEntityDirection(e.entity),
      }))
      tests.push(
        `  test("${sanitizedName}_reverse", () => {\n` +
          `    runDragTest(\n` +
          `      ${entitiesToJson(reverseBeforeData)},\n` +
          `      ${entitiesToJson(reverseAfterData)},\n` +
          `      ${JSON.stringify(reverseDragData)},\n` +
          `      ${JSON.stringify(expectedErrors)},\n` +
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

function flipEntityDirection(entity: TestEntity): TestEntity {
  if ("direction" in entity) {
    return {
      ...entity,
      direction: oppositeDirection(entity.direction as Direction),
    }
  }
  return entity
}

function generateTestList(moduleNames: string[]): string {
  return JSON.stringify(
    moduleNames.map((name) => `mod-tests.generated.${name}`),
    null,
    2,
  )
}

function main() {
  const testSuiteDir = join(import.meta.dir, "..", "..", "test_suite")
  const modOnlyDir = join(testSuiteDir, "mod_only")
  const generatedDir = join(import.meta.dir, "..", "mod-tests", "generated")

  console.log(`Reading test suite from: ${testSuiteDir}`)
  console.log(`Generating factorio tests to: ${generatedDir}`)

  if (!existsSync(generatedDir)) {
    mkdirSync(generatedDir, { recursive: true })
  }

  const yamlFiles = readdirSync(testSuiteDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".yaml"))
    .map((entry) => entry.name)

  console.log(`Found ${yamlFiles.length} shared test files`)

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

  if (existsSync(modOnlyDir)) {
    const modOnlyFiles = readdirSync(modOnlyDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".yaml"))
      .map((entry) => entry.name)

    if (modOnlyFiles.length > 0) {
      console.log(`Found ${modOnlyFiles.length} mod-only test files`)

      for (const yamlFile of modOnlyFiles) {
        const content = readFileSync(join(modOnlyDir, yamlFile), "utf-8")
        const testCases = loadTestCasesFromYaml(
          content,
        ) as ModOnlyTestCaseYaml[]
        const fileStem = "mod_only_" + yamlFile.replace(/\.yaml$/, "")

        const code = generateModOnlyTestFile(fileStem, testCases)
        if (!code) {
          console.log(`  mod_only/${yamlFile} -> (no valid tests)`)
          continue
        }

        const testFileName = `${fileStem}.ts`
        writeFileSync(join(generatedDir, testFileName), code)
        moduleNames.push(fileStem)

        const testCount = (code.match(/\btest\(/g) || []).length
        totalTests += testCount
        console.log(
          `  mod_only/${yamlFile} -> ${testFileName} (${testCount} tests)`,
        )
      }
    }
  }

  const testListJson = generateTestList(moduleNames)
  writeFileSync(join(generatedDir, "test_list.json"), testListJson)

  console.log(
    `\nGenerated ${totalTests} tests across ${moduleNames.length} files`,
  )
}

main()
