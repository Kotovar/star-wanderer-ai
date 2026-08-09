"use client";

import { useState } from "react";
import { useGameStore } from "@/game/store";
import { useCargoStatus } from "@/game/hooks/useCargoStatus";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/useTranslation";
import type {
  ExpeditionScanMode,
  ExploreTileType,
} from "@/game/types/exploration";
import { RESEARCH_RESOURCES, TRADE_GOODS } from "@/game/constants";
import { PLANET_POINT_OF_INTERESTS } from "@/game/constants/planets";
import {
  EXPEDITION_RUINS_MAX_DEPTH,
  getExpeditionEnvironment,
  getRuinsDepthDamage,
  getRuinsDepthRewardMultiplier,
  getTileTypesFor,
} from "@/game/slices/locations/helpers/expedition/constants";
import { ExpeditionMapCanvas } from "./ExpeditionMapCanvas";
import { EventIllustration } from "./EventIllustration";
import { ProfessionSprite } from "./ProfessionSprite";
import { getCrewDisplayName } from "@/game/crew/crewNames";

const TILE_COLORS: Record<ExploreTileType, { border: string; bg: string; glow: string }> = {
  market: { border: "#00ff41", bg: "rgba(0,255,65,0.08)", glow: "rgba(0,255,65,0.25)" },
  lab: { border: "#4488ff", bg: "rgba(68,136,255,0.08)", glow: "rgba(68,136,255,0.25)" },
  ruins: { border: "#ffb000", bg: "rgba(255,176,0,0.08)", glow: "rgba(255,176,0,0.25)" },
  incident: { border: "#ff0040", bg: "rgba(255,0,64,0.08)", glow: "rgba(255,0,64,0.25)" },
  artifact: { border: "#9933ff", bg: "rgba(153,51,255,0.08)", glow: "rgba(153,51,255,0.25)" },
  cache: { border: "#00ff41", bg: "rgba(0,255,65,0.08)", glow: "rgba(0,255,65,0.25)" },
  core_sample: { border: "#c9a227", bg: "rgba(201,162,39,0.08)", glow: "rgba(201,162,39,0.25)" },
  hazard: { border: "#ff0040", bg: "rgba(255,0,64,0.08)", glow: "rgba(255,0,64,0.25)" },
  signal: { border: "#00d4ff", bg: "rgba(0,212,255,0.08)", glow: "rgba(0,212,255,0.25)" },
};

const TILE_ICONS: Record<ExploreTileType, string> = {
  market: "🏪",
  lab: "🔬",
  ruins: "🏚️",
  incident: "⚠️",
  artifact: "✨",
  cache: "🎒",
  core_sample: "🪨",
  hazard: "☣️",
  signal: "📡",
};

export function PlanetExplorationPanel() {
  const expedition = useGameStore((s) => s.activeExpedition);
  const currentLocation = useGameStore((s) => s.currentLocation);
  const crew = useGameStore((s) => s.crew);
  const artifacts = useGameStore((s) => s.artifacts);
  const revealExpeditionTile = useGameStore((s) => s.revealExpeditionTile);
  const scanExpeditionTile = useGameStore((s) => s.scanExpeditionTile);
  const resolveRuinsChoice = useGameStore((s) => s.resolveRuinsChoice);
  const diveDeeperIntoRuins = useGameStore((s) => s.diveDeeperIntoRuins);
  const confirmRuinsOutcome = useGameStore((s) => s.confirmRuinsOutcome);
  const endExpedition = useGameStore((s) => s.endExpedition);
  const abortExpedition = useGameStore((s) => s.abortExpedition);
  const { t } = useTranslation();
  const { cargoFull } = useCargoStatus();

  const [showAbortConfirm, setShowAbortConfirm] = useState(false);
  const [scanMode, setScanMode] = useState<ExpeditionScanMode | null>(null);
  const [dismissedArtifactId, setDismissedArtifactId] = useState<string | null>(
    null,
  );

  if (!expedition) return null;

  const isEmptyPlanet = currentLocation?.isEmpty === true;
  const pointOfInterest =
    isEmptyPlanet && currentLocation.planetType
      ? currentLocation.pointOfInterest ??
        PLANET_POINT_OF_INTERESTS[currentLocation.planetType]
      : undefined;
  const environment = getExpeditionEnvironment(currentLocation?.planetType);

  const { grid, apRemaining, apTotal, rewards, activeRuinsEvent, ruinsOutcome, ruinsDepth: storedRuinsDepth, finished, crewIds } =
    expedition;
  const stepApCost = expedition.stepApCost ?? 1;
  const ruinsDepth = storedRuinsDepth ?? 0;
  const nextRuinsDepth = ruinsDepth + 1;
  const canDiveDeeper =
    !!ruinsOutcome &&
    ruinsDepth < EXPEDITION_RUINS_MAX_DEPTH &&
    apRemaining >= stepApCost;

  const expeditionCrew = crew.filter((c) => crewIds.includes(c.id));

  const canReveal = apRemaining >= stepApCost && !activeRuinsEvent && !finished;
  const scansRemaining = expedition.scansRemaining ?? 0;
  const orbitalScanAvailable = expedition.orbitalScanAvailable ?? false;
  const canScientistScan =
    scansRemaining > 0 && !activeRuinsEvent && !finished;
  const canOrbitalScan =
    orbitalScanAvailable && !activeRuinsEvent && !finished;
  const effectiveScanMode =
    scanMode === "scientist" && canScientistScan
      ? "scientist"
      : scanMode === "orbital" && canOrbitalScan
        ? "orbital"
        : null;
  const revealedCount = grid.filter((tile) => tile.revealed).length;
  const totalTiles = grid.length;
  const apExhausted = apRemaining < stepApCost && !finished;
  const canEndExpedition = apExhausted || finished;

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
  const foundArtifact = rewards.artifactFound
    ? artifacts.find((artifact) => artifact.id === rewards.artifactFound)
    : undefined;
  const showArtifactFound =
    !!foundArtifact &&
    foundArtifact.id !== dismissedArtifactId &&
    !activeRuinsEvent;
  const emptyArtifactTileIndex = expedition.emptyArtifactTileIndex ?? null;

  const handleAbort = () => {
    setShowAbortConfirm(false);
    abortExpedition();
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 bg-[rgba(5,8,16,0.95)] px-2 py-1.5 backdrop-blur-sm">
        <div className="font-['Orbitron'] font-bold text-ring uppercase tracking-wider text-sm shrink-0">
          🗺️ {t("planet_panel.expedition_active_title")}
        </div>
        {pointOfInterest && (
          <span className="text-[10px] text-[#00d4ff99] border border-[#00d4ff33] px-1.5 py-0.5 rounded-sm">
            ◈ {t("planet_panel.point_of_interest_title")}: {t(
              `planet_panel.point_of_interest_types.${pointOfInterest}`,
            )}
          </span>
        )}
        {environment && (
          <span className="text-[10px] text-[#ffb000] border border-[#ffb00055] px-1.5 py-0.5 rounded-sm">
            {environment.icon} {t(`planet_panel.expedition_environment.${environment.labelKey}`)}
          </span>
        )}
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
        <span
          aria-live={finished ? "polite" : "off"}
          className={`flex h-7 items-center gap-1 border border-[#00ff4144] bg-[rgba(0,255,65,0.06)] px-2 text-[10px] font-bold uppercase tracking-wider text-[#00ff41] ${finished ? "" : "invisible"}`}
        >
            <span className="animate-pulse">✓</span>
            {t("planet_panel.expedition_finished")}
        </span>
        <button
          onClick={canEndExpedition ? endExpedition : () => setShowAbortConfirm(true)}
          className={`h-7 w-48 shrink-0 cursor-pointer border text-[10px] uppercase tracking-wider transition-colors ${
            canEndExpedition
              ? "border-[#00ff41] bg-transparent text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810]"
              : "border-[#ff004066] bg-transparent text-[#ff6b6b] hover:bg-[#ff0040] hover:text-[#050810]"
          }`}
        >
          {canEndExpedition
            ? t("planet_panel.expedition_end_btn")
            : `✕ ${t("planet_panel.expedition_abort_btn")}`}
        </button>
      </div>

      {/* Scan controls */}
      {(scansRemaining > 0 || orbitalScanAvailable) && !finished && (
        <div className="grid gap-2 sm:grid-cols-2">
          {scansRemaining > 0 && (
            <button
              onClick={() =>
                setScanMode((mode) =>
                  mode === "scientist" ? null : "scientist",
                )
              }
              className={`min-h-14 border px-2 py-1.5 text-left transition-colors ${
                effectiveScanMode === "scientist"
                  ? "border-[#00d4ff] bg-[#00d4ff22] text-[#00d4ff]"
                  : "border-[#00d4ff55] bg-transparent text-[#00d4ff99] hover:border-[#00d4ff] hover:text-[#00d4ff]"
              }`}
            >
              <span className="block text-[10px] font-bold uppercase tracking-wider">
                🔭 {t("planet_panel.expedition_scan_btn")} · {scansRemaining}
              </span>
              <span className="mt-1 block text-[10px] normal-case leading-relaxed">
                {t("planet_panel.expedition_scientist_scan_rules", {
                  scans: scansRemaining,
                })}
              </span>
            </button>
          )}
          {orbitalScanAvailable && (
            <button
              onClick={() =>
                setScanMode((mode) =>
                  mode === "orbital" ? null : "orbital",
                )
              }
              className={`min-h-14 border px-2 py-1.5 text-left transition-colors ${
                effectiveScanMode === "orbital"
                  ? "border-[#00d4ff] bg-[#00d4ff22] text-[#00d4ff]"
                  : "border-[#00d4ff55] bg-transparent text-[#00d4ff99] hover:border-[#00d4ff] hover:text-[#00d4ff]"
              }`}
            >
              <span className="block text-[10px] font-bold uppercase tracking-wider">
                📡 {t("planet_panel.expedition_orbital_scan_btn")}
              </span>
              <span className="mt-1 block text-[10px] normal-case leading-relaxed">
                {t("planet_panel.expedition_orbital_scan_rules")}
              </span>
            </button>
          )}
        </div>
      )}
      <div
        aria-live="polite"
        className="min-h-10 -mt-1 flex items-center px-2 text-[10px] text-[#c69cff] border border-[#9933ff33] bg-[rgba(153,51,255,0.04)] rounded-sm"
      >
        {emptyArtifactTileIndex !== null
          ? `🗿 ${t("planet_panel.expedition_artifact_empty", { tile: emptyArtifactTileIndex + 1 })}`
          : "\u00a0"}
      </div>

      {/* Crew panel */}
      {expeditionCrew.length > 0 && (
        <div className="flex gap-1.5 flex-wrap lg:hidden">
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
                title={`${getCrewDisplayName(member)} · ${Math.round(member.health)}/${Math.round(member.maxHealth)} HP`}
              >
                <ProfessionSprite
                  race={member.race}
                  profession={member.profession}
                  size={20}
                />
                <span className="text-[10px] text-[#aaa] truncate max-w-15">
                  {getCrewDisplayName(member)}
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
            <DialogTitle className="text-destructive font-bold text-sm font-['Orbitron'] uppercase tracking-wider">
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
                className="flex-1 bg-transparent border border-[#ff004066] text-destructive hover:bg-destructive hover:text-[#050810] text-xs py-1.5 cursor-pointer uppercase tracking-wider"
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

      {/* Artifact discovery */}
      <Dialog
        open={showArtifactFound}
        onOpenChange={(open) => {
          if (!open && foundArtifact) {
            setDismissedArtifactId(foundArtifact.id);
          }
        }}
      >
        <DialogContent
          className="max-w-xs bg-[#050810] p-0"
          style={{ border: "2px solid #9933ff88" }}
          showCloseButton={false}
        >
          <div className="px-4 pt-4 pb-3 border-b border-[#9933ff44] bg-[rgba(153,51,255,0.08)] text-center">
            <div className="text-3xl mb-2">✨</div>
            <DialogTitle className="text-[#d9a8ff] font-bold text-sm font-['Orbitron'] uppercase tracking-wider">
              {t("planet_panel.expedition_artifact_found")}
            </DialogTitle>
          </div>
          <div className="flex flex-col gap-3 p-4 text-center">
            <div className="text-base font-bold text-[#d9a8ff]">
              {foundArtifact?.name}
            </div>
            <p className="text-xs text-[#aaa] leading-relaxed">
              {foundArtifact?.description}
            </p>
            <p className="text-[10px] text-[#9933ff99]">
              {t("planet_panel.expedition_artifact_dialog_desc")}
            </p>
            <Button
              onClick={() =>
                foundArtifact && setDismissedArtifactId(foundArtifact.id)
              }
              className="bg-transparent border border-[#9933ff88] text-[#d9a8ff] hover:bg-[#9933ff] hover:text-[#050810] text-xs py-2 cursor-pointer uppercase tracking-wider font-bold"
            >
              {t("effects.close")}
            </Button>
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
            <div className="text-[10px] text-accent uppercase tracking-widest font-['Orbitron'] mb-1 opacity-60">
              {t("planet_panel.tile_ruins")}
            </div>
            <DialogTitle className="text-accent font-bold text-sm font-['Orbitron'] uppercase tracking-wider">
              {activeRuinsEvent
                ? t(`planet_panel.${activeRuinsEvent.titleKey}`)
                : ""}
            </DialogTitle>
          </div>
          <div className="flex flex-col gap-3 p-4">
            <EventIllustration variant="ruins" accent="#ffb000" />
            {ruinsOutcome ? (
              // Фаза исхода: показываем, что произошло после выбора
              <>
                <div
                  className="text-sm font-bold text-center leading-relaxed border-l-2 pl-3 py-1"
                    style={{
                        borderColor:
                            ruinsOutcome.kind === "good"
                                ? "#00ff41"
                                : ruinsOutcome.kind === "bad"
                                  ? "#ff0040"
                                  : "#ffb000",
                        color:
                            ruinsOutcome.kind === "good"
                                ? "#00ff41"
                                : ruinsOutcome.kind === "bad"
                                  ? "#ff6b6b"
                                  : "#ffb000",
                    }}
                >
                  {ruinsOutcome.summary}
                </div>
                {canDiveDeeper && cargoFull && (
                  <div className="text-[10px] text-[#ffaa00] text-center">
                    {t("common.cargo_full_hint")}
                  </div>
                )}
                {canDiveDeeper && (
                  <Button
                    onClick={() => diveDeeperIntoRuins()}
                    className="bg-transparent border border-[#ff004066] text-[#ff6b6b] hover:bg-[#ff0040] hover:text-[#050810] text-xs py-2 cursor-pointer uppercase tracking-wider font-bold"
                  >
                    {t("planet_panel.expedition_ruins_deeper_btn", {
                      ap: stepApCost,
                      multiplier: getRuinsDepthRewardMultiplier(nextRuinsDepth),
                      damage: getRuinsDepthDamage(nextRuinsDepth),
                    })}
                  </Button>
                )}
                <Button
                    onClick={() => confirmRuinsOutcome()}
                    className="bg-[#ffb000] text-[#050810] hover:bg-[#ffd060] border-0 text-xs py-2 cursor-pointer uppercase tracking-wider font-bold"
                >
                    {t("planet_panel.expedition_ruins_continue")}
                </Button>
              </>
            ) : (
              // Фаза выбора
              <>
                {ruinsDepth > 0 && (
                  <div className="text-[10px] text-[#ff6b6b] border border-[#ff004044] bg-[rgba(255,0,64,0.05)] px-2 py-1.5 rounded-sm">
                    {t("planet_panel.expedition_ruins_depth", {
                      depth: ruinsDepth,
                      multiplier: getRuinsDepthRewardMultiplier(ruinsDepth),
                      damage: getRuinsDepthDamage(ruinsDepth),
                    })}
                  </div>
                )}
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
                            className="bg-transparent border border-[#ffb00066] text-accent hover:bg-accent hover:text-[#050810] text-xs py-1.5 cursor-pointer text-left justify-start"
                        >
                            {t(`planet_panel.${choice.labelKey}`)}
                        </Button>
                    ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col items-center gap-2 xl:flex-row xl:items-start xl:justify-center">
        <div className="flex min-w-0 justify-center">
          <ExpeditionMapCanvas
            grid={grid}
            apRemaining={apRemaining}
            apTotal={apTotal}
            canReveal={canReveal}
            scanMode={effectiveScanMode}
            onTileClick={(idx) => revealExpeditionTile(idx)}
            onScanClick={(idx, mode) => scanExpeditionTile(idx, mode)}
          />
        </div>

        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 xl:w-36 xl:flex-col xl:items-start xl:justify-start">
        {getTileTypesFor(isEmptyPlanet).map((type) => {
          const style = TILE_COLORS[type];
          return (
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
          );
        })}
        </div>
      </div>

      {/* AP exhausted hint */}
      {apExhausted && (
        <div className="flex items-center gap-2 px-3 py-2 border border-[#ffb00033] bg-[rgba(255,176,0,0.04)] rounded-sm">
          <span className="text-xs text-accent">
            {t("planet_panel.expedition_no_ap_hint")}
          </span>
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
                className="px-2 py-1 rounded-sm border border-[#ffb00044] bg-[rgba(255,176,0,0.08)] text-accent"
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

    </div>
  );
}
