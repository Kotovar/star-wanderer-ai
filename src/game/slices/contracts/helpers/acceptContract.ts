import type { GameStore, SetState, Contract } from "@/game/types";
import { DELIVERY_GOODS } from "@/game/constants";
import { DELIVERY_CONTRACT_CARGO_AMOUNT } from "../constants";
import { playSound } from "@/sounds";
import { isRaceContractAvailable } from "@/game/reputation/utils";

/**
 * Принимает контракт
 * @param contract - Контракт для принятия
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const acceptContract = (
    contract: Contract,
    set: SetState,
    get: () => GameStore,
): void => {
    if (get().activeContracts.some((c) => c.id === contract.id)) {
        get().addLog("Уже принят!", "error");
        return;
    }

    // Проверка репутации для расовых контрактов
    if (contract.requiredRace && contract.isRaceQuest) {
        const state = get();
        const isAvailable = isRaceContractAvailable(
            state.raceReputation,
            contract.requiredRace,
        );

        if (!isAvailable) {
            const raceName =
                contract.requiredRace.charAt(0).toUpperCase() +
                contract.requiredRace.slice(1);
            get().addLog(
                `${raceName} не доверяют вам достаточно для этой задачи`,
                "error",
            );
            return;
        }
    }

    if (contract.type === "delivery" && contract.cargo) {
        const cargoKey = contract.cargo as keyof typeof DELIVERY_GOODS;
        const cargoName = DELIVERY_GOODS[cargoKey]?.name || contract.cargo;
        const cargoMod = get().ship.modules.find((m) => m.type === "cargo");

        if (!cargoMod) {
            get().addLog("Нет грузового отсека!", "error");
            return;
        }

        const cur =
            get().ship.cargo.reduce((s, c) => s + c.quantity, 0) +
            get().ship.tradeGoods.reduce((s, g) => s + g.quantity, 0) +
            get().probes;

        if (
            cargoMod.capacity &&
            cur + DELIVERY_CONTRACT_CARGO_AMOUNT > cargoMod.capacity
        ) {
            get().addLog("Недостаточно места!", "error");
            return;
        }

        const cargoAmount = contract.quantity ?? DELIVERY_CONTRACT_CARGO_AMOUNT;
        set((s) => ({
            ship: {
                ...s.ship,
                cargo: [
                    ...s.ship.cargo,
                    {
                        item: cargoKey,
                        quantity: cargoAmount,
                        contractId: contract.id,
                    },
                ],
            },
        }));
        get().addLog(`Загружен: ${cargoName} (${cargoAmount}т)`, "info");
    }

    set((s) => ({
        activeContracts: [
            ...s.activeContracts,
            { ...contract, acceptedAt: s.turn },
        ],
    }));
    get().addLog(`Задача принята: ${contract.desc}`, "info");

    // Special message for supply_run contracts
    if (contract.type === "supply_run") {
        get().addLog(
            `📍 Доставить на: ${contract.sourceType === "planet" ? "Планета" : "Корабль"} "${contract.sourceName}" (${contract.sourceSectorName})`,
            "warning",
        );
    }

    playSound("success");
};
