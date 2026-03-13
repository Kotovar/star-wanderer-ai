import type { GameState, GameStore, SetState } from "@/game/types";
import { CONTRACT_REWARDS } from "@/game/constants";
import { giveCrewExperience } from "@/game/crew";

/** Вероятность случайного события в пути */
const TRAVEL_EVENT_CHANCE = 0.3;

/** Список случайных событий в пути */
const TRAVEL_EVENTS = [
    "Аномалия",
    "астероиды",
    "Стресс",
    "сигнал",
    "электромагнитный импульс",
] as const;

/** Минимальное здоровье модуля после повреждения */
const MIN_MODULE_HEALTH = 10;

/** Урон от астероидов (одному модулю) */
const ASTEROID_DAMAGE = 5;

/** Урон от аномалии (всем модулям) */
const ANOMALY_DAMAGE = 10;

/** Потеря настроения от стресса */
const STRESS_HAPPINESS_LOSS = 5;

/** Награда за сигнал (кредиты) */
const SIGNAL_REWARD = 15;

/**
 * Выбирает случайный элемент из массива
 * @param arr - Массив для выбора
 * @returns Случайный элемент
 */
const randomElement = <T>(arr: readonly T[]): T =>
    arr[Math.floor(Math.random() * arr.length)];

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _getState: () => GameStore,
): number => {
    let damagedCount = 0;

    setState((s) => ({
        ship: {
            ...s.ship,
            modules: s.ship.modules.map((m) => {
                const newHealth = Math.max(
                    MIN_MODULE_HEALTH,
                    m.health - ANOMALY_DAMAGE,
                );
                if (newHealth < m.health) {
                    damagedCount++;
                }
                return { ...m, health: newHealth };
            }),
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
        crew: s.crew.map((c) => ({
            ...c,
            happiness: Math.max(0, c.happiness - STRESS_HAPPINESS_LOSS),
        })),
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
    setState: SetState,
    getState: () => GameStore,
): void => {
    const event = randomElement(TRAVEL_EVENTS);

    getState().addLog(
        `Во время перелёта в другой сектор произошло событие`,
        "warning",
    );

    switch (event) {
        case "астероиды": {
            const damage = handleAsteroidDamage(setState, getState);
            getState().addLog(
                `☄️ Корабль пролетел через ${event}! Повреждение модулей: -${damage}%`,
                "warning",
            );
            break;
        }
        case "Аномалия": {
            const damagedCount = handleAnomaly(setState, getState);
            getState().addLog(
                `🌀 ${event}! Повреждено модулей: ${damagedCount} (-${ANOMALY_DAMAGE}% каждое)`,
                "warning",
            );
            break;
        }
        case "Стресс": {
            const loss = handleStress(setState);
            getState().addLog(
                `😰 ${event} от долгого перелёта! Настроение экипажа: -${loss}`,
                "warning",
            );
            break;
        }
        case "сигнал": {
            const reward = handleSignal(setState);
            getState().addLog(
                `📶 Во время перелёта был получен ${event}! Найдены ресурсы: +${reward}₢`,
                "info",
            );
            break;
        }
        case "электромагнитный импульс": {
            const shieldsLost = handleEMP(setState, getState);
            if (shieldsLost > 0) {
                getState().addLog(
                    `⚡Корабль ощутил ${event}! Щиты разряжены: -${shieldsLost}`,
                    "warning",
                );
            } else {
                getState().addLog(
                    `⚡Корабль ощутил ${event}! Он прошёл без последствий`,
                    "warning",
                );
            }
            break;
        }
    }
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
const handlePatrolContracts = (
    contracts: GameState["activeContracts"],
    destinationSector: GameState["currentSector"],
    state: GameState,
    setState: SetState,
    getState: () => GameStore,
) => {
    let newActiveContracts = state.activeContracts;
    let contractCompleted = false;
    let completedContractId = "";
    let reward = 0;

    if (!destinationSector) {
        return {
            newActiveContracts,
            contractCompleted,
            completedContractId,
            reward,
        };
    }

    contracts.forEach((c) => {
        const visitedSectors = [
            ...new Set([...(c.visitedSectors || []), destinationSector.id]),
        ];
        const targetSectors = c.targetSectors || [];

        if (visitedSectors.length >= targetSectors.length) {
            contractCompleted = true;
            completedContractId = c.id;
            reward = c.reward;

            getState().addLog(
                `Сбор биообразцов завершён! +${c.reward}₢`,
                "info",
            );

            const expReward = CONTRACT_REWARDS.patrol.baseExp;
            giveCrewExperience(
                expReward,
                `Экипаж получил опыт: +${expReward} ед.`,
            );

            newActiveContracts = newActiveContracts.filter(
                (ac) => ac.id !== c.id,
            );
        } else {
            newActiveContracts = newActiveContracts.map((ac) =>
                ac.id === c.id ? { ...ac, visitedSectors } : ac,
            );
            getState().addLog(
                `Биообразцы: ${visitedSectors.length}/${targetSectors.length} секторов`,
                "info",
            );
        }
    });

    return {
        newActiveContracts,
        contractCompleted,
        completedContractId,
        reward,
    };
};

/**
 * Обработка путешествий между секторами
 * @param state - Текущее состояние игры
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const processTravel = (
    state: GameState,
    set: SetState,
    get: () => GameStore,
): void => {
    const traveling = get().traveling;
    if (!traveling) return;

    const nextTurnsLeft = traveling.turnsLeft - 1;

    set((s) => ({
        traveling: s.traveling
            ? { ...s.traveling, turnsLeft: nextTurnsLeft }
            : null,
    }));

    // Случайные события в пути
    if (Math.random() < TRAVEL_EVENT_CHANCE) {
        handleRandomEvent(set, get);
    }

    // Прибытие в сектор назначения
    if (nextTurnsLeft <= 0) {
        const destinationSector = traveling.destination;

        const patrolContracts = state.activeContracts.filter(
            (c) =>
                c.type === "patrol" &&
                c.isRaceQuest &&
                c.targetSectors?.includes(destinationSector.id),
        );

        // Обработка патрульных контрактов
        const patrolResult = handlePatrolContracts(
            patrolContracts,
            destinationSector,
            state,
            set,
            get,
        );

        set((s) => ({
            currentSector: destinationSector,
            traveling: null,
            credits: patrolResult.contractCompleted
                ? s.credits + patrolResult.reward
                : s.credits,
            completedContractIds: patrolResult.contractCompleted
                ? [...s.completedContractIds, patrolResult.completedContractId]
                : s.completedContractIds,
            activeContracts: patrolResult.newActiveContracts,
        }));

        get().addLog(`Прибытие в ${destinationSector.name}`, "info");
        get().updateShipStats();
        set(() => ({ gameMode: "sector_map" }));
    }
};
