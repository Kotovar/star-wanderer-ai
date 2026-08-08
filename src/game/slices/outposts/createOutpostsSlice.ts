import type { GameStore, SetState } from "@/game/types";
import {
    buildBase,
    buildGasCollector,
    healAtBase,
    repairAtBase,
    storeAtBase,
    installBaseModule,
    removeBaseModule,
    upgradeBase,
    collectOutpost,
    recallCrew,
    sellGas,
    stationCrew,
} from "./helpers";
import type {
    BaseModuleId,
    GasType,
    OutpostResource,
} from "@/game/types/outposts";

export interface OutpostsSlice {
    /** Закладывает главную базу на исследованной пустой планете. Одна за забег */
    buildBase: (locationId: string) => void;
    /** Расширяет базу: следующий уровень открывает ещё два слота */
    upgradeBase: (outpostId: string) => void;
    /** Чинит модули корабля в ремдоке базы. Стоит ход */
    repairAtBase: (outpostId: string) => void;
    /** Лечит экипаж и снимает усталость в медблоке базы. Стоит ход */
    healAtBase: (outpostId: string) => void;
    /** Кладёт груз с корабля на склад базы */
    storeAtBase: (outpostId: string, resource: OutpostResource, quantity: number) => void;
    /** Ставит модуль в свободный слот базы */
    installBaseModule: (outpostId: string, moduleId: BaseModuleId) => void;
    /** Сносит модуль, возвращая половину кредитов */
    removeBaseModule: (outpostId: string, moduleId: BaseModuleId) => void;
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
    buildBase: (locationId) => buildBase(locationId, set, get),
    upgradeBase: (outpostId) => upgradeBase(outpostId, set, get),
    repairAtBase: (outpostId) => repairAtBase(outpostId, set, get),
    healAtBase: (outpostId) => healAtBase(outpostId, set, get),
    storeAtBase: (outpostId, resource, quantity) =>
        storeAtBase(outpostId, resource, quantity, set, get),
    installBaseModule: (outpostId, moduleId) =>
        installBaseModule(outpostId, moduleId, set, get),
    removeBaseModule: (outpostId, moduleId) =>
        removeBaseModule(outpostId, moduleId, set, get),
    buildGasCollector: (locationId) => buildGasCollector(locationId, set, get),
    collectOutpost: (outpostId) => collectOutpost(outpostId, set, get),
    sellGas: (gas, quantity) => sellGas(gas, quantity, set, get),
    stationCrew: (crewId, outpostId) => stationCrew(crewId, outpostId, set, get),
    recallCrew: (crewId) => recallCrew(crewId, set, get),
});
