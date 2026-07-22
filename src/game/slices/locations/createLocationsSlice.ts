import { store as i18nStore } from "@/lib/useTranslation";
import type {
    GameStore,
    SetState,
    Location,
    RaceId,
    AnomalyApproach,
    DistressApproach,
    ExpeditionScanMode,
} from "@/game/types";
import { RACES } from "@/game/constants";
import { mineAsteroid } from "./helpers";
import { handleStormEntry } from "./helpers/enterStorm";
import { handleAnomaly as handleAnomalyHelper } from "./helpers";
import { sendScoutingMission as sendScoutingMissionHelper } from "./helpers";
import {
    deepScanDistressSignal as deepScanDistressSignalHelper,
    probeDistressSignal as probeDistressSignalHelper,
    respondToDistressSignal as respondToDistressSignalHelper,
} from "./helpers";
import { planetaryDrill as planetaryDrillHelper } from "./helpers";
import { atmosphericAnalysis as atmosphericAnalysisHelper } from "./helpers";
import { orbitalScan as orbitalScanHelper } from "./helpers";
import { resolveScoutEvent as resolveScoutEventHelper } from "./helpers";
import { exploreDerelictShip as exploreDerelictShipHelper } from "./helpers";
import {
    startExpedition as startExpeditionHelper,
    revealExpeditionTile as revealExpeditionTileHelper,
    scanExpeditionTile as scanExpeditionTileHelper,
    resolveRuinsChoice as resolveRuinsChoiceHelper,
    diveDeeperIntoRuins as diveDeeperIntoRuinsHelper,
    confirmRuinsOutcome as confirmRuinsOutcomeHelper,
    endExpedition as endExpeditionHelper,
} from "./helpers/expedition";
import {
    startDive as startDiveHelper,
    resolveDiveEvent as resolveDiveEventHelper,
    diveDeeper as diveDeeperHelper,
    surfaceDive as surfaceDiveHelper,
    abandonDive as abandonDiveHelper,
} from "./helpers/gasGiant";
import { salvageWreckField as salvageWreckFieldHelper } from "./helpers/salvageWreckField";
import { resonateWithSpaceMonster as resonateWithSpaceMonsterHelper } from "./helpers/spaceMonster";

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
     * @param approach - Подход к исследованию (cautious/standard/deep)
     */
    handleAnomaly: (anomaly: Location, approach?: AnomalyApproach) => void;

    /**
     * Отправляет разведчика на исследование планеты
     * @param planetId - ID планеты
     */
    sendScoutingMission: (planetId: string) => void;

    /**
     * Обрабатывает сигнал бедствия
     */
    respondToDistressSignal: (approach?: DistressApproach) => void;

    /** Активно расшифровывает неизвестный сигнал сканером. */
    deepScanDistressSignal: () => void;

    /** Отправляет исследовательский зонд, чтобы раскрыть источник сигнала. */
    probeDistressSignal: () => void;

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

    /** Орбитальное сканирование пустой планеты сканером корабля */
    orbitalScan: (planetId: string) => void;

    /** Обрабатывает выбор игрока в событии разведки пустой планеты */
    resolveScoutEvent: (choiceIndex: number) => void;

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

    /** Подсматривает тип тайла: учёные — рядом, сканер — в любой точке карты. */
    scanExpeditionTile: (
        tileIndex: number,
        scanMode?: ExpeditionScanMode,
    ) => void;

    /** Обрабатывает выбор игрока в событии руин */
    resolveRuinsChoice: (choiceIndex: number) => void;

    /** Открывает следующую камеру руин за AP после получения добычи */
    diveDeeperIntoRuins: () => void;

    /** Подтверждает показ исхода руин и закрывает событие */
    confirmRuinsOutcome: () => void;

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

    /** Прерывает погружение: зонд утерян, ресурсы не получены, ход не тратится */
    abandonDive: () => void;

    /** Один проход по полю обломков: лут + урон щитам */
    salvageWreckField: () => void;

    /** Отправляет зонд для временного резонанса с космическим существом */
    resonateWithSpaceMonster: () => void;

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

    handleAnomaly: (anomaly, approach) => {
        handleAnomalyHelper(anomaly, set, get, approach);
    },

    sendScoutingMission: (planetId) => {
        sendScoutingMissionHelper(planetId, set, get);
    },

    respondToDistressSignal: (approach) => {
        respondToDistressSignalHelper(set, get, approach);
    },

    deepScanDistressSignal: () => {
        deepScanDistressSignalHelper(set, get);
    },

    probeDistressSignal: () => {
        probeDistressSignalHelper(set, get);
    },

    planetaryDrill: (planetId) => {
        planetaryDrillHelper(planetId, set, get);
    },

    atmosphericAnalysis: (planetId) => {
        atmosphericAnalysisHelper(planetId, set, get);
    },

    orbitalScan: (planetId) => {
        orbitalScanHelper(planetId, set, get);
    },

    resolveScoutEvent: (choiceIndex) => {
        resolveScoutEventHelper(choiceIndex, set, get);
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

    scanExpeditionTile: (tileIndex, scanMode = "scientist") => {
        scanExpeditionTileHelper(tileIndex, scanMode, set, get);
    },

    resolveRuinsChoice: (choiceIndex) => {
        resolveRuinsChoiceHelper(choiceIndex, set, get);
    },

    diveDeeperIntoRuins: () => {
        diveDeeperIntoRuinsHelper(set, get);
    },

    confirmRuinsOutcome: () => {
        confirmRuinsOutcomeHelper(set, get);
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

    abandonDive: () => {
        abandonDiveHelper(set, get);
    },

    salvageWreckField: () => {
        salvageWreckFieldHelper(set, get);
    },

    resonateWithSpaceMonster: () => {
        resonateWithSpaceMonsterHelper(set, get);
    },

    buyProbe: (count: number) => {
        const PROBE_PRICE = 150;
        const state = get();
        const total = PROBE_PRICE * count;
        if (state.credits < total) {
            get().addLog( i18nStore.t("game_logs.createLocationsSlice_1"), "warning");
            return;
        }
        const currentCargo =
            state.ship.cargo.reduce((s, c) => s + c.quantity, 0) +
            state.ship.tradeGoods.reduce((s, g) => s + g.quantity, 0) +
            state.probes;
        const cargoCapacity = get().getCargoCapacity();
        if (currentCargo + count > cargoCapacity) {
            get().addLog( i18nStore.t("game_logs.createLocationsSlice_2"), "warning");
            return;
        }
        set((s) => ({ credits: s.credits - total, probes: s.probes + count }));
        get().addLog( i18nStore.t("game_logs.createLocationsSlice_3", { count, total, count2: state.probes + count }),
            "info",
        );
    },

    discoverRace: (raceId) => {
        set((state) => {
            if (state.knownRaces.includes(raceId)) return state;
            const race = RACES[raceId];
            if (race) {
                get().addLog( i18nStore.t("game_logs.createLocationsSlice_4", { icon: race.icon, pluralName: i18nStore.t(`races.${raceId}.plural`) }),
                    "info",
                );
            }
            return {
                knownRaces: [...state.knownRaces, raceId],
            };
        });
    },
});
