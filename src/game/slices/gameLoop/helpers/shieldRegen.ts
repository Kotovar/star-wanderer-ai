import { findActiveArtifact, getArtifactEffectValue } from "@/game/artifacts";
import { RACES } from "@/game/constants/races";
import { ARTIFACT_TYPES } from "@/game/constants";
import type { GameState, GameStore } from "@/game/types";

// === Constants ===
const BASE_SHIELD_REGEN_MIN = 5;
const BASE_SHIELD_REGEN_MAX = 10;

/**
 * Вычисляет базовую регенерацию щитов
 */
const getBaseShieldRegen = (): number =>
    Math.floor(
        Math.random() * (BASE_SHIELD_REGEN_MAX - BASE_SHIELD_REGEN_MIN + 1) +
            BASE_SHIELD_REGEN_MIN,
    );

/**
 * Собирает процентные бонусы регенерации от расовых traits
 * @returns множитель регенерации (например, 0.05 = +5%)
 */
const getRaceRegenMultiplier = (state: GameState): number => {
    let multiplier = 0;

    state.crew.forEach((c) => {
        const race = RACES[c.race];
        if (!race?.specialTraits) return;

        // Бонус от traits (например, void_shield: +5%)
        const shieldTrait = race.specialTraits.find(
            (t) => t.effects.shieldRegen,
        );
        if (shieldTrait?.effects.shieldRegen) {
            multiplier += Number(shieldTrait.effects.shieldRegen) / 100;
        }

        // Бонус от сращивания ксеноморфа с кораблём
        if (race.id === "xenosymbiont" && race.mergeEffects) {
            const totalMergeBonus = race.mergeEffects.reduce(
                (sum, effect) => sum + (effect.shieldRegenBonus ?? 0),
                0,
            );
            multiplier += totalMergeBonus / 100;
        }
    });

    return multiplier;
};

/**
 * Собирает бонусы от артефактов
 */
const getArtifactRegenBonus = (
    state: GameState,
): { multiplier: number; logs: string[] } => {
    const logs: string[] = [];
    let multiplier = 0;

    // Shield Regenerator: процентный бонус
    const shieldRegenerator = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.SHIELD_REGENERATOR,
    );

    if (shieldRegenerator) {
        const regenBoost = getArtifactEffectValue(shieldRegenerator, state);
        multiplier += regenBoost;
        logs.push(
            `⚡ Регенератор Щитов: +${Math.round(regenBoost * 100)}% к регенерации`,
        );
    }

    return { multiplier, logs };
};

/**
 * Регенерация щитов (только вне боя)
 */
export const regenerateShields = (
    state: GameState,
    get: () => GameStore,
    set: (fn: (s: GameState) => void) => void,
): void => {
    if (state.currentCombat) return;

    const oldShields = state.ship.shields;
    if (oldShields >= state.ship.maxShields) return;

    // Собираем все бонусы
    const baseRegen = getBaseShieldRegen();
    const raceMultiplier = getRaceRegenMultiplier(state);
    const { multiplier: artifactMultiplier, logs } =
        getArtifactRegenBonus(state);

    // Применяем процентные бонусы к базовой регенерации
    const totalMultiplier = 1 + raceMultiplier + artifactMultiplier;
    const totalRegen = Math.floor(baseRegen * totalMultiplier);

    // Применяем регенерацию
    set((s) => ({
        ship: {
            ...s.ship,
            shields: Math.min(s.ship.maxShields, s.ship.shields + totalRegen),
        },
    }));

    // Логируем
    if (totalRegen > 0) {
        get().addLog(
            `Щиты: +${totalRegen} (${get().ship.shields}/${get().ship.maxShields})`,
            "info",
        );
    }

    logs.forEach((log) => get().addLog(log, "info"));
};
