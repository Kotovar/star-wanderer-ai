import { WEAPON_TYPES } from "@/game/constants/weapons";
import type { Module } from "@/game/types";

export const FRONTIER_CONTRACT_TARGET = 2;
export const FRONTIER_WEAPON_BAY_DISCOUNT = 200;
export const FRONTIER_WEAPON_DISCOUNT = 300;

export type ContractGenerationContext = {
  canOfferCombat: boolean;
  allowFrontier: boolean;
  sourceReputation?: number;
};

export const hasCombatArmament = (modules: Module[]): boolean =>
  modules.some(
    (module) =>
      module.type === "weaponbay" &&
      module.weapons?.some((weapon) => weapon && WEAPON_TYPES[weapon.type]) &&
      !module.disabled &&
      !module.manualDisabled &&
      module.health > 0,
  );
