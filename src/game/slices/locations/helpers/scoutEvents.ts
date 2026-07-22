import { store as i18nStore } from "@/lib/useTranslation";
import type {
    SetState,
    GameStore,
    ResearchResourceType,
    SurfaceLogEntry,
} from "@/game/types";
import type { Goods } from "@/game/types/goods";
import { RESEARCH_RESOURCES, TRADE_GOODS } from "@/game/constants";
import { addTradeGood } from "@/game/slices/ship/helpers";
import { giveRandomMutation, getBestByProfession } from "@/game/crew";
import { appendSurfaceLog } from "./sendScoutingMission";
import { patchLocation } from "@/game/utils/patchLocation";

/** Шанс, что разведка обернётся событием вместо обычного результата */
export const SCOUT_EVENT_CHANCE = 0.12;

// Принцип выбора (как в событиях газового гиганта):
// 1 — лучшая награда, есть риск; 2 — средняя награда без риска; 3 — уйти.
export interface ScoutEventChoice {
    labelKey: string;
    outcome: {
        credits?: [number, number];
        tradeGood?: { id: Goods; min: number; max: number };
        researchResources?: {
            type: ResearchResourceType;
            min: number;
            max: number;
        }[];
        mutationChance?: number; // 0..1 — риск заражения разведчика
    };
}

export interface ScoutEvent {
    id: string;
    titleKey: string;
    descKey: string;
    choices: ScoutEventChoice[];
}

export const SCOUT_EVENTS: ScoutEvent[] = [
    {
        id: "derelict_lander",
        titleKey: "scout_events.derelict_lander.title",
        descKey: "scout_events.derelict_lander.desc",
        choices: [
            {
                labelKey: "scout_events.derelict_lander.open",
                outcome: {
                    credits: [80, 200],
                    tradeGood: { id: "electronics", min: 1, max: 3 },
                    mutationChance: 0.3,
                },
            },
            {
                labelKey: "scout_events.derelict_lander.scan",
                outcome: {
                    researchResources: [
                        { type: "tech_salvage", min: 2, max: 4 },
                    ],
                },
            },
            { labelKey: "scout_events.choice_leave", outcome: {} },
        ],
    },
    {
        id: "ancient_beacon",
        titleKey: "scout_events.ancient_beacon.title",
        descKey: "scout_events.ancient_beacon.desc",
        choices: [
            {
                labelKey: "scout_events.ancient_beacon.activate",
                outcome: {
                    researchResources: [
                        { type: "ancient_data", min: 2, max: 4 },
                    ],
                    mutationChance: 0.25,
                },
            },
            {
                labelKey: "scout_events.ancient_beacon.dismantle",
                outcome: {
                    credits: [60, 140],
                    researchResources: [
                        { type: "tech_salvage", min: 1, max: 2 },
                    ],
                },
            },
            { labelKey: "scout_events.choice_leave", outcome: {} },
        ],
    },
    {
        id: "hidden_cache",
        titleKey: "scout_events.hidden_cache.title",
        descKey: "scout_events.hidden_cache.desc",
        choices: [
            {
                labelKey: "scout_events.hidden_cache.crack",
                outcome: {
                    tradeGood: { id: "medicine", min: 1, max: 2 },
                    credits: [50, 150],
                    mutationChance: 0.15,
                },
            },
            {
                labelKey: "scout_events.hidden_cache.scan",
                outcome: {
                    researchResources: [
                        { type: "rare_minerals", min: 2, max: 3 },
                    ],
                },
            },
            { labelKey: "scout_events.choice_leave", outcome: {} },
        ],
    },
];

const roll = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

/** Применяет выбор игрока в событии разведки */
export const resolveScoutEvent = (
    choiceIndex: number,
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();
    const pending = state.pendingScoutEvent;
    if (!pending) return;
    const event = SCOUT_EVENTS.find((e) => e.id === pending.eventId);
    const choice = event?.choices[choiceIndex];
    if (!choice) {
        set({ pendingScoutEvent: null });
        return;
    }

    const logEntry: SurfaceLogEntry = { source: "scout" };
    const { outcome } = choice;

    if (outcome.credits) {
        const value = roll(...outcome.credits);
        set((s) => ({ credits: s.credits + value }));
        logEntry.credits = value;
        get().addLog( i18nStore.t("game_logs.scoutEvents_1", { value }), "info");
    }

    if (outcome.tradeGood) {
        const qty = roll(outcome.tradeGood.min, outcome.tradeGood.max);
        const goodId = outcome.tradeGood.id;
        set((s) => ({
            ship: {
                ...s.ship,
                tradeGoods: addTradeGood(s.ship.tradeGoods, goodId, qty),
            },
        }));
        const goodName = TRADE_GOODS[goodId] ? i18nStore.t(`trade.goods.${goodId}`) : goodId;
        logEntry.tradeGood = { name: goodName, quantity: qty };
        get().addLog( i18nStore.t("game_logs.scoutEvents_2", { goodName, qty }), "info");
    }

    if (outcome.researchResources?.length) {
        const found = outcome.researchResources.map((res) => ({
            type: res.type,
            quantity: roll(res.min, res.max),
        }));
        set((s) => {
            const updated = { ...s.research.resources };
            for (const res of found) {
                updated[res.type] = (updated[res.type] || 0) + res.quantity;
            }
            return { research: { ...s.research, resources: updated } };
        });
        found.forEach((res) => {
            const rd = RESEARCH_RESOURCES[res.type];
            get().addLog( i18nStore.t("game_logs.scoutEvents_3", { value: rd?.icon ?? "", type: rd?.name ?? res.type, quantity: res.quantity }),
                "info",
            );
        });
        logEntry.researchResources = found;
    }

    if (outcome.mutationChance && Math.random() < outcome.mutationChance) {
        const scout = getBestByProfession(get().crew, "scout");
        if (scout) {
            const mutationName = giveRandomMutation(scout, set);
            if (mutationName) {
                logEntry.mutationName = mutationName;
                get().addLog( i18nStore.t("game_logs.scoutEvents_4", { scout_name: scout.name, mutationName }),
                    "error",
                );
            }
        }
    }

    // Записываем в журнал находок планеты и закрываем событие
    set((s) => ({
        pendingScoutEvent: null,
        ...patchLocation(s, pending.planetId, (loc) => ({
            surfaceLog: appendSurfaceLog(loc.surfaceLog, logEntry),
        })),
    }));
    get().saveGame();
};
