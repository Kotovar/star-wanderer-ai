import { CONTRACT_REWARDS } from "@/game/constants";
import { getReputationChanges } from "@/game/contracts/completionRewards";
import { getCrewDisplayName } from "@/game/crew/crewNames";
import { shiftHappiness } from "@/game/crew/happiness";
import { getLivingShipCrew } from "@/game/crew/stationed";
import type {
    Contract,
    GameStore,
    Location,
    SetState,
    TraitId,
} from "@/game/types";
import { patchLocation } from "@/game/utils/patchLocation";
import { store as i18nStore } from "@/lib/useTranslation";
import { playSound } from "@/sounds";
import { refreshPirateContracts } from "./contracts";
import { startWantedPursuit } from "./interception";
import { assaultPirateBase, hasActivePiratePurge } from "./purge";
import {
    clampPirateStanding,
    getPirateContractReward,
    getPirateRank,
    PIRATE_STANDING_PER_CONTRACT,
} from "./standing";
import {
    canFightWantedPursuit,
    clampWantedHeat,
    getHeatAfterCheckpoint,
    getWantedBribeCost,
    isWantedCheckpointRequired,
} from "./wanted";

/**
 * Кому пиратский подряд не по нутру: торговцу, который живёт репутацией, и
 * тем, кто держит команду именем. Раньше «принципиальность» определялась по
 * эффектам combatStartMoraleDrain и sellPriceBonus — то есть под неё попадал
 * Пессимист, к законопослушности отношения не имеющий.
 */
const LAWFUL_TRAIT_IDS: TraitId[] = ["trader", "leader", "legend", "veteran"];

const LAWFUL_CONTRACT_MORALE_PENALTY = 5;

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
    assaultPirateBase: () => void;
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
        // Взял подряд на пиратов — на их доске тебе больше не работать
        if (hasActivePiratePurge(state.activeContracts)) {
            get().addLog(i18nStore.t("pirate.err_board_closed"), "error");
            return;
        }

        const target = state.galaxy.sectors
            .flatMap((sector) => sector.locations)
            .find((candidate) => candidate.id === contract.targetLocationId);
        if (!target || (contract.type === "pirate_bounty" && target.defeated)) {
            get().addLog(i18nStore.t("pirate.err_target_unavailable"), "error");
            return;
        }

        // Возмущаются только те, кто на борту и жив: труп и приписанный к
        // аванпосту за несколько секторов о подряде не узнают. Мораль двигаем
        // через shiftHappiness — он знает про Отшельника и расы без настроения
        const upsetIds = new Set(
            getLivingShipCrew(state.crew)
                .filter((crewMember) =>
                    crewMember.traits?.some(
                        (trait) =>
                            trait.id !== undefined &&
                            LAWFUL_TRAIT_IDS.includes(trait.id),
                    ),
                )
                .map((crewMember) => crewMember.id),
        );

        set((s) => ({
            activeContracts: [
                ...s.activeContracts,
                { ...contract, acceptedAt: s.turn, pirateObjectiveComplete: false },
            ],
            crew: s.crew.map((crewMember) =>
                upsetIds.has(crewMember.id)
                    ? shiftHappiness(
                          crewMember,
                          -LAWFUL_CONTRACT_MORALE_PENALTY,
                      )
                    : crewMember,
            ),
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

        // Платят по репутации: подельнику до +50%. Та же функция считает
        // награду на доске — показанная и начисленная суммы обязаны совпадать
        const standing = state.pirateStanding ?? 0;
        const reward = getPirateContractReward(contract.reward, standing);
        const newStanding = clampPirateStanding(
            standing + PIRATE_STANDING_PER_CONTRACT,
        );

        // Сдача задания розыск не снижает: раньше молчаливые −20 делали
        // контрабанду (+8 за передачу) чистым минусом по розыску, и «Приют
        // контрабандистов» вместе со взятками терял всякий смысл
        set((s) => ({
            credits: s.credits + reward,
            pirateStanding: newStanding,
            activeContracts: s.activeContracts.filter(
                (active) => active.id !== contractId,
            ),
            completedContractIds: s.completedContractIds.includes(contractId)
                ? s.completedContractIds
                : [...s.completedContractIds, contractId],
        }));

        if (getPirateRank(newStanding) !== getPirateRank(standing)) {
            get().addLog(
                i18nStore.t("pirate.rank_up", {
                    rank: i18nStore.t(`pirate.rank_${getPirateRank(newStanding)}`),
                }),
                "info",
            );
            playSound("world_contract");
        }

        // Опыт — только тем, кто на борту и жив: giveCrewExperience раздаёт
        // его всему списку, включая трупы и приписанных к аванпостам
        const experience = getLivingShipCrew(get().crew).flatMap((crewMember) => {
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
            credits: reward,
            reputationChanges: getReputationChanges(
                state.raceReputation,
                get().raceReputation,
            ),
            experience,
        });
        get().addLog(
            i18nStore.t("pirate.contract_completed", { reward }),
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
            set((s) => ({
                credits: s.credits - cost,
                wantedHeat: getHeatAfterCheckpoint(s.wantedHeat ?? 0),
                gameMode: "station",
            }));
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
                wantedHeat: getHeatAfterCheckpoint(s.wantedHeat ?? 0, quantity),
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

        // Не засада: на прорыв игрок идёт сам и подготовленным, в отличие
        // от перехвата на подлёте к сектору
        startWantedPursuit(set, get);
    },

    assaultPirateBase: () => assaultPirateBase(set, get),

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
