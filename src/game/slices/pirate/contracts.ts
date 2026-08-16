import type { Contract, GalaxyTierAll, Location, Sector } from "@/game/types";

export const PIRATE_CONTRACT_REFRESH_INTERVAL = 50;

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

/**
 * Срок задания зависит и от тира заказчика, и от того, как далеко цель:
 * прыжок между тирами стоит ходов. Раньше считался только тир заказчика, и
 * станция тира 1 могла отправить в тир 4 на 14 ходов. Формула повторяет
 * getGeneratedContractTimeLimit для обычных контрактов.
 */
export const getPirateContractTimeLimit = (
    sourceTier: GalaxyTierAll,
    targetTier: GalaxyTierAll = sourceTier,
): number => 12 + sourceTier * 2 + Math.abs(targetTier - sourceTier) * 2;

const pick = <T>(items: T[]): T =>
    items[Math.floor(Math.random() * items.length)];

const withTargetSector = (
    contract: Contract,
    sourceSector: Sector | undefined,
    sectors: Sector[],
): Contract => {
    const targetSector = sectors.find((sector) =>
        sector.locations.some((location) => location.id === contract.targetLocationId),
    );
    return {
        ...contract,
        sourceSector: sourceSector?.id,
        sourceSectorName: sourceSector?.name,
        targetSector: targetSector?.id,
        targetSectorName: targetSector?.name,
        // Срок известен только здесь: тир цели виден лишь вместе с секторами
        timeLimit: getPirateContractTimeLimit(
            sourceSector?.tier ?? 1,
            targetSector?.tier ?? sourceSector?.tier ?? 1,
        ),
    };
};

const generatePirateStationContracts = (
    station: Location,
    tier: GalaxyTierAll,
    sectors: Sector[],
): Contract[] => {
    const sourceSector = sectors.find((sector) =>
        sector.locations.some((location) => location.id === station.id),
    );
    return generatePirateContracts(
        station,
        tier,
        sectors.flatMap((sector) => sector.locations),
    ).map((contract) => withTargetSector(contract, sourceSector, sectors));
};

/**
 * Генерирует случайные пиратские контракты для станции.
 */
export function generatePirateContracts(
    station: Location,
    tier: GalaxyTierAll,
    locations: Location[] = [],
): Contract[] {
    const stationTargets = locations.filter(
        (location) =>
            location.type === "station" &&
            location.id !== station.id &&
            !location.stationConfig?.isPirate,
    );
    // Пираты заказывают не патрули, а торговцев: убрать чужой конвой с линии
    // выгодно им, а не властям. Прежняя цель — вражеский корабль — превращала
    // пиратский заказ в обычный bounty, который и так есть у легальных досок,
    // и заодно ставила игрока на сторону закона за пиратские деньги.
    const bountyTargets = locations.filter(
        (location) => location.type === "friendly_ship" && !location.defeated,
    );
    const templates = PIRATE_CONTRACT_TEMPLATES.filter(
        (template) =>
            template.type === "pirate_bounty"
                ? bountyTargets.length > 0
                : stationTargets.length > 0,
    );
    if (templates.length === 0) return [];

    const contracts: Contract[] = [];
    const count = Math.min(3, 2 + Math.floor(Math.random() * 2));
    // Доска не должна дважды предлагать одно и то же: пара «тип + цель»
    // выбиралась независимыми pick, и три одинаковых заказа были обычным делом
    const offered = new Set<string>();

    for (let i = 0; i < count; i++) {
        const template = pick(templates);
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
            timeLimit: getPirateContractTimeLimit(tier),
        };

        if (template.type === "pirate_bounty") {
            const target = pick(bountyTargets);
            // Угроза — от охраны, которую поднимет раса торговца
            // (см. attackFriendlyShip), а не от самого корабля
            contract.targetThreat = Math.min(3, tier);
            contract.targetLocationId = target.id;
            contract.targetLocationName = target.name;
            contract.sourceDominantRace = station.dominantRace;
        }

        if (template.type === "pirate_heist") {
            const target = pick(stationTargets);
            contract.targetStationId = target.stationId ?? target.id;
            contract.targetStationName = target.name;
            contract.targetLocationId = target.id;
            contract.targetLocationName = target.name;
        }

        if (template.type === "pirate_smuggling") {
            const target = pick(stationTargets);
            contract.cargo = "contraband";
            contract.quantity = 10 + tier * 5;
            contract.targetLocationId = target.id;
            contract.targetLocationName = target.name;
        }

        const offer = `${contract.type}:${contract.targetLocationId}`;
        if (offered.has(offer)) continue;
        offered.add(offer);
        contracts.push(contract);
    }

    return contracts;
}

/** Заполняет доски после полной сборки галактики, когда реальные цели уже существуют. */
export function populatePirateContracts(sectors: Sector[]): void {
    sectors.forEach((sector) => {
        sector.locations.forEach((location) => {
            if (!location.stationConfig?.isPirate) return;
            location.pirateContracts = generatePirateStationContracts(
                location,
                sector.tier,
                sectors,
            );
            location.pirateLastRefreshTurn = 0;
        });
    });
}

/**
 * Обновляет список контрактов пиратской станции, если прошло достаточно ходов.
 */
export function refreshPirateContracts(
    station: Location,
    tier: GalaxyTierAll,
    currentTurn: number,
    sectors: Sector[],
    refreshInterval = PIRATE_CONTRACT_REFRESH_INTERVAL,
): boolean {
    const last = station.pirateLastRefreshTurn ?? 0;
    if (currentTurn - last < refreshInterval) return false;

    station.pirateContracts = generatePirateStationContracts(station, tier, sectors);
    station.pirateLastRefreshTurn = currentTurn;
    return true;
}
