/**
 * Shared utilities for test case generation and execution.
 */

import * as yaml from "js-yaml"

export interface TestCaseFlags {
  not_reversible?: boolean
  forward_back?: boolean
}

export interface TestCaseYaml {
  name?: string
  not_reversible?: boolean
  forward_back?: boolean
  [key: string]: unknown
}

export function sanitizeTestName(name: string): string {
  return name
    .toLowerCase()
    .split("")
    .reduce((acc, c) => {
      if ((c >= "a" && c <= "z") || (c >= "0" && c <= "9")) {
        acc.push(c)
      } else if (acc.length > 0 && acc[acc.length - 1] !== "_") {
        acc.push("_")
      }
      return acc
    }, [] as string[])
    .join("")
    .replace(/_+$/, "")
}

export interface TestVariant {
  suffix: string
  reverse: boolean
  wiggle: boolean
}

export function getTestVariants(flags: TestCaseFlags): TestVariant[] {
  const variants: TestVariant[] = [{ suffix: "", reverse: false, wiggle: false }]

  if (!flags.not_reversible) {
    variants.push({ suffix: "_reverse", reverse: true, wiggle: false })
  }
  if (!flags.forward_back) {
    variants.push({ suffix: "_wiggle", reverse: false, wiggle: true })
    if (!flags.not_reversible) {
      variants.push({ suffix: "_wiggle_reverse", reverse: true, wiggle: true })
    }
  }

  return variants
}

export function loadTestCasesFromYaml(content: string): TestCaseYaml[] {
  return yaml.load(content) as TestCaseYaml[]
}
