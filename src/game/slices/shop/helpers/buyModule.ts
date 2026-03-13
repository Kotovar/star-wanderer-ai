import type {
    GameState,
    GameStore,
    Module,
    SetState,
    ShopItem,
} from "@/game/types";
import { playSound } from "@/sounds";
import {
    MODULE_HEALTH_BY_LEVEL,
    MODULE_DEFENSE_BY_LEVEL,
    UNIQUE_MODULE_TYPES,
} from "../constants";

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
    const level = item.level ?? 1;

    return {
        id: state.ship.modules.length + 1,
        type: item.moduleType,
        name: item.name,
        x: 0,
        y: 0,
        width: item.width || 1,
        height: item.height || 1,
        level,
        maxHealth: item.maxHealth ?? MODULE_HEALTH_BY_LEVEL[level] ?? 100,
        health: item.maxHealth ?? MODULE_HEALTH_BY_LEVEL[level] ?? 100,
        defense: item.level === 4 ? 5 : (MODULE_DEFENSE_BY_LEVEL[level] ?? 1),
        // Свойства по типу модуля
        ...(item.moduleType === "reactor" && { power: item.power || 10 }),
        ...(item.moduleType === "engine" && {
            fuelEfficiency: item.fuelEfficiency ?? 10,
            consumption: item.consumption || 1,
        }),
        ...(item.moduleType === "drill" && {
            consumption: item.consumption || 1,
        }),
        ...(item.moduleType === "cargo" && {
            capacity: Math.floor((item.capacity || 50) * cargoBonus),
            consumption: item.consumption || 1,
        }),
        ...(item.moduleType === "fueltank" && {
            capacity: item.capacity || 100,
        }),
        ...(item.moduleType === "lab" && {
            consumption: item.consumption || 3,
            researchOutput: item.researchOutput || 5,
        }),
        ...(item.moduleType === "shield" && {
            shields: item.shields || 20,
            consumption: item.consumption || 3,
        }),
        ...(item.moduleType === "scanner" && {
            scanRange: item.scanRange || 3,
            consumption: item.consumption || 1,
        }),
        ...(item.moduleType === "lifesupport" && {
            oxygen: item.oxygen || 5,
            consumption: item.consumption || 2,
        }),
        ...(item.moduleType === "medical" && {
            healing: item.healing || 8,
            consumption: item.consumption || 2,
        }),
        ...(item.moduleType === "weaponbay" && {
            weapons: Array((item.width || 1) * (item.height || 1)).fill(null),
            consumption: item.consumption || 2,
        }),
        ...(item.moduleType === "cockpit" && { consumption: 1 }),
        // Дополнительные свойства
        ...(item.power !== undefined && { power: item.power }),
        ...(item.consumption !== undefined && {
            consumption: item.consumption,
        }),
        ...(item.defense !== undefined && { defense: item.defense }),
        ...(item.scanRange !== undefined && { scanRange: item.scanRange }),
        ...(item.oxygen !== undefined && { oxygen: item.oxygen }),
        ...(item.capacity !== undefined && { capacity: item.capacity }),
    };
};

/**
 * Проверяет, является ли позиция соседней с существующими модулями
 * @param x - Координата X
 * @param y - Координата Y
 * @param width - Ширина модуля
 * @param height - Высота модуля
 * @param existingModules - Существующие модули
 * @returns true если позиция соседняя
 */
const isAdjacentToExisting = (
    x: number,
    y: number,
    width: number,
    height: number,
    existingModules: Module[],
): boolean => {
    for (const existing of existingModules) {
        // Проверка всех 4 сторон
        // Верхняя сторона
        for (let dx = 0; dx < width; dx++) {
            if (
                y - 1 >= existing.y &&
                y - 1 < existing.y + existing.height &&
                x + dx >= existing.x &&
                x + dx < existing.x + existing.width
            ) {
                return true;
            }
        }
        // Нижняя сторона
        for (let dx = 0; dx < width; dx++) {
            if (
                y + height >= existing.y &&
                y + height < existing.y + existing.height &&
                x + dx >= existing.x &&
                x + dx < existing.x + existing.width
            ) {
                return true;
            }
        }
        // Левая сторона
        for (let dy = 0; dy < height; dy++) {
            if (
                x - 1 >= existing.x &&
                x - 1 < existing.x + existing.width &&
                y + dy >= existing.y &&
                y + dy < existing.y + existing.height
            ) {
                return true;
            }
        }
        // Правая сторона
        for (let dy = 0; dy < height; dy++) {
            if (
                x + width >= existing.x &&
                x + width < existing.x + existing.width &&
                y + dy >= existing.y &&
                y + dy < existing.y + existing.height
            ) {
                return true;
            }
        }
    }
    return false;
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
                    isAdjacentToExisting(
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

    playSound("success");
};
