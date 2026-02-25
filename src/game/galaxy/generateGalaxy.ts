import { populateContracts } from "../contracts";
import { assignGridPositions } from "../sectorGrid";
import type { Sector } from "../types";
import { TIER_CONFIG } from "./config";
import { TIER_NAMES } from "./consts";
import {
    ensureBlackHoles,
    ensureColonizedPlanet,
    ensureMinAnomalies,
    ensureStation,
} from "./ensure";
import { addEternalBoss, generateStar } from "./generate";
import { generateLocation } from "./getLocation";
import {
    calculateSectorAngle,
    calculateSectorRadius,
    getLocationCount,
} from "./utils";

// ============================================================================
// Основная функция генерации
// ============================================================================

/**
 * Генерирует галактику с секторами, распределёнными по трём уровням.
 *
 * Создаёт 26 секторов (8 + 8 + 10), расположенных концентрическими кольцами:
 * - Уровень 1: 8 секторов в центре (безопасные)
 * - Уровень 2: 8 секторов в середине (средняя опасность)
 * - Уровень 3: 10 секторов на окраине (опасные)
 *
 * Каждый сектор содержит:
 * - Звезду (одиночная, двойная, тройная или чёрная дыра)
 * - Набор локаций (планеты, станции, корабли, астероиды, штормы, аномалии)
 * - Гарантированные: минимум 1 аномалия, 1 колонизированная планета, 1 станция
 *
 * @returns Массив секторов галактики с назначенными локациями и координатами
 *
 * @example
 * ```typescript
 * const galaxy = generateGalaxy();
 * console.log(`Сгенерировано ${galaxy.length} секторов`);
 * ```
 */
export const generateGalaxy = (): Sector[] => {
    const sectors: Sector[] = [];
    let sectorIdx = 0;

    // Генерация секторов по уровням
    TIER_CONFIG.forEach(({ tier, count, baseDanger, radiusRatio }) => {
        for (let i = 0; i < count; i++) {
            const angle = calculateSectorAngle(i, count, tier);
            const actualRadius = calculateSectorRadius(radiusRatio);
            const star = generateStar(tier);
            const isBlackHole = star.type === "blackhole";

            const sector: Sector = {
                id: sectorIdx,
                name: `${TIER_NAMES[sectorIdx % TIER_NAMES.length]}-${tier}`,
                danger: baseDanger + Math.floor(Math.random() * 2),
                distance: tier,
                tier,
                locations: [],
                mapAngle: angle,
                mapRadius: actualRadius,
                star,
            };

            // Генерация локаций
            const numLocations = getLocationCount(tier, isBlackHole);
            for (let j = 0; j < numLocations; j++) {
                sector.locations.push(
                    generateLocation(
                        sectorIdx,
                        j,
                        tier,
                        baseDanger,
                        isBlackHole,
                    ),
                );
            }

            // Обеспечение минимальных требований
            ensureMinAnomalies(sector, tier);

            if (!isBlackHole) {
                ensureColonizedPlanet(sector);
                ensureStation(sector);
            } else {
                addEternalBoss(sector);
            }

            // Позиционирование локаций на сетке
            assignGridPositions(sector.locations, true);

            sectors.push(sector);
            sectorIdx++;
        }
    });

    // Постобработка
    populateContracts(sectors);
    ensureBlackHoles(sectors);

    return sectors;
};
