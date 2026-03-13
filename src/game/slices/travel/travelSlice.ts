import type { GameStore } from "@/game/types";
import { SetState } from "@/game/slices/types";
import {
    selectSector,
    selectLocation,
    travelThroughBlackHole,
} from "./helpers";

/**
 * Интерфейс TravelSlice
 */
export interface TravelSlice {
    selectSector: (sectorId: number) => void;
    selectLocation: (locationIdx: number) => void;
    travelThroughBlackHole: () => void;
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
});
