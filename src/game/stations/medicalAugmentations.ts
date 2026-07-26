import { AUGMENTATIONS } from "@/game/constants/augmentations";
import type { AugmentationId } from "@/game/types/augmentations";
import type { RaceId } from "@/game/types/races";

const professionalAugmentations = Object.values(AUGMENTATIONS)
    .filter((augmentation) => augmentation.forProfession)
    .map((augmentation) => augmentation.id);

const getStationOffset = (stationId: string): number =>
    [...stationId].reduce(
        (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
        0,
    );

/** Постоянный ассортимент медстанции без отдельного инвентаря в сохранении. */
export const getMedicalAugmentationCatalog = (
    stationId: string,
    dominantRace?: RaceId,
): AugmentationId[] => {
    const start = getStationOffset(stationId) % professionalAugmentations.length;
    const professional = Array.from(
        { length: Math.min(3, professionalAugmentations.length) },
        (_, index) =>
            professionalAugmentations[
                (start + index) % professionalAugmentations.length
            ],
    );
    const racial = dominantRace
        ? Object.values(AUGMENTATIONS).find(
              (augmentation) => augmentation.forRace === dominantRace,
          )?.id
        : undefined;

    return racial ? [racial, ...professional] : professional;
};
