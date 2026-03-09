import type { GameState, GameStore } from "@/game/types";
import { RACES } from "@/game/constants/races";
import { getArtifactEffectValue } from "@/game/artifacts";

/**
 * Регенерация щитов (только вне боя)
 */
export const regenerateShields = (
    state: GameState,
    get: () => GameStore,
    set: (fn: (s: GameState) => void) => void,
): void => {
    if (state.currentCombat) return;

    let shieldRegen = Math.floor(Math.random() * 6) + 5;

    state.crew.forEach((c) => {
        const race = RACES[c.race];
        if (race?.specialTraits) {
            const shieldTrait = race.specialTraits.find(
                (t) => t.effects.shieldRegen,
            );
            if (shieldTrait && shieldTrait.effects.shieldRegen) {
                shieldRegen += Math.floor(Number(shieldTrait.effects.shieldRegen));
            }
            if (race.id === "xenosymbiont") {
                const symbiosisTrait = race.specialTraits.find(
                    (t) => t.effects.canMerge,
                );
                if (symbiosisTrait) {
                    shieldRegen += 2;
                }
            }
        }
    });

    const naniteHull = state.artifacts.find(
        (a) => a.effect.type === "shield_regen" && a.effect.active,
    );
    if (naniteHull) {
        shieldRegen += Number(naniteHull.effect.value || 10);
    }

    const shieldRegenerator = state.artifacts.find(
        (a) =>
            a.effect.type === "shield_regen_boost" &&
            a.effect.active,
    );
    if (shieldRegenerator) {
        const regenBoost = getArtifactEffectValue(shieldRegenerator, state);
        shieldRegen = Math.floor(shieldRegen * (1 + regenBoost));
        get().addLog(
            `⚡ Регенератор Щитов: +${Math.round(regenBoost * 100)}% к регенерации`,
            "info",
        );
    }

    const oldShields = state.ship.shields;
    set((s) => ({
        ship: {
            ...s.ship,
            shields: Math.min(
                s.ship.maxShields,
                s.ship.shields + shieldRegen,
            ),
        },
    }));

    if (shieldRegen > 0 && oldShields < state.ship.maxShields) {
        get().addLog(
            `Щиты: +${shieldRegen} (${get().ship.shields}/${get().ship.maxShields})`,
            "info",
        );
    }
};
