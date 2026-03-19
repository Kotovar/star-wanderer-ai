import { findActiveArtifact, findArtifactByEffect } from "@/game/artifacts";
import { ARTIFACT_TYPES } from "@/game/constants";
import {
    PILOT_EXP_SAME_SECTOR,
    PILOT_EXP_PER_TIER,
} from "@/game/constants/experience";
import { getActiveModule, getActiveModules } from "@/game/modules";
import { playSound } from "@/sounds";
import { calculateFuelCost } from "./calculateFuelCost";
import type { GameState, GameStore, GameMode, Artifact } from "@/game/types";

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
        get().addLog(
            "Кабина отключена! Невозможно управлять кораблем!",
            "error",
        );
        playSound("error");
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
        get().addLog(
            `${reason} не работают! Межсистемные полёты запрещены`,
            "error",
        );
        playSound("error");
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
    state.crew.find((c) => c.profession === "pilot")?.level ?? 1;

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
        get().addLog(
            `Недостаточно топлива! Нужно: ${fuelCost}, есть: ${state.ship.fuel}`,
            "error",
        );
        playSound("error");
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

    if (!travelInstant) {
        get().nextTurn();
    }

    set((s) => ({ ...s, gameMode: "sector_map" as GameMode }));

    if (sector.tier === 4) {
        get().triggerVictory();
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
): void => {
    if (!sector) return;

    if (pilot) {
        get().gainExp(pilot, distance * PILOT_EXP_PER_TIER);
    }

    markSectorVisited(sector, set);

    set((s) => ({
        traveling: travelInstant
            ? null
            : {
                  destination: sector,
                  turnsLeft: distance,
                  turnsTotal: distance,
              },
        gameMode: "galaxy_map" as GameMode,
        galaxy: {
            ...s.galaxy,
            sectors: s.galaxy.sectors.map((sec) =>
                sec.id === sector.id ? { ...sec, visited: true } : sec,
            ),
        },
    }));

    if (travelInstant) {
        set(() => ({
            currentSector: { ...sector, visited: true },
            gameMode: "sector_map" as GameMode,
        }));
        get().addLog(`⚡ Мгновенный перелёт в ${sector.name}!`, "info");
        if (sector.tier === 4) {
            get().triggerVictory();
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
export const selectSector = (
    set: (fn: (state: GameState) => Partial<GameState>) => void,
    get: () => GameStore,
    sectorId: number,
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

    // Проверка доступа к тиру
    const accessError = checkTierAccess(
        state,
        sector,
        engineLevel,
        captainLevel,
    );
    if (accessError) {
        get().addLog(accessError, "error");
        playSound("error");
        return;
    }

    // Поиск пилота
    const pilot = state.crew.find((c) => c.profession === "pilot");
    const cockpit = getActiveModule(state.ship.modules, "cockpit");
    const pilotInCockpit = pilot && cockpit && pilot.moduleId === cockpit.id;

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
    const { fuelCost, travelInstant } = calculateFuelCost(
        state,
        sector.id,
        !!fuelFree,
        !!voidEngine,
        !!warpCoil,
        !!pilotInCockpit,
    );

    // Логирование бонусов артефактов
    if (warpCoil) {
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

    // Обработка навигационной ошибки
    handleNavigationError(state, distance, !!pilotInCockpit, set, get);

    // Воспроизведение звука
    playSound("travel");

    // Обработка перелёта
    if (distance === 0) {
        if (pilot) {
            get().gainExp(pilot, PILOT_EXP_SAME_SECTOR);
        }
        handleTravelCompletion(sector, travelInstant, set, get);
    } else {
        handleTravelStart(sector, distance, travelInstant, pilot, set, get);
    }
};
