import { SECTOR_GRID_CONFIG } from "./config";
import type { Location } from "../types";

// Константы для расчёта позиций
const DISTANCE_SCALE = 0.45; // Масштаб для нормализации дистанции
const MIN_DISTANCE_RATIO = 0.3; // Минимальная дистанция (избегать центра)
const MAX_DISTANCE_RATIO = 0.92; // Максимальная дистанция (избегать краёв)
const FALLBACK_DISTANCE_BASE = 0.95; // Базовая дистанция для fallback-размещения
const FALLBACK_DISTANCE_VARIANCE = 0.1; // Разброс для fallback-размещения
const TWO_PI = Math.PI * 2;
const HALF = 0.5;

/**
 * Распределяет локации по сетке в секторе и преобразует координаты в полярные.
 *
 * Функция размещает локации равномерно по ячейкам сетки (5×5), исключая центральную зону
 * при наличии звезды. Каждая локация получает случайную позицию внутри своей ячейки
 * (с отступами для предотвращения наложения). Координаты преобразуются из декартовых
 * в полярные (distanceRatio, angle) для отображения на круговой карте сектора.
 *
 * @param locations - Массив локаций для размещения. Модифицируется напрямую (in-place).
 * @param hasCentralStar - Если true, центральные ячейки исключаются (звезда занимает центр).
 *
 * @example
 * ```typescript
 * const locations = [{ name: "Planet A" }, { name: "Station B" }];
 * assignGridPositions(locations, true);
 * // locations теперь имеют distanceRatio и angle для каждой локации
 * ```
 */
export const assignGridPositions = (
    locations: Location[],
    hasCentralStar: boolean,
): void => {
    const availableCells: { row: number; col: number }[] = [];
    const centerCell = Math.floor(SECTOR_GRID_CONFIG.gridSize / 2);

    // Сбор доступных ячеек
    for (let row = 0; row < SECTOR_GRID_CONFIG.gridSize; row++) {
        for (let col = 0; col < SECTOR_GRID_CONFIG.gridSize; col++) {
            if (
                hasCentralStar &&
                Math.sqrt((row - centerCell) ** 2 + (col - centerCell) ** 2) <=
                    SECTOR_GRID_CONFIG.centerExclusionRadius
            ) {
                continue;
            }
            availableCells.push({ row, col });
        }
    }

    // Перемешивание ячеек (алгоритм Fisher-Yates)
    for (let i = availableCells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableCells[i], availableCells[j]] = [
            availableCells[j],
            availableCells[i],
        ];
    }

    // Размещение локаций по ячейкам
    locations.forEach((loc, index) => {
        if (index >= availableCells.length) {
            // Резервное размещение за пределами сетки
            loc.distanceRatio =
                FALLBACK_DISTANCE_BASE +
                Math.random() * FALLBACK_DISTANCE_VARIANCE;
            loc.angle = (index * TWO_PI) / locations.length;
            return;
        }

        const cell = availableCells[index];
        const cellSize = 1 / SECTOR_GRID_CONFIG.gridSize;

        // Центр ячейки в нормализованных координатах (-0.5 до 0.5)
        const cellCenterX =
            (cell.col + HALF) / SECTOR_GRID_CONFIG.gridSize - HALF;
        const cellCenterY =
            (cell.row + HALF) / SECTOR_GRID_CONFIG.gridSize - HALF;

        // Случайное смещение внутри ячейки с учётом отступов
        const padding = SECTOR_GRID_CONFIG.cellPadding;
        const randomOffsetX = (Math.random() - HALF) * (cellSize - padding * 2);
        const randomOffsetY = (Math.random() - HALF) * (cellSize - padding * 2);

        const x = cellCenterX + randomOffsetX;
        const y = cellCenterY + randomOffsetY;

        // Преобразование в полярные координаты
        const distance = Math.sqrt(x * x + y * y);
        const angle = Math.atan2(y, x);
        const normalizedDistance = distance / DISTANCE_SCALE;

        // Ограничение дистанции допустимым диапазоном
        loc.distanceRatio = Math.max(
            MIN_DISTANCE_RATIO,
            Math.min(MAX_DISTANCE_RATIO, normalizedDistance),
        );
        loc.angle = angle < 0 ? angle + TWO_PI : angle;
    });
};
