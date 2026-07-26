import { populateContracts, populateShipQuests } from "../contracts";
import { assignGridPositions } from "../sectorGrid";
import type { Sector } from "../types";
import { TIER_CONFIG } from "./config";
import { TIER_NAMES } from "./consts";
import {
    ensureBlackHoles,
    ensureBoss,
    ensureColonizedPlanet,
    ensureDiplomaticStation,
    ensureMinAnomalies,
    ensureStation,
    ensureStationTypes,
} from "./ensure";
import {
    addRandomBossToBlackHole,
    generateSpaceMonster,
    generateStar,
} from "./generate";
import { generateLocation } from "./getLocation";
import {
    calculateSectorAngle,
    calculateSectorRadius,
    getLocationCount,
} from "./utils";
import { bossDistribution } from "./bossDistribution";
import { ANCIENT_BOSSES } from "@/game/constants/bosses";
import { placeReservedBoss } from "./reservedBosses";

// ============================================================================
// Основная функция генерации
// ============================================================================

/**
 * Генерирует галактику с секторами, распределёнными по четырём уровням.
 *
 * Создаёт 42 сектора (12 + 12 + 15 + 3), расположенных концентрическими кольцами.
 *
 * Каждый сектор содержит:
 * - Звезду (одиночная, двойная, тройная или чёрная дыра)
 * - Набор локаций (планеты, станции, корабли, астероиды, штормы, аномалии)
 * - Гарантированные: минимум 1 аномалия, 1 колонизированная планета, 1 станция
 * - Гарантированные боссы: по одному для тиров 1 и 2, Оракул в тире 4 и Вечный у чёрной дыры
 *
 * @returns Массив секторов галактики с назначенными локациями и координатами
 */
export const generateGalaxy = (): Sector[] => {
    // Reset boss distribution for new game
    bossDistribution.reset();
    bossDistribution.reserveBosses("void_oracle", "the_eternal");

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
                        isBlackHole,
                        star.type,
                    ),
                );
            }

            // Обеспечение минимальных требований
            ensureMinAnomalies(sector, tier);

            if (!isBlackHole) {
                ensureColonizedPlanet(sector);
                ensureStation(sector);
                if (sector.id !== 0) {
                    ensureBoss(sector);
                }
            }

            sector.locations.push(
                generateSpaceMonster(sectorIdx, tier, star.type),
            );

            // Позиционирование локаций на сетке
            assignGridPositions(sector.locations, true);

            sectors.push(sector);
            sectorIdx++;
        }
    });

    // Минимум две чёрные дыры нужен до размещения Вечного.
    ensureBlackHoles(sectors);

    // Оракул — единственный финальный босс на Дальнем рубеже.
    const voidOracle = ANCIENT_BOSSES.find((boss) => boss.id === "void_oracle");
    if (
        voidOracle &&
        placeReservedBoss(sectors, voidOracle, {
            tier: 4,
            idSuffix: "void-oracle",
        })
    ) {
        bossDistribution.markBossAsUsed(voidOracle.id);
    }

    // Постобработка ЧД-секторов: один Вечный на всю галактику, остальные — случайный босс.
    const bhSectors = sectors.filter(
        (s) => s.id !== 0 && s.star?.type === "blackhole",
    );
    const eternal = ANCIENT_BOSSES.find((boss) => boss.id === "the_eternal");
    if (
        eternal &&
        placeReservedBoss(sectors, eternal, {
            blackHole: true,
            idSuffix: "eternal",
        })
    ) {
        bossDistribution.markBossAsUsed(eternal.id);
    }
    bhSectors.forEach((sector) => {
        if (!sector.locations.some((location) => location.type === "boss")) {
            addRandomBossToBlackHole(sector);
        }
    });

    // Гарантируем верфь и медицинскую станцию в каждом тире
    ensureStationTypes(sectors, 1);
    ensureStationTypes(sectors, 2);
    ensureStationTypes(sectors, 3);

    // Гарантируем одну дипломатическую станцию в тире 1
    ensureDiplomaticStation(sectors);

    // Постобработка
    populateContracts(sectors);
    populateShipQuests(sectors);
    return sectors;
};
