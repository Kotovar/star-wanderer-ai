import type { RaceId } from "./races";

export interface ActiveEffect {
    id: string;
    name: string;
    description: string;
    raceId: RaceId;
    turnsRemaining: number;
    effects: {
        type: string;
        value: number | string;
    }[];
}
