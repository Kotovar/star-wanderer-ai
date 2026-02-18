import { create } from "zustand";
import type {
    GameState,
    Sector,
    Location,
    Contract,
    Module,
    CrewMember,
    CombatState,
    ScoutingMission,
    ShopItem,
    Artifact,
    EnemyModule,
    RaceId,
    BattleResult,
} from "./types";
import {
    SECTOR_NAMES,
    PLANET_TYPES,
    STATION_TYPES,
    ENEMY_TYPES,
    TRADE_GOODS,
    WEAPON_TYPES,
    CREW_TRAITS,
    generateCrewTraits,
    getRandomName,
    getRandomRaceName,
    PROFESSION_NAMES,
    ANCIENT_ARTIFACTS,
    ANCIENT_BOSSES,
    getBossById,
    getRandomBossForTier,
    getRandomUndiscoveredArtifact,
    determineSignalOutcome,
    RACES,
    getRandomRace,
} from "./constants";

// Initial ship modules
const initialModules: Module[] = [
    {
        id: 1,
        type: "reactor",
        name: "Реактор",
        x: 1,
        y: 1,
        width: 1,
        height: 1,
        power: 10,
        health: 100,
        level: 1,
    },
    {
        id: 2,
        type: "cockpit",
        name: "Кабина",
        x: 2,
        y: 1,
        width: 1,
        height: 1,
        consumption: 1,
        health: 100,
        level: 1,
    },
    {
        id: 3,
        type: "lifesupport",
        name: "Жизнеобеспечение",
        x: 1,
        y: 2,
        width: 1,
        height: 1,
        consumption: 2,
        health: 100,
        oxygen: 5,
        level: 1,
    },
    {
        id: 4,
        type: "cargo",
        name: "Склад",
        x: 2,
        y: 2,
        width: 1,
        height: 1,
        consumption: 1,
        capacity: 50,
        health: 100,
        level: 1,
    },
    {
        id: 5,
        type: "engine",
        name: "Двигатель",
        x: 3,
        y: 1,
        width: 1,
        height: 1,
        consumption: 1,
        health: 100,
        level: 1,
        fuelEfficiency: 10,
    },
    {
        id: 6,
        type: "fueltank",
        name: "Топливный бак",
        x: 3,
        y: 2,
        width: 1,
        height: 1,
        health: 100,
        level: 1,
        capacity: 100,
    },
];

// Starting fuel
const STARTING_FUEL = 100;

// Initial crew - pilot in cockpit (id: 2), others in lifesupport (id: 3)
// Humans have +5 health from race bonus, so maxHealth = 105
const initialCrew: CrewMember[] = [
    {
        id: 1,
        name: "Капитан Иванов",
        race: "human",
        profession: "pilot",
        level: 1,
        exp: 0,
        health: 105,
        maxHealth: 105,
        happiness: 80,
        assignment: null,
        assignmentEffect: null,
        combatAssignment: null,
        combatAssignmentEffect: null,
        traits: [],
        moduleId: 2,
        movedThisTurn: false,
    },
    {
        id: 2,
        name: "Инженер Петрова",
        race: "human",
        profession: "engineer",
        level: 1,
        exp: 0,
        health: 105,
        maxHealth: 105,
        happiness: 75,
        assignment: null,
        assignmentEffect: null,
        combatAssignment: null,
        combatAssignmentEffect: null,
        traits: [],
        moduleId: 3,
        movedThisTurn: false,
    },
    {
        id: 3,
        name: "Доктор Сидоров",
        race: "human",
        profession: "medic",
        level: 1,
        exp: 0,
        health: 105,
        maxHealth: 105,
        happiness: 70,
        assignment: null,
        assignmentEffect: null,
        combatAssignment: null,
        combatAssignmentEffect: null,
        traits: [],
        moduleId: 3,
        movedThisTurn: false,
    },
];

// Grid-based placement configuration
const GRID_SIZE = 5; // 5x5 grid = 25 cells for better spacing (larger cells)
const CELL_PADDING = 0.15; // Padding inside each cell (to avoid edges and overlap)
const CENTER_EXCLUSION_RADIUS = 0.8; // Exclude cells within this radius from center (in cells)

// Helper function: Check if two modules are adjacent (touching sides)
const areModulesAdjacent = (m1: Module, m2: Module): boolean => {
    // Check if m1 is to the left/right of m2
    if (m1.x + m1.width === m2.x || m2.x + m2.width === m1.x) {
        // Check vertical overlap
        if (m1.y < m2.y + m2.height && m1.y + m1.height > m2.y) {
            return true;
        }
    }
    // Check if m1 is above/below m2
    if (m1.y + m1.height === m2.y || m2.y + m2.height === m1.y) {
        // Check horizontal overlap
        if (m1.x < m2.x + m2.width && m1.x + m1.width > m2.x) {
            return true;
        }
    }
    return false;
};

// Generate grid-based positions for locations in a sector
const assignGridPositions = (
    locations: Location[],
    hasCentralStar: boolean,
): void => {
    // Create list of available cells
    const availableCells: { row: number; col: number }[] = [];
    const centerCell = Math.floor(GRID_SIZE / 2);

    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            // Skip cells near center if there's a central star (create exclusion zone)
            if (hasCentralStar) {
                const distFromCenter = Math.sqrt(
                    (row - centerCell) ** 2 + (col - centerCell) ** 2,
                );
                if (distFromCenter <= CENTER_EXCLUSION_RADIUS) continue;
            }
            availableCells.push({ row, col });
        }
    }

    // Shuffle available cells using Fisher-Yates with seeded randomness
    for (let i = availableCells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableCells[i], availableCells[j]] = [
            availableCells[j],
            availableCells[i],
        ];
    }

    // Assign each location to a cell
    locations.forEach((loc, index) => {
        if (index >= availableCells.length) {
            // Fallback: place outside grid if too many locations
            const angle = (index * Math.PI * 2) / locations.length;
            loc.distanceRatio = 0.95 + Math.random() * 0.1;
            loc.angle = angle;
            return;
        }

        const cell = availableCells[index];
        const cellSize = 1 / GRID_SIZE;

        // Calculate cell boundaries (in normalized 0-1 space, centered at 0,0)
        // We need to map from grid coordinates to polar coordinates
        // Grid: (0,0) is top-left, we want center to be (0,0)
        const cellCenterX = (cell.col + 0.5) / GRID_SIZE - 0.5; // -0.5 to 0.5
        const cellCenterY = (cell.row + 0.5) / GRID_SIZE - 0.5; // -0.5 to 0.5

        // Add randomness inside the cell (with padding)
        const randomOffsetX =
            (Math.random() - 0.5) * (cellSize - CELL_PADDING * 2);
        const randomOffsetY =
            (Math.random() - 0.5) * (cellSize - CELL_PADDING * 2);

        const x = cellCenterX + randomOffsetX;
        const y = cellCenterY + randomOffsetY;

        // Convert to polar coordinates
        const distance = Math.sqrt(x * x + y * y);
        const angle = Math.atan2(y, x);

        // Normalize distance to 0-1 range
        // Scale to fill the sector better, pushing objects towards edges
        const normalizedDistance = distance / 0.45; // Normalize for better spread

        loc.distanceRatio = Math.max(0.3, Math.min(0.92, normalizedDistance));
        loc.angle = angle < 0 ? angle + Math.PI * 2 : angle;
    });
};

// Generate galaxy sectors with tier-based circular structure
const generateGalaxy = (): Sector[] => {
    const sectors: Sector[] = [];

    // Tier configuration: [tier, count, baseDanger]
    const tierConfig: {
        tier: 1 | 2 | 3;
        count: number;
        baseDanger: number;
        radiusRatio: number;
    }[] = [
        { tier: 1, count: 8, baseDanger: 1, radiusRatio: 0.3 }, // Center - safe
        { tier: 2, count: 8, baseDanger: 3, radiusRatio: 0.6 }, // Middle - medium
        { tier: 3, count: 10, baseDanger: 5, radiusRatio: 0.9 }, // Outer - dangerous
    ];

    const tierNames = [
        "Альфа",
        "Бета",
        "Гамма",
        "Дельта",
        "Эпсилон",
        "Дзета",
        "Эта",
        "Тета",
        "Йота",
        "Каппа",
        "Лямбда",
        "Мю",
        "Ню",
        "Кси",
        "Омикрон",
    ];
    let sectorIdx = 0;

    tierConfig.forEach(({ tier, count, baseDanger, radiusRatio }) => {
        for (let i = 0; i < count; i++) {
            const angle =
                (i / count) * Math.PI * 2 + (tier === 1 ? 0 : Math.PI / count);
            const radiusVariation = 0.1;
            const actualRadius =
                radiusRatio + (Math.random() - 0.5) * radiusVariation;

            const sector: Sector = {
                id: sectorIdx,
                name: `${tierNames[sectorIdx % tierNames.length]}-${tier}`,
                danger: baseDanger + Math.floor(Math.random() * 2),
                distance: tier,
                tier,
                locations: [],
                mapAngle: angle,
                mapRadius: actualRadius,
            };

            // Generate star based on tier
            const starRoll = Math.random();
            if (tier === 3 && starRoll < 0.15) {
                sector.star = { type: "blackhole", name: "Чёрная дыра" };
            } else if (tier === 2 && starRoll < 0.2) {
                sector.star = { type: "triple", name: "Тройная звезда" };
            } else if (starRoll < 0.3 + tier * 0.1) {
                sector.star = { type: "double", name: "Двойная звезда" };
            } else {
                sector.star = { type: "single", name: "Одиночная звезда" };
            }

            const isBlackhole = sector.star.type === "blackhole";

            // Number of locations based on tier
            let numLocations: number;
            if (tier === 1) {
                numLocations = Math.floor(Math.random() * 3) + 6; // 6-8 locations
            } else if (tier === 2) {
                numLocations = Math.floor(Math.random() * 4) + 8; // 8-11 locations
            } else {
                numLocations = Math.floor(Math.random() * 5) + 8; // 8-12 locations
            }
            if (isBlackhole) numLocations = Math.floor(Math.random() * 3) + 5;

            for (let j = 0; j < numLocations; j++) {
                const locType = Math.random();
                const locId = `${sectorIdx}-${j}`;

                // Adjust location type chances based on tier
                const stationChance =
                    tier === 1 ? 0.18 : tier === 2 ? 0.13 : 0.07;
                const friendlyChance =
                    tier === 1 ? 0.08 : tier === 2 ? 0.06 : 0.04; // Reduced friendly ships
                const planetChance = 0.2;
                const enemyChance =
                    tier === 1 ? 0.15 : tier === 2 ? 0.25 : 0.32; // Increased enemy ships
                const asteroidChance = 0.1; // Asteroid belts
                const stormChance = tier === 1 ? 0.05 : tier === 2 ? 0.1 : 0.13; // Storms more common in dangerous tiers
                const distressChance = 0.07; // Distress signals
                const bossChance = tier === 1 ? 0.02 : tier === 2 ? 0.04 : 0.06; // Ancient bosses - rare

                if (!isBlackhole && locType < stationChance) {
                    const stationType =
                        STATION_TYPES[
                            Math.floor(Math.random() * STATION_TYPES.length)
                        ];
                    const stationId = `station-${sectorIdx}-${j}`;
                    const dominantRace = getRandomRace([]); // Random race for station population
                    sector.locations.push({
                        id: locId,
                        stationId,
                        type: "station",
                        name: `Станция ${String.fromCharCode(65 + (j % 26))}`,
                        stationType,
                        dominantRace,
                        population: 50 + Math.floor(Math.random() * 200), // 50k - 250k
                    });
                } else if (
                    !isBlackhole &&
                    locType >= stationChance &&
                    locType < stationChance + friendlyChance
                ) {
                    const shipTypes = [
                        {
                            name: "Странствующий Торговец",
                            greeting:
                                "Торговец приветствует вас. У него есть редкие товары.",
                            hasTrader: true,
                            hasCrew: false,
                            hasQuest: false,
                        },
                        {
                            name: "Корабль Наёмников",
                            greeting:
                                "Опытные наёмники предлагают свои услуги.",
                            hasTrader: false,
                            hasCrew: true,
                            hasQuest: false,
                        },
                        {
                            name: "Курьерский Фрегат",
                            greeting:
                                "Капитан фрегата ищет надёжного партнёра для срочной доставки.",
                            hasTrader: false,
                            hasCrew: false,
                            hasQuest: true,
                        },
                        {
                            name: "Торговая Баржа",
                            greeting:
                                "Массивная баржа дрейфует в космосе. Экипаж готов торговать.",
                            hasTrader: true,
                            hasCrew: Math.random() < 0.5,
                            hasQuest: false,
                        },
                        {
                            name: "Разведывательный Зонд",
                            greeting:
                                "Автоматизированный зонд предлагает обмен данными на ресурсы.",
                            hasTrader: true,
                            hasCrew: false,
                            hasQuest: Math.random() < 0.4,
                        },
                        {
                            name: "Корабль Исследователей",
                            greeting:
                                "Учёные-исследователи ищут помощи в своей экспедиции.",
                            hasTrader: false,
                            hasCrew: true,
                            hasQuest: true,
                        },
                    ];
                    const selectedType =
                        shipTypes[Math.floor(Math.random() * shipTypes.length)];
                    const shipRace = getRandomRace([]); // Assign random race to ship
                    const raceInfo = RACES[shipRace];
                    // Format: "Human Странствующий Торговец" or "Ксеноморфов-симбионтов Курьерский Фрегат"
                    const shipName = `${raceInfo.adjective || raceInfo.name} ${selectedType.name}`;
                    sector.locations.push({
                        id: locId,
                        type: "friendly_ship",
                        name: shipName,
                        greeting: selectedType.greeting,
                        hasTrader: selectedType.hasTrader,
                        hasCrew: selectedType.hasCrew,
                        hasQuest: selectedType.hasQuest,
                        shipRace,
                    });
                } else if (
                    locType <
                    stationChance + friendlyChance + planetChance
                ) {
                    const planetType =
                        PLANET_TYPES[
                            Math.floor(Math.random() * PLANET_TYPES.length)
                        ];
                    const isEmpty = isBlackhole
                        ? true
                        : Math.random() < (tier === 1 ? 0.2 : 0.3 + tier * 0.1);

                    // Determine dominant race based on planet type and tier
                    let dominantRace: RaceId | undefined;
                    let population: number | undefined;

                    if (!isEmpty) {
                        // Inhabited planet - assign dominant race
                        dominantRace = getRandomRace([]);
                        population = 100 + Math.floor(Math.random() * 900); // 100k - 1M
                    }

                    sector.locations.push({
                        id: locId,
                        type: "planet",
                        name: `${String.fromCharCode(65 + (j % 26))}-${planetType.substring(0, 3)}`,
                        planetType,
                        isEmpty,
                        contracts: [],
                        scoutingAvailable: isEmpty,
                        dominantRace,
                        population,
                    });
                } else if (
                    locType <
                    stationChance + friendlyChance + planetChance + enemyChance
                ) {
                    const enemyType =
                        ENEMY_TYPES[
                            Math.floor(Math.random() * ENEMY_TYPES.length)
                        ];
                    const threat = Math.min(
                        3,
                        Math.max(
                            1,
                            baseDanger - 1 + Math.floor(Math.random() * 3),
                        ),
                    );
                    sector.locations.push({
                        id: locId,
                        type: "enemy",
                        name: enemyType,
                        enemyType,
                        threat: isBlackhole ? Math.min(3, threat + 1) : threat,
                    });
                } else if (
                    locType <
                    stationChance +
                        friendlyChance +
                        planetChance +
                        enemyChance +
                        asteroidChance
                ) {
                    // Asteroid belt
                    let asteroidTier: 1 | 2 | 3 | 4 = tier as 1 | 2 | 3;
                    // In tier 3, small chance (15%) for rare tier 4 asteroid belt (requires ancient drill)
                    if (tier === 3 && Math.random() < 0.15) {
                        asteroidTier = 4;
                    }
                    const resources = {
                        minerals:
                            (20 + Math.floor(Math.random() * 30)) *
                            asteroidTier,
                        rare: Math.floor(Math.random() * 5) * asteroidTier,
                        credits:
                            (50 + Math.floor(Math.random() * 100)) *
                            asteroidTier,
                    };
                    sector.locations.push({
                        id: locId,
                        type: "asteroid_belt",
                        name:
                            asteroidTier === 4
                                ? `★ Древний астероидный пояс`
                                : `Астероидный пояс ${asteroidTier}-го уровня`,
                        asteroidTier,
                        resources,
                        mined: false,
                    });
                } else if (
                    locType <
                    stationChance +
                        friendlyChance +
                        planetChance +
                        enemyChance +
                        asteroidChance +
                        stormChance
                ) {
                    // Storm / Radiation cloud
                    const stormTypes: Array<"radiation" | "ionic" | "plasma"> =
                        ["radiation", "ionic", "plasma"];
                    const stormType =
                        stormTypes[
                            Math.floor(Math.random() * stormTypes.length)
                        ];
                    const stormIntensity = tier as 1 | 2 | 3;
                    sector.locations.push({
                        id: locId,
                        type: "storm",
                        name:
                            stormType === "radiation"
                                ? "Радиационное облако"
                                : stormType === "ionic"
                                  ? "Ионный шторм"
                                  : "Плазменный шторм",
                        stormType,
                        stormIntensity,
                    });
                } else if (
                    locType <
                    stationChance +
                        friendlyChance +
                        planetChance +
                        enemyChance +
                        asteroidChance +
                        stormChance +
                        distressChance
                ) {
                    // Distress Signal - mini-event with random outcome
                    sector.locations.push({
                        id: locId,
                        type: "distress_signal",
                        name: "Сигнал бедствия",
                        signalResolved: false,
                    });
                } else if (
                    locType <
                    stationChance +
                        friendlyChance +
                        planetChance +
                        enemyChance +
                        asteroidChance +
                        stormChance +
                        distressChance +
                        bossChance
                ) {
                    // Ancient Boss - Relict of lost civilization
                    const boss = getRandomBossForTier(tier);
                    if (boss) {
                        sector.locations.push({
                            id: locId,
                            type: "ancient_boss",
                            name: boss.name,
                            bossId: boss.id,
                            bossDefeated: false,
                        });
                    } else {
                        // Fallback to anomaly if no boss available
                        sector.locations.push({
                            id: locId,
                            type: "anomaly",
                            name: "Аномалия",
                            anomalyType: Math.random() < 0.5 ? "good" : "bad",
                            anomalyTier: tier,
                            anomalyColor:
                                tier === 1
                                    ? "#00ff41"
                                    : tier === 2
                                      ? "#ffaa00"
                                      : "#ff0040",
                            requiresScientistLevel: tier,
                        });
                    }
                } else {
                    // Anomaly
                    const anomalyRoll = Math.random();
                    let anomalyTier =
                        tier === 1
                            ? 1
                            : tier === 2
                              ? Math.random() < 0.6
                                  ? 1
                                  : 2
                              : Math.random() < 0.3
                                ? 2
                                : 3;
                    let anomalyColor =
                        anomalyTier === 1
                            ? "#00ff41"
                            : anomalyTier === 2
                              ? "#ffaa00"
                              : "#ff0040";
                    if (isBlackhole) {
                        anomalyTier = Math.min(3, anomalyTier + 1);
                        anomalyColor = "#ff0040";
                    }
                    sector.locations.push({
                        id: locId,
                        type: "anomaly",
                        name: "Аномалия",
                        anomalyType: Math.random() < 0.5 ? "good" : "bad",
                        anomalyTier,
                        anomalyColor,
                        requiresScientistLevel: anomalyTier,
                    });
                }
            }

            // Ensure at least 1 anomaly
            const anomalyCount = sector.locations.filter(
                (l) => l.type === "anomaly",
            ).length;
            if (anomalyCount < 1) {
                const extraLocId = `${sectorIdx}-extra-anomaly`;
                sector.locations.push({
                    id: extraLocId,
                    type: "anomaly",
                    name: "Аномалия",
                    anomalyType: Math.random() < 0.5 ? "good" : "bad",
                    anomalyTier: tier,
                    anomalyColor:
                        tier === 1
                            ? "#00ff41"
                            : tier === 2
                              ? "#ffaa00"
                              : "#ff0040",
                    requiresScientistLevel: tier,
                });
            }

            // Ensure at least 1 colonized (inhabited) planet per sector (not in black hole sectors)
            if (!isBlackhole) {
                const colonizedPlanetCount = sector.locations.filter(
                    (l) => l.type === "planet" && !l.isEmpty,
                ).length;
                if (colonizedPlanetCount < 1) {
                    // Find an empty planet and make it colonized, or add a new one
                    const emptyPlanetIdx = sector.locations.findIndex(
                        (l) => l.type === "planet" && l.isEmpty,
                    );
                    if (emptyPlanetIdx >= 0) {
                        // Convert empty planet to colonized
                        const planet = sector.locations[emptyPlanetIdx];
                        const dominantRace = getRandomRace([]);
                        sector.locations[emptyPlanetIdx] = {
                            ...planet,
                            isEmpty: false,
                            dominantRace,
                            population: 100 + Math.floor(Math.random() * 900),
                            contracts: [],
                        };
                    } else {
                        // Add a new colonized planet
                        const planetType =
                            PLANET_TYPES[
                                Math.floor(Math.random() * PLANET_TYPES.length)
                            ];
                        const dominantRace = getRandomRace([]);
                        const extraLocId = `${sectorIdx}-extra-colony`;
                        sector.locations.push({
                            id: extraLocId,
                            type: "planet",
                            name: `${String.fromCharCode(67 + (sector.locations.length % 26))}-${planetType.substring(0, 3)}`,
                            planetType,
                            isEmpty: false,
                            dominantRace,
                            population: 100 + Math.floor(Math.random() * 900),
                            contracts: [],
                        });
                    }
                }
            }

            // Ensure at least 1 station per sector (not in black hole sectors)
            if (!isBlackhole) {
                const stationCount = sector.locations.filter(
                    (l) => l.type === "station",
                ).length;
                if (stationCount < 1) {
                    const stationType =
                        STATION_TYPES[
                            Math.floor(Math.random() * STATION_TYPES.length)
                        ];
                    const stationId = `station-${sectorIdx}-extra`;
                    const dominantRace = getRandomRace([]);
                    sector.locations.push({
                        id: `${sectorIdx}-extra-station`,
                        stationId,
                        type: "station",
                        name: `Станция ${String.fromCharCode(65 + (sector.locations.length % 26))}`,
                        stationType,
                        dominantRace,
                        population: 50 + Math.floor(Math.random() * 200),
                    });
                }
            }

            // Black hole sectors always have The Eternal boss
            if (isBlackhole) {
                const eternalBoss = ANCIENT_BOSSES.find(
                    (b) => b.id === "the_eternal",
                );
                if (eternalBoss) {
                    sector.locations.push({
                        id: `${sectorIdx}-boss-eternal`,
                        type: "ancient_boss",
                        name: eternalBoss.name,
                        bossId: eternalBoss.id,
                        bossDefeated: false,
                    });
                }
            }

            // Assign grid-based positions
            assignGridPositions(sector.locations, true);

            sectors.push(sector);
            sectorIdx++;
        }
    });

    // Populate contracts for inhabited planets
    sectors.forEach((sector) => {
        sector.locations.forEach((loc) => {
            if (loc.type === "planet" && !loc.isEmpty) {
                loc.contracts = generatePlanetContracts(
                    loc.planetType || "",
                    sector,
                    loc.id,
                    sector.id,
                    sectors,
                    loc.dominantRace,
                );
            }
        });
    });

    // Ensure at least 2 black holes exist
    const blackHoles = sectors.filter((s) => s.star?.type === "blackhole");
    if (blackHoles.length < 2) {
        // Find tier 3 sectors without black holes and convert them
        const tier3Sectors = sectors.filter(
            (s) => s.tier === 3 && s.star?.type !== "blackhole",
        );
        const needed = 2 - blackHoles.length;

        for (let i = 0; i < Math.min(needed, tier3Sectors.length); i++) {
            tier3Sectors[i].star = { type: "blackhole", name: "Чёрная дыра" };
            // Reduce locations for black hole sectors
            tier3Sectors[i].locations = tier3Sectors[i].locations.slice(
                0,
                Math.min(5, tier3Sectors[i].locations.length),
            );
        }
    }

    return sectors;
};

// Generate planet contracts with race-specific quests
const generatePlanetContracts = (
    planetType: string,
    sector: Sector,
    planetId: string,
    sectorIdx: number,
    allSectors: Sector[],
    dominantRace?: RaceId,
): Contract[] => {
    const contracts: Contract[] = [];
    const numContracts = Math.floor(Math.random() * 2) + 1;

    // Only other sectors for targets
    const availableSectors = allSectors.filter((s) => s.id !== sector.id);

    if (availableSectors.length === 0) return contracts;

    // ═══════════════════════════════════════════════════════════════
    // RACE-SPECIFIC UNIQUE QUESTS
    // Each race has one unique quest that only they can offer
    // ═══════════════════════════════════════════════════════════════
    const raceQuests: Record<RaceId, () => Contract | null> = {
        human: () => {
            // Humans: Diplomatic mission - deliver a message to another human planet
            const humanPlanets = allSectors.flatMap((s) =>
                s.locations.filter(
                    (l) =>
                        l.type === "planet" &&
                        !l.isEmpty &&
                        l.dominantRace === "human" &&
                        l.id !== planetId,
                ),
            );
            if (humanPlanets.length === 0) return null;
            const target =
                humanPlanets[Math.floor(Math.random() * humanPlanets.length)];
            const targetSector = allSectors.find((s) =>
                s.locations.some((l) => l.id === target.id),
            );
            return {
                id: `c-${planetId}-human-${Date.now()}-${Math.random()}`,
                type: "diplomacy",
                desc: "🌍 Дипломатическая миссия",
                targetSector: targetSector?.id,
                targetSectorName: targetSector?.name,
                targetPlanetName: target.name,
                targetPlanetType: target.planetType,
                sourcePlanetId: planetId,
                sourceSectorName: sector.name,
                requiredRace: "human",
                isRaceQuest: true,
                reward: 500 + Math.floor(Math.random() * 200),
            };
        },

        synthetic: () => {
            // Synthetics: Data analysis - research 3 anomalies (they love science)
            const sectorsWithAnomalies = availableSectors.filter((s) =>
                s.locations.some((l) => l.type === "anomaly"),
            );
            if (sectorsWithAnomalies.length === 0) return null;
            const tgt =
                sectorsWithAnomalies[
                    Math.floor(Math.random() * sectorsWithAnomalies.length)
                ];
            const anomalyCount = tgt.locations.filter(
                (l) => l.type === "anomaly",
            ).length;
            return {
                id: `c-${planetId}-synth-${Date.now()}-${Math.random()}`,
                type: "research",
                desc: "🤖 Анализ данных Древних",
                sectorId: tgt.id,
                sectorName: tgt.name,
                sourcePlanetId: planetId,
                sourceSectorName: sector.name,
                requiresAnomalies: Math.min(3, anomalyCount),
                visitedAnomalies: 0,
                requiredRace: "synthetic",
                isRaceQuest: true,
                reward: 900 + Math.floor(Math.random() * 400),
            };
        },

        xenosymbiont: () => {
            // Xenosymbionts: Bio-scan - visit 3 different sectors to collect biological samples
            const targets = availableSectors
                .sort(() => Math.random() - 0.5)
                .slice(0, 3);
            return {
                id: `c-${planetId}-xeno-${Date.now()}-${Math.random()}`,
                type: "patrol",
                desc: "🦠 Сбор биообразцов",
                targetSectors: targets.map((t) => t.id),
                targetSectorNames: targets.map((t) => t.name).join(", "),
                visitedSectors: [],
                sourcePlanetId: planetId,
                sourceSectorName: sector.name,
                requiredRace: "xenosymbiont",
                isRaceQuest: true,
                reward: 600 + Math.floor(Math.random() * 300),
            };
        },

        krylorian: () => {
            // Krylorians: Honor duel - defeat a specific high-threat enemy
            const sectorsWithHighThreat = availableSectors.filter((s) =>
                s.locations.some(
                    (l) => l.type === "enemy" && (l.threat || 1) >= 3,
                ),
            );
            if (sectorsWithHighThreat.length === 0) return null;
            const tgt =
                sectorsWithHighThreat[
                    Math.floor(Math.random() * sectorsWithHighThreat.length)
                ];
            const enemy = tgt.locations.find(
                (l) => l.type === "enemy" && (l.threat || 1) >= 3,
            );
            return {
                id: `c-${planetId}-kryl-${Date.now()}-${Math.random()}`,
                type: "bounty",
                desc: "🦎 Дуэль чести",
                targetThreat: 3,
                sourcePlanetId: planetId,
                sourceSectorName: sector.name,
                targetSector: tgt.id,
                targetSectorName: tgt.name,
                enemyType: enemy?.name,
                requiredRace: "krylorian",
                isRaceQuest: true,
                reward: 1000 + Math.floor(Math.random() * 500),
            };
        },

        voidborn: () => {
            // Voidborn: Void exploration - enter a storm to collect void energy
            const stormSectors = allSectors.filter((s) =>
                s.locations.some((l) => l.type === "storm"),
            );
            if (stormSectors.length === 0) return null;
            const tgt =
                stormSectors[Math.floor(Math.random() * stormSectors.length)];
            const storm = tgt.locations.find((l) => l.type === "storm");
            return {
                id: `c-${planetId}-void-${Date.now()}-${Math.random()}`,
                type: "rescue",
                desc: "👁️ Путешествие в Пустоту",
                sectorId: tgt.id,
                sectorName: tgt.name,
                stormName: storm?.name,
                sourcePlanetId: planetId,
                sourceSectorName: sector.name,
                requiresVisit: 1,
                visited: 0,
                requiredRace: "voidborn",
                isRaceQuest: true,
                reward: 700 + Math.floor(Math.random() * 400),
            };
        },

        crystalline: () => {
            // Crystallines: Artifact hunt - find and research an artifact
            return {
                id: `c-${planetId}-crys-${Date.now()}-${Math.random()}`,
                type: "mining",
                desc: "💎 Поиск кристалла Древних",
                sourcePlanetId: planetId,
                sourceSectorName: sector.name,
                requiredRace: "crystalline",
                isRaceQuest: true,
                reward: 800 + Math.floor(Math.random() * 600),
            };
        },
    };

    // Add race-specific quest (30% chance, but guaranteed if no other contracts)
    if (dominantRace && Math.random() < 0.3) {
        const raceQuest = raceQuests[dominantRace]?.();
        if (raceQuest) contracts.push(raceQuest);
    }

    // ═══════════════════════════════════════════════════════════════
    // STANDARD QUESTS (available to all races)
    // ═══════════════════════════════════════════════════════════════
    const standardQuests = [
        {
            type: "delivery" as const,
            gen: (): Contract | null => {
                const tgtSector =
                    availableSectors[
                        Math.floor(Math.random() * availableSectors.length)
                    ];
                const cargo = [
                    "Вода",
                    "Медикаменты",
                    "Продукты",
                    "Оборудование",
                    "Семена",
                    "Топливо",
                    "Запчасти",
                ][Math.floor(Math.random() * 7)];

                // Pick a specific destination: inhabited planet, station, or friendly ship
                const validDestinations = tgtSector.locations.filter(
                    (l) =>
                        (l.type === "planet" && !l.isEmpty) ||
                        l.type === "station" ||
                        l.type === "friendly_ship",
                );

                if (validDestinations.length === 0) return null;

                const dest =
                    validDestinations[
                        Math.floor(Math.random() * validDestinations.length)
                    ];
                const destType =
                    dest.type === "planet"
                        ? "planet"
                        : dest.type === "station"
                          ? "station"
                          : "ship";

                return {
                    id: `c-${planetId}-${Date.now()}-${Math.random()}`,
                    type: "delivery",
                    desc: `📦 Доставка: ${cargo}`,
                    cargo,
                    targetSector: tgtSector.id,
                    targetSectorName: tgtSector.name,
                    targetLocationId: dest.id,
                    targetLocationName: dest.name,
                    targetLocationType: destType as
                        | "planet"
                        | "station"
                        | "ship",
                    sourcePlanetId: planetId,
                    sourceSectorName: sector.name,
                    sourceType: "planet",
                    reward: 300 + Math.floor(Math.random() * 200),
                };
            },
        },
        {
            type: "combat" as const,
            gen: (): Contract | null => {
                // Find a sector that actually has enemies
                const sectorsWithEnemies = availableSectors.filter((s) =>
                    s.locations.some((l) => l.type === "enemy"),
                );
                if (sectorsWithEnemies.length === 0) return null;
                const tgt =
                    sectorsWithEnemies[
                        Math.floor(Math.random() * sectorsWithEnemies.length)
                    ];
                return {
                    id: `c-${planetId}-${Date.now()}-${Math.random()}`,
                    type: "combat",
                    desc: "⚔ Зачистка сектора",
                    sectorId: tgt.id,
                    sectorName: tgt.name,
                    sourcePlanetId: planetId,
                    sourceSectorName: sector.name,
                    reward: 600 + Math.floor(Math.random() * 300),
                };
            },
        },
        {
            type: "research" as const,
            gen: (): Contract | null => {
                // Find a sector that has anomalies
                const sectorsWithAnomalies = availableSectors.filter((s) =>
                    s.locations.some((l) => l.type === "anomaly"),
                );
                if (sectorsWithAnomalies.length === 0) return null;
                const tgt =
                    sectorsWithAnomalies[
                        Math.floor(Math.random() * sectorsWithAnomalies.length)
                    ];
                return {
                    id: `c-${planetId}-${Date.now()}-${Math.random()}`,
                    type: "research",
                    desc: "🔬 Исследование аномалий",
                    sectorId: tgt.id,
                    sectorName: tgt.name,
                    sourcePlanetId: planetId,
                    sourceSectorName: sector.name,
                    requiresAnomalies: 2,
                    visitedAnomalies: 0,
                    reward: 700 + Math.floor(Math.random() * 300),
                };
            },
        },
        {
            type: "bounty" as const,
            gen: (): Contract | null => {
                // Find a sector with enemies of appropriate threat
                const sectorsWithEnemies = availableSectors.filter((s) =>
                    s.locations.some(
                        (l) => l.type === "enemy" && (l.threat || 1) >= 2,
                    ),
                );
                if (sectorsWithEnemies.length === 0) return null;
                const tgt =
                    sectorsWithEnemies[
                        Math.floor(Math.random() * sectorsWithEnemies.length)
                    ];
                const threat = 2 + Math.floor(Math.random() * 2);
                return {
                    id: `c-${planetId}-${Date.now()}-${Math.random()}`,
                    type: "bounty",
                    desc: "🎯 Охота на пирата",
                    targetThreat: threat,
                    sourcePlanetId: planetId,
                    sourceSectorName: sector.name,
                    targetSector: tgt.id,
                    targetSectorName: tgt.name,
                    reward: 800 + Math.floor(Math.random() * 400),
                };
            },
        },
    ];

    const shuffled = [...standardQuests].sort(() => Math.random() - 0.5);
    const numNeeded = Math.max(1, numContracts - contracts.length);
    for (let i = 0; i < Math.min(numNeeded, shuffled.length); i++) {
        const q = shuffled[i].gen();
        if (q) contracts.push(q);
    }

    return contracts;
};

// Initialize station prices and stock
const initializeStationData = (
    sectors: Sector[],
): {
    prices: Record<string, Record<string, { buy: number; sell: number }>>;
    stock: Record<string, Record<string, number>>;
} => {
    const prices: Record<
        string,
        Record<string, { buy: number; sell: number }>
    > = {};
    const stock: Record<string, Record<string, number>> = {};

    sectors.forEach((sector) => {
        sector.locations.forEach((loc) => {
            if (loc.type === "station" && loc.stationId) {
                prices[loc.stationId] = {};
                stock[loc.stationId] = {};
                for (const goodId in TRADE_GOODS) {
                    const good = TRADE_GOODS[goodId];
                    const priceVar = 0.7 + Math.random() * 0.6;
                    const sellPrice = Math.floor(good.basePrice * priceVar);
                    const buyPrice = Math.floor(sellPrice * 1.6);
                    prices[loc.stationId][goodId] = {
                        buy: buyPrice,
                        sell: sellPrice,
                    };
                    stock[loc.stationId][goodId] =
                        20 + Math.floor(Math.random() * 30);
                }
            }
        });
    });

    return { prices, stock };
};

const sectors = generateGalaxy();
const { prices, stock } = initializeStationData(sectors);

// Initial state
const initialState: GameState = {
    turn: 1,
    credits: 1000,
    currentSector: sectors[0], // Start in first tier 1 sector
    currentLocation: null,
    gameMode: "galaxy_map",
    traveling: null,
    ship: {
        armor: 0,
        shields: 0,
        maxShields: 0,
        crewCapacity: 5,
        modules: initialModules,
        gridSize: 5,
        cargo: [],
        tradeGoods: [],
        engineTier: 1, // Start with tier 1 engine
        fuel: STARTING_FUEL,
        maxFuel: STARTING_FUEL,
    },
    crew: initialCrew,
    galaxy: { sectors },
    activeContracts: [],
    completedContractIds: [], // Track completed contracts to prevent retaking
    shipQuestsTaken: [], // Track ships where quest was taken
    completedLocations: [],
    stationInventory: {},
    stationPrices: prices,
    stationStock: stock,
    friendlyShipStock: {}, // Stock on friendly ships
    currentCombat: null,
    log: [],
    randomEventCooldown: 0,
    scoutingMissions: [],
    hiredCrew: {},
    hiredCrewFromShips: [], // Track friendly ships where crew was hired
    artifacts: ANCIENT_ARTIFACTS.map((a) => ({ ...a })), // Clone artifacts for game state
    knownRaces: ["human"], // Player starts knowing humans
    battleResult: null, // Results of last battle
    gameOver: false, // Game over state
    gameOverReason: null, // Reason for game over
};

// Helper function to get active assignment (combat or civilian based on context)
const getActiveAssignment = (
    crew: CrewMember,
    isCombat: boolean,
): string | null => {
    return isCombat ? crew.combatAssignment : crew.assignment;
};

// Sound effects helper
const playSound = (
    type: "click" | "success" | "error" | "combat" | "travel",
) => {
    if (typeof window === "undefined") return;
    const freqMap: Record<string, number> = {
        click: 800,
        success: 1200,
        error: 400,
        combat: 600,
        travel: 1000,
    };
    const freq = freqMap[type] || 800;
    try {
        const ctx = new (
            window.AudioContext || (window as any).webkitAudioContext
        )();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "square";
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
    } catch {
        // Audio not available
    }
};

// Game store
export const useGameStore = create<
    GameState & {
        // Actions
        addLog: (
            message: string,
            type?: "info" | "warning" | "error" | "combat",
        ) => void;
        updateShipStats: () => void;
        getTotalPower: () => number;
        getTotalConsumption: () => number;
        getTotalDamage: () => {
            total: number;
            kinetic: number;
            laser: number;
            missile: number;
        };
        getCrewCapacity: () => number;
        getFuelCapacity: () => number;
        getFuelEfficiency: () => number;
        getDrillLevel: () => number;
        getScanLevel: () => number;
        calculateFuelCost: (targetTier: number) => number;
        areEnginesFunctional: () => boolean;
        areFuelTanksFunctional: () => boolean;
        refuel: (amount: number, price: number) => void;
        gainExp: (crewMember: CrewMember | undefined, amount: number) => void;

        // Game actions
        nextTurn: () => void;
        skipTurn: () => void;
        selectSector: (sectorId: number) => void;
        selectLocation: (locationIdx: number) => void;
        travelThroughBlackHole: () => void;
        mineAsteroid: () => void;
        enterStorm: () => void;

        // Mode changes
        showGalaxyMap: () => void;
        showSectorMap: () => void;
        showAssignments: () => void;

        // Combat
        startCombat: (enemy: Location, isAmbush?: boolean) => void;
        startBossCombat: (bossLocation: Location) => void;
        selectEnemyModule: (moduleId: number) => void;
        attackEnemy: () => void;
        executeAmbushAttack: () => void; // Execute enemy attack for ambush (first strike)
        retreat: () => void;

        // Station/Planet
        buyItem: (item: ShopItem, targetModuleId?: number) => void;
        repairShip: () => void;
        healCrew: () => void;
        buyTradeGood: (goodId: string, quantity?: number) => void;
        sellTradeGood: (goodId: string, quantity?: number) => void;
        upgradeEngine: (tier: 2 | 3) => void;

        // Crew
        hireCrew: (
            crewData: Partial<CrewMember> & { price: number },
            locationId?: string,
        ) => void;
        fireCrewMember: (crewId: number) => void;
        assignCrewTask: (
            crewId: number,
            task: string,
            effect: string | null,
        ) => void;
        assignCombatTask: (
            crewId: number,
            task: string,
            effect: string | null,
        ) => void;
        moveCrewMember: (crewId: number, targetModuleId: number) => void;
        isModuleAdjacent: (moduleId1: number, moduleId2: number) => boolean;
        getCrewInModule: (moduleId: number) => CrewMember[];

        // Contracts
        acceptContract: (contract: Contract) => void;
        completeDeliveryContract: (contractId: string) => void;
        cancelContract: (contractId: string) => void;

        // Module
        toggleModule: (moduleId: number) => void;
        scrapModule: (moduleId: number) => void;
        moveModule: (moduleId: number, x: number, y: number) => void;
        canPlaceModule: (module: Module, x: number, y: number) => boolean;

        // Anomaly
        handleAnomaly: (anomaly: Location) => void;

        // Scouting
        sendScoutingMission: (planetId: string) => void;

        // Distress Signal
        respondToDistressSignal: () => void;

        // Artifacts
        researchArtifact: (artifactId: string) => void;
        toggleArtifact: (artifactId: string) => void;
        tryFindArtifact: () => Artifact | null;
        showArtifacts: () => void;

        // Races
        discoverRace: (raceId: RaceId) => void;

        // Game Over
        checkGameOver: () => void;
    }
>((set, get) => ({
    ...initialState,

    addLog: (message, type = "info") => {
        set((state) => ({
            log: [{ message, type, turn: state.turn }, ...state.log].slice(
                0,
                100,
            ),
        }));
    },

    updateShipStats: () => {
        set((state) => {
            const totalHealth = state.ship.modules.reduce(
                (sum, m) => sum + m.health,
                0,
            );
            const armor = Math.floor(totalHealth / state.ship.modules.length);
            let totalShields = state.ship.modules
                .filter((m) => m.type === "shield")
                .reduce((sum, m) => sum + (m.defense || 0), 0);

            // Dark Shield artifact bonus
            const darkShield = state.artifacts.find(
                (a) => a.effect.type === "dark_shield" && a.effect.active,
            );
            if (darkShield) {
                totalShields += darkShield.effect.value || 50;
            }

            const totalOxygen = state.ship.modules
                .filter((m) => m.type === "lifesupport" || m.type === "habitat")
                .reduce((sum, m) => sum + (m.oxygen || 0), 0);
            const totalFuelCapacity = state.ship.modules
                .filter(
                    (m) => m.type === "fueltank" && !m.disabled && m.health > 0,
                )
                .reduce((sum, m) => sum + (m.capacity || 0), 0);

            // Safeguard against NaN or undefined fuel
            const currentFuel = state.ship.fuel || 0;

            return {
                ship: {
                    ...state.ship,
                    armor,
                    maxShields: totalShields,
                    shields: Math.min(state.ship.shields, totalShields),
                    crewCapacity: totalOxygen,
                    maxFuel: totalFuelCapacity,
                    fuel: Math.min(currentFuel, totalFuelCapacity),
                },
            };
        });
    },

    getTotalPower: () => {
        const state = get();
        let power = state.ship.modules
            .filter((m) => !m.disabled)
            .reduce((sum, m) => sum + (m.power || 0), 0);

        // Engineer power boost assignment (+5 power)
        const powerBoost = state.crew.find((c) => c.assignment === "power")
            ? 5
            : 0;
        power += powerBoost;

        // Abyss Reactor artifact bonus (+15 power)
        const abyssReactor = state.artifacts.find(
            (a) => a.effect.type === "abyss_power" && a.effect.active,
        );
        if (abyssReactor) {
            power += abyssReactor.effect.value || 15;
        }

        // Eternal Reactor Core artifact bonus (+5 free power)
        const eternalReactor = state.artifacts.find(
            (a) => a.effect.type === "free_power" && a.effect.active,
        );
        if (eternalReactor) {
            power += eternalReactor.effect.value || 5;
        }

        return power;
    },

    getTotalConsumption: () => {
        const state = get();
        const pilotRed = state.crew.find((c) => c.assignment === "navigation")
            ? 1
            : 0;

        // Calculate energy consumption per module, applying crew bonuses locally
        let base = 0;
        state.ship.modules.forEach((m) => {
            if (m.disabled) return;

            let moduleConsumption = m.consumption || 0;

            // Find crew in this module and apply their energy bonuses
            const crewInModule = state.crew.filter((c) => c.moduleId === m.id);
            crewInModule.forEach((c) => {
                const race = RACES[c.race];
                if (race?.crewBonuses.energy && race.crewBonuses.energy < 0) {
                    // Negative energy bonus means reduced consumption (xenosymbiont: -25%)
                    moduleConsumption = Math.floor(
                        moduleConsumption * (1 + race.crewBonuses.energy),
                    );
                }
            });

            base += moduleConsumption;
        });

        return Math.max(0, base - pilotRed);
    },

    getTotalDamage: () => {
        const state = get();
        const dmg = { total: 0, kinetic: 0, laser: 0, missile: 0 };
        state.ship.modules.forEach((m) => {
            if (m.disabled) return;
            if (m.type === "weaponbay" && m.weapons) {
                m.weapons.forEach((w) => {
                    if (w) {
                        const wd = WEAPON_TYPES[w.type].damage;
                        dmg.total += wd;
                        dmg[w.type] += wd;
                    }
                });
            }
        });
        if (state.crew.find((c) => c.assignment === "targeting"))
            dmg.total = Math.floor(dmg.total * 1.15);
        if (state.crew.find((c) => c.assignment === "overclock"))
            dmg.total = Math.floor(dmg.total * 1.25);
        if (state.crew.find((c) => c.assignment === "rapidfire"))
            dmg.total = Math.floor(dmg.total * 1.25);

        // Apply race combat bonuses (krylorian: +35% combat)
        let combatBonus = 0;
        state.crew.forEach((c) => {
            const race = RACES[c.race];
            if (race?.crewBonuses.combat) {
                combatBonus = Math.max(combatBonus, race.crewBonuses.combat);
            }
            // Apply special traits combat bonus (krylorian warrior_honor: +35% combat)
            if (race?.specialTraits) {
                race.specialTraits.forEach((trait) => {
                    if (trait.effects.combatBonus) {
                        combatBonus = Math.max(
                            combatBonus,
                            trait.effects.combatBonus as number,
                        );
                    }
                });
            }
        });
        if (combatBonus > 0) {
            dmg.total = Math.floor(dmg.total * (1 + combatBonus));
        }

        // Apply crew traits damageBonus (e.g., "Меткий стрелок": +10% damage)
        let traitDamageBonus = 0;
        state.crew.forEach((c) => {
            c.traits?.forEach((trait) => {
                if (trait.effect.damageBonus) {
                    traitDamageBonus = Math.max(
                        traitDamageBonus,
                        trait.effect.damageBonus as number,
                    );
                }
            });
        });
        if (traitDamageBonus > 0) {
            dmg.total = Math.floor(dmg.total * (1 + traitDamageBonus));
        }

        // Apply plasma_injector artifact bonus (+20% damage)
        const plasmaInjector = state.artifacts.find(
            (a) => a.effect.type === "damage_boost" && a.effect.active,
        );
        if (plasmaInjector) {
            dmg.total = Math.floor(
                dmg.total * (1 + (plasmaInjector.effect.value || 0.2)),
            );
        }

        // Apply crystalline artifactBonus (+15% to artifact effects)
        let artifactBonus = 0;
        state.crew.forEach((c) => {
            const race = RACES[c.race];
            if (race?.specialTraits) {
                const trait = race.specialTraits.find(
                    (t) => t.id === "resonance" && t.effects.artifactBonus,
                );
                if (trait) {
                    artifactBonus = Math.max(
                        artifactBonus,
                        trait.effects.artifactBonus as number,
                    );
                }
            }
        });

        return dmg;
    },

    getCrewCapacity: () => {
        const state = get();
        const lifesupport = state.ship.modules.filter(
            (m) =>
                (m.type === "lifesupport" || m.type === "habitat") &&
                !m.disabled,
        );
        return lifesupport.reduce((sum, m) => sum + (m.oxygen || 0), 0);
    },

    getFuelCapacity: () => {
        const state = get();
        return state.ship.modules
            .filter((m) => m.type === "fueltank" && !m.disabled && m.health > 0)
            .reduce((sum, m) => sum + (m.capacity || 0), 0);
    },

    getFuelEfficiency: () => {
        const state = get();
        const engines = state.ship.modules.filter(
            (m) => m.type === "engine" && !m.disabled && m.health > 0,
        );
        if (engines.length === 0) return 20; // Default inefficient
        // Use the best (lowest) fuel efficiency
        return Math.min(...engines.map((e) => e.fuelEfficiency || 10));
    },

    getDrillLevel: () => {
        const state = get();
        const drills = state.ship.modules.filter(
            (m) => m.type === "drill" && !m.disabled && m.health > 0,
        );
        if (drills.length === 0) return 0;
        // Return the highest level drill
        return Math.max(...drills.map((d) => d.level || 1));
    },

    getScanLevel: () => {
        const state = get();
        const scanners = state.ship.modules.filter(
            (m) => m.type === "scanner" && !m.disabled && m.health > 0,
        );
        if (scanners.length === 0) return 0;
        // Return the scanner level (1-4) based on scanRange
        let maxRange = Math.max(...scanners.map((s) => s.scanRange || 0));

        // Apply quantum_scanner artifact bonus (+2 scan range)
        const quantumScanner = state.artifacts.find(
            (a) => a.effect.type === "scan_boost" && a.effect.active,
        );
        if (quantumScanner) {
            maxRange += quantumScanner.effect.value || 2;
        }

        // Apply crystalline artifactBonus (+15% to artifact effects)
        let artifactBonus = 0;
        state.crew.forEach((c) => {
            const race = RACES[c.race];
            if (race?.specialTraits) {
                const trait = race.specialTraits.find(
                    (t) => t.id === "resonance" && t.effects.artifactBonus,
                );
                if (trait) {
                    artifactBonus = Math.max(
                        artifactBonus,
                        trait.effects.artifactBonus as number,
                    );
                }
            }
        });
        if (artifactBonus > 0 && quantumScanner) {
            maxRange = Math.floor(maxRange * (1 + artifactBonus));
        }

        if (maxRange >= 15) return 4; // Quantum scanner
        if (maxRange >= 8) return 3; // Scanner MK-3
        if (maxRange >= 5) return 2; // Scanner MK-2
        if (maxRange >= 3) return 1; // Scanner MK-1
        return 0;
    },

    calculateFuelCost: (targetTier: number) => {
        const state = get();
        const currentTier = state.currentSector?.tier ?? 1;
        const distance = Math.abs(targetTier - currentTier);

        // Base fuel cost per tier distance
        let baseCost =
            distance === 0 ? 5 : distance * get().getFuelEfficiency();

        // Apply race fuel efficiency bonuses (voidborn: +20% fuel efficiency = -20% consumption)
        let modifier = 1;
        state.crew.forEach((c) => {
            const race = RACES[c.race];
            let fuelBonus = 0;
            if (race?.crewBonuses.fuelEfficiency) {
                fuelBonus = Math.max(
                    fuelBonus,
                    race.crewBonuses.fuelEfficiency,
                );
            }
            if (race?.specialTraits) {
                race.specialTraits.forEach((trait) => {
                    if (trait.effects.fuelBonus) {
                        fuelBonus = Math.max(
                            fuelBonus,
                            trait.effects.fuelBonus as number,
                        );
                    }
                });
            }
            if (fuelBonus > 0) {
                modifier *= 1 - fuelBonus;
            }
        });

        // Captain traits can modify fuel consumption
        const captain = state.crew.find((c) => c.profession === "pilot");
        if (captain?.traits) {
            captain.traits.forEach((t) => {
                if (t.effect.fuelConsumption)
                    modifier *= t.effect.fuelConsumption;
            });
        }

        const result = Math.ceil(baseCost * modifier);
        // Safeguard against NaN
        return isNaN(result) ? 5 : result;
    },

    areEnginesFunctional: () => {
        const state = get();
        const engines = state.ship.modules.filter((m) => m.type === "engine");
        return engines.some((e) => !e.disabled && e.health > 0);
    },

    areFuelTanksFunctional: () => {
        const state = get();
        const tanks = state.ship.modules.filter((m) => m.type === "fueltank");
        return tanks.some((t) => !t.disabled && t.health > 0);
    },

    refuel: (amount: number, price: number) => {
        const state = get();
        // Safeguard against NaN or undefined fuel
        const maxFuel = state.ship.maxFuel || 0;
        const currentFuel = state.ship.fuel || 0;
        const spaceAvailable = maxFuel - currentFuel;
        const actualAmount = Math.min(amount, spaceAvailable);

        if (actualAmount <= 0) {
            get().addLog("Топливные баки полны!", "warning");
            return;
        }

        if (state.credits < price) {
            get().addLog("Недостаточно кредитов!", "error");
            return;
        }

        set((s) => ({
            credits: s.credits - price,
            ship: { ...s.ship, fuel: (s.ship.fuel || 0) + actualAmount },
        }));
        get().addLog(`Заправка: +${actualAmount} топлива за ${price}₢`, "info");
        playSound("success");
    },

    gainExp: (crewMember, amount) => {
        if (!crewMember) return;

        // Apply racial exp bonuses (human: +15% quick_learner)
        const race = RACES[crewMember.race];
        let expMultiplier = 1;

        // Human racial bonus: +15% exp
        if (crewMember.race === "human") {
            expMultiplier += 0.15;
        }

        // Apply crew trait exp bonuses
        crewMember.traits?.forEach((trait) => {
            if (trait.effect.expBonus) {
                expMultiplier += trait.effect.expBonus;
            }
        });

        const finalAmount = Math.floor(amount * expMultiplier);

        set((state) => ({
            crew: state.crew.map((c) => {
                if (c.id !== crewMember.id) return c;
                const newExp = (c.exp || 0) + finalAmount;
                const expNeeded = (c.level || 1) * 100;
                if (newExp >= expNeeded) {
                    playSound("success");
                    get().addLog(
                        `${c.name} повысил уровень до ${(c.level || 1) + 1}!`,
                        "info",
                    );
                    return {
                        ...c,
                        level: (c.level || 1) + 1,
                        exp: newExp - expNeeded,
                    };
                }
                return { ...c, exp: newExp };
            }),
        }));
    },

    nextTurn: () => {
        const state = get();
        // Reset movedThisTurn for all crew members at start of new turn
        // This allows everyone to move once per turn
        set((s) => ({
            turn: s.turn + 1,
            randomEventCooldown: s.randomEventCooldown - 1,
            crew: s.crew.map((c) => ({
                ...c,
                movedThisTurn: false,
            })),
            ship: {
                ...s.ship,
                moduleMovedThisTurn: false,
                modules: s.ship.modules.map((m) => ({
                    ...m,
                    movedThisTurn: false,
                })),
            },
        }));
        get().updateShipStats();

        // Shield regen
        let shieldRegen = Math.floor(Math.random() * 6) + 5;

        // Apply race shieldRegen bonuses (voidborn: +5 shield regen)
        state.crew.forEach((c) => {
            const race = RACES[c.race];
            if (race?.specialTraits) {
                const shieldTrait = race.specialTraits.find(
                    (t) => t.effects.shieldRegen,
                );
                if (shieldTrait && shieldTrait.effects.shieldRegen) {
                    shieldRegen += Math.floor(
                        Number(shieldTrait.effects.shieldRegen),
                    );
                }
            }
        });

        // Apply nanite_hull artifact bonus (+10 shield regen)
        const naniteHull = state.artifacts.find(
            (a) => a.effect.type === "shield_regen" && a.effect.active,
        );
        if (naniteHull) {
            shieldRegen += Number(naniteHull.effect.value || 10);
        }

        set((s) => ({
            ship: {
                ...s.ship,
                shields: Math.min(
                    s.ship.maxShields,
                    s.ship.shields + shieldRegen,
                ),
            },
        }));
        if (shieldRegen > 0 && state.ship.shields < state.ship.maxShields) {
            get().addLog(
                `Щиты: +${shieldRegen} (${get().ship.shields}/${get().ship.maxShields})`,
                "info",
            );
        }

        // Traveling
        const traveling = get().traveling;
        if (traveling) {
            set((s) => ({
                traveling: s.traveling
                    ? { ...s.traveling, turnsLeft: s.traveling.turnsLeft - 1 }
                    : null,
            }));
            get().addLog(
                `Путешествие в ${traveling.destination.name}: ${get().traveling?.turnsLeft} ходов`,
                "info",
            );

            if (Math.random() < 0.3) {
                const events = ["Аномалия", "Астероиды", "Тревога", "Сигнал"];
                const event = events[Math.floor(Math.random() * events.length)];
                get().addLog(event, "warning");
                if (event === "Астероиды") {
                    set((s) => ({
                        ship: {
                            ...s.ship,
                            modules: s.ship.modules.map((m) =>
                                m.id ===
                                s.ship.modules[
                                    Math.floor(
                                        Math.random() * s.ship.modules.length,
                                    )
                                ].id
                                    ? {
                                          ...m,
                                          health: Math.max(10, m.health - 5),
                                      }
                                    : m,
                            ),
                        },
                    }));
                }
            }

            if (get().traveling && get().traveling!.turnsLeft <= 0) {
                const destinationSector = traveling.destination;
                set({ currentSector: destinationSector, traveling: null });
                get().addLog(`Прибытие в ${destinationSector.name}`, "info");
                get().updateShipStats();

                // Update patrol contracts (xenosymbiont quest - visit sectors)
                const patrolContracts = get().activeContracts.filter(
                    (c) =>
                        c.type === "patrol" &&
                        c.isRaceQuest &&
                        c.targetSectors?.includes(destinationSector.id),
                );
                patrolContracts.forEach((c) => {
                    const visitedSectors = [
                        ...new Set([
                            ...(c.visitedSectors || []),
                            destinationSector.id,
                        ]),
                    ];
                    const targetSectors = c.targetSectors || [];

                    if (visitedSectors.length >= targetSectors.length) {
                        // All sectors visited - complete contract
                        set((s) => ({ credits: s.credits + (c.reward || 0) }));
                        get().addLog(
                            `Сбор биообразцов завершён! +${c.reward}₢`,
                            "info",
                        );
                        set((s) => ({
                            completedContractIds: [
                                ...s.completedContractIds,
                                c.id,
                            ],
                            activeContracts: s.activeContracts.filter(
                                (ac) => ac.id !== c.id,
                            ),
                        }));
                    } else {
                        // Update progress
                        set((s) => ({
                            activeContracts: s.activeContracts.map((ac) =>
                                ac.id === c.id ? { ...ac, visitedSectors } : ac,
                            ),
                        }));
                        get().addLog(
                            `Биообразцы: ${visitedSectors.length}/${targetSectors.length} секторов`,
                            "info",
                        );
                    }
                });

                set({ gameMode: "sector_map" });
                return;
            }
        }

        // Random events (only when not in combat)
        if (
            !state.currentCombat &&
            get().randomEventCooldown <= 0 &&
            Math.random() < 0.3
        ) {
            // Trigger random event
            const events = [
                {
                    name: "Космический шторм",
                    effect: () => {
                        const dmg = Math.floor(Math.random() * 15) + 5;
                        set((s) => ({
                            ship: {
                                ...s.ship,
                                modules: s.ship.modules.map((m) =>
                                    m.id ===
                                    s.ship.modules[
                                        Math.floor(
                                            Math.random() *
                                                s.ship.modules.length,
                                        )
                                    ].id
                                        ? {
                                              ...m,
                                              health: Math.max(
                                                  10,
                                                  m.health - dmg,
                                              ),
                                          }
                                        : m,
                                ),
                            },
                        }));
                        get().addLog(
                            `Шторм! Модуль повреждён: -${dmg}%`,
                            "warning",
                        );
                    },
                },
                {
                    name: "Капсула",
                    effect: () => {
                        const r = Math.floor(Math.random() * 30) + 20;
                        set((s) => ({ credits: s.credits + r }));
                        get().addLog(`Найдена капсула! +${r}₢`, "info");
                    },
                },
                {
                    name: "Вирус",
                    effect: () => {
                        set((s) => ({
                            crew: s.crew.map((c) => ({
                                ...c,
                                happiness: Math.max(0, c.happiness - 10),
                            })),
                        }));
                        get().addLog("Вирус! Настроение -10", "error");
                    },
                },
            ];
            const event = events[Math.floor(Math.random() * events.length)];
            event.effect();
            set({ randomEventCooldown: 3 });
        }

        // Crew assignments - now respect module positions
        get().crew.forEach((c) => {
            const crewRace = RACES[c.race];
            const currentModule = get().ship.modules.find(
                (m) => m.id === c.moduleId,
            );

            // ═══════════════════════════════════════════════════════════════
            // MODULE DAMAGE - Crew takes damage in damaged/destroyed modules
            // ═══════════════════════════════════════════════════════════════
            if (currentModule) {
                const moduleHealth = currentModule.health || 0;

                // Check if medic with firstaid is in the same module
                const medicWithFirstAid = get().crew.find(
                    (cr) =>
                        cr.moduleId === c.moduleId &&
                        cr.profession === "medic" &&
                        cr.assignment === "firstaid",
                );
                const firstAidReduction = medicWithFirstAid ? 0.5 : 1; // 50% damage reduction

                // Destroyed module (health <= 0) - crew takes heavy damage
                if (moduleHealth <= 0) {
                    const moduleDamage = Math.floor(25 * firstAidReduction); // Heavy damage in destroyed module
                    set((s) => ({
                        crew: s.crew.map((cr) =>
                            cr.id === c.id
                                ? {
                                      ...cr,
                                      health: Math.max(
                                          0,
                                          cr.health - moduleDamage,
                                      ),
                                  }
                                : cr,
                        ),
                    }));
                    get().addLog(
                        `☠️ ${c.name}: Модуль "${currentModule.name}" разрушен! -${moduleDamage} HP${medicWithFirstAid ? " (аптечки: -50% урона)" : ""}`,
                        medicWithFirstAid ? "warning" : "error",
                    );
                } else if (moduleHealth < 100) {
                    const moduleDamage = Math.floor(10 * firstAidReduction); // Light damage in damaged module
                    set((s) => ({
                        crew: s.crew.map((cr) =>
                            cr.id === c.id
                                ? {
                                      ...cr,
                                      health: Math.max(
                                          0,
                                          cr.health - moduleDamage,
                                      ),
                                  }
                                : cr,
                        ),
                    }));
                    get().addLog(
                        `⚠️ ${c.name}: Модуль "${currentModule.name}" повреждён! -${moduleDamage} HP${medicWithFirstAid ? " (аптечки: -50% урона)" : ""}`,
                        "warning",
                    );
                }
            }

            // Apply racial health regen (human: +5 from adaptable trait)
            // Only when assigned to "heal" task
            let healthRegen = 0;
            // Get health regen from race special traits (e.g., human adaptable: +5)
            if (crewRace?.specialTraits) {
                crewRace.specialTraits.forEach((trait) => {
                    if (trait.effects.healthRegen) {
                        healthRegen += Number(trait.effects.healthRegen);
                    }
                });
            }
            // Get regen bonus from crew traits (e.g., "Непобедимый": +10%)
            let regenBonus = 0;
            c.traits?.forEach((trait) => {
                if (trait.effect.regenBonus) {
                    regenBonus += trait.effect.regenBonus;
                }
            });
            if (regenBonus > 0) {
                healthRegen = Math.floor(healthRegen * (1 + regenBonus));
            }
            if (healthRegen > 0 && c.assignment === "heal") {
                set((s) => ({
                    crew: s.crew.map((cr) =>
                        cr.id === c.id
                            ? {
                                  ...cr,
                                  health: Math.min(
                                      cr.maxHealth || 100,
                                      cr.health + healthRegen,
                                  ),
                              }
                            : cr,
                    ),
                }));
                if (healthRegen > 0 && c.health < (c.maxHealth || 100)) {
                    get().addLog(
                        `${c.name}: Регенерация +${healthRegen} HP`,
                        "info",
                    );
                }
            }

            // ═══════════════════════════════════════════════════════════════
            // MEDICAL BAY - Auto-heal crew in medical modules
            // ═══════════════════════════════════════════════════════════════
            if (currentModule?.type === "medical" && currentModule.health > 0) {
                // Check if medical bay has power
                const hasPower =
                    get().getTotalPower() > get().getTotalConsumption();
                if (hasPower) {
                    // Check if medic is in this module for synergy bonus
                    const medicInModule = get().crew.find(
                        (cr) =>
                            cr.moduleId === c.moduleId &&
                            cr.profession === "medic",
                    );
                    const healAmount = medicInModule ? 15 : 8; // 15 HP with medic, 8 HP without

                    set((s) => ({
                        crew: s.crew.map((cr) =>
                            cr.id === c.id
                                ? {
                                      ...cr,
                                      health: Math.min(
                                          cr.maxHealth || 100,
                                          cr.health + healAmount,
                                      ),
                                  }
                                : cr,
                        ),
                    }));

                    if (c.health < (c.maxHealth || 100)) {
                        get().addLog(
                            `🏥 ${c.name}: Медотсек ${medicInModule ? "+доктор" : ""} +${healAmount} HP`,
                            "info",
                        );
                    }
                }
            }

            if (c.assignment) {
                const currentModule = get().ship.modules.find(
                    (m) => m.id === c.moduleId,
                );
                const crewInSameModule = get().crew.filter(
                    (cr) => cr.moduleId === c.moduleId,
                );

                switch (c.assignment) {
                    case "repair": {
                        // Engineer can only repair the module they're in
                        if (!currentModule) break;
                        let repairAmount = 15;

                        // Apply trait task bonuses
                        let taskBonus = 0;
                        c.traits?.forEach((trait) => {
                            if (trait.effect.taskBonus) {
                                taskBonus += trait.effect.taskBonus;
                            }
                            if (trait.effect.doubleTaskEffect) {
                                taskBonus = 1; // 100% bonus = double effect
                            }
                        });
                        if (taskBonus > 0) {
                            repairAmount = Math.floor(
                                repairAmount * (1 + taskBonus),
                            );
                        }

                        if (crewRace?.crewBonuses.repair) {
                            repairAmount = Math.floor(
                                repairAmount *
                                    (1 + crewRace.crewBonuses.repair),
                            );
                        }
                        set((s) => ({
                            ship: {
                                ...s.ship,
                                modules: s.ship.modules.map((m) =>
                                    m.id === currentModule.id
                                        ? {
                                              ...m,
                                              health: Math.min(
                                                  100,
                                                  m.health + repairAmount,
                                              ),
                                          }
                                        : m,
                                ),
                            },
                        }));
                        get().addLog(
                            `${c.name}: Ремонт "${currentModule.name}" +${repairAmount}%`,
                            "info",
                        );
                        get().gainExp(c, 8);
                        break;
                    }
                    case "heal": {
                        // Medic heals all crew in the same module (including themselves)
                        if (crewInSameModule.length > 0 || currentModule) {
                            let healAmount = 20;

                            // Apply trait task bonuses
                            let taskBonus = 0;
                            c.traits?.forEach((trait) => {
                                if (trait.effect.taskBonus) {
                                    taskBonus += trait.effect.taskBonus;
                                }
                                if (trait.effect.doubleTaskEffect) {
                                    taskBonus = 1; // 100% bonus = double effect
                                }
                            });
                            if (taskBonus > 0) {
                                healAmount = Math.floor(
                                    healAmount * (1 + taskBonus),
                                );
                            }

                            set((s) => ({
                                crew: s.crew.map((cr) =>
                                    cr.moduleId === c.moduleId
                                        ? {
                                              ...cr,
                                              health: Math.min(
                                                  cr.maxHealth || 100,
                                                  cr.health + healAmount,
                                              ),
                                          }
                                        : cr,
                                ),
                            }));
                            const healedCount = crewInSameModule.length + 1; // Include self
                            get().addLog(
                                `${c.name}: Лечение модуля +${healAmount} HP (${healedCount} существ)`,
                                "info",
                            );
                            get().gainExp(c, 6 * healedCount);
                        }
                        break;
                    }
                    case "morale": {
                        // Medic boosts morale of all crew in the same module (including themselves)
                        if (crewInSameModule.length > 0 || currentModule) {
                            let moraleAmount = 15;

                            // Apply trait task bonuses
                            let taskBonus = 0;
                            c.traits?.forEach((trait) => {
                                if (trait.effect.taskBonus) {
                                    taskBonus += trait.effect.taskBonus;
                                }
                                if (trait.effect.doubleTaskEffect) {
                                    taskBonus = 1; // 100% bonus = double effect
                                }
                            });
                            if (taskBonus > 0) {
                                moraleAmount = Math.floor(
                                    moraleAmount * (1 + taskBonus),
                                );
                            }

                            set((s) => ({
                                crew: s.crew.map((cr) =>
                                    cr.moduleId === c.moduleId
                                        ? {
                                              ...cr,
                                              happiness: Math.min(
                                                  100,
                                                  cr.happiness + moraleAmount,
                                              ),
                                          }
                                        : cr,
                                ),
                            }));
                            const boostedCount = crewInSameModule.length + 1; // Include self
                            get().addLog(
                                `${c.name}: Мораль модуля +${moraleAmount} (${boostedCount} существ)`,
                                "info",
                            );
                            get().gainExp(c, 4 * boostedCount);
                        }
                        break;
                    }
                    case "firstaid": {
                        // Medic prepares first aid kits - reduces damage from module damage
                        // Effect is applied when crew takes damage from module
                        if (currentModule) {
                            get().addLog(
                                `${c.name}: Аптечки подготовлены (снижение урона от повреждений модуля)`,
                                "info",
                            );
                            get().gainExp(c, 5);
                        }
                        break;
                    }
                    case "evasion": {
                        // Pilot must be in cockpit for evasion maneuvers
                        if (currentModule?.type === "cockpit") {
                            let shieldAmount = 15;

                            // Apply trait task bonuses
                            let taskBonus = 0;
                            c.traits?.forEach((trait) => {
                                if (trait.effect.taskBonus) {
                                    taskBonus += trait.effect.taskBonus;
                                }
                                if (trait.effect.doubleTaskEffect) {
                                    taskBonus = 1; // 100% bonus = double effect
                                }
                            });
                            if (taskBonus > 0) {
                                shieldAmount = Math.floor(
                                    shieldAmount * (1 + taskBonus),
                                );
                            }

                            set((s) => ({
                                ship: {
                                    ...s.ship,
                                    shields: Math.min(
                                        s.ship.maxShields,
                                        s.ship.shields + shieldAmount,
                                    ),
                                },
                            }));
                            get().addLog(
                                `${c.name}: Щиты +${shieldAmount}`,
                                "info",
                            );
                            get().gainExp(c, 5);
                        } else {
                            get().addLog(
                                `${c.name}: Нужно быть в кабине для маневров!`,
                                "warning",
                            );
                        }
                        break;
                    }
                    case "overclock": {
                        // Engineer overclocks the module they're in
                        if (!currentModule) break;
                        set((s) => ({
                            ship: {
                                ...s.ship,
                                modules: s.ship.modules.map((m) =>
                                    m.id === currentModule.id
                                        ? {
                                              ...m,
                                              health: Math.max(
                                                  0,
                                                  m.health - 10,
                                              ),
                                          }
                                        : m,
                                ),
                            },
                        }));
                        get().addLog(
                            `${c.name}: Перегрузка "${currentModule.name}" (+25% урон,-10% броня)`,
                            "warning",
                        );
                        get().gainExp(c, 10);
                        break;
                    }
                    case "power": {
                        // Engineer can boost power only if in reactor
                        if (currentModule?.type === "reactor") {
                            // Power boost is handled in getTotalPower
                            get().addLog(
                                `${c.name}: Разгон реактора +5⚡`,
                                "info",
                            );
                            get().gainExp(c, 6);
                        } else {
                            get().addLog(
                                `${c.name}: Нужно быть в реакторе для разгона!`,
                                "warning",
                            );
                        }
                        break;
                    }
                    case "navigation": {
                        // Pilot must be in cockpit for navigation
                        if (currentModule?.type !== "cockpit") {
                            get().addLog(
                                `${c.name}: Навигация неактивна - нужен в кабине!`,
                                "warning",
                            );
                        }
                        // Navigation bonus is handled in getTotalConsumption
                        break;
                    }
                    case "targeting": {
                        // Pilot must be in cockpit for targeting
                        if (currentModule?.type !== "cockpit") {
                            get().addLog(
                                `${c.name}: Прицеливание неактивно - нужен в кабине!`,
                                "warning",
                            );
                        }
                        break;
                    }
                    case "rapidfire": {
                        // Gunner must be in weaponbay for rapid fire
                        if (currentModule?.type !== "weaponbay") {
                            get().addLog(
                                `${c.name}: Скорострельность неактивна - нужен в оружейной палубе!`,
                                "warning",
                            );
                        } else {
                            get().addLog(
                                `${c.name}: Скорострельность активна (+25% урон, -5% точность)`,
                                "info",
                            );
                            get().gainExp(c, 8);
                        }
                        break;
                    }
                    case "patrol": {
                        // Scout can patrol from anywhere
                        get().addLog(`${c.name}: Патрулирование`, "info");
                        get().gainExp(c, 5);
                        break;
                    }
                    case "research": {
                        // Scientist can research from anywhere
                        get().addLog(`${c.name}: Исследования`, "info");
                        get().gainExp(c, 5);
                        break;
                    }
                    default:
                        get().gainExp(c, 5);
                }
            }

            // Apply negative trait effects: teamMorale (e.g., "Неряха" -5 morale to module mates)
            const crewInSameModule = get().crew.filter(
                (cr) => cr.moduleId === c.moduleId && cr.id !== c.id,
            );
            c.traits?.forEach((trait) => {
                // teamMorale: affects all crew in same module
                if (trait.effect.teamMorale && crewInSameModule.length > 0) {
                    const moralePenalty = Math.abs(trait.effect.teamMorale);
                    set((s) => ({
                        crew: s.crew.map((cr) =>
                            cr.moduleId === c.moduleId && cr.id !== c.id
                                ? {
                                      ...cr,
                                      happiness: Math.max(
                                          0,
                                          cr.happiness - moralePenalty,
                                      ),
                                  }
                                : cr,
                        ),
                    }));
                    get().addLog(
                        `⚠️ ${c.name} (${trait.name}): -${moralePenalty} настроения модулю`,
                        "warning",
                    );
                }
                // moralePenalty: affects all crew in same module (e.g., "Бунтарь")
                if (trait.effect.moralePenalty && crewInSameModule.length > 0) {
                    const moralePenalty = Math.abs(trait.effect.moralePenalty);
                    set((s) => ({
                        crew: s.crew.map((cr) =>
                            cr.moduleId === c.moduleId && cr.id !== c.id
                                ? {
                                      ...cr,
                                      happiness: Math.max(
                                          0,
                                          cr.happiness - moralePenalty,
                                      ),
                                  }
                                : cr,
                        ),
                    }));
                    get().addLog(
                        `⚠️ ${c.name} (${trait.name}): -${moralePenalty} настроения модулю`,
                        "warning",
                    );
                }
            });

            // Happiness decay
            const race = RACES[c.race];
            const happinessBonus = race?.crewBonuses?.happiness || 0;

            // Check for synthetic noHappiness trait (immunity to morale effects)
            const hasNoHappiness = race?.specialTraits?.some(
                (t) => t.id === "no_happiness",
            );

            if (hasNoHappiness) {
                // Synthetic: no happiness decay
                set((s) => ({
                    crew: s.crew.map((cr) => (cr.id === c.id ? cr : cr)),
                }));
            } else {
                // Apply race happiness bonus: positive bonus reduces decay, negative increases it
                // Base decay is 0-2, happiness bonus modifies the minimum happiness
                const decay = Math.floor(Math.random() * 3);
                const newHappiness = Math.max(
                    0,
                    Math.min(
                        100,
                        c.happiness - decay + Math.floor(happinessBonus / 2),
                    ),
                );
                set((s) => ({
                    crew: s.crew.map((cr) =>
                        cr.id === c.id
                            ? {
                                  ...cr,
                                  happiness: newHappiness,
                              }
                            : cr,
                    ),
                }));
            }

            // Apply racial negative effects: xenosymbiont humanHappinessPenalty, voidborn organicHappinessPenalty
            // Reuse crewInSameModule from above (already filtered)

            // Xenosymbiont: disturbing presence (-5 happiness to humans in same module)
            if (c.race === "xenosymbiont") {
                const humansInModule = crewInSameModule.filter(
                    (cr) => cr.race === "human",
                );
                if (humansInModule.length > 0) {
                    set((s) => ({
                        crew: s.crew.map((cr) =>
                            cr.moduleId === c.moduleId &&
                            cr.race === "human" &&
                            cr.id !== c.id
                                ? {
                                      ...cr,
                                      happiness: Math.max(0, cr.happiness - 5),
                                  }
                                : cr,
                        ),
                    }));
                }
            }

            // Voidborn: unnerving (-10 happiness to organics in same module)
            if (c.race === "voidborn") {
                const organicsInModule = crewInSameModule.filter(
                    (cr) => cr.race !== "synthetic" && cr.race !== "voidborn",
                );
                if (organicsInModule.length > 0) {
                    set((s) => ({
                        crew: s.crew.map((cr) =>
                            cr.moduleId === c.moduleId &&
                            cr.race !== "synthetic" &&
                            cr.race !== "voidborn" &&
                            cr.id !== c.id
                                ? {
                                      ...cr,
                                      happiness: Math.max(0, cr.happiness - 10),
                                  }
                                : cr,
                        ),
                    }));
                }
            }

            // Apply crew trait effects: expBonus
            if (c.traits) {
                c.traits.forEach((trait) => {
                    if (trait.effect.expBonus) {
                        // Store for later use in gainExp
                    }
                });
            }
        });

        // Remove unhappy crew
        const unhappyCrew = get().crew.filter((c) => c.happiness === 0);
        unhappyCrew.forEach((c) => {
            get().addLog(`${c.name} покинул корабль!`, "error");
            set((s) => ({ crew: s.crew.filter((cr) => cr.id !== c.id) }));
        });

        // Process scouting missions
        const missions = get().scoutingMissions;
        missions.forEach((mission, idx) => {
            const newTurnsLeft = mission.turnsLeft - 1;
            if (newTurnsLeft <= 0) {
                const scout = get().crew.find((c) => c.id === mission.scoutId);
                if (scout) {
                    const outcome = Math.random();
                    get().gainExp(scout, 12);
                    if (outcome < 0.4) {
                        const reward = 20 + Math.floor(Math.random() * 30);
                        set((s) => ({ credits: s.credits + reward }));
                        get().addLog(
                            `Разведка: ${scout.name} нашёл ресурсы! +${reward}₢`,
                            "info",
                        );
                    } else if (outcome < 0.7) {
                        const goodId =
                            Object.keys(TRADE_GOODS)[
                                Math.floor(
                                    Math.random() *
                                        Object.keys(TRADE_GOODS).length,
                                )
                            ];
                        set((s) => ({
                            ship: {
                                ...s.ship,
                                tradeGoods: [
                                    ...s.ship.tradeGoods,
                                    { item: goodId, quantity: 5, buyPrice: 0 },
                                ],
                            },
                        }));
                        get().addLog(
                            `Разведка: ${scout.name} нашёл ${TRADE_GOODS[goodId].name}!`,
                            "info",
                        );
                    } else {
                        get().addLog(
                            `Разведка: ${scout.name} ничего не нашёл`,
                            "info",
                        );
                    }
                }

                // Update scoutedTimes on the planet location
                const planet = get().currentSector?.locations.find(
                    (l) => l.id === mission.planetId,
                );
                const newScoutedTimes = (planet?.scoutedTimes || 0) + 1;
                const isFullyExplored = newScoutedTimes >= 3;
                set((s) => ({
                    currentSector: s.currentSector
                        ? {
                              ...s.currentSector,
                              locations: s.currentSector.locations.map((loc) =>
                                  loc.id === mission.planetId
                                      ? {
                                            ...loc,
                                            scoutedTimes: newScoutedTimes,
                                            explored: isFullyExplored,
                                        }
                                      : loc,
                              ),
                          }
                        : null,
                    currentLocation:
                        s.currentLocation?.id === mission.planetId
                            ? {
                                  ...s.currentLocation,
                                  scoutedTimes: newScoutedTimes,
                                  explored: isFullyExplored,
                              }
                            : s.currentLocation,
                }));

                set((s) => ({
                    scoutingMissions: s.scoutingMissions.filter(
                        (_, i) => i !== idx,
                    ),
                }));
            } else {
                set((s) => ({
                    scoutingMissions: s.scoutingMissions.map((m, i) =>
                        i === idx ? { ...m, turnsLeft: newTurnsLeft } : m,
                    ),
                }));
            }
        });

        // Power check
        const power = get().getTotalPower();
        const boost = get().crew.find((c) => c.assignment === "power") ? 5 : 0;
        const consumption = get().getTotalConsumption();
        const available = power + boost - consumption;

        if (available < 0) {
            get().addLog("КРИТИЧНО: Недостаток энергии!", "error");
            set((s) => ({
                crew: s.crew.map((c) => ({
                    ...c,
                    happiness: Math.max(0, c.happiness - 10),
                })),
            }));
            if (Math.random() < 0.4) {
                const mod =
                    get().ship.modules[
                        Math.floor(Math.random() * get().ship.modules.length)
                    ];
                set((s) => ({
                    ship: {
                        ...s.ship,
                        modules: s.ship.modules.map((m) =>
                            m.id === mod.id
                                ? { ...m, health: Math.max(0, m.health - 15) }
                                : m,
                        ),
                    },
                }));
                get().addLog(`"${mod.name}" повреждён перегрузкой!`, "error");
            }
        }

        // Oxygen check
        if (get().crew.length > get().getCrewCapacity()) {
            get().addLog("КРИТИЧНО: Недостаток кислорода!", "error");
            set((s) => ({
                crew: s.crew.map((c) => ({
                    ...c,
                    health: Math.max(0, c.health - 20),
                })),
            }));
        }

        // ═══════════════════════════════════════════════════════════════
        // CURSED ARTIFACT EFFECTS - Price of power
        // ═══════════════════════════════════════════════════════════════
        const activeCursedArtifacts = state.artifacts.filter(
            (a) => a.cursed && a.effect.active,
        );

        activeCursedArtifacts.forEach((artifact) => {
            if (!artifact.negativeEffect) return;

            switch (artifact.negativeEffect.type) {
                case "happiness_drain": {
                    // Abyss Reactor: -X happiness per turn
                    const drain = artifact.negativeEffect.value || 5;
                    set((s) => ({
                        crew: s.crew.map((c) => ({
                            ...c,
                            happiness: Math.max(0, c.happiness - drain),
                        })),
                    }));
                    get().addLog(
                        `⚛️ ${artifact.name}: -${drain} счастья`,
                        "warning",
                    );
                    break;
                }
                case "morale_drain": {
                    // Dark Shield: -X morale per turn
                    const drain = artifact.negativeEffect.value || 3;
                    set((s) => ({
                        crew: s.crew.map((c) => ({
                            ...c,
                            happiness: Math.max(0, c.happiness - drain),
                        })),
                    }));
                    get().addLog(
                        `🛡️ ${artifact.name}: команда чувствует холод`,
                        "warning",
                    );
                    break;
                }
                case "module_damage": {
                    // Black Box: random module damage per turn
                    const dmg = artifact.negativeEffect.value || 10;
                    const activeMods = state.ship.modules.filter(
                        (m) => m.health > 10,
                    );
                    if (activeMods.length > 0) {
                        const randomMod =
                            activeMods[
                                Math.floor(Math.random() * activeMods.length)
                            ];
                        set((s) => ({
                            ship: {
                                ...s.ship,
                                modules: s.ship.modules.map((m) =>
                                    m.id === randomMod.id
                                        ? {
                                              ...m,
                                              health: Math.max(
                                                  10,
                                                  m.health - dmg,
                                              ),
                                          }
                                        : m,
                                ),
                            },
                        }));
                        get().addLog(
                            `📦 ${artifact.name}: "${randomMod.name}" повреждён`,
                            "warning",
                        );
                    }
                    break;
                }
                case "crew_desertion": {
                    // Parasitic Nanites: chance crew leaves
                    const chance = (artifact.negativeEffect.value || 5) / 100;
                    if (Math.random() < chance && state.crew.length > 1) {
                        const leavingIdx = Math.floor(
                            Math.random() * state.crew.length,
                        );
                        const leaving = state.crew[leavingIdx];
                        set((s) => ({
                            crew: s.crew.filter((_, i) => i !== leavingIdx),
                        }));
                        get().addLog(
                            `🔧 ${artifact.name}: ${leaving.name} покинул корабль!`,
                            "error",
                        );
                    }
                    break;
                }
                case "crew_mutation": {
                    // Ancient Biosphere: chance to mutate each crew member
                    const mutationChance =
                        (artifact.negativeEffect.value || 15) / 100;
                    const mutations = CREW_TRAITS.mutation;
                    let mutated = false;

                    state.crew.forEach((c) => {
                        if (
                            Math.random() < mutationChance &&
                            !c.traits.some((t) => t.name.startsWith("Мутация:"))
                        ) {
                            const mutation =
                                mutations[
                                    Math.floor(Math.random() * mutations.length)
                                ];
                            set((s) => ({
                                crew: s.crew.map((crew) =>
                                    crew.id === c.id
                                        ? {
                                              ...crew,
                                              traits: [
                                                  ...crew.traits,
                                                  {
                                                      name: mutation.name,
                                                      desc: mutation.desc,
                                                      effect: mutation.effect as unknown as Record<
                                                          string,
                                                          number
                                                      >,
                                                      type: "neutral" as const,
                                                  },
                                              ],
                                          }
                                        : crew,
                                ),
                            }));
                            get().addLog(
                                `🧬 ${artifact.name}: ${c.name} мутировал! ${mutation.name}`,
                                "warning",
                            );
                            mutated = true;
                        }
                    });

                    if (!mutated && Math.random() < 0.3) {
                        get().addLog(
                            `🧬 ${artifact.name}: ДНК экипажа стабилен... пока`,
                            "info",
                        );
                    }
                    break;
                }
                case "health_drain": {
                    // Void Drive: health drain per turn
                    const drain = artifact.negativeEffect.value || 5;
                    const immortalArtifact = state.artifacts.find(
                        (a) =>
                            a.effect.type === "crew_immortal" &&
                            a.effect.active,
                    );
                    const undyingArtifact = state.artifacts.find(
                        (a) =>
                            a.effect.type === "undying_crew" && a.effect.active,
                    );

                    set((s) => ({
                        crew: s.crew.map((c) => ({
                            ...c,
                            health: Math.max(
                                immortalArtifact || undyingArtifact ? 1 : 0,
                                c.health - drain,
                            ),
                        })),
                    }));
                    get().addLog(
                        `🌀 ${artifact.name}: -${drain} здоровья экипажу`,
                        "warning",
                    );
                    break;
                }
            }
        });

        // Auto-repair from Parasitic Nanites (positive effect)
        const autoRepair = state.artifacts.find(
            (a) => a.effect.type === "auto_repair" && a.effect.active,
        );
        if (autoRepair) {
            const repairAmount = autoRepair.effect.value || 5;
            set((s) => ({
                ship: {
                    ...s.ship,
                    modules: s.ship.modules.map((m) => ({
                        ...m,
                        health: Math.min(100, m.health + repairAmount),
                    })),
                },
            }));
            get().addLog(
                `🔧 Паразитические Наниты: ремонт +${repairAmount}%`,
                "info",
            );
        }

        // Abyss Power positive effect (already handled in getTotalPower)
        // Just log it if active
        const abyssReactor = state.artifacts.find(
            (a) => a.effect.type === "abyss_power" && a.effect.active,
        );
        if (abyssReactor) {
            get().addLog(
                `⚛️ Реактор Бездны: +${abyssReactor.effect.value || 15}⚡`,
                "info",
            );
        }

        get().updateShipStats();
    },

    skipTurn: () => {
        const state = get();
        get().addLog("Ход пропущен - задачи выполняются", "info");

        // Enemy still attacks when we skip
        if (state.currentCombat) {
            // Execute enemy attack
            const eDmg = state.currentCombat.enemy.modules.reduce(
                (s, m) => s + (m.damage || 0),
                0,
            );

            if (eDmg > 0) {
                // Pick random target module
                const activeMods = state.ship.modules.filter(
                    (m) => !m.disabled && m.health > 0,
                );
                const tgt =
                    activeMods[Math.floor(Math.random() * activeMods.length)];

                if (tgt) {
                    const reducedDamage = eDmg; // No crystal armor calc for simplicity
                    const wasDestroyed = tgt.health <= reducedDamage;

                    set((s) => ({
                        ship: {
                            ...s.ship,
                            modules: s.ship.modules.map((m) =>
                                m.id === tgt.id
                                    ? {
                                          ...m,
                                          health: Math.max(
                                              0,
                                              m.health - reducedDamage,
                                          ),
                                      }
                                    : m,
                            ),
                        },
                    }));

                    get().addLog(
                        `Враг по "${tgt.name}": -${reducedDamage}%`,
                        "warning",
                    );

                    // Damage crew in module
                    const crewDamage = Math.floor(reducedDamage * 0.5);
                    const crewInModule = state.crew.filter(
                        (c) => c.moduleId === tgt.id,
                    );
                    if (crewInModule.length > 0) {
                        set((s) => ({
                            crew: s.crew.map((c) =>
                                c.moduleId === tgt.id
                                    ? {
                                          ...c,
                                          health: Math.max(
                                              0,
                                              c.health - crewDamage,
                                          ),
                                      }
                                    : c,
                            ),
                        }));
                        get().addLog(
                            `👤 Экипаж получил урон: -${crewDamage}`,
                            "warning",
                        );
                    }

                    // Check for dead crew
                    const deadCrew = get().crew.filter((c) => c.health <= 0);
                    if (deadCrew.length > 0) {
                        set((s) => ({
                            crew: s.crew.filter((c) => c.health > 0),
                        }));
                        get().addLog(
                            `☠️ Потери: ${deadCrew.map((c) => c.name).join(", ")}`,
                            "error",
                        );
                    }
                }
            }
        }

        // Update ship stats and check for game over AFTER all damage is applied
        get().updateShipStats();
        get().checkGameOver();

        get().nextTurn();
    },

    selectSector: (sectorId) => {
        const state = get();
        const cockpit = state.ship.modules.find(
            (m) => m.type === "cockpit" && !m.disabled,
        );
        if (!cockpit) {
            get().addLog(
                "Кабина отключена! Невозможно управлять кораблем!",
                "error",
            );
            playSound("error");
            return;
        }
        if (state.traveling) return;

        const sector = state.galaxy.sectors.find((s) => s.id === sectorId);
        if (!sector) return;

        // Check if engines or fuel tanks are damaged
        const enginesWorking = get().areEnginesFunctional();
        const tanksWorking = get().areFuelTanksFunctional();

        // If engines or tanks are damaged, can only travel in tier 1
        if ((!enginesWorking || !tanksWorking) && sector.tier > 1) {
            get().addLog(
                `Двигатели или баки повреждены! Доступен только Тир 1`,
                "error",
            );
            playSound("error");
            return;
        }

        // Check tier access requirements
        const engineTier = state.ship.engineTier;
        const captainLevel =
            state.crew.find((c) => c.profession === "pilot")?.level ?? 1;

        if (sector.tier === 2 && (engineTier < 2 || captainLevel < 2)) {
            get().addLog(
                `Доступ к Тир 2 требует: Двигатель Ур.2 + Капитан Ур.2`,
                "error",
            );
            playSound("error");
            return;
        }

        if (sector.tier === 3 && (engineTier < 3 || captainLevel < 3)) {
            get().addLog(
                `Доступ к Тир 3 требует: Двигатель Ур.3 + Капитан Ур.3`,
                "error",
            );
            playSound("error");
            return;
        }

        if (sectorId === state.currentSector?.id) {
            set({ gameMode: "sector_map" });
            return;
        }

        // Check if pilot is in cockpit for bonuses
        const pilot = state.crew.find((c) => c.profession === "pilot");
        const pilotInCockpit = pilot && pilot.moduleId === cockpit.id;

        // Check for void_engine artifact (free fuel for inter-sector travel)
        const voidEngine = state.artifacts.find(
            (a) => a.effect.type === "fuel_free" && a.effect.active,
        );

        // Calculate fuel cost with penalty if pilot not in cockpit
        let fuelCost = get().calculateFuelCost(sector.tier);

        // Apply void_engine artifact bonus (free inter-sector travel)
        if (voidEngine) {
            fuelCost = 0;
            get().addLog(
                `⚡ Вакуумный двигатель! Бесплатный межсекторный перелёт!`,
                "info",
            );
        } else if (!pilotInCockpit) {
            fuelCost = Math.floor(fuelCost * 1.5); // 50% more fuel
            get().addLog(`⚠ Пилот не в кабине! Расход топлива +50%`, "warning");
        }

        if (state.ship.fuel < fuelCost) {
            get().addLog(
                `Недостаточно топлива! Нужно: ${fuelCost}, есть: ${state.ship.fuel}`,
                "error",
            );
            playSound("error");
            return;
        }

        // Consume fuel
        set((s) => ({
            ship: {
                ...s.ship,
                fuel: Math.max(0, (s.ship.fuel || 0) - fuelCost),
            },
        }));
        get().addLog(`Расход топлива: -${fuelCost}`, "info");

        // Risk of module damage if pilot not in cockpit during inter-tier travel
        const distance = Math.abs(
            sector.tier - (state.currentSector?.tier ?? 1),
        );

        if (!pilotInCockpit && distance > 0) {
            // 30% chance per tier distance of module damage
            const damageChance = 0.3 * distance;
            if (Math.random() < damageChance) {
                const activeModules = state.ship.modules.filter(
                    (m) => m.health > 10,
                );
                if (activeModules.length > 0) {
                    const damagedModule =
                        activeModules[
                            Math.floor(Math.random() * activeModules.length)
                        ];
                    const damage = 10 + Math.floor(Math.random() * 15);
                    set((s) => ({
                        ship: {
                            ...s.ship,
                            modules: s.ship.modules.map((m) =>
                                m.id === damagedModule.id
                                    ? {
                                          ...m,
                                          health: Math.max(
                                              10,
                                              m.health - damage,
                                          ),
                                      }
                                    : m,
                            ),
                        },
                    }));
                    get().addLog(
                        `⚠ Навигационная ошибка! "${damagedModule.name}" повреждён: -${damage}%`,
                        "error",
                    );
                }
            }
        }

        playSound("travel");

        if (distance === 0) {
            if (pilot) get().gainExp(pilot, 5);
            // Mark sector as visited
            set((s) => ({
                currentSector: { ...sector, visited: true },
                galaxy: {
                    ...s.galaxy,
                    sectors: s.galaxy.sectors.map((sec) =>
                        sec.id === sector.id ? { ...sec, visited: true } : sec,
                    ),
                },
            }));
            get().addLog(`Перелёт в ${sector.name}`, "info");
            get().nextTurn();
            set({ gameMode: "sector_map" });
        } else {
            if (pilot) get().gainExp(pilot, distance * 15);
            // Mark sector as visited
            set((s) => ({
                traveling: {
                    destination: sector,
                    turnsLeft: distance,
                    turnsTotal: distance,
                },
                gameMode: "galaxy_map",
                galaxy: {
                    ...s.galaxy,
                    sectors: s.galaxy.sectors.map((sec) =>
                        sec.id === sector.id ? { ...sec, visited: true } : sec,
                    ),
                },
            }));
            get().addLog(
                `Начато путешествие в ${sector.name} (${distance} ходов)`,
                "info",
            );
            get().nextTurn();
        }
    },

    selectLocation: (locationIdx) => {
        const state = get();
        const loc = state.currentSector?.locations[locationIdx];
        if (!loc) return;

        // Allow revisiting resolved distress signals to see what was there
        if (loc.type === "distress_signal" && loc.signalResolved) {
            set({ currentLocation: loc });
            set({ gameMode: "distress_signal" });
            return;
        }

        if (state.completedLocations.includes(loc.id)) {
            get().addLog(`${loc.name} уже посещена`, "warning");
            return;
        }

        // Check for warp_coil artifact (instant teleport within sector)
        const warpCoil = state.artifacts.find(
            (a) => a.effect.type === "sector_teleport" && a.effect.active,
        );

        set({ currentLocation: loc });

        // Warp coil gives instant travel - no turn passes
        if (warpCoil) {
            get().addLog(
                `⚡ Варп-катушка! Мгновенное перемещение к ${loc.name}!`,
                "info",
            );
        } else {
            get().nextTurn();
        }

        switch (loc.type) {
            case "station":
                set({ gameMode: "station" });
                break;
            case "planet":
                set({ gameMode: "planet" });
                // Complete diplomacy contracts (human quest - visit human planet)
                if (loc.dominantRace === "human" && !loc.isEmpty) {
                    const diplomacyContract = get().activeContracts.find(
                        (c) =>
                            c.type === "diplomacy" &&
                            c.isRaceQuest &&
                            c.targetSector === state.currentSector?.id,
                    );
                    if (diplomacyContract) {
                        set((s) => ({
                            credits:
                                s.credits + (diplomacyContract.reward || 0),
                        }));
                        get().addLog(
                            `Дипломатическая миссия выполнена! +${diplomacyContract.reward}₢`,
                            "info",
                        );
                        set((s) => ({
                            completedContractIds: [
                                ...s.completedContractIds,
                                diplomacyContract.id,
                            ],
                            activeContracts: s.activeContracts.filter(
                                (ac) => ac.id !== diplomacyContract.id,
                            ),
                        }));
                    }
                }
                break;
            case "enemy": {
                // Check scanner level vs enemy threat level
                const scannerLevel = get().getScanLevel();
                const enemyTier = loc.threat || 1;
                const needsScanner = scannerLevel < enemyTier;

                if (needsScanner && !loc.signalRevealed) {
                    set({ gameMode: "unknown_ship" });
                } else {
                    get().startCombat(loc);
                }
                break;
            }
            case "ancient_boss": {
                // Check if already defeated
                if (loc.bossDefeated) {
                    get().addLog(`${loc.name} уже уничтожен`, "info");
                    return;
                }
                // Bosses are tier 3, need scanner level 3+
                const scannerLevel = get().getScanLevel();
                const needsScanner = scannerLevel < 3;

                if (needsScanner && !loc.signalRevealed) {
                    set({ gameMode: "unknown_ship" });
                } else {
                    get().startBossCombat(loc);
                }
                break;
            }
            case "anomaly": {
                // Check scanner level vs anomaly tier
                const scannerLevel = get().getScanLevel();
                const anomalyTier = loc.anomalyTier || 1;
                const needsScanner = scannerLevel < anomalyTier;

                if (needsScanner && !loc.signalRevealed) {
                    set({ gameMode: "unknown_ship" });
                } else {
                    // Always open anomaly panel, let AnomalyPanel handle scientist check
                    set({ gameMode: "anomaly" });
                }
                break;
            }
            case "friendly_ship": {
                // Check scanner level (friendly ships are tier 1)
                const scannerLevel = get().getScanLevel();
                const needsScanner = scannerLevel < 1;

                if (needsScanner && !loc.signalRevealed) {
                    set({ gameMode: "unknown_ship" });
                } else {
                    set({ gameMode: "friendly_ship" });
                }
                break;
            }
            case "asteroid_belt":
                set({ gameMode: "asteroid_belt" });
                break;
            case "storm":
                // Mark storm as revealed when entering
                const updatedStormLoc = { ...loc, signalRevealed: true };
                set((s) => {
                    const updatedSector = s.currentSector
                        ? {
                              ...s.currentSector,
                              locations: s.currentSector.locations.map((l) =>
                                  l.id === loc.id ? updatedStormLoc : l,
                              ),
                          }
                        : null;
                    return {
                        currentLocation: updatedStormLoc,
                        currentSector: updatedSector,
                    };
                });
                set({ gameMode: "storm" });
                break;
            case "distress_signal":
                // Check scanner for reveal chance (one-time check)
                if (!loc.signalRevealChecked) {
                    const scanLevel = get().getScanLevel();
                    // Reveal chances: LV1=15%, LV2=30%, LV3=50%, LV4=75%
                    let revealChance = 0;
                    if (scanLevel >= 4) revealChance = 75;
                    else if (scanLevel >= 3) revealChance = 50;
                    else if (scanLevel >= 2) revealChance = 30;
                    else if (scanLevel >= 1) revealChance = 15;

                    const canReveal = Math.random() * 100 < revealChance;

                    if (canReveal && !loc.signalType) {
                        // Determine outcome and reveal it
                        const outcome = determineSignalOutcome();
                        const updatedLocation = {
                            ...loc,
                            signalType: outcome,
                            signalRevealed: true,
                            signalRevealChecked: true,
                        };
                        set((s) => {
                            const updatedSector = s.currentSector
                                ? {
                                      ...s.currentSector,
                                      locations: s.currentSector.locations.map(
                                          (l) =>
                                              l.id === loc.id
                                                  ? updatedLocation
                                                  : l,
                                      ),
                                  }
                                : null;
                            return {
                                currentLocation: updatedLocation,
                                currentSector: updatedSector,
                            };
                        });
                    } else {
                        // Mark as checked but not revealed
                        const updatedLocation = {
                            ...loc,
                            signalRevealChecked: true,
                        };
                        set((s) => {
                            const updatedSector = s.currentSector
                                ? {
                                      ...s.currentSector,
                                      locations: s.currentSector.locations.map(
                                          (l) =>
                                              l.id === loc.id
                                                  ? updatedLocation
                                                  : l,
                                      ),
                                  }
                                : null;
                            return {
                                currentLocation: updatedLocation,
                                currentSector: updatedSector,
                            };
                        });
                    }
                }
                set({ gameMode: "distress_signal" });
                break;
        }
    },

    travelThroughBlackHole: () => {
        const state = get();
        const currentSector = state.currentSector;

        // Check if current sector has a black hole
        if (!currentSector || currentSector.star?.type !== "blackhole") {
            get().addLog("В этом секторе нет чёрной дыры!", "error");
            return;
        }

        // Find other black holes
        const otherBlackHoles = state.galaxy.sectors.filter(
            (s) => s.star?.type === "blackhole" && s.id !== currentSector.id,
        );

        if (otherBlackHoles.length === 0) {
            get().addLog("Нет другой чёрной дыры для телепортации!", "error");
            return;
        }

        // Pick random destination black hole
        const destination =
            otherBlackHoles[Math.floor(Math.random() * otherBlackHoles.length)];

        // Check for scientist to reduce damage
        const scientist = state.crew.find((c) => c.profession === "scientist");
        const damageReduction = scientist ? 0.5 : 1; // 50% damage reduction with scientist

        // Calculate base damage
        const baseModuleDamage = Math.floor(
            (15 + Math.random() * 20) * damageReduction,
        );
        const baseCrewDamage = Math.floor(
            (10 + Math.random() * 15) * damageReduction,
        );

        // Apply damage to random modules
        const damagedModules = [...state.ship.modules];
        const numModulesToDamage = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < numModulesToDamage; i++) {
            const randomIdx = Math.floor(Math.random() * damagedModules.length);
            damagedModules[randomIdx] = {
                ...damagedModules[randomIdx],
                health: Math.max(
                    10,
                    damagedModules[randomIdx].health - baseModuleDamage,
                ),
            };
        }

        // Apply damage to crew
        const damagedCrew = state.crew.map((c) => ({
            ...c,
            health: Math.max(10, c.health - baseCrewDamage),
            happiness: Math.max(0, c.happiness - 15),
        }));

        // Teleport to destination
        playSound("travel");
        set({
            currentSector: destination,
            ship: { ...state.ship, modules: damagedModules },
            crew: damagedCrew,
            gameMode: "sector_map",
        });

        // Log the event
        get().addLog(`🕳️ ТЕЛЕПОРТАЦИЯ через чёрную дыру!`, "warning");
        get().addLog(`Прибытие в ${destination.name}`, "info");
        get().addLog(
            `Модули повреждены: -${baseModuleDamage}% каждому из ${numModulesToDamage} модулей`,
            "error",
        );
        get().addLog(`Экипаж пострадал: -${baseCrewDamage} здоровья`, "error");

        // Give scientist experience if present
        if (scientist) {
            get().gainExp(scientist, 50);
            get().addLog(
                `${scientist.name} изучил чёрную дыру! +50 опыта`,
                "info",
            );
        }

        get().nextTurn();
    },

    mineAsteroid: () => {
        const state = get();
        const loc = state.currentLocation;

        if (!loc || loc.type !== "asteroid_belt") {
            get().addLog("Это не астероидный пояс!", "error");
            return;
        }

        if (loc.mined) {
            get().addLog("Этот пояс уже разработан!", "warning");
            return;
        }

        const drillLevel = get().getDrillLevel();
        const asteroidTier = loc.asteroidTier || 1;

        if (drillLevel < asteroidTier) {
            get().addLog(
                `Нужен бур уровня ${asteroidTier}! У вас: уровень ${drillLevel}`,
                "error",
            );
            playSound("error");
            return;
        }

        // Mining success
        const resources = loc.resources || { minerals: 0, rare: 0, credits: 0 };
        // Efficiency bonus based on drill level difference
        // Tier 1: drill 1=0%, 2=20%, 3=40%, 4=70%
        // Tier 2: drill 2=0%, 3=20%, 4=50%
        // Tier 3: drill 3=0%, 4=30%
        // Tier 4: drill 4=0%
        let efficiencyBonus = 1;
        if (drillLevel === 4 && asteroidTier < 4) {
            // Ancient drill bonus
            efficiencyBonus = 1 + [0.7, 0.5, 0.3, 0][asteroidTier - 1];
        } else if (drillLevel > asteroidTier) {
            // Regular drill bonus: 20% per level above
            efficiencyBonus = 1 + (drillLevel - asteroidTier) * 0.2;
        }
        const bonusPercent = Math.round((efficiencyBonus - 1) * 100);

        const mineralsGained = Math.floor(resources.minerals * efficiencyBonus);
        const rareGained = Math.floor(resources.rare * efficiencyBonus);
        const creditsGained = Math.floor(resources.credits * efficiencyBonus);

        // Add to cargo/trade goods
        set((s) => ({
            credits: s.credits + creditsGained,
            ship: {
                ...s.ship,
                tradeGoods: [
                    ...s.ship.tradeGoods,
                    { item: "minerals", quantity: mineralsGained, buyPrice: 0 },
                    ...(rareGained > 0
                        ? [
                              {
                                  item: "rare_minerals",
                                  quantity: rareGained,
                                  buyPrice: 0,
                              },
                          ]
                        : []),
                ],
            },
        }));

        // Mark as mined
        set((s) => ({
            currentLocation: s.currentLocation
                ? { ...s.currentLocation, mined: true }
                : null,
            completedLocations: [...s.completedLocations, loc.id],
        }));

        playSound("success");
        // Log results (order matters for display - newest first)
        get().addLog(`Кредиты: +${creditsGained}₢`, "info");
        if (rareGained > 0)
            get().addLog(`Редкие минералы: +${rareGained}`, "info");
        get().addLog(`Минералы: +${mineralsGained}`, "info");

        // Give engineer experience
        const engineer = state.crew.find((c) => c.profession === "engineer");
        if (engineer) get().gainExp(engineer, 15 * asteroidTier);

        // DON'T close the panel - let player see results
        get().nextTurn();
    },

    enterStorm: () => {
        const state = get();
        const loc = state.currentLocation;

        if (!loc || loc.type !== "storm") {
            get().addLog("Это не шторм!", "error");
            return;
        }

        // Prevent double entry - mark as completed immediately
        if (state.completedLocations.includes(loc.id)) {
            get().addLog(`${loc.name} уже исследован`, "warning");
            return;
        }

        // Mark as completed immediately to prevent double-click
        set((s) => ({
            completedLocations: [...s.completedLocations, loc.id],
        }));

        const stormType = loc.stormType || "radiation";
        const intensity = loc.stormIntensity || 1;

        // Calculate damage based on storm type and intensity
        let shieldDamage = 0;
        let moduleDamage = 0;
        let crewDamage = 0;
        let lootMultiplier = 1;

        switch (stormType) {
            case "radiation":
                crewDamage = (15 + Math.random() * 15) * intensity;
                moduleDamage = (5 + Math.random() * 10) * intensity;
                lootMultiplier = 2;
                break;
            case "ionic":
                shieldDamage = (30 + Math.random() * 30) * intensity;
                moduleDamage = (10 + Math.random() * 15) * intensity;
                lootMultiplier = 2.5;
                break;
            case "plasma":
                shieldDamage = (20 + Math.random() * 20) * intensity;
                moduleDamage = (15 + Math.random() * 20) * intensity;
                crewDamage = (10 + Math.random() * 10) * intensity;
                lootMultiplier = 3;
                break;
        }

        // Apply shield damage
        const newShields = Math.max(0, state.ship.shields - shieldDamage);

        // Apply module damage to random modules
        const damagedModules = [...state.ship.modules];
        const numModulesToDamage = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < numModulesToDamage; i++) {
            const randomIdx = Math.floor(Math.random() * damagedModules.length);
            damagedModules[randomIdx] = {
                ...damagedModules[randomIdx],
                health: Math.max(
                    10,
                    damagedModules[randomIdx].health - Math.floor(moduleDamage),
                ),
            };
        }

        // Apply crew damage
        const damagedCrew = state.crew.map((c) => ({
            ...c,
            health: Math.max(10, c.health - Math.floor(crewDamage)),
            happiness: Math.max(0, c.happiness - 10),
        }));

        // Calculate loot (storms give better rewards than random events)
        const baseLoot = Math.floor(
            (80 + Math.random() * 70) * intensity * lootMultiplier,
        );
        const rareLootChance = 0.1 * intensity * lootMultiplier;
        const rareLoot = Math.random() < rareLootChance;

        // Apply changes
        set((s) => ({
            ship: { ...s.ship, shields: newShields, modules: damagedModules },
            crew: damagedCrew,
            credits: s.credits + baseLoot,
        }));

        // Log the event
        playSound("combat");
        get().addLog(`Щиты: -${Math.floor(shieldDamage)}`, "error");
        get().addLog(
            `Модули повреждены: -${Math.floor(moduleDamage)}% x${numModulesToDamage}`,
            "error",
        );
        if (crewDamage > 0)
            get().addLog(
                `Экипаж: -${Math.floor(crewDamage)} здоровья`,
                "error",
            );
        get().addLog(`Добыча: +${baseLoot}₢`, "info");
        if (rareLoot) {
            const rareBonus = Math.floor(100 + Math.random() * 150) * intensity;
            set((s) => ({ credits: s.credits + rareBonus }));
            get().addLog(`★ РЕДКАЯ НАХОДКА! +${rareBonus}₢`, "info");
        }

        // Give scientist experience for studying the storm
        const scientist = state.crew.find((c) => c.profession === "scientist");
        if (scientist) {
            get().gainExp(scientist, 25 * intensity);
            get().addLog(
                `${scientist.name} собрал данные о шторме! +${25 * intensity} опыта`,
                "info",
            );
        }

        // Complete rescue contracts (voidborn quest - survive storm in target sector)
        const rescueContract = get().activeContracts.find(
            (c) =>
                c.type === "rescue" &&
                c.isRaceQuest &&
                c.sectorId === state.currentSector?.id,
        );
        if (rescueContract) {
            set((s) => ({ credits: s.credits + (rescueContract.reward || 0) }));
            get().addLog(
                `Путешествие в Пустоту завершено! +${rescueContract.reward}₢`,
                "info",
            );
            set((s) => ({
                completedContractIds: [
                    ...s.completedContractIds,
                    rescueContract.id,
                ],
                activeContracts: s.activeContracts.filter(
                    (ac) => ac.id !== rescueContract.id,
                ),
            }));
        }

        // DON'T close the panel - let player see results and click "Leave"
        get().updateShipStats();
        get().nextTurn();
    },

    showGalaxyMap: () => set({ gameMode: "galaxy_map" }),
    showSectorMap: () => set({ gameMode: "sector_map" }),
    showAssignments: () => set({ gameMode: "assignments" }),

    startCombat: (enemy, isAmbush = false) => {
        playSound("combat");
        const enemyMods: Array<{
            id: number;
            type: string;
            name: string;
            health: number;
            damage: number;
            defense: number;
        }> = [];
        const num = (enemy.threat || 1) + 2;
        const threat = enemy.threat || 1;

        // Always add at least one weapon module first
        enemyMods.push({
            id: 0,
            type: "weapon",
            name: "Оружие",
            health: 100,
            damage: threat * 8,
            defense: 0,
        });

        // Add remaining modules
        for (let i = 1; i < num; i++) {
            const types = ["weapon", "shield", "reactor"];
            const type = types[Math.floor(Math.random() * types.length)];
            enemyMods.push({
                id: i,
                type,
                name:
                    type === "weapon"
                        ? "Оружие"
                        : type === "shield"
                          ? "Щит"
                          : "Реактор",
                health: 100,
                damage: type === "weapon" ? threat * 8 : 0,
                defense: type === "shield" ? threat * 6 : 0,
            });
        }

        set((s) => ({
            ship: { ...s.ship, shields: s.ship.maxShields },
            currentCombat: {
                enemy: {
                    name: enemy.name,
                    modules: enemyMods,
                    selectedModule: null,
                    shields: (enemy.threat || 1) * 20,
                    maxShields: (enemy.threat || 1) * 20,
                    threat: enemy.threat || 1,
                },
                loot: { credits: (enemy.threat || 1) * 100 },
                isAmbush,
                ambushAttackDone: false,
            },
            gameMode: "combat",
        }));
        get().addLog(`Щиты восстановлены: ${get().ship.shields}`, "combat");

        if (isAmbush) {
            get().addLog(`⚠️ ЗАСАДА! ${enemy.name} атакует первым!`, "error");
            // Execute enemy attack immediately for ambush
            get().executeAmbushAttack();
        } else {
            get().addLog(`Бой с ${enemy.name}!`, "combat");
        }
    },

    startBossCombat: (bossLocation) => {
        playSound("combat");
        const bossData = getBossById(bossLocation.bossId || "");
        if (!bossData) {
            get().addLog("Ошибка: данные босса не найдены!", "error");
            return;
        }

        // Convert boss modules to enemy modules
        const bossModules: EnemyModule[] = bossData.modules.map((m, idx) => ({
            id: idx,
            type: m.type,
            name: m.name,
            health: m.health,
            maxHealth: m.health,
            damage: m.damage || 0,
            defense: m.defense || 0,
            isAncient: m.isAncient,
            specialEffect: m.specialEffect,
        }));

        // Get random undiscovered artifact for guaranteed drop
        const artifact = getRandomUndiscoveredArtifact(get().artifacts);

        set((s) => ({
            ship: { ...s.ship, shields: s.ship.maxShields },
            currentCombat: {
                enemy: {
                    name: bossData.name,
                    modules: bossModules,
                    selectedModule: null,
                    shields: bossData.shields,
                    maxShields: bossData.shields,
                    isBoss: true,
                    bossId: bossData.id,
                    regenRate: bossData.regenRate,
                    specialAbility: bossData.specialAbility,
                },
                loot: {
                    credits: 500 * bossData.tier,
                    guaranteedArtifact: artifact?.id,
                },
            },
            gameMode: "combat",
        }));
        get().addLog(`⚠️ БОСС: ${bossData.name}!`, "warning");
        get().addLog(`"${bossData.description}"`, "info");
        get().addLog(`Регенерация: ${bossData.regenRate}% за ход`, "warning");
    },

    executeAmbushAttack: () => {
        const state = get();
        const combat = state.currentCombat;
        if (!combat) return;

        // Mark ambush as done
        set((s) => {
            if (!s.currentCombat) return s;
            return {
                currentCombat: {
                    ...s.currentCombat,
                    ambushAttackDone: true,
                },
            };
        });

        // Calculate enemy damage
        const eDmg = combat.enemy.modules.reduce(
            (s, m) => s + (m.damage || 0),
            0,
        );

        // Select target module (same AI as normal attack)
        const activeMods = state.ship.modules.filter((m) => m.health > 0);

        const getModuleTargetPriority = (m: Module): number => {
            let priority = 0;
            const crewInModule = get().crew.filter((c) => c.moduleId === m.id);

            switch (m.type) {
                case "weaponbay":
                    priority = 100;
                    break;
                case "cockpit":
                    priority = 90;
                    break;
                case "reactor":
                    priority = 85;
                    break;
                case "engine":
                    priority = 70;
                    break;
                case "shield":
                    priority = 60;
                    break;
                case "lifesupport":
                    priority = 50;
                    break;
                case "fueltank":
                    priority = 45;
                    break;
                case "medical":
                    priority = 40;
                    break;
                case "cargo":
                    priority = 20;
                    break;
                case "scanner":
                    priority = 15;
                    break;
                case "habitat":
                    priority = 10;
                    break;
                case "drill":
                    priority = 5;
                    break;
                default:
                    priority = 30;
            }

            if (m.health < 30) priority += 30;
            else if (m.health < 50) priority += 15;
            else if (m.health < 70) priority += 5;

            priority += crewInModule.length * 10;
            priority += Math.random() * 20;

            return priority;
        };

        let tgt: Module | null = null;
        if (activeMods.length > 0) {
            const sortedMods = [...activeMods].sort(
                (a, b) =>
                    getModuleTargetPriority(b) - getModuleTargetPriority(a),
            );
            tgt = sortedMods[0];
        }

        // Apply damage
        if (get().ship.shields > 0) {
            const sDmg = Math.min(get().ship.shields, eDmg);
            set((s) => ({
                ship: { ...s.ship, shields: s.ship.shields - sDmg },
            }));
            get().addLog(`Враг атакует из засады! Щиты: -${sDmg}`, "error");
            const overflow = eDmg - sDmg;
            if (overflow > 0 && tgt) {
                const reducedDamage = Math.floor(overflow * 0.8); // Slightly reduced for gameplay
                set((s) => ({
                    ship: {
                        ...s.ship,
                        modules: s.ship.modules.map((m) =>
                            m.id === tgt!.id
                                ? {
                                      ...m,
                                      health: Math.max(
                                          0,
                                          m.health - reducedDamage,
                                      ),
                                  }
                                : m,
                        ),
                    },
                }));
                get().addLog(
                    `Пробитие! "${tgt.name}": -${reducedDamage}%`,
                    "error",
                );
            }
        } else if (tgt) {
            const reducedDamage = Math.floor(eDmg * 0.8);
            set((s) => ({
                ship: {
                    ...s.ship,
                    modules: s.ship.modules.map((m) =>
                        m.id === tgt.id
                            ? {
                                  ...m,
                                  health: Math.max(0, m.health - reducedDamage),
                              }
                            : m,
                    ),
                },
            }));
            get().addLog(
                `Враг атакует из засады! "${tgt.name}": -${reducedDamage}%`,
                "error",
            );
        }

        // Damage crew in targeted module
        if (tgt) {
            const crewInModule = state.crew.filter(
                (c) => c.moduleId === tgt!.id,
            );
            if (crewInModule.length > 0) {
                const crewDamage = 15;
                set((s) => ({
                    crew: s.crew.map((c) =>
                        c.moduleId === tgt!.id
                            ? {
                                  ...c,
                                  health: Math.max(0, c.health - crewDamage),
                              }
                            : c,
                    ),
                }));
                get().addLog(
                    `Экипаж в "${tgt.name}" получил урон: -${crewDamage}`,
                    "warning",
                );

                // Check for dead crew
                const deadCrew = get().crew.filter((c) => c.health <= 0);
                if (deadCrew.length > 0) {
                    set((s) => ({ crew: s.crew.filter((c) => c.health > 0) }));
                    get().addLog(
                        `☠️ Потери: ${deadCrew.map((c) => c.name).join(", ")}`,
                        "error",
                    );
                    get().checkGameOver();
                }
            }
        }
    },

    selectEnemyModule: (moduleId) => {
        const state = get();

        // Check if any crew is in a weapon bay with targeting assignment (combat assignment during battle)
        const weaponBays = state.ship.modules.filter(
            (m) => m.type === "weaponbay" && !m.disabled && m.health > 0,
        );
        const hasGunnerInWeaponBay = state.crew.some(
            (c) =>
                weaponBays.some((wb) => wb.id === c.moduleId) &&
                getActiveAssignment(c, true) === "targeting",
        );

        if (!hasGunnerInWeaponBay) {
            get().addLog(
                "Нужен наводчик в оружейной для выбора цели!",
                "warning",
            );
            return;
        }

        set((s) => {
            if (!s.currentCombat) return s;
            const mod = s.currentCombat.enemy.modules.find(
                (m) => m.id === moduleId,
            );
            if (mod && mod.health > 0) {
                return {
                    currentCombat: {
                        ...s.currentCombat,
                        enemy: {
                            ...s.currentCombat.enemy,
                            selectedModule: moduleId,
                        },
                    },
                };
            }
            return s;
        });
    },

    attackEnemy: () => {
        const state = get();
        if (!state.currentCombat) return;

        // Check if any crew is in a weapon bay for full accuracy
        const weaponBays = state.ship.modules.filter(
            (m) => m.type === "weaponbay" && !m.disabled && m.health > 0,
        );
        const crewInWeaponBays = state.crew.filter(
            (c) =>
                weaponBays.some((wb) => wb.id === c.moduleId) &&
                (c.profession === "gunner" ||
                    (c.profession === "pilot" &&
                        getActiveAssignment(c, true) === "targeting")),
        );
        const hasGunner = crewInWeaponBays.length > 0;

        // Apply gunner bonus damage
        let pDmg = get().getTotalDamage().total;
        if (hasGunner) {
            // Gunner gives +15% damage
            pDmg = Math.floor(pDmg * 1.15);
        } else {
            pDmg = Math.floor(pDmg * 0.5); // 50% damage penalty without gunner
            get().addLog(`⚠ Нет канонира в оружейной! Урон -50%`, "warning");
        }

        // Apply critical_matrix artifact bonus (25% crit chance for double damage)
        const criticalMatrix = state.artifacts.find(
            (a) => a.effect.type === "crit_chance" && a.effect.active,
        );
        let isCrit = false;
        if (criticalMatrix) {
            const critChance = criticalMatrix.effect.value || 0.25;
            isCrit = Math.random() < critChance;
            if (isCrit) {
                pDmg = Math.floor(pDmg * 2);
                get().addLog(`💥 КРИТИЧЕСКИЙ УДАР! x2 урон!`, "combat");
            }
        }

        // Determine target - if no gunner, can't select target, random module
        let tgtMod = state.currentCombat.enemy.modules.find(
            (m) => m.id === state.currentCombat!.enemy.selectedModule,
        );

        if (!hasGunner) {
            // Without gunner, attack random alive module
            const aliveModules = state.currentCombat.enemy.modules.filter(
                (m) => m.health > 0,
            );
            if (aliveModules.length === 0) return;
            tgtMod =
                aliveModules[Math.floor(Math.random() * aliveModules.length)];
            get().addLog(`Случайная цель: ${tgtMod.name}`, "warning");
        } else if (!tgtMod || tgtMod.health <= 0) {
            get().addLog("Выберите цель!", "error");
            return;
        }

        // Damage enemy
        if (state.currentCombat.enemy.shields > 0) {
            const sDmg = Math.min(state.currentCombat.enemy.shields, pDmg);
            set((s) => {
                if (!s.currentCombat) return s;
                return {
                    currentCombat: {
                        ...s.currentCombat,
                        enemy: {
                            ...s.currentCombat.enemy,
                            shields: s.currentCombat.enemy.shields - sDmg,
                        },
                    },
                };
            });
            get().addLog(`Урон щитам врага: ${sDmg}`, "combat");
            const overflow = pDmg - sDmg;
            if (overflow > 0) {
                set((s) => {
                    if (!s.currentCombat) return s;
                    return {
                        currentCombat: {
                            ...s.currentCombat,
                            enemy: {
                                ...s.currentCombat.enemy,
                                modules: s.currentCombat.enemy.modules.map(
                                    (m) =>
                                        m.id === tgtMod!.id
                                            ? {
                                                  ...m,
                                                  health: Math.max(
                                                      0,
                                                      m.health - overflow,
                                                  ),
                                              }
                                            : m,
                                ),
                            },
                        },
                    };
                });
                get().addLog(
                    `Пробитие! Модуль "${tgtMod.name}": -${overflow}%`,
                    "combat",
                );
            }
        } else {
            const dmg = Math.max(5, pDmg - (tgtMod.defense || 0));
            set((s) => {
                if (!s.currentCombat) return s;
                return {
                    currentCombat: {
                        ...s.currentCombat,
                        enemy: {
                            ...s.currentCombat.enemy,
                            modules: s.currentCombat.enemy.modules.map((m) =>
                                m.id === tgtMod!.id
                                    ? {
                                          ...m,
                                          health: Math.max(0, m.health - dmg),
                                      }
                                    : m,
                            ),
                        },
                    },
                };
            });
            get().addLog(`Модуль "${tgtMod.name}": -${dmg}%`, "combat");
        }

        // Check victory
        const updatedCombat = get().currentCombat;
        if (
            updatedCombat &&
            updatedCombat.enemy.modules.every((m) => m.health <= 0)
        ) {
            // Victory!
            const loot = updatedCombat.loot;

            // Boss special: check for resurrect chance
            if (
                updatedCombat.enemy.isBoss &&
                updatedCombat.enemy.specialAbility?.effect ===
                    "resurrect_chance"
            ) {
                const resurrectChance =
                    (updatedCombat.enemy.specialAbility.value || 20) / 100;
                if (Math.random() < resurrectChance) {
                    // Resurrect boss with 30% health
                    get().addLog(
                        `⚠️ ${updatedCombat.enemy.name} ВОСКРЕСАЕТ!`,
                        "error",
                    );
                    set((s) => {
                        if (!s.currentCombat) return s;
                        return {
                            currentCombat: {
                                ...s.currentCombat,
                                enemy: {
                                    ...s.currentCombat.enemy,
                                    modules: s.currentCombat.enemy.modules.map(
                                        (m) => ({
                                            ...m,
                                            health: Math.floor(
                                                (m.maxHealth || 100) * 0.3,
                                            ),
                                        }),
                                    ),
                                    shields: Math.floor(
                                        s.currentCombat.enemy.maxShields * 0.3,
                                    ),
                                },
                            },
                        };
                    });
                    // Continue combat instead of ending
                    get().addLog(`Босс восстановил 30% здоровья!`, "warning");
                    return;
                }
            }

            // Collect battle results
            const damagedModules = get()
                .ship.modules.filter((m) => m.health < 100)
                .map((m) => ({ name: m.name, damage: 100 - m.health }));
            const destroyedModules = get()
                .ship.modules.filter((m) => m.health <= 0)
                .map((m) => m.name);
            const woundedCrew = get()
                .crew.filter((c) => c.health < 100)
                .map((c) => ({ name: c.name, damage: 100 - c.health }));

            // Add credits
            let creditsAmount = loot.credits;

            // Apply black_box cursed artifact bonus (+50% credits)
            const blackBox = state.artifacts.find(
                (a) => a.effect.type === "credit_booster" && a.effect.active,
            );
            if (blackBox) {
                creditsAmount = Math.floor(
                    creditsAmount * (1 + (blackBox.effect.value || 0.5)),
                );
            }

            set((s) => ({ credits: s.credits + creditsAmount }));

            if (blackBox && creditsAmount > loot.credits) {
                get().addLog(
                    `📦 Чёрный Ящик: +${creditsAmount - loot.credits}₢ бонус`,
                    "info",
                );
            }

            // Check for artifact
            let artifactName: string | undefined;
            if (updatedCombat.enemy.isBoss && loot.guaranteedArtifact) {
                const artifactId = loot.guaranteedArtifact;
                const artifact = get().artifacts.find(
                    (a) => a.id === artifactId,
                );
                if (artifact && !artifact.discovered) {
                    artifactName = artifact.name;
                    set((s) => ({
                        artifacts: s.artifacts.map((a) =>
                            a.id === artifactId
                                ? { ...a, discovered: true }
                                : a,
                        ),
                    }));
                }
            }

            // Mark boss as defeated in location
            if (updatedCombat.enemy.isBoss && get().currentLocation) {
                set((s) => ({
                    currentSector: s.currentSector
                        ? {
                              ...s.currentSector,
                              locations: s.currentSector.locations.map((loc) =>
                                  loc.id === get().currentLocation?.id
                                      ? { ...loc, bossDefeated: true }
                                      : loc,
                              ),
                          }
                        : null,
                }));
            }

            // ═══════════════════════════════════════════════════════════════
            // COMPLETE CONTRACTS
            // ═══════════════════════════════════════════════════════════════
            const enemyThreat = updatedCombat?.enemy.threat || 1;

            // Complete combat contracts (defeat any enemy in target sector)
            const completedCombat = get().activeContracts.filter(
                (c) =>
                    c.type === "combat" &&
                    c.sectorId === get().currentSector?.id,
            );
            completedCombat.forEach((c) => {
                set((s) => ({ credits: s.credits + c.reward }));
                get().addLog(
                    `Контракт "${c.desc}" выполнен! +${c.reward}₢`,
                    "info",
                );
                set((s) => ({
                    completedContractIds: [...s.completedContractIds, c.id],
                    activeContracts: s.activeContracts.filter(
                        (ac) => ac.id !== c.id,
                    ),
                }));
            });

            // Complete bounty contracts (defeat enemy with required threat in target sector)
            const completedBounty = get().activeContracts.filter(
                (c) =>
                    c.type === "bounty" &&
                    c.targetSector === get().currentSector?.id &&
                    enemyThreat >= (c.targetThreat || 1),
            );
            completedBounty.forEach((c) => {
                set((s) => ({ credits: s.credits + c.reward }));
                get().addLog(`Охота выполнена! +${c.reward}₢`, "info");
                set((s) => ({
                    completedContractIds: [...s.completedContractIds, c.id],
                    activeContracts: s.activeContracts.filter(
                        (ac) => ac.id !== c.id,
                    ),
                }));
            });

            // Complete mining contracts (crystalline quest - find artifact)
            const miningContract = get().activeContracts.find(
                (c) => c.type === "mining" && c.isRaceQuest,
            );
            if (miningContract && updatedCombat?.enemy.isBoss) {
                // Bosses drop artifacts, completes crystalline quest
                set((s) => ({
                    credits: s.credits + (miningContract.reward || 0),
                }));
                get().addLog(
                    `Кристалл найден! +${miningContract.reward}₢`,
                    "info",
                );
                set((s) => ({
                    completedContractIds: [
                        ...s.completedContractIds,
                        miningContract.id,
                    ],
                    activeContracts: s.activeContracts.filter(
                        (ac) => ac.id !== miningContract.id,
                    ),
                }));
            }

            // Create battle result
            const battleResult: BattleResult = {
                victory: true,
                enemyName: updatedCombat.enemy.name,
                creditsEarned: loot.credits,
                modulesDamaged: damagedModules,
                modulesDestroyed: destroyedModules,
                crewWounded: woundedCrew,
                crewKilled: [], // Killed crew are already removed from crew array
                artifactFound: artifactName,
            };

            // Give experience to crew who participated in combat
            const gunner = state.crew.find(
                (c) =>
                    c.profession === "gunner" ||
                    (c.profession === "pilot" &&
                        getActiveAssignment(c, true) === "targeting"),
            );
            if (gunner) {
                get().gainExp(gunner, 10 + enemyThreat * 5);
                get().addLog(`${gunner.name} получил боевой опыт!`, "info");
            }

            // Give small experience to any crew in weapon bays
            const weaponBayCrew = state.crew.filter(
                (c) =>
                    weaponBays.some((wb) => wb.id === c.moduleId) &&
                    c.id !== gunner?.id,
            );
            weaponBayCrew.forEach((c) => {
                get().gainExp(c, 5);
            });

            // Mark location as completed
            if (get().currentLocation) {
                set((s) => ({
                    completedLocations: [
                        ...s.completedLocations,
                        get().currentLocation!.id,
                    ],
                }));
            }

            // Reset combat assignments after battle
            set((s) => ({
                crew: s.crew.map((c) => ({
                    ...c,
                    combatAssignment: null,
                    combatAssignmentEffect: null,
                })),
            }));

            // Set battle results and change mode
            set((s) => ({
                battleResult,
                currentCombat: null,
                ship: { ...s.ship, shields: s.ship.maxShields },
                gameMode: "battle_results",
            }));

            get().updateShipStats();
            return;
        }

        // Enemy attack
        let eDmg =
            updatedCombat?.enemy.modules.reduce(
                (s, m) => s + (m.damage || 0),
                0,
            ) || 0;

        // ═══════════════════════════════════════════════════════════════
        // KRYLORIAN INTIMIDATION - Chance to evade enemy attack
        // ═══════════════════════════════════════════════════════════════
        const krylorianCrew = state.crew.filter((c) => c.race === "krylorian");
        let evasionChance = 0;
        krylorianCrew.forEach((c) => {
            const race = RACES[c.race];
            if (race?.specialTraits) {
                const intimidationTrait = race.specialTraits.find(
                    (t) => t.id === "intimidation",
                );
                if (
                    intimidationTrait &&
                    intimidationTrait.effects.evasionBonus
                ) {
                    evasionChance += intimidationTrait.effects
                        .evasionBonus as number;
                }
            }
        });

        if (evasionChance > 0 && Math.random() < evasionChance) {
            get().addLog(
                `🦎 Крилорианское устрашение! Враг промахнулся!`,
                "info",
            );
            // Skip the rest of enemy attack
        } else {
            // ═══════════════════════════════════════════════════════════════
            // ENEMY AI - Module targeting
            // Priority: Weapon Bay > Cockpit > Reactor > Engine > Shield > Others
            // Also considers: damaged modules (easier to destroy), crew presence
            // ═══════════════════════════════════════════════════════════════
            const activeMods = get().ship.modules.filter((m) => m.health > 0);

            const getModuleTargetPriority = (m: Module): number => {
                let priority = 0;
                const crewInModule = get().crew.filter(
                    (c) => c.moduleId === m.id,
                );

                // Base priority by module type
                switch (m.type) {
                    case "weaponbay":
                        priority = 100;
                        break; // High priority - disable weapons
                    case "cockpit":
                        priority = 90;
                        break; // High - disable navigation
                    case "reactor":
                        priority = 85;
                        break; // High - disable power
                    case "engine":
                        priority = 70;
                        break; // Medium - disable travel
                    case "shield":
                        priority = 60;
                        break; // Medium - disable defense
                    case "lifesupport":
                        priority = 50;
                        break; // Lower - crew suffocation
                    case "fueltank":
                        priority = 45;
                        break; // Lower - fuel
                    case "medical":
                        priority = 40;
                        break; // Lower - healing
                    case "cargo":
                        priority = 20;
                        break; // Low
                    case "scanner":
                        priority = 15;
                        break; // Low
                    case "habitat":
                        priority = 10;
                        break; // Low
                    case "drill":
                        priority = 5;
                        break; // Lowest
                    default:
                        priority = 30;
                }

                // Bonus for damaged modules (easier to destroy)
                if (m.health < 30) priority += 30;
                else if (m.health < 50) priority += 15;
                else if (m.health < 70) priority += 5;

                // Bonus for modules with crew (kill crew)
                priority += crewInModule.length * 10;

                // Add some randomness
                priority += Math.random() * 20;

                return priority;
            };

            // Select target module
            let tgt: Module | null = null;
            if (activeMods.length > 0) {
                // Sort by priority and pick the highest
                const sortedMods = [...activeMods].sort(
                    (a, b) =>
                        getModuleTargetPriority(b) - getModuleTargetPriority(a),
                );
                tgt = sortedMods[0];
            }

            // Helper: Damage crew in module
            const damageCrewInModule = (
                moduleId: number,
                damage: number,
                isDestruction: boolean,
            ) => {
                const crewInModule = get().crew.filter(
                    (c) => c.moduleId === moduleId,
                );
                if (crewInModule.length === 0) return;

                const actualDamage = isDestruction
                    ? Math.floor(damage * 1.5)
                    : damage;

                // Check for life_crystal artifact (crew can't die, health stays at 1)
                const lifeCrystal = state.artifacts.find(
                    (a) => a.effect.type === "crew_immortal" && a.effect.active,
                );

                set((s) => ({
                    crew: s.crew.map((c) => {
                        if (c.moduleId !== moduleId) return c;
                        let newHealth = c.health - actualDamage;
                        // Apply life_crystal immortality
                        if (lifeCrystal && newHealth < 1) {
                            newHealth = 1;
                        }
                        return {
                            ...c,
                            health: Math.max(0, newHealth),
                        };
                    }),
                }));

                if (isDestruction) {
                    get().addLog(
                        `💥 Модуль уничтожен! Экипаж получает критический урон: -${actualDamage}`,
                        "error",
                    );
                    if (lifeCrystal) {
                        get().addLog(`✨ Кристалл Жизни спас экипаж!`, "info");
                    }
                } else {
                    get().addLog(
                        `👤 Экипаж в модуле получил урон: -${actualDamage}`,
                        "warning",
                    );
                }

                // Log affected crew
                crewInModule.forEach((c) => {
                    const newHealth =
                        get().crew.find((cr) => cr.id === c.id)?.health || 0;
                    if (newHealth <= 0) {
                        get().addLog(`☠️ ${c.name} погиб!`, "error");
                    } else if (lifeCrystal && newHealth === 1) {
                        get().addLog(
                            `✨ ${c.name} выжил благодаря Кристаллу Жизни!`,
                            "info",
                        );
                    }
                });
            };

            if (get().ship.shields > 0) {
                const sDmg = Math.min(get().ship.shields, eDmg);
                set((s) => ({
                    ship: { ...s.ship, shields: s.ship.shields - sDmg },
                }));
                get().addLog(`Враг по щитам: -${sDmg}`, "warning");
                const overflow = eDmg - sDmg;

                // ═══════════════════════════════════════════════════════════════
                // MIRROR SHIELD - Reflect 30% of damage back to enemy
                // ═══════════════════════════════════════════════════════════════
                const mirrorShield = state.artifacts.find(
                    (a) =>
                        a.effect.type === "damage_reflect" && a.effect.active,
                );
                if (mirrorShield && overflow > 0) {
                    const reflectPercent = mirrorShield.effect.value || 0.3;
                    const reflectedDamage = Math.floor(
                        overflow * reflectPercent,
                    );
                    if (reflectedDamage > 0) {
                        set((s) => {
                            if (!s.currentCombat) return s;
                            return {
                                currentCombat: {
                                    ...s.currentCombat,
                                    enemy: {
                                        ...s.currentCombat.enemy,
                                        shields: Math.max(
                                            0,
                                            s.currentCombat.enemy.shields -
                                                reflectedDamage,
                                        ),
                                    },
                                },
                            };
                        });
                        get().addLog(
                            `🛡️ Зеркальный щит! Отражено ${reflectedDamage} урона!`,
                            "info",
                        );
                    }
                }

                if (overflow > 0 && tgt) {
                    // ═══════════════════════════════════════════════════════════════
                    // CRYSTALLINE ARMOR - Module damage reduction
                    // ═══════════════════════════════════════════════════════════════
                    let moduleDefense = 0;
                    const crystallineCrew = state.crew.filter(
                        (c) => c.race === "crystalline",
                    );
                    crystallineCrew.forEach((c) => {
                        const race = RACES[c.race];
                        if (race?.specialTraits) {
                            const armorTrait = race.specialTraits.find(
                                (t) => t.id === "crystal_armor",
                            );
                            if (
                                armorTrait &&
                                armorTrait.effects.moduleDefense
                            ) {
                                moduleDefense += armorTrait.effects
                                    .moduleDefense as number;
                            }
                        }
                    });

                    const reducedDamage = Math.floor(
                        overflow * (1 - moduleDefense),
                    );
                    const wasDestroyed = tgt.health <= reducedDamage;
                    set((s) => ({
                        ship: {
                            ...s.ship,
                            modules: s.ship.modules.map((m) =>
                                m.id === tgt!.id
                                    ? {
                                          ...m,
                                          health: Math.max(
                                              0,
                                              m.health - reducedDamage,
                                          ),
                                      }
                                    : m,
                            ),
                        },
                    }));

                    if (moduleDefense > 0 && reducedDamage < overflow) {
                        get().addLog(
                            `💎 Кристаллическая броня: -${overflow - reducedDamage} урона`,
                            "info",
                        );
                    }
                    get().addLog(
                        `Пробитие! Враг по "${tgt.name}": -${reducedDamage}%`,
                        "warning",
                    );

                    // Damage crew in module
                    let crewDamage = Math.floor(reducedDamage * 0.5);
                    // Extra damage to crew in broken modules (health < 30)
                    if (tgt.health < 30) {
                        crewDamage = Math.floor(crewDamage * 1.5);
                        get().addLog(
                            `⚠️ Модуль повреждён! Экипаж получает повышенный урон!`,
                            "error",
                        );
                    }
                    damageCrewInModule(tgt.id, crewDamage, wasDestroyed);
                }
            } else if (tgt) {
                // ═══════════════════════════════════════════════════════════════
                // CRYSTALLINE ARMOR - Module damage reduction
                // ═══════════════════════════════════════════════════════════════
                let moduleDefense = 0;
                const crystallineCrew = state.crew.filter(
                    (c) => c.race === "crystalline",
                );
                crystallineCrew.forEach((c) => {
                    const race = RACES[c.race];
                    if (race?.specialTraits) {
                        const armorTrait = race.specialTraits.find(
                            (t) => t.id === "crystal_armor",
                        );
                        if (armorTrait && armorTrait.effects.moduleDefense) {
                            moduleDefense += armorTrait.effects
                                .moduleDefense as number;
                        }
                    }
                });

                const reducedDamage = Math.floor(eDmg * (1 - moduleDefense));
                const wasDestroyed = tgt.health <= reducedDamage;
                set((s) => ({
                    ship: {
                        ...s.ship,
                        modules: s.ship.modules.map((m) =>
                            m.id === tgt.id
                                ? {
                                      ...m,
                                      health: Math.max(
                                          0,
                                          m.health - reducedDamage,
                                      ),
                                  }
                                : m,
                        ),
                    },
                }));

                if (moduleDefense > 0 && reducedDamage < eDmg) {
                    get().addLog(
                        `💎 Кристаллическая броня: -${eDmg - reducedDamage} урона`,
                        "info",
                    );
                }
                get().addLog(
                    `Враг по "${tgt.name}": -${reducedDamage}%`,
                    "warning",
                );

                // Damage crew in module
                let crewDamage = Math.floor(reducedDamage * 0.5);
                // Extra damage to crew in broken modules (health < 30)
                if (tgt.health < 30) {
                    crewDamage = Math.floor(crewDamage * 1.5);
                    get().addLog(
                        `⚠️ Модуль повреждён! Экипаж получает повышенный урон!`,
                        "error",
                    );
                }
                damageCrewInModule(tgt.id, crewDamage, wasDestroyed);
            }

            // Remove dead crew from ship
            const deadCrew = get().crew.filter((c) => c.health <= 0);
            if (deadCrew.length > 0) {
                set((s) => ({ crew: s.crew.filter((c) => c.health > 0) }));
                get().addLog(
                    `☠️ Потери экипажа: ${deadCrew.map((c) => c.name).join(", ")}`,
                    "error",
                );
            }
        } // End of else block for evasion check

        // ═══════════════════════════════════════════════════════════════
        // BOSS REGENERATION AND SPECIAL ABILITIES
        // ═══════════════════════════════════════════════════════════════
        const currentCombat = get().currentCombat;
        if (currentCombat?.enemy.isBoss) {
            const boss = currentCombat.enemy;

            // Boss regeneration
            if (boss.regenRate && boss.regenRate > 0) {
                const aliveModules = boss.modules.filter((m) => m.health > 0);
                if (aliveModules.length > 0) {
                    const regenAmount = boss.regenRate;
                    set((s) => {
                        if (!s.currentCombat) return s;
                        return {
                            currentCombat: {
                                ...s.currentCombat,
                                enemy: {
                                    ...s.currentCombat.enemy,
                                    modules: s.currentCombat.enemy.modules.map(
                                        (m) => ({
                                            ...m,
                                            health:
                                                m.health > 0 &&
                                                m.health < (m.maxHealth || 100)
                                                    ? Math.min(
                                                          m.maxHealth || 100,
                                                          m.health +
                                                              regenAmount,
                                                      )
                                                    : m.health,
                                        }),
                                    ),
                                },
                            },
                        };
                    });
                    get().addLog(
                        `⚙️ Регенерация босса: +${regenAmount}%`,
                        "warning",
                    );
                }
            }

            // Boss special abilities (every_turn trigger)
            if (boss.specialAbility?.trigger === "every_turn") {
                const ability = boss.specialAbility;

                switch (ability.effect) {
                    case "heal_all":
                        const healAmount = ability.value || 10;
                        set((s) => {
                            if (!s.currentCombat) return s;
                            return {
                                currentCombat: {
                                    ...s.currentCombat,
                                    enemy: {
                                        ...s.currentCombat.enemy,
                                        modules:
                                            s.currentCombat.enemy.modules.map(
                                                (m) => ({
                                                    ...m,
                                                    health:
                                                        m.health > 0
                                                            ? Math.min(
                                                                  m.maxHealth ||
                                                                      100,
                                                                  m.health +
                                                                      healAmount,
                                                              )
                                                            : m.health,
                                                }),
                                            ),
                                    },
                                },
                            };
                        });
                        get().addLog(
                            `★ ${ability.name}: +${healAmount}% ко всем модулям`,
                            "warning",
                        );
                        break;

                    case "evasion_boost":
                        if (Math.random() < (ability.value || 25) / 100) {
                            get().addLog(
                                `★ ${ability.name}: Босс уклонился!`,
                                "warning",
                            );
                            // Apply some damage to player instead (reflection)
                            const reflectDmg = Math.floor(eDmg * 0.3);
                            if (reflectDmg > 0) {
                                const activeMods = get().ship.modules.filter(
                                    (m) => m.health > 0,
                                );
                                if (activeMods.length > 0) {
                                    const tgt =
                                        activeMods[
                                            Math.floor(
                                                Math.random() *
                                                    activeMods.length,
                                            )
                                        ];
                                    set((s) => ({
                                        ship: {
                                            ...s.ship,
                                            modules: s.ship.modules.map((m) =>
                                                m.id === tgt.id
                                                    ? {
                                                          ...m,
                                                          health: Math.max(
                                                              0,
                                                              m.health -
                                                                  reflectDmg,
                                                          ),
                                                      }
                                                    : m,
                                            ),
                                        },
                                    }));
                                }
                            }
                        }
                        break;
                }
            }

            // Boss low_health special ability trigger
            if (boss.specialAbility?.trigger === "low_health") {
                const totalHealth = boss.modules.reduce(
                    (sum, m) => sum + m.health,
                    0,
                );
                const maxHealth = boss.modules.reduce(
                    (sum, m) => sum + (m.maxHealth || 100),
                    0,
                );
                const healthPercent = (totalHealth / maxHealth) * 100;

                if (healthPercent < 30) {
                    const ability = boss.specialAbility;

                    switch (ability.effect) {
                        case "emergency_repair":
                            const repairAmount = ability.value || 25;
                            set((s) => {
                                if (!s.currentCombat) return s;
                                return {
                                    currentCombat: {
                                        ...s.currentCombat,
                                        enemy: {
                                            ...s.currentCombat.enemy,
                                            modules:
                                                s.currentCombat.enemy.modules.map(
                                                    (m) => ({
                                                        ...m,
                                                        health:
                                                            m.health > 0
                                                                ? Math.min(
                                                                      m.maxHealth ||
                                                                          100,
                                                                      m.health +
                                                                          repairAmount,
                                                                  )
                                                                : m.health,
                                                    }),
                                                ),
                                        },
                                    },
                                };
                            });
                            get().addLog(
                                `★ ${ability.name}: Аварийное восстановление! +${repairAmount}%`,
                                "error",
                            );
                            break;
                    }
                }
            }
        }

        // Check defeat - game over if hull destroyed
        get().checkGameOver();

        // Clear selection
        set((s) => {
            if (!s.currentCombat) return s;
            return {
                currentCombat: {
                    ...s.currentCombat,
                    enemy: { ...s.currentCombat.enemy, selectedModule: null },
                },
            };
        });
        get().updateShipStats();
    },

    retreat: () => {
        get().addLog("ОТСТУПЛЕНИЕ!", "warning");

        // Reset combat assignments
        set((s) => ({
            crew: s.crew.map((c) => ({
                ...c,
                combatAssignment: null,
                combatAssignmentEffect: null,
            })),
        }));

        set((s) => ({
            crew: s.crew.map((c) => ({
                ...c,
                happiness: Math.max(0, c.happiness - 20),
            })),
            currentCombat: null,
        }));
        // Damage random module
        const randMod =
            get().ship.modules[
                Math.floor(Math.random() * get().ship.modules.length)
            ];
        set((s) => ({
            ship: {
                ...s.ship,
                modules: s.ship.modules.map((m) =>
                    m.id === randMod.id
                        ? { ...m, health: Math.max(10, m.health - 40) }
                        : m,
                ),
            },
        }));
        get().updateShipStats();
        set({ gameMode: "sector_map" });
    },

    buyItem: (item, targetModuleId) => {
        const state = get();
        if (state.credits < item.price) {
            get().addLog("Недостаточно кредитов!", "error");
            return;
        }

        const stationId = state.currentLocation?.stationId;
        if (!stationId) return;

        const inv = state.stationInventory[stationId] || {};
        const bought = inv[item.id] || 0;

        if (bought >= item.stock) {
            get().addLog("Товар распродан!", "error");
            return;
        }

        if (item.type === "upgrade" && item.targetType) {
            // Find the specific module to upgrade, or the first matching one if no targetModuleId
            let tgt: Module | undefined;
            if (targetModuleId !== undefined) {
                tgt = state.ship.modules.find(
                    (m) =>
                        m.id === targetModuleId && m.type === item.targetType,
                );
            } else {
                tgt = state.ship.modules.find(
                    (m) => m.type === item.targetType,
                );
            }

            if (!tgt) {
                get().addLog(`Нет модуля ${item.targetType}!`, "error");
                return;
            }

            // Check if module is already at max upgrade level (3)
            // Level 4 modules can only be found, not upgraded to
            const currentLevel = tgt.level || 1;
            if (currentLevel >= 3) {
                get().addLog("Максимальный уровень улучшения! (LV3)", "error");
                get().addLog(
                    "Модули LV4 можно только найти в секторах тир 3 или у боссов.",
                    "warning",
                );
                return;
            }

            // Apply upgrades
            if (item.effect?.power) {
                set((s) => ({
                    ship: {
                        ...s.ship,
                        modules: s.ship.modules.map((m) =>
                            m.id === tgt!.id
                                ? {
                                      ...m,
                                      power:
                                          (m.power || 0) + item.effect!.power!,
                                  }
                                : m,
                        ),
                    },
                }));
            }
            if (item.effect?.capacity) {
                set((s) => ({
                    ship: {
                        ...s.ship,
                        modules: s.ship.modules.map((m) =>
                            m.id === tgt!.id
                                ? {
                                      ...m,
                                      capacity:
                                          (m.capacity || 0) +
                                          item.effect!.capacity!,
                                  }
                                : m,
                        ),
                    },
                }));
            }

            // Engine upgrade: improve fuel efficiency (reduce consumption)
            if (item.targetType === "engine") {
                set((s) => ({
                    ship: {
                        ...s.ship,
                        modules: s.ship.modules.map((m) =>
                            m.id === tgt!.id
                                ? {
                                      ...m,
                                      fuelEfficiency: Math.max(
                                          3,
                                          Math.floor(
                                              (m.fuelEfficiency || 10) * 0.9,
                                          ),
                                      ),
                                  }
                                : m,
                        ),
                    },
                }));
                get().addLog(`Двигатель улучшен! Расход топлива: -10%`, "info");
            }

            // Increment level
            set((s) => ({
                ship: {
                    ...s.ship,
                    modules: s.ship.modules.map((m) =>
                        m.id === tgt!.id
                            ? { ...m, level: (m.level || 1) + 1 }
                            : m,
                    ),
                },
            }));

            set((s) => ({
                credits: s.credits - item.price,
                stationInventory: {
                    ...s.stationInventory,
                    [stationId]: { ...inv, [item.id]: bought + 1 },
                },
            }));

            // Re-read the module to get updated values
            const updatedModule = get().ship.modules.find(
                (m) => m.id === tgt!.id,
            );
            get().addLog(
                `Модуль "${updatedModule?.name}" улучшен до LV${updatedModule?.level}`,
                "info",
            );
            playSound("success");
        } else if (item.type === "module") {
            // Check if player already has a scanner or drill (can only have 1)
            // Exception: unique level 4 modules (ancient, quantum) can be purchased as upgrades
            const hasScanner = state.ship.modules.some(
                (m) => m.type === "scanner",
            );
            const hasDrill = state.ship.modules.some((m) => m.type === "drill");
            const isUniqueScanner =
                item.moduleType === "scanner" && item.id.includes("quantum");
            const isUniqueDrill =
                item.moduleType === "drill" && item.id.includes("ancient");
            const isRegularScanner =
                item.moduleType === "scanner" && !isUniqueScanner;
            const isRegularDrill =
                item.moduleType === "drill" && !isUniqueDrill;

            if (
                (isRegularScanner && hasScanner) ||
                (isRegularDrill && hasDrill)
            ) {
                get().addLog("Можно иметь только один такой модуль!", "error");
                return;
            }

            // Try to place module
            // Determine drill level from item ID (supports station-specific IDs like drill-2-station-xyz)
            let drillLevel = 1;
            if (item.moduleType === "drill") {
                if (item.id.includes("drill-ancient"))
                    drillLevel = 4; // Unique ancient drill
                else if (item.id.includes("drill-3")) drillLevel = 3;
                else if (item.id.includes("drill-2")) drillLevel = 2;
            }

            // Build module with only relevant properties
            const newMod: Module = {
                id: state.ship.modules.length + 1,
                type: item.moduleType!,
                name: item.name,
                x: 0,
                y: 0,
                width: item.width || 1,
                height: item.height || 1,
                health: 100,
                ...(item.moduleType === "reactor" && {
                    power: item.power || 10,
                    level: 1,
                }),
                ...(item.moduleType === "engine" && {
                    fuelEfficiency: 10,
                    level: 1,
                    consumption: item.consumption || 1,
                }),
                ...(item.moduleType === "drill" && {
                    level: drillLevel,
                    consumption: item.consumption || 1,
                }),
                ...(item.moduleType === "cargo" && {
                    capacity: item.capacity || 50,
                    consumption: item.consumption || 1,
                    level: 1,
                }),
                ...(item.moduleType === "fueltank" && {
                    capacity: item.capacity || 100,
                    level: 1,
                }),
                ...(item.moduleType === "shield" && {
                    defense: item.defense || 20,
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
                ...(item.moduleType === "habitat" && {
                    oxygen: item.oxygen || 5,
                    consumption: item.consumption || 1,
                }),
                ...(item.moduleType === "weaponbay" && {
                    weapons: Array(item.width || 1).fill(null),
                    consumption: item.consumption || 2,
                }),
                ...(item.moduleType === "cockpit" && { consumption: 1 }),
                // For any other module type, include properties from item if defined
                ...(item.power !== undefined && { power: item.power }),
                ...(item.consumption !== undefined && {
                    consumption: item.consumption,
                }),
                ...(item.defense !== undefined && { defense: item.defense }),
                ...(item.scanRange !== undefined && {
                    scanRange: item.scanRange,
                }),
                ...(item.oxygen !== undefined && { oxygen: item.oxygen }),
                ...(item.capacity !== undefined && { capacity: item.capacity }),
            };

            // Find the best position for the new module - prefer positions adjacent to existing modules
            const findBestPosition = (
                module: Module,
                gridSize: number,
                existingModules: Module[],
            ): { x: number; y: number } | null => {
                // Check if this is the first module (no existing modules)
                if (existingModules.length === 0) {
                    // Place at center of grid
                    const centerPos = Math.floor(gridSize / 2);
                    if (get().canPlaceModule(module, centerPos, centerPos)) {
                        return { x: centerPos, y: centerPos };
                    }
                }

                // Helper: check if position (x,y) is adjacent to any existing module
                const isAdjacentToExisting = (
                    x: number,
                    y: number,
                    width: number,
                    height: number,
                ): boolean => {
                    for (const existing of existingModules) {
                        // Check all 4 sides of the new module
                        // Top side (y-1)
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
                        // Bottom side (y+height)
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
                        // Left side (x-1)
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
                        // Right side (x+width)
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

                // First pass: find all valid positions that are adjacent to existing modules
                const adjacentPositions: { x: number; y: number }[] = [];
                const otherPositions: { x: number; y: number }[] = [];

                for (let y = 0; y < gridSize; y++) {
                    for (let x = 0; x < gridSize; x++) {
                        if (get().canPlaceModule(module, x, y)) {
                            if (
                                isAdjacentToExisting(
                                    x,
                                    y,
                                    module.width,
                                    module.height,
                                )
                            ) {
                                adjacentPositions.push({ x, y });
                            } else {
                                otherPositions.push({ x, y });
                            }
                        }
                    }
                }

                // Return an adjacent position if available, otherwise any valid position
                if (adjacentPositions.length > 0) {
                    return adjacentPositions[0];
                }
                if (otherPositions.length > 0) {
                    return otherPositions[0];
                }
                return null;
            };

            const bestPosition = findBestPosition(
                newMod,
                state.ship.gridSize,
                state.ship.modules,
            );

            if (bestPosition) {
                newMod.x = bestPosition.x;
                newMod.y = bestPosition.y;
                set((s) => ({
                    credits: s.credits - item.price,
                    ship: { ...s.ship, modules: [...s.ship.modules, newMod] },
                    stationInventory: {
                        ...s.stationInventory,
                        [stationId]: { ...inv, [item.id]: bought + 1 },
                    },
                }));
                get().addLog(`Установлен: ${item.name}`, "info");
                // Update fuel capacity if it's a fuel tank
                if (item.moduleType === "fueltank") {
                    get().updateShipStats();
                }
            } else {
                get().addLog("Нет места!", "error");
                return;
            }
        } else if (item.type === "weapon") {
            const wbays = state.ship.modules.filter(
                (m) => m.type === "weaponbay",
            );
            if (!wbays.length) {
                get().addLog("Нет оружейной палубы!", "error");
                return;
            }
            let installed = false;
            for (const bay of wbays) {
                if (bay.weapons) {
                    for (let i = 0; i < bay.weapons.length; i++) {
                        if (!bay.weapons[i]) {
                            bay.weapons[i] = { type: item.weaponType! };
                            set((s) => ({
                                credits: s.credits - item.price,
                                stationInventory: {
                                    ...s.stationInventory,
                                    [stationId]: {
                                        ...inv,
                                        [item.id]: bought + 1,
                                    },
                                },
                            }));
                            installed = true;
                            get().addLog(
                                `Установлено ${WEAPON_TYPES[item.weaponType!].name}`,
                                "info",
                            );
                            break;
                        }
                    }
                }
                if (installed) break;
            }
            if (!installed) {
                get().addLog("Нет слотов!", "error");
                return;
            }
        }

        playSound("success");
        get().updateShipStats();
    },

    repairShip: () => {
        if (get().credits < 200) {
            get().addLog("Недостаточно кредитов!", "error");
            return;
        }
        set((s) => ({
            credits: s.credits - 200,
            ship: {
                ...s.ship,
                modules: s.ship.modules.map((m) => ({ ...m, health: 100 })),
            },
        }));
        get().addLog("Корабль отремонтирован", "info");
        playSound("success");
        get().updateShipStats();
    },

    healCrew: () => {
        if (get().credits < 150) {
            get().addLog("Недостаточно кредитов!", "error");
            return;
        }
        set((s) => ({
            credits: s.credits - 150,
            crew: s.crew.map((c) => ({
                ...c,
                health: c.maxHealth || 100,
                happiness: Math.min(100, c.happiness + 20),
            })),
        }));
        get().addLog("Экипаж вылечен", "info");
        playSound("success");
    },

    buyTradeGood: (goodId, quantity = 5) => {
        const state = get();
        const stationId = state.currentLocation?.stationId;
        if (!stationId) return;

        const prices = state.stationPrices[stationId];
        const stock = state.stationStock[stationId];
        if (!prices || !stock) return;

        const pricePer5 = prices[goodId].buy;
        const price = Math.floor(pricePer5 * (quantity / 5));
        const available = stock[goodId] || 0;

        if (available < quantity) {
            get().addLog("Недостаточно товара на станции!", "error");
            return;
        }
        if (state.credits < price) {
            get().addLog("Недостаточно кредитов!", "error");
            return;
        }

        const cargoModule = state.ship.modules.find(
            (m) => m.type === "cargo" && !m.disabled,
        );
        if (!cargoModule) {
            get().addLog("Склад отключен!", "error");
            return;
        }

        const currentCargo =
            state.ship.cargo.reduce((s, c) => s + c.quantity, 0) +
            state.ship.tradeGoods.reduce((s, g) => s + g.quantity, 0);
        if (currentCargo + quantity > cargoModule.capacity!) {
            get().addLog("Недостаточно места!", "error");
            return;
        }

        const existing = state.ship.tradeGoods.find((g) => g.item === goodId);

        // Update trade goods with proper state management
        set((s) => {
            const existingGood = s.ship.tradeGoods.find(
                (g) => g.item === goodId,
            );
            if (existingGood) {
                // Update existing item
                return {
                    ship: {
                        ...s.ship,
                        tradeGoods: s.ship.tradeGoods.map((g) =>
                            g.item === goodId
                                ? { ...g, quantity: g.quantity + quantity }
                                : g,
                        ),
                    },
                };
            } else {
                // Add new item
                return {
                    ship: {
                        ...s.ship,
                        tradeGoods: [
                            ...s.ship.tradeGoods,
                            { item: goodId, quantity, buyPrice: pricePer5 },
                        ],
                    },
                };
            }
        });

        set((s) => ({
            credits: s.credits - price,
            stationStock: {
                ...s.stationStock,
                [stationId]: {
                    ...s.stationStock[stationId],
                    [goodId]: available - quantity,
                },
            },
        }));
        get().addLog(
            `Куплено: ${TRADE_GOODS[goodId].name} ${quantity}т за ${price}₢`,
            "info",
        );
        playSound("success");
    },

    sellTradeGood: (goodId, quantity = 5) => {
        const state = get();
        const stationId = state.currentLocation?.stationId;
        if (!stationId) return;

        const prices = state.stationPrices[stationId];
        if (!prices) return;

        const playerGood = state.ship.tradeGoods.find((g) => g.item === goodId);
        if (!playerGood || playerGood.quantity < quantity) {
            get().addLog("Недостаточно товара!", "error");
            return;
        }

        const pricePer5 = prices[goodId].sell;
        let price = Math.floor(pricePer5 * (quantity / 5));

        // Apply sellPenalty from crew traits (e.g., "Жадный" -30% sell price)
        let sellPenalty = 0;
        state.crew.forEach((c) => {
            c.traits?.forEach((trait) => {
                if (trait.effect.sellPenalty) {
                    sellPenalty = Math.max(
                        sellPenalty,
                        trait.effect.sellPenalty,
                    );
                }
            });
        });

        if (sellPenalty > 0) {
            price = Math.floor(price * (1 - sellPenalty));
            get().addLog(
                `⚠️ Жадный экипаж: -${Math.round(sellPenalty * 100)}% к цене продажи`,
                "warning",
            );
        }

        // Update trade goods with proper state management
        set((s) => {
            const good = s.ship.tradeGoods.find((g) => g.item === goodId);
            if (!good) return s;

            const newQuantity = good.quantity - quantity;
            if (newQuantity <= 0) {
                // Remove item if quantity is 0
                return {
                    ship: {
                        ...s.ship,
                        tradeGoods: s.ship.tradeGoods.filter(
                            (g) => g.item !== goodId,
                        ),
                    },
                };
            } else {
                // Update quantity
                return {
                    ship: {
                        ...s.ship,
                        tradeGoods: s.ship.tradeGoods.map((g) =>
                            g.item === goodId
                                ? { ...g, quantity: g.quantity - quantity }
                                : g,
                        ),
                    },
                };
            }
        });

        set((s) => ({ credits: s.credits + price }));
        get().addLog(
            `Продано: ${TRADE_GOODS[goodId].name} ${quantity}т за ${price}₢`,
            "info",
        );
        playSound("success");
    },

    upgradeEngine: (tier) => {
        const state = get();
        const currentTier = state.ship.engineTier;

        // Can only upgrade to next tier
        if (tier !== currentTier + 1) {
            get().addLog(
                `Сначала улучшите до Тир ${currentTier + 1}!`,
                "error",
            );
            return;
        }

        // Check captain level requirement
        const captainLevel =
            state.crew.find((c) => c.profession === "pilot")?.level ?? 1;
        if (captainLevel < tier) {
            get().addLog(`Требуется капитан уровня ${tier}!`, "error");
            return;
        }

        // Calculate price
        const price = tier === 2 ? 1500 : 3000;

        if (state.credits < price) {
            get().addLog(`Недостаточно кредитов! Нужно ${price}₢`, "error");
            return;
        }

        set((s) => ({
            credits: s.credits - price,
            ship: { ...s.ship, engineTier: tier },
        }));

        get().addLog(
            `Двигатель улучшен до Тир ${tier}! Доступны новые секторы!`,
            "info",
        );
        playSound("success");
    },

    hireCrew: (crewData, locationId) => {
        // Safeguard against NaN or invalid price
        const price = crewData.price || 0;
        if (isNaN(price) || price < 0) {
            get().addLog("Ошибка: некорректная цена экипажа!", "error");
            return;
        }
        if (get().credits < price) {
            get().addLog("Недостаточно кредитов!", "error");
            return;
        }
        if (get().crew.length >= get().getCrewCapacity()) {
            get().addLog("Нет места!", "error");
            return;
        }
        // Find lifesupport module for initial placement
        const lifesupportModule = get().ship.modules.find(
            (m) => m.type === "lifesupport",
        );
        const initialModuleId =
            lifesupportModule?.id || get().ship.modules[0]?.id || 1;

        // Calculate maxHealth with race bonus and trait effects
        const race = RACES[crewData.race || "human"];
        const healthBonus = race?.crewBonuses?.health || 0;

        // Calculate special traits health bonuses/penalties
        let specialHealthBonus = 0;
        let specialHealthPenalty = 0;
        if (race?.specialTraits) {
            race.specialTraits.forEach((trait) => {
                if (trait.effects.healthBonus) {
                    specialHealthBonus += Number(trait.effects.healthBonus);
                }
                if (trait.effects.healthPenalty) {
                    specialHealthPenalty += Number(trait.effects.healthPenalty);
                }
            });
        }

        // Apply absolute health bonuses (e.g., krylorian +15)
        let baseMaxHealth = 100 + healthBonus + specialHealthBonus;

        // Apply percentage health penalties (e.g., voidborn -20%)
        if (specialHealthPenalty < 0) {
            baseMaxHealth = Math.floor(
                baseMaxHealth * (1 - Math.abs(specialHealthPenalty)),
            );
        }

        // Apply trait effects to maxHealth
        const traits = crewData.traits || [];
        traits.forEach((trait) => {
            if (trait.effect.healthPenalty) {
                // Negative trait: reduce maxHealth by percentage
                baseMaxHealth = Math.floor(
                    baseMaxHealth * (1 - trait.effect.healthPenalty),
                );
            }
            if (trait.effect.healthBonus) {
                // Positive trait: increase maxHealth by percentage
                baseMaxHealth = Math.floor(
                    baseMaxHealth * (1 + trait.effect.healthBonus),
                );
            }
        });

        const newCrew: CrewMember = {
            id: Date.now(),
            name:
                crewData.name || getRandomName(crewData.profession || "pilot"),
            race: crewData.race || "human",
            profession: crewData.profession || "pilot",
            level: crewData.level || 1,
            exp: crewData.exp || 0,
            health: baseMaxHealth,
            maxHealth: baseMaxHealth,
            happiness: 80,
            assignment: null,
            assignmentEffect: null,
            combatAssignment: null,
            combatAssignmentEffect: null,
            traits: crewData.traits || [],
            moduleId: crewData.moduleId || initialModuleId,
            movedThisTurn: false,
        };

        // Track hired crew by station to prevent re-hiring
        const hiredCrewKey = locationId || "unknown";

        set((s) => ({
            credits: s.credits - price,
            crew: [...s.crew, newCrew],
            hiredCrewFromShips: locationId
                ? [...s.hiredCrewFromShips, locationId]
                : s.hiredCrewFromShips,
            hiredCrew: {
                ...s.hiredCrew,
                [hiredCrewKey]: [
                    ...(s.hiredCrew[hiredCrewKey] || []),
                    newCrew.name,
                ],
            },
        }));
        get().addLog(`Нанят: ${newCrew.name} за ${price}₢`, "info");
        playSound("success");
    },

    fireCrewMember: (crewId: number) => {
        const state = get();
        const crewMember = state.crew.find((c) => c.id === crewId);
        if (!crewMember) return;

        // Can't fire the last crew member
        if (state.crew.length <= 1) {
            get().addLog("Нельзя уволить последнего члена экипажа!", "error");
            return;
        }

        set((s) => ({
            crew: s.crew.filter((c) => c.id !== crewId),
        }));
        get().addLog(`${crewMember.name} уволен`, "warning");
    },

    assignCrewTask: (crewId, task, effect) => {
        const state = get();
        const crewMember = state.crew.find((c) => c.id === crewId);
        if (!crewMember) return;

        // Check if crew member's assignment is valid based on their module position
        const currentModule = state.ship.modules.find(
            (m) => m.id === crewMember.moduleId,
        );
        if (!currentModule) return;

        // Profession-specific module requirements for assignments
        const professionModuleRequirements: Record<string, string[]> = {
            pilot: ["cockpit"], // Pilot assignments only work in cockpit
            engineer: [], // Engineer can work in any module (affects the one they're in)
            medic: [], // Medic can work in any module (affects crew in same module)
            scout: [], // Scout can work anywhere
            scientist: [], // Scientist can work anywhere
        };

        // Check if the assignment is allowed in current module
        if (task) {
            // If not clearing the assignment
            const requiredModules =
                professionModuleRequirements[crewMember.profession] || [];
            if (
                requiredModules.length > 0 &&
                !requiredModules.includes(currentModule.type)
            ) {
                get().addLog(
                    `${crewMember.profession === "pilot" ? "Пилот" : crewMember.profession} должен быть в ${requiredModules.join(" или ")} для этого задания!`,
                    "error",
                );
                return;
            }
        }

        // Update civilian assignment (non-combat)
        set((s) => ({
            crew: s.crew.map((c) =>
                c.id === crewId
                    ? {
                          ...c,
                          assignment: task || null,
                          assignmentEffect: effect || null,
                      }
                    : c,
            ),
        }));
    },

    assignCombatTask: (crewId, task, effect) => {
        const state = get();
        const crewMember = state.crew.find((c) => c.id === crewId);
        if (!crewMember) return;

        // Update combat assignment
        set((s) => ({
            crew: s.crew.map((c) =>
                c.id === crewId
                    ? {
                          ...c,
                          combatAssignment: task || null,
                          combatAssignmentEffect: effect || null,
                      }
                    : c,
            ),
        }));
    },

    isModuleAdjacent: (moduleId1, moduleId2) => {
        const state = get();
        const mod1 = state.ship.modules.find((m) => m.id === moduleId1);
        const mod2 = state.ship.modules.find((m) => m.id === moduleId2);
        if (!mod1 || !mod2) return false;

        // Two modules are adjacent if they share an edge (not just a corner)
        // Check horizontal adjacency
        if (mod1.y < mod2.y + mod2.height && mod1.y + mod1.height > mod2.y) {
            // mod1 is to the left of mod2
            if (mod1.x + mod1.width === mod2.x) return true;
            // mod1 is to the right of mod2
            if (mod2.x + mod2.width === mod1.x) return true;
        }
        // Check vertical adjacency
        if (mod1.x < mod2.x + mod2.width && mod1.x + mod1.width > mod2.x) {
            // mod1 is above mod2
            if (mod1.y + mod1.height === mod2.y) return true;
            // mod1 is below mod2
            if (mod2.y + mod2.height === mod1.y) return true;
        }
        return false;
    },

    getCrewInModule: (moduleId) => {
        const state = get();
        return state.crew.filter((c) => c.moduleId === moduleId);
    },

    moveCrewMember: (crewId, targetModuleId) => {
        const state = get();
        const crewMember = state.crew.find((c) => c.id === crewId);
        if (!crewMember) return;

        // Check if crew member already moved this turn
        if (crewMember.movedThisTurn) {
            get().addLog(
                `${crewMember.name} уже перемещался в этот ход!`,
                "error",
            );
            return;
        }

        // Check if target module exists
        const targetModule = state.ship.modules.find(
            (m) => m.id === targetModuleId,
        );
        if (!targetModule) {
            get().addLog("Модуль не найден!", "error");
            return;
        }

        // Check if target module is disabled
        if (targetModule.disabled) {
            get().addLog("Нельзя переместиться в отключённый модуль!", "error");
            return;
        }

        // Check if target module is adjacent to current module
        if (!get().isModuleAdjacent(crewMember.moduleId, targetModuleId)) {
            get().addLog(
                "Модуль не соседний! Можно переместиться только в соседний модуль.",
                "error",
            );
            return;
        }

        // Move crew member
        set((s) => ({
            crew: s.crew.map((c) =>
                c.id === crewId
                    ? {
                          ...c,
                          moduleId: targetModuleId,
                          movedThisTurn: true,
                          assignment: null,
                          assignmentEffect: null,
                      }
                    : c,
            ),
        }));

        get().addLog(
            `${crewMember.name} переместился в "${targetModule.name}"`,
            "info",
        );
        playSound("click");
    },

    acceptContract: (contract) => {
        if (get().activeContracts.some((c) => c.id === contract.id)) {
            get().addLog("Уже принят!", "error");
            return;
        }
        if (contract.type === "delivery" && contract.cargo) {
            const cargoMod = get().ship.modules.find((m) => m.type === "cargo");
            if (!cargoMod) {
                get().addLog("Нет грузового отсека!", "error");
                return;
            }
            const cur =
                get().ship.cargo.reduce((s, c) => s + c.quantity, 0) +
                get().ship.tradeGoods.reduce((s, g) => s + g.quantity, 0);
            if (cur + 10 > cargoMod.capacity!) {
                get().addLog("Недостаточно места!", "error");
                return;
            }
            set((s) => ({
                ship: {
                    ...s.ship,
                    cargo: [
                        ...s.ship.cargo,
                        {
                            item: contract.cargo!,
                            quantity: 10,
                            contractId: contract.id,
                        },
                    ],
                },
            }));
            get().addLog(`Загружен: ${contract.cargo} (10т)`, "info");
        }
        set((s) => ({
            activeContracts: [
                ...s.activeContracts,
                { ...contract, acceptedAt: s.turn },
            ],
        }));
        get().addLog(`Контракт принят: ${contract.desc}`, "info");
        playSound("success");
    },

    completeDeliveryContract: (contractId) => {
        const contract = get().activeContracts.find((c) => c.id === contractId);
        if (!contract) return;
        set((s) => ({
            ship: {
                ...s.ship,
                cargo: s.ship.cargo.filter((c) => c.contractId !== contractId),
            },
            credits: s.credits + contract.reward,
            activeContracts: s.activeContracts.filter(
                (c) => c.id !== contractId,
            ),
            completedContractIds: [...s.completedContractIds, contractId],
        }));
        get().addLog(`Контракт выполнен! +${contract.reward}₢`, "info");
        playSound("success");
    },

    cancelContract: (contractId) => {
        const contract = get().activeContracts.find((c) => c.id === contractId);
        if (!contract) return;
        if (contract.type === "delivery") {
            set((s) => ({
                ship: {
                    ...s.ship,
                    cargo: s.ship.cargo.filter(
                        (c) => c.contractId !== contractId,
                    ),
                },
            }));
        }
        set((s) => ({
            activeContracts: s.activeContracts.filter(
                (c) => c.id !== contractId,
            ),
        }));
        get().addLog(`Контракт отменён: ${contract.desc}`, "warning");
        playSound("error");
    },

    toggleModule: (moduleId) => {
        set((s) => ({
            ship: {
                ...s.ship,
                modules: s.ship.modules.map((m) =>
                    m.id === moduleId ? { ...m, disabled: !m.disabled } : m,
                ),
            },
        }));
        const mod = get().ship.modules.find((m) => m.id === moduleId);
        get().addLog(
            `Модуль "${mod?.name}" ${mod?.disabled ? "включён" : "отключён"}`,
            "info",
        );
        get().updateShipStats();
    },

    scrapModule: (moduleId) => {
        const state = get();
        const mod = state.ship.modules.find((m) => m.id === moduleId);
        if (!mod) return;

        // Essential modules that must have at least 1
        const essentialTypes = [
            "cockpit",
            "reactor",
            "fueltank",
            "engine",
            "lifesupport",
        ];

        if (essentialTypes.includes(mod.type)) {
            // Count how many of this type exist (excluding disabled ones)
            const sameTypeCount = state.ship.modules.filter(
                (m) => m.type === mod.type && !m.disabled,
            ).length;

            if (sameTypeCount <= 1) {
                get().addLog(
                    `Нельзя уничтожить последний ${mod.name}!`,
                    "error",
                );
                return;
            }
        }

        // Calculate scrap value (20-40% of module value based on level)
        const basePrices: Record<string, number> = {
            reactor: 450,
            cargo: 350,
            shield: 500,
            scanner: 350,
            lifesupport: 400,
            engine: 500,
            fueltank: 400,
            drill: 350,
            weaponbay: 500,
            medical: 450,
            ai_core: 10000,
        };

        const basePrice = basePrices[mod.type] || 300;
        const levelMultiplier = mod.level || 1;
        const scrapPercent = 0.2 + Math.random() * 0.2; // 20-40%
        const scrapValue = Math.floor(
            basePrice * levelMultiplier * scrapPercent,
        );

        // Remove the module
        set((s) => ({
            ship: {
                ...s.ship,
                modules: s.ship.modules.filter((m) => m.id !== moduleId),
            },
            credits: s.credits + scrapValue,
        }));

        get().addLog(
            `♻️ Модуль "${mod.name}" уничтожен. Получено ${scrapValue}₢`,
            "warning",
        );
        get().updateShipStats();
    },

    moveModule: (moduleId, x, y) => {
        const state = get();
        // Check if any module was already moved this turn
        if (state.ship.moduleMovedThisTurn) {
            get().addLog("Модуль уже перемещался в этот ход!", "warning");
            return;
        }

        const mod = state.ship.modules.find((m) => m.id === moduleId);
        if (!mod) return;
        if (get().canPlaceModule(mod, x, y)) {
            set((s) => ({
                ship: {
                    ...s.ship,
                    modules: s.ship.modules.map((m) =>
                        m.id === moduleId
                            ? { ...m, x, y, movedThisTurn: true }
                            : m,
                    ),
                    moduleMovedThisTurn: true,
                },
            }));
            get().addLog(`Модуль ${mod.name} перемещён`, "info");
        } else {
            get().addLog("Невозможно разместить: нарушена связность", "error");
        }
    },

    canPlaceModule: (module, x, y) => {
        const state = get();
        if (
            x < 0 ||
            y < 0 ||
            x + module.width > state.ship.gridSize ||
            y + module.height > state.ship.gridSize
        ) {
            return false;
        }
        for (const other of state.ship.modules) {
            if (other.id === module.id) continue;
            if (
                !(
                    x + module.width <= other.x ||
                    x >= other.x + other.width ||
                    y + module.height <= other.y ||
                    y >= other.y + other.height
                )
            ) {
                return false;
            }
        }
        if (state.ship.modules.length === 1) return true;
        // Check connectivity
        const tempModules = state.ship.modules.map((m) =>
            m.id === module.id ? { ...m, x, y } : m,
        );
        return areAllModulesConnected(tempModules);
    },

    handleAnomaly: (anomaly) => {
        const reqLevel = anomaly.requiresScientistLevel || 1;
        const scientists = get().crew.filter(
            (c) => c.profession === "scientist",
        );
        const maxScientistLevel =
            scientists.length > 0
                ? Math.max(...scientists.map((s) => s.level || 1))
                : 0;

        if (maxScientistLevel < reqLevel) {
            get().addLog(
                `Аномалия слишком сложна! Требуется учёный уровня ${reqLevel}`,
                "error",
            );
            return;
        }

        set((s) => ({
            completedLocations: [...s.completedLocations, anomaly.id],
        }));

        // Apply science bonus for experience gain (crystalline: +35%)
        scientists.forEach((s) => {
            const scientistRace = RACES[s.race];
            let expGain = reqLevel * 15;
            let scienceBonus = 0;
            if (scientistRace?.crewBonuses.science) {
                scienceBonus = Math.max(
                    scienceBonus,
                    scientistRace.crewBonuses.science,
                );
            }
            if (scientistRace?.specialTraits) {
                scientistRace.specialTraits.forEach((trait) => {
                    if (trait.effects.scienceBonus) {
                        scienceBonus = Math.max(
                            scienceBonus,
                            Number(trait.effects.scienceBonus),
                        );
                    }
                });
            }
            if (scienceBonus > 0) {
                expGain = Math.floor(expGain * (1 + scienceBonus));
            }
            get().gainExp(s, expGain);
        });

        // Check research contract
        const researchContract = get().activeContracts.find(
            (c) =>
                c.type === "research" && c.sectorId === get().currentSector?.id,
        );
        if (researchContract) {
            set((s) => {
                const updated = s.activeContracts.map((c) =>
                    c.id === researchContract.id
                        ? {
                              ...c,
                              visitedAnomalies: (c.visitedAnomalies || 0) + 1,
                          }
                        : c,
                );
                // Check if contract is completed
                const updatedContract = updated.find(
                    (c) => c.id === researchContract.id,
                );
                if (
                    updatedContract &&
                    updatedContract.visitedAnomalies !== undefined &&
                    updatedContract.requiresAnomalies !== undefined &&
                    updatedContract.visitedAnomalies >=
                        updatedContract.requiresAnomalies
                ) {
                    // Complete the contract
                    return {
                        activeContracts: s.activeContracts.filter(
                            (ac) => ac.id !== researchContract.id,
                        ),
                        completedContractIds: [
                            ...s.completedContractIds,
                            researchContract.id,
                        ],
                        credits: s.credits + (researchContract.reward || 0),
                    };
                }
                return { activeContracts: updated };
            });
            get().addLog(
                `Исследование: ${(researchContract.visitedAnomalies || 0) + 1}/${researchContract.requiresAnomalies} аномалий`,
                "info",
            );
            // Check if contract was completed and show completion message
            const updatedContract = get().activeContracts.find(
                (c) => c.id === researchContract.id,
            );
            if (!updatedContract) {
                get().addLog(
                    `Контракт "${researchContract.desc}" выполнен! +${researchContract.reward}₢`,
                    "info",
                );
            }
        }

        // Calculate science bonus for reward (crystalline: +35%)
        let scienceBonus = 0;
        scientists.forEach((s) => {
            const scientistRace = RACES[s.race];
            let raceScienceBonus = 0;
            if (scientistRace?.crewBonuses.science) {
                raceScienceBonus = Math.max(
                    raceScienceBonus,
                    scientistRace.crewBonuses.science,
                );
            }
            if (scientistRace?.specialTraits) {
                scientistRace.specialTraits.forEach((trait) => {
                    if (trait.effects.scienceBonus) {
                        raceScienceBonus = Math.max(
                            raceScienceBonus,
                            Number(trait.effects.scienceBonus),
                        );
                    }
                });
            }
            scienceBonus = Math.max(scienceBonus, raceScienceBonus);
        });

        // Anomalies give better rewards (require scientists)
        const baseReward = reqLevel * 120;
        const rewardMultiplier = 1 + scienceBonus;
        if (anomaly.anomalyType === "good") {
            const reward = Math.floor(
                (baseReward + Math.floor(Math.random() * 180)) *
                    rewardMultiplier,
            );
            set((s) => ({ credits: s.credits + reward }));
            get().addLog(
                `Аномалия: +${reward}₢${scienceBonus > 0 ? ` (бонус науки: +${Math.round(scienceBonus * 100)}%)` : ""}`,
                "info",
            );
        } else {
            const damage = reqLevel * 10 + Math.floor(Math.random() * 20);
            const randomModule =
                get().ship.modules[
                    Math.floor(Math.random() * get().ship.modules.length)
                ];
            set((s) => ({
                ship: {
                    ...s.ship,
                    modules: s.ship.modules.map((m) =>
                        m.id === randomModule.id
                            ? { ...m, health: Math.max(10, m.health - damage) }
                            : m,
                    ),
                },
            }));
            get().addLog(
                `Аномалия: "${randomModule.name}" -${damage}%`,
                "warning",
            );
        }

        // DON'T close the panel - let player see results and click "Leave"
        get().updateShipStats();
    },

    sendScoutingMission: (planetId) => {
        const scout = get().crew.find((c) => c.profession === "scout");
        if (!scout) {
            get().addLog("Нет разведчика!", "error");
            return;
        }
        const mission: ScoutingMission = {
            planetId,
            scoutId: scout.id,
            turnsLeft: 1,
            startTurn: get().turn,
        };
        set((s) => ({ scoutingMissions: [...s.scoutingMissions, mission] }));
        get().addLog(`${scout.name} отправлен на разведку`, "info");
        get().nextTurn();
    },

    // Distress Signal Handler
    respondToDistressSignal: () => {
        const state = get();
        const loc = state.currentLocation;
        const sector = state.currentSector;

        if (!loc || loc.type !== "distress_signal" || !sector) {
            get().addLog("Это не сигнал бедствия!", "error");
            return;
        }

        if (loc.signalResolved) {
            get().addLog("Сигнал уже обработан!", "warning");
            return;
        }

        // Use existing signalType if revealed by scanner, otherwise determine random outcome
        const outcome = loc.signalType || determineSignalOutcome();

        // Update both currentLocation AND the location in the sector
        const updatedLocation = {
            ...loc,
            signalType: outcome,
            signalResolved: true,
        };

        set((s) => {
            const updatedSector = s.currentSector
                ? {
                      ...s.currentSector,
                      locations: s.currentSector.locations.map((l) =>
                          l.id === loc.id ? updatedLocation : l,
                      ),
                  }
                : null;

            return {
                currentLocation: updatedLocation,
                currentSector: updatedSector,
                galaxy: {
                    ...s.galaxy,
                    sectors: s.galaxy.sectors.map((sec) =>
                        sec.id === sector.id ? updatedSector! : sec,
                    ),
                },
            };
        });

        playSound("combat");

        switch (outcome) {
            case "pirate_ambush": {
                get().addLog("🚨 ЗАСАДА! Это пираты!", "error");
                // Start combat with ambush - enemy attacks first
                get().startCombat(
                    {
                        ...loc,
                        type: "enemy",
                        name: "Пираты",
                        threat: Math.min(
                            3,
                            (state.currentSector?.tier ?? 1) + 1,
                        ),
                    },
                    true,
                ); // isAmbush = true - pirates attack first
                break;
            }
            case "survivors": {
                const reward = 20 + Math.floor(Math.random() * 30);
                const hasCapacity = state.crew.length < get().getCrewCapacity();

                set((s) => ({
                    credits: s.credits + reward,
                }));

                get().addLog("✓ Выжившие спасены!", "info");
                get().addLog(`Благодарность: +${reward}₢`, "info");

                if (hasCapacity && Math.random() < 0.3) {
                    // Sometimes a survivor joins the crew
                    const professions = [
                        "pilot",
                        "engineer",
                        "medic",
                        "scout",
                        "scientist",
                    ] as const;
                    const newProfession =
                        professions[
                            Math.floor(Math.random() * professions.length)
                        ];
                    // Find lifesupport module for initial placement
                    const lifesupportModule = get().ship.modules.find(
                        (m) => m.type === "lifesupport",
                    );
                    const initialModuleId =
                        lifesupportModule?.id || get().ship.modules[0]?.id || 1;

                    const newCrew: CrewMember = {
                        id: Date.now(),
                        name: getRandomName(newProfession),
                        race: "human",
                        profession: newProfession,
                        level: 1,
                        exp: 0,
                        health: 100,
                        maxHealth: 100,
                        happiness: 100,
                        assignment: null,
                        assignmentEffect: null,
                        combatAssignment: null,
                        combatAssignmentEffect: null,
                        traits: [],
                        moduleId: initialModuleId,
                        movedThisTurn: false,
                    };
                    set((s) => ({ crew: [...s.crew, newCrew] }));
                    get().addLog(
                        `Выживший ${newCrew.name} присоединился к команде!`,
                        "info",
                    );
                }

                // Mark as completed but DON'T close the panel - let player see result
                set((s) => ({
                    completedLocations: [...s.completedLocations, loc.id],
                }));
                // Stay in distress_signal mode to show result
                break;
            }
            case "abandoned_cargo": {
                const creditsReward = 20 + Math.floor(Math.random() * 30);
                const goodId =
                    Object.keys(TRADE_GOODS)[
                        Math.floor(
                            Math.random() * Object.keys(TRADE_GOODS).length,
                        )
                    ];
                const quantity = 5 + Math.floor(Math.random() * 10);

                set((s) => ({
                    credits: s.credits + creditsReward,
                    ship: {
                        ...s.ship,
                        tradeGoods: [
                            ...s.ship.tradeGoods,
                            { item: goodId, quantity, buyPrice: 0 },
                        ],
                    },
                }));

                get().addLog("📦 Найден заброшенный груз!", "info");
                get().addLog(`Кредиты: +${creditsReward}₢`, "info");
                get().addLog(
                    `${TRADE_GOODS[goodId].name}: +${quantity}`,
                    "info",
                );

                // Chance to find artifact
                const artifact = get().tryFindArtifact();
                if (artifact) {
                    get().addLog(
                        `★ АРТЕФАКТ НАЙДЕН: ${artifact.name}!`,
                        "info",
                    );
                }

                // Mark as completed but DON'T close the panel - let player see result
                set((s) => ({
                    completedLocations: [...s.completedLocations, loc.id],
                }));
                // Stay in distress_signal mode to show result
                break;
            }
        }

        get().nextTurn();
    },

    // Artifact functions
    researchArtifact: (artifactId) => {
        const state = get();
        const artifact = state.artifacts.find((a) => a.id === artifactId);

        if (!artifact) {
            get().addLog("Артефакт не найден!", "error");
            return;
        }

        if (!artifact.discovered) {
            get().addLog("Артефакт ещё не обнаружен!", "error");
            return;
        }

        if (artifact.researched) {
            get().addLog("Артефакт уже изучен!", "warning");
            return;
        }

        const scientists = state.crew.filter(
            (c) => c.profession === "scientist",
        );
        const maxScientistLevel =
            scientists.length > 0
                ? Math.max(...scientists.map((s) => s.level || 1))
                : 0;

        if (maxScientistLevel < artifact.requiresScientistLevel) {
            get().addLog(
                `Требуется учёный уровня ${artifact.requiresScientistLevel}!`,
                "error",
            );
            return;
        }

        // Research the artifact
        set((s) => ({
            artifacts: s.artifacts.map((a) =>
                a.id === artifactId
                    ? {
                          ...a,
                          researched: true,
                          effect: { ...a.effect, active: true },
                      }
                    : a,
            ),
        }));

        playSound("success");
        get().addLog(`★ ${artifact.name} изучен и активирован!`, "info");
        get().addLog(`Эффект: ${artifact.description}`, "info");

        // Give experience to scientists
        scientists.forEach((s) =>
            get().gainExp(s, artifact.requiresScientistLevel * 25),
        );
    },

    toggleArtifact: (artifactId) => {
        const state = get();
        const artifact = state.artifacts.find((a) => a.id === artifactId);

        if (!artifact || !artifact.researched) return;

        set((s) => ({
            artifacts: s.artifacts.map((a) =>
                a.id === artifactId
                    ? {
                          ...a,
                          effect: { ...a.effect, active: !a.effect.active },
                      }
                    : a,
            ),
        }));

        const active = !artifact.effect.active;
        get().addLog(
            `${artifact.name}: ${active ? "активирован" : "деактивирован"}`,
            "info",
        );
    },

    tryFindArtifact: () => {
        const state = get();

        // Check for artifact finder bonus
        let artifactFinderBonus =
            state.artifacts.find(
                (a) => a.effect.type === "artifact_finder" && a.effect.active,
            )?.effect.value || 1;

        // Apply crystalline artifactBonus (+15% to artifact effects)
        state.crew.forEach((c) => {
            const race = RACES[c.race];
            if (race?.specialTraits) {
                const trait = race.specialTraits.find(
                    (t) => t.id === "resonance" && t.effects.artifactBonus,
                );
                if (trait && artifactFinderBonus > 1) {
                    artifactFinderBonus =
                        1 +
                        (artifactFinderBonus - 1) *
                            (1 + Number(trait.effects.artifactBonus));
                }
            }
        });

        // Base chance depends on tier and context
        const tier = state.currentSector?.tier ?? 1;
        const baseChance = 0.02 * tier * artifactFinderBonus;

        if (Math.random() > baseChance) return null;

        const artifact = getRandomUndiscoveredArtifact(state.artifacts);
        if (!artifact) return null;

        // Mark as discovered
        set((s) => ({
            artifacts: s.artifacts.map((a) =>
                a.id === artifact.id ? { ...a, discovered: true } : a,
            ),
        }));

        // Complete mining contracts (crystalline quest - find artifact)
        const miningContract = get().activeContracts.find(
            (c) => c.type === "mining" && c.isRaceQuest,
        );
        if (miningContract) {
            set((s) => ({ credits: s.credits + (miningContract.reward || 0) }));
            get().addLog(
                `Кристалл Древних найден! +${miningContract.reward}₢`,
                "info",
            );
            set((s) => ({
                completedContractIds: [
                    ...s.completedContractIds,
                    miningContract.id,
                ],
                activeContracts: s.activeContracts.filter(
                    (ac) => ac.id !== miningContract.id,
                ),
            }));
        }

        playSound("success");
        return artifact;
    },

    showArtifacts: () => {
        set({ gameMode: "artifacts" });
    },

    discoverRace: (raceId: RaceId) => {
        set((state) => {
            if (state.knownRaces.includes(raceId)) return state;
            const race = RACES[raceId];
            if (race) {
                get().addLog(
                    `Открыта новая раса: ${race.icon} ${race.pluralName}!`,
                    "info",
                );
            }
            return {
                knownRaces: [...state.knownRaces, raceId],
            };
        });
    },

    checkGameOver: () => {
        const state = get();
        if (state.gameOver) return; // Already game over

        const hasAICoreArtifact = state.artifacts.some(
            (a) => a.id === "ai_core" && !a.cursed,
        );
        const hasAICoreModule = state.ship.modules.some(
            (m) => m.type === "ai_core" && m.health > 0,
        );
        const canShipOperateWithoutCrew = hasAICoreArtifact || hasAICoreModule;

        // Check for hull destroyed (0% armor)
        if (state.ship.armor <= 0) {
            set({
                gameOver: true,
                gameOverReason:
                    "💥 Корпус корабля разрушен! Броня упала до 0%. Корабль не может продолжать полёт.",
            });
            get().addLog("ИГРА ОКОНЧЕНА: Корпус разрушен", "error");
            return;
        }

        // Check for no crew (without AI core)
        if (state.crew.length === 0 && !canShipOperateWithoutCrew) {
            let reason =
                "☠️ Весь экипаж погиб! Корабль не может функционировать без экипажа.";

            if (!hasAICoreArtifact && !hasAICoreModule) {
                reason +=
                    " Нет ИИ Ядра (артефакта или модуля) для управления без экипажа.";
            }

            set({
                gameOver: true,
                gameOverReason: reason,
            });
            get().addLog("ИГРА ОКОНЧЕНА: Корабль без экипажа", "error");
            return;
        }
    },
}));

// Helper function for module connectivity
function areAllModulesConnected(modules: Module[]): boolean {
    if (modules.length === 0) return true;
    const visited = new Set<number>();
    const queue = [modules[0].id];
    visited.add(modules[0].id);

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const current = modules.find((m) => m.id === currentId);
        if (!current) continue;

        for (const other of modules) {
            if (visited.has(other.id)) continue;
            const touchingH =
                (current.x + current.width === other.x ||
                    current.x === other.x + other.width) &&
                current.y < other.y + other.height &&
                current.y + current.height > other.y;
            const touchingV =
                (current.y + current.height === other.y ||
                    current.y === other.y + other.height) &&
                current.x < other.x + other.width &&
                current.x + current.width > other.x;
            if (touchingH || touchingV) {
                visited.add(other.id);
                queue.push(other.id);
            }
        }
    }
    return visited.size === modules.length;
}
