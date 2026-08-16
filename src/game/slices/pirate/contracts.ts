import type { Contract, GalaxyTierAll, Location } from "@/game/types";
import type { EnemyShip } from "@/game/types/enemy";

const PIRATE_CONTRACT_TEMPLATES = [
    {
        type: "pirate_smuggling" as const,
        desc: "contracts.desc_pirate_smuggling",
        baseReward: 400,
        rewardPerTier: 200,
    },
    {
        type: "pirate_bounty" as const,
        desc: "contracts.desc_pirate_bounty",
        baseReward: 600,
        rewardPerTier: 250,
    },
    {
        type: "pirate_heist" as const,
        desc: "contracts.desc_pirate_heist",
        baseReward: 800,
        rewardPerTier: 300,
    },
];

const BOUNTY_TARGETS: EnemyShip[] = [
    "pirate",
    "raider",
    "mercenary",
    "marauder",
];

/**
 * Генерирует случайные пиратские контракты для станции.
 */
export function generatePirateContracts(
    station: Location,
    tier: GalaxyTierAll,
): Contract[] {
    const contracts: Contract[] = [];
    const count = 2 + Math.floor(Math.random() * 2); // 2–3 контракта

    for (let i = 0; i < count; i++) {
        const template =
            PIRATE_CONTRACT_TEMPLATES[
                Math.floor(Math.random() * PIRATE_CONTRACT_TEMPLATES.length)
            ];
        const reward =
            template.baseReward +
            template.rewardPerTier * tier +
            Math.floor(Math.random() * 200);

        const contract: Contract = {
            id: `${station.stationId}-pirate-${i}-${Date.now()}`,
            type: template.type,
            desc: template.desc,
            reward,
            sourcePlanetId: station.id,
            sourcePlanetName: station.name,
            sourceDominantRace: station.dominantRace,
        };

        if (template.type === "pirate_bounty") {
            contract.enemyType =
                BOUNTY_TARGETS[Math.floor(Math.random() * BOUNTY_TARGETS.length)];
            contract.targetThreat = Math.min(3, tier);
        }

        if (template.type === "pirate_heist") {
            contract.targetStationId = `station-target-${i}`;
            contract.targetStationName = `Станция ${String.fromCharCode(65 + i)}`;
        }

        if (template.type === "pirate_smuggling") {
            contract.cargo = "contraband";
            contract.quantity = 10 + tier * 5;
            contract.timeLimit = 15 + tier * 5;
        }

        contracts.push(contract);
    }

    return contracts;
}

/**
 * Обновляет список контрактов пиратской станции, если прошло достаточно ходов.
 */
export function refreshPirateContracts(
    station: Location,
    tier: GalaxyTierAll,
    currentTurn: number,
    refreshInterval = 10,
): boolean {
    const last = station.pirateLastRefreshTurn ?? 0;
    if (currentTurn - last < refreshInterval) return false;

    station.pirateContracts = generatePirateContracts(station, tier);
    station.pirateLastRefreshTurn = currentTurn;
    return true;
}
