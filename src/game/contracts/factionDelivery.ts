import type {
    Contract,
    DeliveryGoods,
    FactionDeliveryContext,
    PendingContractDecision,
} from "@/game/types";

export const FACTION_DELIVERY_CHANCE = 0.35;
export const LOCAL_DELIVERY_REWARD_MULTIPLIER = 0.65;

export const getFactionDeliveryContext = (
    cargo: DeliveryGoods,
): FactionDeliveryContext => {
    if (cargo === "spares" || cargo === "fuel") return "relief";
    if (cargo === "construction_materials") return "reconstruction";
    if (cargo === "scientific_equipment") return "research_access";
    return "diplomatic_claim";
};

export const getFactionDeliveryReward = (reward: number): number =>
    Math.floor(reward * LOCAL_DELIVERY_REWARD_MULTIPLIER);

export const getValidPendingContractDecision = (
    pending: PendingContractDecision | null | undefined,
    activeContracts: Contract[] | undefined,
): PendingContractDecision | null =>
    pending && activeContracts?.some(
        (contract) =>
            contract.id === pending.contractId &&
            contract.type === "delivery" &&
            contract.factionDelivery,
    )
        ? pending
        : null;
