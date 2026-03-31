import type { GameStore, CrewMember, RaceId, SetState } from "@/game/types";
import { RACES } from "@/game/constants/races";
import { RESEARCH_TREE } from "@/game/constants/research";
import { playSound } from "@/sounds";
import {
    BASE_CREW_HEALTH_PER_LEVEL,
    DEFAULT_MAX_HAPPINESS,
    BASE_CREW_HEALTH,
} from "@/game/constants/crew";
import { buildCrewMember } from "@/game/crew/buildCrewMember";

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
    // Умножаем на level, чтобы совпадать с естественным ростом (бонус добавляется каждый уровень)
    // Формула: (базовое * проценты) + фиксированный_бонус * level
    baseMaxHealth += raceHealthBonus * level;

    // === СЧАСТЬЕ ===

    // Бонус счастья от расы (human +10, voidborn -10)
    const raceHappinessBonus = raceData?.crewBonuses?.happiness || 0;

    // Бонусы от трейтов (процентный множитель, как healthBonus)
    const baseMaxHappiness = DEFAULT_MAX_HAPPINESS + raceHappinessBonus;
    let maxHappiness = baseMaxHappiness;
    traits.forEach((trait) => {
        if (trait.effect.maxHappinessBonus) {
            maxHappiness = Math.floor(
                maxHappiness * (1 + trait.effect.maxHappinessBonus),
            );
        }
    });

    // Проверяем, есть ли у расы счастье
    const hasHappiness = raceData?.hasHappiness ?? true;

    return {
        maxHealth: baseMaxHealth,
        maxHappiness: hasHappiness ? maxHappiness : 0,
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

    return { canHire: true };
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

    const newCrew = buildCrewMember({
        name: crewData.name,
        race: crewData.race,
        profession: crewData.profession,
        level: crewData.level,
        traits: crewData.traits,
        exp: crewData.exp,
        moduleId: initialModuleId,
    });

    // Применяем crew_health бонус от исследований к новому члену экипажа
    const crewHealthBonus = state.research.researchedTechs.reduce(
        (sum, techId) => {
            const tech = RESEARCH_TREE[techId];
            return (
                sum +
                tech.bonuses
                    .filter((b) => b.type === "crew_health")
                    .reduce((s, b) => s + b.value, 0)
            );
        },
        0,
    );
    if (crewHealthBonus > 0) {
        newCrew.maxHealth = Math.floor(
            newCrew.maxHealth * (1 + crewHealthBonus),
        );
    }

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

    // Повышение репутации с расой за найм экипажа (+1~3 в зависимости от уровня)
    if (newCrew.race) {
        const reputationGain = Math.min(3, Math.max(1, newCrew.level || 1)); // +1~3 за уровень
        get().changeReputation(newCrew.race, reputationGain);
        get().addLog(
            `Репутация с ${getRaceName(newCrew.race)}: +${reputationGain} (наём экипажа)`,
            "info",
        );
    }

    get().addLog(`Нанят: ${newCrew.name} за ${crewData.price}₢`, "info");
    playSound("success");
};

/**
 * Получить название расы
 */
function getRaceName(raceId: string): string {
    const names: Record<string, string> = {
        human: "Людьми",
        synthetic: "Синтетиками",
        xenosymbiont: "Ксеноморфами",
        krylorian: "Крилорианцами",
        voidborn: "Порождёнными Пустотой",
        crystalline: "Кристаллоидами",
    };
    return names[raceId] || raceId;
}
