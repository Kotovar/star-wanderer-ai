"use client";

import { useEffect } from "react";
import { GameHeader } from "@/game/components/header";
import { ShipGrid } from "@/game/components/ShipGrid";
import { ModuleList } from "@/game/components/ModuleList";
import { CrewList } from "@/game/components/CrewList";
import { ShipStats } from "@/game/components/ShipStats";
import { CargoDisplay } from "@/game/components/CargoDisplay";
import { GameLog } from "@/game/components/GameLog";
import { ContractsList } from "@/game/components/ContractsList";
import { EventDisplay } from "@/game/components/EventPanels";
import { GameEndPanel } from "@/game/components/panels";
import { useGameStore } from "@/game/store";
import { RaceDiscoveryModal } from "@/game/components/RaceDiscoveryModal";
import { SurvivorModal } from "@/game/components/SurvivorModal";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslation } from "@/lib/useTranslation";

export default function Home() {
    const gameOver = useGameStore((s) => s.gameOver);
    const gameOverReason = useGameStore((s) => s.gameOverReason);
    const gameVictory = useGameStore((s) => s.gameVictory);
    const gameVictoryReason = useGameStore((s) => s.gameVictoryReason);
    const moduleMovedThisTurn = useGameStore((s) => s.ship.moduleMovedThisTurn);
    const loadGame = useGameStore((s) => s.loadGame);
    const gameMode = useGameStore((s) => s.gameMode);
    const { t } = useTranslation();

    useEffect(() => {
        loadGame();
    }, [loadGame]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024 && gameMode === "research") {
                useGameStore.getState().showSectorMap();
            }
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [gameMode]);

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
                <div className="panel flex-1 lg:w-95 flex flex-col gap-4 overflow-y-auto min-w-0 lg:h-[calc(100vh-100px)] border-2 border-[#00ff41] bg-[rgba(0,255,65,0.02)] rounded-lg p-2 scrollbar-gutter-stable">
                    <Accordion type="multiple" className="w-full">
                        <AccordionItem
                            value="ship"
                            className="border border-[#00ff41] bg-[rgba(0,255,65,0.03)] px-2 md:px-2.5"
                        >
                            <AccordionTrigger className="font-['Orbitron'] font-bold text-sm md:text-base text-[#ffb000] hover:text-[#00ff41] py-2 px-1 md:py-2.5 cursor-pointer">
                                {t("ship.title")}{" "}
                                {moduleMovedThisTurn && t("ship.locked")}
                            </AccordionTrigger>
                            <AccordionContent>
                                <ShipGrid />
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem
                            value="ship_stats"
                            className="border border-[#00ff41] bg-[rgba(0,255,65,0.03)] px-2 md:px-2.5"
                        >
                            <AccordionTrigger className="font-['Orbitron'] font-bold text-sm md:text-base text-[#ffb000] hover:text-[#00ff41] py-2 px-1 md:py-2.5 cursor-pointer">
                                {t("ship.ship_state")}
                            </AccordionTrigger>
                            <AccordionContent>
                                <ShipStats />
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem
                            value="crew"
                            className="border border-[#00ff41] bg-[rgba(0,255,65,0.03)] px-2 md:px-2.5"
                        >
                            <AccordionTrigger className="font-['Orbitron'] font-bold text-sm md:text-base text-[#ffb000] hover:text-[#00ff41] py-2 px-1 md:py-2.5 cursor-pointer">
                                {t("ship.crew")}
                            </AccordionTrigger>
                            <AccordionContent>
                                <CrewList />
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem
                            value="modules"
                            className="border border-[#00ff41] bg-[rgba(0,255,65,0.03)] px-2 md:px-2.5"
                        >
                            <AccordionTrigger className="font-['Orbitron'] font-bold text-sm md:text-base text-[#ffb000] hover:text-[#00ff41] py-2 px-1 md:py-2.5 cursor-pointer">
                                {t("ship.modules")}
                            </AccordionTrigger>
                            <AccordionContent>
                                <ModuleList />
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem
                            value="cargo"
                            className="border border-[#00ff41] bg-[rgba(0,255,65,0.03)] px-2 md:px-2.5"
                        >
                            <AccordionTrigger className="font-['Orbitron'] font-bold text-sm md:text-base text-[#ffb000] hover:text-[#00ff41] py-2 px-1 md:py-2.5 cursor-pointer">
                                {t("ship.cargo")}
                            </AccordionTrigger>
                            <AccordionContent>
                                <CargoDisplay />
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem
                            value="contracts"
                            className="border border-[#00ff41] bg-[rgba(0,255,65,0.03)] px-2 md:px-2.5"
                        >
                            <AccordionTrigger className="font-['Orbitron'] font-bold text-sm md:text-base text-[#ffb000] hover:text-[#00ff41] py-2 px-1 md:py-2.5 cursor-pointer">
                                {t("ship.contracts")}
                            </AccordionTrigger>
                            <AccordionContent>
                                <ContractsList />
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>

                {/* Right Panel */}
                <div className="panel flex-1 lg:flex-1 flex flex-col min-w-0 h-[calc(100vh-200px)] lg:h-[calc(100vh-100px)] relative border-2 border-[#00ff41] bg-[rgba(0,255,65,0.02)] rounded-lg p-2">
                    <div className="flex-1 overflow-hidden min-h-0 pb-14">
                        <EventDisplay />
                    </div>

                    {/* Event Journal - at the bottom */}
                    <div className="absolute bottom-0 left-0 right-0 z-10 px-2 md:px-5 pb-2">
                        <Accordion type="multiple" className="w-full">
                            <AccordionItem
                                value="log"
                                className="border border-[#00ff41] bg-[rgba(0,255,65,0.03)] px-2 md:px-2.5 overflow-hidden"
                            >
                                <AccordionTrigger className="font-['Orbitron'] font-bold text-sm md:text-base text-[#ffb000] hover:text-[#00ff41] py-2 px-1 md:py-2.5 cursor-pointer truncate">
                                    {t("ship.event_log")}
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="max-h-50 overflow-y-scroll">
                                        <GameLog />
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                </div>
            </main>

            <RaceDiscoveryModal />
            <SurvivorModal />
        </div>
    );
}
