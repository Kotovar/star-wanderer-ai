import type { StarTypeEffect } from "./starEffects";

export interface StarEffectDisplay {
    key: string;
    params: Record<string, string | number>;
}

/**
 * Ровно одно поле StarTypeEffect непустое на каждый из 10 типов звёзд с
 * эффектом (см. STAR_TYPE_EFFECTS) — порядок проверок здесь не имеет
 * значения для приоритета, все ветки взаимоисключающие в реальных данных.
 */
export function getStarEffectDisplay(
    effect: StarTypeEffect,
): StarEffectDisplay | null {
    if (effect.happinessPerTurn) {
        const sign = effect.happinessPerTurn > 0 ? "+" : "";
        return {
            key: "star_info.effect_happiness",
            params: { value: `${sign}${effect.happinessPerTurn}` },
        };
    }
    if (effect.evasionBonus) {
        return {
            key: "star_info.effect_evasion",
            params: { value: effect.evasionBonus },
        };
    }
    if (effect.scanRangeBonus) {
        return {
            key: "star_info.effect_scan_bonus",
            params: { value: effect.scanRangeBonus },
        };
    }
    if (effect.scanRangeJitter) {
        return {
            key: "star_info.effect_scan_jitter",
            params: { value: effect.scanRangeJitter },
        };
    }
    if (effect.powerBonus) {
        return {
            key: "star_info.effect_power",
            params: { value: effect.powerBonus },
        };
    }
    if (effect.gasDiveYieldBonus) {
        return {
            key: "star_info.effect_gas_dive",
            params: { value: Math.round(effect.gasDiveYieldBonus * 100) },
        };
    }
    if (effect.salvageYieldBonus) {
        return {
            key: "star_info.effect_salvage",
            params: { value: Math.round(effect.salvageYieldBonus * 100) },
        };
    }
    if (effect.extraTravelEventWeight) {
        return { key: "star_info.effect_travel_event", params: {} };
    }
    if (effect.moduleDecayChance) {
        return {
            key: "star_info.effect_module_decay",
            params: { chance: Math.round(effect.moduleDecayChance * 100) },
        };
    }
    return null;
}
