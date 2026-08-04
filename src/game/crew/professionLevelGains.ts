import { COMBAT_ACCURACY_MODIFIERS } from "@/game/constants/combat";
import { CREW_ASSIGNMENT_BONUSES } from "@/game/constants/crew";
import { PILOT_LEVEL_RETREAT_BONUS } from "@/game/slices/combat/helpers/retreat";
import { ASSIGNMENT_BASES } from "@/game/slices/gameLoop/processors/crewAssignments/constants";
import type { Profession } from "@/game/types";

/**
 * Что именно растёт у профессии с уровнем: значение соответствующего стата на
 * заданном уровне. Формулы дублируют боевые/назначенческие расчёты — при их
 * изменении правится и здесь (сверяется в scripts/check-profession-levels.mjs).
 */
const PROFESSION_LEVEL_GAINS: Record<
    Profession,
    { key: string; at: (level: number) => number }[]
> = {
    pilot: [
        { key: "evasion", at: (l) => l * CREW_ASSIGNMENT_BONUSES.EVASION },
        { key: "retreat", at: (l) => l * PILOT_LEVEL_RETREAT_BONUS },
    ],
    engineer: [
        { key: "repair", at: (l) => ASSIGNMENT_BASES.REPAIR_AMOUNT + l - 1 },
        { key: "reactor_power", at: (l) => ASSIGNMENT_BASES.POWER_BONUS + l - 1 },
    ],
    medic: [
        { key: "heal", at: (l) => ASSIGNMENT_BASES.HEAL_AMOUNT + l - 1 },
        { key: "morale", at: (l) => ASSIGNMENT_BASES.MORALE_AMOUNT + l - 1 },
    ],
    gunner: [
        {
            key: "accuracy",
            at: (l) =>
                Math.round(
                    Math.min(
                        COMBAT_ACCURACY_MODIFIERS.GUNNER_LEVEL_MAX_BONUS,
                        l * COMBAT_ACCURACY_MODIFIERS.GUNNER_LEVEL_BONUS,
                    ) * 100,
                ),
        },
    ],
    scout: [
        {
            key: "patrol_credits",
            at: (l) =>
                Math.max(0, l - 1) * ASSIGNMENT_BASES.PATROL_CREDITS_PER_LEVEL,
        },
    ],
    scientist: [{ key: "anomaly_level", at: (l) => l }],
};

export interface ProfessionLevelGain {
    /** Суффикс ключа локализации crew_level_up.gains.* */
    key: string;
    from: number;
    to: number;
}

/** Профессиональные прибавки за переход oldLevel → newLevel (только выросшие). */
export function getProfessionLevelGains(
    profession: Profession,
    oldLevel: number,
    newLevel: number,
): ProfessionLevelGain[] {
    return PROFESSION_LEVEL_GAINS[profession]
        .map(({ key, at }) => ({ key, from: at(oldLevel), to: at(newLevel) }))
        .filter((gain) => gain.to > gain.from);
}
