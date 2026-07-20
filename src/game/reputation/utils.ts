import type { RaceId } from "../types/races";
import { RACES } from "@/game/constants/races";
import { getReputationLevel } from "@/game/types/reputation";
import type { ReputationLevel } from "@/game/types/reputation";
import type { Contract } from "@/game/types/contracts";
import { calculateReputationRippleEffects } from "./ripple";

/**
 * Ограничение репутации в диапазоне [-100, 100]
 */
function clampReputation(value: number): number {
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
    const affectedRaces = getReputationRippleEffects(raceId, amount);

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
function getReputationRippleEffects(
    primaryRaceId: RaceId,
    amount: number,
): Array<{ raceId: RaceId; change: number }> {
    const primaryRace = RACES[primaryRaceId];
    return calculateReputationRippleEffects(
        primaryRace?.relations,
        primaryRaceId,
        amount,
    ).map(({ id, change }) => ({ raceId: id, change }));
}

export function getContractReputationImpact(
    contract: Pick<
        Contract,
        "isRaceQuest" | "requiredRace" | "sourceDominantRace"
    >,
): Array<{ raceId: RaceId; change: number }> {
    const raceId = contract.requiredRace ?? contract.sourceDominantRace;
    if (!raceId) return [];

    const amount = contract.isRaceQuest ? 10 : 2;
    return [
        { raceId, change: amount },
        ...getReputationRippleEffects(raceId, amount),
    ];
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
