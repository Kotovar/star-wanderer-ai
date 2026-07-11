"use client";

import { useEffect, useState } from "react";
import { GameHeader } from "@/game/components/header";
import { ShipGrid } from "@/game/components/ShipGrid";
import { ModuleList } from "@/game/components/ModuleList";
import { CrewList } from "@/game/components/CrewList";
import { ShipStats } from "@/game/components/ShipStats";
import { CargoDisplay } from "@/game/components/CargoDisplay";
import { GameLog } from "@/game/components/GameLog";
import { ContractsList } from "@/game/components/ContractsList";
import { BlueprintsTab } from "@/game/components/BlueprintsTab";
import { CampaignProgressPanel } from "@/game/components/CampaignProgressPanel";
import { EventDisplay } from "@/game/components/EventPanels";
import { GameEndPanel } from "@/game/components/panels";
import { useGameStore } from "@/game/store";
import { useShallow } from "zustand/react/shallow";
import dynamic from "next/dynamic";

const RaceDiscoveryModal = dynamic(
  () => import("@/game/components/RaceDiscoveryModal").then((m) => m.RaceDiscoveryModal),
  { ssr: false },
);
const TechnologyDiscoveryModal = dynamic(
  () => import("@/game/components/TechnologyDiscoveryModal").then((m) => m.TechnologyDiscoveryModal),
  { ssr: false },
);
const SurvivorModal = dynamic(
  () => import("@/game/components/SurvivorModal").then((m) => m.SurvivorModal),
  { ssr: false },
);
const WelcomeTutorial = dynamic(
  () => import("@/game/components/WelcomeTutorial").then((m) => m.WelcomeTutorial),
  { ssr: false },
);
const NewGameSetupModal = dynamic(
  () => import("@/game/components/NewGameSetupModal").then((m) => m.NewGameSetupModal),
  { ssr: false },
);
import { TitleScreen } from "@/game/components/TitleScreen";
import { useTranslation } from "@/lib/useTranslation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type LeftTab =
  | "ship"
  | "stats"
  | "crew"
  | "modules"
  | "cargo"
  | "contracts"
  | "progress"
  | "blueprints"
  | "log";

type ShipSubTab = "layout" | "stats" | "modules";

/**
 * Flow state machine:
 *
 * "title_setup"    — Show TitleScreen + NewGameSetupModal (first launch or restart)
 * "game"           — Normal game UI is visible (includes WelcomeTutorial for first-timers)
 */
type FlowPhase = "title_setup" | "game";

export default function Home() {
  const { gameOver, gameOverReason, gameVictory, gameVictoryReason } = useGameStore(
    useShallow((s) => ({
      gameOver: s.gameOver,
      gameOverReason: s.gameOverReason,
      gameVictory: s.gameVictory,
      gameVictoryReason: s.gameVictoryReason,
    })),
  );
  const moduleMovedThisTurn = useGameStore((s) => s.ship.moduleMovedThisTurn);
  const animationsEnabled = useGameStore((s) => s.settings.animationsEnabled);
  const loadGame = useGameStore((s) => s.loadGame);
  const gameMode = useGameStore((s) => s.gameMode);
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<LeftTab>("ship");
  const [shipSubTab, setShipSubTab] = useState<ShipSubTab>("layout");
  const [showTutorial, setShowTutorial] = useState(false);
  // Скрываем окно создания игры, пока проигрывается интро-анимация титульного экрана
  const [setupReady, setSetupReady] = useState(false);

  // Legacy tab compatibility: if a saved state somehow points to merged tabs,
  // render them as the ship tab with the correct sub-tab.
  const effectiveActiveTab: LeftTab =
    activeTab === "stats" || activeTab === "modules" ? "ship" : activeTab;
  const effectiveShipSubTab: ShipSubTab =
    activeTab === "stats" || activeTab === "modules" ? activeTab : shipSubTab;

  // ── Phase state machine ────────────────────────────────────────
  const [phase, setPhase] = useState<FlowPhase>("game");

  useEffect(() => {
    const hasSave = loadGame();
    if (!hasSave) {
      const id = requestAnimationFrame(() => {
        setPhase("title_setup");
      });
      return () => cancelAnimationFrame(id);
    }
  }, [loadGame]);

  // Listen for restart signal from Header (restart confirmed)
  useEffect(() => {
    const handler = () => {
      setSetupReady(false);
      setPhase("title_setup");
    };
    window.addEventListener("sw:showTitleSetup", handler);
    return () => window.removeEventListener("sw:showTitleSetup", handler);
  }, []);

  // Listen for tutorial show signal from Header
  useEffect(() => {
    const handler = () => setShowTutorial(true);
    window.addEventListener("sw:showTutorial", handler);
    return () => window.removeEventListener("sw:showTutorial", handler);
  }, []);

  // When NewGameSetupModal starts a game, it calls restartGame + reloads the page.
  // After reload: save exists → phase = "game" → Game UI renders.
  // WelcomeTutorial shows via useSyncExternalStore if it's the first time.

  const isTitleSetup = phase === "title_setup";

  // Показываем окно создания игры только после завершения интро-анимации
  // (длительность radar-sweep). setState — в колбэке таймера, не в теле эффекта.
  useEffect(() => {
    if (!isTitleSetup || !animationsEnabled) return;
    const id = setTimeout(() => setSetupReady(true), 2800);
    return () => clearTimeout(id);
  }, [isTitleSetup, animationsEnabled]);

  // При выключенных анимациях модалка доступна сразу
  const showSetupModal = !animationsEnabled || setupReady;

  // ── Resize handler (unchanged) ─────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && gameMode === "research") {
        useGameStore.getState().showSectorMap();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [gameMode]);

  // ── Left tab definitions ────────────────────────────────────────
  const leftTabs: { id: LeftTab; icon: string; label: string }[] = [
    { id: "ship", icon: "🚀", label: t("ship.title") },
    { id: "crew", icon: "👥", label: t("ship.crew") },
    { id: "cargo", icon: "📦", label: t("ship.cargo") },
    { id: "contracts", icon: "📋", label: t("ship.contracts") },
    { id: "progress", icon: "▣", label: t("ship.progress") },
    { id: "blueprints", icon: "📐", label: t("ship.craft") },
    { id: "log", icon: "📜", label: t("ship.event_log") },
  ];

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div
      className="cockpit-shell min-h-screen flex flex-col bg-[#050810] font-['Share_Tech_Mono'] text-[#00ff41]"
      data-animations={animationsEnabled ? "on" : "off"}
    >
      {/* Scanline overlay (always on top) */}
      <div className="cockpit-scanlines fixed inset-0 pointer-events-none z-9999" />

      {/* Game Over / Victory panels (always rendered, self-hide) */}
      {gameOver && gameOverReason && (
        <GameEndPanel reason={gameOverReason} type="gameover" />
      )}
      {gameVictory && gameVictoryReason && (
        <GameEndPanel reason={gameVictoryReason} type="victory" />
      )}

      {/* ── Phase: Tutorial or Title+Setup ────────────────── */}
      {isTitleSetup ? (
        <>
          <TitleScreen />
          {showSetupModal && (
            <NewGameSetupModal
              open={true}
              onClose={() => {
                /* required: can't close without starting */
              }}
              required
            />
          )}
        </>
      ) : (
        /* ── Phase: Normal game ──────────────────────────── */
        <>
          <GameHeader />

          <main className="cockpit-layout flex-1 flex flex-col lg:flex-row overflow-hidden max-w-full min-w-0 px-2 lg:px-4 py-4 gap-4 min-h-0">
            {/* Left Panel */}
            <div className="panel cockpit-panel cockpit-panel--controls flex-1 flex flex-col min-w-0 lg:h-[calc(100vh-100px)] rounded-lg overflow-hidden min-h-0">
              <div className="cockpit-tabs flex shrink-0 border-b border-[#00ff4155]">
                {leftTabs.map((tab, idx) => {
                  const isActive = activeTab === tab.id;
                  const hasAlert =
                    tab.id === "ship" &&
                    moduleMovedThisTurn;
                  return (
                    <button
                      key={tab.id}
                      onClick={() =>
                        setActiveTab(tab.id)
                      }
                      title={tab.label}
                      className={`relative flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[9px] font-['Orbitron'] font-bold transition-all duration-150 cursor-pointer select-none
                                                ${idx <
                          leftTabs.length - 1
                          ? "border-r border-[#1a3320]"
                          : ""
                        }
                                                ${isActive
                          ? "text-[#ffb000] bg-[rgba(255,176,0,0.1)]"
                          : "text-[#445544] hover:text-[#00ff41] hover:bg-[rgba(0,255,65,0.05)]"
                        }`}
                      style={
                        isActive
                          ? {
                            boxShadow:
                              "inset 0 -2px 0 #ffb000",
                          }
                          : {}
                      }
                    >
                      {isActive && (
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#ffb000] opacity-50" />
                      )}
                      <span className="text-sm leading-none">
                        {tab.icon}
                      </span>
                      <span className="hidden sm:block truncate w-full text-center px-0.5 leading-tight">
                        {tab.label}
                      </span>
                      {hasAlert && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#ff0040]" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 overflow-y-auto p-2 scrollbar-gutter-stable min-h-0">
                {effectiveActiveTab === "ship" && (
                  <Tabs value={effectiveShipSubTab} onValueChange={(v) => setShipSubTab(v as ShipSubTab)} className="h-full flex flex-col">
                    <TabsList className="grid grid-cols-3 bg-[rgba(0,255,65,0.05)] border border-[#00ff41] rounded-none h-8 shrink-0">
                      <TabsTrigger value="layout" className="text-[10px] data-[state=active]:bg-[rgba(0,255,65,0.15)] data-[state=active]:text-[#ffb000] text-[#667766] uppercase font-bold tracking-wider">{t("ship.subtab_layout")}</TabsTrigger>
                      <TabsTrigger value="stats" className="text-[10px] data-[state=active]:bg-[rgba(0,255,65,0.15)] data-[state=active]:text-[#ffb000] text-[#667766] uppercase font-bold tracking-wider">{t("ship.subtab_stats")}</TabsTrigger>
                      <TabsTrigger value="modules" className="text-[10px] data-[state=active]:bg-[rgba(0,255,65,0.15)] data-[state=active]:text-[#ffb000] text-[#667766] uppercase font-bold tracking-wider">{t("ship.subtab_modules")}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="layout" className="mt-2 flex-1 min-h-0 overflow-y-auto tab-transition"><ShipGrid /></TabsContent>
                    <TabsContent value="stats" className="mt-2 flex-1 min-h-0 overflow-y-auto tab-transition"><ShipStats /></TabsContent>
                    <TabsContent value="modules" className="mt-2 flex-1 min-h-0 overflow-y-auto tab-transition"><ModuleList /></TabsContent>
                  </Tabs>
                )}
                {effectiveActiveTab === "crew" && <div className="tab-transition"><CrewList /></div>}
                {effectiveActiveTab === "cargo" && <div className="tab-transition"><CargoDisplay /></div>}
                {effectiveActiveTab === "contracts" && (
                  <div className="tab-transition"><ContractsList /></div>
                )}
                {effectiveActiveTab === "progress" && (
                  <div className="tab-transition"><CampaignProgressPanel /></div>
                )}
                {effectiveActiveTab === "blueprints" && (
                  <div className="tab-transition"><BlueprintsTab /></div>
                )}
                {effectiveActiveTab === "log" && <div className="tab-transition"><GameLog /></div>}
              </div>
            </div>

            {/* Right Panel */}
            <div className="panel cockpit-panel cockpit-panel--stage flex-1 flex flex-col min-w-0 h-[calc(100vh-200px)] lg:h-[calc(100vh-100px)] rounded-lg p-2 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-hidden min-h-0">
                <EventDisplay />
              </div>
            </div>
          </main>

          <RaceDiscoveryModal />
          <TechnologyDiscoveryModal />
          <SurvivorModal />
          <WelcomeTutorial forceShow={showTutorial} onDismissed={() => setShowTutorial(false)} />
        </>
      )}
    </div>
  );
}
