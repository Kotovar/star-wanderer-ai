import { HEAL_CONFIG } from "../constants";
import type { GameState } from "@/game/types";
import type { RaceId } from "@/game/types/races";
import type { ServiceCostResult } from "./types";
import { applyReputationPriceModifier } from "@/game/reputation/priceModifier";

/**
 * Рассчитывает стоимость лечения экипажа
 * @param state - Текущее состояние игры
 * @param raceId - ID расы для применения модификатора репутации (опционально)
 * @returns Стоимость лечения и статус доступности
 */
export const calculateHealCost = (
    state: GameState,
    raceId?: RaceId,
): ServiceCostResult => {
    const crew = state.crew;

    if (crew.length === 0) {
        return { cost: 0, damagePercent: 0, canUse: false };
    }

    // Считаем текущее и максимальное HP всего экипажа
    const totalCurrentHP = crew.reduce((sum, c) => sum + (c.health || 0), 0);
    const totalMaxHP = crew.reduce(
        (sum, c) => sum + (c.maxHealth || HEAL_CONFIG.healthPercent),
        0,
    );

    // Считаем недостающее HP
    const missingHP = totalMaxHP - totalCurrentHP;

    // Процент повреждения (0 = все здоровы, 1 = все при смерти)
    const damagePercent = Math.max(
        0,
        Math.min(1, 1 - totalCurrentHP / totalMaxHP),
    );

    // Базовая цена = недостающее HP × цена за 1 HP
    let baseCost = Math.floor(missingHP * HEAL_CONFIG.pricePerHp);

    // Применяем модификатор репутации если указана раса
    if (raceId) {
        baseCost = applyReputationPriceModifier(
            state.raceReputation,
            raceId,
            baseCost,
        );
    }

    // Можно лечить, если есть раненые (> 0 HP)
    const canUse = missingHP > 0;

    return { cost: baseCost, damagePercent, canUse };
};
