import type { RaySense } from "./RaySense"

export type Action =
  | { type: "PlaceBelt" }
  | { type: "CreateUnderground"; inputPos: number; outputPos: number }
  | { type: "ExtendUnderground"; lastOutputPos: number; newOutputPos: number }
  | { type: "IntegrateInputUnderground"; outputPos: number }
  | { type: "IntegrateOutputUnderground" }
  | { type: "IntegrateSplitter" }
  | { type: "SetImpassable"; raySense: RaySense }
  | { type: "ClearEntity" }
  | { type: "None" }

export const enum ActionError {
  TooFarToConnect = "too_far_to_connect",
  EntityInTheWay = "entity_in_the_way",
  CannotUpgradeUnderground = "cannot_upgrade_underground",
  BeltLineBroken = "belt_line_broken",
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

  IntegrateInputUnderground: (outputPos: number): Action => ({
    type: "IntegrateInputUnderground",
    outputPos,
  }),

  IntegrateOutputUnderground: (): Action => ({
    type: "IntegrateOutputUnderground",
  }),

  IntegrateSplitter: (): Action => ({ type: "IntegrateSplitter" }),

  SetImpassable: (raySense: RaySense): Action => ({
    type: "SetImpassable",
    raySense,
  }),

  ClearEntity: (): Action => ({ type: "ClearEntity" }),

  None: (): Action => ({ type: "None" }),

  isPlacement(action: Action): boolean {
    switch (action.type) {
      case "PlaceBelt":
      case "CreateUnderground":
      case "ExtendUnderground":
      case "IntegrateInputUnderground":
      case "IntegrateSplitter":
        return true
      default:
        return false
    }
  },
}
