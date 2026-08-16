import { CONTRACT_REWARDS } from "@/game/constants";
import { getReputationChanges } from "@/game/contracts/completionRewards";
import { getCrewDisplayName } from "@/game/crew/crewNames";
import type { Contract, GameStore, Location, SetState } from "@/game/types";
import { patchLocation } from "@/game/utils/patchLocation";
import { store as i18nStore } from "@/lib/useTranslation";
import { playSound } from "@/sounds";
import { refreshPirateContracts } from "./contracts";
import {
    canFightWantedPursuit,
    clampWantedHeat,
    getWantedBribeCost,
    isWantedCheckpointRequired,
    WANTED_HEAT_AFTER_CHECKPOINT,
} from "./wanted";

type PirateContractType =
    | "pirate_smuggling"
    | "pirate_bounty"
    | "pirate_heist";

const isPirateContract = (
    contract: Contract,
): contract is Contract & { type: PirateContractType } =>
    contract.type === "pirate_smuggling" ||
    contract.type === "pirate_bounty" ||
    contract.type === "pirate_heist";

const isPirateStation = (location: Location | null): location is Location =>
    location?.type === "station" && Boolean(location.stationConfig?.isPirate);

export interface PirateSlice {
    acceptPirateContract: (contractId: string) => void;
    performPirateContractObjective: (contractId: string) => void;
    completePirateContract: (contractId: string) => void;
    reducePirateHeat: (amount: number, cost: number) => void;
    resolveWantedCheckpoint: (
        choice: "bribe" | "dump" | "fight" | "leave",
    ) => void;
    refreshPirateStationContracts: () => void;
}

/** Создаёт слайс пиратских механик. */
export const createPirateSlice = (
    set: SetState,
    get: () => GameStore,
): PirateSlice => ({
    acceptPirateContract: (contractId) => {
        const state = get();
        const location = state.currentLocation;
        if (!isPirateStation(location)) {
            get().addLog(i18nStore.t("pirate.err_no_board"), "error");
            return;
        }

        const contract = location.pirateContracts?.find(
            (offer) => offer.id === contractId,
        );
        if (!contract || !isPirateContract(contract)) {
            get().addLog(i18nStore.t("pirate.err_contract_missing"), "error");
            return;
        }
        if (
            state.activeContracts.some((active) => active.id === contractId) ||
            state.completedContractIds.includes(contractId)
        ) {
            get().addLog(i18nStore.t("pirate.err_contract_taken"), "error");
            return;
        }

        const target = state.galaxy.sectors
            .flatMap((sector) => sector.locations)
            .find((candidate) => candidate.id === contract.targetLocationId);
        if (!target || (contract.type === "pirate_bounty" && target.defeated)) {
            get().addLog(i18nStore.t("pirate.err_target_unavailable"), "error");
            return;
        }

        set((s) => ({
            activeContracts: [
                ...s.activeContracts,
                { ...contract, acceptedAt: s.turn, pirateObjectiveComplete: false },
            ],
            crew: s.crew.map((crewMember) => {
                const lawful = crewMember.traits?.some(
                    (trait) =>
                        trait.effect.combatStartMoraleDrain ||
                        trait.effect.sellPriceBonus,
                );
                return lawful
                    ? {
                          ...crewMember,
                          happiness: Math.max(0, crewMember.happiness - 5),
                      }
                    : crewMember;
            }),
        }));

        get().addLog(
            i18nStore.t("pirate.contract_accepted", {
                contract: i18nStore.t(contract.desc),
            }),
            "warning",
        );
        playSound("ui_confirm");
    },

    performPirateContractObjective: (contractId) => {
        const state = get();
        const contract = state.activeContracts.find(
            (active) => active.id === contractId,
        );
        const location = state.currentLocation;
        if (
            !contract ||
            !isPirateContract(contract) ||
            !location ||
            location.id !== contract.targetLocationId
        ) {
            get().addLog(i18nStore.t("pirate.err_wrong_target"), "error");
            return;
        }
        if (contract.pirateObjectiveComplete) {
            get().addLog(i18nStore.t("pirate.objective_ready"), "info");
            return;
        }

        if (contract.type === "pirate_bounty") {
            get().addLog(i18nStore.t("pirate.objective_bounty_combat"), "info");
            return;
        }

        if (contract.type === "pirate_smuggling") {
            const quantity = contract.quantity ?? 1;
            const contraband = state.ship.tradeGoods.find(
                (good) => good.item === "contraband",
            );
            if ((contraband?.quantity ?? 0) < quantity) {
                get().addLog(
                    i18nStore.t("pirate.err_need_contraband", { quantity }),
                    "error",
                );
                return;
            }
            set((s) => ({
                ship: {
                    ...s.ship,
                    tradeGoods: s.ship.tradeGoods
                        .map((good) =>
                            good.item === "contraband"
                                ? { ...good, quantity: good.quantity - quantity }
                                : good,
                        )
                        .filter((good) => good.quantity > 0),
                },
                activeContracts: s.activeContracts.map((active) =>
                    active.id === contractId
                        ? { ...active, pirateObjectiveComplete: true }
                        : active,
                ),
                wantedHeat: clampWantedHeat((s.wantedHeat ?? 0) + 8),
            }));
            get().addLog(i18nStore.t("pirate.objective_smuggling_done"), "warning");
            playSound("ui_notification");
            return;
        }

        if (state.probes < 1) {
            get().addLog(i18nStore.t("pirate.err_need_probe"), "error");
            return;
        }
        set((s) => ({
            probes: s.probes - 1,
            activeContracts: s.activeContracts.map((active) =>
                active.id === contractId
                    ? { ...active, pirateObjectiveComplete: true }
                    : active,
            ),
            wantedHeat: clampWantedHeat((s.wantedHeat ?? 0) + 15),
        }));
        get().addLog(i18nStore.t("pirate.objective_heist_done"), "warning");
        playSound("ui_notification");
    },

    completePirateContract: (contractId) => {
        const state = get();
        const contract = state.activeContracts.find(
            (active) => active.id === contractId,
        );
        const location = state.currentLocation;
        if (!contract || !isPirateContract(contract)) return;
        if (!isPirateStation(location) || location.id !== contract.sourcePlanetId) {
            get().addLog(i18nStore.t("pirate.err_return_to_issuer"), "error");
            return;
        }
        if (!contract.pirateObjectiveComplete) {
            get().addLog(i18nStore.t("pirate.err_objective_incomplete"), "error");
            return;
        }

        set((s) => ({
            credits: s.credits + contract.reward,
            wantedHeat: clampWantedHeat((s.wantedHeat ?? 0) - 20),
            activeContracts: s.activeContracts.filter(
                (active) => active.id !== contractId,
            ),
            completedContractIds: s.completedContractIds.includes(contractId)
                ? s.completedContractIds
                : [...s.completedContractIds, contractId],
        }));

        const experience = get().crew.flatMap((crewMember) => {
            const result = get().gainExp(
                crewMember,
                CONTRACT_REWARDS[contract.type].baseExp,
            );
            return result
                ? [
                      {
                          crewMemberId: crewMember.id,
                          name: getCrewDisplayName(crewMember),
                          amount: result.finalAmount,
                      },
                  ]
                : [];
        });
        get().addLog(i18nStore.t("pirate.contract_experience"), "info");
        get().showContractCompletion({
            contract,
            credits: contract.reward,
            reputationChanges: getReputationChanges(
                state.raceReputation,
                get().raceReputation,
            ),
            experience,
        });
        get().addLog(
            i18nStore.t("pirate.contract_completed", { reward: contract.reward }),
            "info",
        );
        playSound("world_contract");
    },

    reducePirateHeat: (amount, cost) => {
        const state = get();
        if (!isPirateStation(state.currentLocation)) {
            get().addLog(i18nStore.t("pirate.err_no_laundering"), "error");
            return;
        }
        if (state.credits < cost) {
            get().addLog(i18nStore.t("pirate.err_no_credits"), "error");
            return;
        }

        set((s) => ({
            credits: s.credits - cost,
            wantedHeat: clampWantedHeat((s.wantedHeat ?? 0) - amount),
        }));
        get().addLog(
            i18nStore.t("pirate.heat_laundered", { amount }),
            "info",
        );
        playSound("ui_notification");
    },

    resolveWantedCheckpoint: (choice) => {
        const state = get();
        const location = state.currentLocation;
        if (
            !location ||
            location.type !== "station" ||
            location.stationConfig?.isPirate ||
            !isWantedCheckpointRequired(state.wantedHeat ?? 0)
        ) {
            return;
        }

        if (choice === "leave") {
            set({ gameMode: "sector_map" });
            get().addLog(i18nStore.t("pirate.checkpoint_left"), "warning");
            return;
        }
        if (choice === "bribe") {
            const cost = getWantedBribeCost(state.wantedHeat ?? 0);
            if (state.credits < cost) {
                get().addLog(i18nStore.t("pirate.err_no_credits"), "error");
                return;
            }
            set({
                credits: state.credits - cost,
                wantedHeat: WANTED_HEAT_AFTER_CHECKPOINT,
                gameMode: "station",
            });
            get().addLog(i18nStore.t("pirate.checkpoint_bribed", { cost }), "info");
            playSound("ui_notification");
            return;
        }
        if (choice === "dump") {
            const quantity = state.ship.tradeGoods.find(
                (good) => good.item === "contraband",
            )?.quantity ?? 0;
            if (quantity === 0) {
                get().addLog(i18nStore.t("pirate.err_no_contraband"), "error");
                return;
            }
            set((s) => ({
                ship: {
                    ...s.ship,
                    tradeGoods: s.ship.tradeGoods.filter(
                        (good) => good.item !== "contraband",
                    ),
                },
                wantedHeat: WANTED_HEAT_AFTER_CHECKPOINT,
                gameMode: "station",
            }));
            get().addLog(i18nStore.t("pirate.checkpoint_dumped", { quantity }), "warning");
            playSound("ui_notification");
            return;
        }
        if (!canFightWantedPursuit(state.wantedHeat ?? 0)) {
            get().addLog(i18nStore.t("pirate.err_hunters_unavailable"), "error");
            return;
        }

        get().startCombat({
            id: `wanted-hunters-${state.turn}`,
            type: "enemy",
            name: i18nStore.t("pirate.hunters_name"),
            enemyType: "mercenary",
            threat: Math.min(4, (state.currentSector?.tier ?? 1) + 1),
        });
        set((s) => {
            if (s.currentCombat) s.currentCombat.wantedPursuit = true;
        });
    },

    refreshPirateStationContracts: () => {
        const state = get();
        const location = state.currentLocation;
        const sector = state.currentSector;
        if (!isPirateStation(location) || !sector) return;

        const refreshedLocation = { ...location };
        if (
            !refreshPirateContracts(
                refreshedLocation,
                sector.tier,
                state.turn,
                state.galaxy.sectors,
            )
        ) {
            return;
        }

        set((s) =>
            patchLocation(s, location.id, {
                pirateContracts: refreshedLocation.pirateContracts,
                pirateLastRefreshTurn: refreshedLocation.pirateLastRefreshTurn,
            }),
        );
        get().addLog(i18nStore.t("pirate.contract_board_refreshed"), "info");
    },
});
