import { store as i18nStore } from "@/lib/useTranslation";
import type { GameStore, SetState } from "@/game/types";
import { toast } from "sonner";
import { isContractExpired } from "@/game/contracts/contractDeadline";
import { formatContractDescription } from "@/game/contracts/formatContractDescription";
import { removeContractCargo } from "@/game/contracts/contractCargo";
import { clampWantedHeat } from "@/game/slices/pirate/wanted";
import {
    clampPirateStanding,
    PIRATE_STANDING_ON_EXPIRY,
} from "@/game/slices/pirate/standing";

const isPirateContract = (type: string): boolean =>
    type === "pirate_smuggling" ||
    type === "pirate_bounty" ||
    type === "pirate_heist";

/**
 * Проверяет просроченные контракты и применяет штраф к репутации рас.
 * Вызывается каждый ход в gameLoopSlice.nextTurn.
 */
export const checkContractExpiry = (
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();
    const currentTurn = state.turn;

    const expired = state.activeContracts.filter(
        (contract) => isContractExpired(contract, currentTurn),
    );

    if (expired.length === 0) return;

    const expiredIds = new Set(expired.map((contract) => contract.id));
    const expiredPirateCount = expired.filter((contract) =>
        isPirateContract(contract.type),
    ).length;
    const removeExpiredOffers = <T extends { id: string }>(offers?: T[]): T[] | undefined =>
        offers?.some((offer) => expiredIds.has(offer.id))
            ? offers.filter((offer) => !expiredIds.has(offer.id))
            : offers;

    set((s) => {
        const contractCargo = removeContractCargo(
            s.ship,
            s.outposts,
            expiredIds,
        );
        const removeFromLocation = (location: (typeof s.galaxy.sectors)[number]["locations"][number]) => {
            const contracts = removeExpiredOffers(location.contracts);
            const pirateContracts = removeExpiredOffers(location.pirateContracts);
            return contracts === location.contracts &&
                pirateContracts === location.pirateContracts
                ? location
                : { ...location, contracts, pirateContracts };
        };
        const sectors = s.galaxy.sectors.map((sector) => ({
            ...sector,
            locations: sector.locations.map(removeFromLocation),
        }));
        const currentSector = s.currentSector
            ? {
                  ...s.currentSector,
                  locations: s.currentSector.locations.map(removeFromLocation),
              }
            : null;
        const currentLocation = s.currentLocation
            ? removeFromLocation(s.currentLocation)
            : null;

        return {
            ...contractCargo,
            activeContracts: s.activeContracts.filter(
                (contract) => !expiredIds.has(contract.id),
            ),
            wantedHeat: clampWantedHeat(
                (s.wantedHeat ?? 0) + expiredPirateCount * 10,
            ),
            // Подвести заказчика дороже, чем выполнить заказ: репутация теряется
            // быстрее, чем набирается
            pirateStanding: clampPirateStanding(
                (s.pirateStanding ?? 0) -
                    expiredPirateCount * PIRATE_STANDING_ON_EXPIRY,
            ),
            galaxy: { ...s.galaxy, sectors },
            currentSector,
            currentLocation,
        };
    });

    expired.forEach((c) => {
        const description = formatContractDescription(
            c,
            i18nStore.t.bind(i18nStore),
        );
        get().addLog( i18nStore.t("game_logs.checkContractExpiry_1", { value: description }),
            "warning",
        );
        toast.warning(
            i18nStore.t("contracts.expired_toast", { contract: description }),
        );
        if (isPirateContract(c.type)) {
            get().addLog(i18nStore.t("pirate.contract_expired_heat"), "warning");
            return;
        }
        const issuerRace = c.requiredRace ?? c.sourceDominantRace;
        if (issuerRace) {
            get().changeReputation(issuerRace, c.isRaceQuest ? -10 : -2);
        }
    });
};
