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
