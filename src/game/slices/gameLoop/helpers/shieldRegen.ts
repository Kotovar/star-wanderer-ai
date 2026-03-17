import { findActiveArtifact, getArtifactEffectValue } from "@/game/artifacts";
import { ARTIFACT_TYPES, RACES } from "@/game/constants";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";
import type { GameState, GameStore, SetState } from "@/game/types";

/**
 * Вычисляет базовую регенерацию щитов как сумму shieldRegen всех активных модулей щитов
 */
const getBaseShieldRegen = (state: GameState): number =>
    state.ship.modules
        .filter((m) => m.type === "shield" && m.health > 0 && !m.disabled)
        .reduce((sum, m) => sum + (m.shieldRegen ?? 4), 0);

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
    set: SetState,
): void => {
    if (state.currentCombat) return;

    const oldShields = state.ship.shields;
    if (oldShields >= state.ship.maxShields) return;

    // Собираем все бонусы
    const baseRegen = getBaseShieldRegen(state);
    const raceMultiplier = getRaceRegenMultiplier(state);
    const { multiplier: artifactMultiplier, logs } =
        getArtifactRegenBonus(state);

    // Бонус от сращивания ксеноморфов
    const mergeBonus = getMergeEffectsBonus(state.crew, state.ship.modules);
    const mergeMultiplier = (mergeBonus.shieldRegenBonus ?? 0) / 100;

    // Итоговая ёмкость щита с бонусом от сращивания
    const maxShieldsWithBonus = mergeBonus.shieldCapacity
        ? Math.floor(
              state.ship.maxShields * (1 + mergeBonus.shieldCapacity / 100),
          )
        : state.ship.maxShields;

    // Применяем процентные бонусы к базовой регенерации
    const totalMultiplier =
        1 + raceMultiplier + artifactMultiplier + mergeMultiplier;
    const totalRegen = Math.floor(baseRegen * totalMultiplier);

    // Применяем регенерацию
    set((s) => ({
        ship: {
            ...s.ship,
            shields: Math.min(maxShieldsWithBonus, s.ship.shields + totalRegen),
        },
    }));

    // Логируем
    if (totalRegen > 0) {
        get().addLog(
            `Щиты: +${totalRegen} (${get().ship.shields}/${maxShieldsWithBonus})`,
            "info",
        );
    }

    logs.forEach((log) => get().addLog(log, "info"));
};
