import type { GameStore, SetState } from "@/game/types";
import { store as i18nStore } from "@/lib/useTranslation";
import { playSound } from "@/sounds";
import { refreshPirateContracts } from "./contracts";

export interface PirateSlice {
    acceptPirateContract: (contractId: string) => void;
    completePirateContract: (contractId: string) => void;
    reducePirateHeat: (amount: number, cost: number) => void;
    refreshPirateStationContracts: () => void;
}

/**
 * Создаёт слайс пиратских механик
 */
export const createPirateSlice = (
    set: SetState,
    get: () => GameStore,
): PirateSlice => ({
    acceptPirateContract: (contractId) => {
        const state = get();
        const loc = state.currentLocation;
        if (!loc || loc.type !== "station" || !loc.stationConfig?.isPirate) {
            get().addLog("Здесь нет пиратских контрактов", "error");
            return;
        }

        const contract = loc.pirateContracts?.find((c) => c.id === contractId);
        if (!contract) {
            get().addLog("Контракт не найден", "error");
            return;
        }

        if (state.activeContracts.some((c) => c.id === contractId)) {
            get().addLog("Уже принят!", "error");
            return;
        }

        set((s) => ({
            activeContracts: [
                ...s.activeContracts,
                { ...contract, acceptedAt: s.turn },
            ],
        }));

        // Crew morale impact: lawful crew dislikes pirate work
        set((s) => ({
            crew: s.crew.map((c) => {
                const lawful = c.traits?.some(
                    (t) =>
                        t.effect.combatStartMoraleDrain ||
                        t.effect.sellPriceBonus,
                );
                if (lawful) {
                    return { ...c, happiness: Math.max(0, c.happiness - 5) };
                }
                return c;
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

    completePirateContract: (contractId) => {
        const state = get();
        const contract = state.activeContracts.find((c) => c.id === contractId);
        if (!contract) return;

        const loc = state.currentLocation;
        const isAtPirateStation =
            loc?.type === "station" && loc.stationConfig?.isPirate;

        if (!isAtPirateStation) {
            get().addLog(
                "Пиратские контракты сдаются только на пиратских станциях",
                "error",
            );
            return;
        }

        set((s) => {
            s.credits += contract.reward;
            s.activeContracts = s.activeContracts.filter(
                (c) => c.id !== contractId,
            );
            s.completedContractIds.push(contractId);
            if (s.currentLocation) {
                s.currentLocation.pirateHeat = Math.max(
                    0,
                    (s.currentLocation.pirateHeat ?? 0) - 5,
                );
            }
            return s;
        });

        get().addLog(
            `Пиратская задача выполнена! +${contract.reward}₢`,
            "info",
        );
        playSound("ui_notification");
    },

    reducePirateHeat: (amount, cost) => {
        const state = get();
        const loc = state.currentLocation;
        if (!loc || loc.type !== "station" || !loc.stationConfig?.isPirate) {
            get().addLog("Здесь нет услуг смывки", "error");
            return;
        }

        if (state.credits < cost) {
            get().addLog("Недостаточно кредитов", "error");
            return;
        }

        set((s) => {
            s.credits -= cost;
            if (s.currentLocation) {
                s.currentLocation.pirateHeat = Math.max(
                    0,
                    (s.currentLocation.pirateHeat ?? 0) - amount,
                );
            }
            return s;
        });

        get().addLog(`☠️ Смывка записей: тепло -${amount}`, "info");
        playSound("ui_notification");
    },

    refreshPirateStationContracts: () => {
        const state = get();
        const loc = state.currentLocation;
        if (!loc || loc.type !== "station" || !loc.stationConfig?.isPirate) {
            return;
        }

        const sector = state.currentSector;
        if (!sector) return;

        const refreshed = refreshPirateContracts(
            loc,
            sector.tier,
            state.turn,
        );
        if (!refreshed) return;

        // Sync the refreshed location back into both currentSector and galaxy.sectors
        set((s) => {
            if (!s.currentSector) return s;
            const sectorIdx = s.currentSector.locations.findIndex(
                (l) => l.id === loc.id,
            );
            if (sectorIdx < 0) return s;

            s.currentSector.locations[sectorIdx] = s.currentLocation ?? loc;

            const galaxySector = s.galaxy.sectors.find(
                (gs) => gs.id === s.currentSector?.id,
            );
            if (galaxySector) {
                const gIdx = galaxySector.locations.findIndex(
                    (l) => l.id === loc.id,
                );
                if (gIdx >= 0) {
                    galaxySector.locations[gIdx] = s.currentLocation ?? loc;
                }
            }

            return s;
        });
        get().addLog("Пиратская доска контрактов обновлена", "info");
    },
});
