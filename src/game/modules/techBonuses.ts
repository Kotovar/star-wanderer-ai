import { RESEARCH_TREE } from "@/game/constants/research";
import { getTechBonusSum } from "@/game/research";
import type { Module } from "@/game/types";
import type { ResearchBonusType, ResearchData } from "@/game/types/research";

export type ModuleTechBonus = {
    type: ResearchBonusType;
    value: number;
};

const techBonusesByModule: Partial<
    Record<Module["type"], readonly ResearchBonusType[]>
> = {
    reactor: ["module_health", "module_power"],
    shield: ["module_health", "shield_strength", "shield_regen"],
    weaponbay: ["module_health", "weapon_damage", "weapon_slots"],
    scanner: ["module_health", "scan_range"],
    cargo: ["module_health", "cargo_capacity"],
    engine: ["module_health", "fuel_efficiency"],
    lab: ["module_health", "research_speed"],
    pulse_drive: ["module_health", "module_power", "fuel_efficiency"],
    bio_research_lab: ["module_health", "research_speed"],
    deep_survey_array: ["module_health", "research_speed"],
};

export const getModuleTechBonuses = (
    module: Module,
    research: Pick<ResearchData, "researchedTechs">,
): ModuleTechBonus[] =>
    (techBonusesByModule[module.type] ?? ["module_health"])
        .map((type) => ({ type, value: getTechBonusSum(research, type) }))
        .filter((bonus) => bonus.value > 0);

/** Определяет часть прочности, добавленную уже изученными технологиями. */
export const getModuleHealthTechDelta = (
    module: Module,
    research: Pick<ResearchData, "researchedTechs">,
): number | null => {
    let baseHealth = module.maxHealth;

    for (const techId of [...research.researchedTechs].reverse()) {
        const tech = RESEARCH_TREE[techId];
        for (const bonus of [...tech.bonuses].reverse()) {
            if (bonus.type === "module_health" && bonus.value > 0) {
                baseHealth = Math.ceil(baseHealth / (1 + bonus.value));
            }
        }
    }

    const delta = module.maxHealth - baseHealth;
    return delta > 0 ? delta : null;
};
