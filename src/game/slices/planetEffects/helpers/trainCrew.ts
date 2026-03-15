import type { GameStore, SetState } from "@/game/types";
import {
    BASE_CREW_HEALTH_PER_LEVEL,
    PLANET_SPECIALIZATIONS,
    RACES,
} from "@/game/constants";
import { playSound } from "@/sounds";

/**
 * Обучает члена экипажа (эффект человеческой академии)
 * Прогрессивная стоимость: 1→2 уровень = 500₢, 2→3 уровень = 1500₢
 *
 * @param crewMemberId - ID члена экипажа для обучения
 * @param set - Функция обновления состояния
 * @param get - Функция получения текущего состояния
 * @returns true если обучение успешно, false иначе
 */
export const trainCrewMember = (
    crewMemberId: number,
    set: SetState,
    get: () => GameStore,
): boolean => {
    const state = get();
    const crewMember = state.crew.find((c) => c.id === crewMemberId);

    if (!crewMember) {
        get().addLog("Член экипажа не найден!", "error");
        return false;
    }

    // Прогрессивная стоимость: уровень 1→2 = 500, 2→3 = 1500, макс. уровень 3
    const currentLevel = crewMember.level || 1;
    if (currentLevel >= 3) {
        get().addLog(
            "Максимальный уровень обучения в академии (ур.3)!",
            "error",
        );
        return false;
    }

    const cost =
        currentLevel === 1
            ? PLANET_SPECIALIZATIONS.human.cost
            : PLANET_SPECIALIZATIONS.human.cost * 3;
    if (state.credits < cost) {
        get().addLog(
            `Недостаточно кредитов для обучения! Нужно ${cost}₢`,
            "error",
        );
        return false;
    }

    // Расчёт прироста здоровья с учётом расы и черт
    const raceData = RACES[crewMember.race];
    let healthGain = BASE_CREW_HEALTH_PER_LEVEL;

    // Применяем штраф расы
    let raceHealthPenaltyPercent = 0;
    raceData?.specialTraits?.forEach((trait) => {
        if (trait.effects.healthPenalty) {
            raceHealthPenaltyPercent += Math.abs(
                Number(trait.effects.healthPenalty),
            );
        }
    });
    if (raceHealthPenaltyPercent > 0) {
        healthGain = Math.floor(healthGain * (1 - raceHealthPenaltyPercent));
    }

    // Применяем бонусы/штрафы черт
    crewMember.traits.forEach((trait) => {
        if (trait.effect.healthPenalty) {
            healthGain = Math.floor(
                healthGain * (1 - trait.effect.healthPenalty),
            );
        }
        if (trait.effect.healthBonus) {
            healthGain = Math.floor(
                healthGain * (1 + trait.effect.healthBonus),
            );
        }
    });

    // Добавляем фиксированный бонус расы
    const raceHealthBonus = raceData?.crewBonuses?.health ?? 0;
    healthGain += raceHealthBonus;

    const newMaxHealth = crewMember.maxHealth + healthGain;

    set((s) => ({
        credits: s.credits - cost,
        crew: s.crew.map((c) =>
            c.id === crewMemberId
                ? {
                      ...c,
                      level: c.level + 1,
                      exp: 0,
                      maxHealth: newMaxHealth,
                      health: newMaxHealth, // Полное лечение при повышении
                  }
                : c,
        ),
    }));

    get().addLog(
        `🎓 ${crewMember.name} повышен до уровня ${crewMember.level + 1}!`,
        "info",
    );
    playSound("success");

    return true;
};
