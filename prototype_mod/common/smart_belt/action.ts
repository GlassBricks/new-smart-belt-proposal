export type Action =
  | { type: "PlaceBelt" }
  | { type: "CreateUnderground"; inputPos: number; outputPos: number }
  | { type: "ExtendUnderground"; lastOutputPos: number; newOutputPos: number }
  | { type: "IntegrateUndergroundPair" }
  | { type: "IntegrateSplitter" }
  | { type: "None" }

export const enum ActionError {
  TooFarToConnect = "too_far_to_connect",
  EntityInTheWay = "entity_in_the_way",
  CannotUpgradeUnderground = "cannot_upgrade_underground",
  CannotTraversePastEntity = "cannot_traverse_past_entity",
  CannotTraversePastTile = "cannot_traverse_past_tile",
}

export const Action = {
  PlaceBelt: (): Action => ({ type: "PlaceBelt" }),

  CreateUnderground: (inputPos: number, outputPos: number): Action => ({
    type: "CreateUnderground",
    inputPos,
    outputPos,
  }),

  ExtendUnderground: (lastOutputPos: number, newOutputPos: number): Action => ({
    type: "ExtendUnderground",
    lastOutputPos,
    newOutputPos,
  }),

  IntegrateUndergroundPair: (): Action => ({
    type: "IntegrateUndergroundPair",
  }),

  IntegrateSplitter: (): Action => ({ type: "IntegrateSplitter" }),

  None: (): Action => ({ type: "None" }),
}
