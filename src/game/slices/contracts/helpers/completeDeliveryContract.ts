import { store as i18nStore } from "@/lib/useTranslation";
import type {
    Contract,
    FactionDeliveryChoice,
    GameStore,
    SetState,
} from "@/game/types";
import { CONTRACT_REWARDS } from "@/game/constants";
import { giveCrewExperience } from "@/game/crew";
import { getReputationChanges } from "@/game/contracts/completionRewards";
import { getFactionDeliveryReward } from "@/game/contracts/factionDelivery";
import { playSound } from "@/sounds";

const isDeliveryReady = (state: GameStore, contract: Contract): boolean =>
    state.currentLocation?.id === contract.targetLocationId &&
    state.ship.cargo.some((cargo) => cargo.contractId === contract.id);

const settleDeliveryContract = (
    contract: Contract,
    set: SetState,
    get: () => GameStore,
    choice?: FactionDeliveryChoice,
): void => {
    const credits =
        choice === "local"
            ? getFactionDeliveryReward(contract.reward)
            : contract.reward;

    set((s) => ({
        ship: {
            ...s.ship,
            cargo: s.ship.cargo.filter((cargo) => cargo.contractId !== contract.id),
        },
        credits: s.credits + credits,
        activeContracts: s.activeContracts.filter((active) => active.id !== contract.id),
        completedContractIds: [...s.completedContractIds, contract.id],
        ...(choice ? { pendingContractDecision: null } : {}),
    }));

    if (choice && contract.sourceDominantRace && contract.factionDelivery) {
        get().addLog(
            i18nStore.t(`game_logs.faction_delivery_${choice}`, {
                reward: credits,
                sourceRace: i18nStore.t(
                    `races.${contract.sourceDominantRace}.plural`,
                ),
                localRace: i18nStore.t(
                    `races.${contract.factionDelivery.localRace}.plural`,
                ),
            }),
            "info",
        );
    } else {
        get().addLog(
            i18nStore.t("game_logs.completeDeliveryContract_1", {
                reward: credits,
            }),
            "info",
        );
    }

    const expReward = CONTRACT_REWARDS.delivery.baseExp;
    const experience = giveCrewExperience(
        expReward,
        `Экипаж получил опыт: +${expReward} ед.`,
    );

    const reputationBefore = { ...get().raceReputation };
    if (choice === "local" && contract.sourceDominantRace && contract.factionDelivery) {
        get().changeReputation(contract.sourceDominantRace, -4, {
            excludeRippleRaceIds: [contract.factionDelivery.localRace],
        });
        get().changeReputation(contract.factionDelivery.localRace, 4, {
            excludeRippleRaceIds: [contract.sourceDominantRace],
        });
    } else if (contract.sourceDominantRace) {
        get().changeReputation(contract.sourceDominantRace, 2);
    }
    get().showContractCompletion({
        contract,
        credits,
        reputationChanges: getReputationChanges(
            reputationBefore,
            get().raceReputation,
        ),
        experience,
    });

    playSound("world_contract");
};

/**
 * Выполняет контракт на доставку
 * @param contractId - ID контракта
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const completeDeliveryContract = (
    contractId: string,
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();
    const contract = state.activeContracts.find((c) => c.id === contractId);
    if (!contract || contract.type !== "delivery") return;
    if (!isDeliveryReady(state, contract)) return;

    if (contract.factionDelivery) {
        if (state.pendingContractDecision) {
            return;
        }
        set({ pendingContractDecision: { contractId } });
        get().saveGame();
        return;
    }

    settleDeliveryContract(contract, set, get);
};

export const resolveFactionDeliveryDecision = (
    choice: FactionDeliveryChoice,
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();
    const pending = state.pendingContractDecision;
    if (!pending) return;

    const contract = state.activeContracts.find(
        (active) => active.id === pending.contractId,
    );
    if (
        !contract ||
        contract.type !== "delivery" ||
        !contract.factionDelivery ||
        !contract.sourceDominantRace ||
        !isDeliveryReady(state, contract)
    ) {
        set({ pendingContractDecision: null });
        return;
    }

    settleDeliveryContract(contract, set, get, choice);
};
