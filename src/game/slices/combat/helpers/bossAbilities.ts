import type { GameState, GameStore } from "@/game/types";

/**
 * Heals all boss modules by specified amount
 */
function healBossModules(
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
    healAmount: number,
    logMessage: string,
) {
    set((s) => {
        if (!s.currentCombat) return;
        s.currentCombat.enemy.modules.forEach((m) => {
            if (m.health > 0) {
                m.health = Math.min(m.maxHealth ?? 100, m.health + healAmount);
            }
        });
    });
    get().addLog(logMessage, "warning");
}

/**
 * Restores boss shields by percentage
 */
function restoreBossShields(
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
    restorePercent: number,
    logMessage: string,
) {
    set((s) => {
        if (!s.currentCombat) return;
        const maxShields = s.currentCombat.enemy.maxShields;
        const restoreAmount = Math.floor((maxShields * restorePercent) / 100);
        s.currentCombat.enemy.shields = Math.min(
            maxShields,
            s.currentCombat.enemy.shields + restoreAmount,
        );
    });
    get().addLog(logMessage, "warning");
}

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

    // Base regeneration (every turn) - primary healing mechanic
    if (boss.regenRate && boss.regenRate > 0) {
        const aliveModules = boss.modules.filter((m) => m.health > 0);
        if (aliveModules.length > 0) {
            healBossModules(
                set,
                get,
                boss.regenRate,
                `⚙️ Регенерация босса: +${boss.regenRate}%`,
            );
        }
    }

    // Special ability: emergency_repair with low_health trigger
    if (
        boss.specialAbility?.trigger === "low_health" &&
        (boss.specialAbility.effect === "heal_all" ||
            boss.specialAbility.effect === "emergency_repair")
    ) {
        const totalHealth = boss.modules.reduce((sum, m) => sum + m.health, 0);
        const maxHealth = boss.modules.reduce(
            (sum, m) => sum + (m.maxHealth ?? 100),
            0,
        );
        const healthPercent = (totalHealth / maxHealth) * 100;

        // Trigger at < 30% health
        if (healthPercent < 30) {
            const healAmount = boss.specialAbility.value ?? 25;
            healBossModules(
                set,
                get,
                healAmount,
                `★ ${boss.specialAbility.name}: Аварийное восстановление! +${healAmount}%`,
            );
        }
    }

    // Special ability: shield_restore with low_health trigger
    if (
        boss.specialAbility?.trigger === "low_health" &&
        boss.specialAbility.effect === "shield_restore"
    ) {
        const totalHealth = boss.modules.reduce((sum, m) => sum + m.health, 0);
        const maxHealth = boss.modules.reduce(
            (sum, m) => sum + (m.maxHealth ?? 100),
            0,
        );
        const healthPercent = (totalHealth / maxHealth) * 100;

        // Trigger at < 30% health
        if (healthPercent < 30 && boss.shields < boss.maxShields) {
            const restorePercent = boss.specialAbility.value ?? 50;
            restoreBossShields(
                set,
                get,
                restorePercent,
                `★ ${boss.specialAbility.name}: Восстановление щитов! +${restorePercent}%`,
            );
        }
    }
}
