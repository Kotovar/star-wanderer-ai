import type { GameStore, SetState } from "@/game/types";
import {
    buildGasCollector,
    collectOutpost,
    recallCrew,
    sellGas,
    stationCrew,
} from "./helpers";
import type { GasType } from "@/game/types/outposts";

export interface OutpostsSlice {
    /** Ставит газосборник на текущем гиганте. Стоит ход */
    buildGasCollector: (locationId: string) => void;
    /** Забирает накопленное. Только находясь в локации постройки */
    collectOutpost: (outpostId: string) => void;
    /** Продаёт газ станции. Криоген не продаётся */
    sellGas: (gas: GasType, quantity: number) => void;
    /** Приписывает человека к постройке. Только находясь на месте */
    stationCrew: (crewId: number, outpostId: string) => void;
    /** Возвращает приписанного на корабль */
    recallCrew: (crewId: number) => void;
}

export const createOutpostsSlice = (
    set: SetState,
    get: () => GameStore,
): OutpostsSlice => ({
    buildGasCollector: (locationId) => buildGasCollector(locationId, set, get),
    collectOutpost: (outpostId) => collectOutpost(outpostId, set, get),
    sellGas: (gas, quantity) => sellGas(gas, quantity, set, get),
    stationCrew: (crewId, outpostId) => stationCrew(crewId, outpostId, set, get),
    recallCrew: (crewId) => recallCrew(crewId, set, get),
});
