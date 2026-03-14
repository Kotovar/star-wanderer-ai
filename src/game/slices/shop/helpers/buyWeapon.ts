import type { GameStore, SetState, ShopItem } from "@/game/types";
import { WEAPON_TYPES } from "@/game/constants";
import { playSound } from "@/sounds";
import { getModulesFromState } from "@/game/modules";

/**
 * Результат поиска слота для оружия
 */
interface WeaponSlot {
    /** ID оружейной палубы */
    bayId: number;
    /** Индекс слота */
    slotIndex: number;
}

/**
 * Находит свободный слот для оружия на оружейных палубах
 * @param state - Текущее состояние игры
 * @returns Информация о слоте или null
 */
const findWeaponSlot = (state: GameStore): WeaponSlot | null => {
    // const wbays = state.ship.modules.filter((m) => m.type === "weaponbay");
    const wbays = getModulesFromState(state, "weaponbay");

    if (!wbays.length) {
        return null;
    }

    for (const bay of wbays) {
        if (bay.weapons) {
            for (let i = 0; i < bay.weapons.length; i++) {
                if (!bay.weapons[i]) {
                    return {
                        bayId: bay.id,
                        slotIndex: i,
                    };
                }
            }
        }
    }

    return null;
};

/**
 * Покупка и установка оружия
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 * @param item - Товар для покупки
 * @param stationId - ID станции
 * @param inv - Инвентарь станции
 * @param bought - Количество купленного товара
 */
export const buyWeapon = (
    set: SetState,
    get: () => GameStore,
    item: ShopItem,
    stationId: string,
    inv: Record<string, number>,
    bought: number,
): void => {
    const state = get();

    // Проверка наличия оружейной палубы
    const weaponBayCount = getModulesFromState(state, "weaponbay").length;

    if (!weaponBayCount) {
        get().addLog("Нет оружейной палубы!", "error");
        return;
    }

    // Поиск свободного слота
    const slot = findWeaponSlot(state);

    if (!slot) {
        get().addLog("Нет слотов!", "error");
        return;
    }

    const weaponType = item.weaponType;
    if (!weaponType) {
        get().addLog("Не указан тип оружия!", "error");
        return;
    }

    set((s) => ({
        ship: {
            ...s.ship,
            modules: s.ship.modules.map((m) =>
                m.id === slot.bayId && m.weapons
                    ? {
                          ...m,
                          weapons: m.weapons.map((w, i) =>
                              i === slot.slotIndex ? { type: weaponType } : w,
                          ),
                      }
                    : m,
            ),
        },
        credits: s.credits - item.price,
        stationInventory: {
            ...s.stationInventory,
            [stationId]: {
                ...inv,
                [item.id]: bought + 1,
            },
        },
    }));

    get().addLog(`Установлено ${WEAPON_TYPES[weaponType].name}`, "info");
    playSound("shop");
};
