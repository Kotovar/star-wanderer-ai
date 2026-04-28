"use client";

import { useGameStore } from "../store";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";
import { RiskRewardPreview } from "./RiskRewardPreview";
import {
    ABANDONED_CARGO_ARTIFACT_CHANCE,
    ABANDONED_CARGO_CREDITS,
    ABANDONED_CARGO_QUANTITY,
    SURVIVORS_REWARD,
    SURVIVOR_JOINS_CHANCE,
} from "@/game/slices/locations/constants";
import type { SignalType } from "@/game/types";

// Get scanner range label
export function getScannerRangeLabel(
    scanRange: number,
    t: (key: string) => string,
): string {
    if (scanRange >= 15) return t("galaxy.scanner_levels.level_4");
    if (scanRange >= 8) return t("galaxy.scanner_levels.level_3");
    if (scanRange >= 5) return t("galaxy.scanner_levels.level_2");
    if (scanRange >= 3) return t("galaxy.scanner_levels.level_1");
    return t("galaxy.labels.scanner_absent");
}

const OUTCOME_INFO = {
    pirate_ambush: {
        icon: "🚨",
        color: "#ff0040",
        nameKey: "distress_signal.pirate_ambush",
        descKey: "distress_signal.pirate_ambush_desc",
        bgClass: "bg-[rgba(255,0,64,0.1)]",
    },
    survivors: {
        icon: "💚",
        color: "#00ff41",
        nameKey: "distress_signal.survivors",
        descKey: "distress_signal.survivors_desc",
        bgClass: "bg-[rgba(0,255,65,0.1)]",
    },
    abandoned_cargo: {
        icon: "📦",
        color: "#00d4ff",
        nameKey: "distress_signal.abandoned_cargo",
        descKey: "distress_signal.abandoned_cargo_desc",
        bgClass: "bg-[rgba(0,212,255,0.1)]",
    },
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const formatRange = (min: number, max: number, suffix = "") =>
    min === max ? `${min}${suffix}` : `${min}-${max}${suffix}`;

function buildDistressPreview(outcome?: SignalType) {
    if (outcome === "pirate_ambush") {
        return {
            risks: [
                {
                    label: "Бой",
                    value: "пираты атакуют первыми",
                    tone: "danger" as const,
                },
            ],
            rewards: [
                {
                    label: "После победы",
                    value: "добыча с врага",
                    tone: "warning" as const,
                },
                {
                    label: "Контракты",
                    value: "может засчитаться бой",
                    tone: "neutral" as const,
                },
            ],
            notes: [
                "Сканер определил засаду. При подходе сразу начнётся бой с первым ходом врага.",
            ],
        };
    }

    if (outcome === "survivors") {
        return {
            risks: [
                {
                    label: "Боевой риск",
                    value: "не ожидается",
                    tone: "good" as const,
                },
            ],
            rewards: [
                {
                    label: "Кредиты",
                    value: `+${formatRange(SURVIVORS_REWARD.MIN, SURVIVORS_REWARD.MAX, "₢")}`,
                    tone: "good" as const,
                },
                {
                    label: "Новый член экипажа",
                    value: formatPercent(SURVIVOR_JOINS_CHANCE),
                    tone: "warning" as const,
                },
                {
                    label: "Чужеродная биология",
                    value: "50%",
                    tone: "warning" as const,
                },
            ],
            notes: [
                "Если есть свободное место, один из выживших может попроситься в экипаж.",
            ],
        };
    }

    if (outcome === "abandoned_cargo") {
        return {
            risks: [
                {
                    label: "Боевой риск",
                    value: "не ожидается",
                    tone: "good" as const,
                },
            ],
            rewards: [
                {
                    label: "Кредиты",
                    value: `+${formatRange(ABANDONED_CARGO_CREDITS.MIN, ABANDONED_CARGO_CREDITS.MAX, "₢")}`,
                    tone: "good" as const,
                },
                {
                    label: "Товар",
                    value: `x${formatRange(ABANDONED_CARGO_QUANTITY.MIN, ABANDONED_CARGO_QUANTITY.MAX)}`,
                    tone: "good" as const,
                },
                {
                    label: "Технологический лом",
                    value: "x1-3",
                    tone: "good" as const,
                },
                {
                    label: "Артефакт",
                    value: formatPercent(ABANDONED_CARGO_ARTIFACT_CHANCE),
                    tone: "warning" as const,
                },
            ],
            notes: [
                "Тип товара выбирается случайно из торговых ресурсов.",
            ],
        };
    }

    return {
        risks: [
            {
                label: "Пиратская засада",
                value: "35%",
                tone: "danger" as const,
            },
        ],
        rewards: [
            {
                label: "Выжившие",
                value: "30%",
                tone: "good" as const,
            },
            {
                label: "Заброшенный груз",
                value: "35%",
                tone: "good" as const,
            },
        ],
        notes: [
            "Сканер может раскрыть точный исход до подхода. Без раскрытия решение остаётся рискованным.",
        ],
    };
}

function SOSBeacon({
    color = "#ffaa00",
    size = 72,
}: {
    color?: string;
    size?: number;
}) {
    const innerSize = Math.round(size * 0.56);
    return (
        <div
            className="relative flex items-center justify-center shrink-0"
            style={{ width: size, height: size }}
        >
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    className="absolute rounded-full border animate-ping"
                    style={{
                        width: size,
                        height: size,
                        borderColor: color,
                        animationDelay: `${i * 0.65}s`,
                        animationDuration: "2s",
                    }}
                />
            ))}
            <div
                className="relative z-10 flex items-center justify-center rounded-full border-2 font-['Share_Tech_Mono'] font-bold animate-pulse"
                style={{
                    width: innerSize,
                    height: innerSize,
                    fontSize: Math.round(innerSize * 0.27),
                    borderColor: color,
                    color: color,
                    backgroundColor: `${color}18`,
                    boxShadow: `0 0 ${Math.round(innerSize * 0.45)}px ${color}55, inset 0 0 ${Math.round(innerSize * 0.22)}px ${color}22`,
                    animationDuration: "1.8s",
                }}
            >
                SOS
            </div>
        </div>
    );
}

export function DistressSignalPanel() {
    const currentLocation = useGameStore((s) => s.currentLocation);
    const respondToDistressSignal = useGameStore(
        (s) => s.respondToDistressSignal,
    );
    const showSectorMap = useGameStore((s) => s.showSectorMap);
    const getSignalRevealChance = useGameStore((s) => s.getSignalRevealChance);
    const getEffectiveScanRange = useGameStore((s) => s.getEffectiveScanRange);
    const { t } = useTranslation();

    if (!currentLocation) return null;

    const scanRange = getEffectiveScanRange();
    const revealChance = getSignalRevealChance();
    const outcome = currentLocation.signalType;
    const isResolved = currentLocation.signalResolved;
    const isRevealed = currentLocation.signalRevealed;
    const revealChecked = currentLocation.signalRevealChecked;

    // ── RESOLVED ──────────────────────────────────────────────────────────
    if (isResolved && outcome) {
        const info = OUTCOME_INFO[outcome];

        return (
            <div className="flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <SOSBeacon color="#555" size={56} />
                    <div>
                        <div className="font-['Orbitron'] font-bold text-lg text-[#666]">
                            {t("distress_signal.title_investigated")}
                        </div>
                        <div className="text-[#555] text-xs font-['Share_Tech_Mono'] mt-0.5">
                            {t("distress_signal.signal_deactivated")}
                        </div>
                    </div>
                </div>

                {/* Outcome result card */}
                <div
                    className={`${info.bgClass} border p-4 relative overflow-hidden`}
                    style={{ borderColor: info.color }}
                >
                    {/* background glow */}
                    <div
                        className="absolute inset-0 opacity-5"
                        style={{
                            background: `radial-gradient(ellipse at 20% 50%, ${info.color} 0%, transparent 70%)`,
                        }}
                    />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-3xl">{info.icon}</span>
                            <div>
                                <div
                                    className="font-['Orbitron'] font-bold text-base"
                                    style={{ color: info.color }}
                                >
                                    {t(info.nameKey)}
                                </div>
                                <div className="text-[#888] text-xs mt-0.5">
                                    {t(info.descKey)}
                                </div>
                            </div>
                        </div>

                        <div
                            className="border-t pt-3 mt-1 text-sm"
                            style={{ borderColor: `${info.color}40` }}
                        >
                            {outcome === "pirate_ambush" && (
                                <span className="text-[#ffb000]">
                                    {t("distress_signal.enemy_found")}
                                </span>
                            )}
                            {outcome === "survivors" && (
                                <span style={{ color: info.color }}>
                                    {t("distress_signal.survivors_saved")}
                                </span>
                            )}
                            {outcome === "abandoned_cargo" && (
                                <div>
                                    <span style={{ color: info.color }}>
                                        {t("distress_signal.abandoned_ship")}
                                    </span>
                                    {currentLocation.signalLoot && (
                                        <div className="mt-3 space-y-1">
                                            <div
                                                className="text-xs font-bold uppercase tracking-widest mb-2"
                                                style={{ color: info.color }}
                                            >
                                                {t("distress_signal.found")}
                                            </div>
                                            {currentLocation.signalLoot
                                                .credits && (
                                                <div className="flex items-center gap-2 text-[#00ff41] text-sm">
                                                    <span>💰</span>
                                                    <span>
                                                        {
                                                            currentLocation
                                                                .signalLoot
                                                                .credits
                                                        }
                                                        ₢
                                                    </span>
                                                </div>
                                            )}
                                            {currentLocation.signalLoot
                                                .tradeGood && (
                                                <div className="flex items-center gap-2 text-[#00d4ff] text-sm">
                                                    <span>📦</span>
                                                    <span>
                                                        {
                                                            currentLocation
                                                                .signalLoot
                                                                .tradeGood.name
                                                        }{" "}
                                                        ×
                                                        {
                                                            currentLocation
                                                                .signalLoot
                                                                .tradeGood
                                                                .quantity
                                                        }
                                                    </span>
                                                </div>
                                            )}
                                            {currentLocation.signalLoot
                                                .artifact && (
                                                <div className="flex items-center gap-2 text-[#ff00ff] text-sm">
                                                    <span>★</span>
                                                    <span>
                                                        {
                                                            currentLocation
                                                                .signalLoot
                                                                .artifact
                                                        }
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <Button
                    onClick={showSectorMap}
                    className="cursor-pointer bg-transparent border-2 border-[#444] text-[#666] hover:bg-[#444] hover:text-[#050810] uppercase tracking-wider mt-1"
                >
                    {t("distress_signal.leave_signal")}
                </Button>
            </div>
        );
    }

    // ── REVEALED ──────────────────────────────────────────────────────────
    if (isRevealed && outcome && !isResolved) {
        const info = OUTCOME_INFO[outcome];
        const revealedPreview = buildDistressPreview(outcome);

        return (
            <div className="flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <SOSBeacon color={info.color} size={64} />
                    <div>
                        <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000]">
                            {t("distress_signal.title")}
                        </div>
                        <div
                            className="text-xs font-['Share_Tech_Mono'] mt-0.5 animate-pulse"
                            style={{ color: info.color }}
                        >
                            {t("distress_signal.scanner_identified")}
                        </div>
                    </div>
                </div>

                {/* Detected outcome */}
                <div
                    className={`${info.bgClass} border p-4 relative overflow-hidden`}
                    style={{ borderColor: info.color }}
                >
                    <div
                        className="absolute inset-0 opacity-5"
                        style={{
                            background: `radial-gradient(ellipse at 80% 50%, ${info.color} 0%, transparent 70%)`,
                        }}
                    />
                    <div className="relative z-10">
                        <div
                            className="text-xs font-['Share_Tech_Mono'] mb-3"
                            style={{ color: `${info.color}99` }}
                        >
                            {t("distress_signal.scan_result")}
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-4xl">{info.icon}</span>
                            <div>
                                <div
                                    className="font-['Orbitron'] font-bold text-base"
                                    style={{ color: info.color }}
                                >
                                    {t(info.nameKey)}
                                </div>
                                <div className="text-[#888] text-xs mt-1">
                                    {t(info.descKey)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-sm text-[#888] leading-relaxed">
                    {t("distress_signal.scanner_analyzed")}
                </div>

                <RiskRewardPreview
                    title="Прогноз подхода"
                    risks={revealedPreview.risks}
                    rewards={revealedPreview.rewards}
                    notes={revealedPreview.notes}
                />

                <Button
                    onClick={() => respondToDistressSignal()}
                    className="cursor-pointer bg-transparent border-2 uppercase tracking-wider"
                    style={{
                        borderColor: info.color,
                        color: info.color,
                    }}
                >
                    {outcome === "pirate_ambush"
                        ? t("distress_signal.approach_combat")
                        : t("distress_signal.approach")}
                </Button>

                <Button
                    onClick={showSectorMap}
                    className="cursor-pointer bg-transparent border-2 border-[#666] text-[#666] hover:bg-[#666] hover:text-[#050810] uppercase tracking-wider"
                >
                    {t("distress_signal.ignore")}
                </Button>
            </div>
        );
    }

    // ── UNKNOWN SIGNAL ────────────────────────────────────────────────────
    const scannerLabel = getScannerRangeLabel(scanRange, t);

    return (
        <div className="flex flex-col gap-4">
            {/* Header with animated beacon */}
            <div className="flex items-center gap-3">
                <SOSBeacon color="#ffaa00" size={72} />
                <div>
                    <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000] animate-pulse">
                        {t("distress_signal.title")}
                    </div>
                    <div className="text-[#ffaa00] text-xs font-['Share_Tech_Mono'] mt-0.5">
                        {t("distress_signal.incoming_signal")}
                    </div>
                </div>
            </div>

            {/* Intercepted signal block */}
            <div className="bg-[rgba(255,170,0,0.05)] border border-[#ffaa00] p-3 font-['Share_Tech_Mono'] text-xs">
                <div className="text-[#ffaa00] mb-1">{t("distress_signal.intercepted")}</div>
                <div className="text-[#666] mb-1">
                    ━━━━━━╱╲━━━╱╲╱╲━━━━╱╲━━━━━━
                </div>
                <div className="text-[#888]">
                    {t("distress_signal.static_message")}
                </div>
            </div>

            {/* Possible outcomes grid */}
            <div>
                <div className="text-[#666] text-xs uppercase tracking-widest mb-2 font-['Share_Tech_Mono']">
                    {t("distress_signal.possible_scenarios")}
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div className="border border-[#00ff41] bg-[rgba(0,255,65,0.04)] p-2 text-center">
                        <div className="text-2xl mb-1">💚</div>
                        <div className="text-[#00ff41] text-xs font-bold font-['Share_Tech_Mono']">
                            30%
                        </div>
                        <div className="text-[#888] text-xs mt-0.5">
                            {t("distress_signal.survivors")}
                        </div>
                    </div>
                    <div className="border border-[#00d4ff] bg-[rgba(0,212,255,0.04)] p-2 text-center">
                        <div className="text-2xl mb-1">📦</div>
                        <div className="text-[#00d4ff] text-xs font-bold font-['Share_Tech_Mono']">
                            35%
                        </div>
                        <div className="text-[#888] text-xs mt-0.5">
                            {t("distress_signal.abandoned_cargo")}
                        </div>
                    </div>
                    <div className="border border-[#ff0040] bg-[rgba(255,0,64,0.04)] p-2 text-center">
                        <div className="text-2xl mb-1">🚨</div>
                        <div className="text-[#ff0040] text-xs font-bold font-['Share_Tech_Mono']">
                            35%
                        </div>
                        <div className="text-[#888] text-xs mt-0.5">
                            {t("distress_signal.pirate_ambush")}
                        </div>
                    </div>
                </div>
            </div>

            {/* Scanner info */}
            {scanRange > 0 && !revealChecked && (
                <div className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-3 text-sm">
                    <div className="text-[#00ff41] text-xs font-['Share_Tech_Mono'] mb-1">
                        {t("distress_signal.scanner_active").replace("{{label}}", scannerLabel)}
                    </div>
                    <span className="text-[#888] text-xs">
                        {t("distress_signal.reveal_chance")}{" "}
                    </span>
                    <span className="text-[#ffb000] text-xs font-bold">
                        {revealChance}%
                    </span>
                </div>
            )}

            {scanRange > 0 && revealChecked && !isRevealed && (
                <div className="bg-[rgba(100,100,100,0.08)] border border-[#444] p-3 text-xs font-['Share_Tech_Mono']">
                    <span className="text-[#555]">
                        {t("distress_signal.scanner_failed")}
                    </span>
                </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3">
                <Button
                    onClick={() => respondToDistressSignal()}
                    className="cursor-pointer bg-transparent border-2 border-[#ffaa00] text-[#ffaa00] hover:bg-[#ffaa00] hover:text-[#050810] uppercase tracking-wider flex-1"
                >
                    {t("distress_signal.respond")}
                </Button>
                <Button
                    onClick={showSectorMap}
                    className="cursor-pointer bg-transparent border-2 border-[#444] text-[#666] hover:bg-[#444] hover:text-[#050810] uppercase tracking-wider"
                >
                    {t("distress_signal.ignore")}
                </Button>
            </div>
        </div>
    );
}
