import type { Module } from "@/game/types";

/**
 * Проверяет, соседствуют ли два модуля (имеют общую грань, не только угол)
 * @param mod1 - Первый модуль
 * @param mod2 - Второй модуль
 * @returns true если модули соседствуют
 */
export const areModulesAdjacent = (mod1: Module, mod2: Module): boolean => {
    // Проверка горизонтального соседства (рядом по X)
    if (mod1.y < mod2.y + mod2.height && mod1.y + mod1.height > mod2.y) {
        // mod1 слева от mod2
        if (mod1.x + mod1.width === mod2.x) return true;
        // mod1 справа от mod2
        if (mod2.x + mod2.width === mod1.x) return true;
    }

    // Проверка вертикального соседства (рядом по Y)
    if (mod1.x < mod2.x + mod2.width && mod1.x + mod1.width > mod2.x) {
        // mod1 выше mod2
        if (mod1.y + mod1.height === mod2.y) return true;
        // mod1 ниже mod2
        if (mod2.y + mod2.height === mod1.y) return true;
    }

    return false;
};

/**
 * Проверяет, соседствует ли позиция с любым из существующих модулей
 * @param x - Координата X позиции
 * @param y - Координата Y позиции
 * @param width - Ширина модуля
 * @param height - Высота модуля
 * @param existingModules - Существующие модули
 * @returns true если позиция соседствует с любым модулем
 */
export const isPositionAdjacentToModules = (
    x: number,
    y: number,
    width: number,
    height: number,
    existingModules: Module[],
) => {
    // Проверяем соседство с каждым модулем
    for (const existing of existingModules) {
        // Создаём временный модуль для проверки
        const tempModule = {
            x,
            y,
            width,
            height,
        };

        if (areModulesAdjacent(tempModule as Module, existing)) {
            return true;
        }
    }

    return false;
};
