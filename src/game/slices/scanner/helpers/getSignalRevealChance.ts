/**
 * Вычисляет шанс раскрытия типа сигнала бедствия
 *
 * @param scanRange - Эффективный диапазон сканирования
 * @returns Шанс раскрытия в процентах (0-100)
 */

const MIN_SCAN_RANGE = 3;
const REVEAL_CHANCE_TIERS = [
    { threshold: 15, chance: 75 },
    { threshold: 8, chance: 50 },
    { threshold: 5, chance: 30 },
    { threshold: 3, chance: 15 },
] as const;
const RANGE_BONUS_PER_POINT = 2;
const MAX_REVEAL_CHANCE = 95;

export const getSignalRevealChance = (scanRange: number) => {
    if (scanRange < MIN_SCAN_RANGE) return 0;

    // Базовые шансы по порогам scanRange:
    // scanRange >= 15: 75% (как scanner level 4)
    // scanRange >= 8: 50% (как scanner level 3)
    // scanRange >= 5: 30% (как scanner level 2)
    // scanRange >= 3: 15% (как scanner level 1)
    let baseChance = 0;
    let baseRequirement = 0;

    for (const tier of REVEAL_CHANCE_TIERS) {
        if (scanRange >= tier.threshold) {
            baseChance = tier.chance;
            baseRequirement = tier.threshold;
            break;
        }
    }

    // Бонус от числового значения scanRange: +2% за каждый пункт выше базового требования
    if (scanRange > baseRequirement) {
        const rangeBonus =
            (scanRange - baseRequirement) * RANGE_BONUS_PER_POINT;
        return Math.min(MAX_REVEAL_CHANCE, baseChance + rangeBonus);
    }

    return baseChance;
};
