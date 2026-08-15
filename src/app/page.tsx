"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { preloadGameImages } from "@/game/assets/preload";
import { useCombatCinematicUiStore } from "@/game/components/combatCinematicUiStore";
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
const ContractCompletionModal = dynamic(
  () =>
    import("@/game/components/ContractCompletionModal").then(
      (m) => m.ContractCompletionModal,
    ),
  { ssr: false },
);
const FactionDeliveryDecisionModal = dynamic(
  () =>
    import("@/game/components/FactionDeliveryDecisionModal").then(
      (m) => m.FactionDeliveryDecisionModal,
    ),
  { ssr: false },
);
const CrewLevelUpModal = dynamic(
  () => import("@/game/components/CrewLevelUpModal").then((m) => m.CrewLevelUpModal),
  { ssr: false },
);
const CrewUpkeepModal = dynamic(
  () => import("@/game/components/CrewUpkeepModal").then((m) => m.CrewUpkeepModal),
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
const CampaignProgressPanel = dynamic(
  () =>
    import("@/game/components/CampaignProgressPanel").then(
      (m) => m.CampaignProgressPanel,
    ),
  { ssr: false },
);
const BlueprintsTab = dynamic(
  () => import("@/game/components/BlueprintsTab").then((m) => m.BlueprintsTab),
  { ssr: false },
);
const GameLog = dynamic(
  () => import("@/game/components/GameLog").then((m) => m.GameLog),
  { ssr: false },
);
const EventDisplay = dynamic(
  () => import("@/game/components/EventPanels").then((m) => m.EventDisplay),
  { ssr: false },
);
const GameHeader = dynamic(
  () => import("@/game/components/header/Header").then((m) => m.GameHeader),
  { ssr: false },
);
const GameEndPanel = dynamic(
  () => import("@/game/components/panels/GameEndPanel").then((m) => m.GameEndPanel),
  { ssr: false },
);
const ShipGrid = dynamic(
  () => import("@/game/components/ShipGrid").then((m) => m.ShipGrid),
  { ssr: false },
);
const ModuleList = dynamic(
  () => import("@/game/components/ModuleList").then((m) => m.ModuleList),
  { ssr: false },
);
const CrewList = dynamic(
  () => import("@/game/components/CrewList").then((m) => m.CrewList),
  { ssr: false },
);
const ShipStats = dynamic(
  () => import("@/game/components/ShipStats").then((m) => m.ShipStats),
  { ssr: false },
);
const CargoDisplay = dynamic(
  () => import("@/game/components/CargoDisplay").then((m) => m.CargoDisplay),
  { ssr: false },
);
const ContractsList = dynamic(
  () => import("@/game/components/ContractsList").then((m) => m.ContractsList),
  { ssr: false },
);
import { TitleScreen } from "@/game/components/TitleScreen";
import { StartMenu } from "@/game/components/StartMenu";
import { useTranslation } from "@/lib/useTranslation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useIsMobile } from "@/game/hooks/useIsMobile";
import { getContractTurnsRemaining } from "@/game/contracts/contractDeadline";
import type { LogEntry } from "@/game/types";
import {
  playUi,
  setAudioVolumes,
  setSoundPlaybackEnabled,
  startMusic,
  stopMusic,
  unlockAudio,
} from "@/sounds";

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

type ShipSubTab = "layout" | "stats" | "modules" | "cargo";

/**
 * Глобальные панели из шапки, которые на мобильном открываются в сцене событий.
 */
const GLOBAL_OVERLAY_MODES = new Set([
  "artifacts",
  "effects",
  "research",
  "navigator",
  "reputation",
  "crises",
  "enemy_codex",
]);

/**
 * Flow state machine:
 *
 * "title_setup"    — Show TitleScreen + NewGameSetupModal (first launch or restart)
 * "game"           — Normal game UI is visible (includes WelcomeTutorial for first-timers)
 */
type FlowPhase = "title_setup" | "game";

/**
 * Управляет фазой заголовок/настройка ↔ игра и связанными с ней окнами
 * (модалка новой игры, обучение), реагируя на глобальные события из шапки.
 */
function useGameFlowPhase(animationsEnabled: boolean) {
  const [phase, setPhase] = useState<FlowPhase>("title_setup");
  const [showTutorial, setShowTutorial] = useState(false);
  // Скрываем окно создания игры, пока проигрывается интро-анимация титульного экрана
  const [setupReady, setSetupReady] = useState(false);
  const [newGameOpen, setNewGameOpen] = useState(false);

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

  return {
    phase,
    setPhase,
    isTitleSetup,
    showSetupModal,
    setSetupReady,
    newGameOpen,
    setNewGameOpen,
    showTutorial,
    setShowTutorial,
  };
}

/** Индикатор новых записей в журнале с потенциально важными событиями (предупреждения/ошибки). */
function useLogAlerts(log: LogEntry[]) {
  const [acknowledgedLogEntry, setAcknowledgedLogEntry] = useState(
    () => log[0] ?? null,
  );
  const acknowledgedLogIndex = acknowledgedLogEntry
    ? log.indexOf(acknowledgedLogEntry)
    : -1;
  const unreadLogEntries =
    acknowledgedLogIndex === -1 ? log : log.slice(0, acknowledgedLogIndex);
  const hasLogAlert = unreadLogEntries.some(
    (entry) => entry.type === "warning" || entry.type === "error",
  );

  return {
    hasLogAlert,
    acknowledgeLog: () => setAcknowledgedLogEntry(log[0] ?? null),
  };
}

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
  const audioVolumes = useGameStore(
    useShallow((s) => ({
      master: s.settings.master,
      music: s.settings.music,
      sfx: s.settings.sfx,
      ui: s.settings.ui,
    })),
  );
  const loadFromSlot = useGameStore((s) => s.loadFromSlot);
  const hydratePlayerSettings = useGameStore((s) => s.hydratePlayerSettings);
  const setAnimationsEnabled = useGameStore((s) => s.setAnimationsEnabled);
  const setSoundEnabled = useGameStore((s) => s.setSoundEnabled);
  const gameMode = useGameStore((s) => s.gameMode);
  const cinematicTimeline = useCombatCinematicUiStore((s) => s.timeline);
  const log = useGameStore((s) => s.log);
  const hasUrgentContract = useGameStore((s) =>
    s.activeContracts.some((contract) => {
      const turnsRemaining = getContractTurnsRemaining(contract, s.turn);
      return turnsRemaining !== null && turnsRemaining <= 2;
    }),
  );
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<LeftTab>("ship");
  const [shipSubTab, setShipSubTab] = useState<ShipSubTab>("layout");
  const { hasLogAlert, acknowledgeLog } = useLogAlerts(log);

  useEffect(() => {
    void import("@/game/components/ShipGrid").then((m) => m.preloadModuleArt());
    void import("@/game/components/PlanetPanel").then((m) =>
      m.preloadRacePlanetBackgrounds(),
    );
    void import("@/game/components/GasGiantPanel").then((m) =>
      m.preloadGasGiantBackgrounds(),
    );
    preloadGameImages();
  }, []);

  useEffect(() => {
    hydratePlayerSettings();
  }, [hydratePlayerSettings]);

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
  const showEventStage = mobileShowMap || (isMobile && (inCombat || cinematicTimeline !== null));

  // Legacy tab compatibility: if a saved state somehow points to merged tabs,
  // render them as the ship tab with the correct sub-tab.
  const effectiveActiveTab: LeftTab =
    activeTab === "stats" || activeTab === "modules" || activeTab === "cargo"
      ? "ship"
      : activeTab;
  const effectiveShipSubTab: ShipSubTab =
    activeTab === "stats" || activeTab === "modules"
      ? activeTab
      : activeTab === "cargo"
        ? "cargo"
        : shipSubTab;

  // ── Phase state machine ────────────────────────────────────────
  const {
    setPhase,
    isTitleSetup,
    showSetupModal,
    setSetupReady,
    newGameOpen,
    setNewGameOpen,
    showTutorial,
    setShowTutorial,
  } = useGameFlowPhase(animationsEnabled);

  useEffect(() => {
    setSoundPlaybackEnabled(soundEnabled);
    setAudioVolumes(audioVolumes);
  }, [audioVolumes, soundEnabled]);

  useEffect(() => {
    if (isTitleSetup || !soundEnabled) {
      stopMusic();
      return;
    }
    startMusic(inCombat ? "combat" : "exploration");
  }, [inCombat, isTitleSetup, soundEnabled]);

  useEffect(() => () => stopMusic(), []);

  useEffect(() => {
    const handler = () => {
      setActiveTab("progress");
      setMobileShowMap(false);
      setMoreOpen(false);
    };
    window.addEventListener("sw:showCampaignProgress", handler);
    return () => window.removeEventListener("sw:showCampaignProgress", handler);
  }, []);

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
    { id: "contracts", icon: "📋", label: t("ship.contracts") },
    { id: "progress", icon: "▣", label: t("ship.progress") },
    { id: "blueprints", icon: "📐", label: t("ship.craft") },
    { id: "log", icon: "📜", label: t("ship.event_log") },
  ];

  const selectTab = (tab: LeftTab) => {
    if (tab !== activeTab) playUi("ui_tab");
    setActiveTab(tab);
    if (tab === "log") {
      acknowledgeLog();
    }
  };

  // ── Содержимое вкладок управления (переиспользуется десктопом и мобильным) ──
  // Каждой вкладке управления соответствует ровно одна панель — простой
  // поиск по ключу вместо цепочки independent `effectiveActiveTab === "x"`.
  const managementContentByTab: Record<
    Exclude<LeftTab, "stats" | "modules" | "cargo">,
    ReactNode
  > = {
    ship: (
      <Tabs
        value={effectiveShipSubTab}
        onValueChange={(value) => {
          const tab = value as ShipSubTab;
          setShipSubTab(tab);
        }}
        className="h-full flex flex-col"
      >
        <TabsList className="grid grid-cols-4 bg-[rgba(0,255,65,0.05)] border border-[#00ff41] rounded-none h-8 shrink-0">
          <TabsTrigger value="layout" className="text-[10px] data-[state=active]:bg-[rgba(0,255,65,0.15)] data-[state=active]:text-accent text-muted-foreground uppercase font-bold tracking-wider">{t("ship.subtab_layout")}</TabsTrigger>
          <TabsTrigger value="stats" className="text-[10px] data-[state=active]:bg-[rgba(0,255,65,0.15)] data-[state=active]:text-accent text-muted-foreground uppercase font-bold tracking-wider">{t("ship.subtab_stats")}</TabsTrigger>
          <TabsTrigger value="modules" className="text-[10px] data-[state=active]:bg-[rgba(0,255,65,0.15)] data-[state=active]:text-accent text-muted-foreground uppercase font-bold tracking-wider">{t("ship.subtab_modules")}</TabsTrigger>
          <TabsTrigger value="cargo" className="text-[10px] data-[state=active]:bg-[rgba(0,255,65,0.15)] data-[state=active]:text-accent text-muted-foreground uppercase font-bold tracking-wider">{t("ship.subtab_cargo")}</TabsTrigger>
        </TabsList>
        <TabsContent value="layout" className="mt-2 flex-1 min-h-0 overflow-y-auto tab-transition"><ShipGrid /></TabsContent>
        <TabsContent value="stats" className="mt-2 flex-1 min-h-0 overflow-y-auto pr-2 tab-transition"><ShipStats /></TabsContent>
        <TabsContent value="modules" className="mt-2 flex-1 min-h-0 overflow-y-auto pr-2 tab-transition"><ModuleList /></TabsContent>
        <TabsContent value="cargo" className="mt-2 flex-1 min-h-0 overflow-y-auto pr-2 tab-transition"><CargoDisplay /></TabsContent>
      </Tabs>
    ),
    crew: <div className="tab-transition"><CrewList /></div>,
    contracts: <div className="tab-transition"><ContractsList /></div>,
    progress: <div className="tab-transition"><CampaignProgressPanel /></div>,
    blueprints: <div className="tab-transition"><BlueprintsTab /></div>,
    log: <div className="tab-transition"><GameLog /></div>,
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div
      className="cockpit-shell h-dvh flex flex-col overflow-hidden bg-[#050810] font-['Share_Tech_Mono'] text-[#00ff41]"
      data-animations={animationsEnabled ? "on" : "off"}
    >
      {/* Scanline overlay (always on top) */}
      <div className="cockpit-scanlines fixed inset-0 pointer-events-none z-9999" />

      {/* Game Over / Victory panels (always rendered, self-hide) */}
      {!cinematicTimeline && gameOver && gameOverReason && (
        <GameEndPanel reason={gameOverReason} type="gameover" />
      )}
      {!cinematicTimeline && gameVictory && gameVictoryReason && (
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
              onSoundChange={(enabled) => {
                void unlockAudio();
                setSoundEnabled(enabled);
              }}
              onNewGame={() => {
                void unlockAudio();
                setNewGameOpen(true);
              }}
              onLoad={(slotId) => {
                // loadFromSlot overwrites settings from the save file itself;
                // re-apply the settings the user currently has selected in the
                // StartMenu so a load doesn't silently flip them.
                void unlockAudio();
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
            onStarted={() => {
              void unlockAudio();
              setPhase("game");
            }}
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
                      (tab.id === "ship" && moduleMovedThisTurn) ||
                      (tab.id === "contracts" && hasUrgentContract) ||
                      (tab.id === "log" && hasLogAlert);
                    return (
                      <button
                        key={tab.id}
                        onClick={() => selectTab(tab.id)}
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

                <div
                  className={
                    effectiveActiveTab === "ship"
                      ? "flex-1 min-h-0 overflow-hidden p-2"
                      : "flex-1 overflow-y-auto p-2 scrollbar-gutter-stable min-h-0"
                  }
                >
                  {
                    managementContentByTab[
                      effectiveActiveTab as Exclude<
                        LeftTab,
                        "stats" | "modules" | "cargo"
                      >
                    ]
                  }
                </div>
              </div>
            )}

            {/* Сцена событий (карта/бой) — десктоп: справа; мобильный: полный экран когда showEventStage */}
            {(!isMobile || showEventStage) && (
              <div className="panel cockpit-panel cockpit-panel--stage flex flex-col min-w-0 flex-1 rounded-lg p-2 overflow-hidden min-h-0">
                <div
                  className={
                    GLOBAL_OVERLAY_MODES.has(gameMode)
                      ? "flex-1 min-h-0 overflow-hidden"
                      : "flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-gutter-stable pr-2 lg:overflow-hidden lg:pr-0"
                  }
                >
                  <EventDisplay />
                </div>
              </div>
            )}
          </main>

          {/* ── Мобильная нижняя навигация ── */}
          {isMobile && (
            <nav className="relative shrink-0 z-30 border-t border-[#00ff4155] bg-[rgba(1,8,12,0.97)] backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
              {moreOpen && (
                <div className="grid grid-cols-3 gap-1 p-2 border-b border-[#00ff4155]">
                  {leftTabs
                    .filter((tab) => ["progress", "blueprints", "log"].includes(tab.id))
                    .map((tab) => {
                      const hasAlert = tab.id === "log" && hasLogAlert;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            selectTab(tab.id);
                            setMobileShowMap(false);
                            setMoreOpen(false);
                          }}
                          className={`relative flex flex-col items-center gap-0.5 py-2 rounded text-[10px] font-['Orbitron'] font-bold ${activeTab === tab.id && !showEventStage ? "text-accent bg-[rgba(255,176,0,0.1)]" : "text-muted-foreground"}`}
                        >
                          <span className="text-base leading-none">{tab.icon}</span>
                          <span className="truncate w-full text-center px-0.5 leading-tight">{tab.label}</span>
                          {hasAlert && (
                            <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-destructive" />
                          )}
                        </button>
                      );
                    })}
                </div>
              )}
              <div className="grid grid-cols-5">
                <MobileNavButton icon="🗺️" label={t("mobile_nav.map")} active={showEventStage} onClick={() => { setMobileShowMap(true); setMoreOpen(false); }} />
                <MobileNavButton icon="🚀" label={t("mobile_nav.ship")} alert={moduleMovedThisTurn && !showEventStage} active={!showEventStage && activeTab === "ship"} onClick={() => { selectTab("ship"); setMobileShowMap(false); setMoreOpen(false); }} />
                <MobileNavButton icon="👥" label={t("mobile_nav.crew")} active={!showEventStage && activeTab === "crew"} onClick={() => { selectTab("crew"); setMobileShowMap(false); setMoreOpen(false); }} />
                <MobileNavButton icon="📋" label={t("mobile_nav.contracts")} alert={hasUrgentContract && !showEventStage} active={!showEventStage && activeTab === "contracts"} onClick={() => { selectTab("contracts"); setMobileShowMap(false); setMoreOpen(false); }} />
                <MobileNavButton icon="⋯" label={t("mobile_nav.more")} alert={hasLogAlert && !showEventStage} active={!showEventStage && ["progress", "blueprints", "log"].includes(activeTab)} onClick={() => setMoreOpen((o) => !o)} />
              </div>
            </nav>
          )}

          <RaceDiscoveryModal />
          <TechnologyDiscoveryModal />
          <SurvivorModal />
          <FactionDeliveryDecisionModal />
          <ContractCompletionModal />
          <CrewLevelUpModal />
          <CrewUpkeepModal />
          <WelcomeTutorial
            forceShow={showTutorial}
            onDismissed={() => setShowTutorial(false)}
            onCompleted={() => {
              setActiveTab("progress");
              setMobileShowMap(false);
              setMoreOpen(false);
            }}
          />
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
