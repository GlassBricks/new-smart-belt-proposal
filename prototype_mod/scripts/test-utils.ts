import * as yaml from "js-yaml"
import { Direction, pos, type TilePosition } from "../common/geometry"

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
  variantType: "Normal" | "Wiggle" | "MegaWiggle" | "ForwardBack"
}

export function getTestVariants(flags: TestCaseFlags): TestVariant[] {
  const variants: TestVariant[] = []

  if (flags.forward_back) {
    variants.push({ suffix: "", reverse: false, variantType: "ForwardBack" })
    if (!flags.not_reversible) {
      variants.push({
        suffix: "_reverse",
        reverse: true,
        variantType: "ForwardBack",
      })
    }
  } else {
    variants.push({ suffix: "", reverse: false, variantType: "Normal" })
    if (!flags.not_reversible) {
      variants.push({
        suffix: "_reverse",
        reverse: true,
        variantType: "Normal",
      })
    }
    variants.push({ suffix: "_wiggle", reverse: false, variantType: "Wiggle" })
    variants.push({
      suffix: "_mega_wiggle",
      reverse: false,
      variantType: "MegaWiggle",
    })
    if (!flags.not_reversible) {
      variants.push({
        suffix: "_wiggle_reverse",
        reverse: true,
        variantType: "Wiggle",
      })
      variants.push({
        suffix: "_mega_wiggle_reverse",
        reverse: true,
        variantType: "MegaWiggle",
      })
    }
  }

  return variants
}

export function loadTestCasesFromYaml(content: string): TestCaseYaml[] {
  return yaml.load(content) as TestCaseYaml[]
}

export interface Transform {
  readonly flipX: boolean
  readonly flipY: boolean
  readonly swapXY: boolean
}

export function createTransform(
  flipX: boolean,
  flipY: boolean,
  swapXY: boolean,
): Transform {
  return { flipX, flipY, swapXY }
}

export function transformPosition(
  transform: Transform,
  position: TilePosition,
): TilePosition {
  let result = position

  if (transform.swapXY) {
    result = pos(result.y, result.x)
  }

  if (transform.flipX) {
    result = pos(-result.x, result.y)
  }

  if (transform.flipY) {
    result = pos(result.x, -result.y)
  }

  return result
}

export function transformDirection(
  transform: Transform,
  dir: Direction,
): Direction {
  let ordinal = dir as number

  if (transform.swapXY) {
    ordinal = [3, 2, 1, 0][ordinal]!
  }

  if (transform.flipX) {
    ordinal = [0, 3, 2, 1][ordinal]!
  }

  if (transform.flipY) {
    ordinal = [2, 1, 0, 3][ordinal]!
  }

  return ordinal as Direction
}

export function allUniqueTransforms(): Transform[] {
  return [
    createTransform(false, false, false),
    createTransform(true, false, true),
    createTransform(true, true, false),
    createTransform(false, true, true),
    createTransform(true, false, false),
    createTransform(true, true, true),
    createTransform(false, true, false),
    createTransform(false, false, true),
  ]
}

export function positionToKey(pos: TilePosition): string {
  return `${pos.x},${pos.y}`
}

export function keyToPosition(key: string): TilePosition {
  const parts = key.split(",")
  return pos(Number(parts[0]), Number(parts[1]))
}
