import type { GameState, GameStore } from "@/game/types";

/**
 * Boss regeneration and special abilities
 */
export function processBossRegeneration(
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
) {
    const combat = state.currentCombat;
    if (!combat?.enemy.isBoss) return;

    const boss = combat.enemy;

    if (boss.regenRate && boss.regenRate > 0) {
        const aliveModules = boss.modules.filter((m) => m.health > 0);
        if (aliveModules.length > 0) {
            set((s) => {
                if (!s.currentCombat) return;
                s.currentCombat.enemy.modules.forEach((m) => {
                    if (m.health > 0 && m.health < (m.maxHealth || 100)) {
                        m.health = Math.min(
                            m.maxHealth || 100,
                            m.health + (boss.regenRate ?? 0),
                        );
                    }
                });
            });
            get().addLog(
                `⚙️ Регенерация босса: +${boss.regenRate}%`,
                "warning",
            );
        }
    }

    if (
        boss.specialAbility?.trigger === "every_turn" &&
        boss.specialAbility.effect === "heal_all"
    ) {
        const healAmount = boss.specialAbility.value ?? 10;
        set((s) => {
            if (!s.currentCombat) return;
            s.currentCombat.enemy.modules.forEach((m) => {
                if (m.health > 0)
                    m.health = Math.min(
                        m.maxHealth || 100,
                        m.health + healAmount,
                    );
            });
        });
        get().addLog(
            `★ ${boss.specialAbility.name}: +${healAmount}% ко всем модулям`,
            "warning",
        );
    }
}
