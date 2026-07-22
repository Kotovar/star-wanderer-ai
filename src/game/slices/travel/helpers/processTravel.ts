import { store as i18nStore } from "@/lib/useTranslation";
import type { GameState, GameStore, Sector, SetState, TravelEventType } from "@/game/types";
import {
    CONTRACT_REWARDS,
    MUTATION_CHANCES,
    RESEARCH_RESOURCES,
    STAR_EVENT_CHANCE_CAP,
    STAR_EVENT_CHANCE_PER_LEVEL,
    STAR_HAZARD_LEVEL,
} from "@/game/constants";
import { TRADE_GOODS } from "@/game/constants/goods";
import { getTierPriceMultiplier } from "@/game/slices/trade/constants";
import {
    getPilotInCockpit,
    giveCrewExperience,
    giveRandomMutation,
    shiftHappiness,
} from "@/game/crew";
import { getActiveModule } from "@/game/modules";
import { getAnomalyResources } from "@/game/research/utils";
import { addTradeGood } from "@/game/slices/ship/helpers";
import { getCargoCapacity } from "@/game/slices/ship/helpers/getCargoCapacity";

/** Вероятность случайного события в пути (прямой маршрут) */
const TRAVEL_EVENT_CHANCE_DIRECT = 0.45;

/** Вероятность случайного события в пути (обходной маршрут) */
const TRAVEL_EVENT_CHANCE_DETOUR = 0.15;

/** Список случайных событий в пути */
const TRAVEL_EVENTS: TravelEventType[] = [
    "anomaly",
    "asteroids",
    "stress",
    "signal",
    "emp",
];

/** Опасные звёзды перевешивают выбор в сторону этих событий */
const HAZARDOUS_TRAVEL_EVENTS: TravelEventType[] = ["emp", "anomaly"];

/** Минимальное здоровье модуля после повреждения */
const MIN_MODULE_HEALTH = 10;

/** Урон от астероидов (одному модулю) */
const ASTEROID_DAMAGE = 15;

/** Урон от аномалии (всем модулям) */
const ANOMALY_DAMAGE = 10;

/** Потеря настроения от стресса */
const STRESS_HAPPINESS_LOSS = 8;

/** Награда за сигнал (кредиты) */
const SIGNAL_REWARD = 40;

/** Расход топлива для осторожного манёвра через астероидное поле */
const ASTEROID_CAUTIOUS_FUEL_COST = 5;

/** Расход топлива для осторожного обхода аномального фронта */
const ANOMALY_CAUTIOUS_FUEL_COST = 5;

/** Урон от аномалии при осторожном обходе */
const ANOMALY_CAUTIOUS_DAMAGE = 5;

/** Бонусная награда за анализ слабого сигнала сканером */
const SCANNER_SIGNAL_BONUS_REWARD = 75;

/** Минералов за уровень бура при попутном бурении астероидного потока */
const SPECIAL_MINING_MINERALS_PER_LEVEL = 4;

/** Множитель к базовой цене при продаже странствующему торговцу */
const TRADER_PRICE_MULTIPLIER = 1.2;

/**
 * Выбирает случайный элемент из массива
 * @param arr - Массив для выбора
 * @returns Случайный элемент
 */
const randomElement = <T>(arr: readonly T[]): T =>
    arr[Math.floor(Math.random() * arr.length)];

/**
 * Опасность звезды сектора назначения (0, если сектор/звезда неизвестны)
 */
const getDestinationHazardLevel = (destination: Sector | undefined): number =>
    destination ? STAR_HAZARD_LEVEL[destination.star.type] : 0;

/**
 * Шанс случайного события в пути, увеличенный опасностью звезды назначения
 */
const getTravelEventChance = (
    baseChance: number,
    hazardLevel: number,
): number =>
    Math.min(
        STAR_EVENT_CHANCE_CAP,
        baseChance * (1 + hazardLevel * STAR_EVENT_CHANCE_PER_LEVEL),
    );

/**
 * Выбирает случайное событие в пути; у опасных звёзд выше шанс EMP/аномалии
 */
const pickTravelEvent = (hazardLevel: number): TravelEventType => {
    if (hazardLevel < 2) return randomElement(TRAVEL_EVENTS);
    const weighted = [
        ...TRAVEL_EVENTS,
        ...HAZARDOUS_TRAVEL_EVENTS.flatMap((event) =>
            Array(hazardLevel).fill(event),
        ),
    ];
    return randomElement(weighted);
};

/**
 * Обрабатывает повреждение модуля от астероидов
 * @param setState - Функция обновления состояния
 * @param getState - Функция получения состояния
 * @returns Нанесённый урон
 */
const handleAsteroidDamage = (
    setState: SetState,
    getState: () => GameStore,
): number => {
    const modules = getState().ship.modules;
    const targetModule = randomElement(modules);

    setState((s) => ({
        ship: {
            ...s.ship,
            modules: s.ship.modules.map((m) =>
                m.id === targetModule.id
                    ? {
                          ...m,
                          health: Math.max(
                              MIN_MODULE_HEALTH,
                              m.health - ASTEROID_DAMAGE,
                          ),
                      }
                    : m,
            ),
        },
    }));

    return ASTEROID_DAMAGE;
};

/**
 * Обрабатывает событие аномалии - повреждение всех модулей
 * @param setState - Функция обновления состояния
 * @param getState - Функция получения состояния
 * @returns Количество повреждённых модулей
 */
const handleAnomaly = (
    setState: SetState,
    getState: () => GameStore,
): number => {
    const damagedCount = getState().ship.modules.filter(
        (m) => m.health > MIN_MODULE_HEALTH,
    ).length;

    setState((s) => ({
        ship: {
            ...s.ship,
            modules: s.ship.modules.map((m) => ({
                ...m,
                health: Math.max(MIN_MODULE_HEALTH, m.health - ANOMALY_DAMAGE),
            })),
        },
    }));

    return damagedCount;
};

/**
 * Обрабатывает событие стресса - падение настроения экипажа
 * @param setState - Функция обновления состояния
 * @returns Потеря настроения
 */
const handleStress = (setState: SetState): number => {
    setState((s) => ({
        crew: s.crew.map((c) => shiftHappiness(c, -STRESS_HAPPINESS_LOSS)),
    }));

    return STRESS_HAPPINESS_LOSS;
};

/**
 * Обрабатывает событие сигнала - находка кредитов
 * @param setState - Функция обновления состояния
 * @returns Найденная сумма
 */
const handleSignal = (setState: SetState): number => {
    setState((s) => ({
        credits: s.credits + SIGNAL_REWARD,
    }));

    return SIGNAL_REWARD;
};

const hasPilotInCockpit = (state: GameStore): boolean =>
    !!getPilotInCockpit(state.crew, state.ship.modules);

/**
 * Обрабатывает электромагнитный импульс - сжигание щитов
 * @param setState - Функция обновления состояния
 * @param getState - Функция получения состояния
 * @returns Потеряно щитов
 */
const handleEMP = (setState: SetState, getState: () => GameStore): number => {
    const currentShields = getState().ship.shields;

    setState((s) => ({
        ship: {
            ...s.ship,
            shields: 0,
        },
    }));

    return currentShields;
};

/**
 * Обрабатывает случайные события во время путешествия
 * @param setState - Функция обновления состояния
 * @param getState - Функция получения состояния
 */
const handleRandomEvent = (
    event: TravelEventType,
    setState: SetState,
    getState: () => GameStore,
): void => {
    switch (event) {
        case "asteroids": {
            const damage = handleAsteroidDamage(setState, getState);
            getState().addLog( i18nStore.t("game_logs.processTravel_1", { damage }),
                "warning",
            );
            break;
        }
        case "anomaly": {
            const damagedCount = handleAnomaly(setState, getState);
            getState().addLog( i18nStore.t("game_logs.processTravel_2", { damagedCount, ANOMALY_DAMAGE }),
                "warning",
            );
            break;
        }
        case "stress": {
            const loss = handleStress(setState);
            getState().addLog( i18nStore.t("game_logs.processTravel_3", { loss }),
                "warning",
            );
            break;
        }
        case "signal": {
            const reward = handleSignal(setState);
            getState().addLog( i18nStore.t("game_logs.processTravel_4", { reward }),
                "info",
            );
            break;
        }
        case "emp": {
            const shieldsLost = handleEMP(setState, getState);
            if (shieldsLost > 0) {
                getState().addLog( i18nStore.t("game_logs.processTravel_5", { shieldsLost }),
                    "warning",
                );
            } else {
                getState().addLog( i18nStore.t("game_logs.processTravel_6"),
                    "info",
                );
            }
            break;
        }
        case "trader": {
            const goods = getState().ship.tradeGoods;
            if (goods.length === 0) {
                getState().addLog( i18nStore.t("game_logs.processTravel_7"),
                    "info",
                );
                break;
            }

            // Торговец платит по ценам тира текущего сектора, как и станции
            const traderTierMult = getTierPriceMultiplier(
                getState().currentSector?.tier ?? 1,
            );
            const total = goods.reduce(
                (sum, g) =>
                    sum +
                    Math.floor(
                        (TRADE_GOODS[g.item].basePrice *
                            TRADER_PRICE_MULTIPLIER *
                            traderTierMult *
                            g.quantity) /
                            5,
                    ),
                0,
            );
            setState((s) => ({
                credits: s.credits + total,
                ship: { ...s.ship, tradeGoods: [] },
            }));
            getState().addLog( i18nStore.t("game_logs.processTravel_8", { total }),
                "info",
            );
            break;
        }
    }
};

const applyCautiousEventChoice = (
    event: TravelEventType,
    setState: SetState,
    getState: () => GameStore,
): boolean => {
    switch (event) {
        case "asteroids": {
            if (hasPilotInCockpit(getState())) {
                getState().addLog( i18nStore.t("game_logs.processTravel_9"),
                    "info",
                );
                return true;
            }

            if (getState().ship.fuel < ASTEROID_CAUTIOUS_FUEL_COST) {
                getState().addLog( i18nStore.t("game_logs.processTravel_10"), "error");
                return false;
            }
            setState((s) => ({
                ship: {
                    ...s.ship,
                    fuel: Math.max(0, s.ship.fuel - ASTEROID_CAUTIOUS_FUEL_COST),
                },
            }));
            getState().addLog( i18nStore.t("game_logs.processTravel_11", { ASTEROID_CAUTIOUS_FUEL_COST }),
                "info",
            );
            return true;
        }
        case "anomaly": {
            if (getState().ship.fuel < ANOMALY_CAUTIOUS_FUEL_COST) {
                getState().addLog( i18nStore.t("game_logs.processTravel_12"), "error");
                return false;
            }
            const damagedCount = getState().ship.modules.filter(
                (m) => m.health > MIN_MODULE_HEALTH,
            ).length;
            setState((s) => ({
                ship: {
                    ...s.ship,
                    fuel: Math.max(0, s.ship.fuel - ANOMALY_CAUTIOUS_FUEL_COST),
                    modules: s.ship.modules.map((m) => ({
                        ...m,
                        health: Math.max(
                            MIN_MODULE_HEALTH,
                            m.health - ANOMALY_CAUTIOUS_DAMAGE,
                        ),
                    })),
                },
            }));
            getState().addLog( i18nStore.t("game_logs.processTravel_13", { damagedCount, ANOMALY_CAUTIOUS_DAMAGE, ANOMALY_CAUTIOUS_FUEL_COST }),
                "warning",
            );
            return true;
        }
        case "stress": {
            setState((s) => ({
                traveling: s.traveling
                    ? {
                          ...s.traveling,
                          turnsLeft: s.traveling.turnsLeft + 1,
                          turnsTotal: s.traveling.turnsTotal + 1,
                      }
                    : null,
            }));
            getState().addLog( i18nStore.t("game_logs.processTravel_14"),
                "info",
            );
            return true;
        }
        case "signal": {
            if (getState().getEffectiveScanRange() >= 3) {
                setState((s) => ({
                    credits: s.credits + SCANNER_SIGNAL_BONUS_REWARD,
                }));
                getState().addLog( i18nStore.t("game_logs.processTravel_15", { SCANNER_SIGNAL_BONUS_REWARD }),
                    "info",
                );
                return true;
            }

            getState().addLog( i18nStore.t("game_logs.processTravel_16"), "info");
            return true;
        }
        case "emp": {
            if (getState().ship.shields > 0) {
                getState().addLog( i18nStore.t("game_logs.processTravel_17"),
                    "info",
                );
                return true;
            }

            const shieldsLost = Math.ceil(getState().ship.shields / 2);
            setState((s) => ({
                ship: {
                    ...s.ship,
                    shields: Math.max(0, s.ship.shields - shieldsLost),
                },
            }));
            getState().addLog(
                shieldsLost > 0
                    ? i18nStore.t("game_logs.emp_retune_lost", { shieldsLost })
                    : i18nStore.t("game_logs.emp_retune_ok"),
                shieldsLost > 0 ? "warning" : "info",
            );
            return true;
        }
        case "trader": {
            getState().addLog( i18nStore.t("game_logs.processTravel_18"),
                "info",
            );
            return true;
        }
    }
};

/**
 * Особый вариант решения, доступный при подходящем оборудовании:
 * - астероиды + активный бур: попутное бурение (урон + минералы в трюм)
 * - аномалия + активная лаборатория: изучение (урон + исследовательские ресурсы)
 */
const applySpecialEventChoice = (
    event: TravelEventType,
    setState: SetState,
    getState: () => GameStore,
): boolean => {
    switch (event) {
        case "asteroids": {
            const drillLevel = getState().getDrillLevel();
            if (drillLevel <= 0) {
                getState().addLog( i18nStore.t("game_logs.processTravel_19"), "error");
                return false;
            }

            const damage = handleAsteroidDamage(setState, getState);

            const state = getState();
            const currentCargo =
                state.ship.cargo.reduce((s, c) => s + c.quantity, 0) +
                state.ship.tradeGoods.reduce((s, g) => s + g.quantity, 0) +
                state.probes;
            const freeSpace = Math.max(
                0,
                getCargoCapacity(state) - currentCargo,
            );
            const mined = Math.min(
                freeSpace,
                drillLevel * SPECIAL_MINING_MINERALS_PER_LEVEL,
            );

            if (mined > 0) {
                setState((s) => ({
                    ship: {
                        ...s.ship,
                        tradeGoods: addTradeGood(
                            s.ship.tradeGoods,
                            "minerals",
                            mined,
                        ),
                    },
                }));
            }
            getState().addLog(
                mined > 0
                    ? i18nStore.t("game_logs.mining_ok", { mined, damage })
                    : i18nStore.t("game_logs.mining_full", { damage }),
                mined > 0 ? "info" : "warning",
            );
            return true;
        }
        case "anomaly": {
            const lab = getActiveModule(getState().ship.modules, "lab");
            if (!lab) {
                getState().addLog( i18nStore.t("game_logs.processTravel_20"), "error");
                return false;
            }

            const damagedCount = handleAnomaly(setState, getState);

            let resources = getAnomalyResources();
            if (resources.length === 0) {
                resources = [{ type: "energy_samples", quantity: 1 }];
            }
            setState((s) => ({
                research: {
                    ...s.research,
                    resources: resources.reduce(
                        (acc, res) => ({
                            ...acc,
                            [res.type]: (acc[res.type] || 0) + res.quantity,
                        }),
                        { ...s.research.resources },
                    ),
                },
            }));

            getState().addLog( i18nStore.t("game_logs.processTravel_21", { damagedCount, ANOMALY_DAMAGE }),
                "warning",
            );
            resources.forEach((res) => {
                const resourceData = RESEARCH_RESOURCES[res.type];
                getState().addLog( i18nStore.t("game_logs.processTravel_22", { icon: resourceData.icon, resourceData_name: resourceData.name, quantity: res.quantity }),
                    "info",
                );
            });
            return true;
        }
        default: {
            getState().addLog( i18nStore.t("game_logs.processTravel_23"), "error");
            return false;
        }
    }
};

export const resolveTravelEvent = (
    set: SetState,
    get: () => GameStore,
    choice: "risk" | "cautious" | "special",
): void => {
    const event = get().pendingTravelEvent;
    if (!event) return;

    const resolved =
        choice === "risk"
            ? (handleRandomEvent(event.type, set, get), true)
            : choice === "special"
              ? applySpecialEventChoice(event.type, set, get)
              : applyCautiousEventChoice(event.type, set, get);

    if (!resolved) return;

    set({ pendingTravelEvent: null });
    get().updateShipStats();
    get().saveGame();
};

/**
 * Обрабатывает патрульные контракты (сбор биообразцов)
 * @param contracts - Список патрульных контрактов
 * @param destinationSector - Сектор назначения
 * @param state - Текущее состояние игры
 * @param setState - Функция обновления состояния
 * @param getState - Функция получения состояния
 * @returns Объект с результатом обработки
 */
export const handlePatrolContracts = (
    contracts: GameState["activeContracts"],
    destinationSector: GameState["currentSector"],
    state: GameState,
    setState: SetState,
    getState: () => GameStore,
) => {
    let newActiveContracts = state.activeContracts;
    // Несколько patrol-контрактов могут завершиться одним прилётом —
    // копим все ID и суммарную награду, а не последнюю
    const completedIds: string[] = [];
    let totalReward = 0;

    if (!destinationSector) {
        return { newActiveContracts, completedIds, totalReward };
    }

    contracts.forEach((c) => {
        const targetSectors = c.targetSectors || [];
        const visitedSectors = [
            ...new Set([...(c.visitedSectors || []), destinationSector.id]),
        ];
        // Count only sectors that are actually in the target list
        const visitedTargetCount = visitedSectors.filter((id) =>
            targetSectors.includes(id),
        ).length;

        if (visitedTargetCount >= targetSectors.length) {
            completedIds.push(c.id);
            totalReward += c.reward;

            getState().addLog( i18nStore.t("game_logs.processTravel_24", { reward: c.reward }),
                "info",
            );

            const expReward = CONTRACT_REWARDS.patrol.baseExp;
            giveCrewExperience(
                expReward,
                `Экипаж получил опыт: +${expReward} ед.`,
            );

            if (c.isRaceQuest && c.requiredRace) {
                getState().changeReputation(c.requiredRace, 10);
            }

            newActiveContracts = newActiveContracts.filter(
                (ac) => ac.id !== c.id,
            );
        } else {
            newActiveContracts = newActiveContracts.map((ac) =>
                ac.id === c.id ? { ...ac, visitedSectors } : ac,
            );
            getState().addLog( i18nStore.t("game_logs.processTravel_25", { visitedTargetCount, targetSectors_length: targetSectors.length }),
                "info",
            );
        }
    });

    return { newActiveContracts, completedIds, totalReward };
};

/**
 * Радиационная мутация при прибытии в сектор с нейтронной звездой.
 * Вызывается на ВСЕХ путях прибытия: обычном (processTravel) и мгновенных
 * (тот же тир, ионный двигатель, варп — selectSector).
 */
export const applyNeutronRadiation = (
    sector: GameState["currentSector"],
    set: SetState,
    get: () => GameStore,
): void => {
    if (sector?.star?.type !== "neutron_star") return;

    const chance =
        sector.tier >= 3
            ? MUTATION_CHANCES.NEUTRON_STAR_HIGH_TIER
            : MUTATION_CHANCES.NEUTRON_STAR;

    get().crew.forEach((crewMember) => {
        if (Math.random() < chance) {
            const mutationName = giveRandomMutation(crewMember, set);
            if (mutationName) {
                get().addLog( i18nStore.t("game_logs.processTravel_26", { crewMember_name: crewMember.name, mutationName }),
                    "error",
                );
            }
        }
    });
};

/**
 * Обработка путешествий между секторами
 * @param state - Текущее состояние игры
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const processTravel = (
    set: SetState,
    get: () => GameStore,
): void => {
    const traveling = get().traveling;
    if (!traveling) return;
    if (get().pendingTravelEvent) return;

    // Встреча со странствующим торговцем (заготовлена при старте перелёта).
    // traderTurn сразу сбрасывается, иначе событие сработает повторно:
    // turnsLeft в этот ход не уменьшается.
    if (traveling.traderTurn === traveling.turnsLeft) {
        set((s) => ({
            pendingTravelEvent: { type: "trader" },
            traveling: s.traveling
                ? { ...s.traveling, traderTurn: undefined }
                : null,
        }));
        get().addLog( i18nStore.t("game_logs.processTravel_27"),
            "warning",
        );
        get().saveGame();
        return;
    }

    // Случайные события проверяются до уменьшения turnsLeft, чтобы они могли
    // появляться даже на перелётах длиной в 1 ход.
    // Опасная звезда назначения повышает шанс события и перевешивает выбор
    // в сторону EMP/аномалии (см. star_info.<type>.hazard во флейвор-тексте).
    const hazardLevel = getDestinationHazardLevel(traveling.destination);
    const baseEventChance =
        traveling.route === "detour"
            ? TRAVEL_EVENT_CHANCE_DETOUR
            : TRAVEL_EVENT_CHANCE_DIRECT;
    const eventChance = getTravelEventChance(baseEventChance, hazardLevel);
    if (Math.random() < eventChance) {
        const event = pickTravelEvent(hazardLevel);
        set({ pendingTravelEvent: { type: event } });
        get().addLog( i18nStore.t("game_logs.processTravel_28"),
            "warning",
        );
        get().saveGame();
        return;
    }

    const nextTurnsLeft = traveling.turnsLeft - 1;

    set((s) => ({
        traveling: s.traveling
            ? { ...s.traveling, turnsLeft: nextTurnsLeft }
            : null,
    }));

    // Прибытие в сектор назначения
    if (nextTurnsLeft <= 0) {
        const destinationSector = traveling.destination;
        const currentState = get();

        const patrolContracts = currentState.activeContracts.filter(
            (c) =>
                c.type === "patrol" &&
                c.isRaceQuest &&
                c.targetSectors?.includes(destinationSector.id),
        );

        // Обработка патрульных контрактов
        const patrolResult = handlePatrolContracts(
            patrolContracts,
            destinationSector,
            currentState,
            set,
            get,
        );

        set((s) => ({
            currentSector: { ...destinationSector, visited: true },
            traveling: null,
            galaxy: {
                ...s.galaxy,
                sectors: s.galaxy.sectors.map((sector) =>
                    sector.id === destinationSector.id
                        ? { ...sector, visited: true }
                        : sector,
                ),
            },
            credits: s.credits + patrolResult.totalReward,
            completedContractIds: [
                ...s.completedContractIds,
                ...patrolResult.completedIds,
            ],
            activeContracts: patrolResult.newActiveContracts,
        }));

        // Радиационная мутация при прибытии в сектор с нейтронной звездой
        applyNeutronRadiation(destinationSector, set, get);

        get().addLog( i18nStore.t("game_logs.processTravel_29", { destinationSector_name: destinationSector.name }), "info");
        get().updateShipStats();
        set(() => ({ gameMode: "sector_map" }));

        if (destinationSector.tier === 4) {
            get().checkVictory();
        }
    }
};
