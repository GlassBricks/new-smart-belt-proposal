import type { Direction } from "./geometry"
import { oppositeDirection } from "./geometry"

export interface BeltTier {
  readonly _symbol: symbol
  readonly undergroundDistance: number
}

function createBeltTier(name: string, undergroundDistance: number): BeltTier {
  return {
    _symbol: Symbol(name),
    undergroundDistance,
  }
}

export const YELLOW_BELT = createBeltTier("Yellow", 5)
export const RED_BELT = createBeltTier("Red", 7)
export const BLUE_BELT = createBeltTier("Blue", 9)
export const BELT_TIERS: readonly BeltTier[] = [
  YELLOW_BELT,
  RED_BELT,
  BLUE_BELT,
]

export abstract class BeltConnectable {
  abstract readonly entityType: string
  abstract readonly direction: Direction
  abstract readonly tier: BeltTier
  readonly isInput?: boolean

  abstract hasOutput(): boolean
  abstract hasBackwardsInput(): boolean

  equals(other: BeltConnectable): boolean {
    return (
      this.entityType == other.entityType &&
      this.direction == other.direction &&
      this.tier == other.tier &&
      this.isInput == other.isInput
    )
  }

  outputDirection(): Direction | undefined {
    return this.hasOutput() ? this.direction : undefined
  }

  hasOutputGoing(exitingDirection: Direction): boolean {
    return this.outputDirection() === exitingDirection
  }

  primaryInputDirection(): Direction | undefined {
    return this.hasBackwardsInput() ? this.direction : undefined
  }

  hasInputGoing(enteringDirection: Direction): boolean {
    return this.primaryInputDirection() === enteringDirection
  }
}

export class Belt extends BeltConnectable {
  readonly entityType = "Belt" as const

  constructor(
    readonly direction: Direction,
    readonly tier: BeltTier,
  ) {
    super()
  }

  hasOutput(): boolean {
    return true
  }

  hasBackwardsInput(): boolean {
    return true
  }
}

export class UndergroundBelt extends BeltConnectable {
  readonly entityType = "UndergroundBelt" as const

  constructor(
    readonly direction: Direction,
    readonly isInput: boolean,
    readonly tier: BeltTier,
  ) {
    super()
  }

  hasOutput(): boolean {
    return !this.isInput
  }

  hasBackwardsInput(): boolean {
    return this.isInput
  }

  flip(): UndergroundBelt {
    return new UndergroundBelt(
      oppositeDirection(this.direction),
      !this.isInput,
      this.tier,
    )
  }

  shapeDirection(): Direction {
    return this.isInput ? oppositeDirection(this.direction) : this.direction
  }
}

export class LoaderLike extends BeltConnectable {
  readonly entityType = "LoaderLike" as const

  constructor(
    readonly direction: Direction,
    readonly isInput: boolean,
    readonly tier: BeltTier,
  ) {
    super()
  }

  hasOutput(): boolean {
    return !this.isInput
  }

  hasBackwardsInput(): boolean {
    return this.isInput
  }

  shapeDirection(): Direction {
    return this.isInput ? oppositeDirection(this.direction) : this.direction
  }
}

export class Splitter extends BeltConnectable {
  readonly entityType = "Splitter" as const

  constructor(
    readonly direction: Direction,
    public tier: BeltTier,
  ) {
    super()
  }

  hasOutput(): boolean {
    return true
  }

  hasBackwardsInput(): boolean {
    return true
  }

  withTier(newTier: BeltTier): Splitter {
    return new Splitter(this.direction, newTier)
  }
}
