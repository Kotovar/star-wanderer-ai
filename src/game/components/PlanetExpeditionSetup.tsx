"use client";

import { useState } from "react";
import { useGameStore } from "@/game/store";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";
import { getTechBonusSum } from "@/game/research";

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
                            <span className="text-lg">
                                {PROFESSION_ICONS[member.profession] ?? "👤"}
                            </span>
                            <div className="flex-1">
                                <div className="text-sm font-bold">
                                    {member.name}
                                </div>
                                <div className="text-xs opacity-70">
                                    {t(`professions.${member.profession}`)} ·{" "}
                                    {t("effects.level_short")}
                                    {member.level} · {member.health}/
                                    {member.maxHealth} HP
                                    {fatigued &&
                                        ` · 😴 ${member.expeditionFatigue} ${t("effects.turns")}`}
                                </div>
                            </div>
                            {selected && !fatigued && (
                                <span className="text-[#00d4ff] text-xs">
                                    ✓
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="items-center text-sm text-[#888] flex flex-wrap gap-x-3 gap-y-1 ali">
                <span>
                    <span className="text-[#00d4ff] font-bold">
                        {t("planet_panel.expedition_ap_label")}:
                    </span>{" "}
                    <span className="text-white font-bold">{totalAP}</span>
                </span>
                {syntheticBonus > 0 && (
                    <span className="text-xs text-[#4488ff]">
                        +{syntheticBonus} синтетики
                    </span>
                )}
                {techBonus > 0 && (
                    <span className="text-xs text-[#00d4ff]">
                        +{techBonus} 🎒 комплекты
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
