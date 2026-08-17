import type { RaceId } from "../types/races";
import { RACES } from "@/game/constants/races";
import { getReputationLevel } from "@/game/types/reputation";
import type { ReputationLevel } from "@/game/types/reputation";
import type { Contract } from "@/game/types/contracts";
import { calculateReputationRippleEffects } from "./ripple";

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

    // Рябь строится только от реально применённого изменения после лимита.
    const affectedRaces = getReputationRippleEffects(
        raceId,
        newValue - oldValue,
    );

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

type ReputationContract = Pick<
    Contract,
    | "type"
    | "isRaceQuest"
    | "requiredRace"
    | "sourceDominantRace"
    | "reputationReward"
>;

export function getContractReputationChangeRequests(
    contract: ReputationContract,
    knownRaces: readonly RaceId[] = [],
): Array<{ raceId: RaceId; amount: number }> {
    if (contract.type === "crisis_response") {
        return [
            ...(contract.sourceDominantRace
                ? [{ raceId: contract.sourceDominantRace, amount: 4 }]
                : []),
            ...knownRaces
                .filter((raceId) => raceId !== contract.sourceDominantRace)
                .map((raceId) => ({ raceId, amount: 2 })),
        ];
    }

    const raceId = contract.requiredRace ?? contract.sourceDominantRace;
    if (!raceId) return [];

    return [
        {
            raceId,
            amount:
                contract.reputationReward ?? (contract.isRaceQuest ? 10 : 2),
        },
    ];
}

export function getContractReputationImpact(
    contract: ReputationContract,
    raceReputation: Record<RaceId, number>,
    knownRaces: readonly RaceId[] = [],
): Array<{ raceId: RaceId; change: number }> {
    const preview = { ...raceReputation };
    const knownRaceIds = new Set(knownRaces);
    const changes = new Map<RaceId, number>();

    const applyChange = (raceId: RaceId, value: number) => {
        const oldValue = getRaceReputation(preview, raceId);
        const newValue = clampReputation(value);
        if (newValue === oldValue) return;

        preview[raceId] = newValue;
        changes.set(raceId, (changes.get(raceId) ?? 0) + newValue - oldValue);
    };

    for (const { raceId, amount } of getContractReputationChangeRequests(
        contract,
        knownRaces,
    )) {
        const result = changeReputation(preview, raceId, amount);
        applyChange(raceId, result.newValue);

        for (const affected of result.affectedRaces) {
            if (!knownRaceIds.has(affected.raceId)) continue;
            applyChange(
                affected.raceId,
                getRaceReputation(preview, affected.raceId) + affected.change,
            );
        }
    }

    return [...changes]
        .filter(([, change]) => change !== 0)
        .map(([raceId, change]) => ({ raceId, change }));
}

/**
 * Можно ли нанимать членов экипажа этой расы.
 * Враждебные расы не нанимаются — единая проверка для всех точек найма.
 */
export function canHireRace(
    raceReputation: Record<RaceId, number>,
    raceId: RaceId | undefined,
): boolean {
    if (!raceId) return true;
    return getRaceReputationLevel(raceReputation, raceId) !== "hostile";
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
