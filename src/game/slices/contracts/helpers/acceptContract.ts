import { store as i18nStore } from "@/lib/useTranslation";
import type { GameStore, SetState, Contract } from "@/game/types";
import { DELIVERY_GOODS } from "@/game/constants";
import { DELIVERY_CONTRACT_CARGO_AMOUNT } from "../constants";
import { playSound } from "@/sounds";
import { getContractReputationImpact } from "@/game/reputation/utils";
import { getActiveModule } from "@/game/modules";
import { getCargoCapacity } from "@/game/slices/ship/helpers/getCargoCapacity";
import { isRaceContractAvailable } from "@/game/reputation/utils";
import { isContractTargetAvailable } from "@/game/contracts/targetAvailability";

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
        get().addLog( i18nStore.t("game_logs.acceptContract_1"), "error");
        return;
    }

    // Цель могла исчезнуть с момента генерации (враги убиты, шторм пройден)
    if (
        !isContractTargetAvailable(
            contract,
            get().galaxy.sectors,
            get().completedLocations,
        )
    ) {
        get().addLog( i18nStore.t("game_logs.acceptContract_2"), "error");
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
            const raceName = i18nStore.t(`races.${contract.requiredRace}.plural`);
            get().addLog( i18nStore.t("game_logs.acceptContract_3", { raceName }),
                "error",
            );
            return;
        }
    }

    if (contract.type === "delivery" && contract.cargo) {
        const cargoKey = contract.cargo as keyof typeof DELIVERY_GOODS;
        const cargoName = DELIVERY_GOODS[cargoKey]
            ? i18nStore.t(`delivery_goods.${cargoKey}`)
            : contract.cargo;
        const cargoMod = getActiveModule(get().ship.modules, "cargo");

        if (!cargoMod) {
            get().addLog( i18nStore.t("game_logs.acceptContract_4"), "error");
            return;
        }

        // Проверяем реальный объём груза контракта против суммарной вместимости
        const cargoAmount = contract.quantity ?? DELIVERY_CONTRACT_CARGO_AMOUNT;

        const cur =
            get().ship.cargo.reduce((s, c) => s + c.quantity, 0) +
            get().ship.tradeGoods.reduce((s, g) => s + g.quantity, 0) +
            get().probes;

        if (cur + cargoAmount > getCargoCapacity(get())) {
            get().addLog( i18nStore.t("game_logs.acceptContract_5"), "error");
            return;
        }
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
        get().addLog( i18nStore.t("game_logs.acceptContract_6", { cargoName, cargoAmount }), "info");
    }

    set((s) => ({
        activeContracts: [
            ...s.activeContracts,
            { ...contract, acceptedAt: s.turn },
        ],
    }));
    // desc расовых квестов — ключ перевода; t() вернёт строку как есть, если это не ключ
    get().addLog( i18nStore.t("game_logs.acceptContract_7", { value: i18nStore.t(contract.desc) }), "info");

    const reputationImpact = getContractReputationImpact(contract);
    if (reputationImpact.length > 1) {
        get().addLog(
            i18nStore.t("game_logs.diplomacy_consequences", {
                list: reputationImpact
                    .map(({ raceId, change }) =>
                        `${i18nStore.t(`races.${raceId}.name`)} ${change > 0 ? "+" : ""}${change}`,
                    )
                    .join(" · "),
            }),
            "warning",
        );
    }

    // Special message for supply_run contracts
    if (contract.type === "supply_run") {
        get().addLog( i18nStore.t("game_logs.acceptContract_8", { value: i18nStore.t(contract.sourceType === "planet" ? "game_logs.deliver_to_planet" : "game_logs.deliver_to_ship"), sourceName: contract.sourceName ?? "", sourceSectorName: contract.sourceSectorName ?? "" }),
            "warning",
        );
    }

    playSound("success");
};
