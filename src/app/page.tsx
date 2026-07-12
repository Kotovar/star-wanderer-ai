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
import { StartMenu } from "@/game/components/StartMenu";
import { useTranslation } from "@/lib/useTranslation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useIsMobile } from "@/game/hooks/useIsMobile";

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
 * Глобальные панели из шапки, которые на мобильном открываются в сцене событий.
 */
const GLOBAL_OVERLAY_MODES = new Set([
  "artifacts",
  "effects",
  "research",
  "reputation",
  "crises",
]);

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
  const soundEnabled = useGameStore((s) => s.settings.soundEnabled);
  const loadFromSlot = useGameStore((s) => s.loadFromSlot);
  const setAnimationsEnabled = useGameStore((s) => s.setAnimationsEnabled);
  const setSoundEnabled = useGameStore((s) => s.setSoundEnabled);
  const gameMode = useGameStore((s) => s.gameMode);
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<LeftTab>("ship");
  const [shipSubTab, setShipSubTab] = useState<ShipSubTab>("layout");
  const [showTutorial, setShowTutorial] = useState(false);
  // Скрываем окно создания игры, пока проигрывается интро-анимация титульного экрана
  const [setupReady, setSetupReady] = useState(false);
  const [newGameOpen, setNewGameOpen] = useState(false);

  // ── Мобильная навигация: одно полноэкранное представление за раз ──
  const isMobile = useIsMobile();
  const [mobileShowMap, setMobileShowMap] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);
  // «К карте» из любой панели переводит gameMode в режим карты — тогда показываем карту
  // (корректировка стейта при изменении значения, без эффекта).
  const [lastGameMode, setLastGameMode] = useState(gameMode);
  if (gameMode !== lastGameMode) {
    setLastGameMode(gameMode);
    if (
      gameMode === "sector_map" ||
      gameMode === "galaxy_map" ||
      GLOBAL_OVERLAY_MODES.has(gameMode)
    ) {
      setMobileShowMap(true);
    }
  }
  // Во время боя на мобильном принудительно показываем сцену.
  const inCombat = useGameStore((s) => !!s.currentCombat);
  const showEventStage = mobileShowMap || (isMobile && inCombat);

  // Legacy tab compatibility: if a saved state somehow points to merged tabs,
  // render them as the ship tab with the correct sub-tab.
  const effectiveActiveTab: LeftTab =
    activeTab === "stats" || activeTab === "modules" ? "ship" : activeTab;
  const effectiveShipSubTab: ShipSubTab =
    activeTab === "stats" || activeTab === "modules" ? activeTab : shipSubTab;

  // ── Phase state machine ────────────────────────────────────────
  const [phase, setPhase] = useState<FlowPhase>("title_setup");

  // Listen for restart signal from Header (restart confirmed)
  useEffect(() => {
    const handler = () => {
      setSetupReady(false);
      setNewGameOpen(false);
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

  // ── Содержимое вкладок управления (переиспользуется десктопом и мобильным) ──
  const renderManagementContent = () => (
    <>
      {effectiveActiveTab === "ship" && (
        <Tabs value={effectiveShipSubTab} onValueChange={(v) => setShipSubTab(v as ShipSubTab)} className="h-full flex flex-col">
          <TabsList className="grid grid-cols-3 bg-[rgba(0,255,65,0.05)] border border-[#00ff41] rounded-none h-8 shrink-0">
            <TabsTrigger value="layout" className="text-[10px] data-[state=active]:bg-[rgba(0,255,65,0.15)] data-[state=active]:text-accent text-muted-foreground uppercase font-bold tracking-wider">{t("ship.subtab_layout")}</TabsTrigger>
            <TabsTrigger value="stats" className="text-[10px] data-[state=active]:bg-[rgba(0,255,65,0.15)] data-[state=active]:text-accent text-muted-foreground uppercase font-bold tracking-wider">{t("ship.subtab_stats")}</TabsTrigger>
            <TabsTrigger value="modules" className="text-[10px] data-[state=active]:bg-[rgba(0,255,65,0.15)] data-[state=active]:text-accent text-muted-foreground uppercase font-bold tracking-wider">{t("ship.subtab_modules")}</TabsTrigger>
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
    </>
  );

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div
      className="cockpit-shell h-dvh flex flex-col overflow-hidden bg-[#050810] font-['Share_Tech_Mono'] text-[#00ff41]"
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
            <StartMenu
              animationsEnabled={animationsEnabled}
              soundEnabled={soundEnabled}
              onAnimationsChange={(enabled) => {
                setSetupReady(true);
                setAnimationsEnabled(enabled);
              }}
              onSoundChange={setSoundEnabled}
              onNewGame={() => setNewGameOpen(true)}
              onLoad={(slotId) => {
                loadFromSlot(slotId);
                setAnimationsEnabled(animationsEnabled);
                setSoundEnabled(soundEnabled);
                setPhase("game");
              }}
            />
          )}
          <NewGameSetupModal
            open={newGameOpen}
            onClose={() => setNewGameOpen(false)}
            onStarted={() => setPhase("game")}
          />
        </>
      ) : (
        /* ── Phase: Normal game ──────────────────────────── */
        <>
          <GameHeader />

          <main className="flex-1 flex flex-col min-h-0 lg:flex-row lg:overflow-hidden max-w-full min-w-0 px-2 lg:px-4 py-4 gap-4">
            {/* Панель управления — десктоп: слева; мобильный: полный экран когда !showEventStage */}
            {(!isMobile || !showEventStage) && (
              <div className="panel cockpit-panel cockpit-panel--controls flex flex-col min-w-0 flex-1 rounded-lg overflow-hidden min-h-0">
                {/* Верхний таб-бар — только десктоп (на мобильном его заменяет нижняя навигация) */}
                <div className="cockpit-tabs hidden lg:flex shrink-0 border-b border-[#00ff4155]">
                  {leftTabs.map((tab, idx) => {
                    const isActive = activeTab === tab.id;
                    const hasAlert =
                      tab.id === "ship" &&
                      moduleMovedThisTurn;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        title={tab.label}
                        className={`relative flex-1 flex flex-col items-center justify-center py-2.5 min-h-11 gap-0.5 text-[10px] font-['Orbitron'] font-bold transition-all duration-150 cursor-pointer select-none
                                                ${idx < leftTabs.length - 1 ? "border-r border-[#1a3320]" : ""}
                                                ${isActive ? "text-accent bg-[rgba(255,176,0,0.1)]" : "text-[#445544] hover:text-[#00ff41] hover:bg-[rgba(0,255,65,0.05)]"}`}
                        style={isActive ? { boxShadow: "inset 0 -2px 0 #ffb000" } : {}}
                      >
                        {isActive && (
                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent opacity-50" />
                        )}
                        <span className="text-sm leading-none">{tab.icon}</span>
                        <span className="hidden sm:block truncate w-full text-center px-0.5 leading-tight">{tab.label}</span>
                        {hasAlert && (
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-destructive" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex-1 overflow-y-auto p-2 scrollbar-gutter-stable min-h-0">
                  {renderManagementContent()}
                </div>
              </div>
            )}

            {/* Сцена событий (карта/бой) — десктоп: справа; мобильный: полный экран когда showEventStage */}
            {(!isMobile || showEventStage) && (
              <div className="panel cockpit-panel cockpit-panel--stage flex flex-col min-w-0 flex-1 rounded-lg p-2 overflow-hidden min-h-0">
                <div className="flex-1 overflow-y-auto overflow-x-hidden lg:overflow-hidden min-h-0">
                  <EventDisplay />
                </div>
              </div>
            )}
          </main>

          {/* ── Мобильная нижняя навигация ── */}
          {isMobile && (
            <nav className="relative shrink-0 z-30 border-t border-[#00ff4155] bg-[rgba(1,8,12,0.97)] backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
              {moreOpen && (
                <div className="grid grid-cols-4 gap-1 p-2 border-b border-[#00ff4155]">
                  {leftTabs.filter((tab) => ["contracts", "progress", "blueprints", "log"].includes(tab.id)).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setMobileShowMap(false); setMoreOpen(false); }}
                      className={`flex flex-col items-center gap-0.5 py-2 rounded text-[10px] font-['Orbitron'] font-bold ${activeTab === tab.id && !showEventStage ? "text-accent bg-[rgba(255,176,0,0.1)]" : "text-muted-foreground"}`}
                    >
                      <span className="text-base leading-none">{tab.icon}</span>
                      <span className="truncate w-full text-center px-0.5 leading-tight">{tab.label}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-5">
                <MobileNavButton icon="🗺️" label={t("mobile_nav.map")} active={showEventStage} onClick={() => { setMobileShowMap(true); setMoreOpen(false); }} />
                <MobileNavButton icon="🚀" label={t("mobile_nav.ship")} alert={moduleMovedThisTurn && !showEventStage} active={!showEventStage && activeTab === "ship"} onClick={() => { setActiveTab("ship"); setMobileShowMap(false); setMoreOpen(false); }} />
                <MobileNavButton icon="👥" label={t("mobile_nav.crew")} active={!showEventStage && activeTab === "crew"} onClick={() => { setActiveTab("crew"); setMobileShowMap(false); setMoreOpen(false); }} />
                <MobileNavButton icon="📦" label={t("mobile_nav.cargo")} active={!showEventStage && activeTab === "cargo"} onClick={() => { setActiveTab("cargo"); setMobileShowMap(false); setMoreOpen(false); }} />
                <MobileNavButton icon="⋯" label={t("mobile_nav.more")} active={!showEventStage && ["contracts", "progress", "blueprints", "log"].includes(activeTab)} onClick={() => setMoreOpen((o) => !o)} />
              </div>
            </nav>
          )}

          <RaceDiscoveryModal />
          <TechnologyDiscoveryModal />
          <SurvivorModal />
          <WelcomeTutorial forceShow={showTutorial} onDismissed={() => setShowTutorial(false)} />
        </>
      )}
    </div>
  );
}

/** Кнопка нижней мобильной навигации */
function MobileNavButton({
  icon,
  label,
  active,
  alert,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  alert?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-0.5 py-2 min-h-14 text-[10px] font-['Orbitron'] font-bold transition-colors ${active ? "text-accent" : "text-muted-foreground"}`}
    >
      {active && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-accent" />
      )}
      <span className="text-xl leading-none">{icon}</span>
      <span className="truncate w-full text-center px-1 leading-tight">{label}</span>
      {alert && (
        <span className="absolute top-1.5 right-[22%] w-2 h-2 rounded-full bg-destructive" />
      )}
    </button>
  );
}
