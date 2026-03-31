import type { GameState, GameStore, RaceId } from "@/game/types";
import type { ReputationLevel } from "@/game/types/reputation";
import {
    changeReputation,
    getRaceReputation,
    getRaceReputationLevel,
} from "@/game/reputation/utils";
import {
    getDiplomacyCost,
    MAX_DIPLOMATIC_REP,
} from "@/game/reputation/diplomacy";

export interface ReputationSlice {
    changeReputation: (raceId: RaceId, amount: number) => void;
    setReputation: (raceId: RaceId, value: number) => void;
    getReputation: (raceId: RaceId) => number;
    getReputationLevel: (raceId: RaceId) => ReputationLevel;
    sendDiplomaticGift: (raceId: RaceId, amount: number) => void;
    removePlanetBan: (locationId: string) => void;
}

export const createReputationSlice = (
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
) => ({
    changeReputation: (raceId: RaceId, amount: number) => {
        const currentState = get();
        const result = changeReputation(
            currentState.raceReputation,
            raceId,
            amount,
        );

        set((state) => {
            // Обновляем основную расу
            state.raceReputation[raceId] = result.newValue;

            // Обновляем затронутые расы (от отношений)
            for (const {
                raceId: affectedRaceId,
                change,
            } of result.affectedRaces) {
                const currentRep = state.raceReputation[affectedRaceId] ?? 0;
                state.raceReputation[affectedRaceId] = Math.max(
                    -100,
                    Math.min(100, currentRep + change),
                );
            }
            return state;
        });

        // Логируем изменение
        if (amount !== 0) {
            const sign = amount > 0 ? "+" : "";
            const raceName = raceId.charAt(0).toUpperCase() + raceId.slice(1);
            const logType: "info" | "warning" | "error" =
                amount > 0 ? "info" : "warning";

            if (result.levelChanged) {
                const oldLevelName = getReputationLevelName(result.oldLevel);
                const newLevelName = getReputationLevelName(result.newLevel);
                get().addLog(
                    `Репутация с ${raceName}: ${sign}${amount} (${oldLevelName} → ${newLevelName})`,
                    logType,
                );
            } else {
                get().addLog(
                    `Репутация с ${raceName}: ${sign}${amount}`,
                    logType,
                );
            }

            // Логируем затронутые расы
            for (const {
                raceId: affectedRaceId,
                change,
            } of result.affectedRaces) {
                const affectedRaceName =
                    affectedRaceId.charAt(0).toUpperCase() +
                    affectedRaceId.slice(1);
                const changeSign = change > 0 ? "+" : "";
                get().addLog(
                    `${affectedRaceName}: ${changeSign}${Math.round(change)}`,
                    "info",
                );
            }
        }
    },

    setReputation: (raceId: RaceId, value: number) => {
        set((state) => {
            const clampedValue = Math.max(-100, Math.min(100, value));
            state.raceReputation[raceId] = clampedValue;
            return state;
        });
    },

    getReputation: (raceId: RaceId) => {
        return getRaceReputation(get().raceReputation, raceId);
    },

    getReputationLevel: (raceId: RaceId) => {
        return getRaceReputationLevel(get().raceReputation, raceId);
    },

    sendDiplomaticGift: (raceId: RaceId, amount: number) => {
        const currentRep = get().raceReputation[raceId] ?? 0;
        if (currentRep >= MAX_DIPLOMATIC_REP) {
            get().addLog(
                `Максимальный дипломатический уровень уже достигнут`,
                "warning",
            );
            return;
        }
        // Clamp amount so we don't exceed cap
        const effectiveAmount = Math.min(
            amount,
            MAX_DIPLOMATIC_REP - currentRep,
        );
        const cost = getDiplomacyCost(currentRep, effectiveAmount);
        if (get().credits < cost) {
            get().addLog(`Недостаточно кредитов (нужно ${cost}₢)`, "error");
            return;
        }
        set((state) => {
            state.credits -= cost;
            return state;
        });
        get().changeReputation(raceId, effectiveAmount);
        get().addLog(
            `🤝 Дипломатический контакт установлен — репутация улучшена`,
            "info",
        );
    },

    removePlanetBan: (locationId: string) => {
        const COST = 2000;
        if (get().credits < COST) {
            get().addLog(
                `Недостаточно кредитов для снятия блокировки (${COST}₢)`,
                "error",
            );
            return;
        }
        if (!get().bannedPlanets.includes(locationId)) {
            get().addLog(`Эта планета не находится под блокировкой`, "warning");
            return;
        }
        set((state) => {
            state.credits -= COST;
            state.bannedPlanets = state.bannedPlanets.filter(
                (id) => id !== locationId,
            );
            return state;
        });
        get().addLog(`🔓 Блокировка с планеты снята — охрана отозвана`, "info");
    },

    showReputation: () => {
        const previousMode = get().gameMode;
        if (previousMode !== "reputation" && previousMode !== "artifacts") {
            get().savePreviousGameMode();
        }
        set((state) => {
            state.gameMode = "reputation";
            return state;
        });
    },

    closeReputationPanel: () => {
        set((state) => {
            state.gameMode = state.previousGameMode || "galaxy_map";
            state.previousGameMode = null;
            return state;
        });
    },
});

/**
 * Получить название уровня репутации на русском
 */
function getReputationLevelName(level: ReputationLevel): string {
    const names: Record<ReputationLevel, string> = {
        hostile: "Враждебный",
        unfriendly: "Недружелюбный",
        neutral: "Нейтральный",
        friendly: "Дружелюбный",
        allied: "Союзный",
    };
    return names[level];
}
