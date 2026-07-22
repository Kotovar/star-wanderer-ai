import { XENOSYMBIONT_MERGE_EFFECTS } from "@/game/constants/races";
import { isModuleActive } from "@/game/modules/utils";
import type { CrewMember, Module } from "@/game/types";

/**
 * Суммарные бонусы от сращивания ксеноморфов
 */
export interface MergeEffectsBonus {
  shieldRegenBonus?: number;
  shieldCapacity?: number;
  repairBonus?: number;
  energyReduction?: number;
  powerOutput?: number;
  evasionBonus?: number;
  oxygenEfficiency?: number;
  crewHealthRegen?: number;
  cargoCapacity?: number;
  fuelEfficiency?: number;
  fuelCapacity?: number;
  scanRange?: number;
  researchSpeed?: number;
  weaponDamage?: number;
  weaponAccuracy?: number;
  healing?: number;
  miningSpeed?: number;
  resourceYield?: number;
  glitchResistance?: number;
  initiativeBonus?: number;
}

type EffectKey = keyof MergeEffectsBonus;

/**
 * Собирает все бонусы от сращивания ксеноморфов с модулями
 */
export const getMergeEffectsBonus = (
  crew: CrewMember[],
  modules: Module[],
): MergeEffectsBonus => {
  const bonus: MergeEffectsBonus = {};

  crew.forEach((crewMember) => {
    if (!crewMember.isMerged || crewMember.mergedModuleId === null) {
      return;
    }

    const moduleShip = modules.find(
      (m) => m.id === crewMember.mergedModuleId,
    );

    // Разбитый, обесточенный или выключенный модуль бонусов не даёт
    if (!moduleShip || !isModuleActive(moduleShip)) {
      return;
    }

    const mergeEffect = XENOSYMBIONT_MERGE_EFFECTS[moduleShip.type];

    if (!mergeEffect.effects) {
      return;
    }

    // Суммируем все эффекты
    Object.entries(mergeEffect.effects).forEach(([key, value]) => {
      if (value !== undefined) {
        bonus[key as EffectKey] =
          (bonus[key as EffectKey] ?? 0) + value;
      }
    });
  });

  return bonus;
};

