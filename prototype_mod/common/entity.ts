export abstract class Entity {
  abstract readonly entityType: string
}

export class Colliding extends Entity {
  readonly entityType = "Colliding" as const
}

export class Impassable extends Entity {
  readonly entityType = "Impassable" as const
}
