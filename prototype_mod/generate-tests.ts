#!/usr/bin/env bun

/**
 * Generate Bun test files from YAML test suite.
 * Reads all *.yaml files from ../test_suite/ and generates test files.
 */

import { readdirSync, readFileSync, writeFileSync } from "fs"
import * as yaml from "js-yaml"
import { join } from "path"
import {
  getTestVariants,
  loadTestCasesFromYaml,
  sanitizeTestName,
  type TestCaseYaml,
} from "./src/test-utils.js"

function generateTestFile(fileStem: string, testCases: TestCaseYaml[]): string {
  let code = `// Generated test file for ${fileStem}.yaml\n`
  code += `import { describe, test, expect } from "bun:test";\n`
  code += `import {\n`
  code += `  checkTestCaseAllTransforms,\n`
  code += `  parseTestCase,\n`
  code += `  type DragTestCase,\n`
  code += `} from "../test_case.js";\n\n`

  code += `describe("${fileStem}", () => {\n`

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i]!
    const testName = testCase.name || `test_${String(i + 1).padStart(3, "0")}`
    const sanitizedName = sanitizeTestName(testName)
    const yamlContent = yaml.dump(testCase)

    const flags = {
      not_reversible: testCase.not_reversible || false,
      forward_back: testCase.forward_back || false,
    }

    const variants = getTestVariants(flags)

    for (const variant of variants) {
      code += `\n  test("${sanitizedName}${variant.suffix}", () => {\n`
      code += `    const yamlContent = ${JSON.stringify(yamlContent)};\n`
      code += `    const testCase: DragTestCase = parseTestCase(yamlContent);\n`
      code += `    const error = checkTestCaseAllTransforms(testCase, ${variant.reverse}, ${variant.wiggle});\n`
      code += `    if (error !== undefined) {\n`
      code += `      throw new Error(error);\n`
      code += `    }\n`
      code += `  });\n`
    }
  }

  code += `});\n`

  return code
}

async function main() {
  const testSuiteDir = join(import.meta.dir, "..", "test_suite")
  const generatedDir = join(import.meta.dir, "src", "generated")

  console.log(`Reading test suite from: ${testSuiteDir}`)
  console.log(`Generating tests to: ${generatedDir}`)

  // Create generated directory if it doesn't exist
  try {
    readdirSync(generatedDir)
  } catch {
    console.log(`Creating directory: ${generatedDir}`)
    const { mkdirSync } = require("fs")
    mkdirSync(generatedDir, { recursive: true })
  }

  // Read all YAML files from test suite
  const entries = readdirSync(testSuiteDir, { withFileTypes: true })
  const yamlFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".yaml"))
    .map((entry) => entry.name)

  if (yamlFiles.length === 0) {
    console.log("No YAML test files found")
    return
  }

  console.log(`Found ${yamlFiles.length} test files`)

  let totalTests = 0

  for (const yamlFile of yamlFiles) {
    const filePath = join(testSuiteDir, yamlFile)
    const content = readFileSync(filePath, "utf-8")
    const testCases = loadTestCasesFromYaml(content)

    const fileStem = yamlFile.replace(/\.yaml$/, "")
    const testFileName = `${fileStem}.test.ts`
    const testFilePath = join(generatedDir, testFileName)

    console.log(`  ${yamlFile} -> ${testFileName} (${testCases.length} cases)`)

    const generatedCode = generateTestFile(fileStem, testCases)
    writeFileSync(testFilePath, generatedCode)

    totalTests += testCases.length
  }

  console.log(
    `\nGenerated ${totalTests} test cases across ${yamlFiles.length} files`,
  )
  console.log("Run tests with: bun test")
}

main()
