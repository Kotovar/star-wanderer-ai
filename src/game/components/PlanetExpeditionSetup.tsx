"use client";

import { useState } from "react";
import { useGameStore } from "@/game/store";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";
import { getTechBonusSum } from "@/game/research";
import { RACES } from "@/game/constants/races";
import {
    EXPEDITION_SCANS_PER_SCIENTIST,
    getExpeditionEnvironment,
} from "@/game/slices/locations/helpers/expedition/constants";
import { countPrepPeeks } from "@/game/slices/locations/helpers/expedition/prepPeeks";
import { LOW_GRAVITY_EXPEDITION_AP, planetHasFeature } from "@/game/planets";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProfessionSprite } from "./ProfessionSprite";
import { getCrewDisplayName } from "@/game/crew/crewNames";

interface Props {
    planetId: string;
    onClose: () => void;
}

export function PlanetExpeditionSetup({ planetId, onClose }: Props) {
    const crew = useGameStore((s) => s.crew);
    const planet = useGameStore((s) =>
        s.currentSector?.locations.find((location) => location.id === planetId),
    );
    const startExpedition = useGameStore((s) => s.startExpedition);
    const research = useGameStore((s) => s.research);
    const { t } = useTranslation();

    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const syntheticBonus = selectedIds.filter((id) => {
        const m = crew.find((c) => c.id === id);
        return m?.race === "synthetic";
    }).length;
    const scoutBonus = selectedIds.filter((id) => {
        const m = crew.find((c) => c.id === id);
        return m?.profession === "scout";
    }).length;
    const scientistCount = selectedIds.filter((id) => {
        const m = crew.find((c) => c.id === id);
        return m?.profession === "scientist";
    }).length;
    const scansTotal = scientistCount * EXPEDITION_SCANS_PER_SCIENTIST;
    const techBonus = getTechBonusSum(research, "expedition_ap");
    const gravityBonus = planetHasFeature(planetId, "low_gravity")
        ? LOW_GRAVITY_EXPEDITION_AP
        : 0;
    const totalAP =
        selectedIds.length +
        syntheticBonus +
        scoutBonus +
        techBonus +
        gravityBonus;
    const prepPeeks = planet ? countPrepPeeks(planet) : 0;
    const environment = getExpeditionEnvironment(planet?.planetType);

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
            {environment && (
                <div className="text-xs text-[#ffb000] border border-[#ffb00055] bg-[rgba(255,176,0,0.05)] px-2 py-1.5 rounded-sm">
                    {environment.icon}{" "}
                    {t(
                        `planet_panel.expedition_environment.${environment.labelKey}`,
                    )}
                </div>
            )}

            <div className="text-xs text-[#ffb000] uppercase tracking-wider">
                {t("planet_panel.expedition_crew_select")}
            </div>

            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto scrollbar-gutter-stable pr-1">
                {crew.map((member) => {
                    const selected = selectedIds.includes(member.id);
                    const fatigued = (member.expeditionFatigue ?? 0) > 0;
                    const hasExpeditionFatigue = RACES[member.race].hasFatigue !== false;
                    const hpPct = member.maxHealth > 0 ? (member.health / member.maxHealth) * 100 : 0;
                    const hpColor = hpPct > 60 ? "#00ff41" : hpPct > 30 ? "#ffb000" : "#ff0040";
                    const isSynthetic = member.race === "synthetic";
                    return (
                        <button
                            key={member.id}
                            onClick={() => !fatigued && toggleCrew(member.id)}
                            disabled={fatigued}
                            className={`flex items-center gap-3 p-2.5 border text-left transition-all duration-150 rounded-sm ${
                                fatigued
                                    ? "border-[#222] text-[#444] cursor-not-allowed opacity-50"
                                    : selected
                                      ? "border-[#00d4ff] bg-[rgba(0,212,255,0.1)] text-[#00d4ff] cursor-pointer shadow-[0_0_10px_rgba(0,212,255,0.15)]"
                                      : "border-[#333] text-[#888] hover:border-[#555] hover:text-[#ccc] hover:bg-[rgba(255,255,255,0.02)] cursor-pointer"
                            }`}
                        >
                            <ProfessionSprite
                                race={member.race}
                                profession={member.profession}
                                size={40}
                                title={t(`professions.${member.profession}`)}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="text-sm font-bold truncate">
                                        {getCrewDisplayName(member)}
                                    </span>
                                    {isSynthetic && (
                                        <span
                                            className="text-[9px] px-1 py-0.5 rounded-sm bg-[rgba(68,136,255,0.15)] text-[#4488ff] border border-[#4488ff44] font-bold uppercase tracking-wider"
                                            title={t("planet_panel.expedition_synthetic_bonus", { count: 1 })}
                                        >
                                            +AP
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs opacity-70 mb-1.5">
                                    {t(`professions.${member.profession}`)} ·{" "}
                                    {t("effects.level_short")}
                                    {member.level}
                                </div>
                                {fatigued ? (
                                    <div className="text-[10px] text-[#ffb000] mt-1">
                                        {member.expeditionFatigue && t("planet_panel.expedition_fatigue_reason", { turns: member.expeditionFatigue })}
                                    </div>
                                ) : !hasExpeditionFatigue ? (
                                    <div className="text-[10px] text-[#4488ff] mt-1">
                                        {t("planet_panel.expedition_no_fatigue")}
                                    </div>
                                ) : null}
                                {/* HP bar */}
                                <div className="flex items-center gap-1.5">
                                    <div className="flex-1 h-2 rounded-full bg-[#1a1a1a] overflow-hidden border border-[#222]">
                                        <div
                                            className="h-full rounded-full transition-all duration-300"
                                            style={{
                                                width: `${hpPct}%`,
                                                backgroundColor: hpColor,
                                            }}
                                        />
                                    </div>
                                    <span className="text-[10px] opacity-50 whitespace-nowrap font-mono">
                                        {Math.round(member.health)}/{Math.round(member.maxHealth)}
                                    </span>
                                </div>
                            </div>
                            <span
                                aria-hidden="true"
                                className="w-5 shrink-0 text-center text-[#00d4ff] text-lg"
                            >
                                {selected && !fatigued ? "✓" : ""}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* AP breakdown */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 border border-[#00d4ff44] px-2 py-1 bg-[rgba(0,212,255,0.05)] cursor-help rounded-sm">
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
                {scoutBonus > 0 && (
                    <span className="text-[#00ff41]">
                        {t("planet_panel.expedition_scout_bonus", { count: scoutBonus })}
                    </span>
                )}
                {techBonus > 0 && (
                    <span className="text-[#00d4ff]">
                        {t("planet_panel.expedition_kit_bonus", { count: techBonus })}
                    </span>
                )}
                {gravityBonus > 0 && (
                    <span className="text-[#ffb000]">
                        {t("planet_panel.expedition_gravity_bonus", { count: gravityBonus })}
                    </span>
                )}
                {scansTotal > 0 && (
                    <span className="text-[#00d4ffaa]">
                        {t("planet_panel.expedition_scans_bonus", { count: scansTotal })}
                    </span>
                )}
            </div>

            {/* Подготовка к высадке: что дали орбитальный скан, анализ и бурение.
                Только для необитаемых — на населённой планете этих операций нет,
                и совет «стоило подготовиться» там невыполним. */}
            {planet?.isEmpty && (
                <div className="text-[10px] sm:text-xs">
                    {prepPeeks > 0 ? (
                        <span className="text-[#00d4ffaa]">
                            {t("planet_panel.expedition_prep_peeks", { count: prepPeeks })}
                        </span>
                    ) : (
                        <span className="text-[#888]">
                            {t("planet_panel.expedition_prep_none")}
                        </span>
                    )}
                </div>
            )}

            <div
                className={`text-xs text-[#ff0040] ${selectedIds.length > 0 ? "invisible" : ""}`}
            >
                {t("planet_panel.expedition_no_crew")}
            </div>

            <div className="flex gap-2 mt-2">
                <Button
                    onClick={handleLaunch}
                    disabled={selectedIds.length === 0}
                    className={`flex-1 uppercase tracking-wider text-sm border-2 bg-transparent transition-all duration-200 font-['Orbitron'] ${
                        selectedIds.length > 0
                            ? "border-[#00d4ff] text-[#00d4ff] hover:bg-[#00d4ff] hover:text-[#050810] cursor-pointer shadow-[0_0_15px_rgba(0,212,255,0.2)] hover:shadow-[0_0_25px_rgba(0,212,255,0.4)]"
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
