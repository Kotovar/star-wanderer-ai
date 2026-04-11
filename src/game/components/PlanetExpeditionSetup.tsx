"use client";

import { useState } from "react";
import { useGameStore } from "@/game/store";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";
import { getTechBonusSum } from "@/game/research";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
    planetId: string;
    onClose: () => void;
}

const PROFESSION_ICONS: Record<string, string> = {
    pilot: "✈️",
    engineer: "🔧",
    medic: "💉",
    scout: "🔭",
    scientist: "🔬",
    gunner: "🎯",
};

export function PlanetExpeditionSetup({ planetId, onClose }: Props) {
    const crew = useGameStore((s) => s.crew);
    const startExpedition = useGameStore((s) => s.startExpedition);
    const research = useGameStore((s) => s.research);
    const { t } = useTranslation();

    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const syntheticBonus = selectedIds.filter((id) => {
        const m = crew.find((c) => c.id === id);
        return m?.race === "synthetic";
    }).length;
    const techBonus = getTechBonusSum(research, "expedition_ap");
    const totalAP = selectedIds.length + syntheticBonus + techBonus;

    function toggleCrew(id: number) {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    }

    function handleLaunch() {
        if (selectedIds.length === 0) return;
        startExpedition(planetId, selectedIds);
        onClose();
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="font-['Orbitron'] font-bold text-[#00d4ff] text-base uppercase tracking-wider">
                🗺️ {t("planet_panel.expedition_setup_title")}
            </div>
            <div className="text-sm text-[#888]">
                {t("planet_panel.explore_planet_desc")}
            </div>

            <div className="text-xs text-[#ffb000] uppercase tracking-wider">
                {t("planet_panel.expedition_crew_select")}
            </div>

            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {crew.map((member) => {
                    const selected = selectedIds.includes(member.id);
                    const fatigued = (member.expeditionFatigue ?? 0) > 0;
                    const hpPct = member.maxHealth > 0 ? (member.health / member.maxHealth) * 100 : 0;
                    const hpColor = hpPct > 60 ? "#00ff41" : hpPct > 30 ? "#ffb000" : "#ff0040";
                    return (
                        <button
                            key={member.id}
                            onClick={() => !fatigued && toggleCrew(member.id)}
                            disabled={fatigued}
                            className={`flex items-center gap-3 p-2 border text-left transition-colors ${
                                fatigued
                                    ? "border-[#222] text-[#444] cursor-not-allowed opacity-50"
                                    : selected
                                      ? "border-[#00d4ff] bg-[rgba(0,212,255,0.1)] text-[#00d4ff] cursor-pointer"
                                      : "border-[#333] text-[#888] hover:border-[#555] hover:text-[#ccc] cursor-pointer"
                            }`}
                        >
                            <span className="text-lg shrink-0">
                                {PROFESSION_ICONS[member.profession] ?? "👤"}
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold truncate">
                                    {member.name}
                                </div>
                                <div className="text-xs opacity-70 mb-1">
                                    {t(`professions.${member.profession}`)} ·{" "}
                                    {t("effects.level_short")}
                                    {member.level}
                                    {fatigued &&
                                        ` · 😴 ${member.expeditionFatigue} ${t("effects.turns")}`}
                                </div>
                                {/* HP bar */}
                                <div className="flex items-center gap-1.5">
                                    <div className="flex-1 h-1 rounded-full bg-[#1a1a1a] overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{
                                                width: `${hpPct}%`,
                                                backgroundColor: hpColor,
                                            }}
                                        />
                                    </div>
                                    <span className="text-[10px] opacity-50 whitespace-nowrap">
                                        {member.health}/{member.maxHealth}
                                    </span>
                                </div>
                            </div>
                            {selected && !fatigued && (
                                <span className="text-[#00d4ff] text-base shrink-0">✓</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* AP breakdown */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 border border-[#00d4ff44] px-2 py-1 bg-[rgba(0,212,255,0.05)] cursor-help">
                                <span className="text-[#888]">{t("planet_panel.expedition_ap_label")}:</span>
                                <span className="text-white font-bold text-sm">{totalAP}</span>
                                <span className="text-[#555] text-[9px]">?</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-60 text-xs">
                            {t("planet_panel.expedition_ap_tooltip")}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <span className="text-[#555]">= {selectedIds.length} 👤</span>
                {syntheticBonus > 0 && (
                    <span className="text-[#4488ff]">
                        {t("planet_panel.expedition_synthetic_bonus", { count: syntheticBonus })}
                    </span>
                )}
                {techBonus > 0 && (
                    <span className="text-[#00d4ff]">
                        {t("planet_panel.expedition_kit_bonus", { count: techBonus })}
                    </span>
                )}
            </div>

            {selectedIds.length === 0 && (
                <div className="text-xs text-[#ff0040]">
                    {t("planet_panel.expedition_no_crew")}
                </div>
            )}

            <div className="flex gap-2 mt-2">
                <Button
                    onClick={handleLaunch}
                    disabled={selectedIds.length === 0}
                    className={`flex-1 uppercase tracking-wider text-sm border-2 bg-transparent ${
                        selectedIds.length > 0
                            ? "border-[#00d4ff] text-[#00d4ff] hover:bg-[#00d4ff] hover:text-[#050810] cursor-pointer"
                            : "border-[#333] text-[#333] cursor-not-allowed"
                    }`}
                >
                    {t("planet_panel.expedition_launch")}
                </Button>
                <Button
                    onClick={onClose}
                    className="border-2 border-[#555] text-[#888] bg-transparent hover:bg-[#222] cursor-pointer uppercase text-sm"
                >
                    ✕
                </Button>
            </div>
        </div>
    );
}
