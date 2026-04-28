import type { GameState, GameStore, SetState, TravelEventType } from "@/game/types";
import { CONTRACT_REWARDS, MUTATION_CHANCES } from "@/game/constants";
import { giveCrewExperience, giveRandomMutation } from "@/game/crew";
import { getActiveModule } from "@/game/modules";

/** Вероятность случайного события в пути */
const TRAVEL_EVENT_CHANCE = 0.3;

/** Список случайных событий в пути */
const TRAVEL_EVENTS: TravelEventType[] = [
    "anomaly",
    "asteroids",
    "stress",
    "signal",
    "emp",
];

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

/** Расход топлива для осторожного манёвра через астероидное поле */
const ASTEROID_CAUTIOUS_FUEL_COST = 5;

/** Расход топлива для осторожного обхода аномального фронта */
const ANOMALY_CAUTIOUS_FUEL_COST = 5;

/** Урон от аномалии при осторожном обходе */
const ANOMALY_CAUTIOUS_DAMAGE = 5;

/** Бонусная награда за анализ слабого сигнала сканером */
const SCANNER_SIGNAL_BONUS_REWARD = 25;

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

const hasPilotInCockpit = (state: GameStore): boolean => {
    const pilot = state.crew.find((c) => c.profession === "pilot");
    const cockpit = getActiveModule(state.ship.modules, "cockpit");
    return !!pilot && !!cockpit && pilot.moduleId === cockpit.id;
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
    event: TravelEventType,
    setState: SetState,
    getState: () => GameStore,
): void => {
    switch (event) {
        case "asteroids": {
            const damage = handleAsteroidDamage(setState, getState);
            getState().addLog(
                `☄️ Корабль вошёл в астероидный поток! Повреждение модулей: -${damage}%`,
                "warning",
            );
            break;
        }
        case "anomaly": {
            const damagedCount = handleAnomaly(setState, getState);
            getState().addLog(
                `🌀 Аномальный фронт! Повреждено модулей: ${damagedCount} (-${ANOMALY_DAMAGE}% каждое)`,
                "warning",
            );
            break;
        }
        case "stress": {
            const loss = handleStress(setState);
            getState().addLog(
                `😰 Стресс от долгого перелёта! Настроение экипажа: -${loss}`,
                "warning",
            );
            break;
        }
        case "signal": {
            const reward = handleSignal(setState);
            getState().addLog(
                `📶 Во время перелёта был получен сигнал! Найдены ресурсы: +${reward}₢`,
                "info",
            );
            break;
        }
        case "emp": {
            const shieldsLost = handleEMP(setState, getState);
            if (shieldsLost > 0) {
                getState().addLog(
                    `⚡ Электромагнитный импульс! Щиты разряжены: -${shieldsLost}`,
                    "warning",
                );
            } else {
                getState().addLog(
                    `⚡ Электромагнитный импульс прошёл без последствий`,
                    "info",
                );
            }
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
                getState().addLog(
                    "☄️ Пилот в кабине провёл корабль через астероидный поток без повреждений",
                    "info",
                );
                return true;
            }

            if (getState().ship.fuel < ASTEROID_CAUTIOUS_FUEL_COST) {
                getState().addLog("Недостаточно топлива для обходного манёвра", "error");
                return false;
            }
            setState((s) => ({
                ship: {
                    ...s.ship,
                    fuel: Math.max(0, s.ship.fuel - ASTEROID_CAUTIOUS_FUEL_COST),
                },
            }));
            getState().addLog(
                `☄️ Обходной манёвр: астероидный поток пройден без повреждений, топливо -${ASTEROID_CAUTIOUS_FUEL_COST}`,
                "info",
            );
            return true;
        }
        case "anomaly": {
            if (getState().ship.fuel < ANOMALY_CAUTIOUS_FUEL_COST) {
                getState().addLog("Недостаточно топлива для обхода аномалии", "error");
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
            getState().addLog(
                `🌀 Осторожный обход аномалии: повреждено модулей ${damagedCount} (-${ANOMALY_CAUTIOUS_DAMAGE}% каждое), топливо -${ANOMALY_CAUTIOUS_FUEL_COST}`,
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
            getState().addLog(
                "😌 Экипаж получил дополнительную смену отдыха. Перелёт дольше на 1 ход, мораль не потеряна.",
                "info",
            );
            return true;
        }
        case "signal": {
            if (getState().getEffectiveScanRange() >= 3) {
                setState((s) => ({
                    credits: s.credits + SCANNER_SIGNAL_BONUS_REWARD,
                }));
                getState().addLog(
                    `📶 Сканер расшифровал слабый сигнал без схода с курса: +${SCANNER_SIGNAL_BONUS_REWARD}₢`,
                    "info",
                );
                return true;
            }

            getState().addLog("📶 Сигнал проигнорирован, курс сохранён", "info");
            return true;
        }
        case "emp": {
            if (getState().ship.shields > 0) {
                getState().addLog(
                    "⚡ Щиты приняли электромагнитный импульс без потерь",
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
                    ? `⚡ Перенастройка контуров: потеряна половина щитов (-${shieldsLost})`
                    : "⚡ Перенастройка контуров: импульс прошёл без последствий",
                shieldsLost > 0 ? "warning" : "info",
            );
            return true;
        }
    }
};

export const resolveTravelEvent = (
    set: SetState,
    get: () => GameStore,
    choice: "risk" | "cautious",
): void => {
    const event = get().pendingTravelEvent;
    if (!event) return;

    const resolved =
        choice === "risk"
            ? (handleRandomEvent(event.type, set, get), true)
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
        const targetSectors = c.targetSectors || [];
        const visitedSectors = [
            ...new Set([...(c.visitedSectors || []), destinationSector.id]),
        ];
        // Count only sectors that are actually in the target list
        const visitedTargetCount = visitedSectors.filter((id) =>
            targetSectors.includes(id),
        ).length;

        if (visitedTargetCount >= targetSectors.length) {
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
            getState().addLog(
                `Биообразцы: ${visitedTargetCount}/${targetSectors.length} секторов`,
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
    if (get().pendingTravelEvent) return;

    // Случайные события проверяются до уменьшения turnsLeft, чтобы они могли
    // появляться даже на перелётах длиной в 1 ход.
    if (Math.random() < TRAVEL_EVENT_CHANCE) {
        const event = randomElement(TRAVEL_EVENTS);
        set({ pendingTravelEvent: { type: event } });
        get().addLog(
            "Обнаружено событие в пути. Требуется решение капитана.",
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

        // Радиационная мутация при прибытии в сектор с нейтронной звездой
        if (destinationSector.star.type === "neutron_star") {
            const isHighTier = destinationSector.tier >= 3;
            const chance = isHighTier
                ? MUTATION_CHANCES.NEUTRON_STAR_HIGH_TIER
                : MUTATION_CHANCES.NEUTRON_STAR;
            get().crew.forEach((crewMember) => {
                if (Math.random() < chance) {
                    const mutationName = giveRandomMutation(crewMember, set);
                    if (mutationName) {
                        get().addLog(
                            `☢️ ${crewMember.name} получил мутацию от радиации нейтронной звезды: ${mutationName}!`,
                            "error",
                        );
                    }
                }
            });
        }

        get().addLog(`Прибытие в ${destinationSector.name}`, "info");
        get().updateShipStats();
        set(() => ({ gameMode: "sector_map" }));

        if (destinationSector.tier === 4) {
            get().triggerVictory();
        }
    }
};
