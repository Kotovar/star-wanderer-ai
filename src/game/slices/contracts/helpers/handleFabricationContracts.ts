import { store as i18nStore } from "@/lib/useTranslation";
import { CONTRACT_REWARDS } from "@/game/constants";
import { giveCrewExperience } from "@/game/crew";
import { getReputationChanges } from "@/game/contracts/completionRewards";
import { getWeaponTypeName } from "@/lib/translationHelpers";
import type { GameState, GameStore, Location } from "@/game/types";

type SetState = {
    (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)): void;
};

/** Репутация расе-заказчику за сданный заказ */
const SOURCE_REPUTATION = 3;

/**
 * Завершает контракты на изготовление при возврате на планету-заказчика.
 *
 * Единственный тип контракта, который тратит сделанное игроком, а не
 * найденное: сдаётся ровно одно собранное орудие из грузового отсека.
 */
export const handleFabricationContracts = (
    loc: Location,
    set: SetState,
    get: () => GameStore,
): void => {
    const ready = get().activeContracts.filter(
        (c) =>
            c.type === "fabrication" &&
            c.sourcePlanetId === loc.id &&
            c.requiredWeaponType,
    );

    for (const c of ready) {
        const cargoIndex = get().ship.cargo.findIndex(
            (item) =>
                item.isCraftedWeapon &&
                item.weaponType === c.requiredWeaponType &&
                item.quantity > 0,
        );
        if (cargoIndex === -1) continue;

        set((s) => ({
            credits: s.credits + (c.reward ?? 0),
            ship: {
                ...s.ship,
                // Сдаётся ровно одна единица, остальной запас остаётся у игрока
                cargo: s.ship.cargo
                    .map((item, index) =>
                        index === cargoIndex
                            ? { ...item, quantity: item.quantity - 1 }
                            : item,
                    )
                    .filter((item) => item.quantity > 0),
            },
            completedContractIds: [...s.completedContractIds, c.id],
            activeContracts: s.activeContracts.filter((ac) => ac.id !== c.id),
        }));

        get().addLog(
            i18nStore.t("game_logs.handleFabricationContracts_1", {
                weapon: getWeaponTypeName(
                    c.requiredWeaponType,
                    i18nStore.t.bind(i18nStore),
                ),
                loc_name: c.sourceName || loc.name,
                reward: c.reward,
            }),
            "info",
        );

        const expReward = CONTRACT_REWARDS.fabrication.baseExp;
        const experience = giveCrewExperience(
            expReward,
            `Экипаж получил опыт: +${expReward} ед.`,
        );

        const reputationBefore = { ...get().raceReputation };
        if (c.sourceDominantRace) {
            get().changeReputation(c.sourceDominantRace, SOURCE_REPUTATION);
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
