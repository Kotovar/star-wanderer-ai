import { calculateGainExpResult } from "./calculateGainExpResult";
import { playSound } from "@/sounds/utils";
import type { GameState, GameStore, CrewMember } from "@/game/types";

/**
 * Выполняет начисление опыта члену экипажа с обновлением состояния
 *
 * @param crewMember - Член экипажа для получения опыта
 * @param amount - Базовое количество опыта
 * @param state - Текущее состояние игры
 * @param store - GameStore для доступа к addLog
 * @param set - Функция set из zustand для обновления состояния
 */
export const gainExp = (
    crewMember: CrewMember | undefined,
    amount: number,
    state: GameState,
    store: GameStore,
    set: (fn: (s: GameState) => void) => void,
): void => {
    if (!crewMember) return;

    const result = calculateGainExpResult(crewMember, amount, state);

    if (result.leveledUp && result.logMessage) {
        playSound("levelUp");
        store.addLog(result.logMessage, "info");
    }

    set((s) => {
        const crew = s.crew.find((c) => c.id === crewMember.id);
        if (!crew) return;

        crew.exp = result.newExp;
        if (result.leveledUp && result.newLevel) {
            crew.level = result.newLevel;
            // При повышении уровня увеличиваем maxHealth и health
            const levelUpData = result.levelUpData;
            if (levelUpData) {
                if (levelUpData.maxHealth) {
                    crew.maxHealth = levelUpData.maxHealth;
                    crew.health = levelUpData.health;
                }
                if (levelUpData.maxHappiness !== undefined) {
                    crew.maxHappiness = levelUpData.maxHappiness;
                    crew.happiness = levelUpData.happiness;
                }
            }
        }
    });
};
