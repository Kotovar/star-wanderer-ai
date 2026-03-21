import type { Module, ShopItem } from "@/game/types";
import {
    MODULE_HEALTH_BY_LEVEL,
    MODULE_DEFENSE_BY_LEVEL,
} from "@/game/slices/shop/constants";

/**
 * Опции для создания модуля
 */
interface CreateModuleOptions {
    /** Координата X */
    x: number;
    /** Координата Y */
    y: number;
    /** Бонус грузового отсека (для cargo модулей) */
    cargoBonus?: number;
    /** Дополнительные слоты оружия (от технологий) */
    extraWeaponSlots?: number;
    /** Генерация ID (по умолчанию Date.now()) */
    generateId?: () => number;
}

/**
 * Создаёт модуль из ShopItem
 * @param item - Товар модуля
 * @param options - Опции создания
 * @returns Новый модуль
 */
export const createModuleFromShopItem = (
    item: ShopItem,
    options: CreateModuleOptions,
): Module => {
    const {
        x = 0,
        y = 0,
        cargoBonus = 1,
        extraWeaponSlots = 0,
        generateId = () => Date.now(),
    } = options;

    const level = item.level ?? 1;

    return {
        id: generateId(),
        type: item.moduleType,
        name: item.name,
        x,
        y,
        width: item.width || 1,
        height: item.height || 1,
        level,
        maxHealth: item.maxHealth ?? MODULE_HEALTH_BY_LEVEL[level] ?? 100,
        health: item.maxHealth ?? MODULE_HEALTH_BY_LEVEL[level] ?? 100,
        defense: item.level === 4 ? 5 : (MODULE_DEFENSE_BY_LEVEL[level] ?? 1),
        // Свойства по типу модуля
        ...(item.moduleType === "reactor" && { power: item.power || 10 }),
        ...(item.moduleType === "engine" && {
            fuelEfficiency: item.fuelEfficiency ?? 10,
            consumption: item.consumption || 1,
        }),
        ...(item.moduleType === "drill" && {
            consumption: item.consumption || 1,
        }),
        ...(item.moduleType === "cargo" && {
            capacity: Math.floor((item.capacity || 50) * cargoBonus),
            consumption: item.consumption || 1,
        }),
        ...(item.moduleType === "fueltank" && {
            capacity: item.capacity || 100,
        }),
        ...(item.moduleType === "lab" && {
            consumption: item.consumption || 3,
            researchOutput: item.researchOutput || 5,
        }),
        ...(item.moduleType === "shield" && {
            shields: item.shields || 20,
            shieldRegen: item.shieldRegen || 4,
            consumption: item.consumption || 3,
        }),
        ...(item.moduleType === "scanner" && {
            scanRange: item.scanRange || 3,
            consumption: item.consumption || 1,
        }),
        ...(item.moduleType === "lifesupport" && {
            oxygen: item.oxygen || 5,
            consumption: item.consumption || 2,
        }),
        ...(item.moduleType === "medical" && {
            healing: item.healing || 8,
            consumption: item.consumption || 2,
        }),
        ...(item.moduleType === "weaponbay" && {
            weapons: Array(
                (item.width || 1) * (item.height || 1) + extraWeaponSlots,
            ).fill(null),
            consumption: item.consumption || 2,
        }),
        ...(item.moduleType === "cockpit" && { consumption: 1 }),
        ...(item.moduleType === "quarters" && {
            capacity: item.capacity || 2,
            consumption: item.consumption || 1,
        }),
        ...(item.moduleType === "repair_bay" && {
            repairAmount: item.repairAmount || 3,
            repairTargets: item.repairTargets || 1,
            consumption: item.consumption || 8,
        }),
        // Дополнительные свойства
        ...(item.power !== undefined && { power: item.power }),
        ...(item.consumption !== undefined && {
            consumption: item.consumption,
        }),
        ...(item.defense !== undefined && { defense: item.defense }),
        ...(item.scanRange !== undefined && {
            scanRange: item.scanRange,
        }),
        ...(item.oxygen !== undefined && { oxygen: item.oxygen }),
        ...(item.capacity !== undefined && { capacity: item.capacity }),
    };
};
