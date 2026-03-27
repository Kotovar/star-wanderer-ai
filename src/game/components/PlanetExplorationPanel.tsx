"use client";

import { useGameStore } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/lib/useTranslation";
import type { ExploreTileType } from "@/game/types/exploration";
import { RESEARCH_RESOURCES, TRADE_GOODS } from "@/game/constants";
import { ExpeditionMapCanvas } from "./ExpeditionMapCanvas";

const TILE_COLORS: Record<ExploreTileType, { border: string; bg: string }> = {
    market: { border: "#00ff41", bg: "rgba(0,255,65,0.08)" },
    lab: { border: "#4488ff", bg: "rgba(68,136,255,0.08)" },
    ruins: { border: "#ffb000", bg: "rgba(255,176,0,0.08)" },
    incident: { border: "#ff0040", bg: "rgba(255,0,64,0.08)" },
    artifact: { border: "#9933ff", bg: "rgba(153,51,255,0.08)" },
};

const TILE_ICONS: Record<ExploreTileType, string> = {
    market: "🏪",
    lab: "🔬",
    ruins: "🏚️",
    incident: "⚠️",
    artifact: "✨",
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

    return (
        <div className="flex flex-col gap-2">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="font-['Orbitron'] font-bold text-[#00d4ff] uppercase tracking-wider text-sm">
                    🗺️ {t("planet_panel.expedition_setup_title")}
                </div>
                <div className="flex items-center gap-1">
                    {Array.from({ length: apTotal }).map((_, i) => (
                        <div
                            key={i}
                            className={`w-3 h-3 rounded-full border ${
                                i < apRemaining
                                    ? "bg-[#00d4ff] border-[#00d4ff]"
                                    : "bg-transparent border-[#333]"
                            }`}
                        />
                    ))}
                    <span className="text-xs text-[#888] ml-1">
                        {t("planet_panel.expedition_ap_remaining", {
                            ap: apRemaining,
                        })}
                    </span>
                </div>
            </div>

            {/* Ruins event modal */}
            <Dialog open={!!activeRuinsEvent}>
                <DialogContent
                    className="max-w-sm border border-[#ffb000] bg-[#050810] p-0"
                    onInteractOutside={(e) => e.preventDefault()}
                    showCloseButton={false}
                >
                    <div className="flex flex-col gap-3 p-4">
                        <DialogTitle className="text-[#ffb000] font-bold text-sm font-['Orbitron'] uppercase tracking-wider">
                            🏚️{" "}
                            {activeRuinsEvent
                                ? t(`planet_panel.${activeRuinsEvent.titleKey}`)
                                : ""}
                        </DialogTitle>
                        <div className="text-xs text-[#888] leading-relaxed">
                            {activeRuinsEvent
                                ? t(`planet_panel.${activeRuinsEvent.descKey}`)
                                : ""}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            {activeRuinsEvent?.choices.map((choice, idx) => (
                                <Button
                                    key={idx}
                                    onClick={() => resolveRuinsChoice(idx)}
                                    className="bg-transparent border border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] text-xs py-1.5 cursor-pointer text-left justify-start"
                                >
                                    {t(`planet_panel.${choice.labelKey}`)}
                                </Button>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Grid - Canvas-based planet map */}
            <div className="flex justify-center">
                <ExpeditionMapCanvas
                    grid={grid}
                    apRemaining={apRemaining}
                    apTotal={apTotal}
                    canReveal={canReveal}
                    onTileClick={(idx) => revealExpeditionTile(idx)}
                />
            </div>

            {/* Tile legend */}
            <div className="flex flex-wrap gap-2 text-xs justify-center">
                {(
                    Object.entries(TILE_COLORS) as [
                        ExploreTileType,
                        (typeof TILE_COLORS)[ExploreTileType],
                    ][]
                ).map(([type, style]) => (
                    <span
                        key={type}
                        style={{ color: style.border }}
                        className="flex items-center gap-0.5"
                    >
                        {TILE_ICONS[type]} {t(`planet_panel.tile_${type}`)}
                    </span>
                ))}
            </div>

            {/* Rewards preview */}
            {(rewards.credits > 0 ||
                rewards.tradeGoods.length > 0 ||
                rewards.researchResources.length > 0 ||
                rewards.artifactFound) && (
                <div className="border border-[#333] p-2 bg-[rgba(0,0,0,0.3)]">
                    <div className="text-xs text-[#888] uppercase tracking-wider mb-1">
                        {t("planet_panel.expedition_rewards_title")}
                    </div>
                    <div className="flex flex-col gap-0.5 text-xs">
                        {rewards.credits > 0 && (
                            <div className="text-[#00ff41]">
                                +{rewards.credits}₢
                            </div>
                        )}
                        {rewards.tradeGoods.map((tg) => (
                            <div key={tg.id} className="text-[#ffb000]">
                                {TRADE_GOODS[tg.id]?.name ?? tg.id} x
                                {tg.quantity}
                            </div>
                        ))}
                        {rewards.researchResources.map((res) => {
                            const rd = RESEARCH_RESOURCES[res.type];
                            return (
                                <div key={res.type} className="text-[#4488ff]">
                                    {rd?.icon ?? ""} {rd?.name ?? res.type} x
                                    {res.quantity}
                                </div>
                            );
                        })}
                        {rewards.artifactFound && (
                            <div className="text-[#9933ff]">
                                ✨ Артефакт найден
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Finish / End button */}
            {finished ? (
                <div className="flex flex-col gap-2">
                    <div className="text-sm text-[#00ff41] text-center">
                        ✓ {t("planet_panel.expedition_finished")}
                    </div>
                    <Button
                        onClick={endExpedition}
                        className="w-full bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider cursor-pointer"
                    >
                        {t("planet_panel.expedition_end_btn")}
                    </Button>
                </div>
            ) : (
                <Button
                    onClick={endExpedition}
                    className="w-full bg-transparent border-2 border-[#ff0040] text-[#ff0040] hover:bg-[#ff0040] hover:text-[#050810] uppercase tracking-wider text-xs cursor-pointer"
                >
                    {t("planet_panel.expedition_end_btn")}
                </Button>
            )}
        </div>
    );
}
