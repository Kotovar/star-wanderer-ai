import type {
    ShopItem,
    RaceId,
    CrewMember,
    Quality,
    Profession,
} from "../../types";
import {
    // WEAPON_TYPES,
    // TRADE_GOODS,
    generateCrewTraits,
    CREW_BASE_PRICES,
    RACES,
    getRandomRace,
    getRandomRaceName,
} from "../../constants";

// Module pools by tier level
// Tier 1: levels 1-2, Tier 2: levels 2-3, Tier 3: levels 3-4 (rare)
export const MODULES_BY_LEVEL: Record<number, ShopItem[]> = {
    1: [
        {
            id: "drill-1",
            name: "Бур",
            type: "module",
            moduleType: "drill",
            width: 1,
            height: 1,
            consumption: 1,
            price: 350,
            stock: 2,
        },
        {
            id: "fueltank-1",
            name: "Топливный бак",
            type: "module",
            moduleType: "fueltank",
            width: 1,
            height: 1,
            price: 400,
            stock: 2,
            capacity: 80,
        },
        {
            id: "reactor-1",
            name: "Реактор",
            type: "module",
            moduleType: "reactor",
            width: 1,
            height: 1,
            power: 10,
            consumption: 0,
            price: 450,
            stock: 2,
        },
        {
            id: "cargo-1",
            name: "Грузовой отсек",
            type: "module",
            moduleType: "cargo",
            width: 1,
            height: 1,
            capacity: 40,
            consumption: 1,
            price: 350,
            stock: 2,
        },
        {
            id: "shield-1",
            name: "Щитовой генератор",
            type: "module",
            moduleType: "shield",
            width: 1,
            height: 1,
            defense: 20,
            consumption: 3,
            price: 500,
            stock: 2,
        },
        {
            id: "weaponbay-1",
            name: "Оружейная палуба",
            type: "module",
            moduleType: "weaponbay",
            width: 1,
            height: 1,
            consumption: 2,
            price: 500,
            stock: 1,
        },
        {
            id: "scanner-1",
            name: "Сканер",
            type: "module",
            moduleType: "scanner",
            width: 1,
            height: 1,
            scanRange: 3,
            consumption: 1,
            price: 350,
            stock: 1,
        },
        {
            id: "lifesupport-1",
            name: "Жизнеобеспечение",
            type: "module",
            moduleType: "lifesupport",
            width: 1,
            height: 1,
            oxygen: 5,
            consumption: 2,
            price: 400,
            stock: 2,
        },
        {
            id: "medical-1",
            name: "Медотсек",
            type: "module",
            moduleType: "medical",
            width: 1,
            height: 1,
            consumption: 2,
            price: 450,
            stock: 1,
        },
    ],
    2: [
        {
            id: "drill-2",
            name: "Бур",
            type: "module",
            moduleType: "drill",
            width: 1,
            height: 1,
            consumption: 2,
            price: 700,
            stock: 1,
        },
        {
            id: "fueltank-2",
            name: "Топливный бак",
            type: "module",
            moduleType: "fueltank",
            width: 1,
            height: 1,
            price: 650,
            stock: 1,
            capacity: 120,
        },
        {
            id: "reactor-2",
            name: "Реактор",
            type: "module",
            moduleType: "reactor",
            width: 1,
            height: 1,
            power: 15,
            consumption: 0,
            price: 800,
            stock: 1,
        },
        {
            id: "cargo-2",
            name: "Грузовой отсек",
            type: "module",
            moduleType: "cargo",
            width: 1,
            height: 1,
            capacity: 60,
            consumption: 1,
            price: 600,
            stock: 1,
        },
        {
            id: "habitat-2",
            name: "Жизнеобеспечение",
            type: "module",
            moduleType: "lifesupport",
            width: 1,
            height: 1,
            oxygen: 8,
            consumption: 1,
            price: 700,
            stock: 1,
        },
        {
            id: "shield-2",
            name: "Щитовой генератор",
            type: "module",
            moduleType: "shield",
            width: 1,
            height: 1,
            defense: 35,
            consumption: 4,
            price: 900,
            stock: 1,
        },
        {
            id: "weaponbay-2",
            name: "Оружейная палуба",
            type: "module",
            moduleType: "weaponbay",
            width: 2,
            height: 1,
            consumption: 4,
            price: 800,
            stock: 1,
        },
        {
            id: "scanner-2",
            name: "Сканер",
            type: "module",
            moduleType: "scanner",
            width: 1,
            height: 1,
            scanRange: 5,
            consumption: 2,
            price: 600,
            stock: 1,
        },
        {
            id: "lifesupport-2",
            name: "Жизнеобеспечение",
            type: "module",
            moduleType: "lifesupport",
            width: 1,
            height: 1,
            oxygen: 8,
            consumption: 3,
            price: 650,
            stock: 1,
        },
        {
            id: "medical-2",
            name: "Медотсек",
            type: "module",
            moduleType: "medical",
            width: 1,
            height: 1,
            consumption: 3,
            price: 800,
            stock: 1,
        },
    ],
    3: [
        {
            id: "drill-3",
            name: "Бур",
            type: "module",
            moduleType: "drill",
            width: 1,
            height: 1,
            consumption: 3,
            price: 1200,
            stock: 1,
        },
        {
            id: "fueltank-3",
            name: "Топливный бак",
            type: "module",
            moduleType: "fueltank",
            width: 1,
            height: 1,
            price: 1000,
            stock: 1,
            capacity: 180,
        },
        {
            id: "reactor-3",
            name: "Реактор",
            type: "module",
            moduleType: "reactor",
            width: 1,
            height: 1,
            power: 20,
            consumption: 0,
            price: 1500,
            stock: 1,
        },
        {
            id: "cargo-3",
            name: "Грузовой отсек",
            type: "module",
            moduleType: "cargo",
            width: 1,
            height: 1,
            capacity: 100,
            consumption: 2,
            price: 1100,
            stock: 1,
        },
        {
            id: "habitat-3",
            name: "Жизнеобеспечение",
            type: "module",
            moduleType: "lifesupport",
            width: 1,
            height: 1,
            oxygen: 12,
            consumption: 2,
            price: 1000,
            stock: 1,
        },
        {
            id: "scanner-3",
            name: "Сканер",
            type: "module",
            moduleType: "scanner",
            width: 1,
            height: 1,
            scanRange: 8,
            consumption: 3,
            price: 1000,
            stock: 1,
        },
        {
            id: "lifesupport-3",
            name: "Жизнеобеспечение",
            type: "module",
            moduleType: "lifesupport",
            width: 1,
            height: 1,
            oxygen: 12,
            consumption: 4,
            price: 1000,
            stock: 1,
        },
        {
            id: "medical-3",
            name: "Медотсек",
            type: "module",
            moduleType: "medical",
            width: 1,
            height: 1,
            consumption: 4,
            price: 1200,
            stock: 1,
        },
    ],
    4: [
        {
            id: "drill-ancient",
            name: "Древний бур",
            type: "module",
            moduleType: "drill",
            width: 1,
            height: 1,
            consumption: 1,
            price: 3000,
            stock: 1,
        },
        {
            id: "reactor-fusion",
            name: "Термоядерный реактор",
            type: "module",
            moduleType: "reactor",
            width: 1,
            height: 1,
            power: 30,
            consumption: 0,
            price: 4000,
            stock: 1,
        },
        {
            id: "shield-ancient",
            name: "Древний щит",
            type: "module",
            moduleType: "shield",
            width: 1,
            height: 1,
            defense: 80,
            consumption: 6,
            price: 5000,
            stock: 1,
        },
        {
            id: "cargo-quantum",
            name: "Квантовый склад",
            type: "module",
            moduleType: "cargo",
            width: 1,
            height: 1,
            capacity: 200,
            consumption: 3,
            price: 3500,
            stock: 1,
        },
        {
            id: "scanner-quantum",
            name: "Квантовый сканер",
            type: "module",
            moduleType: "scanner",
            width: 1,
            height: 1,
            scanRange: 15,
            consumption: 4,
            price: 3000,
            stock: 1,
        },
        {
            id: "medical-ancient",
            name: "Медотсек",
            type: "module",
            moduleType: "medical",
            width: 1,
            height: 1,
            consumption: 5,
            price: 4000,
            stock: 1,
        },
        {
            id: "weaponbay-ancient",
            name: "Оружейная палуба",
            type: "module",
            moduleType: "weaponbay",
            width: 2,
            height: 2,
            consumption: 6,
            price: 5000,
            stock: 1,
        },
        {
            id: "ai-core",
            name: "ИИ Ядро",
            type: "module",
            moduleType: "ai_core",
            width: 2,
            height: 2,
            power: 50,
            consumption: 25,
            price: 10000,
            stock: 1,
        },
    ],
};

// Upgrades - always available but tier-gated
// Prices are higher than buying new modules to encourage expansion over upgrades
export const UPGRADES_BY_TIER: Record<number, ShopItem[]> = {
    1: [
        {
            id: "reactor-upgrade-1",
            name: "Улучшение реактора",
            type: "upgrade",
            targetType: "reactor",
            price: 800,
            effect: { power: 5 },
            stock: 2,
        },
        {
            id: "cargo-upgrade-1",
            name: "Расширение груза",
            type: "upgrade",
            targetType: "cargo",
            price: 600,
            effect: { capacity: 20 },
            stock: 2,
        },
        {
            id: "fueltank-upgrade-1",
            name: "Улучшение бака",
            type: "upgrade",
            targetType: "fueltank",
            price: 700,
            effect: { capacity: 30 },
            stock: 2,
        },
        {
            id: "shield-upgrade-1",
            name: "Улучшение щита",
            type: "upgrade",
            targetType: "shield",
            price: 900,
            effect: { defense: 10 },
            stock: 2,
        },
        {
            id: "scanner-upgrade-1",
            name: "Улучшение сканера",
            type: "upgrade",
            targetType: "scanner",
            price: 700,
            effect: { scanRange: 2 },
            stock: 2,
        },
        {
            id: "lifesupport-upgrade-1",
            name: "Улучшение жизнеобеспечения",
            type: "upgrade",
            targetType: "lifesupport",
            price: 800,
            effect: { oxygen: 3 },
            stock: 2,
        },
        {
            id: "engine-upgrade-1",
            name: "Настройка двигателя",
            type: "upgrade",
            targetType: "engine",
            price: 1000,
            effect: { fuelEfficiency: -2 },
            stock: 2,
        },
        {
            id: "drill-upgrade-1",
            name: "Улучшение бура",
            type: "upgrade",
            targetType: "drill",
            price: 800,
            effect: { level: 1 },
            stock: 2,
        },
        {
            id: "medical-upgrade-1",
            name: "Улучшение медотсека",
            type: "upgrade",
            targetType: "medical",
            price: 900,
            effect: { healing: 4 },
            stock: 2,
        },
    ],
    2: [
        {
            id: "reactor-upgrade-2",
            name: "Улучшение реактора",
            type: "upgrade",
            targetType: "reactor",
            price: 1400,
            effect: { power: 8 },
            stock: 1,
        },
        {
            id: "cargo-upgrade-2",
            name: "Расширение груза",
            type: "upgrade",
            targetType: "cargo",
            price: 1100,
            effect: { capacity: 35 },
            stock: 1,
        },
        {
            id: "fueltank-upgrade-2",
            name: "Улучшение бака",
            type: "upgrade",
            targetType: "fueltank",
            price: 1200,
            effect: { capacity: 50 },
            stock: 1,
        },
        {
            id: "shield-upgrade-2",
            name: "Улучшение щита",
            type: "upgrade",
            targetType: "shield",
            price: 1800,
            effect: { defense: 15 },
            stock: 1,
        },
        {
            id: "scanner-upgrade-2",
            name: "Улучшение сканера",
            type: "upgrade",
            targetType: "scanner",
            price: 1400,
            effect: { scanRange: 3 },
            stock: 1,
        },
        {
            id: "lifesupport-upgrade-2",
            name: "Улучшение жизнеобеспечения",
            type: "upgrade",
            targetType: "lifesupport",
            price: 1600,
            effect: { oxygen: 5 },
            stock: 1,
        },
        {
            id: "engine-upgrade-2",
            name: "Настройка двигателя",
            type: "upgrade",
            targetType: "engine",
            price: 2000,
            effect: { fuelEfficiency: -3 },
            stock: 1,
        },
        {
            id: "drill-upgrade-2",
            name: "Улучшение бура",
            type: "upgrade",
            targetType: "drill",
            price: 1600,
            effect: { level: 1 },
            stock: 1,
        },
        {
            id: "medical-upgrade-2",
            name: "Улучшение медотсека",
            type: "upgrade",
            targetType: "medical",
            price: 1800,
            effect: { healing: 6 },
            stock: 1,
        },
    ],
    3: [
        {
            id: "reactor-upgrade-3",
            name: "Улучшение реактора",
            type: "upgrade",
            targetType: "reactor",
            price: 2400,
            effect: { power: 12 },
            stock: 1,
        },
        {
            id: "cargo-upgrade-3",
            name: "Расширение груза",
            type: "upgrade",
            targetType: "cargo",
            price: 1800,
            effect: { capacity: 50 },
            stock: 1,
        },
        {
            id: "fueltank-upgrade-3",
            name: "Улучшение бака",
            type: "upgrade",
            targetType: "fueltank",
            price: 2000,
            effect: { capacity: 80 },
            stock: 1,
        },
        {
            id: "shield-upgrade-3",
            name: "Улучшение щита",
            type: "upgrade",
            targetType: "shield",
            price: 3600,
            effect: { defense: 20 },
            stock: 1,
        },
        {
            id: "scanner-upgrade-3",
            name: "Улучшение сканера",
            type: "upgrade",
            targetType: "scanner",
            price: 2800,
            effect: { scanRange: 4 },
            stock: 1,
        },
        {
            id: "lifesupport-upgrade-3",
            name: "Улучшение жизнеобеспечения",
            type: "upgrade",
            targetType: "lifesupport",
            price: 3200,
            effect: { oxygen: 8 },
            stock: 1,
        },
        {
            id: "engine-upgrade-3",
            name: "Настройка двигателя",
            type: "upgrade",
            targetType: "engine",
            price: 4000,
            effect: { fuelEfficiency: -4 },
            stock: 1,
        },
        {
            id: "drill-upgrade-3",
            name: "Улучшение бура",
            type: "upgrade",
            targetType: "drill",
            price: 3200,
            effect: { level: 1 },
            stock: 1,
        },
        {
            id: "medical-upgrade-3",
            name: "Улучшение медотсека",
            type: "upgrade",
            targetType: "medical",
            price: 3600,
            effect: { healing: 8 },
            stock: 1,
        },
    ],
};

// Weapons - available at all stations
export const WEAPONS: ShopItem[] = [
    {
        id: "weapon-kinetic",
        name: "Кинетическое оружие",
        type: "weapon",
        weaponType: "kinetic",
        price: 200,
        stock: 3,
        requiresWeaponBay: true,
    },
    {
        id: "weapon-laser",
        name: "Лазерное оружие",
        type: "weapon",
        weaponType: "laser",
        price: 300,
        stock: 2,
        requiresWeaponBay: true,
    },
    {
        id: "weapon-missile",
        name: "Ракетное оружие",
        type: "weapon",
        weaponType: "missile",
        price: 400,
        stock: 1,
        requiresWeaponBay: true,
    },
];

// Engine upgrade prices
export const ENGINE_PRICES = {
    2: 1500,
    3: 3000,
};

// Generate station-specific items based on stationId hash
export function generateStationItems(
    stationId: string,
    sectorTier: number,
): ShopItem[] {
    let hash = 0;
    for (let i = 0; i < stationId.length; i++) {
        hash = (hash << 5) - hash + stationId.charCodeAt(i);
        hash = hash & hash;
    }

    const items: ShopItem[] = [];

    let availableLevels: number[];
    if (sectorTier === 1) {
        availableLevels = [1, 2];
    } else if (sectorTier === 2) {
        availableLevels = [2, 3];
    } else {
        availableLevels = [3];
    }

    const tierUpgrades = UPGRADES_BY_TIER[sectorTier] || UPGRADES_BY_TIER[1];
    tierUpgrades.forEach((upgrade) => {
        items.push({ ...upgrade, id: `${upgrade.id}-${stationId}` });
    });

    const numModules = 4 + (Math.abs(hash) % 5);
    let modulePool: ShopItem[] = [];
    availableLevels.forEach((level) => {
        modulePool = modulePool.concat(MODULES_BY_LEVEL[level] || []);
    });

    const shuffled = [...modulePool].sort(() => {
        hash = (hash * 1103515245 + 12345) & 0x7fffffff;
        return (hash % 3) - 1;
    });

    for (let i = 0; i < Math.min(numModules, shuffled.length); i++) {
        const baseItem = shuffled[i];
        items.push({ ...baseItem, id: `${baseItem.id}-${stationId}` });
    }

    if (sectorTier === 3) {
        const uniqueChance = Math.abs(hash % 100);
        if (uniqueChance < 15) {
            const uniqueModules = MODULES_BY_LEVEL[4];
            const uniqueModule =
                uniqueModules[Math.abs(hash >> 8) % uniqueModules.length];
            items.push({
                ...uniqueModule,
                id: `${uniqueModule.id}-${stationId}`,
            });
        }
    }

    const numWeapons = 1 + (Math.abs(hash >> 4) % 2);
    const shuffledWeapons = [...WEAPONS].sort(() => {
        hash = (hash * 1103515245 + 12345) & 0x7fffffff;
        return (hash % 3) - 1;
    });
    for (let i = 0; i < numWeapons; i++) {
        const weapon = shuffledWeapons[i];
        items.push({ ...weapon, id: `${weapon.id}-${stationId}` });
    }

    return items;
}

// Get station-specific crew availability
export function getStationCrewCount(stationId: string): number {
    let hash = 0;
    for (let i = 0; i < stationId.length; i++) {
        hash = (hash << 5) - hash + stationId.charCodeAt(i);
        hash = hash & hash;
    }
    return 1 + (Math.abs(hash) % 5);
}

// Generate crew for a specific station
export function generateStationCrew(
    stationId: string,
    stationRace?: RaceId,
): Array<{
    member: Omit<CrewMember, "id">;
    price: number;
    quality: Quality;
}> {
    const count = getStationCrewCount(stationId);
    const crewList: Array<{
        member: Omit<CrewMember, "id">;
        price: number;
        quality: Quality;
    }> = [];

    let seed = 0;
    for (let i = 0; i < stationId.length; i++) {
        seed = (seed << 5) - seed + stationId.charCodeAt(i);
        seed = seed & seed;
    }

    const professions: Profession[] = [
        "pilot",
        "engineer",
        "medic",
        "scout",
        "scientist",
        "gunner",
    ];

    for (let i = 0; i < count; i++) {
        const rand1 = Math.abs(Math.sin(seed + i * 1000) * 10000) % 1;
        const rand2 = Math.abs(Math.sin(seed + i * 2000) * 10000) % 1;
        const rand3 = Math.abs(Math.sin(seed + i * 3000) * 10000) % 1;
        const rand4 = Math.abs(Math.sin(seed + i * 4000) * 10000) % 1;

        const profession = professions[Math.floor(rand1 * professions.length)];

        let raceId: RaceId;
        // 70% chance for dominant race, 30% for other races
        if (stationRace && rand4 < 0.7) {
            raceId = stationRace;
        } else {
            // Use seeded random for race selection
            raceId = getRandomRace([], seed + i * 3000);
        }

        const qualityRoll = rand2;
        let quality: Quality;
        if (qualityRoll < 0.25) quality = "poor";
        else if (qualityRoll < 0.6) quality = "average";
        else if (qualityRoll < 0.85) quality = "good";
        else quality = "excellent";

        // Use seeded random for traits generation
        const traitSeed = seed + i * 5000;
        const { traits, priceModifier } = generateCrewTraits(
            quality,
            traitSeed,
        );

        const basePrice = CREW_BASE_PRICES[profession];
        // Generate level 1-3 for all crew based on quality and random
        const level = 1 + Math.floor(rand3 * 3); // Level 1-3
        const levelMod = level > 1 ? 1 + (level - 1) * 0.2 : 1;

        const name = getRandomRaceName(raceId, profession, seed + i);

        // Calculate maxHealth with race bonus and trait effects
        const race = RACES[raceId];
        const healthBonus = race?.crewBonuses?.health || 0;
        let baseMaxHealth = 100 + healthBonus;

        // Apply trait effects to maxHealth
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

        // Calculate final price with safeguards against NaN
        const finalPrice = Math.round(
            basePrice * (priceModifier || 1) * levelMod,
        );

        crewList.push({
            member: {
                name,
                race: raceId,
                profession,
                level: level || 1,
                exp: 0,
                health: baseMaxHealth,
                maxHealth: baseMaxHealth,
                happiness: 80,
                assignment: null,
                assignmentEffect: null,
                combatAssignment: null,
                combatAssignmentEffect: null,
                traits,
                moduleId: 1,
                movedThisTurn: false,
            },
            price: finalPrice,
            quality,
        });
    }

    return crewList;
}
