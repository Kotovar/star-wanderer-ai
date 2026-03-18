import { getActiveModules, isModuleActive } from "@/game/modules";
import {
    BASE_CREW_HEALTH,
    RESEARCH_TREE,
    SCIENTIST_BASE_BONUS,
    RESEARCH_ASSIGNMENT_MULTIPLIER,
} from "@/game/constants";
import { RACES } from "@/game/constants/races";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";
import { typedKeys } from "@/lib/utils";
import {
    DEFAULT_MODULE_HEALTH,
    DEFAULT_REACTOR_POWER,
    DEFAULT_SHIELD_DEFENSE,
    DEFAULT_CARGO_CAPACITY,
} from "./constants";
import type {
    CrewMember,
    Module,
    GameStore,
    TradeGood,
    TechnologyId,
    Technology,
    ResearchResourceType,
} from "@/game/types";
import { getCrewByProfession } from "@/game/crew";

/**
 * Интерфейс с данными о производительности исследования
 */
export interface ResearchOutputData {
    /**
     * Общая производительность исследования (очков за ход)
     */
    totalOutput: number;

    /**
     * Производительность от лабораторий
     */
    labOutput: number;

    /**
     * Бонус от учёных
     */
    scientistBonus: number;

    /**
     * Бонус от технологий скорости исследования
     */
    techSpeedBonus: number;

    /**
     * Бонус от сращивания ксеноморфа
     */
    mergeBonus: number;
}

/**
 * Вычисляет общую производительность исследования
 *
 * @param state - Текущее состояние игры
 * @returns Данные о производительности исследования
 */
export const calculateResearchOutput = (
    state: GameStore,
): ResearchOutputData => {
    // Производительность от лабораторий
    const labs = getActiveModules(state.ship.modules, "lab");
    const labOutput = labs.reduce((sum, m) => sum + (m.researchOutput ?? 0), 0);

    // Бонус от учёных
    let scientistBonus = 0;
    const scientists = getCrewByProfession(state.crew, "scientist");

    scientists.forEach((scientist) => {
        // Базовый бонус учёного
        let scientistContribution = SCIENTIST_BASE_BONUS;

        // Множитель за назначение на исследование
        if (scientist.assignment === "research") {
            scientistContribution *= RESEARCH_ASSIGNMENT_MULTIPLIER;
        }

        // Бонус за уровень
        scientistContribution += scientist.level ?? 1;

        // Расовый бонус к науке (synthetic +25%, crystalline +20%)
        const raceScienceBonus =
            RACES[scientist.race]?.crewBonuses?.science ?? 0;
        if (raceScienceBonus > 0) {
            scientistContribution = Math.floor(
                scientistContribution * (1 + raceScienceBonus),
            );
        }

        scientistBonus += scientistContribution;
    });

    // Общая производительность до множителей
    let totalOutput = labOutput + scientistBonus;

    // Бонус от технологий скорости исследования (суммируем реальные значения)
    let techSpeedBonus = 0;
    const researchSpeedMultiplier = state.research.researchedTechs.reduce(
        (sum, techId) => {
            const tech = RESEARCH_TREE[techId];
            return (
                sum +
                tech.bonuses
                    .filter(
                        (b: { type: string }) => b.type === "research_speed",
                    )
                    .reduce((s: number, b: { value: number }) => s + b.value, 0)
            );
        },
        0,
    );

    if (researchSpeedMultiplier > 0) {
        const bonus = Math.floor(totalOutput * researchSpeedMultiplier);
        totalOutput += bonus;
        techSpeedBonus = bonus;
    }

    // Бонус от сращивания ксеноморфа с лабораторией
    let mergeBonusValue = 0;
    const mergeBonus = getMergeEffectsBonus(state.crew, state.ship.modules);

    if (mergeBonus.researchSpeed) {
        const bonus = Math.floor(
            totalOutput * (mergeBonus.researchSpeed / 100),
        );
        totalOutput += bonus;
        mergeBonusValue = bonus;
    }

    return {
        totalOutput,
        labOutput,
        scientistBonus,
        techSpeedBonus,
        mergeBonus: mergeBonusValue,
    };
};

/**
 * Вычисляет количество ходов, оставшихся до завершения исследования
 *
 * @param currentProgress - Текущий прогресс (0-100)
 * @param scienceCost - Стоимость технологии в очках науки
 * @param researchOutput - Производительность исследования (очков за ход)
 * @returns Количество ходов
 */
export const calculateTurnsRemaining = (
    currentProgress: number,
    scienceCost: number,
    researchOutput: number,
): number => {
    if (researchOutput <= 0) {
        return 999;
    }

    const progressNeeded = scienceCost - currentProgress;
    return Math.ceil(progressNeeded / researchOutput);
};

/**
 * Проверяет, есть ли у игрока необходимые ресурсы для исследования
 *
 * @param state - Текущее состояние игры
 * @param requiredResources - Необходимые ресурсы
 * @returns true если ресурсов достаточно, иначе false
 */
export const hasRequiredResources = (
    state: GameStore,
    requiredResources: Partial<Record<ResearchResourceType, number>>,
): boolean => {
    for (const resourceType of typedKeys(requiredResources)) {
        const required = requiredResources[resourceType];
        if (required === undefined) continue;

        let available = state.research.resources[resourceType] || 0;

        // Проверка торговых товаров для rare_minerals
        if (resourceType === "rare_minerals") {
            const tradeGood = state.ship.tradeGoods.find(
                (tg) => tg.item === "rare_minerals",
            );
            if (tradeGood) {
                available += tradeGood.quantity;
            }
        }

        if (available < required) {
            return false;
        }
    }

    return true;
};

/**
 * Списывает ресурсы для исследования
 *
 * @param state - Текущее состояние игры
 * @param requiredResources - Необходимые ресурсы
 * @returns Новое состояние ресурсов и торговых товаров
 */
export const deductResearchResources = (
    state: GameStore,
    requiredResources: Partial<Record<string, number>>,
): {
    newResources: Partial<Record<string, number>>;
    newTradeGoods: TradeGood[];
} => {
    const newResources = { ...state.research.resources };
    const newTradeGoods: TradeGood[] = [...state.ship.tradeGoods];

    for (const [resourceType, required] of Object.entries(requiredResources)) {
        if (required === undefined) continue;

        let remaining = required;

        // Сначала списываем из ресурсов исследования
        const currentResearchResource =
            newResources[resourceType as keyof typeof newResources] || 0;

        if (currentResearchResource > 0) {
            const deductFromResearch = Math.min(
                currentResearchResource,
                remaining,
            );
            newResources[resourceType as keyof typeof newResources] =
                currentResearchResource - deductFromResearch;
            remaining -= deductFromResearch;
        }

        // Затем списываем из торговых товаров (только для rare_minerals)
        if (remaining > 0 && resourceType === "rare_minerals") {
            const tradeGoodIdx = newTradeGoods.findIndex(
                (tg) => tg.item === "rare_minerals",
            );

            if (tradeGoodIdx >= 0) {
                const tradeGood = newTradeGoods[tradeGoodIdx];
                const deductFromTrade = Math.min(tradeGood.quantity, remaining);

                newTradeGoods[tradeGoodIdx] = {
                    ...tradeGood,
                    quantity: tradeGood.quantity - deductFromTrade,
                };

                // Удаляем, если количество равно 0
                if (newTradeGoods[tradeGoodIdx].quantity <= 0) {
                    newTradeGoods.splice(tradeGoodIdx, 1);
                }

                remaining -= deductFromTrade;
            }
        }
    }

    return { newResources, newTradeGoods };
};

/**
 * Проверяет наличие лаборатории и учёного
 *
 * @param state - Текущее состояние игры
 * @returns true если есть лаборатория и учёный, иначе false
 */
export const hasLabAndScientist = (state: GameStore): boolean => {
    const hasLab = state.ship.modules.some(
        (m) => isModuleActive(m) && m.type === "lab",
    );

    const hasScientist = state.crew.some((c) => c.profession === "scientist");

    return hasLab && hasScientist;
};

/**
 * Применяет бонус технологии к модулям
 *
 * @param modules - Массив модулей корабля
 * @param bonusType - Тип бонуса
 * @param bonusValue - Значение бонуса
 * @returns Обновлённый массив модулей
 */
export const applyModuleBonus = (
    modules: Module[],
    bonusType: string,
    bonusValue: number,
): Module[] => {
    return modules.map((m) => {
        let newModule = { ...m };

        switch (bonusType) {
            case "module_health": {
                const newMaxHealth = Math.floor(
                    (m.maxHealth || DEFAULT_MODULE_HEALTH) * (1 + bonusValue),
                );
                newModule = {
                    ...newModule,
                    maxHealth: newMaxHealth,
                    health: newMaxHealth,
                };
                break;
            }

            case "module_power": {
                if (m.type === "reactor") {
                    newModule = {
                        ...newModule,
                        power: Math.floor(
                            (m.power || DEFAULT_REACTOR_POWER) *
                                (1 + bonusValue),
                        ),
                    };
                }
                break;
            }

            case "shield_strength": {
                if (m.type === "shield") {
                    newModule = {
                        ...newModule,
                        defense: Math.floor(
                            (m.defense || DEFAULT_SHIELD_DEFENSE) *
                                (1 + bonusValue),
                        ),
                    };
                }
                break;
            }

            case "scan_range": {
                if (m.type === "scanner") {
                    newModule = {
                        ...newModule,
                        scanRange: (m.scanRange || 0) + bonusValue,
                    };
                }
                break;
            }

            case "cargo_capacity": {
                if (m.type === "cargo") {
                    newModule = {
                        ...newModule,
                        capacity: Math.floor(
                            (m.capacity || DEFAULT_CARGO_CAPACITY) *
                                (1 + bonusValue),
                        ),
                    };
                }
                break;
            }
        }

        return newModule;
    });
};

/**
 * Применяет бонус технологии к экипажу
 *
 * @param crew - Массив членов экипажа
 * @param bonusType - Тип бонуса
 * @param bonusValue - Значение бонуса
 * @returns Обновлённый массив экипажа
 */
export const applyCrewBonus = (
    crew: CrewMember[],
    bonusType: string,
    bonusValue: number,
): CrewMember[] => {
    if (bonusType === "crew_health") {
        return crew.map((c) => {
            const newMaxHealth = Math.floor(
                (c.maxHealth || BASE_CREW_HEALTH) * (1 + bonusValue),
            );

            return {
                ...c,
                maxHealth: newMaxHealth,
                health: Math.min(c.health, newMaxHealth),
            };
        });
    }

    return crew;
};

/**
 * Интерфейс с применёнными бонусами технологии
 */
export interface AppliedBonuses {
    powerBonus: boolean;
    shieldBonus: boolean;
    weaponDamageBonus: boolean;
    scanRangeBonus: boolean;
    cargoCapacityBonus: boolean;
    crewHealthBonus: boolean;
    crewExpBonus: boolean;
}

/**
 * Применяет все бонусы завершённой технологии
 *
 * @param state - Текущее состояние игры
 * @param techId - ID завершённой технологии
 * @returns Объект с применёнными бонусами
 */
export const applyTechnologyBonuses = (
    state: GameStore,
    techId: TechnologyId,
): {
    appliedBonuses: AppliedBonuses;
    newModules: Module[];
    newCrew: CrewMember[];
} => {
    const tech = RESEARCH_TREE[techId];
    const appliedBonuses: AppliedBonuses = {
        powerBonus: false,
        shieldBonus: false,
        weaponDamageBonus: false,
        scanRangeBonus: false,
        cargoCapacityBonus: false,
        crewHealthBonus: false,
        crewExpBonus: false,
    };

    let newModules = [...state.ship.modules];
    let newCrew = [...state.crew];

    tech.bonuses.forEach((bonus: { type: string; value: number }) => {
        if (bonus.value <= 0) return;

        switch (bonus.type) {
            case "module_health": {
                newModules = applyModuleBonus(
                    newModules,
                    bonus.type,
                    bonus.value,
                );
                break;
            }

            case "module_power": {
                newModules = applyModuleBonus(
                    newModules,
                    bonus.type,
                    bonus.value,
                );
                appliedBonuses.powerBonus = true;
                break;
            }

            case "shield_strength": {
                newModules = applyModuleBonus(
                    newModules,
                    bonus.type,
                    bonus.value,
                );
                appliedBonuses.shieldBonus = true;
                break;
            }

            case "weapon_damage": {
                appliedBonuses.weaponDamageBonus = true;
                break;
            }

            case "scan_range": {
                newModules = applyModuleBonus(
                    newModules,
                    bonus.type,
                    bonus.value,
                );
                appliedBonuses.scanRangeBonus = true;
                break;
            }

            case "cargo_capacity": {
                newModules = applyModuleBonus(
                    newModules,
                    bonus.type,
                    bonus.value,
                );
                appliedBonuses.cargoCapacityBonus = true;
                break;
            }

            case "crew_health": {
                newCrew = applyCrewBonus(newCrew, bonus.type, bonus.value);
                appliedBonuses.crewHealthBonus = true;
                break;
            }

            case "crew_exp": {
                appliedBonuses.crewExpBonus = true;
                break;
            }
        }
    });

    return {
        appliedBonuses,
        newModules,
        newCrew,
    };
};

/**
 * Генерирует сообщение о бонусах технологии
 *
 * @param tech - Технология
 * @returns Строка с описанием бонусов
 */
export const getTechnologyBonusesDescription = (tech: Technology) =>
    tech.bonuses.map((b) => b.description).join(", ");

type LogMessages = { message: string; needsShipStatsUpdate: boolean };

/**
 * Генерирует лог-сообщения о применённых бонусах
 *
 * @param appliedBonuses - Объект с применёнными бонусами
 * @returns Массив сообщений для лога
 */
export const getBonusLogMessages = (
    appliedBonuses: AppliedBonuses,
): LogMessages[] => {
    const messages: LogMessages[] = [];

    if (appliedBonuses.powerBonus) {
        messages.push({
            message: "⚡ Мощность реакторов увеличена",
            needsShipStatsUpdate: true,
        });
    }

    if (appliedBonuses.shieldBonus) {
        messages.push({
            message: "🔵 Мощность щитов увеличена",
            needsShipStatsUpdate: true,
        });
    }

    if (appliedBonuses.weaponDamageBonus) {
        messages.push({
            message: "🔴 Урон оружия увеличен",
            needsShipStatsUpdate: true,
        });
    }

    if (appliedBonuses.scanRangeBonus) {
        messages.push({
            message: "📡 Дальность сканирования увеличена",
            needsShipStatsUpdate: true,
        });
    }

    if (appliedBonuses.cargoCapacityBonus) {
        messages.push({
            message: "📦 Вместимость трюма увеличена",
            needsShipStatsUpdate: true,
        });
    }

    if (appliedBonuses.crewHealthBonus) {
        messages.push({
            message: "💉 Здоровье экипажа увеличено",
            needsShipStatsUpdate: false,
        });
    }

    if (appliedBonuses.crewExpBonus) {
        messages.push({
            message: "🎓 Опыт экипажа увеличен",
            needsShipStatsUpdate: false,
        });
    }

    return messages;
};
