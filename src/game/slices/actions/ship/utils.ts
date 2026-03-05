import { getArtifactEffectValue } from "@/game/artifacts";
import type { Artifact, ArtifactType, GameState, Module } from "@/game/types";

/**
 * Типы артефактов, влияющие на характеристики корабля
 */
export const ARTIFACT_TYPES: Record<string, ArtifactType> = {
    DARK_SHIELD: "dark_shield",
    CRYSTALLINE_ARMOR: "module_armor",
};

/**
 * Типы артефактов, влияющие на энергию корабля
 */
const POWER_ARTIFACT_TYPES: ArtifactType[] = ["abyss_power", "free_power"];

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

/**
 * Проверяет, является ли модуль реактором
 * @param modules - Список всех модулей корабля
 * @param moduleId - ID модуля для проверки
 * @returns true если модуль является реактором
 */
export function isReactorModule(
    modules: GameState["ship"]["modules"],
    moduleId: number,
): boolean {
    const shipModule = modules.find((m) => m.id === moduleId);
    return shipModule?.type === "reactor";
}

/**
 * Вычисляет суммарный бонус к энергии от всех активных артефактов
 * @param artifacts - Список всех артефактов
 * @param state - Текущее состояние игры
 * @returns Суммарный бонус к энергии
 */
export function calculateArtifactPowerBonus(
    artifacts: GameState["artifacts"],
    state: GameState,
): number {
    let bonus = 0;

    for (const artifact of artifacts) {
        if (!artifact.effect.active) continue;

        if (POWER_ARTIFACT_TYPES.includes(artifact.effect.type)) {
            bonus += getArtifactEffectValue(artifact, state);
        }
    }

    return bonus;
}
