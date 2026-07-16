import type { SetState, GameStore } from "@/game/types";
import type { RuinsDepth, RuinsOutcome } from "@/game/types/exploration";
import { RESEARCH_RESOURCES, TRADE_GOODS } from "@/game/constants";
import {
    EXPEDITION_RUINS_MAX_DEPTH,
    getRuinsDepthDamage,
    getRuinsDepthRewardMultiplier,
} from "./constants";
import {
    applyTradeGoodToExpedition,
    applyResearchToExpedition,
} from "./revealExpeditionTile";
import { pickRuinsEvent } from "./ruinsEvents";

const r = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Обрабатывает выбор игрока в событии руин.
 * Применяет награду/риск, формирует сводку исхода (ruinsOutcome) и
 * НЕ закрывает событие сразу — игрок подтверждает исход через confirmRuinsOutcome.
 */
export function resolveRuinsChoice(
    choiceIndex: number,
    set: SetState,
    get: () => GameStore,
): void {
    const state = get();
    const expedition = state.activeExpedition;

    if (!expedition?.activeRuinsEvent) return;
    if (expedition.ruinsOutcome) return; // исход уже показан, ждём подтверждения

    const choice = expedition.activeRuinsEvent.choices[choiceIndex];
    if (!choice) return;

    const ruinsDepth = expedition.ruinsDepth ?? 0;
    const rewardMultiplier = getRuinsDepthRewardMultiplier(ruinsDepth);
    const depthDamage = getRuinsDepthDamage(ruinsDepth);
    const riskValue =
        (choice.riskType === "crew_damage" ? (choice.riskValue ?? 0) : 0) +
        depthDamage;
    let rewards = { ...expedition.rewards };
    const parts: string[] = [];
    let riskApplied = false;
    let gained = false;

    // Глубокие камеры опасны независимо от выбранного подхода.
    if (riskValue > 0) {
        const crewInExpedition = state.crew.filter((c) =>
            expedition.crewIds.includes(c.id),
        );
        if (crewInExpedition.length > 0) {
            const target =
                crewInExpedition[
                    Math.floor(Math.random() * crewInExpedition.length)
                ];
            const damage = r(
                Math.max(1, Math.floor(riskValue * 0.7)),
                riskValue,
            );
            set((s) => ({
                crew: s.crew.map((c) =>
                    c.id === target.id
                        ? { ...c, health: Math.max(0, c.health - damage) }
                        : c,
                ),
            }));
            parts.push(`⚠️ ${target.name}: −${damage} HP`);
            riskApplied = true;
            get().addLog(`⚠️ ${target.name} пострадал: -${damage} HP`, "error");
        }
    }

    // Apply reward
    switch (choice.rewardType) {
        case "credits": {
            const val = (choice.rewardValue ?? 0) * rewardMultiplier;
            rewards = { ...rewards, credits: rewards.credits + val };
            parts.push(`+${val}₢`);
            gained = val > 0;
            get().addLog(`🏚️ Руины: +${val}₢`, "info");
            break;
        }
        case "research_resource": {
            if (choice.rewardResourceType && choice.rewardValue) {
                const quantity = choice.rewardValue * rewardMultiplier;
                rewards = applyResearchToExpedition(
                    rewards,
                    choice.rewardResourceType,
                    quantity,
                );
                const rd = RESEARCH_RESOURCES[choice.rewardResourceType];
                parts.push(
                    `${rd?.icon ?? ""} ${rd?.name ?? choice.rewardResourceType} ×${quantity}`,
                );
                gained = true;
                get().addLog(
                    `🏚️ Руины: ${rd?.icon ?? ""} ${rd?.name ?? choice.rewardResourceType} x${quantity}`,
                    "info",
                );
            }
            break;
        }
        case "trade_good": {
            if (choice.rewardGoodId && choice.rewardValue) {
                const quantity = choice.rewardValue * rewardMultiplier;
                rewards = applyTradeGoodToExpedition(
                    rewards,
                    choice.rewardGoodId,
                    quantity,
                );
                const name =
                    TRADE_GOODS[choice.rewardGoodId]?.name ??
                    choice.rewardGoodId;
                parts.push(`${name} ×${quantity}`);
                gained = true;
                get().addLog(
                    `🏚️ Руины: ${name} x${quantity}`,
                    "info",
                );
            }
            break;
        }
        case "artifact": {
            const artifact = get().tryFindArtifact();
            if (artifact) {
                rewards = { ...rewards, artifactFound: artifact.id };
                parts.push(`✨ ${artifact.name}`);
                gained = true;
                get().addLog(`✨ Найден артефакт: ${artifact.name}!`, "info");
            } else {
                parts.push("🗿 Артефакт не обнаружен");
                get().addLog("🗿 Артефакт не обнаружен.", "info");
            }
            break;
        }
        case "nothing":
        default:
            parts.push("Ушли ни с чем");
            get().addLog("🏚️ Руины: вы ушли ни с чем.", "info");
            break;
    }

    const kind: RuinsOutcome["kind"] = gained
        ? riskApplied
            ? "neutral"
            : "good"
        : riskApplied
          ? "bad"
          : "neutral";
    const outcome: RuinsOutcome = { summary: parts.join(" · "), kind };

    set((s) => ({
        activeExpedition: s.activeExpedition
            ? {
                  ...s.activeExpedition,
                  rewards,
                  ruinsOutcome: outcome,
              }
            : null,
    }));
}

/** Открывает дополнительную камеру руин за AP после получения предыдущей добычи. */
export function diveDeeperIntoRuins(
    set: SetState,
    get: () => GameStore,
): void {
    const expedition = get().activeExpedition;
    if (!expedition?.activeRuinsEvent || !expedition.ruinsOutcome) return;
    if (expedition.finished) return;

    const ruinsDepth = expedition.ruinsDepth ?? 0;
    const stepApCost = expedition.stepApCost ?? 1;
    if (
        ruinsDepth >= EXPEDITION_RUINS_MAX_DEPTH ||
        expedition.apRemaining < stepApCost
    ) {
        return;
    }

    const nextDepth: RuinsDepth = ruinsDepth === 0 ? 1 : 2;
    set((s) => ({
        activeExpedition: s.activeExpedition
            ? {
                  ...s.activeExpedition,
                  apRemaining: s.activeExpedition.apRemaining - stepApCost,
                  activeRuinsEvent: pickRuinsEvent(),
                  ruinsOutcome: null,
                  ruinsDepth: nextDepth,
              }
            : null,
    }));
}

/**
 * Закрывает показ исхода руин: снимает событие и завершает экспедицию,
 * если AP закончились.
 */
export function confirmRuinsOutcome(
    set: SetState,
    get: () => GameStore,
): void {
    const expedition = get().activeExpedition;
    if (!expedition) return;

    const shouldFinish =
        expedition.apRemaining < (expedition.stepApCost ?? 1);

    set((s) => ({
        activeExpedition: s.activeExpedition
            ? {
                  ...s.activeExpedition,
                  activeRuinsEvent: null,
                  pendingTileIndex: null,
                  ruinsOutcome: null,
                  ruinsDepth: 0,
                  finished: s.activeExpedition.finished || shouldFinish,
              }
            : null,
    }));
}
