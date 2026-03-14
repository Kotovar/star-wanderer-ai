import type { GameStore, SetState, Location } from "@/game/types";
import { mineAsteroid } from "./helpers";
import { handleStormEntry } from "./helpers/enterStorm";
import { handleAnomaly as handleAnomalyHelper } from "./helpers";
import { sendScoutingMission as sendScoutingMissionHelper } from "./helpers";

/**
 * Интерфейс LocationsSlice
 * Содержит методы для обработки действий в локациях
 */
export interface LocationsSlice {
    /**
     * Добывает ресурсы из астероида
     */
    mineAsteroid: () => void;

    /**
     * Входит в шторм
     */
    enterStorm: () => void;

    /**
     * Обрабатывает посещение аномалии
     * @param anomaly - Объект аномалии
     */
    handleAnomaly: (anomaly: Location) => void;

    /**
     * Отправляет разведчика на исследование планеты
     * @param planetId - ID планеты
     */
    sendScoutingMission: (planetId: string) => void;
}

/**
 * Создаёт locations слайс для обработки действий в локациях
 *
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 * @returns Объект с методами управления локациями
 */
export const createLocationsSlice = (
    set: SetState,
    get: () => GameStore,
): LocationsSlice => ({
    mineAsteroid: () => {
        mineAsteroid(set, get);
    },

    enterStorm: () => {
        handleStormEntry(set, get);
    },

    handleAnomaly: (anomaly) => {
        handleAnomalyHelper(anomaly, set, get);
    },

    sendScoutingMission: (planetId) => {
        sendScoutingMissionHelper(planetId, set, get);
    },
});
