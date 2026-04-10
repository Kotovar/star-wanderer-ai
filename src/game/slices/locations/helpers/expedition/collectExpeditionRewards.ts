import type { SetState, GameStore } from "@/game/types";
import type { ExpeditionReward } from "@/game/types/exploration";
import { RESEARCH_RESOURCES, TRADE_GOODS } from "@/game/constants";
import { addTradeGood } from "@/game/slices/ship/helpers";

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
        get().addLog(`🗺️ Экспедиция: +${rewards.credits}₢`, "info");
    }

    // Trade goods
    if (rewards.tradeGoods.length > 0) {
        set((s) => {
            let tradeGoods = s.ship.tradeGoods;
            for (const tg of rewards.tradeGoods) {
                tradeGoods = addTradeGood(tradeGoods, tg.id, tg.quantity);
            }
            return { ship: { ...s.ship, tradeGoods } };
        });
        for (const tg of rewards.tradeGoods) {
            const name = TRADE_GOODS[tg.id]?.name ?? tg.id;
            get().addLog(`🗺️ Экспедиция: ${name} x${tg.quantity}`, "info");
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
            set((s) => ({
                ship: {
                    ...s.ship,
                    tradeGoods: addTradeGood(
                        s.ship.tradeGoods,
                        "rare_minerals",
                        rareMineralsReward.quantity,
                    ),
                },
            }));
        }

        for (const res of rewards.researchResources) {
            const rd = RESEARCH_RESOURCES[res.type];
            get().addLog(
                `🗺️ Экспедиция: ${rd?.icon ?? ""} ${rd?.name ?? res.type} x${res.quantity}`,
                "info",
            );
        }
    }
}
