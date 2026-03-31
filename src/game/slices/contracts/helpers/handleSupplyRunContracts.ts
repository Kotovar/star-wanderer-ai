import { CONTRACT_REWARDS } from "@/game/constants";
import { giveCrewExperience } from "@/game/crew";
import type { GameState, GameStore, Location } from "@/game/types";

// Тип для set с поддержкой immer (позволяет и мутации, и объекты)
type SetState = {
    (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)): void;
};

/**
 * Обрабатывает контракты на поставку (supply_run)
 * Проверяет доставку груза на планету и завершает контракты
 * @param loc - Локация (планета)
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const handleSupplyRunContracts = (
    loc: Location,
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();

    const supplyComplete = get().activeContracts.filter(
        (c) =>
            c.type === "supply_run" && c.sourcePlanetId === loc.id && c.cargo,
    );

    supplyComplete.forEach((c) => {
        const cargoOwned = state.ship.tradeGoods.find(
            (g) => g.item === c.cargo,
        );
        const requiredQty = c.quantity || 15;

        if (!cargoOwned || cargoOwned.quantity < requiredQty) return;

        set((s) => ({
            credits: s.credits + (c.reward || 0),
            ship: {
                ...s.ship,
                tradeGoods: s.ship.tradeGoods
                    .map((g) =>
                        g.item === c.cargo
                            ? {
                                  ...g,
                                  quantity: g.quantity - requiredQty,
                              }
                            : g,
                    )
                    .filter((g) => g.quantity > 0),
            },
            completedContractIds: [...s.completedContractIds, c.id],
            activeContracts: s.activeContracts.filter((ac) => ac.id !== c.id),
        }));
        get().addLog(
            `📦 Контракт выполнен: ${c.desc} (доставлено на ${c.sourceName}) +${c.reward}₢`,
            "info",
        );
        // Give experience to all crew members
        const expReward = CONTRACT_REWARDS.supply_run.baseExp;
        giveCrewExperience(expReward, `Экипаж получил опыт: +${expReward} ед.`);
        if (c.sourceDominantRace) {
            get().changeReputation(c.sourceDominantRace, 2);
        }
    });
};
