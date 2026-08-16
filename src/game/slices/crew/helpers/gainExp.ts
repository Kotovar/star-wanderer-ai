import { calculateGainExpResult } from "./calculateGainExpResult";
import { playSound } from "@/sounds/utils";
import type { GameState, GameStore, CrewMember } from "@/game/types";
import { getCrewDisplayName } from "@/game/crew/crewNames";
import { MAX_CREW_LEVEL } from "@/game/constants/crew";

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
): ReturnType<typeof calculateGainExpResult> | undefined => {
    if (!crewMember) return;

    // Считаем по актуальной записи, а не по объекту вызывающего: он мог быть
    // снят до другого начисления или до урона в этом же ходу, и тогда запись
    // результата откатывала бы всё, что случилось после снимка.
    const target = state.crew.find((c) => c.id === crewMember.id) ?? crewMember;

    const result = calculateGainExpResult(target, amount, state);

    if (result.leveledUp && result.logMessage) {
        playSound("world_crew_milestone");
        store.addLog(result.logMessage, "info");
    }

    set((s) => {
        const crew = s.crew.find((c) => c.id === crewMember.id);
        if (!crew) return;

        crew.exp = result.newExp;
        if (result.leveledUp && result.newLevel) {
            const oldLevel = crew.level;
            const previousMaxHealth = crew.maxHealth;
            const previousHealth = crew.health;
            crew.level = result.newLevel;
            s.maxLevel10CrewCountThisRun = Math.max(
                s.maxLevel10CrewCountThisRun,
                s.crew.filter((member) => member.level >= MAX_CREW_LEVEL).length,
            );
            // Прибавка идёт к текущему максимуму, а не подменяет его готовым
            // числом из снимка. Здоровье восстанавливается полностью.
            crew.maxHealth += result.healthGain ?? 0;
            crew.health = crew.maxHealth;
            s.pendingCrewLevelUps.push({
                crewMemberId: crew.id,
                crewMemberName: getCrewDisplayName(crew),
                oldLevel,
                newLevel: result.newLevel,
                previousMaxHealth,
                newMaxHealth: crew.maxHealth,
                previousHealth,
                restoredHealth: crew.health,
            });
        }
    });

    return result;
};
