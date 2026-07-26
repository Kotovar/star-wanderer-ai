import { AUGMENTATIONS } from "@/game/constants/augmentations";
import type {
    AugmentationId,
    AugmentationRarity,
} from "@/game/types/augmentations";
import type { RaceId } from "@/game/types/races";

const professionalAugmentations = Object.values(AUGMENTATIONS).filter(
    (augmentation) => augmentation.forProfession,
);

const RARITY_WEIGHTS: Record<
    1 | 2 | 3 | 4,
    Record<AugmentationRarity, number>
> = {
    1: { common: 70, uncommon: 25, rare: 4, legendary: 1 },
    2: { common: 40, uncommon: 42, rare: 15, legendary: 3 },
    3: { common: 15, uncommon: 35, rare: 38, legendary: 12 },
    4: { common: 5, uncommon: 20, rare: 45, legendary: 30 },
};

const RARITIES: AugmentationRarity[] = [
    "common",
    "uncommon",
    "rare",
    "legendary",
];

const getStationOffset = (stationId: string): number =>
    [...stationId].reduce(
        (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
        0,
    );

const getStationRandom = (stationId: string, tier: number) => {
    let seed = (getStationOffset(stationId) ^ (tier * 0x9e3779b9)) >>> 0;
    return () => {
        seed = (seed + 0x6d2b79f5) >>> 0;
        let value = seed;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
    };
};

const getTier = (tier: number): 1 | 2 | 3 | 4 =>
    Math.min(4, Math.max(1, Math.floor(tier))) as 1 | 2 | 3 | 4;

const pickRarity = (
    random: () => number,
    tier: 1 | 2 | 3 | 4,
): AugmentationRarity => {
    let roll = random() * 100;
    for (const rarity of RARITIES) {
        roll -= RARITY_WEIGHTS[tier][rarity];
        if (roll < 0) return rarity;
    }
    return "legendary";
};

const pickProfessionalAugmentations = (
    stationId: string,
    tier: 1 | 2 | 3 | 4,
): AugmentationId[] => {
    const random = getStationRandom(stationId, tier);
    const available = [...professionalAugmentations];
    const catalog: AugmentationId[] = [];

    while (catalog.length < 3 && available.length > 0) {
        const rarity = pickRarity(random, tier);
        const candidates = available.filter(
            (augmentation) => augmentation.rarity === rarity,
        );
        const pool = candidates.length > 0 ? candidates : available;
        const augmentation = pool[Math.floor(random() * pool.length)];
        catalog.push(augmentation.id);
        available.splice(available.indexOf(augmentation), 1);
    }

    return catalog;
};

/** Постоянный ассортимент медстанции без отдельного инвентаря в сохранении. */
export const getMedicalAugmentationCatalog = (
    stationId: string,
    dominantRace?: RaceId,
    sectorTier = 1,
): AugmentationId[] => {
    const professional = pickProfessionalAugmentations(
        stationId,
        getTier(sectorTier),
    );
    const racial = dominantRace
        ? Object.values(AUGMENTATIONS).find(
              (augmentation) => augmentation.forRace === dominantRace,
          )?.id
        : undefined;

    return racial ? [racial, ...professional] : professional;
};
