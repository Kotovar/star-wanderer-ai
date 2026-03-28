"use client";

import { useGameStore } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/lib/useTranslation";
import { RESEARCH_RESOURCES } from "@/game/constants";
import type { DiveDepth } from "@/game/types/exploration";
import { GAS_GIANT_DIVE_COOLDOWN } from "@/game/slices/locations/helpers/gasGiant/constants";

const DEPTH_COLORS: Record<DiveDepth, string> = {
    1: "#00d4ff",
    2: "#00ff41",
    3: "#ffb000",
    4: "#ff0040",
};

const DEPTH_ICONS: Record<DiveDepth, string> = {
    1: "🌤️",
    2: "☁️",
    3: "🌑",
    4: "🌀",
};

const ATMOSPHERE_COLORS: Record<string, { band1: string; band2: string; band3: string; glow: string }> = {
    hydrogen: { band1: "#3a8fd4", band2: "#2255a0", band3: "#4fb3f0", glow: "#00d4ff" },
    methane:  { band1: "#7ed494", band2: "#2a6e42", band3: "#a8e8bc", glow: "#00ff41" },
    ammonia:  { band1: "#c49a2a", band2: "#7a5a10", band3: "#e8c86a", glow: "#ffb000" },
    nitrogen: { band1: "#9080d8", band2: "#503a9a", band3: "#c0b8f8", glow: "#9933ff" },
};

// Tailwind-safe hover classes per depth (must be full strings so PurgeCSS keeps them)
const DEPTH_BTN_CLASSES: Record<DiveDepth, string> = {
    1: "border-[#00d4ff] text-[#00d4ff] hover:bg-[#00d4ff] hover:text-[#050810]",
    2: "border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810]",
    3: "border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810]",
    4: "border-[#ff0040] text-[#ff0040] hover:bg-[#ff0040] hover:text-[#050810]",
};

function GasGiantVisual({ atmosphere, depth }: { atmosphere: string; depth?: DiveDepth }) {
    const colors = ATMOSPHERE_COLORS[atmosphere] ?? ATMOSPHERE_COLORS.hydrogen;
    const depthColor = depth ? DEPTH_COLORS[depth] : colors.glow;

    // Square 200×200 canvas, planet centred at (100,100) with r=70 — perfectly round
    return (
        <div className="relative flex justify-center items-center py-2 shrink-0">
            <svg width="200" height="200" viewBox="0 0 200 200" style={{ overflow: "visible" }}>
                <defs>
                    <radialGradient id="gg-glow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor={depthColor} stopOpacity="0.18" />
                        <stop offset="100%" stopColor={depthColor} stopOpacity="0" />
                    </radialGradient>
                    <clipPath id="gg-clip">
                        <circle cx="100" cy="100" r="70" />
                    </clipPath>
                    <radialGradient id="gg-surface" cx="38%" cy="35%" r="65%">
                        <stop offset="0%" stopColor={colors.band3} stopOpacity="1" />
                        <stop offset="45%" stopColor={colors.band1} stopOpacity="1" />
                        <stop offset="100%" stopColor={colors.band2} stopOpacity="1" />
                    </radialGradient>
                    <radialGradient id="gg-shadow" cx="65%" cy="62%" r="55%">
                        <stop offset="0%" stopColor="#000" stopOpacity="0" />
                        <stop offset="65%" stopColor="#000" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#000" stopOpacity="0.58" />
                    </radialGradient>
                </defs>

                {/* Outer glow halo */}
                <circle cx="100" cy="100" r="90" fill="url(#gg-glow)" />

                {/* Planet body */}
                <circle cx="100" cy="100" r="70" fill="url(#gg-surface)" />

                {/* Atmospheric bands — clipped to the circle */}
                <g clipPath="url(#gg-clip)">
                    <rect x="30" y="76" width="140" height="7" rx="3" fill={colors.band3} opacity="0.55">
                        <animateTransform attributeName="transform" type="translate" from="0,0" to="8,0" dur="12s" repeatCount="indefinite" additive="sum" />
                    </rect>
                    <rect x="30" y="87" width="140" height="5" rx="2" fill={colors.band2} opacity="0.4">
                        <animateTransform attributeName="transform" type="translate" from="0,0" to="-5,0" dur="16s" repeatCount="indefinite" additive="sum" />
                    </rect>
                    <rect x="30" y="96" width="140" height="9" rx="3" fill={colors.band1} opacity="0.45">
                        <animateTransform attributeName="transform" type="translate" from="0,0" to="12,0" dur="10s" repeatCount="indefinite" additive="sum" />
                    </rect>
                    <rect x="30" y="109" width="140" height="5" rx="2" fill={colors.band3} opacity="0.35">
                        <animateTransform attributeName="transform" type="translate" from="0,0" to="-9,0" dur="14s" repeatCount="indefinite" additive="sum" />
                    </rect>
                    <rect x="30" y="118" width="140" height="7" rx="2" fill={colors.band2} opacity="0.3">
                        <animateTransform attributeName="transform" type="translate" from="0,0" to="6,0" dur="18s" repeatCount="indefinite" additive="sum" />
                    </rect>
                    {/* Storm eye */}
                    <ellipse cx="130" cy="100" rx="11" ry="7" fill={colors.band2} opacity="0.75">
                        <animateTransform attributeName="transform" type="translate" from="0,0" to="5,0" dur="10s" repeatCount="indefinite" additive="sum" />
                    </ellipse>
                    <ellipse cx="130" cy="100" rx="6" ry="4" fill={colors.band1} opacity="0.5">
                        <animateTransform attributeName="transform" type="translate" from="0,0" to="5,0" dur="10s" repeatCount="indefinite" additive="sum" />
                    </ellipse>
                </g>

                {/* Lit rim */}
                <circle cx="100" cy="100" r="70" fill="none" stroke={colors.band3} strokeWidth="1.5" opacity="0.5" />

                {/* Night-side shadow overlay */}
                <circle cx="100" cy="100" r="70" fill="url(#gg-shadow)" />

                {/* Ring — ellipse for perspective */}
                <ellipse cx="100" cy="148" rx="92" ry="11" fill="none" stroke={colors.band1} strokeWidth="5" opacity="0.22" />
                <ellipse cx="100" cy="148" rx="92" ry="11" fill="none" stroke={colors.band3} strokeWidth="1.5" opacity="0.28" />

                {/* Probe dot when diving */}
                {depth && (
                    <circle cx="100" cy="100" r="5" fill={depthColor} opacity="0.9">
                        <animate attributeName="r" values="4;7;4" dur="1.5s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.9;0.4;0.9" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                )}
            </svg>
        </div>
    );
}

function DepthMeter({ currentDepth }: { currentDepth: DiveDepth }) {
    return (
        <div className="flex items-stretch gap-1 shrink-0">
            {([1, 2, 3, 4] as DiveDepth[]).map((d) => {
                const active = d === currentDepth;
                const passed = d < currentDepth;
                const color = DEPTH_COLORS[d];
                return (
                    <div key={d} className="flex-1 flex flex-col items-center gap-1">
                        <div
                            className="text-sm leading-none"
                            style={{ opacity: passed || active ? 1 : 0.25 }}
                        >
                            {DEPTH_ICONS[d]}
                        </div>
                        <div
                            className="h-1.5 w-full rounded-full transition-all"
                            style={{
                                backgroundColor: passed || active ? color : "#1a1a2e",
                                boxShadow: active ? `0 0 8px ${color}` : "none",
                            }}
                        />
                        <div
                            className="text-[9px] text-center leading-tight"
                            style={{ color: active ? color : passed ? "#444" : "#333" }}
                        >
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export function GasGiantPanel() {
    const currentLocation = useGameStore((s) => s.currentLocation);
    const activeDive = useGameStore((s) => s.activeDive);
    const turn = useGameStore((s) => s.turn);
    const startDive = useGameStore((s) => s.startDive);
    const resolveDiveEvent = useGameStore((s) => s.resolveDiveEvent);
    const diveDeeper = useGameStore((s) => s.diveDeeper);
    const surfaceDive = useGameStore((s) => s.surfaceDive);
    const probes = useGameStore((s) => s.probes);
    const showSectorMap = useGameStore((s) => s.showSectorMap);
    const { t } = useTranslation();

    if (!currentLocation || currentLocation.type !== "gas_giant") return null;

    const atmosphere = currentLocation.gasGiantAtmosphere ?? "hydrogen";
    const lastDiveAt = currentLocation.gasGiantLastDiveAt;
    const cooldownRemaining =
        lastDiveAt !== undefined
            ? Math.max(0, GAS_GIANT_DIVE_COOLDOWN - (turn - lastDiveAt))
            : 0;
    const canDive = cooldownRemaining === 0 && !activeDive && probes > 0;

    const rewardEntries =
        activeDive
            ? (
                  [
                      "alien_biology",
                      "rare_minerals",
                      "void_membrane",
                  ] as const
              )
                  .filter((k) => activeDive.rewards[k] > 0)
                  .map((k) => ({
                      key: k,
                      qty: activeDive.rewards[k],
                      rd: RESEARCH_RESOURCES[k],
                  }))
            : [];

    const depthColor = activeDive ? DEPTH_COLORS[activeDive.currentDepth] : "#7b4fff";

    return (
        <div className="flex flex-col gap-3 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div className="font-['Orbitron'] font-bold text-[#7b4fff] uppercase tracking-wider text-sm">
                    🪸 {t(`gas_giant.atmosphere_${atmosphere}`)}
                </div>
                <button
                    onClick={showSectorMap}
                    className="text-[#ff0040] hover:text-white text-lg font-bold cursor-pointer px-1"
                >
                    ✕
                </button>
            </div>

            {/* Gas Giant Visual */}
            <GasGiantVisual
                atmosphere={atmosphere}
                depth={activeDive?.currentDepth}
            />

            {/* Description (only when not diving) */}
            {!activeDive && (
                <div className="text-xs text-[#888] leading-relaxed border border-[#1a1a2e] p-3 bg-[rgba(123,79,255,0.04)]">
                    {t("gas_giant.description")}
                </div>
            )}

            {/* Active dive state */}
            {activeDive && (
                <>
                    {/* Depth indicator */}
                    <div
                        className="border p-2 shrink-0"
                        style={{
                            borderColor: depthColor,
                            background: `rgba(0,0,0,0.4)`,
                        }}
                    >
                        <div
                            className="text-[10px] uppercase tracking-wider mb-2 text-center font-['Orbitron']"
                            style={{ color: depthColor }}
                        >
                            {DEPTH_ICONS[activeDive.currentDepth]}{" "}
                            {t(`gas_giant.depth_${activeDive.currentDepth}`)}
                        </div>
                        <DepthMeter currentDepth={activeDive.currentDepth} />
                    </div>

                    {/* Accumulated rewards */}
                    {rewardEntries.length > 0 && (
                        <div className="border border-[#1a1a2e] p-2 bg-[rgba(0,0,0,0.3)] shrink-0">
                            <div className="text-[10px] text-[#888] uppercase tracking-wider mb-1.5">
                                {t("gas_giant.collected")}
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                                {rewardEntries.map(({ key, qty, rd }) => (
                                    <span
                                        key={key}
                                        className="text-xs flex items-center gap-1"
                                        style={{ color: rd?.color ?? "#fff" }}
                                    >
                                        <span>{rd?.icon}</span>
                                        <span>{rd?.name}</span>
                                        <span className="font-bold">×{qty}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Dive deeper / Surface buttons */}
                    {!activeDive.currentEvent && (
                        <div className="flex flex-col gap-2 shrink-0">
                            {activeDive.currentDepth < 4 && !activeDive.finished && (
                                <Button
                                    onClick={diveDeeper}
                                    className={`w-full bg-transparent border-2 text-xs cursor-pointer uppercase tracking-wider transition-colors ${DEPTH_BTN_CLASSES[(activeDive.currentDepth + 1) as DiveDepth]}`}
                                >
                                    🔽 {t("gas_giant.dive_deeper")}
                                    <span className="ml-2 text-[10px] opacity-60">
                                        → {t(`gas_giant.depth_${(activeDive.currentDepth + 1) as DiveDepth}`)}
                                    </span>
                                </Button>
                            )}
                            {activeDive.finished && rewardEntries.length === 0 ? (
                                <Button
                                    onClick={surfaceDive}
                                    className="w-full bg-transparent border-2 border-[#ff0040] text-[#ff0040] hover:bg-[#ff0040] hover:text-[#050810] uppercase tracking-wider text-xs cursor-pointer"
                                >
                                    💥 {t("gas_giant.leave_probe_lost")}
                                </Button>
                            ) : (
                                <Button
                                    onClick={surfaceDive}
                                    className="w-full bg-transparent border-2 border-[#00d4ff] text-[#00d4ff] hover:bg-[#00d4ff] hover:text-[#050810] uppercase tracking-wider text-xs cursor-pointer"
                                >
                                    🔼 {t("gas_giant.surface")}
                                </Button>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Initial dive button */}
            {!activeDive && (
                <div className="flex flex-col gap-2 shrink-0">
                    <div className="text-xs text-[#888] text-center">
                        🔬 {t("gas_giant.probes_available", { count: probes })}
                    </div>
                    {probes <= 0 && (
                        <div className="text-xs text-[#ff0040] text-center">
                            {t("gas_giant.no_probes")}
                        </div>
                    )}
                    {cooldownRemaining > 0 && (
                        <div className="text-xs text-[#888] text-center">
                            {t("gas_giant.cooldown", { turns: cooldownRemaining })}
                        </div>
                    )}
                    <Button
                        onClick={() => startDive(currentLocation.id)}
                        disabled={!canDive}
                        className="w-full bg-transparent border-2 border-[#7b4fff] text-[#7b4fff] hover:bg-[#7b4fff] hover:text-[#050810] uppercase tracking-wider cursor-pointer disabled:opacity-40 disabled:cursor-default"
                    >
                        🪸 {t("gas_giant.start_dive")}
                    </Button>
                    <Button
                        onClick={showSectorMap}
                        className="w-full bg-transparent border border-[#333] text-[#888] hover:bg-[#1a1a2e] text-xs cursor-pointer"
                    >
                        {t("gas_giant.leave")}
                    </Button>
                </div>
            )}

            {/* Dive event modal */}
            <Dialog open={!!activeDive?.currentEvent}>
                <DialogContent
                    className="max-w-sm p-0"
                    style={{
                        background: "#050810",
                        border: `2px solid ${activeDive ? DEPTH_COLORS[activeDive.currentDepth] : "#7b4fff"}`,
                    }}
                    onInteractOutside={(e) => e.preventDefault()}
                    showCloseButton={false}
                >
                    <div className="flex flex-col gap-3 p-4">
                        {/* Depth badge */}
                        {activeDive && (
                            <div
                                className="text-[10px] uppercase tracking-widest font-['Orbitron'] flex items-center gap-1.5"
                                style={{ color: DEPTH_COLORS[activeDive.currentDepth] }}
                            >
                                <span>{DEPTH_ICONS[activeDive.currentDepth]}</span>
                                <span>{t(`gas_giant.depth_${activeDive.currentDepth}`)}</span>
                            </div>
                        )}
                        <DialogTitle
                            className="font-bold text-sm font-['Orbitron'] uppercase tracking-wider"
                            style={{ color: activeDive ? DEPTH_COLORS[activeDive.currentDepth] : "#7b4fff" }}
                        >
                            {activeDive?.currentEvent
                                ? t(activeDive.currentEvent.titleKey)
                                : ""}
                        </DialogTitle>
                        <div className="text-xs text-[#aaa] leading-relaxed border-l-2 pl-3"
                            style={{ borderColor: activeDive ? DEPTH_COLORS[activeDive.currentDepth] + "66" : "#333" }}
                        >
                            {activeDive?.currentEvent
                                ? t(activeDive.currentEvent.descKey)
                                : ""}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            {activeDive?.currentEvent?.choices.map((choice, idx) => {
                                const hasDamage =
                                    choice.damageChance && choice.damageChance > 0;
                                const hasLoss =
                                    choice.probeLossChance && choice.probeLossChance > 0;
                                const depthClass = activeDive
                                    ? DEPTH_BTN_CLASSES[activeDive.currentDepth]
                                    : DEPTH_BTN_CLASSES[1];
                                return (
                                    <Button
                                        key={idx}
                                        onClick={() => resolveDiveEvent(idx)}
                                        className={`bg-transparent border text-xs py-1.5 cursor-pointer text-left justify-start flex-col items-start h-auto transition-colors ${depthClass}`}
                                    >
                                        <span>{t(choice.labelKey)}</span>
                                        <span className="text-[10px] opacity-60 font-normal flex items-center gap-2 flex-wrap">
                                            {choice.rewards
                                                .map((r) => {
                                                    const rd = RESEARCH_RESOURCES[r.type];
                                                    return `${rd?.icon} ×${r.quantity}`;
                                                })
                                                .join("  ")}
                                            {hasDamage && (
                                                <span className="text-[#ff6666]">
                                                    ⚠️ {choice.damageChance}%
                                                </span>
                                            )}
                                            {hasLoss && (
                                                <span className="text-[#ff9900]">
                                                    {t("gas_giant.probe_loss_chance", { chance: choice.probeLossChance ?? 0 })}
                                                </span>
                                            )}
                                        </span>
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
