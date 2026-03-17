import { populateContracts } from "../contracts";
import { assignGridPositions } from "../sectorGrid";
import type { Sector } from "../types";
import { TIER_CONFIG } from "./config";
import { TIER_NAMES } from "./consts";
import {
    ensureBlackHoles,
    ensureBoss,
    ensureColonizedPlanet,
    ensureMinAnomalies,
    ensureStation,
    ensureStationTypes,
} from "./ensure";
import { addEternalBoss, addRandomBossToBlackHole, generateStar } from "./generate";
import { generateLocation } from "./getLocation";
import {
    calculateSectorAngle,
    calculateSectorRadius,
    getLocationCount,
} from "./utils";
import { bossDistribution } from "./bossDistribution";

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
 * - Гарантированные боссы: по одному уникальному боссу для каждого тира (1, 2, 3)
 *
 * @returns Массив секторов галактики с назначенными локациями и координатами
 */
export const generateGalaxy = (): Sector[] => {
    // Reset boss distribution for new game
    bossDistribution.reset();

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
                ensureBoss(sector);
            }

            // Позиционирование локаций на сетке
            assignGridPositions(sector.locations, true);

            sectors.push(sector);
            sectorIdx++;
        }
    });

    // Постобработка ЧД-секторов: 1 The Eternal на всю галактику, остальные — случайный босс
    const bhSectors = sectors.filter((s) => s.star?.type === "blackhole");
    if (bhSectors.length > 0) {
        const eternalIdx = Math.floor(Math.random() * bhSectors.length);
        bhSectors.forEach((sector, i) => {
            const hasBoss = sector.locations.some((l) => l.type === "boss");
            if (i === eternalIdx) {
                addEternalBoss(sector);
            } else if (!hasBoss) {
                addRandomBossToBlackHole(sector);
            }
        });
    }

    // Гарантируем верфь и медицинскую станцию в каждом тире
    ensureStationTypes(sectors, 1);
    ensureStationTypes(sectors, 2);
    ensureStationTypes(sectors, 3);

    // Постобработка
    populateContracts(sectors);
    ensureBlackHoles(sectors);

    return sectors;
};
