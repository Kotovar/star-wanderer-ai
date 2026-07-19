// Без runtime-импортов: файл покрыт scripts/check-market-tick.mjs,
// который запускается через node --experimental-strip-types.
import type { Goods } from "@/game/types";

/**
 * Влияние глобальных кризисов на рынок: множители цен по товарам.
 * Модификатор применяется и к buy, и к sell одинаково — соотношение
 * buy > sell (анти-арбитраж) сохраняется, а игрок может заработать,
 * привезя дефицитный товар в разгар кризиса.
 */
export const CRISIS_MARKET_EFFECTS: Record<
    string,
    Partial<Record<Goods, number>>
> = {
    epidemic: { medicine: 2.5, food: 1.3 },
    fuel_shortage: { spares: 1.8, minerals: 1.4 },
    raider_wave: { food: 1.5, water: 1.5, spares: 1.3 },
    solar_flare: { electronics: 2 },
};

/**
 * Возвращает рыночный множитель товара для активного кризиса
 * @param crisisId - ID активного кризиса (или null/undefined)
 * @param goodId - Товар
 * @returns Множитель цены (1 — без изменений)
 */
export const getCrisisMarketMultiplier = (
    crisisId: string | null | undefined,
    goodId: Goods,
): number => {
    if (!crisisId) return 1;
    return CRISIS_MARKET_EFFECTS[crisisId]?.[goodId] ?? 1;
};

/**
 * Применяет кризисный множитель к паре цен станции
 * @param prices - Базовые цены { buy, sell }
 * @param crisisId - ID активного кризиса
 * @param goodId - Товар
 * @returns Цены с учётом кризиса
 */
export const applyCrisisMarketModifier = (
    prices: { buy: number; sell: number },
    crisisId: string | null | undefined,
    goodId: Goods,
): { buy: number; sell: number } => {
    const multiplier = getCrisisMarketMultiplier(crisisId, goodId);
    if (multiplier === 1) return prices;
    return {
        buy: Math.floor(prices.buy * multiplier),
        sell: Math.floor(prices.sell * multiplier),
    };
};
