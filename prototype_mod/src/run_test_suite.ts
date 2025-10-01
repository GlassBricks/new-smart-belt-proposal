#!/usr/bin/env bun

/**
 * Standalone test suite runner.
 * Reads all *.yaml files from ../test_suite/ and runs tests directly.
 */

import { readdirSync, readFileSync } from "fs"
import * as yaml from "js-yaml"
import { join } from "path"
import {
    getTestVariants,
    loadTestCasesFromYaml,
    sanitizeTestName,
    type TestCaseYaml,
} from "./test-utils.js"
import {
    checkTestCaseAllTransforms,
    parseTestCase,
    type DragTestCase,
} from "./test_case.js"

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

interface FileResults {
  fileName: string
  results: TestResult[]
}

function runTestCase(
  testCase: TestCaseYaml,
  index: number,
): TestResult[] {
  const testName = testCase.name || `test_${String(index + 1).padStart(3, "0")}`
  const sanitizedName = sanitizeTestName(testName)
  const yamlContent = yaml.dump(testCase)

  const flags = {
    not_reversible: testCase.not_reversible || false,
    forward_back: testCase.forward_back || false,
  }

  const variants = getTestVariants(flags)
  const results: TestResult[] = []

  const parsedTestCase: DragTestCase = parseTestCase(yamlContent)

  for (const variant of variants) {
    const fullTestName = `${sanitizedName}${variant.suffix}`

    try {
      const error = checkTestCaseAllTransforms(
        parsedTestCase,
        variant.reverse,
        variant.wiggle,
      )
      if (error !== undefined) {
        results.push({
          name: fullTestName,
          passed: false,
          error,
        })
      } else {
        results.push({
          name: fullTestName,
          passed: true,
        })
      }
    } catch (e) {
      results.push({
        name: fullTestName,
        passed: false,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return results
}

function runTestFile(filePath: string, fileName: string): FileResults {
  const content = readFileSync(filePath, "utf-8")
  const testCases = loadTestCasesFromYaml(content)

  const results: TestResult[] = []

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i]!
    const testResults = runTestCase(testCase, i)
    results.push(...testResults)
  }

  return {
    fileName,
    results,
  }
}

async function main() {
  const testSuiteDir = join(import.meta.dir, "..", "..", "test_suite")

  console.log(`Running test suite from: ${testSuiteDir}\n`)

  const entries = readdirSync(testSuiteDir, { withFileTypes: true })
  const yamlFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".yaml"))
    .map((entry) => entry.name)

  if (yamlFiles.length === 0) {
    console.log("No YAML test files found")
    return
  }

  const allResults: FileResults[] = []
  let totalTests = 0
  let passedTests = 0
  let failedTests = 0

  for (const yamlFile of yamlFiles) {
    const filePath = join(testSuiteDir, yamlFile)
    const fileResults = runTestFile(filePath, yamlFile)
    allResults.push(fileResults)

    const filePassed = fileResults.results.filter((r) => r.passed).length
    const fileFailed = fileResults.results.filter((r) => !r.passed).length

    totalTests += fileResults.results.length
    passedTests += filePassed
    failedTests += fileFailed

    const status = fileFailed === 0 ? "✓" : "✗"
    console.log(
      `${status} ${yamlFile}: ${filePassed}/${fileResults.results.length} passed`,
    )
  }

  console.log(`\n${"=".repeat(60)}`)
  console.log(`Total: ${passedTests}/${totalTests} passed`)

  if (failedTests > 0) {
    console.log(`\n${"=".repeat(60)}`)
    console.log("FAILURES:\n")

    for (const fileResult of allResults) {
      const failures = fileResult.results.filter((r) => !r.passed)
      if (failures.length === 0) continue

      console.log(`${fileResult.fileName}:`)
      for (const failure of failures) {
        console.log(`  ✗ ${failure.name}`)
        if (failure.error) {
          const errorLines = failure.error.split("\n")
          for (const line of errorLines) {
            console.log(`    ${line}`)
          }
        }
        console.log()
      }
    }

    process.exit(1)
  } else {
    console.log("\nAll tests passed! ✓")
    process.exit(0)
  }
}

main()
