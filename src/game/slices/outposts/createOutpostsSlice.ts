import type { GameStore, SetState } from "@/game/types";
import {
    assaultOutpost,
    buildBase,
    buildGasCollector,
    healAtBase,
    hireAtBase,
    repairAtBase,
    storeAtBase,
    withdrawFromBase,
    storeCargoAtBase,
    withdrawCargoFromBase,
    installBaseModule,
    removeBaseModule,
    upgradeBase,
    collectOutpost,
    recallCrew,
    sellGas,
    buyGas,
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
    /** Штурмует захваченную постройку. Только находясь на месте */
    assaultOutpost: (outpostId: string) => void;
    /** Чинит модули корабля в ремдоке базы. Стоит ход */
    repairAtBase: (outpostId: string) => void;
    /** Лечит экипаж и снимает усталость в медблоке базы. Стоит ход */
    healAtBase: (outpostId: string) => void;
    /** Нанимает поселенца выбранной профессии в казарме базы */
    hireAtBase: (outpostId: string, profession: string) => void;
    /** Кладёт предмет трюма на склад базы: груз задания, модуль, орудие */
    storeCargoAtBase: (outpostId: string, cargoIndex: number, quantity: number) => void;
    /** Забирает предмет со склада обратно в трюм */
    withdrawCargoFromBase: (outpostId: string, storedIndex: number, quantity: number) => void;
    /** Кладёт товар или газ на склад базы */
    storeAtBase: (outpostId: string, resource: OutpostResource, quantity: number) => void;
    /** Забирает товар или газ со склада обратно в трюм */
    withdrawFromBase: (outpostId: string, resource: OutpostResource, quantity: number) => void;
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
    /** Покупает газ у станции — дороже, чем станция скупает */
    buyGas: (gas: GasType, quantity: number) => void;
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
    assaultOutpost: (outpostId) => assaultOutpost(outpostId, set, get),
    repairAtBase: (outpostId) => repairAtBase(outpostId, set, get),
    healAtBase: (outpostId) => healAtBase(outpostId, set, get),
    hireAtBase: (outpostId, profession) =>
        hireAtBase(outpostId, profession, set, get),
    storeAtBase: (outpostId, resource, quantity) =>
        storeAtBase(outpostId, resource, quantity, set, get),
    withdrawFromBase: (outpostId, resource, quantity) =>
        withdrawFromBase(outpostId, resource, quantity, set, get),
    storeCargoAtBase: (outpostId, cargoIndex, quantity) =>
        storeCargoAtBase(outpostId, cargoIndex, quantity, set, get),
    withdrawCargoFromBase: (outpostId, storedIndex, quantity) =>
        withdrawCargoFromBase(outpostId, storedIndex, quantity, set, get),
    installBaseModule: (outpostId, moduleId) =>
        installBaseModule(outpostId, moduleId, set, get),
    removeBaseModule: (outpostId, moduleId) =>
        removeBaseModule(outpostId, moduleId, set, get),
    buildGasCollector: (locationId) => buildGasCollector(locationId, set, get),
    collectOutpost: (outpostId) => collectOutpost(outpostId, set, get),
    sellGas: (gas, quantity) => sellGas(gas, quantity, set, get),
    buyGas: (gas, quantity) => buyGas(gas, quantity, set, get),
    stationCrew: (crewId, outpostId) => stationCrew(crewId, outpostId, set, get),
    recallCrew: (crewId) => recallCrew(crewId, set, get),
});
