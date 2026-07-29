import { store as i18nStore } from "@/lib/useTranslation";
import { getStarTypeEffect } from "@/game/constants/starEffects";
import { shiftHappiness } from "@/game/crew";
import type { GameState, GameStore, SetState } from "@/game/types";

/** Пол здоровья модуля от пассивного распада звезды (не выводит модуль из строя) */
const MIN_MODULE_HEALTH = 10;

/** HP, снимаемое с модуля при срабатывании moduleDecayChance */
const MODULE_DECAY_DAMAGE = 2;

/**
 * Пассивные эффекты типа звезды текущего сектора, которые не сводятся к
 * одной формуле (см. `src/game/constants/starEffects.ts`): счастье
 * экипажа за ход и случайный распад модуля. Действует только пока
 * корабль стоит в секторе (не в пути) — как и штраф регена щитов от
 * опасной звезды в `shieldRegen.ts`.
 */
export function processStarTypeEffects(
    state: GameState,
    get: () => GameStore,
    set: SetState,
): void {
    if (state.traveling) return;
    if (!state.currentSector) return;

    const effect = getStarTypeEffect(state.currentSector.star.type);

    if (effect.happinessPerTurn) {
        const delta = effect.happinessPerTurn;
        set((s) => ({
            crew: s.crew.map((c) => shiftHappiness(c, delta)),
        }));
    }

    if (effect.moduleDecayChance && Math.random() < effect.moduleDecayChance) {
        const modules = get().ship.modules;
        const candidates = modules.filter((m) => m.health > MIN_MODULE_HEALTH);
        if (candidates.length > 0) {
            const target = candidates[Math.floor(Math.random() * candidates.length)];
            set((s) => ({
                ship: {
                    ...s.ship,
                    modules: s.ship.modules.map((m) =>
                        m.id === target.id
                            ? { ...m, health: Math.max(MIN_MODULE_HEALTH, m.health - MODULE_DECAY_DAMAGE) }
                            : m,
                    ),
                },
            }));
            get().addLog(
                i18nStore.t("game_logs.star_module_decay", {
                    moduleName: target.name,
                    amount: MODULE_DECAY_DAMAGE,
                }),
                "warning",
            );
        }
    }
}
