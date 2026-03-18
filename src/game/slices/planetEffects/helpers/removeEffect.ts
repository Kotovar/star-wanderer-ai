import type { GameStore, SetState } from "@/game/types";

/**
 * Снимает истёкшие эффекты и удаляет бонусы из состояния
 *
 * @param set - Функция обновления состояния
 * @param get - Функция получения текущего состояния
 */
export const removeExpiredEffects = (set: SetState, get: () => GameStore) => {
    set((s) => {
        // Находим эффекты, которые истекают в этом ходу
        const expiringEffects = s.activeEffects.filter(
            (e) => e.turnsRemaining === 1,
        );

        // Собираем значения бонусов для удаления
        let bonusPowerToRemove = 0;
        let bonusShieldsToRemove = 0;
        let bonusEvasionToRemove = 0;
        let bonusDamageToRemove = 0;
        let bonusShieldRegenToRemove = 0;

        // Находим артефакты для снятия усиления
        const artifactsToUnboost: string[] = [];

        expiringEffects.forEach((effect) => {
            // Снимаем буст с артефактов
            if (effect.targetArtifactId) {
                artifactsToUnboost.push(effect.targetArtifactId);
            }

            // Суммируем бонусы для удаления
            effect.effects.forEach((ef) => {
                const value = ef.value as number;

                switch (ef.type) {
                    case "power_boost":
                        bonusPowerToRemove += value;
                        break;

                    case "shield_boost":
                        bonusShieldsToRemove += value;
                        break;

                    case "evasion_bonus":
                        // Конвертируем из десятичной дроби (0.1) в проценты (10)
                        bonusEvasionToRemove += Math.round(value * 100);
                        break;

                    case "combat_bonus":
                        bonusDamageToRemove += value;
                        break;
                }
            });

            // Crystalline shield regen bonus (fixed value, not stored in effect.effects)
            if (effect.raceId === "crystalline") {
                bonusShieldRegenToRemove += 3;
            }
        });

        // Уменьшаем счётчик ходов и фильтруем истёкшие эффекты
        const activeEffects = s.activeEffects
            .map((effect) => ({
                ...effect,
                turnsRemaining: effect.turnsRemaining - 1,
            }))
            .filter((effect) => effect.turnsRemaining > 0);

        // Логируем истёкшие эффекты
        expiringEffects.forEach((effect) => {
            get().addLog(`⏱️ Эффект "${effect.name}" истёк`, "warning");
        });

        return {
            activeEffects,
            artifacts: s.artifacts.map((a) =>
                artifactsToUnboost.includes(a.id)
                    ? { ...a, boosted: false }
                    : a,
            ),
            ship: {
                ...s.ship,
                bonusPower: Math.max(
                    0,
                    (s.ship.bonusPower || 0) - bonusPowerToRemove,
                ),
                bonusShields: Math.max(
                    0,
                    (s.ship.bonusShields || 0) - bonusShieldsToRemove,
                ),
                bonusEvasion: Math.max(
                    0,
                    (s.ship.bonusEvasion || 0) - bonusEvasionToRemove,
                ),
                bonusDamage: Math.max(
                    0,
                    (s.ship.bonusDamage || 0) - bonusDamageToRemove,
                ),
                bonusShieldRegen: Math.max(
                    0,
                    (s.ship.bonusShieldRegen || 0) - bonusShieldRegenToRemove,
                ),
                maxShields: Math.max(
                    0,
                    s.ship.maxShields - bonusShieldsToRemove,
                ),
                shields: Math.max(0, s.ship.shields - bonusShieldsToRemove),
            },
        };
    });
};
