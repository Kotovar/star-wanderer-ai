import type { GameState, GameStore, SetState, StormType } from "@/game/types";
import { playSound } from "@/sounds";
import { CONTRACT_REWARDS } from "@/game/constants";
import { SCIENTIST_STORM_EXP } from "@/game/constants/experience";
import { giveCrewExperience } from "@/game/crew/utils";
import { getCrewByProfession } from "@/game/crew/utils";
import {
    STORM_CONFIG,
    STORM_LOOT_CONFIG,
    STORM_RESOURCES,
    STORM_COMMON,
} from "../constants";

type ModuleDamaged = { name: string; damage: number };
type SpecialResource = { type: string; amount: number };

/**
 * Конфигурация эффектов шторма
 */
interface StormEffects {
    /** Урон по щитам */
    shieldDamage: number;
    /** Урон по модулям */
    moduleDamage: number;
    /** Урон по экипажу */
    crewDamage: number;
    /** Множитель лута */
    lootMultiplier: number;
    /** Отключить все модули (для нанитного шторма) */
    disableModules: boolean;
    /** Сбросить опыт экипажа (для временного шторма) */
    resetExp: boolean;
    /** Повредить все модули (для гравитационного шторма) */
    damageAllModules: boolean;
}

/**
 * Рассчитывает эффекты шторма на основе типа и интенсивности
 * @param stormType - Тип шторма
 * @param intensity - Интенсивность шторма (1-3)
 * @param currentShields - Текущие щиты корабля
 * @returns Конфигурация эффектов шторма
 */
const calculateStormEffects = (
    stormType: StormType,
    intensity: number,
    currentShields: number,
): StormEffects => {
    const config = STORM_CONFIG[stormType] || STORM_CONFIG.radiation;

    // Расчёт урона по щитам
    let shieldDamage = 0;
    if (config.shieldDamageType === "all") {
        shieldDamage = currentShields;
    } else if (config.shieldDamage) {
        shieldDamage =
            (config.shieldDamage.min +
                Math.random() *
                    (config.shieldDamage.max - config.shieldDamage.min)) *
            intensity;
    }

    // Расчёт урона по экипажу
    const crewDamage = config.crewDamage
        ? (config.crewDamage.min +
              Math.random() * (config.crewDamage.max - config.crewDamage.min)) *
          intensity
        : 0;

    // Расчёт урона по модулям
    const moduleDamage = config.moduleDamage
        ? (config.moduleDamage.min +
              Math.random() *
                  (config.moduleDamage.max - config.moduleDamage.min)) *
          intensity
        : 0;

    return {
        shieldDamage,
        crewDamage,
        moduleDamage,
        lootMultiplier: config.lootMultiplier,
        disableModules: config.disableModules || false,
        resetExp: config.resetExp || false,
        damageAllModules: config.damageAllModules || false,
    };
};

/**
 * Применяет урон по модулям
 * @param modules - Текущие модули корабля
 * @param moduleDamage - Базовый урон по модулям
 * @param disableAll - Отключить все модули (для нанитного шторма)
 * @param damageAll - Повредить все модули (для гравитационного шторма)
 * @returns Обновлённые модули и список повреждений
 */
const applyModuleDamage = (
    modules: GameState["ship"]["modules"],
    moduleDamage: number,
    disableAll: boolean,
    damageAll: boolean,
): {
    damagedModules: GameState["ship"]["modules"];
    modulesDamagedList: ModuleDamaged[];
} => {
    const damagedModules = [...modules];
    const modulesDamagedList: ModuleDamaged[] = [];

    if (disableAll) {
        // Нанитный шторм: отключаем ВСЕ модули
        damagedModules.forEach((mod, idx) => {
            const damage = Math.floor(moduleDamage);
            damagedModules[idx] = {
                ...mod,
                health: Math.max(
                    STORM_COMMON.moduleMinHealth,
                    mod.health - damage,
                ),
                manualDisabled: true,
            };
            modulesDamagedList.push({
                name: mod.name,
                damage: damage,
            });
        });
    } else if (damageAll) {
        // Гравитационный шторм: повреждаем ВСЕ модули
        damagedModules.forEach((mod, idx) => {
            const damage = Math.floor(moduleDamage);
            damagedModules[idx] = {
                ...mod,
                health: Math.max(
                    STORM_COMMON.moduleMinHealth,
                    mod.health - damage,
                ),
            };
            modulesDamagedList.push({
                name: mod.name,
                damage: damage,
            });
        });
    } else {
        // Обычный шторм: повреждаем случайные модули
        const numModulesToDamage =
            Math.floor(
                Math.random() *
                    (STORM_COMMON.randomModulesToDamage.max -
                        STORM_COMMON.randomModulesToDamage.min) +
                    STORM_COMMON.randomModulesToDamage.min,
            ) || 1;

        for (let i = 0; i < numModulesToDamage; i++) {
            const randomIdx = Math.floor(Math.random() * damagedModules.length);
            const damage = Math.floor(moduleDamage);
            damagedModules[randomIdx] = {
                ...damagedModules[randomIdx],
                health: Math.max(
                    STORM_COMMON.moduleMinHealth,
                    damagedModules[randomIdx].health - damage,
                ),
            };
            modulesDamagedList.push({
                name: damagedModules[randomIdx].name,
                damage: damage,
            });
        }
    }

    return { damagedModules, modulesDamagedList };
};

/**
 * Применяет урон по экипажу
 * @param crew - Текущий экипаж
 * @param crewDamage - Урон по экипажу
 * @param resetExp - Сбросить опыт (для временного шторма)
 * @returns Обновлённый экипаж
 */
const applyCrewDamage = (
    crew: GameState["crew"],
    crewDamage: number,
    resetExp: boolean,
): GameState["crew"] => {
    return crew.map((c) => ({
        ...c,
        health: Math.max(
            STORM_COMMON.crewMinHealth,
            c.health - Math.floor(crewDamage),
        ),
        happiness: Math.max(
            STORM_COMMON.crewMinHappiness,
            c.happiness - STORM_COMMON.crewHappinessPenalty,
        ),
        exp: resetExp ? 0 : c.exp,
    }));
};

/**
 * Рассчитывает награду за шторм
 * @param intensity - Интенсивность шторма
 * @param lootMultiplier - Множитель лута
 * @returns Базовый лут, редкий бонус и флаг редкого лута
 */
const calculateLoot = (
    intensity: number,
    lootMultiplier: number,
): {
    baseLoot: number;
    rareBonus: number;
    rareLoot: boolean;
} => {
    const baseLoot = Math.floor(
        (STORM_LOOT_CONFIG.baseLoot.min +
            Math.random() *
                (STORM_LOOT_CONFIG.baseLoot.max -
                    STORM_LOOT_CONFIG.baseLoot.min)) *
            intensity *
            lootMultiplier,
    );

    const rareLootChance =
        STORM_LOOT_CONFIG.rareLootChanceBase * intensity * lootMultiplier;
    const rareLoot = Math.random() < rareLootChance;

    const rareBonus = rareLoot
        ? Math.floor(
              (STORM_LOOT_CONFIG.rareLootBonus.min +
                  Math.random() *
                      (STORM_LOOT_CONFIG.rareLootBonus.max -
                          STORM_LOOT_CONFIG.rareLootBonus.min)) *
                  intensity,
          )
        : 0;

    return { baseLoot, rareBonus, rareLoot };
};

/**
 * Рассчитывает специальные ресурсы для шторма
 * @param stormType - Тип шторма
 * @param intensity - Интенсивность шторма
 * @returns Массив специальных ресурсов
 */
const calculateSpecialResources = (
    stormType: StormType,
    intensity: number,
): SpecialResource[] => {
    const specialResources: SpecialResource[] = [];
    const resourceConfig = STORM_RESOURCES[stormType];

    if (resourceConfig) {
        const amount = Math.floor(
            (resourceConfig.amount.min +
                Math.random() *
                    (resourceConfig.amount.max - resourceConfig.amount.min)) *
                intensity,
        );
        specialResources.push({
            type: resourceConfig.type,
            amount: amount,
        });
    }

    return specialResources;
};

/**
 * Обрабатывает вход в шторм
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const handleStormEntry = (set: SetState, get: () => GameStore): void => {
    const state = get();
    const loc = state.currentLocation;

    // Проверка: это шторм
    if (!loc || loc.type !== "storm") {
        get().addLog("Это не шторм!", "error");
        return;
    }

    // Проверка: шторм уже пройден
    if (state.completedLocations.includes(loc.id)) {
        get().addLog(`${loc.name} уже исследован`, "warning");
        return;
    }

    // Помечаем как пройденный и открываем на карте
    set((s) => ({
        completedLocations: [...s.completedLocations, loc.id],
        currentSector: s.currentSector
            ? {
                  ...s.currentSector,
                  locations: s.currentSector.locations.map((l) =>
                      l.id === loc.id ? { ...l, signalRevealed: true } : l,
                  ),
              }
            : s.currentSector,
    }));

    const stormType: StormType = loc.stormType ?? "radiation";
    const intensity = loc.stormIntensity ?? 1;

    // Рассчитываем эффекты шторма
    let effects = calculateStormEffects(
        stormType,
        intensity,
        state.ship.shields,
    );

    // Штормовые щиты снижают весь урон на 50%
    if (state.research.researchedTechs.includes("storm_shields")) {
        effects = {
            ...effects,
            shieldDamage: effects.shieldDamage * 0.5,
            moduleDamage: effects.moduleDamage * 0.5,
            crewDamage: effects.crewDamage * 0.5,
        };
        get().addLog(`🌪️ Штормовые щиты: урон снижен на 50%`, "info");
    }

    // Применяем урон по щитам
    const newShields = Math.max(0, state.ship.shields - effects.shieldDamage);

    // Применяем урон по модулям
    const { damagedModules, modulesDamagedList } = applyModuleDamage(
        state.ship.modules,
        effects.moduleDamage,
        effects.disableModules,
        effects.damageAllModules,
    );

    // Применяем урон по экипажу
    const damagedCrew = applyCrewDamage(
        state.crew,
        effects.crewDamage,
        effects.resetExp,
    );

    // Рассчитываем награду
    const { baseLoot, rareBonus, rareLoot } = calculateLoot(
        intensity,
        effects.lootMultiplier,
    );

    // Рассчитываем специальные ресурсы
    const specialResources = calculateSpecialResources(stormType, intensity);

    // Применяем изменения
    set((s) => ({
        ship: {
            ...s.ship,
            shields: newShields,
            modules: damagedModules,
        },
        crew: damagedCrew,
        credits: s.credits + baseLoot + rareBonus,
        research: {
            ...s.research,
            resources: {
                ...s.research.resources,
                quantum_crystals:
                    (s.research.resources.quantum_crystals || 0) +
                    (specialResources.find((r) => r.type === "quantum_crystals")
                        ?.amount || 0),
                ancient_data:
                    (s.research.resources.ancient_data || 0) +
                    (specialResources.find((r) => r.type === "ancient_data")
                        ?.amount || 0),
            },
        },
        stormResult: {
            stormName: loc.name,
            stormType,
            intensity,
            shieldDamage: Math.floor(effects.shieldDamage),
            moduleDamage: modulesDamagedList,
            moduleDamagePercent: Math.floor(effects.moduleDamage),
            numModulesDamaged: effects.disableModules
                ? damagedModules.length
                : modulesDamagedList.length,
            crewDamage: Math.floor(effects.crewDamage),
            creditsEarned: baseLoot + rareBonus,
            rareLoot,
            rareBonus: rareLoot ? rareBonus : undefined,
            specialResources:
                specialResources.length > 0 ? specialResources : undefined,
        },
        gameMode: "storm_results",
    }));

    playSound("combat");

    // Даём опыт всем учёным за изучение шторма
    const scientists = getCrewByProfession(state.crew, "scientist");
    scientists.forEach((scientist) => {
        get().gainExp(scientist, SCIENTIST_STORM_EXP * intensity);
    });

    // Завершаем контракты на спасение (voidborn quest - выжить в шторме)
    const rescueContract = get().activeContracts.find(
        (c) =>
            c.type === "rescue" &&
            c.isRaceQuest &&
            c.sectorId === state.currentSector?.id &&
            intensity >= (c.requiredStormIntensity ?? 1),
    );

    if (rescueContract) {
        set((s) => ({
            credits: s.credits + (rescueContract.reward || 0),
        }));
        get().addLog(
            `Путешествие в Пустоту завершено! +${rescueContract.reward}₢`,
            "info",
        );

        // Даём опыт всему экипажу
        const expReward = CONTRACT_REWARDS.rescue.baseExp;
        giveCrewExperience(expReward, `Экипаж получил опыт: +${expReward} ед.`);

        set((s) => ({
            completedContractIds: [
                ...s.completedContractIds,
                rescueContract.id,
            ],
            activeContracts: s.activeContracts.filter(
                (ac) => ac.id !== rescueContract.id,
            ),
        }));
    }

    // Обновляем статистику корабля и переходим к следующему ходу
    get().updateShipStats();
    get().nextTurn();
};
