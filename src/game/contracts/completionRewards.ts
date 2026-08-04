import type { RaceId } from "@/game/types";

export const getReputationChanges = (
    before: Partial<Record<RaceId, number>>,
    after: Partial<Record<RaceId, number>>,
) =>
    ([...new Set([...Object.keys(before), ...Object.keys(after)])] as RaceId[]).flatMap((raceId) => {
        const change = (after[raceId] ?? 0) - (before[raceId] ?? 0);
        return change === 0 ? [] : [{ raceId, change }];
    });
