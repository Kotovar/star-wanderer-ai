/**
 * Вычисляет шанс раннего обнаружения засады
 *
 * @param scanRange - Эффективный диапазон сканирования
 * @param threatLevel - Уровень угрозы (enemy tier)
 * @returns Шанс обнаружения в процентах (0-100)
 */

const MAX_WARNING_CHANCE = 80;

export const getEarlyWarningChance = (
    scanRange: number,
    threatLevel: number,
) => {
    // Base chance + bonus per point of scanRange above threshold
    // Tier 1 (threshold 3): Base 10% + 3% per point above 3
    // Tier 2 (threshold 5): Base 8% + 2.5% per point above 5
    // Tier 3 (threshold 8): Base 5% + 2% per point above 8
    const thresholds = [3, 5, 8];
    const baseChances = [10, 8, 5];
    const bonuses = [3, 2.5, 2];

    const tierIndex = Math.min(threatLevel - 1, 2);
    const threshold = thresholds[tierIndex];
    const baseChance = baseChances[tierIndex];
    const bonusPerPoint = bonuses[tierIndex];

    if (scanRange <= threshold) {
        return baseChance;
    }

    const bonus = (scanRange - threshold) * bonusPerPoint;
    return Math.min(MAX_WARNING_CHANCE, baseChance + bonus);
};
