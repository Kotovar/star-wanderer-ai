import type { GameState } from "@/game/types/game";
import { getArtifactEffectValue } from "@/game/artifacts";
import {
    ARTIFACT_TYPES,
    calculateAverageDefense,
    calculateTotalFuelCapacity,
    calculateTotalOxygen,
    calculateTotalShields,
    findActiveArtifact,
} from "./utils";
import { WeaponTypeTotal } from "@/game/types";
import { getTotalDamage } from "./helpers/getTotalDamage";
import { getTotalConsumption, getTotalPower } from "./helpers";

/**
 * Расширенный интерфейс ShipSlice с геттерами
 * Содержит методы для управления состоянием корабля и вычисления характеристик
 */
export interface ShipSlice {
    /**
     * Обновляет все характеристики корабля
     * Пересчитывает защиту, щиты, кислород, топливо и ёмкость экипажа
     * на основе текущих модулей, артефактов и эффектов
     */
    updateShipStats: () => void;

    /**
     * Вычисляет общую мощность энергии корабля
     * Учитывает модули, назначения экипажа, артефакты и эффекты планет
     * @returns Общая мощность энергии
     */
    getTotalPower: () => number;

    /**
     * Вычисляет общее потребление энергии кораблём
     * Учитывает модули, расовые бонусы экипажа и назначения
     * @returns Общее потребление энергии
     */
    getTotalConsumption: () => number;

    /**
     * Вычисляет общий урон корабля по типам оружия
     * @returns Объект с уроном по типам: total, kinetic, laser, missile
     */
    getTotalDamage: () => Record<WeaponTypeTotal, number>;
}

/**
 * Создаёт слайс корабля с поддержкой immer
 *
 * @param set - Функция для обновления состояния
 * @param get - Функция для получения текущего состояния
 * @returns Объект с методами управления кораблём
 */
export const createShipSlice = (
    set: (fn: (state: GameState & ShipSlice) => void) => void,
    get: () => GameState & ShipSlice,
): ShipSlice => ({
    updateShipStats: () => {
        set((state) => {
            const { artifacts, ship } = state;
            const { modules } = ship;

            // === Расчёт защиты ===
            const averageDefense = calculateAverageDefense(modules);
            const crystallineArmor = findActiveArtifact(
                artifacts,
                ARTIFACT_TYPES.CRYSTALLINE_ARMOR,
            );
            let finalDefense = averageDefense;

            if (crystallineArmor) {
                const armorBonus = getArtifactEffectValue(
                    crystallineArmor,
                    state,
                );
                finalDefense += armorBonus;
            }

            // === Расчёт щитов ===
            let totalShields = calculateTotalShields(modules);

            const darkShield = findActiveArtifact(
                artifacts,
                ARTIFACT_TYPES.DARK_SHIELD,
            );
            if (darkShield) {
                totalShields += getArtifactEffectValue(darkShield, state);
            }

            // Сохраняем бонусные щиты от эффектов планет
            const bonusShields = ship.bonusShields || 0;
            const maxShieldsWithBonus = totalShields + bonusShields;

            // === Расчёт кислорода и топлива ===
            const totalOxygen = calculateTotalOxygen(modules);
            const totalFuelCapacity = calculateTotalFuelCapacity(modules);

            // Защита от NaN или undefined для текущего топлива
            const currentFuel = ship.fuel || 0;

            // === Обновление состояния корабля ===
            state.ship.armor = finalDefense;
            state.ship.maxShields = maxShieldsWithBonus;
            state.ship.shields = Math.min(
                state.ship.shields,
                maxShieldsWithBonus,
            );
            state.ship.crewCapacity = totalOxygen;
            state.ship.maxFuel = totalFuelCapacity;
            state.ship.fuel = Math.min(currentFuel, totalFuelCapacity);
        });
    },

    getTotalPower: () => {
        const state = get();
        return getTotalPower(state);
    },

    getTotalConsumption: () => {
        const state = get();
        return getTotalConsumption(state);
    },

    getTotalDamage: () => {
        const state = get();
        return getTotalDamage(state);
    },
});
