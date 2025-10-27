#!/usr/bin/env bun

/**
 * Generate a Factorio blueprint string containing all test cases.
 * Each test case is displayed with before/after states in a grid layout.
 */

import {
  encodePlan,
  type Blueprint,
} from "@jensforstmann/factorio-blueprint-tools"
import { readdirSync, readFileSync, writeFileSync } from "fs"
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
import { Direction, type TilePosition } from "../common/geometry"
import { BELT_TIERS } from "../ts-only/belt_tiers"
import { SimulatedWorld } from "../ts-only/simulated_world"
import { loadTestCasesFromYaml } from "../ts-only/test-utils"
import { flipTestCase, parseTestCase } from "../ts-only/test_case"

// Grid configuration
const TESTS_PER_ROW = 8
const GRID_SPACING = 4
const SECTION_GAP = 2 // Gap between before/after sections within a test

interface BlueprintEntity {
  entity_number: number
  name: string
  position: { x: number; y: number }
  direction?: number
  type?: "input" | "output"
}

interface TestSection {
  world: SimulatedWorld
  label: string
}

interface LayoutTestCase {
  name: string
  sections: TestSection[]
}

// Map Direction enum to Factorio blueprint direction values
function mapDirection(dir: Direction): number {
  switch (dir) {
    case Direction.North:
      return 0
    case Direction.East:
      return 4
    case Direction.South:
      return 8
    case Direction.West:
      return 12
  }
}

// Convert test entity to blueprint entity
function convertEntity(
  entity: BeltCollider,
  position: TilePosition,
  entityNumber: number,
): BlueprintEntity | null {
  let x = position.x + 0.5
  let y = position.y + 0.5

  if (entity instanceof Belt) {
    return {
      entity_number: entityNumber,
      name: entity.tier.beltName,
      position: { x, y },
      direction: mapDirection(entity.direction),
    }
  } else if (entity instanceof UndergroundBelt) {
    return {
      entity_number: entityNumber,
      name: entity.tier.undergroundName,
      position: { x, y },
      direction: mapDirection(entity.direction),
      type: entity.isInput ? "input" : "output",
    }
  } else if (entity instanceof Splitter) {
    if (
      entity.direction === Direction.East ||
      entity.direction === Direction.West
    ) {
      // Splitters are 1x2 vertically, shift Y by -0.5
      y -= 0.5
    } else {
      // splitters are horizontal, shift X by +0.5
      x += 0.5
    }
    const tier =
      BELT_TIERS.find((t) => t.splitterName === entity.name) || BELT_TIERS[0]!
    return {
      entity_number: entityNumber,
      name: tier.splitterName || "splitter",
      position: { x, y },
      direction: mapDirection(entity.direction),
    }
  } else if (entity instanceof LoaderLike) {
    // Extract tier from loader name
    const tier =
      BELT_TIERS.find((t) => entity.name.startsWith(t.beltName)) ||
      BELT_TIERS[0]!
    return {
      entity_number: entityNumber,
      name: "linked-belt",
      position: { x, y },
      direction: mapDirection(entity.direction),
      type: entity.isInput ? "input" : "output",
    }
  } else if (entity instanceof CollidingEntityOrTile) {
    return {
      entity_number: entityNumber,
      name: "iron-chest",
      position: { x, y },
    }
  } else if (entity instanceof ImpassableTile) {
    return {
      entity_number: entityNumber,
      name: "steel-chest",
      position: { x, y },
    }
  }

  return null
}

// Load test cases from YAML files
function loadTestCases(fileFilter?: string[]): Map<string, LayoutTestCase[]> {
  const testSuiteDir = join(import.meta.dir, "..", "..", "test_suite")
  const entries = readdirSync(testSuiteDir, { withFileTypes: true })
  let yamlFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".yaml"))
    .map((entry) => entry.name)
    .sort()

  // Apply filter if provided
  if (fileFilter && fileFilter.length > 0) {
    yamlFiles = yamlFiles.filter((file) => {
      const baseName = file.replace(".yaml", "")
      return fileFilter.some(
        (filter) =>
          file === filter || file === `${filter}.yaml` || baseName === filter,
      )
    })
  }

  const testsByFile = new Map<string, LayoutTestCase[]>()

  for (const yamlFile of yamlFiles) {
    const filePath = join(testSuiteDir, yamlFile)
    const content = readFileSync(filePath, "utf-8")
    const testCases = loadTestCasesFromYaml(content)

    const layoutTests: LayoutTestCase[] = []

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i]!
      const name = testCase.name || `${yamlFile}_${i + 1}`

      // Convert single test case object to YAML string for parseTestCase
      const yaml = require("js-yaml")
      const singleTestYaml = yaml.dump(testCase)
      const parsedTest = parseTestCase(singleTestYaml)
      const sections: TestSection[] = []

      // Add before and after sections
      sections.push({
        world: parsedTest.entities.before,
        label: `${name} - Before`,
      })
      sections.push({
        world: parsedTest.entities.after,
        label: `${name} - After`,
      })

      // Add reverse sections if reversible
      if (!parsedTest.notReversible) {
        const reversed = flipTestCase(
          parsedTest.entities,
          parsedTest.afterForReverse,
        )
        sections.push({
          world: reversed.before,
          label: `${name} - Reverse Before`,
        })
        sections.push({
          world: reversed.after,
          label: `${name} - Reverse After`,
        })
      }

      layoutTests.push({ name, sections })
    }

    testsByFile.set(yamlFile, layoutTests)
  }

  return testsByFile
}

// Load all test cases from all YAML files
function loadAllTestCases(): LayoutTestCase[] {
  const testsByFile = loadTestCases()
  const allTests: LayoutTestCase[] = []
  for (const tests of testsByFile.values()) {
    allTests.push(...tests)
  }
  return allTests
}

// Calculate bounding box for a world
function getWorldBounds(world: SimulatedWorld): {
  minX: number
  maxX: number
  minY: number
  maxY: number
} {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const [pos] of world.getEntities()) {
    minX = Math.min(minX, pos.x)
    maxX = Math.max(maxX, pos.x)
    minY = Math.min(minY, pos.y)
    maxY = Math.max(maxY, pos.y)
  }

  return {
    minX: isFinite(minX) ? minX : 0,
    maxX: isFinite(maxX) ? maxX : 0,
    minY: isFinite(minY) ? minY : 0,
    maxY: isFinite(maxY) ? maxY : 0,
  }
}

// Calculate max width for each test case
function getTestWidth(test: LayoutTestCase): number {
  let maxWidth = 0
  for (const section of test.sections) {
    const bounds = getWorldBounds(section.world)
    const width = bounds.maxX - bounds.minX + 1
    maxWidth = Math.max(maxWidth, width)
  }
  return maxWidth
}

// Generate blueprint
function generateBlueprint(tests: LayoutTestCase[]): string {
  const entities: BlueprintEntity[] = []
  let entityNumber = 1

  // Pre-calculate max width for each column
  const columnWidths: number[] = []
  for (let col = 0; col < TESTS_PER_ROW; col++) {
    let maxWidth = 0
    for (let row = 0; row * TESTS_PER_ROW + col < tests.length; row++) {
      const testIndex = row * TESTS_PER_ROW + col
      if (testIndex < tests.length) {
        const test = tests[testIndex]!
        maxWidth = Math.max(maxWidth, getTestWidth(test))
      }
    }
    columnWidths[col] = maxWidth
  }

  for (let testIndex = 0; testIndex < tests.length; testIndex++) {
    const test = tests[testIndex]!
    const rowIndex = Math.floor(testIndex / TESTS_PER_ROW)
    const colIndex = testIndex % TESTS_PER_ROW

    // Calculate starting X position based on accumulated column widths + spacing
    let baseX = 0
    for (let c = 0; c < colIndex; c++) {
      baseX += columnWidths[c]! + GRID_SPACING
    }

    // Calculate Y position - accumulate height from all previous rows
    let baseY = 0
    if (testIndex >= TESTS_PER_ROW) {
      // For rows after the first, calculate height of all previous complete rows
      const testsInPreviousRows = Math.floor(testIndex / TESTS_PER_ROW)
      for (let prevRow = 0; prevRow < testsInPreviousRows; prevRow++) {
        let maxHeightInRow = 0
        const startTestIdx = prevRow * TESTS_PER_ROW
        const endTestIdx = Math.min(startTestIdx + TESTS_PER_ROW, tests.length)

        for (let ti = startTestIdx; ti < endTestIdx; ti++) {
          const prevTest = tests[ti]!
          let testHeight = 0
          for (let si = 0; si < prevTest.sections.length; si++) {
            const section = prevTest.sections[si]!
            const bounds = getWorldBounds(section.world)
            const sectionHeight = bounds.maxY - bounds.minY + 1
            testHeight += sectionHeight
            if (si < prevTest.sections.length - 1) {
              testHeight += SECTION_GAP
            }
          }
          maxHeightInRow = Math.max(maxHeightInRow, testHeight)
        }
        baseY += maxHeightInRow + GRID_SPACING
      }
    }

    let localY = baseY

    // Calculate unified bounding box for all sections in this test
    let unifiedMinX = Infinity
    let unifiedMaxX = -Infinity
    for (const section of test.sections) {
      const bounds = getWorldBounds(section.world)
      unifiedMinX = Math.min(unifiedMinX, bounds.minX)
      unifiedMaxX = Math.max(unifiedMaxX, bounds.maxX)
    }
    if (!isFinite(unifiedMinX)) unifiedMinX = 0
    if (!isFinite(unifiedMaxX)) unifiedMaxX = 0

    // Process each section of the test
    for (
      let sectionIndex = 0;
      sectionIndex < test.sections.length;
      sectionIndex++
    ) {
      const section = test.sections[sectionIndex]!
      const bounds = getWorldBounds(section.world)

      // Convert entities in this section using unified X bounds
      for (const [pos, entity] of section.world.getEntities()) {
        const adjustedX = baseX + (pos.x - unifiedMinX)
        const adjustedY = localY + (pos.y - bounds.minY)

        const bpEntity = convertEntity(
          entity,
          { x: adjustedX, y: adjustedY },
          entityNumber,
        )
        if (bpEntity) {
          entities.push(bpEntity)
          entityNumber++
        }
      }

      // Move to next section
      const sectionHeight = bounds.maxY - bounds.minY + 1
      localY += sectionHeight + SECTION_GAP
    }
  }

  const blueprint: Blueprint = {
    blueprint: {
      item: "blueprint",
      label: "Smart Belt Test Cases",
      description: `Generated test cases: ${tests.length} tests with ${entities.length} entities`,
      icons: [
        {
          signal: {
            type: "item",
            name: "transport-belt",
          },
          index: 1,
        },
      ],
      entities: entities,
      version: 562949954076673, // Factorio 2.0
    },
  }

  return encodePlan(blueprint)
}

// Main
async function main() {
  const args = process.argv.slice(2)
  const separateFiles = args.includes("--separate")
  const fileFilter = args.filter((arg) => !arg.startsWith("--"))

  if (separateFiles) {
    // Generate one blueprint per YAML file
    console.log("Loading test cases...")
    const testsByFile = loadTestCases(
      fileFilter.length > 0 ? fileFilter : undefined,
    )
    console.log(`Loaded ${testsByFile.size} YAML files`)

    const outputDir = join(import.meta.dir, "..", "blueprints")
    try {
      const { mkdirSync } = require("fs")
      mkdirSync(outputDir, { recursive: true })
    } catch {}

    for (const [yamlFile, tests] of testsByFile) {
      console.log(`\nGenerating blueprint for ${yamlFile}...`)
      const blueprintString = generateBlueprint(tests)

      const outputFileName = yamlFile.replace(".yaml", ".txt")
      const outputPath = join(outputDir, outputFileName)
      writeFileSync(outputPath, blueprintString)

      console.log(`  ✓ Saved to: ${outputPath}`)
      console.log(
        `  ${tests.length} test cases, ${blueprintString.length} characters`,
      )
    }

    console.log("\n" + "=".repeat(80))
    console.log(`All blueprints saved to: ${outputDir}`)
    console.log("=".repeat(80))
  } else {
    // Generate single blueprint with all test cases
    console.log("Loading test cases...")
    const testsByFile = loadTestCases(
      fileFilter.length > 0 ? fileFilter : undefined,
    )
    const allTests: LayoutTestCase[] = []
    for (const tests of testsByFile.values()) {
      allTests.push(...tests)
    }
    console.log(`Loaded ${allTests.length} test cases`)

    if (allTests.length === 0) {
      console.log("No test cases found!")
      if (fileFilter.length > 0) {
        console.log(`Filter: ${fileFilter.join(", ")}`)
      }
      return
    }

    console.log("Generating blueprint...")
    const blueprintString = generateBlueprint(allTests)

    // Write to file
    const outputPath = join(import.meta.dir, "..", "blueprint.txt")
    writeFileSync(outputPath, blueprintString)

    console.log("\n" + "=".repeat(80))
    console.log(`Blueprint saved to: ${outputPath}`)
    console.log("=".repeat(80))
    console.log(`\nGenerated blueprint with ${allTests.length} test cases.`)
    console.log(`Blueprint string length: ${blueprintString.length} characters`)
  }
}

main()
