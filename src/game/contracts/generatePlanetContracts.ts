import type { Contract, RaceId, Sector } from "../types";

// Generate planet contracts with race-specific quests
export const generatePlanetContracts = (
    planetType: string,
    sector: Sector,
    planetId: string,
    sectorIdx: number,
    allSectors: Sector[],
    dominantRace?: RaceId,
): Contract[] => {
    const contracts: Contract[] = [];
    const numContracts = Math.floor(Math.random() * 2) + 1;

    // Only other sectors for targets (exclude tier 4 sectors)
    const availableSectors = allSectors.filter(
        (s) => s.id !== sector.id && s.tier < 4,
    );

    if (availableSectors.length === 0) return contracts;

    // ═══════════════════════════════════════════════════════════════
    // RACE-SPECIFIC UNIQUE QUESTS
    // Each race has one unique quest that only they can offer
    // ═══════════════════════════════════════════════════════════════
    const raceQuests: Record<RaceId, () => Contract | null> = {
        human: () => {
            // Humans: Diplomatic mission - deliver a message to another human planet
            const humanPlanets = allSectors
                .filter((s) => s.tier < 4)
                .flatMap((s) =>
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
            const stormSectors = availableSectors.filter((s) =>
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
                // Research contract - can be completed in any sector
                return {
                    id: `c-${planetId}-${Date.now()}-${Math.random()}`,
                    type: "research",
                    desc: "🔬 Исследование аномалий",
                    sectorId: undefined, // Can be completed in any sector
                    sectorName: "любой",
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
