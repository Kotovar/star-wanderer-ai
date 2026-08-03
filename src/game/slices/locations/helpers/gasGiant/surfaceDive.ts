import { store as i18nStore } from "@/lib/useTranslation";
import { maybeRevealRunProfileArcTarget } from "@/game/galaxy/runProfileArcs";
import type { SetState, GameStore } from "@/game/types";
import type { DiveRewards } from "@/game/types/exploration";
import { RESEARCH_RESOURCES } from "@/game/constants";
import { getStarTypeEffect } from "@/game/constants/starEffects";
import {
    addTradeGoodWithinCapacity,
    getFreeCargoSpace,
} from "@/game/slices/ship/helpers";
import { patchLocation } from "@/game/utils/patchLocation";

type DiveResourceKey = keyof DiveRewards;

// Atmosphere determines which resource gets a +50% bonus (rounded up)
// nitrogen = balanced: +25% to all resources instead
const ATMOSPHERE_BONUS: Partial<Record<string, DiveResourceKey>> = {
    hydrogen: "alien_biology",
    methane: "rare_minerals",
    ammonia: "void_membrane",
};

export function surfaceDive(set: SetState, get: () => GameStore): void {
    const state = get();
    const dive = state.activeDive;
    if (!dive || dive.currentEvent) return;

    const { rewards, locationId } = dive;
    const logParts: string[] = [];

    // Determine atmosphere bonus
    const location = state.currentSector?.locations.find((l) => l.id === locationId);
    const atmosphere = location?.gasGiantAtmosphere;

    // Apply atmosphere-specific resource bonus
    const boostedRewards = { ...rewards };
    if (atmosphere === "nitrogen") {
        // Nitrogen: +25% to everything (balanced atmosphere)
        boostedRewards.alien_biology = Math.ceil(rewards.alien_biology * 1.25);
        boostedRewards.rare_minerals = Math.ceil(rewards.rare_minerals * 1.25);
        boostedRewards.void_membrane = Math.ceil(rewards.void_membrane * 1.25);
    } else if (atmosphere) {
        const bonusResource = ATMOSPHERE_BONUS[atmosphere];
        if (bonusResource !== undefined) {
            const base = rewards[bonusResource];
            if (base > 0) {
                boostedRewards[bonusResource] = Math.ceil(base * 1.5);
            }
        }
    }

    // Бонус от типа звезды текущего сектора (коричневый карлик/газовый гигант)
    const starGasDiveBonus = state.currentSector
        ? getStarTypeEffect(state.currentSector.star.type).gasDiveYieldBonus ?? 0
        : 0;
    if (starGasDiveBonus > 0) {
        boostedRewards.alien_biology = Math.ceil(boostedRewards.alien_biology * (1 + starGasDiveBonus));
        boostedRewards.rare_minerals = Math.ceil(boostedRewards.rare_minerals * (1 + starGasDiveBonus));
        boostedRewards.void_membrane = Math.ceil(boostedRewards.void_membrane * (1 + starGasDiveBonus));
    }

    // Build resource updates for research inventory
    const resourceUpdates: Record<string, number> = {};
    const resourceTypes = [
        "alien_biology",
        "rare_minerals",
        "void_membrane",
    ] as const;

    const cargoResult = addTradeGoodWithinCapacity(
        state.ship.tradeGoods,
        "rare_minerals",
        boostedRewards.rare_minerals,
        getFreeCargoSpace(state),
    );
    boostedRewards.rare_minerals = cargoResult.accepted;

    for (const type of resourceTypes) {
        const qty = boostedRewards[type];
        if (qty > 0) {
            resourceUpdates[type] = qty;
            const rd = RESEARCH_RESOURCES[type];
            logParts.push(`${rd?.icon ?? ""} ${rd?.name ?? type} ×${qty}`);
        }
    }

    const membranesCollected = boostedRewards.void_membrane;

    set((s) => {
        // Add research resources to player inventory
        // rare_minerals goes to cargo (it's also a trade good); others go to research
        const newResources = { ...s.research.resources };

        for (const [type, qty] of Object.entries(resourceUpdates)) {
            if (type !== "rare_minerals") {
                newResources[type as keyof typeof newResources] =
                    (newResources[type as keyof typeof newResources] ?? 0) + qty;
            }
        }

        // Track void_membrane progress toward active gas_dive contracts
        const updatedContracts =
            membranesCollected > 0
                ? s.activeContracts.map((c) =>
                      c.type === "gas_dive"
                          ? {
                                ...c,
                                collectedMembranes:
                                    (c.collectedMembranes ?? 0) +
                                    membranesCollected,
                            }
                          : c,
                  )
                : s.activeContracts;

        return {
            activeDive: null,
            turn: s.turn + 1,
            activeContracts: updatedContracts,
            ship: { ...s.ship, tradeGoods: cargoResult.tradeGoods },
            research: {
                ...s.research,
                resources: newResources,
            },
            // Кулдаун погружения на локации
            ...patchLocation(s, locationId, { gasGiantLastDiveAt: s.turn }),
        };
    });
    maybeRevealRunProfileArcTarget(set, get);

    if (cargoResult.discarded > 0) {
        get().addLog( i18nStore.t("game_logs.cargo_overflow", { discarded: cargoResult.discarded }), "warning");
    }

    if (logParts.length > 0) {
        get().addLog( i18nStore.t("game_logs.surfaceDive_1", { value: logParts.join(", ") }),
            "info",
        );
    } else {
        get().addLog( i18nStore.t("game_logs.surfaceDive_2"), "info");
    }

    get().updateShipStats();
}
