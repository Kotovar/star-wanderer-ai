"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "@/game/store";
import { HelpPanel, ActiveEffectsPanel } from "../panels";
import { ResearchPanel } from "../ResearchPanel";
import { SaveLoadPanel } from "../SaveLoadPanel";
import { GLOBAL_CRISES, CRISIS_WARNING_TURNS } from "@/game/constants/globalCrises";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";

export function GameHeader() {
  const [showHelp, setShowHelp] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [showResearchModal, setShowResearchModal] = useState(false);
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  const turn = useGameStore((s) => s.turn);
  const credits = useGameStore((s) => s.credits);
  const activeCrisis = useGameStore((s) => s.activeCrisis);
  const nextCrisisTurn = useGameStore((s) => s.nextCrisisTurn);
  const currentSector = useGameStore((s) => s.currentSector);
  const artifacts = useGameStore((s) => s.artifacts);
  const activeEffects = useGameStore((s) => s.activeEffects);
  const showArtifacts = useGameStore((s) => s.showArtifacts);
  const showResearch = useGameStore((s) => s.showResearch);
  const showReputation = useGameStore((s) => s.showReputation);
  const closeReputationPanel = useGameStore((s) => s.closeReputationPanel);
  const gameMode = useGameStore((s) => s.gameMode);
  const { t, changeLanguage, currentLanguage } = useTranslation();

  const discoveredArtifacts = artifacts.filter((a) => a.discovered).length;
  const activeArtifacts = artifacts.filter((a) => a.effect.active).length;

  const handleRestartClick = () => {
    setShowRestartDialog(true);
  };

  const handleRestartConfirm = () => {
    setShowRestartDialog(false);
    window.dispatchEvent(new CustomEvent("sw:showTitleSetup"));
  };

  const handleArtifactsClick = () => {
    if (gameMode === "artifacts") {
      useGameStore.getState().closeArtifactsPanel();
    } else {
      showArtifacts();
    }
  };

  const handleResearchClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      // Save previous game mode for mobile modal (without changing gameMode)
      if (gameMode !== "research" && gameMode !== "artifacts") {
        useGameStore.getState().savePreviousGameMode();
      }
      setShowResearchModal(true);
    } else {
      if (gameMode === "research") {
        useGameStore.getState().closeResearchPanel();
      } else {
        showResearch();
      }
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setShowResearchModal(false);
        if (gameMode === "reputation") {
          closeReputationPanel();
        }
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [gameMode, closeReputationPanel]);

  return (
    <>
      <header className="bg-[rgba(10,20,30,0.9)] border-b-2 border-[#00ff41] px-4 py-3 md:px-5 md:py-4 flex flex-col md:flex-row justify-between items-center gap-3 md:gap-0 shadow-[0_0_20px_rgba(0,255,65,0.3)]">
        <h1 className="font-['Orbitron'] font-black text-lg md:text-2xl tracking-[2px] md:tracking-[3px] text-[#00ff41] animate-pulse drop-shadow-[0_0_10px_#00ff41] text-center md:text-left">
          ◆ {t("game.title")} ◆
        </h1>
        <div className="flex gap-2 md:gap-4 text-xs md:text-sm items-center flex-wrap justify-center md:justify-normal">

          {/* ── Статистика ── */}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex items-center gap-1 md:gap-2">
              <span className="text-[#ffb000] hidden md:inline">{t("game.turn")}:</span>
              <span className="text-[#ffb000] md:hidden">🔢</span>
              <span className="font-bold text-[#00ff41]">{turn}</span>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <span className="text-[#ffb000] hidden md:inline">{t("game.sector")}:</span>
              <span className="text-[#ffb000] md:hidden">📍</span>
              <span className="font-bold text-[#00ff41] text-xs md:text-base">
                {currentSector?.name || "START"}
              </span>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <span className="text-[#ffb000]">₢</span>
              <span className="font-bold text-[#00ff41]">
                {isNaN(credits) ? 0 : Math.floor(credits)}
              </span>
            </div>
          </div>

          <div className="w-px h-5 bg-[rgba(0,255,65,0.3)] hidden md:block" />

          {/* ── Панели ── */}
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 border border-[#00d4ff] hover:bg-[rgba(0,212,255,0.2)] transition-colors cursor-pointer"
              title={t("header.tooltip_logbook")}
            >
              <span className="text-[#00d4ff]">📖</span>
              <span className="text-[#00d4ff] hidden md:inline">{t("game.logbook")}</span>
            </button>
            <button
              onClick={() => setShowEffects(true)}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 border border-[#9933ff] hover:bg-[rgba(153,51,255,0.2)] transition-colors cursor-pointer relative"
              title={t("header.tooltip_effects")}
            >
              <span className="text-[#9933ff]">⚡</span>
              <span className="text-[#9933ff] hidden md:inline">{t("game.effects")}</span>
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
                <span className="text-[#00ff41] text-xs">({activeArtifacts})</span>
              )}
            </button>
            <button
              onClick={handleResearchClick}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 border border-[#9933ff] hover:bg-[rgba(153,51,255,0.2)] transition-colors cursor-pointer"
              title={t("header.tooltip_research")}
            >
              <span className="text-[#9933ff]">🔬</span>
              <span className="text-[#9933ff] hidden lg:inline">{t("game.science")}</span>
            </button>
            <button
              onClick={() => {
                if (gameMode === "reputation") {
                  closeReputationPanel();
                } else {
                  showReputation();
                }
              }}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 border border-[#9933ff] hover:bg-[rgba(153,51,255,0.2)] transition-colors cursor-pointer"
              title={t("reputation.button_tooltip")}
            >
              <span className="text-[#9933ff] lg:hidden">🤝</span>
              <span className="text-[#9933ff] hidden lg:inline">{t("reputation.button")}</span>
            </button>
          </div>

          <div className="w-px h-5 bg-[rgba(0,255,65,0.3)] hidden md:block" />

          {/* ── Система ── */}
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={() => setShowSaveLoad(true)}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 border border-[#00d4ff] hover:bg-[rgba(0,212,255,0.2)] transition-colors cursor-pointer"
              title={t("save_load.title")}
            >
              <span className="text-[#00d4ff]">💾</span>
              <span className="text-[#00d4ff] hidden md:inline text-xs">{t("save_load.title")}</span>
            </button>
            <button
              onClick={handleRestartClick}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 border border-[#ff4444] hover:bg-[rgba(255,68,68,0.2)] transition-colors cursor-pointer"
              title={t("header.tooltip_restart")}
            >
              <span className="text-[#ff4444]">🔄</span>
              <span className="text-[#ff4444] hidden md:inline">{t("game.restart")}</span>
            </button>
            <button
              onClick={() => changeLanguage(currentLanguage === "ru" ? "en" : "ru")}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 border border-[#00ff41] hover:bg-[rgba(0,255,65,0.2)] transition-colors cursor-pointer font-bold"
              title={t("language.switch")}
            >
              <span className="text-[#00ff41]">🌐</span>
              <span className="text-[#00ff41]">
                {currentLanguage === "ru" ? t("language.ru") : t("language.en")}
              </span>
            </button>
          </div>

        </div>
      </header>

      {/* ── Баннер кризиса ── */}
      {activeCrisis ? (
        (() => {
          const crisis = GLOBAL_CRISES.find((c) => c.id === activeCrisis.id);
          return (
            <div className="bg-[rgba(255,0,64,0.15)] border-b border-[#ff0040] px-4 py-1 flex items-center justify-center gap-3 text-xs animate-pulse">
              <span className="text-[#ff0040] font-bold">🚨 КРИЗИС:</span>
              <span className="text-[#ff6680]">
                {crisis?.icon ?? "⚠️"} {t(crisis?.nameKey ?? "")}
              </span>
              <span className="text-[#ff0040]">
                — осталось {activeCrisis.turnsRemaining}{" "}
                {activeCrisis.turnsRemaining === 1 ? "ход" : "хода"}
              </span>
            </div>
          );
        })()
      ) : nextCrisisTurn - turn <= CRISIS_WARNING_TURNS &&
        nextCrisisTurn - turn > 0 ? (
        <div className="bg-[rgba(255,176,0,0.1)] border-b border-[#ffb000] px-4 py-1 flex items-center justify-center gap-2 text-xs">
          <span className="text-[#ffb000] font-bold">⚠️</span>
          <span className="text-[#ffb000]">
            Кризис через {nextCrisisTurn - turn}{" "}
            {nextCrisisTurn - turn === 1 ? "ход" : "хода"}
          </span>
        </div>
      ) : null}

      {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}
      {showSaveLoad && (
        <SaveLoadPanel onClose={() => setShowSaveLoad(false)} />
      )}
      {showEffects && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[rgba(10,20,30,0.95)] border-2 border-[#9933ff] p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <ActiveEffectsPanel
              onClose={() => setShowEffects(false)}
            />
          </div>
        </div>
      )}

      <Dialog
        open={showRestartDialog}
        onOpenChange={setShowRestartDialog}
      >
        <DialogContent className="bg-[rgba(10,20,30,0.95)] border-2 border-[#ff4444] text-[#00ff41] max-w-md">
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
        </DialogContent>
      </Dialog>

      {/* Mobile research modal */}
      <Dialog
        open={showResearchModal}
        onOpenChange={(open) => {
          if (!open) {
            useGameStore.getState().closeResearchPanel();
          }
          setShowResearchModal(open);
        }}
      >
        <DialogContent
          className="bg-[rgba(10,20,30,0.98)] border-2 border-[#9933ff] text-[#00ff41] max-w-[95vw] w-[95vw] md:hidden max-h-[90vh] overflow-y-auto p-4 scrollbar-gutter-stable"
          style={{ scrollbarGutter: "stable both-edges" }}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-[#ffb000] font-['Orbitron'] text-lg">
              🔬 {t("game.science")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("research.panel_title")}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 min-h-[60vh]">
            <ResearchPanel />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
