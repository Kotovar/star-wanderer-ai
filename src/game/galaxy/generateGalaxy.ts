import { populateContracts, populateShipQuests } from "../contracts";
import { assignGridPositions } from "../sectorGrid";
import type { Sector } from "../types";
import { TIER_CONFIG } from "./config";
import { getSectorNameKey } from "./consts";
import {
    ensureBlackHoles,
    ensureBosses,
    ensureColonizedPlanet,
    ensureDiplomaticStation,
    ensureMinAnomalies,
    ensureStation,
    ensureStationAnchors,
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
import type { RunProfile } from "./runProfiles";

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
 * - Без профиля и для обычных профилей: минимум 1 аномалия, 1 колонизированная планета, 1 станция
 * - Для `broken_trade_lanes`: станции задаются общими anchors по тирам
 * - Гарантированные боссы: по одному для тиров 1 и 2, Оракул в тире 4 и Вечный у чёрной дыры
 *
 * @returns Массив секторов галактики с назначенными локациями и координатами
 */
export const generateGalaxy = (profile: RunProfile | null = null): Sector[] => {
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
                name: getSectorNameKey(sectorIdx, tier),
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
                        profile?.id === "war_spiral" && sectorIdx === 0
                            ? undefined
                            : profile ?? undefined,
                    ),
                );
            }

            // Обеспечение минимальных требований
            ensureMinAnomalies(sector, tier);

            if (!isBlackHole) {
                ensureColonizedPlanet(sector);
                if (!profile || profile.id !== "broken_trade_lanes") {
                    ensureStation(sector);
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
    ensureBosses(sectors, 1);
    ensureBosses(sectors, 2);
    ensureBosses(sectors, 3);

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

    if (profile) {
        for (const tier of profile.clusters.tiers) {
            const clusterSectors = sectors
                .filter(
                    (sector) =>
                        sector.tier === tier && sector.star.type !== "blackhole",
                )
                .filter((sector) => profile.id !== "war_spiral" || sector.id !== 0)
                .slice(0, profile.clusters.sectorsPerTier);

            for (const sector of clusterSectors) {
                for (const [index, type] of profile.clusters.types.entries()) {
                    sector.locations.push(
                        generateLocation(
                            sector.id,
                            10_000 + sector.id * 10 + index,
                            sector.tier,
                            false,
                            sector.star.type,
                            profile,
                            type,
                        ),
                    );
                }
            }
        }

    }

    ensureStationAnchors(sectors, profile?.stationAnchorsByTier ?? {
        1: 2,
        2: 2,
        3: 2,
        4: 2,
    });

    // Гарантируем верфь и медицинскую станцию в каждом тире
    ensureStationTypes(sectors, 1);
    ensureStationTypes(sectors, 2);
    ensureStationTypes(sectors, 3);
    ensureStationTypes(sectors, 4);

    // Гарантируем одну дипломатическую станцию в тире 1
    ensureDiplomaticStation(sectors);

    sectors.forEach((sector) => assignGridPositions(sector.locations, true));

    // Постобработка
    populateContracts(sectors, profile);
    populateShipQuests(sectors);
    return sectors;
};
