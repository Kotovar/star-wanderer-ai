import { store as i18nStore } from "@/lib/useTranslation";
import type {
    GameState,
    GameStore,
    RaceId,
    ReputationChangeOptions,
} from "@/game/types";
import type { ReputationLevel } from "@/game/types/reputation";
import {
    changeReputation,
    getRaceReputation,
    getRaceReputationLevel,
} from "@/game/reputation/utils";
import {
    getDiplomacyCost,
    MAX_DIPLOMATIC_REP,
    TRANSLATOR_HIRE_COST,
} from "@/game/reputation/diplomacy";

export const createReputationSlice = (
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
) => ({
    changeReputation: (
        raceId: RaceId,
        amount: number,
        options?: ReputationChangeOptions,
    ) => {
        const currentState = get();
        const result = changeReputation(
            currentState.raceReputation,
            raceId,
            amount,
        );
        const excludedRippleRaceIds = new Set(options?.excludeRippleRaceIds);
        const knownRaceIds = new Set(currentState.knownRaces);
        const affectedRaces = result.affectedRaces
            .filter(
                ({ raceId: affectedRaceId }) =>
                    knownRaceIds.has(affectedRaceId) &&
                    !excludedRippleRaceIds.has(affectedRaceId),
            )
            .map(({ raceId: affectedRaceId, change }) => {
                const currentRep = getRaceReputation(
                    currentState.raceReputation,
                    affectedRaceId,
                );
                const nextRep = Math.max(
                    -100,
                    Math.min(100, currentRep + change),
                );
                return { raceId: affectedRaceId, change: nextRep - currentRep };
            })
            .filter(({ change }) => change !== 0);

        set((state) => {
            // Обновляем основную расу
            state.raceReputation[raceId] = result.newValue;

            // Обновляем затронутые расы (от отношений)
            for (const {
                raceId: affectedRaceId,
                change,
            } of affectedRaces) {
                const currentRep = state.raceReputation[affectedRaceId] ?? 0;
                state.raceReputation[affectedRaceId] = Math.max(
                    -100,
                    Math.min(100, currentRep + change),
                );
            }
            return state;
        });

        // Логируем фактически применённое изменение
        const appliedAmount = result.newValue - result.oldValue;
        if (appliedAmount !== 0) {
            const sign = appliedAmount > 0 ? "+" : "";
            const raceName = i18nStore.t(`races.${raceId}.plural`);
            const logType: "info" | "warning" | "error" =
                appliedAmount > 0 ? "info" : "warning";

            if (result.levelChanged) {
                const oldLevelName = getReputationLevelName(result.oldLevel);
                const newLevelName = getReputationLevelName(result.newLevel);
                get().addLog( i18nStore.t("game_logs.createReputationSlice_1", { raceName, sign, amount: appliedAmount, oldLevelName, newLevelName }),
                    logType,
                    "reputation",
                );
            } else {
                get().addLog( i18nStore.t("game_logs.createReputationSlice_2", { raceName, sign, amount: appliedAmount }),
                    logType,
                    "reputation",
                );
            }

            // Логируем затронутые расы
            for (const {
                raceId: affectedRaceId,
                change,
            } of affectedRaces) {
                const affectedRaceName = i18nStore.t(
                    `races.${affectedRaceId}.plural`,
                );
                const changeSign = change > 0 ? "+" : "";
                get().addLog(
                    `${affectedRaceName}: ${changeSign}${Math.round(change)}`,
                    "info",
                    "reputation",
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
            get().addLog( i18nStore.t("game_logs.createReputationSlice_3"),
                "warning",
                "reputation",
            );
            return;
        }
        // Clamp amount so we don't exceed cap
        const effectiveAmount = Math.min(
            amount,
            MAX_DIPLOMATIC_REP - currentRep,
        );
        const hasTranslator = get().diplomaticTranslatorRaceIds.includes(raceId);
        const cost = getDiplomacyCost(currentRep, effectiveAmount, hasTranslator);
        if (get().credits < cost) {
            get().addLog( i18nStore.t("game_logs.createReputationSlice_4", { cost }), "error", "reputation");
            return;
        }
        set((state) => {
            state.credits -= cost;
            return state;
        });
        get().changeReputation(raceId, effectiveAmount);
        get().addLog( i18nStore.t("game_logs.createReputationSlice_5"),
            "info",
            "reputation",
        );
    },

    removePlanetBan: (locationId: string) => {
        const COST = 2000;
        if (get().credits < COST) {
            get().addLog( i18nStore.t("game_logs.createReputationSlice_6", { COST }),
                "error",
                "reputation",
            );
            return;
        }
        if (!get().bannedPlanets.includes(locationId)) {
            get().addLog( i18nStore.t("game_logs.createReputationSlice_7"), "warning", "reputation");
            return;
        }
        set((state) => {
            state.credits -= COST;
            state.bannedPlanets = state.bannedPlanets.filter(
                (id) => id !== locationId,
            );
            return state;
        });
        get().addLog( i18nStore.t("game_logs.createReputationSlice_8"), "info", "reputation");
    },

    hireTranslator: (raceId: RaceId) => {
        if (get().diplomaticTranslatorRaceIds.includes(raceId)) {
            return;
        }
        if (get().credits < TRANSLATOR_HIRE_COST) {
            get().addLog(
                i18nStore.t("game_logs.createReputationSlice_9", {
                    cost: TRANSLATOR_HIRE_COST,
                }),
                "error",
                "reputation",
            );
            return;
        }
        set((state) => {
            state.credits -= TRANSLATOR_HIRE_COST;
            state.diplomaticTranslatorRaceIds = [
                ...state.diplomaticTranslatorRaceIds,
                raceId,
            ];
            return state;
        });
        get().addLog(
            i18nStore.t("game_logs.createReputationSlice_10", {
                raceName: i18nStore.t(`races.${raceId}.plural`),
            }),
            "info",
            "reputation",
        );
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
    return i18nStore.t(`reputation.levels.${level}`);
}
