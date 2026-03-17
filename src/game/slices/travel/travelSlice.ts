import type { GameStore, SetState } from "@/game/types";
import {
    selectSector,
    selectLocation,
    travelThroughBlackHole,
    emergencyJump,
} from "./helpers";

/**
 * Интерфейс TravelSlice
 */
export interface TravelSlice {
    selectSector: (sectorId: number) => void;
    selectLocation: (locationIdx: number) => void;
    travelThroughBlackHole: () => void;
    emergencyJump: () => void;
}

/**
 * Создаёт travel слайс
 */
export const createTravelSlice = (
    set: SetState,
    get: () => GameStore,
): TravelSlice => ({
    selectSector: (sectorId) => {
        selectSector(set, get, sectorId);
    },
    selectLocation: (locationIdx) => {
        selectLocation(set, get, locationIdx);
    },
    travelThroughBlackHole: () => {
        travelThroughBlackHole(set, get);
    },
    emergencyJump: () => {
        emergencyJump(set, get);
    },
});
