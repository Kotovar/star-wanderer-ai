import type { LogEntry, TravelingState } from "@/game/types";

export const TRAVEL_LOG_LIMIT = 12;

export const appendTravelLog = (
    traveling: TravelingState,
    entry: LogEntry,
): TravelingState => ({
    ...traveling,
    travelLog: [...(traveling.travelLog ?? []), entry].slice(-TRAVEL_LOG_LIMIT),
});
