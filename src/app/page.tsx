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
import { EventDisplay } from "@/game/components/EventPanels";
import { GameEndPanel } from "@/game/components/panels";
import { useGameStore } from "@/game/store";
import { RaceDiscoveryModal } from "@/game/components/RaceDiscoveryModal";
import { TechnologyDiscoveryModal } from "@/game/components/TechnologyDiscoveryModal";
import { SurvivorModal } from "@/game/components/SurvivorModal";
import { WelcomeTutorial } from "@/game/components/WelcomeTutorial";
import { NewGameSetupModal } from "@/game/components/NewGameSetupModal";
import { useTranslation } from "@/lib/useTranslation";

type LeftTab =
  | "ship"
  | "stats"
  | "crew"
  | "modules"
  | "cargo"
  | "contracts"
  | "blueprints"
  | "log";

export default function Home() {
  const gameOver = useGameStore((s) => s.gameOver);
  const gameOverReason = useGameStore((s) => s.gameOverReason);
  const gameVictory = useGameStore((s) => s.gameVictory);
  const gameVictoryReason = useGameStore((s) => s.gameVictoryReason);
  const moduleMovedThisTurn = useGameStore((s) => s.ship.moduleMovedThisTurn);
  const loadGame = useGameStore((s) => s.loadGame);
  const gameMode = useGameStore((s) => s.gameMode);
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<LeftTab>("ship");
  const [showNewGameSetup, setShowNewGameSetup] = useState(false);
  const [tutorialDismissed, setTutorialDismissed] = useState(false);

  useEffect(() => {
    const hasSave = loadGame();
    if (!hasSave) {
      const id = requestAnimationFrame(() => {
        // Only show new game setup after tutorial is dismissed
        if (tutorialDismissed) {
          setShowNewGameSetup(true);
        }
      });
      return () => cancelAnimationFrame(id);
    }
  }, [loadGame, tutorialDismissed]);

  const handleTutorialDismissed = () => {
    setTutorialDismissed(true);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && gameMode === "research") {
        useGameStore.getState().showSectorMap();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [gameMode]);

  const leftTabs: { id: LeftTab; icon: string; label: string }[] = [
    { id: "ship", icon: "🚀", label: t("ship.title") },
    { id: "stats", icon: "📊", label: t("ship.ship_state") },
    { id: "crew", icon: "👥", label: t("ship.crew") },
    { id: "modules", icon: "⚙️", label: t("ship.modules") },
    { id: "cargo", icon: "📦", label: t("ship.cargo") },
    { id: "contracts", icon: "📋", label: t("ship.contracts") },
    { id: "blueprints", icon: "📐", label: t("ship.craft") },
    { id: "log", icon: "📜", label: t("ship.event_log") },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#050810] font-['Share_Tech_Mono'] text-[#00ff41]">
      <div
        className="fixed inset-0 pointer-events-none z-9999"
        style={{
          background:
            "repeating-linear-gradient(0deg, rgba(0, 255, 65, 0.03) 0px, transparent 1px, transparent 2px, rgba(0, 255, 65, 0.03) 3px)",
          animation: "scanlines 8s linear infinite",
        }}
      />

      {/* Game Over Panel */}
      {gameOver && gameOverReason && (
        <GameEndPanel reason={gameOverReason} type="gameover" />
      )}

      {/* Victory Panel */}
      {gameVictory && gameVictoryReason && (
        <GameEndPanel reason={gameVictoryReason} type="victory" />
      )}

      <style jsx global>{`
                @import url("https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@400;700;900&display=swap");

                @keyframes scanlines {
                    0% {
                        transform: translateY(0);
                    }
                    100% {
                        transform: translateY(10px);
                    }
                }

                @keyframes glow-pulse {
                    0%,
                    100% {
                        text-shadow:
                            0 0 10px #00ff41,
                            0 0 20px #00ff41;
                    }
                    50% {
                        text-shadow:
                            0 0 15px #00ff41,
                            0 0 30px #00ff41;
                    }
                }

                ::-webkit-scrollbar {
                    width: 8px;
                }

                @media (min-width: 768px) {
                    ::-webkit-scrollbar {
                        width: 10px;
                    }
                }

                ::-webkit-scrollbar-track {
                    background: #050810;
                    border: 1px solid #00ff41;
                }
                ::-webkit-scrollbar-thumb {
                    background: #00ff41;
                    border-radius: 4px;
                }

                ::-webkit-scrollbar-thumb:hover {
                    background: #00d4ff;
                }

                .scrollbar-gutter-stable {
                    scrollbar-gutter: stable;
                }
            `}</style>

      <GameHeader />

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-full min-w-0 px-2 lg:px-4 py-4 gap-4">
        {/* Left Panel */}
        <div className="panel flex-1 lg:w-95 flex flex-col min-w-0 lg:h-[calc(100vh-100px)] border-2 border-[#00ff41] bg-[rgba(0,255,65,0.02)] rounded-lg overflow-hidden">
          {/* Tab bar */}
          <div className="flex shrink-0 border-b-2 border-[#00ff41]">
            {leftTabs.map((tab, idx) => {
              const isActive = activeTab === tab.id;
              const hasAlert =
                tab.id === "ship" && moduleMovedThisTurn;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.label}
                  className={`relative flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[9px] font-['Orbitron'] font-bold transition-all duration-150 cursor-pointer select-none
                                        ${idx < leftTabs.length - 1 ? "border-r border-[#1a3320]" : ""}
                                        ${isActive
                      ? "text-[#ffb000] bg-[rgba(255,176,0,0.1)]"
                      : "text-[#445544] hover:text-[#00ff41] hover:bg-[rgba(0,255,65,0.05)]"
                    }`}
                  style={isActive ? { boxShadow: "inset 0 -2px 0 #ffb000" } : {}}
                >
                  {/* Active indicator line */}
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

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-2 scrollbar-gutter-stable">
            {activeTab === "ship" && <ShipGrid />}
            {activeTab === "stats" && <ShipStats />}
            {activeTab === "crew" && <CrewList />}
            {activeTab === "modules" && <ModuleList />}
            {activeTab === "cargo" && <CargoDisplay />}
            {activeTab === "contracts" && <ContractsList />}
            {activeTab === "blueprints" && <BlueprintsTab />}
            {activeTab === "log" && <GameLog />}
          </div>
        </div>

        {/* Right Panel */}
        <div className="panel flex-1 lg:flex-1 flex flex-col min-w-0 h-[calc(100vh-200px)] lg:h-[calc(100vh-100px)] border-2 border-[#00ff41] bg-[rgba(0,255,65,0.02)] rounded-lg p-2">
          <div className="flex-1 overflow-hidden min-h-0">
            <EventDisplay />
          </div>
        </div>
      </main>

      <NewGameSetupModal
        open={showNewGameSetup}
        onClose={() => setShowNewGameSetup(false)}
        required
      />
      <RaceDiscoveryModal />
      <TechnologyDiscoveryModal />
      <SurvivorModal />
      <WelcomeTutorial onDismissed={handleTutorialDismissed} />
    </div>
  );
}
