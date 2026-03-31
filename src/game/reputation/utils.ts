import type { RaceId } from "../types/races";
import { RACES } from "@/game/constants/races";
import { getReputationLevel } from "@/game/types/reputation";
import type { ReputationLevel } from "@/game/types/reputation";

/**
 * Ограничение репутации в диапазоне [-100, 100]
 */
export function clampReputation(value: number): number {
    return Math.max(-100, Math.min(100, value));
}

/**
 * Получить текущую репутацию игрока с расой
 */
export function getRaceReputation(
    raceReputation: Record<RaceId, number>,
    raceId: RaceId,
): number {
    return raceReputation[raceId] ?? 0;
}

/**
 * Получить уровень репутации с расой
 */
export function getRaceReputationLevel(
    raceReputation: Record<RaceId, number>,
    raceId: RaceId,
): ReputationLevel {
    return getReputationLevel(getRaceReputation(raceReputation, raceId));
}

/**
 * Изменить репутацию с расой
 * Возвращает новое значение и информацию об изменении уровня
 */
export function changeReputation(
    raceReputation: Record<RaceId, number>,
    raceId: RaceId,
    amount: number,
): {
    newValue: number;
    oldValue: number;
    oldLevel: ReputationLevel;
    newLevel: ReputationLevel;
    levelChanged: boolean;
    affectedRaces: Array<{ raceId: RaceId; change: number }>;
} {
    const oldValue = getRaceReputation(raceReputation, raceId);
    const oldLevel = getReputationLevel(oldValue);
    const newValue = clampReputation(oldValue + amount);

    // Получаем список затронутых рас (без мутации)
    const affectedRaces = getAffectedRaces(raceReputation, raceId, amount);

    const newLevel = getReputationLevel(newValue);
    const levelChanged = oldLevel !== newLevel;

    return {
        newValue,
        oldValue,
        oldLevel,
        newLevel,
        levelChanged,
        affectedRaces,
    };
}

/**
 * Получить список рас, которые будут затронуты при изменении репутации
 * Возвращает массив с ID рас и величиной изменения
 */
function getAffectedRaces(
    raceReputation: Record<RaceId, number>,
    primaryRaceId: RaceId,
    amount: number,
): Array<{ raceId: RaceId; change: number }> {
    const affectedRaces: Array<{ raceId: RaceId; change: number }> = [];
    const primaryRace = RACES[primaryRaceId];

    if (!primaryRace?.relations) {
        return affectedRaces;
    }

    // Проходим по всем расам, с которыми у текущей есть отношения
    for (const [otherRaceId, relationValue] of Object.entries(
        primaryRace.relations,
    )) {
        const otherRaceIdTyped = otherRaceId as RaceId;

        // Пропускаем саму расу
        if (otherRaceIdTyped === primaryRaceId) {
            continue;
        }

        // Сила влияния зависит от силы отношений
        // relationValue: -20 (враги) до +20 (друзья)
        const influenceFactor = (relationValue as number) / 100; // -0.2 до 0.2

        // Если помогаем расе (amount > 0):
        // - друзья этой расы тоже получают небольшой бонус
        // - враги получают небольшой штраф
        // Если вредим расе (amount < 0):
        // - друзья получают штраф
        // - враги получают бонус

        const secondaryAmount = amount * influenceFactor * 0.5; // 50% силы

        if (secondaryAmount !== 0) {
            // Если изменение значимое (> 5), добавляем в список затронутых
            if (Math.abs(secondaryAmount) >= 5) {
                affectedRaces.push({
                    raceId: otherRaceIdTyped,
                    change: secondaryAmount,
                });
            }
        }
    }

    return affectedRaces;
}

/**
 * Проверить, доступен ли контракт расы.
 * Требует хотя бы нейтральной репутации.
 */
export function isRaceContractAvailable(
    raceReputation: Record<RaceId, number>,
    raceId: RaceId,
): boolean {
    const level = getRaceReputationLevel(raceReputation, raceId);
    return level !== "hostile" && level !== "unfriendly";
}
