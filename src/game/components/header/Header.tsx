"use client";

import { useState, useEffect, useRef } from "react";
import { useGameStore } from "@/game/store";
import { HelpPanel } from "../panels";
import { SettingsPanel } from "../SaveLoadPanel";
import { GLOBAL_CRISES } from "@/game/constants/globalCrises";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { GameDialogContent } from "../GameDialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";
import { getCampaignDirective } from "@/game/constants/victoryObjectives";

export function GameHeader() {
  const [showHelp, setShowHelp] = useState(false);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [dismissedCrisisWidgetKey, setDismissedCrisisWidgetKey] = useState<
    string | null
  >(null);
  const [crisisWidgetPosition, setCrisisWidgetPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const turn = useGameStore((s) => s.turn);
  const credits = useGameStore((s) => s.credits);
  const activeCrisis = useGameStore((s) => s.activeCrisis);
  const currentSector = useGameStore((s) => s.currentSector);
  const traveling = useGameStore((s) => s.traveling);
  const artifacts = useGameStore((s) => s.artifacts);
  const activeEffects = useGameStore((s) => s.activeEffects);
  const completedContractIds = useGameStore((s) => s.completedContractIds);
  const completedLocations = useGameStore((s) => s.completedLocations);
  const completedVictoryObjectiveIds = useGameStore(
    (s) => s.completedVictoryObjectiveIds,
  );
  const galaxy = useGameStore((s) => s.galaxy);
  const knownRaces = useGameStore((s) => s.knownRaces);
  const raceReputation = useGameStore((s) => s.raceReputation);
  const research = useGameStore((s) => s.research);
  const startModifierIds = useGameStore((s) => s.startModifierIds);
  const showArtifacts = useGameStore((s) => s.showArtifacts);
  const showEffects = useGameStore((s) => s.showEffects);
  const showResearch = useGameStore((s) => s.showResearch);
  const showReputation = useGameStore((s) => s.showReputation);
  const showCrises = useGameStore((s) => s.showCrises);
  const showEnemyCodex = useGameStore((s) => s.showEnemyCodex);
  const showSectorMap = useGameStore((s) => s.showSectorMap);
  const gameMode = useGameStore((s) => s.gameMode);
  const { t } = useTranslation();

  const discoveredArtifacts = artifacts.filter((a) => a.discovered).length;
  const activeArtifacts = artifacts.filter((a) => a.effect.active).length;
  const crisis = activeCrisis
    ? GLOBAL_CRISES.find((item) => item.id === activeCrisis.id)
    : null;
  const crisisWidgetRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const isDraggingCrisisRef = useRef(false);
  const crisisWidgetKey = activeCrisis ? `active:${activeCrisis.id}` : "none";
  const crisisWidgetDismissed = dismissedCrisisWidgetKey === crisisWidgetKey;
  const campaignDirective = getCampaignDirective({
    artifacts,
    completedContractIds,
    completedLocations,
    completedVictoryObjectiveIds,
    credits,
    currentSector,
    galaxy,
    knownRaces,
    raceReputation,
    research,
    startModifierIds,
    traveling,
  });

  const handleRestartClick = () => {
    setShowSettings(false);
    setShowRestartDialog(true);
  };

  const handleTutorialClick = () => {
    setShowSettings(false);
    window.dispatchEvent(new CustomEvent("sw:showTutorial"));
  };

  const handleGuideClick = () => {
    setShowSettings(false);
    setShowHelp(true);
  };

  const handleRestartConfirm = () => {
    setShowRestartDialog(false);
    window.dispatchEvent(new CustomEvent("sw:showTitleSetup"));
  };

  const handleArtifactsClick = () => {
    if (gameMode === "artifacts") {
      showSectorMap();
    } else {
      showArtifacts();
    }
  };

  const handleResearchClick = () => {
    if (gameMode === "research") {
      showSectorMap();
    } else {
      showResearch();
    }
  };

  const handleEffectsClick = () => {
    if (gameMode === "effects") {
      showSectorMap();
    } else {
      showEffects();
    }
  };

  const handleEnemyCodexClick = () => {
    if (gameMode === "enemy_codex") {
      showSectorMap();
    } else {
      showEnemyCodex();
    }
  };

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!isDraggingCrisisRef.current) return;
      setCrisisWidgetPosition({
        x: Math.max(
          8,
          Math.min(
            window.innerWidth - 328,
            event.clientX - dragOffsetRef.current.x,
          ),
        ),
        y: Math.max(
          8,
          Math.min(
            window.innerHeight - 140,
            event.clientY - dragOffsetRef.current.y,
          ),
        ),
      });
    };

    const handlePointerUp = () => {
      isDraggingCrisisRef.current = false;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  const startDraggingCrisisWidget = (clientX: number, clientY: number) => {
    const rect = crisisWidgetRef.current?.getBoundingClientRect();
    if (!rect) return;
    isDraggingCrisisRef.current = true;
    dragOffsetRef.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
    setCrisisWidgetPosition({
      x: rect.left,
      y: rect.top,
    });
  };

  return (
    <>
      <header className="cockpit-header select-none px-4 py-3 md:px-5 md:py-4 flex flex-col md:flex-row justify-between items-center gap-3 md:gap-0">
        <div className="flex flex-col items-center gap-1 md:items-start">
          <h1 className="cockpit-header__title font-['Orbitron'] font-black text-lg md:text-2xl tracking-[2px] md:tracking-[3px] text-[#00ff41] text-center md:text-left">
            ◆ {t("game.title")} ◆
          </h1>
          {campaignDirective && (
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new CustomEvent("sw:showCampaignProgress"))
              }
              title={t("campaign_directive.open_progress")}
              className="max-w-[min(92vw,25rem)] border border-[#ffb00077] bg-[rgba(255,176,0,0.06)] px-2 py-1 text-left text-[10px] leading-snug text-[#ffcc66] transition-colors hover:bg-[rgba(255,176,0,0.14)] cursor-pointer"
            >
              <span className="mr-2 font-bold tracking-[0.16em] text-accent">
                {t("campaign_directive.label")}
              </span>
              <span className="font-bold text-[#ffe0a0]">
                {t(
                  campaignDirective.displayTitleKey ??
                    campaignDirective.objective.titleKey,
                )}
              </span>
              <span className="hidden lg:inline"> — {t(campaignDirective.detail.key, campaignDirective.detail.params)}</span>
            </button>
          )}
        </div>
        <div className="flex gap-2 md:gap-4 text-xs md:text-sm items-center flex-wrap justify-center md:justify-normal">
          {/* ── Статистика ── */}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex items-center gap-1 md:gap-2">
              <span className="text-accent hidden md:inline">
                {t("game.turn")}:
              </span>
              <span className="text-accent md:hidden">🔢</span>
              <span className="font-bold text-[#00ff41]">{turn}</span>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              {traveling ? (
                <>
                  <span className="text-ring hidden md:inline">
                    {t("travel.heading")}:
                  </span>
                  <span className="text-ring md:hidden">🚀</span>
                  <span className="font-bold text-ring text-xs md:text-base">
                    {traveling.destination.name}
                  </span>
                  <span className="text-[#445544] text-[10px]">
                    {traveling.turnsLeft}/{traveling.turnsTotal}{" "}
                    {t("travel.turns_left")}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-accent hidden md:inline">
                    {t("game.sector")}:
                  </span>
                  <span className="text-accent md:hidden">📍</span>
                  <span className="font-bold text-[#00ff41] text-xs md:text-base">
                    {currentSector?.name || "START"}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <span className="text-accent">₢</span>
              <span className="font-bold text-[#00ff41]">
                {isNaN(credits) ? 0 : Math.floor(credits)}
              </span>
            </div>
          </div>

          <div className="w-px h-5 bg-[rgba(0,255,65,0.3)] hidden md:block" />

          {/* ── Панели ── */}
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={handleEffectsClick}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 border border-[#9933ff] hover:bg-[rgba(153,51,255,0.2)] transition-colors cursor-pointer relative"
              title={t("header.tooltip_effects")}
            >
              <span className="text-[#9933ff]">⚡</span>
              <span className="text-[#9933ff] hidden md:inline">
                {t("game.effects")}
              </span>
              {activeEffects.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#9933ff] text-[#050810] text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {activeEffects.length}
                </span>
              )}
            </button>
            <button
              onClick={handleArtifactsClick}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 border border-[#ff00ff] hover:bg-[rgba(255,0,255,0.2)] transition-colors cursor-pointer"
              title={t("header.tooltip_artifacts")}
            >
              <span className="text-[#ff00ff]">★</span>
              <span className="text-[#ff00ff]">{discoveredArtifacts}</span>
              {activeArtifacts > 0 && (
                <span className="text-[#00ff41] text-xs">
                  ({activeArtifacts})
                </span>
              )}
            </button>
            <button
              onClick={handleResearchClick}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 border border-[#9933ff] hover:bg-[rgba(153,51,255,0.2)] transition-colors cursor-pointer"
              title={t("header.tooltip_research")}
            >
              <span className="text-[#9933ff]">🔬</span>
              <span className="text-[#9933ff] hidden lg:inline">
                {t("game.science")}
              </span>
            </button>
            <button
              onClick={handleEnemyCodexClick}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 border border-[#00d4ff] hover:bg-[rgba(0,212,255,0.16)] transition-colors cursor-pointer"
              title={t("enemy_codex.button")}
            >
              <span className="text-ring">👾</span>
              <span className="text-ring hidden lg:inline">
                {t("enemy_codex.button")}
              </span>
            </button>
            <button
              onClick={() => {
                if (gameMode === "reputation") {
                  showSectorMap();
                } else {
                  showReputation();
                }
              }}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 border border-[#9933ff] hover:bg-[rgba(153,51,255,0.2)] transition-colors cursor-pointer"
              title={t("reputation.button_tooltip")}
            >
              <span className="text-[#9933ff] lg:hidden">🤝</span>
              <span className="text-[#9933ff] hidden lg:inline">
                {t("reputation.button")}
              </span>
            </button>
            <button
              onClick={() => {
                if (gameMode === "crises") {
                  showSectorMap();
                } else {
                  showCrises();
                }
              }}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 border border-[#ff4444] hover:bg-[rgba(255,68,68,0.2)] transition-colors cursor-pointer"
              title={t("crisis_panel.title")}
            >
              <span className="text-[#ff4444]">🚨</span>
              <span className="text-[#ff4444] hidden lg:inline">
                {t("crisis_panel.button")}
              </span>
            </button>
          </div>

          <div className="w-px h-5 bg-[rgba(0,255,65,0.3)] hidden md:block" />

          {/* ── Система ── */}
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 border border-ring hover:bg-[rgba(0,212,255,0.2)] transition-colors cursor-pointer"
              title={t("save_load.menu_title")}
            >
              <span className="text-ring">☰</span>
              <span className="text-ring hidden md:inline text-xs">
                {t("save_load.menu_title")}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Оверлей кризиса: не влияет на layout ── */}
      {activeCrisis && !crisisWidgetDismissed ? (
        <div
          ref={crisisWidgetRef}
          className={`fixed z-40 w-[min(90vw,320px)] ${crisisWidgetPosition ? "" : "bottom-3 left-1/2 -translate-x-1/2 md:bottom-auto md:top-20"}`}
          style={
            crisisWidgetPosition
              ? {
                  left: crisisWidgetPosition.x,
                  top: crisisWidgetPosition.y,
                }
              : undefined
          }
        >
          <div className="rounded-md border border-destructive bg-[rgba(28,6,14,0.9)] px-3 py-2 shadow-[0_0_20px_rgba(255,0,64,0.25)] backdrop-blur-sm">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#ff6680]">
              <button
                type="button"
                onPointerDown={(event) => {
                  event.preventDefault();
                  startDraggingCrisisWidget(event.clientX, event.clientY);
                }}
                className="cursor-grab active:cursor-grabbing rounded border border-[#ff668055] px-1.5 py-1 text-[11px] text-[#ff9aae] hover:bg-[rgba(255,102,128,0.12)]"
                title={t("crisis_panel.widget.drag")}
              >
                ⠿
              </button>
              <span>🚨</span>
              <span>{t("crisis_panel.widget.title")}</span>
              <button
                type="button"
                onClick={() => setDismissedCrisisWidgetKey(crisisWidgetKey)}
                className="ml-auto cursor-pointer rounded border border-[#ff668055] px-1.5 py-1 text-[11px] text-[#ff9aae] hover:bg-[rgba(255,102,128,0.12)]"
                title={t("crisis_panel.widget.close")}
              >
                ✕
              </button>
            </div>
            <div className="mt-1 text-sm font-semibold text-[#ffd6de]">
              {crisis?.icon ?? "⚠️"} {t(crisis?.nameKey ?? "")}
            </div>
            {crisis && (
              <>
                <div className="mt-1 text-[11px] leading-snug text-[#ffb6c4]">
                  {t(crisis.descriptionKey)}
                </div>
                <div className="mt-1 text-[10px] leading-snug text-[#ff8da2]">
                  {t(crisis.effectsKey)}
                </div>
              </>
            )}
            <div className="mt-1 text-[11px] text-[#ff8da2]">
              {t("crisis_panel.widget.turns_remaining", {
                count: activeCrisis.turnsRemaining,
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                showCrises();
                setDismissedCrisisWidgetKey(crisisWidgetKey);
              }}
              className="mt-2 w-full cursor-pointer rounded border border-[#ff668055] px-2 py-1 text-[10px] font-bold text-[#ffd6de] hover:bg-[rgba(255,102,128,0.14)]"
            >
              {t("crisis_panel.widget.open")}
            </button>
          </div>
        </div>
      ) : null}

      {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}
      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onGuide={handleGuideClick}
          onTutorial={handleTutorialClick}
          onRestart={handleRestartClick}
        />
      )}
      <Dialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
        <GameDialogContent variant="danger" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="cursor-pointer text-xl font-['Orbitron'] text-[#ff4444]">
              {t("ship.confirm_restart_title")}
            </DialogTitle>
            <DialogDescription className="text-[#00ff41] text-base mt-2">
              {t("ship.confirm_restart_desc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowRestartDialog(false)}
              className="cursor-pointer border-[#00ff41] text-[#00ff41] hover:bg-[rgba(0,255,65,0.1)]"
            >
              {t("ship.cancel")}
            </Button>
            <Button
              onClick={handleRestartConfirm}
              className="cursor-pointer bg-[#ff4444] text-white hover:bg-[#ff6666] border-0"
            >
              {t("ship.confirm")}
            </Button>
          </DialogFooter>
        </GameDialogContent>
      </Dialog>

    </>
  );
}
