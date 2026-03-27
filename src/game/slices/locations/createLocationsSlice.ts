import type { GameStore, SetState, Location, RaceId } from "@/game/types";
import { RACES } from "@/game/constants";
import { mineAsteroid } from "./helpers";
import { handleStormEntry } from "./helpers/enterStorm";
import { handleAnomaly as handleAnomalyHelper } from "./helpers";
import { sendScoutingMission as sendScoutingMissionHelper } from "./helpers";
import { respondToDistressSignal as respondToDistressSignalHelper } from "./helpers";
import { planetaryDrill as planetaryDrillHelper } from "./helpers";
import { atmosphericAnalysis as atmosphericAnalysisHelper } from "./helpers";
import { exploreDerelictShip as exploreDerelictShipHelper } from "./helpers";
import {
    startExpedition as startExpeditionHelper,
    revealExpeditionTile as revealExpeditionTileHelper,
    resolveRuinsChoice as resolveRuinsChoiceHelper,
    endExpedition as endExpeditionHelper,
} from "./helpers/expedition";
import {
    startDive as startDiveHelper,
    resolveDiveEvent as resolveDiveEventHelper,
    diveDeeper as diveDeeperHelper,
    surfaceDive as surfaceDiveHelper,
} from "./helpers/gasGiant";

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

    /**
     * Обрабатывает сигнал бедствия
     */
    respondToDistressSignal: () => void;

    /**
     * Планетарное бурение — однократная добыча с поверхности пустой планеты
     * @param planetId - ID планеты
     */
    planetaryDrill: (planetId: string) => void;

    /**
     * Атмосферный анализ — однократный сбор исследовательских ресурсов
     * @param planetId - ID планеты
     */
    atmosphericAnalysis: (planetId: string) => void;

    /**
     * Исследует покинутый корабль разведчиком
     * @param locationId - ID локации с обломками
     */
    exploreDerelictShip: (locationId: string) => void;

    /**
     * Открывает новую расу
     * @param raceId - ID расы
     */
    discoverRace: (raceId: RaceId) => void;

    /** Начинает экспедицию на поверхность населённой планеты */
    startExpedition: (planetId: string, crewIds: number[]) => void;

    /** Открывает тайл экспедиции */
    revealExpeditionTile: (tileIndex: number) => void;

    /** Обрабатывает выбор игрока в событии руин */
    resolveRuinsChoice: (choiceIndex: number) => void;

    /** Завершает экспедицию, применяет награды и тратит 1 ход */
    endExpedition: () => void;

    /** Начинает погружение зонда в газовый гигант */
    startDive: (locationId: string) => void;

    /** Обрабатывает выбор игрока в событии погружения */
    resolveDiveEvent: (choiceIndex: number) => void;

    /** Погружается на следующий слой */
    diveDeeper: () => void;

    /** Всплывает и применяет собранные ресурсы */
    surfaceDive: () => void;

    /** Покупает исследовательские зонды на станции */
    buyProbe: (count: number) => void;
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

    respondToDistressSignal: () => {
        respondToDistressSignalHelper(set, get);
    },

    planetaryDrill: (planetId) => {
        planetaryDrillHelper(planetId, set, get);
    },

    atmosphericAnalysis: (planetId) => {
        atmosphericAnalysisHelper(planetId, set, get);
    },

    exploreDerelictShip: (locationId) => {
        exploreDerelictShipHelper(locationId, set, get);
    },

    startExpedition: (planetId, crewIds) => {
        startExpeditionHelper(planetId, crewIds, set, get);
    },

    revealExpeditionTile: (tileIndex) => {
        revealExpeditionTileHelper(tileIndex, set, get);
    },

    resolveRuinsChoice: (choiceIndex) => {
        resolveRuinsChoiceHelper(choiceIndex, set, get);
    },

    endExpedition: () => {
        endExpeditionHelper(set, get);
    },

    startDive: (locationId) => {
        startDiveHelper(locationId, set, get);
    },

    resolveDiveEvent: (choiceIndex) => {
        resolveDiveEventHelper(choiceIndex, set, get);
    },

    diveDeeper: () => {
        diveDeeperHelper(set, get);
    },

    surfaceDive: () => {
        surfaceDiveHelper(set, get);
    },

    buyProbe: (count: number) => {
        const PROBE_PRICE = 150;
        const state = get();
        const total = PROBE_PRICE * count;
        if (state.credits < total) {
            get().addLog("Недостаточно кредитов для покупки зонда.", "warning");
            return;
        }
        set((s) => ({ credits: s.credits - total, probes: s.probes + count }));
        get().addLog(
            `🔬 Куплено зондов: ${count} (−${total}₢). Всего: ${state.probes + count}`,
            "info",
        );
    },

    discoverRace: (raceId) => {
        set((state) => {
            if (state.knownRaces.includes(raceId)) return state;
            const race = RACES[raceId];
            if (race) {
                get().addLog(
                    `Открыта новая раса: ${race.icon} ${race.pluralName}!`,
                    "info",
                );
            }
            return {
                knownRaces: [...state.knownRaces, raceId],
            };
        });
    },
});
