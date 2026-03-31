import { REPAIR_CONFIG } from "../constants";
import type { GameState } from "@/game/types";
import type { RaceId } from "@/game/types/races";
import type { ServiceCostResult } from "./types";
import { applyReputationPriceModifier } from "@/game/reputation/priceModifier";

/**
 * Рассчитывает стоимость ремонта корабля
 * @param state - Текущее состояние игры
 * @param raceId - ID расы для применения модификатора репутации (опционально)
 * @returns Стоимость ремонта и статус доступности
 */
export const calculateRepairCost = (
    state: GameState,
    raceId?: RaceId,
): ServiceCostResult => {
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

    // Базовая цена = недостающее HP × цена за 1 HP
    let baseCost = Math.floor(missingHP * REPAIR_CONFIG.pricePerHp);

    // Применяем модификатор репутации если указана раса
    if (raceId) {
        baseCost = applyReputationPriceModifier(
            state.raceReputation,
            raceId,
            baseCost,
        );
    }

    // Можно ремонтировать, если есть повреждения (> 0 HP)
    const canUse = missingHP > 0;

    return { cost: baseCost, damagePercent, canUse };
};
