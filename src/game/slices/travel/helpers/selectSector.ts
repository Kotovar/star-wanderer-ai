import { findActiveArtifact, findArtifactByEffect } from "@/game/artifacts";
import { ARTIFACT_TYPES } from "@/game/constants";
import {
    PILOT_EXP_SAME_SECTOR,
    PILOT_EXP_PER_TIER,
} from "@/game/constants/experience";
import { getActiveModule, getActiveModules } from "@/game/modules";
import { getBestByProfession, getPilotInCockpit } from "@/game/crew";
import { playSound } from "@/sounds";
import { calculateFuelCost } from "./calculateFuelCost";
import { applyNeutronRadiation, handlePatrolContracts } from "./processTravel";
import type { GameState, GameStore, GameMode, Artifact, SetState } from "@/game/types";

// ============================================================================
// Константы
// ============================================================================

/** Минимальный уровень двигателя для доступа к тиру */
const TIER_ENGINE_REQUIREMENTS: Record<number, number> = {
    2: 2,
    3: 3,
    4: 4,
};

/** Минимальный уровень капитана для доступа к тиру */
const TIER_CAPTAIN_REQUIREMENTS: Record<number, number> = {
    2: 2,
    3: 3,
    4: 4,
};

/** Вероятность повреждения модуля за тир расстояния */
const MODULE_DAMAGE_CHANCE_PER_TIER = 0.3;

/** Минимальное здоровье модуля после повреждения */
const MIN_MODULE_HEALTH = 10;

/** Базовый урон модулю при навигационной ошибке */
const BASE_MODULE_DAMAGE = 10;

/** Дополнительный случайный урон модулю */
const RANDOM_MODULE_DAMAGE = 15;

/** Значение урона здоровью экипажа от проклятого артефакта по умолчанию */
const DEFAULT_CURSED_ARTIFACT_DAMAGE = 5;

// ============================================================================
// Вспомогательные функции
// ============================================================================

const reportTravelBlocked = (message: string, get: () => GameStore): void => {
    // Попап показывает сам addLog для типа "error"
    get().addLog(message, "error");
    playSound("error");
};

/**
 * Проверяет наличие и доступность кабины
 * @param state - Текущее состояние игры
 * @param get - Функция получения состояния
 * @returns true если кабина доступна
 */
const checkCockpitAvailable = (
    state: GameState,
    get: () => GameStore,
): boolean => {
    const cockpit = getActiveModule(state.ship.modules, "cockpit");

    if (!cockpit) {
        reportTravelBlocked(
            "Кабина отключена! Невозможно управлять кораблем!",
            get,
        );
        return false;
    }
    return true;
};

/**
 * Проверяет работоспособность двигателей и топливных баков
 * @param get - Функция получения состояния
 * @returns true если системы работают
 */
const checkPropulsionSystems = (get: () => GameStore): boolean => {
    const enginesWorking = get().areEnginesFunctional();
    const tanksWorking = get().areFuelTanksFunctional();

    if (!enginesWorking || !tanksWorking) {
        const reason = !enginesWorking ? "Двигатели" : "Топливные баки";
        reportTravelBlocked(
            `${reason} не работают! Межсистемные полёты запрещены`,
            get,
        );
        return false;
    }
    return true;
};

/**
 * Получает уровень двигателя экипажа
 * @param state - Текущее состояние игры
 * @returns Уровень двигателя
 */
const getEngineLevel = (state: GameState): number => {
    const engines = getActiveModules(state.ship.modules, "engine");
    return engines.length > 0
        ? Math.max(...engines.map((e: { level?: number }) => e.level ?? 1))
        : 1;
};

/**
 * Получает уровень капитана
 * @param state - Текущее состояние игры
 * @returns Уровень капитана или 1
 */
const getCaptainLevel = (state: GameState) =>
    getBestByProfession(state.crew, "pilot")?.level ?? 1;

/**
 * Проверяет доступ к тиру сектора
 * @param state - Текущее состояние игры
 * @param sector - Целевой сектор
 * @param engineLevel - Уровень двигателя
 * @param captainLevel - Уровень капитана
 * @returns null если доступ разрешён, иначе сообщение об ошибке
 */
const checkTierAccess = (
    state: GameState,
    sector: GameState["currentSector"],
    engineLevel: number,
    captainLevel: number,
): string | null => {
    if (!sector) return null;

    const requiredEngine = TIER_ENGINE_REQUIREMENTS[sector.tier] ?? 1;
    const requiredCaptain = TIER_CAPTAIN_REQUIREMENTS[sector.tier] ?? 1;

    if (sector.tier >= 2) {
        if (engineLevel < requiredEngine || captainLevel < requiredCaptain) {
            return `Доступ к Тир ${sector.tier} требует: Двигатель Ур.${requiredEngine} + Капитан Ур.${requiredCaptain}`;
        }
    }

    // Проверка для Тир 4 - победа
    if (sector.tier === 4) {
        const engines = getActiveModules(state.ship.modules, "engine");
        const hasTier4Engine = engines.some(
            (e: { level?: number }) => (e.level ?? 1) >= 4,
        );
        if (!hasTier4Engine) {
            return `Доступ к Тир 4 требует: Двигатель Ур.4 + Капитан Ур.4`;
        }
    }

    return null;
};

/**
 * Применяет бонусы артефакта void_engine
 * @param voidEngine - Артефакт void_engine
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 * @returns Имя артефакта
 */
const applyVoidEngineBonus = (
    voidEngine: Artifact,
    set: (fn: (state: GameState) => Partial<GameState>) => void,
    get: () => GameStore,
): string => {
    const artifactName = voidEngine.cursed
        ? "Варп Бездны"
        : "Вакуумный двигатель";

    get().addLog(
        `⚡ ${artifactName}! Бесплатный межсекторный перелёт!`,
        "info",
    );

    // Применяем урон экипажу от проклятого артефакта
    if (
        voidEngine.cursed &&
        voidEngine.negativeEffect?.type === "health_drain"
    ) {
        const negativeValue =
            voidEngine.negativeEffect?.value ?? DEFAULT_CURSED_ARTIFACT_DAMAGE;
        set((s) => ({
            crew: s.crew.map((c) => ({
                ...c,
                health: Math.max(1, c.health - negativeValue),
            })),
        }));
        get().addLog(
            `⚠️ ${artifactName}: Экипаж пострадал на -${negativeValue} здоровья`,
            "warning",
        );
    }

    return artifactName;
};

/**
 * Проверяет наличие топлива
 * @param state - Текущее состояние игры
 * @param fuelCost - Требуемое количество топлива
 * @param get - Функция получения состояния
 * @returns true если топлива достаточно
 */
const checkFuelAvailable = (
    state: GameState,
    fuelCost: number,
    get: () => GameStore,
) => {
    if (state.ship.fuel < fuelCost) {
        reportTravelBlocked(
            `Недостаточно топлива! Нужно: ${fuelCost}, есть: ${state.ship.fuel}`,
            get,
        );
        return false;
    }
    return true;
};

/**
 * Расходует топливо
 * @param fuelCost - Количество топлива
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
const consumeFuel = (
    fuelCost: number,
    set: (fn: (state: GameState) => Partial<GameState>) => void,
    get: () => GameStore,
): void => {
    set((s) => ({
        ship: {
            ...s.ship,
            fuel: Math.max(0, (s.ship.fuel || 0) - fuelCost),
        },
    }));

    const logMessage =
        fuelCost > 0
            ? `Расход топлива: -${fuelCost}`
            : `Расход топлива: Бесплатно`;
    get().addLog(logMessage, "info");
};

/**
 * Обрабатывает повреждение модуля при навигационной ошибке
 * @param state - Текущее состояние игры
 * @param distance - Расстояние между тирами
 * @param pilotInCockpit - Пилот в кабине
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
const handleNavigationError = (
    state: GameState,
    distance: number,
    pilotInCockpit: boolean,
    set: (fn: (state: GameState) => Partial<GameState>) => void,
    get: () => GameStore,
): void => {
    if (pilotInCockpit || distance === 0) return;

    const damageChance = MODULE_DAMAGE_CHANCE_PER_TIER * distance;
    if (Math.random() >= damageChance) return;

    const activeModules = state.ship.modules.filter((m) => m.health > 10);
    if (activeModules.length === 0) return;

    const damagedModule =
        activeModules[Math.floor(Math.random() * activeModules.length)];
    const damage =
        BASE_MODULE_DAMAGE + Math.floor(Math.random() * RANDOM_MODULE_DAMAGE);

    set((s) => ({
        ship: {
            ...s.ship,
            modules: s.ship.modules.map((m) =>
                m.id === damagedModule.id
                    ? {
                          ...m,
                          health: Math.max(
                              MIN_MODULE_HEALTH,
                              m.health - damage,
                          ),
                      }
                    : m,
            ),
        },
    }));

    get().addLog(
        `⚠ Навигационная ошибка! "${damagedModule.name}" повреждён: -${damage}%`,
        "error",
    );
};

/**
 * Обновляет данные о посещении сектора
 * @param sector - Сектор
 * @param set - Функция обновления состояния
 */
const markSectorVisited = (
    sector: GameState["currentSector"],
    set: (fn: (state: GameState) => Partial<GameState>) => void,
): void => {
    if (!sector) return;

    set((s) => ({
        currentSector: { ...sector, visited: true },
        galaxy: {
            ...s.galaxy,
            sectors: s.galaxy.sectors.map((sec) =>
                sec.id === sector.id ? { ...sec, visited: true } : sec,
            ),
        },
    }));
};

/**
 * Обрабатывает завершение перелёта
 * @param sector - Целевой сектор
 * @param distance - Расстояние
 * @param travelInstant - Мгновенный перелёт
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
const handleTravelCompletion = (
    sector: GameState["currentSector"],
    travelInstant: boolean,
    set: (fn: (state: GameState) => Partial<GameState>) => void,
    get: () => GameStore,
): void => {
    if (!sector) return;

    markSectorVisited(sector, set);
    get().addLog(`Перелёт в ${sector.name}`, "info");

    // Радиация нейтронной звезды действует и при мгновенном прибытии
    applyNeutronRadiation(sector, set as SetState, get);

    // Same-tier travel (distance=0) never goes through processTravel,
    // so patrol contracts must be checked here for ALL same-tier arrivals.
    const patrolState = get();
    const patrolContracts = patrolState.activeContracts.filter(
        (c) =>
            c.type === "patrol" &&
            c.isRaceQuest &&
            c.targetSectors?.includes(sector.id),
    );
    if (patrolContracts.length > 0) {
        const patrolResult = handlePatrolContracts(
            patrolContracts,
            sector,
            patrolState,
            set as Parameters<typeof handlePatrolContracts>[3],
            get,
        );
        set((s) => ({
            credits: s.credits + patrolResult.totalReward,
            completedContractIds: [
                ...s.completedContractIds,
                ...patrolResult.completedIds,
            ],
            activeContracts: patrolResult.newActiveContracts,
        }));
    }

    if (!travelInstant) {
        get().nextTurn();
    }

    set((s) => ({ ...s, gameMode: "sector_map" as GameMode }));

    if (sector.tier === 4) {
        get().checkVictory();
    }
};

/**
 * Обрабатывает начало путешествия между секторами
 * @param sector - Целевой сектор
 * @param distance - Расстояние
 * @param travelInstant - Мгновенный перелёт
 * @param pilot - Пилот
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
const handleTravelStart = (
    sector: GameState["currentSector"],
    distance: number,
    travelInstant: boolean,
    pilot: GameState["crew"][number] | undefined,
    set: (fn: (state: GameState) => Partial<GameState>) => void,
    get: () => GameStore,
    route: "direct" | "detour" = "direct",
): void => {
    if (!sector) return;

    if (pilot) {
        get().gainExp(pilot, distance * PILOT_EXP_PER_TIER);
    }

    // Редкая встреча со странствующим торговцем: один ролл за перелёт
    const traderTurn =
        !travelInstant && Math.random() < TRADER_ENCOUNTER_CHANCE
            ? 1 + Math.floor(Math.random() * distance)
            : undefined;

    set(() => ({
        traveling: travelInstant
            ? null
            : {
                  destination: sector,
                  turnsLeft: distance,
                  turnsTotal: distance,
                  route,
                  traderTurn,
              },
        gameMode: "galaxy_map" as GameMode,
    }));

    if (travelInstant) {
        markSectorVisited(sector, set);
        set(() => ({ gameMode: "sector_map" as GameMode }));
        get().addLog(`⚡ Мгновенный перелёт в ${sector.name}!`, "info");

        // Радиация нейтронной звезды действует и при варп-прыжке
        applyNeutronRadiation(sector, set as SetState, get);

        const warpPatrolState = get();
        const warpPatrolContracts = warpPatrolState.activeContracts.filter(
            (c) =>
                c.type === "patrol" &&
                c.isRaceQuest &&
                c.targetSectors?.includes(sector.id),
        );
        if (warpPatrolContracts.length > 0) {
            const patrolResult = handlePatrolContracts(
                warpPatrolContracts,
                sector,
                warpPatrolState,
                set as SetState,
                get,
            );
            set((s) => ({
                credits: s.credits + patrolResult.totalReward,
                completedContractIds: [
                    ...s.completedContractIds,
                    ...patrolResult.completedIds,
                ],
                activeContracts: patrolResult.newActiveContracts,
            }));
        }

        if (sector.tier === 4) {
            get().checkVictory();
        }
    } else {
        get().addLog(
            `Начато путешествие в ${sector.name} (${distance} ходов)`,
            "info",
        );
    }
};

// ============================================================================
// Основная функция
// ============================================================================

/**
 * Обработка выбора сектора для путешествия
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 * @param sectorId - ID выбранного сектора
 */
/** Дополнительное топливо за обходной маршрут */
export const DETOUR_FUEL_COST = 5;

/** Дополнительные ходы за обходной маршрут */
export const DETOUR_EXTRA_TURNS = 1;

/** Шанс встретить странствующего торговца (один ролл за перелёт) */
const TRADER_ENCOUNTER_CHANCE = 0.1;

export const selectSector = (
    set: (fn: (state: GameState) => Partial<GameState>) => void,
    get: () => GameStore,
    sectorId: number,
    route: "direct" | "detour" = "direct",
): void => {
    const state = get();

    // Проверка доступности кабины
    if (!checkCockpitAvailable(state, get)) return;

    // Нельзя выбрать сектор во время путешествия
    if (state.traveling) return;

    // Поиск сектора
    const sector = state.galaxy.sectors.find((s) => s.id === sectorId);
    if (!sector) return;

    // Если уже в этом секторе - открываем карту сектора
    if (sectorId === state.currentSector?.id) {
        set((s) => ({ ...s, gameMode: "sector_map" as GameMode }));
        return;
    }

    // Проверка систем корабля
    if (!checkPropulsionSystems(get)) return;

    // Получение уровней
    const engineLevel = getEngineLevel(state);
    const captainLevel = getCaptainLevel(state);

    // Варп-двигатель обходит все ограничения доступа к тирам
    const hasWarpDrive = state.research.researchedTechs.includes("warp_drive");

    if (!hasWarpDrive) {
        const accessError = checkTierAccess(
            state,
            sector,
            engineLevel,
            captainLevel,
        );
        if (accessError) {
            reportTravelBlocked(accessError, get);
            return;
        }
    }

    // Пилот за штурвалом: лучший пилот в любой активной кабине
    const pilot = getPilotInCockpit(state.crew, state.ship.modules);
    const pilotInCockpit = !!pilot;

    // Поиск артефактов отдельно
    const fuelFree = findArtifactByEffect(state, ["fuel_free"]);
    const voidEngine = findArtifactByEffect(state, ["void_engine"]);

    const warpCoil = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.WARP_COIL,
    );

    // Применение бонусов void_engine (проклятый варп)
    if (voidEngine) {
        applyVoidEngineBonus(voidEngine, set, get);
    }

    // Расчёт стоимости топлива
    const fuelResult = calculateFuelCost(
        state,
        sector.id,
        !!fuelFree,
        !!voidEngine,
        !!warpCoil,
        !!pilotInCockpit,
    );
    // Варп-двигатель делает перелёт мгновенным
    const travelInstant = fuelResult.travelInstant || hasWarpDrive;

    // Обходной маршрут: дороже по топливу, но спокойнее (см. processTravel)
    const isDetour = route === "detour" && !travelInstant;
    const fuelCost = fuelResult.fuelCost + (isDetour ? DETOUR_FUEL_COST : 0);

    // Логирование бонусов артефактов
    if (hasWarpDrive) {
        get().addLog(`🚀 Варп-двигатель! Мгновенный прыжок в любой сектор!`, "info");
    } else if (warpCoil) {
        get().addLog(
            `⚡ Варп-Катушка! Мгновенный межсекторный перелёт!`,
            "info",
        );
    } else if (!pilotInCockpit) {
        get().addLog(`⚠ Пилот не в кабине! Расход топлива +50%`, "warning");
    }

    // Проверка наличия топлива
    if (!checkFuelAvailable(state, fuelCost, get)) return;

    // Расход топлива
    consumeFuel(fuelCost, set, get);

    // Расчёт расстояния
    const distance = Math.abs(sector.tier - (state.currentSector?.tier ?? 1));

    // Ионный двигатель сокращает время межтирового перелёта на 1 ход (минимум 0)
    const hasIonDrive = state.research.researchedTechs.includes("ion_drive");
    let travelTurns = hasIonDrive && distance > 0 ? Math.max(0, distance - 1) : distance;

    // Обходной маршрут длиннее
    if (isDetour && travelTurns > 0) {
        travelTurns += DETOUR_EXTRA_TURNS;
        get().addLog(
            `🛡️ Обходной маршрут: +${DETOUR_EXTRA_TURNS} ход, топливо +${DETOUR_FUEL_COST}, риск событий снижен`,
            "info",
        );
    }

    // Обработка навигационной ошибки
    handleNavigationError(state, distance, !!pilotInCockpit, set, get);

    // Воспроизведение звука
    playSound("travel");

    // Обработка перелёта
    if (travelTurns === 0) {
        if (pilot) {
            get().gainExp(pilot, distance === 0 ? PILOT_EXP_SAME_SECTOR : distance * PILOT_EXP_PER_TIER);
        }
        if (hasIonDrive && distance > 0) {
            get().addLog(`🚀 Ионный двигатель: перелёт на 1 ход быстрее!`, "info");
        }
        handleTravelCompletion(sector, travelInstant, set, get);
    } else {
        if (hasIonDrive && distance > travelTurns) {
            get().addLog(`🚀 Ионный двигатель: перелёт на 1 ход быстрее!`, "info");
        }
        handleTravelStart(
            sector,
            travelTurns,
            travelInstant,
            pilot,
            set,
            get,
            isDetour ? "detour" : "direct",
        );
    }
};
