import type { SetState, GameStore } from "@/game/types";
import { RESEARCH_RESOURCES, TRADE_GOODS } from "@/game/constants";
import {
    applyTradeGoodToExpedition,
    applyResearchToExpedition,
} from "./revealExpeditionTile";

const r = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Обрабатывает выбор игрока в событии руин.
 * Применяет награду/риск и снимает блокировку.
 */
export function resolveRuinsChoice(
    choiceIndex: number,
    set: SetState,
    get: () => GameStore,
): void {
    const state = get();
    const expedition = state.activeExpedition;

    if (!expedition?.activeRuinsEvent) return;

    const choice = expedition.activeRuinsEvent.choices[choiceIndex];
    if (!choice) return;

    let rewards = { ...expedition.rewards };

    // Apply risk first (if any) — crew damage
    if (choice.riskType === "crew_damage" && choice.riskValue) {
        const crewInExpedition = state.crew.filter((c) =>
            expedition.crewIds.includes(c.id),
        );
        if (crewInExpedition.length > 0) {
            const target =
                crewInExpedition[
                    Math.floor(Math.random() * crewInExpedition.length)
                ];
            const damage = r(
                Math.floor(choice.riskValue * 0.7),
                choice.riskValue,
            );
            set((s) => ({
                crew: s.crew.map((c) =>
                    c.id === target.id
                        ? { ...c, health: Math.max(0, c.health - damage) }
                        : c,
                ),
            }));
            get().addLog(`⚠️ ${target.name} пострадал: -${damage} HP`, "error");
        }
    }

    // Apply reward
    switch (choice.rewardType) {
        case "credits": {
            const val = choice.rewardValue ?? 0;
            rewards = { ...rewards, credits: rewards.credits + val };
            get().addLog(`🏚️ Руины: +${val}₢`, "info");
            break;
        }
        case "research_resource": {
            if (choice.rewardResourceType && choice.rewardValue) {
                rewards = applyResearchToExpedition(
                    rewards,
                    choice.rewardResourceType,
                    choice.rewardValue,
                );
                const rd = RESEARCH_RESOURCES[choice.rewardResourceType];
                get().addLog(
                    `🏚️ Руины: ${rd?.icon ?? ""} ${rd?.name ?? choice.rewardResourceType} x${choice.rewardValue}`,
                    "info",
                );
            }
            break;
        }
        case "trade_good": {
            if (choice.rewardGoodId && choice.rewardValue) {
                rewards = applyTradeGoodToExpedition(
                    rewards,
                    choice.rewardGoodId,
                    choice.rewardValue,
                );
                const name =
                    TRADE_GOODS[choice.rewardGoodId]?.name ??
                    choice.rewardGoodId;
                get().addLog(
                    `🏚️ Руины: ${name} x${choice.rewardValue}`,
                    "info",
                );
            }
            break;
        }
        case "artifact": {
            const artifact = get().tryFindArtifact();
            if (artifact) {
                rewards = { ...rewards, artifactFound: artifact.id };
                get().addLog(`✨ Найден артефакт: ${artifact.name}!`, "info");
            } else {
                get().addLog("🗿 Артефакт не обнаружен.", "info");
            }
            break;
        }
        case "nothing":
        default:
            get().addLog("🏚️ Руины: вы ушли ни с чем.", "info");
            break;
    }

    // Clear ruins event and check auto-end
    const newApRemaining = expedition.apRemaining;
    const shouldFinish = newApRemaining <= 0;

    set((s) => ({
        activeExpedition: s.activeExpedition
            ? {
                  ...s.activeExpedition,
                  rewards,
                  activeRuinsEvent: null,
                  pendingTileIndex: null,
                  finished: s.activeExpedition.finished || shouldFinish,
              }
            : null,
    }));
}
