import type { EnemyModule } from "@/game/types";

/**
 * Calculates total enemy damage from alive modules
 */
export const calculateEnemyDamage = (enemyModules: EnemyModule[]) =>
    enemyModules.reduce(
        (total, module) =>
            total + (module.health > 0 ? (module.damage ?? 0) : 0),
        0,
    );

/**
 * Finds a random alive enemy module
 */
export const getRandomAliveEnemyModule = (
    enemyModules: EnemyModule[],
): EnemyModule | null => {
    const aliveModules = enemyModules.filter((m) => m.health > 0);
    if (aliveModules.length === 0) return null;
    return aliveModules[Math.floor(Math.random() * aliveModules.length)];
};
