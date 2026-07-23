import { store as i18nStore } from "@/lib/useTranslation";
import { showHintOnce } from "@/game/hints/showHint";
import type { CrewMember, GameStore, SetState } from "@/game/types";

/**
 * Конфигурация дезертирства
 */
export const TURNS_AT_ZERO_HAPPINESS = 3;

/** Порог раннего предупреждения о низком счастье (доля от maxHappiness) */
const LOW_HAPPINESS_WARNING_RATIO = 0.3;

const isLowHappiness = (crewMember: CrewMember) =>
    crewMember.race !== "synthetic" &&
    crewMember.happiness > 0 &&
    crewMember.happiness < crewMember.maxHappiness * LOW_HAPPINESS_WARNING_RATIO;

/**
 * Проверяет, должен ли член экипажа покинуть корабль
 */
const shouldDesert = (crewMember: CrewMember) => {
    // Синтетики не дезертируют
    if (crewMember.race === "synthetic") return false;

    // Проверяем счётчик при 0 счастья
    if (crewMember.happiness <= 0) {
        return (
            (crewMember.turnsAtZeroHappiness || 0) >= TURNS_AT_ZERO_HAPPINESS
        );
    }

    return false;
};

/**
 * Сколько ходов осталось до дезертирства при сохранении нулевого настроения,
 * или null если член экипажа сейчас не в зоне риска (счастье > 0 или синтетик).
 */
export const getDesertionTurnsLeft = (crewMember: CrewMember): number | null => {
    if (crewMember.race === "synthetic") return null;
    if (crewMember.happiness > 0) return null;
    return Math.max(
        1,
        TURNS_AT_ZERO_HAPPINESS - (crewMember.turnsAtZeroHappiness || 0),
    );
};

/**
 * Обновляет счётчик ходов при низком счастье
 */
const updateTurnsAtZeroHappiness = (crewMember: CrewMember): number => {
    if (crewMember.happiness <= 0) {
        return (crewMember.turnsAtZeroHappiness || 0) + 1;
    }
    return 0;
};

/**
 * Обработка дезертирства экипажа
 *
 * Механика:
 * - Если счастье ≤ 0, увеличивается счётчик turnsAtZeroHappiness
 * - При 3+ ходах с 0 счастьем член экипажа покидает корабль
 * - Синтетики иммунны к дезертирству
 *
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const processDesertion = (set: SetState, get: () => GameStore): void => {
    if (get().crew.some(isLowHappiness)) {
        showHintOnce(get().addLog, "low_happiness", "hints.low_happiness");
    }

    set((s) => {
        // Фильтруем экипаж, оставляем только тех, кто не дезертировал
        const crewToKeep = s.crew.filter((crewMember) => {
            if (shouldDesert(crewMember)) {
                get().addLog( i18nStore.t("game_logs.processDesertion_1", { crewMember_name: crewMember.name }),
                    "warning",
                );
                return false;
            }
            return true;
        });

        // Обновляем счётчики ходов при низком счастье
        const updatedCrew = crewToKeep.map((crewMember) => ({
            ...crewMember,
            turnsAtZeroHappiness: updateTurnsAtZeroHappiness(crewMember),
        }));

        return { crew: updatedCrew };
    });
};
