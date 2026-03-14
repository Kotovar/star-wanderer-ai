import type {
    GameState,
    GameStore,
    Module,
    SetState,
    ShopItem,
} from "@/game/types";
import { playSound } from "@/sounds";
import { isPositionAdjacentToModules } from "@/game/modules/adjacency";
import { createModuleFromShopItem } from "@/game/modules/createModuleFromShopItem";
import { UNIQUE_MODULE_TYPES } from "../constants";

/**
 * Позиция на сетке
 */
interface GridPosition {
    x: number;
    y: number;
}

/**
 * Проверяет, можно ли иметь только один экземпляр модуля
 * @param item - Товар для покупки
 * @param state - Текущее состояние игры
 * @returns true если модуль уникальный и уже есть на корабле
 */
const isUniqueModuleRestricted = (
    item: ShopItem,
    state: GameState,
): boolean => {
    // Проверка для обычных сканеров и буров (можно иметь только 1)
    for (const moduleType of UNIQUE_MODULE_TYPES) {
        if (item.moduleType !== moduleType) continue;

        const hasModule = state.ship.modules.some((m) => m.type === moduleType);

        if (!hasModule) continue;
    }

    return false;
};

/**
 * Создаёт новый модуль из товара
 * @param item - Товар для покупки
 * @param state - Текущее состояние игры
 * @param cargoBonus - Бонус грузового отсека от станции
 * @returns Новый модуль
 */
const createModuleFromItem = (
    item: ShopItem,
    state: GameState,
    cargoBonus: number,
): Module => {
    return createModuleFromShopItem(item, {
        x: 0,
        y: 0,
        cargoBonus,
        generateId: () => state.ship.modules.length + 1,
    });
};

/**
 * Находит лучшую позицию для нового модуля
 * @param module - Модуль для размещения
 * @param gridSize - Размер сетки корабля
 * @param existingModules - Существующие модули
 * @param canPlaceModule - Функция проверки возможности размещения
 * @returns Лучшая позиция или null
 */
const findBestPosition = (
    module: Module,
    gridSize: number,
    existingModules: Module[],
    canPlaceModule: (mod: Module, x: number, y: number) => boolean,
): GridPosition | null => {
    // Первый модуль - размещаем в центре
    if (existingModules.length === 0) {
        const centerPos = Math.floor(gridSize / 2);
        if (canPlaceModule(module, centerPos, centerPos)) {
            return { x: centerPos, y: centerPos };
        }
    }

    const adjacentPositions: GridPosition[] = [];
    const otherPositions: GridPosition[] = [];

    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            if (canPlaceModule(module, x, y)) {
                if (
                    isPositionAdjacentToModules(
                        x,
                        y,
                        module.width,
                        module.height,
                        existingModules,
                    )
                ) {
                    adjacentPositions.push({ x, y });
                } else {
                    otherPositions.push({ x, y });
                }
            }
        }
    }

    // Предпочитаем позиции рядом с существующими модулями
    if (adjacentPositions.length > 0) {
        return adjacentPositions[0];
    }
    if (otherPositions.length > 0) {
        return otherPositions[0];
    }
    return null;
};

/**
 * Покупка нового модуля
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 * @param item - Товар для покупки
 * @param stationId - ID станции
 * @param inv - Инвентарь станции
 * @param bought - Количество купленного товара
 */
export const buyModule = (
    set: SetState,
    get: () => GameStore,
    item: ShopItem,
    stationId: string,
    inv: Record<string, number>,
    bought: number,
): void => {
    const state = get();

    // Проверка уникальности модуля
    if (isUniqueModuleRestricted(item, state)) {
        get().addLog("Можно иметь только один такой модуль!", "error");
        return;
    }

    // Получение бонуса станции
    const stationConfig = state.currentLocation?.stationConfig;
    const cargoBonus = stationConfig?.cargoBonus ?? 1;

    // Создание модуля
    const newMod = createModuleFromItem(item, state, cargoBonus);

    // Поиск позиции
    const bestPosition = findBestPosition(
        newMod,
        state.ship.gridSize,
        state.ship.modules,
        get().canPlaceModule,
    );

    if (!bestPosition) {
        get().addLog("Нет места!", "error");
        return;
    }

    newMod.x = bestPosition.x;
    newMod.y = bestPosition.y;

    set((s) => ({
        credits: s.credits - item.price,
        ship: {
            ...s.ship,
            modules: [...s.ship.modules, newMod],
        },
        stationInventory: {
            ...s.stationInventory,
            [stationId]: { ...inv, [item.id]: bought + 1 },
        },
    }));

    get().addLog(`Установлен: ${item.name}`, "info");

    // Обновление статистики для топливного бака
    if (item.moduleType === "fueltank") {
        get().updateShipStats();
    }

    playSound("upgrade");
};
