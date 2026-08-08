import type { GameStore, SetState } from "@/game/types";
import { buildGasCollector, collectOutpost, sellGas } from "./helpers";
import type { GasType } from "@/game/types/outposts";

export interface OutpostsSlice {
    /** Ставит газосборник на текущем гиганте. Стоит ход */
    buildGasCollector: (locationId: string) => void;
    /** Забирает накопленное. Только находясь в локации постройки */
    collectOutpost: (outpostId: string) => void;
    /** Продаёт газ станции. Криоген не продаётся */
    sellGas: (gas: GasType, quantity: number) => void;
}

export const createOutpostsSlice = (
    set: SetState,
    get: () => GameStore,
): OutpostsSlice => ({
    buildGasCollector: (locationId) => buildGasCollector(locationId, set, get),
    collectOutpost: (outpostId) => collectOutpost(outpostId, set, get),
    sellGas: (gas, quantity) => sellGas(gas, quantity, set, get),
});
