import { getArtifactEffectValue } from "@/game/artifacts";
import { POWER_ARTIFACT_TYPES } from "@/game/constants";
import type { GameState, Module } from "@/game/types";
import { isModuleActive } from "@/lib";

/**
 * Проверяет, функционален ли модуль
 * Модуль функционален, если не отключён и имеет здоровье > 0
 * @param module - Модуль для проверки
 * @returns true если модуль работает, false иначе
 */
export const isModuleFunctional = (module: Module) => isModuleActive(module);

/**
 * Вычисляет среднюю защиту всех функциональных модулей
 * @param modules - Список модулей корабля
 * @returns Среднее значение защиты (округлённое вниз)
 */
export const calculateAverageDefense = (modules: Module[]) => {
    const functionalModules = modules.filter(isModuleFunctional);

    if (functionalModules.length === 0) {
        return 0;
    }

    const totalDefense = functionalModules.reduce(
        (sum, module) => sum + (module.defense ?? 0),
        0,
    );

    return Math.floor(totalDefense / functionalModules.length);
};

/**
 * Вычисляет общую мощность щитов всех функциональных щитовых модулей
 * @param modules - Список модулей корабля
 * @returns Суммарная мощность щитов
 */
export const calculateTotalShields = (modules: Module[]) =>
    modules
        .filter((m) => m.type === "shield" && isModuleFunctional(m))
        .reduce((sum, m) => sum + (m.shields ?? 0), 0);

/**
 * Вычисляет общую мощность систем жизнеобеспечения
 * @param modules - Список модулей корабля
 * @returns Суммарная ёмкость по кислороду
 */
export const calculateTotalOxygen = (modules: Module[]) =>
    modules
        .filter((m) => m.type === "lifesupport" && isModuleFunctional(m))
        .reduce((sum, m) => sum + (m.oxygen || 0), 0);

/**
 * Вычисляет общую ёмкость топливных баков
 * @param modules - Список модулей корабля
 * @returns Суммарная ёмкость топлива
 */
export const calculateTotalFuelCapacity = (modules: Module[]) =>
    modules
        .filter((m) => m.type === "fueltank" && isModuleFunctional(m))
        .reduce((sum, m) => sum + (m.capacity || 0), 0);

/**
 * Проверяет, является ли модуль реактором
 * @param modules - Список всех модулей корабля
 * @param moduleId - ID модуля для проверки
 * @returns true если модуль является реактором
 */
export const isReactorModule = (
    modules: GameState["ship"]["modules"],
    moduleId: number,
) => {
    const shipModule = modules.find((m) => m.id === moduleId);
    return shipModule?.type === "reactor";
};

/**
 * Вычисляет суммарный бонус к энергии от всех активных артефактов
 * @param artifacts - Список всех артефактов
 * @param state - Текущее состояние игры
 * @returns Суммарный бонус к энергии
 */
export const calculateArtifactPowerBonus = (
    artifacts: GameState["artifacts"],
    state: GameState,
) => {
    let bonus = 0;

    for (const artifact of artifacts) {
        if (!artifact.effect.active) continue;

        if (POWER_ARTIFACT_TYPES.includes(artifact.effect.type)) {
            bonus += getArtifactEffectValue(artifact, state);
        }
    }

    return bonus;
};
