import { store as i18nStore } from "@/lib/useTranslation";
import { CONTRACT_REWARDS } from "@/game/constants";
import { giveCrewExperience } from "@/game/crew";
import { getReputationChanges } from "@/game/contracts/completionRewards";
import { getContractReputationChangeRequests } from "@/game/reputation/utils";
import type { GameState, GameStore, Location } from "@/game/types";

type SetState = {
    (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)): void;
};

/**
 * Завершает контракты отклика на кризис при возврате на планету-заказчика.
 *
 * Отличие от обычной поставки — не в проверке груза, а в том, что кризис
 * перестаёт быть чистым наказанием: пока он идёт, у игрока есть работа,
 * которая платит тем больше, чем хуже стадия, и поднимает репутацию сразу
 * со всеми известными расами, а не только с заказчиком.
 */
export const handleCrisisResponseContracts = (
    loc: Location,
    set: SetState,
    get: () => GameStore,
): void => {
    const ready = get().activeContracts.filter(
        (c) =>
            c.type === "crisis_response" &&
            c.sourcePlanetId === loc.id &&
            c.cargo,
    );

    for (const c of ready) {
        const requiredQty = c.quantity ?? 10;
        const cargoOwned = get().ship.tradeGoods.find((g) => g.item === c.cargo);
        if (!cargoOwned || cargoOwned.quantity < requiredQty) continue;

        set((s) => ({
            credits: s.credits + (c.reward ?? 0),
            ship: {
                ...s.ship,
                tradeGoods: s.ship.tradeGoods
                    .map((g) =>
                        g.item === c.cargo
                            ? { ...g, quantity: g.quantity - requiredQty }
                            : g,
                    )
                    .filter((g) => g.quantity > 0),
            },
            completedContractIds: [...s.completedContractIds, c.id],
            activeContracts: s.activeContracts.filter((ac) => ac.id !== c.id),
        }));

        get().addLog(
            i18nStore.t("game_logs.handleCrisisResponseContracts_1", {
                crisisName: c.crisisName ? i18nStore.t(c.crisisName) : "",
                loc_name: c.sourceName || loc.name,
                reward: c.reward,
            }),
            "info",
        );

        const expReward = CONTRACT_REWARDS.crisis_response.baseExp;
        const experience = giveCrewExperience(
            expReward,
            `Экипаж получил опыт: +${expReward} ед.`,
        );

        const reputationBefore = { ...get().raceReputation };
        for (const { raceId, amount } of getContractReputationChangeRequests(
            c,
            get().knownRaces,
        )) {
            get().changeReputation(raceId, amount);
        }

        get().showContractCompletion({
            contract: c,
            credits: c.reward,
            reputationChanges: getReputationChanges(
                reputationBefore,
                get().raceReputation,
            ),
            experience,
        });
    }
};
