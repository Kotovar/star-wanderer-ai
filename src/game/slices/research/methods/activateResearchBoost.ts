import { store as i18nStore } from "@/lib/useTranslation";
import { playSound } from "@/sounds";
import type { ActiveEffect, GameStore, SetState } from "@/game/types";
import { RESEARCH_STATION_BOOST_MULTIPLIER } from "../helpers/researchHelpers";

/** Стоимость активации станционного буста исследований (research-станции) */
export const RESEARCH_BOOST_COST = 500;

/** Длительность буста в ходах */
export const RESEARCH_BOOST_DURATION = 15;

/** Фиксированный id — повторная покупка заменяет запись, а не добавляет вторую */
export const RESEARCH_BOOST_EFFECT_ID = "research_boost";

/**
 * Активирует временный буст скорости исследований (+20% на 15 ходов, см.
 * RESEARCH_STATION_BOOST_MULTIPLIER в researchHelpers.ts). Доступно только
 * на research-станциях (проверяется в UI через isResearchStation).
 *
 * Реализован как обычная запись в activeEffects — читается calculateResearchOutput
 * и отображается в общей панели «Эффекты» (⚡) наравне с планетарными/боевыми
 * бонусами, включая автоматический тик/удаление через removeExpiredEffects()
 * (вызывается каждый ход в nextTurn() до processResearch()).
 */
export const activateResearchBoost = (
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();

    if (state.credits < RESEARCH_BOOST_COST) {
        get().addLog(
            i18nStore.t("game_logs.activateResearchBoost_2", {
                cost: RESEARCH_BOOST_COST,
            }),
            "error",
        );
        return;
    }

    const boostEffect: ActiveEffect = {
        id: RESEARCH_BOOST_EFFECT_ID,
        name: i18nStore.t("effects.items.research_boost.name"),
        description: i18nStore.t("effects.items.research_boost.description"),
        nameKey: "effects.items.research_boost.name",
        descriptionKey: "effects.items.research_boost.description",
        source: "station",
        polarity: "positive",
        icon: "🔬",
        color: "#00d4ff",
        acquiredTurn: state.turn,
        totalTurns: RESEARCH_BOOST_DURATION,
        turnsRemaining: RESEARCH_BOOST_DURATION,
        effects: [
            { type: "research_speed", value: RESEARCH_STATION_BOOST_MULTIPLIER },
        ],
    };

    set({
        credits: state.credits - RESEARCH_BOOST_COST,
        activeEffects: [
            ...state.activeEffects.filter(
                (e) => e.id !== RESEARCH_BOOST_EFFECT_ID,
            ),
            boostEffect,
        ],
    });

    get().addLog(
        i18nStore.t("game_logs.activateResearchBoost_1", {
            turns: RESEARCH_BOOST_DURATION,
        }),
        "info",
    );
    playSound("world_research");
};
