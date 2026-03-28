import type { SetState, GameStore } from "@/game/types";
import type { DiveRewards } from "@/game/types/exploration";
import { RESEARCH_RESOURCES } from "@/game/constants";
import { addTradeGood } from "@/game/slices/ship/helpers";

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

    // Build resource updates for research inventory
    const resourceUpdates: Record<string, number> = {};
    const resourceTypes = [
        "alien_biology",
        "rare_minerals",
        "void_membrane",
    ] as const;

    for (const type of resourceTypes) {
        const qty = boostedRewards[type];
        if (qty > 0) {
            resourceUpdates[type] = qty;
            const rd = RESEARCH_RESOURCES[type];
            logParts.push(`${rd?.icon ?? ""} ${rd?.name ?? type} ×${qty}`);
        }
    }

    const membranesCollected = boostedRewards.void_membrane;

    const cargoCapacity = get().getCargoCapacity();

    set((s) => {
        // Add research resources to player inventory
        // rare_minerals goes to cargo (it's also a trade good); others go to research
        const newResources = { ...s.research.resources };
        const cargoUsed =
            s.ship.cargo.reduce((sum, c) => sum + c.quantity, 0) +
            s.ship.tradeGoods.reduce((sum, g) => sum + g.quantity, 0);
        let availableSpace = Math.max(0, cargoCapacity - cargoUsed);
        let newTradeGoods = [...s.ship.tradeGoods];

        for (const [type, qty] of Object.entries(resourceUpdates)) {
            if (type === "rare_minerals") {
                const actual = Math.min(qty, availableSpace);
                if (actual > 0) {
                    newTradeGoods = addTradeGood(newTradeGoods, "rare_minerals", actual);
                    availableSpace -= actual;
                }
            } else {
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

        // Update location with cooldown
        const updateLocations = (locs: NonNullable<typeof s.currentSector>["locations"]) =>
            locs.map((l) =>
                l.id === locationId
                    ? { ...l, gasGiantLastDiveAt: s.turn }
                    : l,
            );

        return {
            activeDive: null,
            turn: s.turn + 1,
            activeContracts: updatedContracts,
            ship: { ...s.ship, tradeGoods: newTradeGoods },
            research: {
                ...s.research,
                resources: newResources,
            },
            currentSector: s.currentSector
                ? {
                      ...s.currentSector,
                      locations: updateLocations(s.currentSector.locations),
                  }
                : null,
            currentLocation:
                s.currentLocation?.id === locationId
                    ? { ...s.currentLocation, gasGiantLastDiveAt: s.turn }
                    : s.currentLocation,
            galaxy: {
                ...s.galaxy,
                sectors: s.galaxy.sectors.map((sec) =>
                    sec.id === s.currentSector?.id
                        ? { ...sec, locations: updateLocations(sec.locations) }
                        : sec,
                ),
            },
        };
    });

    if (logParts.length > 0) {
        get().addLog(
            `🪸 Зонд всплыл. Собрано: ${logParts.join(", ")}`,
            "info",
        );
    } else {
        get().addLog("🪸 Зонд всплыл. Ничего не найдено.", "info");
    }

    get().updateShipStats();
}
