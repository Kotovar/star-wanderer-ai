"use client";

import { useState } from "react";
import { useGameStore } from "@/game/store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/useTranslation";
import type { ExploreTileType } from "@/game/types/exploration";
import { RESEARCH_RESOURCES, TRADE_GOODS } from "@/game/constants";
import { ExpeditionMapCanvas } from "./ExpeditionMapCanvas";
import { EventIllustration } from "./EventIllustration";
import { ProfessionSprite } from "./ProfessionSprite";

const TILE_COLORS: Record<ExploreTileType, { border: string; bg: string; glow: string }> = {
  market: { border: "#00ff41", bg: "rgba(0,255,65,0.08)", glow: "rgba(0,255,65,0.25)" },
  lab: { border: "#4488ff", bg: "rgba(68,136,255,0.08)", glow: "rgba(68,136,255,0.25)" },
  ruins: { border: "#ffb000", bg: "rgba(255,176,0,0.08)", glow: "rgba(255,176,0,0.25)" },
  incident: { border: "#ff0040", bg: "rgba(255,0,64,0.08)", glow: "rgba(255,0,64,0.25)" },
  artifact: { border: "#9933ff", bg: "rgba(153,51,255,0.08)", glow: "rgba(153,51,255,0.25)" },
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
  const crew = useGameStore((s) => s.crew);
  const revealExpeditionTile = useGameStore((s) => s.revealExpeditionTile);
  const resolveRuinsChoice = useGameStore((s) => s.resolveRuinsChoice);
  const endExpedition = useGameStore((s) => s.endExpedition);
  const { t } = useTranslation();

  const [showAbortConfirm, setShowAbortConfirm] = useState(false);

  if (!expedition) return null;

  const { grid, apRemaining, apTotal, rewards, activeRuinsEvent, finished, crewIds } =
    expedition;

  const expeditionCrew = crew.filter((c) => crewIds.includes(c.id));

  const canReveal = apRemaining > 0 && !activeRuinsEvent && !finished;
  const revealedCount = grid.filter((tile) => tile.revealed).length;
  const totalTiles = grid.length;
  const apExhausted = apRemaining === 0 && !finished;

  const apPct = apTotal > 0 ? (apRemaining / apTotal) * 100 : 0;
  const apColor =
    apRemaining > apTotal * 0.5
      ? "#00d4ff"
      : apRemaining > apTotal * 0.25
        ? "#ffb000"
        : "#ff0040";

  const hasRewards =
    rewards.credits > 0 ||
    rewards.tradeGoods.length > 0 ||
    rewards.researchResources.length > 0 ||
    rewards.artifactFound;

  const handleAbort = () => {
    setShowAbortConfirm(false);
    endExpedition();
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="font-['Orbitron'] font-bold text-[#00d4ff] uppercase tracking-wider text-sm shrink-0">
          🗺️ {t("planet_panel.expedition_active_title")}
        </div>
        {/* Tile counter */}
        <span className="text-xs font-mono text-[#00d4ff66] shrink-0">
          {revealedCount}/{totalTiles}
        </span>
        <div className="flex-1" />
        {/* AP bar */}
        <div className="flex items-center gap-2">
          <div className="w-28 h-2 rounded-full bg-[#1a1a2e] overflow-hidden border border-[#1a2a3a]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${apPct}%`,
                background: apColor,
                boxShadow:
                  apRemaining > 0 ? `0 0 8px ${apColor}88` : "none",
              }}
            />
          </div>
          <span
            className="text-xs font-bold whitespace-nowrap font-['Orbitron']"
            style={{ color: apColor }}
          >
            {apRemaining}/{apTotal} AP
          </span>
        </div>
        {/* Abort link */}
        {!finished && !apExhausted && (
          <button
            onClick={() => setShowAbortConfirm(true)}
            className="text-[10px] text-[#ff004055] hover:text-[#ff0040] transition-colors cursor-pointer uppercase tracking-wider shrink-0"
          >
            ✕ {t("planet_panel.expedition_abort_btn")}
          </button>
        )}
      </div>

      {/* Crew panel */}
      {expeditionCrew.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {expeditionCrew.map((member) => {
            const hpPct =
              member.maxHealth > 0
                ? (member.health / member.maxHealth) * 100
                : 0;
            const hpColor =
              hpPct > 60 ? "#00ff41" : hpPct > 30 ? "#ffb000" : "#ff0040";
            return (
              <div
                key={member.id}
                className="flex items-center gap-1.5 px-2 py-1 border border-[#1a2a3a] bg-[rgba(0,212,255,0.04)] rounded-sm"
                title={`${member.name} · ${member.health}/${member.maxHealth} HP`}
              >
                <ProfessionSprite
                  race={member.race}
                  profession={member.profession}
                  size={20}
                />
                <span className="text-[10px] text-[#aaa] truncate max-w-[60px]">
                  {member.name}
                </span>
                <div className="w-8 h-1 rounded-full bg-[#1a1a1a] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${hpPct}%`,
                      backgroundColor: hpColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Abort confirmation */}
      <Dialog open={showAbortConfirm} onOpenChange={setShowAbortConfirm}>
        <DialogContent
          className="max-w-xs bg-[#050810] p-0"
          style={{ border: "2px solid #ff004066" }}
        >
          <div className="px-4 pt-4 pb-3 border-b border-[#ff004033] bg-[rgba(255,0,64,0.04)]">
            <DialogTitle className="text-[#ff0040] font-bold text-sm font-['Orbitron'] uppercase tracking-wider">
              {t("planet_panel.expedition_abort_btn")}?
            </DialogTitle>
          </div>
          <div className="flex flex-col gap-3 p-4">
            <p className="text-xs text-[#aaa] leading-relaxed">
              {t("planet_panel.expedition_abort_desc")}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleAbort}
                className="flex-1 bg-transparent border border-[#ff004066] text-[#ff0040] hover:bg-[#ff0040] hover:text-[#050810] text-xs py-1.5 cursor-pointer uppercase tracking-wider"
              >
                ✕ {t("planet_panel.expedition_abort_btn")}
              </Button>
              <Button
                onClick={() => setShowAbortConfirm(false)}
                className="flex-1 bg-transparent border border-[#333] text-[#888] hover:bg-[#222] text-xs py-1.5 cursor-pointer uppercase tracking-wider"
              >
                {t("effects.cancel")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ruins event modal */}
      <Dialog open={!!activeRuinsEvent}>
        <DialogContent
          className="max-w-sm bg-[#050810] p-0"
          style={{ border: "2px solid #ffb00066" }}
          onInteractOutside={(e) => e.preventDefault()}
          showCloseButton={false}
        >
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

      {/* Tile legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
        {(
          Object.entries(TILE_COLORS) as [
            ExploreTileType,
            (typeof TILE_COLORS)[ExploreTileType],
          ][]
        ).map(([type, style]) => (
          <span
            key={type}
            className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-sm border"
            style={{
              color: style.border,
              borderColor: `${style.border}44`,
              background: style.bg,
            }}
          >
            {TILE_ICONS[type]} {t(`planet_panel.tile_${type}`)}
          </span>
        ))}
      </div>

      {/* AP exhausted hint */}
      {apExhausted && (
        <div className="flex items-center gap-2 px-3 py-2 border border-[#ffb00033] bg-[rgba(255,176,0,0.04)] rounded-sm">
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
        <div className="border border-[#1a2a1a] p-3 bg-[rgba(0,255,65,0.03)] rounded-sm">
          <div className="text-[10px] text-[#888] uppercase tracking-wider mb-2 font-['Orbitron']">
            {t("planet_panel.expedition_rewards_title")}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {rewards.credits > 0 && (
              <span className="px-2 py-1 rounded-sm border border-[#00ff4144] bg-[rgba(0,255,65,0.08)] text-[#00ff41] font-bold">
                +{rewards.credits}₢
              </span>
            )}
            {rewards.tradeGoods.map((tg) => (
              <span
                key={tg.id}
                className="px-2 py-1 rounded-sm border border-[#ffb00044] bg-[rgba(255,176,0,0.08)] text-[#ffb000]"
              >
                📦 {TRADE_GOODS[tg.id]?.name ?? tg.id} ×{tg.quantity}
              </span>
            ))}
            {rewards.researchResources.map((res) => {
              const rd = RESEARCH_RESOURCES[res.type];
              return (
                <span
                  key={res.type}
                  className="px-2 py-1 rounded-sm border bg-opacity-10"
                  style={{
                    color: rd?.color ?? "#4488ff",
                    borderColor: `${rd?.color ?? "#4488ff"}44`,
                    background: `${rd?.color ?? "#4488ff"}14`,
                  }}
                >
                  {rd?.icon ?? ""} {rd?.name ?? res.type} ×{res.quantity}
                </span>
              );
            })}
            {rewards.artifactFound && (
              <span className="px-2 py-1 rounded-sm border border-[#9933ff44] bg-[rgba(153,51,255,0.08)] text-[#9933ff] font-bold">
                ✨ {t("planet_panel.expedition_artifact_found")}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Finished state */}
      {finished && (
        <div className="flex flex-col gap-2">
          <div
            className="flex items-center gap-2 px-3 py-2 border rounded-sm"
            style={{
              borderColor: "#00ff4144",
              background: "rgba(0,255,65,0.06)",
              boxShadow: "0 0 20px rgba(0,255,65,0.1)",
            }}
          >
            <span className="text-[#00ff41] text-base animate-pulse">✓</span>
            <span className="text-sm text-[#00ff41] font-bold font-['Orbitron'] uppercase tracking-wider">
              {t("planet_panel.expedition_finished")}
            </span>
            <span className="text-xs text-[#00ff4155] font-mono ml-auto">
              {revealedCount}/{totalTiles}
            </span>
          </div>
          <Button
            onClick={endExpedition}
            className="w-full bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider cursor-pointer font-['Orbitron']"
          >
            {t("planet_panel.expedition_end_btn")}
          </Button>
        </div>
      )}
    </div>
  );
}
