import type { GameStore, SetState } from "@/game/types";
import {
    selectSector,
    selectLocation,
    travelThroughBlackHole,
    emergencyJump,
    resolveTravelEvent,
} from "./helpers";

/**
 * Интерфейс TravelSlice
 */
export interface TravelSlice {
    selectSector: (sectorId: number) => void;
    selectLocation: (locationIdx: number) => void;
    resolveTravelEvent: (choice: "risk" | "cautious") => void;
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
    resolveTravelEvent: (choice) => {
        resolveTravelEvent(set, get, choice);
    },
    travelThroughBlackHole: () => {
        travelThroughBlackHole(set, get);
    },
    emergencyJump: () => {
        emergencyJump(set, get);
    },
});
