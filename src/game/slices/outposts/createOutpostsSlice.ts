import type { GameStore, SetState } from "@/game/types";
import { buildGasCollector, collectOutpost } from "./helpers";

export interface OutpostsSlice {
    /** Ставит газосборник на текущем гиганте. Стоит ход */
    buildGasCollector: (locationId: string) => void;
    /** Забирает накопленное. Только находясь в локации постройки */
    collectOutpost: (outpostId: string) => void;
}

export const createOutpostsSlice = (
    set: SetState,
    get: () => GameStore,
): OutpostsSlice => ({
    buildGasCollector: (locationId) => buildGasCollector(locationId, set, get),
    collectOutpost: (outpostId) => collectOutpost(outpostId, set, get),
});
