import type { GameStore, SetState, Module, CargoItem } from "@/game/types";
import { playSound } from "@/sounds";
import { createModuleFromShopItem } from "@/game/modules/createModuleFromShopItem";
import { RESEARCH_TREE } from "@/game/constants/research";

/**
 * Результат проверки позиции
 */
interface PositionCheck {
    /** Позиция занята */
    isOccupied: boolean;
    /** Модуль, занимающий позицию (если есть) */
    occupyingModule?: Module;
}

/**
 * Проверяет, занята ли позиция другим модулем
 * @param state - Текущее состояние игры
 * @param x - Координата X
 * @param y - Координата Y
 * @param width - Ширина модуля
 * @param height - Высота модуля
 * @returns Результат проверки
 */
const checkPositionOccupied = (
    state: GameStore,
    x: number,
    y: number,
    width: number,
    height: number,
): PositionCheck => {
    const occupyingModule = state.ship.modules.find(
        (m) =>
            !m.disabled &&
            m.health > 0 &&
            x < m.x + (m.width || 2) &&
            x + width > m.x &&
            y < m.y + (m.height || 2) &&
            y + height > m.y,
    );

    return {
        isOccupied: !!occupyingModule,
        occupyingModule,
    };
};

/**
 * Создаёт модуль из грузового элемента
 * @param cargoItem - Элемент груза
 * @param x - Координата X
 * @param y - Координата Y
 * @returns Новый модуль или null если нет данных
 */
const getExtraWeaponSlots = (state: GameStore): number =>
    state.research.researchedTechs.reduce((sum, techId) => {
        const tech = RESEARCH_TREE[techId];
        return (
            sum +
            tech.bonuses
                .filter((b: { type: string }) => b.type === "weapon_slots")
                .reduce((s: number, b: { value: number }) => s + b.value, 0)
        );
    }, 0);

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
        get().addLog("Ошибка: это не модуль!", "error");
        return;
    }

    const shopItem = cargoItem.module;

    // Проверка: позиция свободна
    const { isOccupied, occupyingModule } = checkPositionOccupied(
        state,
        x,
        y,
        shopItem.width ?? 2,
        shopItem.height ?? 2,
    );

    if (isOccupied) {
        get().addLog(
            `Место занято модулем "${occupyingModule?.name}"!`,
            "error",
        );
        return;
    }

    // Создание модуля
    const newModule = createModuleFromCargo(cargoItem, x, y, getExtraWeaponSlots(state));

    // Установка модуля
    if (newModule) {
        set((s) => ({
            ship: {
                ...s.ship,
                cargo: s.ship.cargo.filter((_, idx) => idx !== cargoIndex),
                modules: [...s.ship.modules, newModule],
            },
        }));
        get().addLog(
            `✅ Модуль "${cargoItem.module?.name || cargoItem.item}" установлен на позицию (${x}, ${y})!`,
            "info",
        );
        playSound("success");
        get().updateShipStats();
    }
};
