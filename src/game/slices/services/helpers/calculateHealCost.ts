import { HEAL_CONFIG } from "../constants";
import type { GameState } from "@/game/types";
import type { ServiceCostResult } from "./types";

/**
 * Рассчитывает стоимость лечения экипажа
 * @param state - Текущее состояние игры
 * @returns Стоимость лечения и статус доступности
 */
export const calculateHealCost = (state: GameState): ServiceCostResult => {
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

    // Цена = недостающее HP × цена за 1 HP
    const cost = Math.floor(missingHP * HEAL_CONFIG.pricePerHp);

    // Можно лечить, если есть раненые (> 0 HP)
    const canUse = missingHP > 0;

    return { cost, damagePercent, canUse };
};
