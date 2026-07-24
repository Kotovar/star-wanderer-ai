"use client";

import { useState } from "react";
import { useGameStore } from "../store";
import { RACES } from "../constants/races";
import {
    getReputationLevel,
    REPUTATION_COLORS,
    REPUTATION_ICONS,
    REPUTATION_DESCRIPTIONS,
} from "../types/reputation";
import { getRaceReputation } from "../reputation/utils";
import { useTranslation } from "@/lib/useTranslation";
import { RaceSprite } from "./RaceSprite";
import { Button } from "@/components/ui/button";
import { formatCrewBonuses } from "./RaceDiscoveryModal";
import type { RaceId } from "../types";

const ALL_RACE_IDS = Object.keys(RACES) as RaceId[];

export function ReputationPanel() {
    const raceReputation = useGameStore((s) => s.raceReputation);
    const knownRaces = useGameStore((s) => s.knownRaces);
    const showSectorMap = useGameStore((s) => s.showSectorMap);
    const { t } = useTranslation();
    const [expandedRaceId, setExpandedRaceId] = useState<RaceId | null>(null);

    const knownSet = new Set(knownRaces);

    return (
        <div className="bg-[#0a0f14] border-2 border-[#9933ff] p-4 flex flex-col h-full">
            <div className="mb-3 flex shrink-0 items-start justify-between gap-3 border-b border-[#9933ff44] pb-3">
                <h3 className="flex items-center gap-2 text-lg font-bold text-[#9933ff]">
                    <span>🤝</span>
                    <span>{t("reputation.title")}</span>
                </h3>
                <Button
                    onClick={showSectorMap}
                    className="shrink-0 cursor-pointer border border-[#00ff41] bg-transparent text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810]"
                >
                    {t("common.back_to_map")}
                </Button>
            </div>

            <div className="mb-3 shrink-0 border border-[#9933ff44] bg-[rgba(153,51,255,0.06)] px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#d9b8ff]">
                {t("reputation.progress", {
                    found: knownRaces.length,
                    total: ALL_RACE_IDS.length,
                })}
            </div>

            <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-2">
                {ALL_RACE_IDS.map((raceId) => {
                    const race = RACES[raceId];
                    if (!race) return null;

                    if (!knownSet.has(raceId)) {
                        return (
                            <div
                                key={raceId}
                                className="flex items-center gap-3 rounded border border-[#303840] bg-[rgba(0,0,0,0.18)] p-3"
                            >
                                <div className="grid h-[42px] w-[42px] shrink-0 place-items-center border border-[#444] bg-[#0a0e13] text-lg text-[#667]">
                                    ?
                                </div>
                                <div>
                                    <div className="font-bold text-[#75808a]">
                                        {t("reputation.unknown_name")}
                                    </div>
                                    <p className="mt-0.5 text-xs text-[#5c6670]">
                                        {t("reputation.unknown_description")}
                                    </p>
                                </div>
                            </div>
                        );
                    }

                    const reputation = getRaceReputation(
                        raceReputation,
                        raceId,
                    );
                    const level = getReputationLevel(reputation);
                    const color = REPUTATION_COLORS[level];
                    const icon = REPUTATION_ICONS[level];
                    const description = REPUTATION_DESCRIPTIONS[level];
                    const expanded = expandedRaceId === raceId;
                    const bonuses = formatCrewBonuses(
                        race.crewBonuses ?? {},
                        t,
                    );
                    const properties: string[] = [];
                    if (!race.requiresOxygen)
                        properties.push(t("race_discovery.prop_no_oxygen"));
                    if (!race.hasHappiness)
                        properties.push(t("race_discovery.prop_no_happiness"));

                    return (
                        <div
                            key={raceId}
                            className="border p-3 rounded flex flex-col"
                            style={{
                                borderColor: color,
                                backgroundColor: `${color}10`,
                            }}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <RaceSprite
                                        race={raceId}
                                        size={42}
                                        title={race.name}
                                    />
                                    <div>
                                        <div
                                            className="font-bold"
                                            style={{ color: race.color }}
                                        >
                                            {race.name}
                                        </div>
                                        <div
                                            className="text-xs font-bold"
                                            style={{ color }}
                                        >
                                            {icon}{" "}
                                            {t(`reputation.levels.${level}`)}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div
                                        className="text-2xl font-bold"
                                        style={{ color }}
                                    >
                                        {reputation > 0 ? "+" : ""}
                                        {reputation}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {t("reputation.out_of")}
                                    </div>
                                </div>
                            </div>

                            {/* Reputation bar */}
                            <div className="mb-2">
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                    <span>{t("reputation.bar_min")}</span>
                                    <span>{t("reputation.bar_max")}</span>
                                </div>
                                <div className="relative h-2 bg-gray-700 rounded overflow-hidden">
                                    {/* Gradient background */}
                                    <div
                                        className="absolute inset-0"
                                        style={{
                                            background:
                                                "linear-gradient(90deg, #ef4444 0%, #6b7280 50%, #3b82f6 100%)",
                                        }}
                                    />
                                    {/* Current reputation marker */}
                                    <div
                                        className="absolute top-0 h-full w-1 bg-white shadow-lg"
                                        style={{
                                            left: `${((reputation + 100) / 200) * 100}%`,
                                            transform: "translateX(-50%)",
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <p className="text-xs text-gray-300 flex-1">
                                {description}
                            </p>

                            {/* Effects preview */}
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                <span
                                    className="px-2 py-1 rounded"
                                    style={{
                                        backgroundColor: `${color}30`,
                                        color,
                                    }}
                                >
                                    💰 {t("reputation.trade_label")}:{" "}
                                    {getPriceModifierText(reputation)}
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setExpandedRaceId(
                                            expanded ? null : raceId,
                                        )
                                    }
                                    className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.1em] text-[#d9b8ff] underline decoration-dotted"
                                >
                                    {expanded
                                        ? "▾"
                                        : "▸"}{" "}
                                    {t("enemy_codex.details")}
                                </button>
                            </div>

                            {expanded && (
                                <div className="mt-3 space-y-2 border-t border-[#9933ff33] pt-2 text-xs">
                                    <div className="text-[#888]">
                                        {t("race_discovery.homeworld_label")}:{" "}
                                        <span className="text-gray-300">
                                            {race.homeworld}
                                        </span>
                                    </div>

                                    {bonuses.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {bonuses.map((b, i) => (
                                                <span
                                                    key={i}
                                                    className="rounded border border-[rgba(0,255,65,0.3)] bg-[rgba(0,255,65,0.1)] px-1.5 py-0.5 text-[#00ff41]"
                                                >
                                                    {b}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {properties.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {properties.map((p, i) => (
                                                <span
                                                    key={i}
                                                    className="rounded border border-[rgba(0,212,255,0.3)] bg-[rgba(0,212,255,0.1)] px-1.5 py-0.5 text-[#00d4ff]"
                                                >
                                                    {p}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {race.specialTraits.length > 0 && (
                                        <div className="space-y-1">
                                            {race.specialTraits.map(
                                                (trait) => {
                                                    const isPositive =
                                                        trait.type ===
                                                        "positive";
                                                    const isNegative =
                                                        trait.type ===
                                                        "negative";
                                                    return (
                                                        <div
                                                            key={trait.id}
                                                            className="flex items-start gap-2"
                                                        >
                                                            <span className="mt-0.5 shrink-0">
                                                                {isPositive
                                                                    ? "✦"
                                                                    : isNegative
                                                                      ? "✖"
                                                                      : "◆"}
                                                            </span>
                                                            <div>
                                                                <span
                                                                    className={
                                                                        isPositive
                                                                            ? "font-bold text-[#00ff41]"
                                                                            : isNegative
                                                                              ? "font-bold text-[#ff4444]"
                                                                              : "font-bold text-[#888]"
                                                                    }
                                                                >
                                                                    {t(
                                                                        `racial_traits.${trait.id}.name`,
                                                                    )}
                                                                </span>
                                                                <span className="ml-1 text-[#888]">
                                                                    —{" "}
                                                                    {t(
                                                                        `racial_traits.${trait.id}.description`,
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                },
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * Получить текст модификатора цен
 * Показываем множители для покупки и продажи отдельно
 */
function getPriceModifierText(reputation: number): string {
    // Buy modifiers: hostile×2.0, unfriendly×1.4, neutral×1.0, friendly×0.9, allied×0.8
    // Sell modifiers: hostile×0.7, unfriendly×0.85, neutral×1.0, friendly×1.1, allied×1.2
    if (reputation <= -51) return "Покупка: ×2.0 | Продажа: ×0.7";
    if (reputation <= -11) return "Покупка: ×1.4 | Продажа: ×0.85";
    if (reputation <= 10) return "Покупка: ×1.0 | Продажа: ×1.0";
    if (reputation <= 50) return "Покупка: ×0.9 | Продажа: ×1.1";
    return "Покупка: ×0.8 | Продажа: ×1.2";
}
