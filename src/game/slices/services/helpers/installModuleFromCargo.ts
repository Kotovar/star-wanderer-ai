import { getTechBonusSum } from "@/game/research";
import { store as i18nStore } from "@/lib/useTranslation";
import type { GameStore, SetState, Module, CargoItem } from "@/game/types";
import { playSound } from "@/sounds";
import { createModuleFromShopItem } from "@/game/modules/createModuleFromShopItem";
import { applyTechBonusesToNewModule } from "@/game/slices/research/helpers/researchHelpers";
import { canPlaceModule } from "@/game/slices/ship/helpers/canPlaceModule";
import { takeCargoItem } from "@/game/slices/ship/helpers/takeCargoItem";

/**
 * Создаёт модуль из грузового элемента
 * @param cargoItem - Элемент груза
 * @param x - Координата X
 * @param y - Координата Y
 * @returns Новый модуль или null если нет данных
 */
const getExtraWeaponSlots = (state: GameStore): number =>
    getTechBonusSum(state.research, "weapon_slots");

const createModuleFromCargo = (
    cargoItem: CargoItem,
    x: number,
    y: number,
    extraWeaponSlots: number,
): Module | null => {
    const shopItem = cargoItem.module;

    if (!shopItem) {
        return null;
    }

    return createModuleFromShopItem(shopItem, {
        x,
        y,
        extraWeaponSlots,
        generateId: () => Date.now(),
    });
};

const applyTechBonuses = (
    module: Module | null,
    state: GameStore,
): Module | null => {
    if (!module) return null;
    return applyTechBonusesToNewModule(module, state);
};

/**
 * Устанавливает модуль из грузового отсека на корабль
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 * @param cargoIndex - Индекс элемента в грузовом отсеке
 * @param x - Координата X для установки
 * @param y - Координата Y для установки
 */
export const installModuleFromCargo = (
    set: SetState,
    get: () => GameStore,
    cargoIndex: number,
    x: number,
    y: number,
): void => {
    const state = get();
    const cargoItem = state.ship.cargo[cargoIndex];

    // Проверка: это модуль и есть данные ShopItem
    if (!cargoItem || !cargoItem.isModule || !cargoItem.module) {
        get().addLog( i18nStore.t("game_logs.installModuleFromCargo_1"), "error");
        return;
    }

    // Создание модуля (с одноразовыми бонусами изученных технологий)
    const newModule = applyTechBonuses(
        createModuleFromCargo(cargoItem, x, y, getExtraWeaponSlots(state)),
        state,
    );

    if (!newModule || !canPlaceModule(newModule, x, y, state)) {
        get().addLog(i18nStore.t("game_logs.installModuleFromCargo_4"), "error");
        return;
    }

    // Установка модуля
    set((s) => ({
        ship: {
            ...s.ship,
            cargo: takeCargoItem(s.ship.cargo, cargoIndex),
            modules: [...s.ship.modules, newModule],
        },
    }));
    get().addLog( i18nStore.t("game_logs.installModuleFromCargo_3", { item: cargoItem.module?.name || cargoItem.item, x, y }),
        "info",
    );
    playSound("world_install");
    get().updateShipStats();
};
