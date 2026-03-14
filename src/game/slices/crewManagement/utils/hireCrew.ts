import type { GameStore, CrewMember, RaceId, SetState } from "@/game/types";
import { RACES } from "@/game/constants/races";
import { getRandomName } from "@/game/crew/utils";
import { playSound } from "@/sounds";
import {
    BASE_CREW_HEALTH_PER_LEVEL,
    INITIAL_HAPPINESS_PERCENT,
    DEFAULT_MAX_HAPPINESS,
    BASE_CREW_HEALTH,
} from "@/game/constants/crew";

/**
 * Опции для расчёта характеристик экипажа
 */
interface CrewStatsOptions {
    race: RaceId;
    traits: CrewMember["traits"];
    level: number;
}

/**
 * Результат расчёта характеристик
 */
interface CrewStats {
    maxHealth: number;
    maxHappiness: number;
    hasHappiness: boolean;
}

/**
 * Рассчитывает характеристики члена экипажа
 * @param options - Опции расчёта
 * @returns Характеристики
 */
export const calculateCrewStats = (options: CrewStatsOptions): CrewStats => {
    const { race, traits, level } = options;
    const raceData = RACES[race];

    // === ЗДОРОВЬЕ ===

    // Бонус здоровья от расы (фиксированное число: human +5, xenosymbiont +10, krylorian +15)
    const raceHealthBonus = raceData?.crewBonuses?.health || 0;

    // Процентный штраф от специальных способностей расы (voidborn -20%, crystalline -15%)
    let raceHealthPenaltyPercent = 0;
    raceData?.specialTraits?.forEach((trait) => {
        if (trait.effects.healthPenalty) {
            // healthPenalty отрицательный (например, -0.2), берём абсолютное значение
            raceHealthPenaltyPercent += Math.abs(
                Number(trait.effects.healthPenalty),
            );
        }
    });

    // Базовое здоровье: 100 на 1 уровне + 20 за каждый уровень после 1-го
    // Формула: BASE_CREW_HEALTH + BASE_CREW_HEALTH_PER_LEVEL * (level - 1)
    // Уровень 1: 100
    // Уровень 2: 120
    // Уровень 3: 140
    let baseMaxHealth =
        BASE_CREW_HEALTH + BASE_CREW_HEALTH_PER_LEVEL * (level - 1);

    // Применяем процентные штрафы расы к базовому здоровью
    if (raceHealthPenaltyPercent > 0) {
        baseMaxHealth = Math.floor(
            baseMaxHealth * (1 - raceHealthPenaltyPercent),
        );
    }

    // Применяем процентные бонусы/штрафы от трейтов
    traits.forEach((trait) => {
        if (trait.effect.healthPenalty) {
            baseMaxHealth = Math.floor(
                baseMaxHealth * (1 - trait.effect.healthPenalty),
            );
        }
        if (trait.effect.healthBonus) {
            baseMaxHealth = Math.floor(
                baseMaxHealth * (1 + trait.effect.healthBonus),
            );
        }
    });

    // Добавляем фиксированный бонус расы ПОСЛЕ процентных модификаторов
    // Это даёт: (базовое * проценты) + фиксированный бонус
    baseMaxHealth += raceHealthBonus;

    // === СЧАСТЬЕ ===

    // Бонус счастья от расы (human +10, voidborn -10)
    const raceHappinessBonus = raceData?.crewBonuses?.happiness || 0;

    // Бонусы от трейтов
    let traitsHappinessBonus = 0;
    traits.forEach((trait) => {
        if (trait.effect.maxHappinessBonus) {
            traitsHappinessBonus += trait.effect.maxHappinessBonus;
        }
    });

    // Проверяем, есть ли у расы счастье
    const hasHappiness = raceData?.hasHappiness ?? true;

    return {
        maxHealth: baseMaxHealth,
        maxHappiness: hasHappiness
            ? DEFAULT_MAX_HAPPINESS + raceHappinessBonus + traitsHappinessBonus
            : 0,
        hasHappiness,
    };
};

/**
 * Результат проверки возможности найма
 */
interface HireValidation {
    /** Можно ли нанять */
    canHire: boolean;
    /** Сообщение об ошибке */
    error?: string;
}

/**
 * Проверяет возможность найма экипажа
 * @param state - Текущее состояние игры
 * @param price - Цена найма
 * @returns Результат проверки
 */
const validateHireCrew = (state: GameStore, price: number): HireValidation => {
    // Проверка цены
    if (isNaN(price) || price < 0) {
        return { canHire: false, error: "Некорректная цена!" };
    }

    if (state.credits < price) {
        return { canHire: false, error: "Недостаточно кредитов!" };
    }

    // Проверка места
    if (state.crew.length >= state.getCrewCapacity()) {
        return { canHire: false, error: "Нет места!" };
    }

    return { canHire: true };
};

/**
 * Создаёт нового члена экипажа
 * @param crewData - Данные экипажа
 * @param stats - Рассчитанные характеристики
 * @param initialModuleId - ID модуля для начального размещения
 * @returns Новый член экипажа
 */
export const createCrewMember = (
    crewData: Partial<CrewMember> & { price: number },
    stats: CrewStats,
    initialModuleId: number,
): CrewMember => {
    const level = crewData.level || 1;

    return {
        id: Date.now(),
        name:
            crewData.name ||
            getRandomName(
                crewData.profession || "pilot",
                crewData.race || "human",
            ),
        race: crewData.race || "human",
        profession: crewData.profession || "pilot",
        level,
        exp: crewData.exp || 0,
        health: stats.maxHealth,
        maxHealth: stats.maxHealth,
        // Счастье только для рас с настроением
        happiness: stats.hasHappiness
            ? Math.floor((stats.maxHappiness * INITIAL_HAPPINESS_PERCENT) / 100)
            : 0,
        maxHappiness: stats.maxHappiness,
        assignment: null,
        assignmentEffect: null,
        combatAssignment: null,
        combatAssignmentEffect: null,
        traits: crewData.traits || [],
        moduleId: crewData.moduleId || initialModuleId,
        movedThisTurn: false,
        turnsAtZeroHappiness: 0,
        isMerged: false,
        mergedModuleId: null,
        firstaidActive: false,
    };
};

/**
 * Наём члена экипажа
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 * @param crewData - Данные экипажа
 * @param locationId - ID локации (станции или корабля)
 */
export const hireCrew = (
    set: SetState,
    get: () => GameStore,
    crewData: Partial<CrewMember> & { price: number },
    locationId?: string,
): void => {
    const state = get();

    // Проверка возможности найма
    const validation = validateHireCrew(state, crewData.price);
    if (!validation.canHire) {
        if (validation.error) {
            get().addLog(validation.error, "error");
        }
        return;
    }

    // Поиск модуля жизнеобеспечения для начального размещения
    const lifesupportModule = state.ship.modules.find(
        (m) => m.type === "lifesupport",
    );
    const initialModuleId =
        lifesupportModule?.id || state.ship.modules[0]?.id || 1;

    // Расчёт характеристик
    const level = crewData.level || 1;
    const stats = calculateCrewStats({
        race: crewData.race || "human",
        traits: crewData.traits || [],
        level,
    });

    // Создание члена экипажа
    const newCrew = createCrewMember(crewData, stats, initialModuleId);

    // Обновление состояния
    const hiredCrewKey = locationId || "unknown";

    set((s) => ({
        credits: s.credits - crewData.price,
        crew: [...s.crew, newCrew],
        hiredCrewFromShips: locationId
            ? [...s.hiredCrewFromShips, locationId]
            : s.hiredCrewFromShips,
        hiredCrew: {
            ...s.hiredCrew,
            [hiredCrewKey]: [
                ...(s.hiredCrew[hiredCrewKey] || []),
                newCrew.name,
            ],
        },
    }));

    get().addLog(`Нанят: ${newCrew.name} за ${crewData.price}₢`, "info");
    playSound("success");
};
