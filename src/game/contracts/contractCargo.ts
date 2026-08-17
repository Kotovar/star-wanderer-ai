import { DELIVERY_CONTRACT_CARGO_AMOUNT } from "@/game/slices/contracts/constants";
import type { CargoItem, Contract, GameState } from "@/game/types";

export const getContractCargoQuantity = (
    cargo: CargoItem[],
    contractId: string,
): number =>
    cargo.reduce(
        (total, item) => total + (item.contractId === contractId ? item.quantity : 0),
        0,
    );

export const hasRequiredDeliveryCargo = (
    cargo: CargoItem[],
    contract: Pick<Contract, "id" | "quantity">,
): boolean =>
    getContractCargoQuantity(cargo, contract.id) >=
    (contract.quantity ?? DELIVERY_CONTRACT_CARGO_AMOUNT);

export const removeContractCargo = (
    ship: GameState["ship"],
    outposts: GameState["outposts"],
    contractIds: ReadonlySet<string>,
): Pick<GameState, "ship" | "outposts"> => ({
    ship: {
        ...ship,
        cargo: ship.cargo.filter(
            (item) => !contractIds.has(item.contractId ?? ""),
        ),
    },
    outposts: (outposts ?? []).map((outpost) => {
        const storedCargo = outpost.storedCargo;
        if (!storedCargo?.some((item) => contractIds.has(item.contractId ?? ""))) {
            return outpost;
        }
        return {
            ...outpost,
            storedCargo: storedCargo.filter(
                (item) => !contractIds.has(item.contractId ?? ""),
            ),
        };
    }),
});
