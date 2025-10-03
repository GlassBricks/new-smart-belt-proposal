import type { Direction } from "./geometry"
import { oppositeDirection } from "./geometry"

// Only for the purposes of belt interaction.
export interface Entity {
  readonly type: string
  readonly name: string
}

export class Colliding implements Entity {
  readonly type = "Colliding" as const
  constructor(readonly name: string) {}
}
export class Impassable implements Entity {
  readonly type = "Impassable" as const
  constructor(readonly name: string) {}
}

export interface BeltTier {
  readonly beltName: string
  readonly undergroundName: string
  readonly splitterName?: string
  readonly undergroundDistance: number
}

export abstract class BeltConnectable implements Entity {
  abstract readonly type: string
  abstract readonly name: string
  abstract readonly direction: Direction
  abstract readonly tier?: BeltTier
  readonly isInput?: boolean

  abstract hasOutput(): boolean
  abstract hasBackwardsInput(): boolean

  equals(other: BeltConnectable): boolean {
    return (
      this.type == other.type &&
      this.direction == other.direction &&
      this.name === other.name &&
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
}

export class Belt extends BeltConnectable {
  readonly type = "Belt" as const
  name: string

  constructor(
    readonly direction: Direction,
    readonly tier: BeltTier,
  ) {
    super()
    this.name = tier.beltName
  }

  hasOutput(): boolean {
    return true
  }

  hasBackwardsInput(): boolean {
    return true
  }
}

export class UndergroundBelt extends BeltConnectable {
  readonly type = "UndergroundBelt" as const
  name: string

  constructor(
    readonly direction: Direction,
    override readonly isInput: boolean,
    readonly tier: BeltTier,
  ) {
    super()
    this.name = tier.beltName
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
  readonly type = "LoaderLike" as const
  readonly tier = undefined

  constructor(
    readonly direction: Direction,
    override readonly isInput: boolean,
    readonly name: string,
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
  readonly type = "Splitter" as const
  readonly tier = undefined

  constructor(
    readonly direction: Direction,
    readonly name: string,
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
