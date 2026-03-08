import { RACES } from "@/game/constants";
import type { CrewMember } from "@/game/types";

/**
 * Вычисляет модификатор потребления топлива от расовых бонусов экипажа
 *
 * Бонусы суммируются, но с diminishing returns — каждый следующий член экипажа
 * той же расы даёт 50% от предыдущего бонуса:
 * - 1-й Voidborn: 20%
 * - 2-й Voidborn: 10% (50% от 20%)
 * - 3-й Voidborn: 5% (50% от 10%)
 *
 * @param crew - Массив членов экипажа
 * @returns Модификатор потребления топлива (например, 0.65 = -35% к потреблению)
 */
export const getRaceFuelEfficiencyModifier = (crew: CrewMember[]) => {
    // Группируем бонусы по расам
    const raceBonuses = new Map<string, number[]>();

    crew.forEach((c) => {
        const race = RACES[c.race];
        const fuelBonus = race?.crewBonuses.fuelEfficiency;

        if (fuelBonus && fuelBonus > 0) {
            const raceKey = c.race;
            let bonuses = raceBonuses.get(raceKey);

            if (!bonuses) {
                bonuses = [];
                raceBonuses.set(raceKey, bonuses);
            }

            bonuses.push(fuelBonus);
        }
    });

    // Считаем суммарный бонус с diminishing returns
    let totalBonus = 0;

    raceBonuses.forEach((bonuses) => {
        let multiplier = 1;
        bonuses.forEach((bonus) => {
            totalBonus += bonus * multiplier;
            multiplier *= 0.5; // Каждый следующий даёт 50% от предыдущего
        });
    });

    // Ограничиваем максимальный бонус 50%
    totalBonus = Math.min(totalBonus, 0.5);

    return 1 - totalBonus;
};
