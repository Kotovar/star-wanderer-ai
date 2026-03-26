"use client";

import { useGameStore } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/lib/useTranslation";
import type { ExploreTileType } from "@/game/types/exploration";
import { RESEARCH_RESOURCES, TRADE_GOODS } from "@/game/constants";

const TILE_COLORS: Record<
    ExploreTileType,
    { border: string; bg: string; icon: string }
> = {
    market: { border: "#00ff41", bg: "rgba(0,255,65,0.08)", icon: "🏪" },
    lab: { border: "#4488ff", bg: "rgba(68,136,255,0.08)", icon: "🔬" },
    ruins: { border: "#ffb000", bg: "rgba(255,176,0,0.08)", icon: "🏚️" },
    incident: { border: "#ff0040", bg: "rgba(255,0,64,0.08)", icon: "⚠️" },
    artifact: { border: "#9933ff", bg: "rgba(153,51,255,0.08)", icon: "✨" },
    exit: { border: "#00d4ff", bg: "rgba(0,212,255,0.08)", icon: "🚪" },
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

            {/* Grid — квадратные клетки через padding-bottom трюк */}
            <div className="max-w-150 mx-auto w-full">
                <div className="grid grid-cols-5 gap-0.5">
                    {grid.map((tile, idx) => {
                        if (!tile.revealed) {
                            return (
                                <div
                                    key={idx}
                                    className="relative w-full"
                                    style={{ paddingBottom: "100%" }}
                                >
                                    <button
                                        onClick={() =>
                                            canReveal &&
                                            revealExpeditionTile(idx)
                                        }
                                        disabled={!canReveal}
                                        className={`absolute inset-0 flex items-center justify-center border transition-all ${
                                            canReveal
                                                ? "border-[#333] bg-[rgba(255,255,255,0.02)] hover:border-[#555] hover:bg-[rgba(255,255,255,0.05)] cursor-pointer"
                                                : "border-[#222] bg-[rgba(0,0,0,0.3)] cursor-default opacity-50"
                                        }`}
                                    >
                                        <span className="text-[#333] text-xs font-bold">
                                            ?
                                        </span>
                                    </button>
                                </div>
                            );
                        }

                        const style = TILE_COLORS[tile.type];
                        return (
                            <div
                                key={idx}
                                className="relative w-full"
                                style={{ paddingBottom: "100%" }}
                            >
                                <div
                                    className="absolute inset-0 flex items-center justify-center border"
                                    style={{
                                        borderColor: style.border,
                                        backgroundColor: style.bg,
                                    }}
                                    title={t(`planet_panel.tile_${tile.type}`)}
                                >
                                    <span className="text-base leading-none">
                                        {style.icon}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Tile legend */}
            <div className="flex flex-wrap gap-2 text-xs">
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
                        {style.icon} {t(`planet_panel.tile_${type}`)}
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
