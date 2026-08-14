import { store as i18nStore } from "@/lib/useTranslation";
import type { SetState, GameStore } from "@/game/types";
import type { ExpeditionReward } from "@/game/types/exploration";
import { RESEARCH_RESOURCES, TRADE_GOODS } from "@/game/constants";
import {
    addTradeGoodWithinCapacity,
    getFreeCargoSpace,
} from "@/game/slices/ship/helpers";
import { discoverArtifact } from "@/game/slices/artifacts/helpers/tryFindArtifact";

/**
 * Применяет накопленные награды экспедиции к состоянию игры
 */
export function collectExpeditionRewards(
    rewards: ExpeditionReward,
    set: SetState,
    get: () => GameStore,
): void {
    // Credits
    if (rewards.credits > 0) {
        set((s) => ({ credits: s.credits + rewards.credits }));
        get().addLog( i18nStore.t("game_logs.collectExpeditionRewards_1", { credits: rewards.credits }), "info");
    }

    // Trade goods
    if (rewards.tradeGoods.length > 0) {
        const state = get();
        let tradeGoods = state.ship.tradeGoods;
        let cargoSpace = getFreeCargoSpace(state);
        const cargoResults = rewards.tradeGoods.map((tg) => {
            const result = addTradeGoodWithinCapacity(
                tradeGoods,
                tg.id,
                tg.quantity,
                cargoSpace,
            );
            tradeGoods = result.tradeGoods;
            cargoSpace -= result.accepted;
            return result;
        });
        set((s) => ({ ship: { ...s.ship, tradeGoods } }));
        rewards.tradeGoods.forEach((tg, index) => {
            const result = cargoResults[index];
            if (!result || result.accepted === 0) return;
            const name = TRADE_GOODS[tg.id]?.name ?? tg.id;
            get().addLog( i18nStore.t("game_logs.collectExpeditionRewards_2", { name, quantity: result.accepted }), "info");
        });
        const discarded = cargoResults.reduce(
            (sum, result) => sum + result.discarded,
            0,
        );
        if (discarded > 0) {
            get().addLog( i18nStore.t("game_logs.cargo_overflow", { discarded }), "warning");
        }
    }

    // Research resources
    if (rewards.researchResources.length > 0) {
        const regularResources = rewards.researchResources.filter(
            (res) => res.type !== "rare_minerals",
        );
        const rareMineralsReward = rewards.researchResources.find(
            (res) => res.type === "rare_minerals",
        );
        let rareMineralsAccepted = rareMineralsReward?.quantity ?? 0;

        // Regular research resources → research.resources
        if (regularResources.length > 0) {
            set((s) => {
                const updated = { ...s.research.resources };
                for (const res of regularResources) {
                    updated[res.type] = (updated[res.type] ?? 0) + res.quantity;
                }
                return { research: { ...s.research, resources: updated } };
            });
        }

        // rare_minerals is a dual resource: lives in ship.tradeGoods so it
        // shows up in both the cargo hold AND the research panel (which sums both).
        if (rareMineralsReward) {
            const state = get();
            const cargoResult = addTradeGoodWithinCapacity(
                state.ship.tradeGoods,
                "rare_minerals",
                rareMineralsReward.quantity,
                getFreeCargoSpace(state),
            );
            set((s) => ({
                ship: {
                    ...s.ship,
                    tradeGoods: cargoResult.tradeGoods,
                },
            }));
            rareMineralsAccepted = cargoResult.accepted;
            if (cargoResult.discarded > 0) {
                get().addLog( i18nStore.t("game_logs.cargo_overflow", { discarded: cargoResult.discarded }), "warning");
            }
        }

        for (const res of rewards.researchResources) {
            const quantity =
                res.type === "rare_minerals"
                    ? rareMineralsAccepted
                    : res.quantity;
            if (quantity === 0) continue;
            const rd = RESEARCH_RESOURCES[res.type];
            get().addLog( i18nStore.t("game_logs.collectExpeditionRewards_3", { value: rd?.icon ?? "", type: rd?.name ?? res.type, quantity }),
                "info",
            );
        }
    }

    for (const artifactId of rewards.artifactIds ?? []) {
        const artifact = get().artifacts.find((entry) => entry.id === artifactId);
        if (artifact && !artifact.discovered) {
            discoverArtifact(artifact, set, get);
        }
    }
}
