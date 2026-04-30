"use client";

import { useGameStore } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/lib/useTranslation";
import type { ExploreTileType } from "@/game/types/exploration";
import { RESEARCH_RESOURCES, TRADE_GOODS } from "@/game/constants";
import { ExpeditionMapCanvas } from "./ExpeditionMapCanvas";
import { EventIllustration } from "./EventIllustration";

const TILE_COLORS: Record<ExploreTileType, { border: string; bg: string }> = {
    market: { border: "#00ff41", bg: "rgba(0,255,65,0.08)" },
    lab: { border: "#4488ff", bg: "rgba(68,136,255,0.08)" },
    ruins: { border: "#ffb000", bg: "rgba(255,176,0,0.08)" },
    incident: { border: "#ff0040", bg: "rgba(255,0,64,0.08)" },
    artifact: { border: "#9933ff", bg: "rgba(153,51,255,0.08)" },
};

const TILE_ICONS: Record<ExploreTileType, string> = {
    market: "M",
    lab: "L",
    ruins: "R",
    incident: "!",
    artifact: "A",
};

export function PlanetExplorationPanel() {
    const expedition = useGameStore((s) => s.activeExpedition);
    const revealExpeditionTile = useGameStore((s) => s.revealExpeditionTile);
    const resolveRuinsChoice = useGameStore((s) => s.resolveRuinsChoice);
    const endExpedition = useGameStore((s) => s.endExpedition);
    const { t } = useTranslation();

    if (!expedition) return null;

    const { grid, apRemaining, apTotal, rewards, activeRuinsEvent, finished } =
        expedition;

    const canReveal = apRemaining > 0 && !activeRuinsEvent && !finished;
    const revealedCount = grid.filter((tile) => tile.revealed).length;
    const totalTiles = grid.length;
    const apExhausted = apRemaining === 0 && !finished;

    const hasRewards =
        rewards.credits > 0 ||
        rewards.tradeGoods.length > 0 ||
        rewards.researchResources.length > 0 ||
        rewards.artifactFound;

    return (
        <div className="flex flex-col gap-2">
            {/* Header */}
            <div className="flex items-center gap-2">
                <div className="font-['Orbitron'] font-bold text-[#00d4ff] uppercase tracking-wider text-sm shrink-0">
                    🗺️ {t("planet_panel.expedition_active_title")}
                </div>
                {/* Tile counter */}
                <span className="text-xs font-mono text-[#00d4ff66] shrink-0">
                    {revealedCount}/{totalTiles}
                </span>
                <div className="flex-1" />
                {/* AP bar */}
                <div className="flex items-center gap-1.5">
                    <div className="w-20 h-1.5 rounded-full bg-[#1a1a2e] overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all"
                            style={{
                                width: apTotal > 0 ? `${(apRemaining / apTotal) * 100}%` : "0%",
                                background:
                                    apRemaining > apTotal * 0.5
                                        ? "#00d4ff"
                                        : apRemaining > apTotal * 0.25
                                          ? "#ffb000"
                                          : "#ff0040",
                                boxShadow:
                                    apRemaining > 0 ? "0 0 6px #00d4ff88" : "none",
                            }}
                        />
                    </div>
                    <span className="text-xs text-[#00d4ff] font-bold whitespace-nowrap">
                        {apRemaining}/{apTotal} AP
                    </span>
                </div>
                {/* Small abort link — only when not yet finished and AP remains */}
                {!finished && !apExhausted && (
                    <button
                        onClick={endExpedition}
                        className="text-[10px] text-[#ff004055] hover:text-[#ff0040] transition-colors cursor-pointer uppercase tracking-wider shrink-0"
                    >
                        ✕ {t("planet_panel.expedition_abort_btn")}
                    </button>
                )}
            </div>

            {/* Ruins event modal */}
            <Dialog open={!!activeRuinsEvent}>
                <DialogContent
                    className="max-w-sm bg-[#050810] p-0"
                    style={{ border: "2px solid #ffb00066" }}
                    onInteractOutside={(e) => e.preventDefault()}
                    showCloseButton={false}
                >
                    {/* Amber header strip */}
                    <div className="px-4 pt-4 pb-3 border-b border-[#ffb00033] bg-[rgba(255,176,0,0.04)]">
                        <div className="text-[10px] text-[#ffb000] uppercase tracking-widest font-['Orbitron'] mb-1 opacity-60">
                            {t("planet_panel.tile_ruins")}
                        </div>
                        <DialogTitle className="text-[#ffb000] font-bold text-sm font-['Orbitron'] uppercase tracking-wider">
                            {activeRuinsEvent
                                ? t(`planet_panel.${activeRuinsEvent.titleKey}`)
                                : ""}
                        </DialogTitle>
                    </div>
                    <div className="flex flex-col gap-3 p-4">
                        <EventIllustration variant="ruins" accent="#ffb000" />
                        <div className="text-xs text-[#aaa] leading-relaxed border-l-2 border-[#ffb00044] pl-3">
                            {activeRuinsEvent
                                ? t(`planet_panel.${activeRuinsEvent.descKey}`)
                                : ""}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            {activeRuinsEvent?.choices.map((choice, idx) => (
                                <Button
                                    key={idx}
                                    onClick={() => resolveRuinsChoice(idx)}
                                    className="bg-transparent border border-[#ffb00066] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] text-xs py-1.5 cursor-pointer text-left justify-start"
                                >
                                    {t(`planet_panel.${choice.labelKey}`)}
                                </Button>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Grid */}
            <div className="flex justify-center">
                <ExpeditionMapCanvas
                    grid={grid}
                    apRemaining={apRemaining}
                    apTotal={apTotal}
                    canReveal={canReveal}
                    onTileClick={(idx) => revealExpeditionTile(idx)}
                />
            </div>

            {/* Tile legend — compact, dimmed */}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 justify-center opacity-60">
                {(
                    Object.entries(TILE_COLORS) as [
                        ExploreTileType,
                        (typeof TILE_COLORS)[ExploreTileType],
                    ][]
                ).map(([type, style]) => (
                    <span
                        key={type}
                        style={{ color: style.border }}
                        className="flex items-center gap-0.5 text-[10px]"
                    >
                        {TILE_ICONS[type]} {t(`planet_panel.tile_${type}`)}
                    </span>
                ))}
            </div>

            {/* AP exhausted hint + end button */}
            {apExhausted && (
                <div className="flex items-center gap-2 px-2 py-1.5 border border-[#ffb00033] bg-[rgba(255,176,0,0.04)]">
                    <span className="text-xs text-[#ffb000]">
                        {t("planet_panel.expedition_no_ap_hint")}
                    </span>
                    <Button
                        onClick={endExpedition}
                        className="ml-auto bg-transparent border border-[#ffb00066] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] text-xs py-1 px-3 cursor-pointer uppercase tracking-wider"
                    >
                        {t("planet_panel.expedition_end_btn")}
                    </Button>
                </div>
            )}

            {/* Rewards preview */}
            {hasRewards && (
                <div className="border border-[#1a2a1a] p-2 bg-[rgba(0,255,65,0.03)]">
                    <div className="text-[10px] text-[#888] uppercase tracking-wider mb-1.5">
                        {t("planet_panel.expedition_rewards_title")}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                        {rewards.credits > 0 && (
                            <span className="text-[#00ff41] font-bold">
                                +{rewards.credits}₢
                            </span>
                        )}
                        {rewards.tradeGoods.map((tg) => (
                            <span key={tg.id} className="text-[#ffb000]">
                                📦 {TRADE_GOODS[tg.id]?.name ?? tg.id} ×{tg.quantity}
                            </span>
                        ))}
                        {rewards.researchResources.map((res) => {
                            const rd = RESEARCH_RESOURCES[res.type];
                            return (
                                <span key={res.type} style={{ color: rd?.color ?? "#4488ff" }}>
                                    {rd?.icon ?? ""} {rd?.name ?? res.type} ×{res.quantity}
                                </span>
                            );
                        })}
                        {rewards.artifactFound && (
                            <span className="text-[#9933ff] font-bold">
                                {t("planet_panel.expedition_artifact_found")}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Finished state */}
            {finished && (
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 px-3 py-2 border border-[#00ff4133] bg-[rgba(0,255,65,0.04)]">
                        <span className="text-[#00ff41] text-base">✓</span>
                        <span className="text-sm text-[#00ff41] font-bold font-['Orbitron'] uppercase tracking-wider">
                            {t("planet_panel.expedition_finished")}
                        </span>
                        <span className="text-xs text-[#00ff4155] font-mono ml-auto">
                            {revealedCount}/{totalTiles}
                        </span>
                    </div>
                    <Button
                        onClick={endExpedition}
                        className="w-full bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider cursor-pointer"
                    >
                        {t("planet_panel.expedition_end_btn")}
                    </Button>
                </div>
            )}
        </div>
    );
}
