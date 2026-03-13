import { REPAIR_CONFIG } from "../constants";
import type { GameState } from "@/game/types";
import type { ServiceCostResult } from "./types";

/**
 * Рассчитывает стоимость ремонта корабля
 * @param state - Текущее состояние игры
 * @returns Стоимость ремонта и статус доступности
 */
export const calculateRepairCost = (state: GameState): ServiceCostResult => {
    const modules = state.ship.modules;

    if (modules.length === 0) {
        return { cost: 0, damagePercent: 0, canUse: false };
    }

    // Считаем общее текущее и максимальное HP
    const totalCurrentHP = modules.reduce((sum, m) => sum + (m.health || 0), 0);
    const totalMaxHP = modules.reduce(
        (sum, m) => sum + (m.maxHealth || 100),
        0,
    );

    // Считаем недостающее HP
    const missingHP = totalMaxHP - totalCurrentHP;

    // Процент повреждения (0 = все целы, 1 = все уничтожено)
    const damagePercent = Math.max(
        0,
        Math.min(1, 1 - totalCurrentHP / totalMaxHP),
    );

    // Цена = недостающее HP × цена за 1 HP
    const cost = Math.floor(missingHP * REPAIR_CONFIG.pricePerHp);

    // Можно ремонтировать, если есть повреждения (> 0 HP)
    const canUse = missingHP > 0;

    return { cost, damagePercent, canUse };
};
