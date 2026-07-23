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
import { formatContractDescription } from "@/game/contracts/formatContractDescription";

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
): boolean => {
    const state = get();
    if (state.activeContracts.some((c) => c.id === contract.id)) {
        get().addLog( i18nStore.t("game_logs.acceptContract_1"), "error");
        return false;
    }

    // Цель могла исчезнуть с момента генерации (враги убиты, шторм пройден)
    if (
        !isContractTargetAvailable(
            contract,
            state.galaxy.sectors,
            state.completedLocations,
            {
                artifacts: state.artifacts,
                researchedTechs: state.research.researchedTechs,
            },
        )
    ) {
        get().addLog( i18nStore.t("game_logs.acceptContract_2"), "error");
        return false;
    }

    // Проверка репутации для расовых контрактов
    if (contract.requiredRace && contract.isRaceQuest) {
        const isAvailable = isRaceContractAvailable(
            state.raceReputation,
            contract.requiredRace,
        );

        if (!isAvailable) {
            const raceName = i18nStore.t(`races.${contract.requiredRace}.plural`);
            get().addLog( i18nStore.t("game_logs.acceptContract_3", { raceName }),
                "error",
            );
            return false;
        }
    }

    if (contract.type === "delivery" && contract.cargo) {
        const cargoKey = contract.cargo as keyof typeof DELIVERY_GOODS;
        const cargoName = DELIVERY_GOODS[cargoKey]
            ? i18nStore.t(`delivery_goods.${cargoKey}`)
            : contract.cargo;
        const cargoMod = getActiveModule(state.ship.modules, "cargo");

        if (!cargoMod) {
            get().addLog( i18nStore.t("game_logs.acceptContract_4"), "error");
            return false;
        }

        // Проверяем реальный объём груза контракта против суммарной вместимости
        const cargoAmount = contract.quantity ?? DELIVERY_CONTRACT_CARGO_AMOUNT;

        const cur =
            state.ship.cargo.reduce((s, c) => s + c.quantity, 0) +
            state.ship.tradeGoods.reduce((s, g) => s + g.quantity, 0) +
            state.probes;

        if (cur + cargoAmount > getCargoCapacity(state)) {
            get().addLog( i18nStore.t("game_logs.acceptContract_5"), "error");
            return false;
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
    get().addLog( i18nStore.t("game_logs.acceptContract_7", {
        value: formatContractDescription(contract, i18nStore.t.bind(i18nStore)),
    }), "info");

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
    return true;
};
