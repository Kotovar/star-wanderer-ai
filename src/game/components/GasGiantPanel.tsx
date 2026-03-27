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

    // Rewards display helper
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

            {/* Description (only when not diving) */}
            {!activeDive && (
                <div className="text-xs text-[#888] leading-relaxed border border-[#1a1a2e] p-3 bg-[rgba(123,79,255,0.04)]">
                    {t("gas_giant.description")}
                </div>
            )}

            {/* Dive state */}
            {activeDive && (
                <>
                    {/* Depth indicator */}
                    <div className="flex items-center gap-2 shrink-0">
                        {([1, 2, 3, 4] as DiveDepth[]).map((d) => {
                            const active = d === activeDive.currentDepth;
                            const passed = d < activeDive.currentDepth;
                            const color = DEPTH_COLORS[d];
                            return (
                                <div
                                    key={d}
                                    className="flex-1 flex flex-col items-center gap-0.5"
                                >
                                    <div
                                        className="text-base leading-none"
                                        style={{ opacity: passed || active ? 1 : 0.3 }}
                                    >
                                        {DEPTH_ICONS[d]}
                                    </div>
                                    <div
                                        className="h-1 w-full rounded-full"
                                        style={{
                                            backgroundColor:
                                                passed || active ? color : "#222",
                                            boxShadow: active
                                                ? `0 0 6px ${color}`
                                                : "none",
                                        }}
                                    />
                                    <div
                                        className="text-[10px]"
                                        style={{ color: active ? color : "#444" }}
                                    >
                                        {t(`gas_giant.depth_${d}`)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Accumulated rewards */}
                    {rewardEntries.length > 0 && (
                        <div className="border border-[#1a1a2e] p-2 bg-[rgba(0,0,0,0.3)] shrink-0">
                            <div className="text-[10px] text-[#888] uppercase tracking-wider mb-1">
                                {t("gas_giant.collected")}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {rewardEntries.map(({ key, qty, rd }) => (
                                    <span
                                        key={key}
                                        className="text-xs"
                                        style={{ color: rd?.color ?? "#fff" }}
                                    >
                                        {rd?.icon} {rd?.name} ×{qty}
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
                                    className="w-full bg-transparent border-2 border-[#7b4fff] text-[#7b4fff] hover:bg-[#7b4fff] hover:text-[#050810] uppercase tracking-wider text-xs cursor-pointer"
                                >
                                    🔽 {t("gas_giant.dive_deeper")}
                                    <span className="ml-2 text-[10px] opacity-60">
                                        {t(`gas_giant.depth_${(activeDive.currentDepth + 1) as DiveDepth}`)}
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
                    {/* Probe count */}
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
                    className="max-w-sm border border-[#7b4fff] bg-[#050810] p-0"
                    onInteractOutside={(e) => e.preventDefault()}
                    showCloseButton={false}
                >
                    <div className="flex flex-col gap-3 p-4">
                        <DialogTitle className="text-[#7b4fff] font-bold text-sm font-['Orbitron'] uppercase tracking-wider">
                            {activeDive?.currentEvent
                                ? t(activeDive.currentEvent.titleKey)
                                : ""}
                        </DialogTitle>
                        <div className="text-xs text-[#888] leading-relaxed">
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
                                return (
                                    <Button
                                        key={idx}
                                        onClick={() => resolveDiveEvent(idx)}
                                        className="bg-transparent border border-[#7b4fff] text-[#7b4fff] hover:bg-[#7b4fff] hover:text-[#050810] text-xs py-1.5 cursor-pointer text-left justify-start flex-col items-start h-auto"
                                    >
                                        <span>{t(choice.labelKey)}</span>
                                        <span className="text-[10px] opacity-60 font-normal">
                                            {choice.rewards
                                                .map((r) => {
                                                    const rd = RESEARCH_RESOURCES[r.type];
                                                    return `${rd?.icon} ×${r.quantity}`;
                                                })
                                                .join("  ")}
                                            {hasDamage && (
                                                <span className="text-[#ff0040] ml-2">
                                                    ⚠️ {choice.damageChance}%
                                                </span>
                                            )}
                                            {hasLoss && (
                                                <span className="text-[#ff6600] ml-2">
                                                    💥 зонд {choice.probeLossChance}%
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
