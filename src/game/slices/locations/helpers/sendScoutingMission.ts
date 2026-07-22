import { store as i18nStore } from "@/lib/useTranslation";
import type {
    SetState,
    GameStore,
    Location,
    ScoutingOutcome,
    ResearchResourceType,
    SurfaceLogEntry,
} from "@/game/types";
import {
    MUTATION_CHANCES,
    PLANET_POINT_OF_INTERESTS,
    RESEARCH_RESOURCES,
    TRADE_GOODS,
} from "@/game/constants";
import {
    SCOUTING_TRADE_GOOD_BASE_MIN,
    SCOUTING_TRADE_GOOD_BASE_MAX,
    SCOUTING_REQUIRED_VISITS,
} from "../constants";
import { AUGMENTATIONS } from "@/game/constants/augmentations";
import { SCOUT_BASE_EXP } from "@/game/constants/experience";
import { addTradeGood } from "@/game/slices/ship/helpers";
import { determineScoutingOutcome } from "./determineScoutingOutcome";
import { giveRandomMutation } from "@/game/crew";
import { getScoutingPlanetResources } from "@/game/research/utils";
import { typedKeys } from "@/lib";
import { getBestByProfession } from "@/game/crew";
import { planetHasFeature } from "@/game/planets";
import { patchLocation } from "@/game/utils/patchLocation";
import { SCOUT_EVENTS, SCOUT_EVENT_CHANCE } from "./scoutEvents";

/**
 * Отправляет разведчика на исследование планеты
 *
 * @param planetId - ID планеты для разведки
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const sendScoutingMission = (
    planetId: string,
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();

    // Find the highest-level scout
    const scouts = state.crew.filter((c) => c.profession === "scout");
    if (scouts.length === 0) {
        get().addLog( i18nStore.t("game_logs.sendScoutingMission_1"), "error");
        return;
    }
    const scout = scouts.reduce((best, c) =>
        (c.level ?? 1) > (best.level ?? 1) ? c : best,
    );

    // Особенности планеты влияют на риск и щедрость разведки
    const hasAggressiveFauna = planetHasFeature(planetId, "aggressive_fauna");
    const hasAncientTraces = planetHasFeature(planetId, "ancient_traces");

    // Шанс события вместо обычного результата разведки
    const eventTriggered = Math.random() < SCOUT_EVENT_CHANCE;
    let result: ScoutingOutcome | null = null;

    if (!eventTriggered) {
        // Instant scouting - resolve immediately (takes 1 turn)
        const outcome = Math.random();
        result = determineScoutingOutcome(
            outcome,
            state.currentSector?.tier ?? 1,
        );

        // Pre-compute trade good quantity so it's available for both apply and lastScoutResult
        if (result.type === "tradeGood") {
            result.quantity =
                Math.floor(
                    Math.random() *
                        (SCOUTING_TRADE_GOOD_BASE_MAX - SCOUTING_TRADE_GOOD_BASE_MIN + 1),
                ) +
                SCOUTING_TRADE_GOOD_BASE_MIN +
                (scout.level ?? 1);
        }

        // Агрессивная фауна: находки богаче в полтора раза
        if (hasAggressiveFauna) {
            if (result.type === "credits" && result.value) {
                result.value = Math.round(result.value * 1.5);
            }
            if (result.type === "tradeGood" && result.quantity) {
                result.quantity = Math.round(result.quantity * 1.5);
            }
        }

        // Apply scouting result
        applyScoutingResult(result, set, get);

        // Small chance to find research resources
        // (следы древних удваивают шанс — вторая попытка при неудаче)
        let foundResources = applyScoutingResources(set, get);
        if (foundResources.length === 0 && hasAncientTraces) {
            foundResources = applyScoutingResources(set, get);
        }
        if (foundResources.length > 0) {
            result.researchResources = foundResources;
        }

        // Шанс заражения чужеродными организмами при разведке
        // (агрессивная фауна удваивает риск)
        const infectionChance =
            MUTATION_CHANCES.SCOUT_INFECTION * (hasAggressiveFauna ? 2 : 1);
        if (Math.random() < infectionChance) {
            const mutationName = giveRandomMutation(scout, set);
            if (mutationName) {
                result.mutationName = mutationName;
                get().addLog( i18nStore.t("game_logs.sendScoutingMission_2", { scout_name: scout.name, mutationName }),
                    "error",
                );
            }
        }
    }

    // Give experience to scout
    get().gainExp(scout, SCOUT_BASE_EXP);

    // Update exploration progress (optical_implant augmentation gives +1 attempt)
    const newScoutedTimes = getScoutedTimes(state, planetId) + 1;
    const scoutHasOptical = scout.augmentation
        ? (AUGMENTATIONS[scout.augmentation]?.effect?.extraScoutAttempts ?? 0) > 0
        : false;
    const maxScoutAttempts = SCOUTING_REQUIRED_VISITS + (scoutHasOptical ? 1 : 0);
    const isFullyExplored = newScoutedTimes >= maxScoutAttempts;
    const planet = state.currentSector?.locations.find(
        (location) => location.id === planetId,
    );
    const pointOfInterest =
        isFullyExplored && planet?.isEmpty && planet.planetType
            ? planet.pointOfInterest ??
              PLANET_POINT_OF_INTERESTS[planet.planetType]
            : planet?.pointOfInterest;

    // Update state
    updateScoutingState(
        planetId,
        newScoutedTimes,
        isFullyExplored,
        result,
        pointOfInterest,
        set,
    );

    // Событие: показать игроку выбор (результат применится в resolveScoutEvent)
    if (eventTriggered) {
        const event =
            SCOUT_EVENTS[Math.floor(Math.random() * SCOUT_EVENTS.length)];
        set({ pendingScoutEvent: { planetId, eventId: event.id } });
        get().addLog( i18nStore.t("game_logs.sendScoutingMission_3"), "info");
    }

    get().addLog( i18nStore.t("game_logs.sendScoutingMission_4", { newScoutedTimes, maxScoutAttempts }),
        "info",
    );
    get().updateShipStats();
};

/**
 * Применяет результат разведки (кредиты или товар)
 */
const applyScoutingResult = (
    result: ScoutingOutcome,
    set: SetState,
    get: () => GameStore,
): void => {
    const scout = getBestByProfession(get().crew, "scout");
    const scoutName = scout?.name || "Разведчик";

    switch (result.type) {
        case "credits":
            applyCreditReward(result.value, scoutName, set, get);
            break;
        case "tradeGood":
            applyTradeGoodReward(result.itemName, result.quantity ?? 1, scoutName, set, get);
            break;
        default:
            get().addLog( i18nStore.t("game_logs.sendScoutingMission_5", { scoutName }), "info");
    }
};

/**
 * Применяет награду в кредитах
 */
const applyCreditReward = (
    value: number | undefined,
    scoutName: string,
    set: SetState,
    get: () => GameStore,
): void => {
    if (value === undefined) return;

    set((s) => ({ credits: s.credits + value }));
    get().addLog( i18nStore.t("game_logs.sendScoutingMission_6", { scoutName, value }), "info");
};

/**
 * Применяет награду в виде товара
 * Количество: 1–3 + уровень разведчика (вычислено заранее)
 */
const applyTradeGoodReward = (
    itemName: string | undefined,
    quantity: number,
    scoutName: string,
    set: SetState,
    get: () => GameStore,
): void => {
    if (!itemName) return;

    const keys = typedKeys(TRADE_GOODS);
    const goodId = keys.find((key) => TRADE_GOODS[key].name === itemName);

    if (!goodId) return;

    set((s) => ({
        ship: {
            ...s.ship,
            tradeGoods: addTradeGood(s.ship.tradeGoods, goodId, quantity),
        },
    }));
    get().addLog( i18nStore.t("game_logs.sendScoutingMission_7", { scoutName, itemName: i18nStore.t(`trade.goods.${goodId}`), quantity }), "info");
};

/**
 * Применяет научные ресурсы, найденные при разведке планеты
 */
const applyScoutingResources = (
    set: SetState,
    get: () => GameStore,
): { type: ResearchResourceType; quantity: number }[] => {
    const resources = getScoutingPlanetResources();
    if (resources.length === 0) return [];

    set((s) => ({
        research: {
            ...s.research,
            resources: {
                ...s.research.resources,
                ...resources.reduce(
                    (acc, res) => ({
                        ...acc,
                        [res.type]: (s.research.resources[res.type] || 0) + res.quantity,
                    }),
                    {},
                ),
            },
        },
    }));

    resources.forEach((res) => {
        const resourceData = RESEARCH_RESOURCES[res.type];
        get().addLog( i18nStore.t("game_logs.sendScoutingMission_8", { icon: resourceData.icon, resourceData_name: resourceData.name, quantity: res.quantity }),
            "info",
        );
    });

    return resources;
};

/**
 * Получает текущее количество попыток разведки планеты
 */
const getScoutedTimes = (state: GameStore, planetId: string) =>
    state.currentSector?.locations.find((l) => l.id === planetId)
        ?.scoutedTimes || 0;

/**
 * Создаёт объект результата разведки
 */
const createScoutResult = (result: ScoutingOutcome): ScoutingOutcome => ({
    type: result.type,
    value: result.type === "credits" ? result.value : undefined,
    itemName: result.type === "tradeGood" ? result.itemName : undefined,
    quantity: result.type === "tradeGood" ? result.quantity : undefined,
    mutationName: result.mutationName,
    researchResources: result.researchResources,
});

/**
 * Обновляет состояние игры после разведки
 */
const updateScoutingState = (
    planetId: string,
    newScoutedTimes: number,
    isFullyExplored: boolean,
    result: ScoutingOutcome | null,
    pointOfInterest: Location["pointOfInterest"],
    set: SetState,
): void => {
    const scoutResult = result ? createScoutResult(result) : undefined;
    const logEntry: SurfaceLogEntry | undefined = scoutResult && {
        source: "scout",
        credits: scoutResult.value,
        tradeGood:
            scoutResult.itemName !== undefined
                ? {
                      name: scoutResult.itemName,
                      quantity: scoutResult.quantity ?? 1,
                  }
                : undefined,
        researchResources: scoutResult.researchResources,
        mutationName: scoutResult.mutationName,
    };

    set((s) => ({
        turn: s.turn + 1,
        ...patchLocation(s, planetId, (loc) => ({
            scoutedTimes: newScoutedTimes,
            explored: isFullyExplored,
            pointOfInterest: pointOfInterest ?? loc.pointOfInterest,
            lastScoutResult: scoutResult ?? loc.lastScoutResult,
            surfaceLog: logEntry
                ? appendSurfaceLog(loc.surfaceLog, logEntry)
                : loc.surfaceLog,
        })),
    }));
};

/** Добавляет запись в журнал находок локации (хранится последние 20) */
export const appendSurfaceLog = (
    log: SurfaceLogEntry[] | undefined,
    entry: SurfaceLogEntry,
): SurfaceLogEntry[] => [...(log ?? []), entry].slice(-20);

