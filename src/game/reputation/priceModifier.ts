import type { RaceId } from "@/game/types/races";
import { getRaceReputationLevel } from "@/game/reputation/utils";

// Buy modifiers: hostile×2.0, unfriendly×1.4, neutral×1.0, friendly×0.9, allied×0.8
// Sell modifiers: hostile×0.7, unfriendly×0.85, neutral×1.0, friendly×1.1, allied×1.2
// Anti-arbitrage proof (station spread ×1.6): sell_mod × 1.6 < buy_mod at each level:
//   hostile: 0.7×1.6=1.12 < 2.0 ✓  unfriendly: 0.85×1.6=1.36 < 1.4 ✓
//   neutral: 1.0×1.6=1.6 > 1.0 ✓   friendly: 1.1×1.6=1.76 > 0.9 ✓  allied: 1.2×1.6=1.92 > 0.8 ✓
const BUY_MODIFIERS: Record<string, number> = {
    hostile: 2.0,
    unfriendly: 1.4,
    neutral: 1.0,
    friendly: 0.9,
    allied: 0.8,
};

const SELL_MODIFIERS: Record<string, number> = {
    hostile: 0.7,
    unfriendly: 0.85,
    neutral: 1.0,
    friendly: 1.1,
    allied: 1.2,
};

/**
 * Применить модификатор цены на основе репутации с расой
 * @param raceReputation - Текущая репутация игрока со всеми расами
 * @param raceId - ID расы, чья репутация используется
 * @param basePrice - Базовая цена (за 5 тонн)
 * @param type - Тип операции: 'buy' (покупка игроком) или 'sell' (продажа игроком)
 * @param oppositeBasePrice - Базовая цена противоположной операции (за 5 тонн, для защиты от арбитража)
 * @param quantity - Количество товара (для правильного расчёта anti-arbitrage)
 * @returns Модифицированная цена за указанное количество
 */
export function applyReputationPriceModifier(
    raceReputation: Record<RaceId, number>,
    raceId: RaceId,
    basePrice: number,
    type: "buy" | "sell" = "buy",
    oppositeBasePrice?: number,
    quantity: number = 5,
): number {
    const level = getRaceReputationLevel(raceReputation, raceId);
    const modifiers = type === "sell" ? SELL_MODIFIERS : BUY_MODIFIERS;
    const modifier = modifiers[level] ?? 1.0;

    // Calculate price per unit (ton) with reputation modifier
    // Use Math.floor to avoid floating point issues
    const pricePerUnit = Math.floor((basePrice / 5) * modifier * 100) / 100;

    // Calculate total price for the quantity
    let result = Math.floor(pricePerUnit * quantity);

    // Anti-arbitrage protection: ensure sell price is always less than buy price
    // This prevents buying and selling back at the same location for profit
    if (oppositeBasePrice !== undefined) {
        const oppositePricePerUnit =
            Math.floor((oppositeBasePrice / 5) * 100) / 100;
        const oppositeTotal = Math.floor(oppositePricePerUnit * quantity);

        if (type === "sell" && result >= oppositeTotal) {
            result = oppositeTotal - 1;
        } else if (type === "buy" && result <= oppositeTotal) {
            result = oppositeTotal + 1;
        }
    }

    return Math.max(1, result); // Ensure price is at least 1
}
