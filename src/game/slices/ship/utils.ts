import type { Artifact, Module } from "@/game/types";

/**
 * Типы артефактов, влияющие на характеристики корабля
 */
export const ARTIFACT_TYPES = {
    /** Тёмный щит - добавляет бонус к щитам */
    DARK_SHIELD: "dark_shield" as const,
    /** Кристаллическая броня - добавляет бонус к защите модулей */
    CRYSTALLINE_ARMOR: "module_armor" as const,
} as const;

/**
 * Проверяет, функционален ли модуль
 * Модуль функционален, если не отключён и имеет здоровье > 0
 * @param module - Модуль для проверки
 * @returns true если модуль работает, false иначе
 */
export function isModuleFunctional(module: Module): boolean {
    return !module.disabled && !module.manualDisabled && module.health > 0;
}

/**
 * Находит активный артефакт по типу эффекта
 * @param artifacts - Список всех артефактов
 * @param effectType - Тип эффекта для поиска
 * @returns Активный артефакт или undefined
 */
export function findActiveArtifact(
    artifacts: Artifact[],
    effectType: string,
): Artifact | undefined {
    return artifacts.find(
        (a) => a.effect.type === effectType && a.effect.active,
    );
}

/**
 * Вычисляет среднюю защиту всех функциональных модулей
 * @param modules - Список модулей корабля
 * @returns Среднее значение защиты (округлённое вниз)
 */
export function calculateAverageDefense(modules: Module[]): number {
    const functionalModules = modules.filter(isModuleFunctional);

    if (functionalModules.length === 0) {
        return 0;
    }

    const totalDefense = functionalModules.reduce(
        (sum, module) => sum + (module.defense ?? 0),
        0,
    );

    return Math.floor(totalDefense / functionalModules.length);
}

/**
 * Вычисляет общую мощность щитов всех функциональных щитовых модулей
 * @param modules - Список модулей корабля
 * @returns Суммарная мощность щитов
 */
export function calculateTotalShields(modules: Module[]): number {
    return modules
        .filter((m) => m.type === "shield" && isModuleFunctional(m))
        .reduce((sum, m) => sum + (m.shields ?? 0), 0);
}

/**
 * Вычисляет общую мощность систем жизнеобеспечения
 * @param modules - Список модулей корабля
 * @returns Суммарная ёмкость по кислороду
 */
export function calculateTotalOxygen(modules: Module[]): number {
    return modules
        .filter((m) => m.type === "lifesupport" && isModuleFunctional(m))
        .reduce((sum, m) => sum + (m.oxygen || 0), 0);
}

/**
 * Вычисляет общую ёмкость топливных баков
 * @param modules - Список модулей корабля
 * @returns Суммарная ёмкость топлива
 */
export function calculateTotalFuelCapacity(modules: Module[]): number {
    return modules
        .filter((m) => m.type === "fueltank" && isModuleFunctional(m))
        .reduce((sum, m) => sum + (m.capacity || 0), 0);
}
