"use client";

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

export function ReputationPanel() {
    const raceReputation = useGameStore((s) => s.raceReputation);
    const knownRaces = useGameStore((s) => s.knownRaces);
    const { t } = useTranslation();

    if (knownRaces.length === 0) return null;

    return (
        <div className="bg-[#0a0f14] border-2 border-[#9933ff] p-4 flex flex-col h-full">
            <h3 className="text-[#9933ff] font-bold text-lg mb-3 flex items-center gap-2 shrink-0">
                <span>🤝</span>
                <span>{t("reputation.title")}</span>
            </h3>

            <div className="grid grid-cols-1 gap-3 overflow-y-auto  pr-2">
                {knownRaces.map((raceId) => {
                    const race = RACES[raceId];
                    if (!race) return null;

                    const reputation = getRaceReputation(
                        raceReputation,
                        raceId,
                    );
                    const level = getReputationLevel(reputation);
                    const color = REPUTATION_COLORS[level];
                    const icon = REPUTATION_ICONS[level];
                    const description = REPUTATION_DESCRIPTIONS[level];

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
                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
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
                            </div>
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
