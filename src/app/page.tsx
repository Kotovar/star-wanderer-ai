"use client";

import { useEffect } from "react";
import { GameHeader } from "@/game/components/Header";
import { ShipGrid } from "@/game/components/ShipGrid";
import { ModuleList } from "@/game/components/ModuleList";
import { CrewList } from "@/game/components/CrewList";
import { ShipStats } from "@/game/components/ShipStats";
import { CargoDisplay } from "@/game/components/CargoDisplay";
import { GameLog } from "@/game/components/GameLog";
import { ContractsList } from "@/game/components/ContractsList";
import { EventDisplay } from "@/game/components/EventPanels";
import { GameOverPanel } from "@/game/components/GameOverPanel";
import { VictoryPanel } from "@/game/components/VictoryPanel";
import { useGameStore } from "@/game/store";
import { RaceDiscoveryModal } from "@/game/components/RaceDiscoveryModal";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

export default function Home() {
    const gameOver = useGameStore((s) => s.gameOver);
    const gameOverReason = useGameStore((s) => s.gameOverReason);
    const gameVictory = useGameStore((s) => s.gameVictory);
    const gameVictoryReason = useGameStore((s) => s.gameVictoryReason);
    const moduleMovedThisTurn = useGameStore((s) => s.ship.moduleMovedThisTurn);
    const loadGame = useGameStore((s) => s.loadGame);

    useEffect(() => {
        // Try to load saved game on mount
        // loadGame() will initialize ship stats if no save is found
        loadGame();
    }, [loadGame]);

    return (
        <div className="min-h-screen flex flex-col bg-[#050810] font-['Share_Tech_Mono'] text-[#00ff41]">
            {/* Scanline effect */}
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
                <GameOverPanel reason={gameOverReason} />
            )}

            {/* Victory Panel */}
            {gameVictory && gameVictoryReason && (
                <VictoryPanel reason={gameVictoryReason} />
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
                    box-shadow: 0 0 10px #00ff41;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: #ffb000;
                    box-shadow: 0 0 10px #ffb000;
                }

                .panel {
                    background: rgba(10, 20, 30, 0.9);
                    border: 2px solid #00ff41;
                    margin: 8px;
                    padding: 16px;
                    overflow-y: auto;
                    overflow-x: hidden;
                    box-shadow: inset 0 0 20px rgba(0, 255, 65, 0.1);
                    max-height: 100vh;
                    max-width: 100%;
                    box-sizing: border-box;
                }

                @media (min-width: 1024px) {
                    .panel {
                        margin: 10px;
                        padding: 20px;
                    }
                }

                .section-title {
                    font-family: "Orbitron", monospace;
                    font-weight: 700;
                    font-size: 16px;
                    color: #ffb000;
                    margin-bottom: 12px;
                    padding-bottom: 6px;
                    border-bottom: 1px solid #00ff41;
                    text-shadow: 0 0 10px #ffb000;
                    word-break: break-word;
                }

                @media (min-width: 1024px) {
                    .section-title {
                        font-size: 18px;
                        margin-bottom: 15px;
                        padding-bottom: 8px;
                    }
                }

                /* Prevent horizontal overflow on mobile */
                html,
                body {
                    overflow-x: hidden;
                    max-width: 100%;
                    width: 100%;
                    position: relative;
                    margin: 0;
                    padding: 0;
                    background-color: #050810;
                    color: #00ff41;
                }

                * {
                    box-sizing: border-box;
                    min-width: 0;
                }

                /* Force containers to stay within viewport */
                .panel,
                main,
                .accordion-content,
                .accordion-item {
                    max-width: 100vw;
                    min-width: 0;
                }

                /* Reserve space for scrollbar in accordion content */
                [data-slot="accordion-content"] {
                    scrollbar-gutter: stable;
                }

                /* Event journal - no special positioning */

                @media (max-width: 655px) {
                    .panel {
                        margin: 6px;
                        padding: 12px;
                        border-width: 1px;
                    }

                    .accordion-trigger {
                        padding: 10px 8px;
                        font-size: 14px;
                        min-width: 0;
                    }
                }
            `}</style>

            <GameHeader />

            <main className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-full min-w-0">
                {/* Left Panel */}
                <div className="panel flex-1 lg:w-95 flex flex-col gap-4 overflow-y-auto overflow-x-hidden min-w-0 lg:h-[calc(100vh-90px)]">
                    <Accordion
                        type="multiple"
                        defaultValue={["ship", "crew", "modules"]}
                        className="w-full"
                    >
                        <AccordionItem
                            value="ship"
                            className="border border-[#00ff41] bg-[rgba(0,255,65,0.03)] px-2 md:px-2.5 mb-3 md:mb-4"
                        >
                            <AccordionTrigger className="font-['Orbitron'] font-bold text-sm md:text-base text-[#ffb000] hover:text-[#00ff41] py-2 px-1 md:py-2.5 cursor-pointer">
                                КОРАБЛЬ {moduleMovedThisTurn && "🔒"}
                            </AccordionTrigger>
                            <AccordionContent>
                                <ShipGrid />
                                <ShipStats />
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem
                            value="crew"
                            className="border border-[#00ff41] bg-[rgba(0,255,65,0.03)] px-2 md:px-2.5 mb-3 md:mb-4"
                        >
                            <AccordionTrigger className="font-['Orbitron'] font-bold text-sm md:text-base text-[#ffb000] hover:text-[#00ff41] py-2 px-1 md:py-2.5 cursor-pointer">
                                ЭКИПАЖ
                            </AccordionTrigger>
                            <AccordionContent>
                                <CrewList />
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem
                            value="modules"
                            className="border border-[#00ff41] bg-[rgba(0,255,65,0.03)] px-2 md:px-2.5 mb-3 md:mb-4"
                        >
                            <AccordionTrigger className="font-['Orbitron'] font-bold text-sm md:text-base text-[#ffb000] hover:text-[#00ff41] py-2 px-1 md:py-2.5 cursor-pointer">
                                МОДУЛИ
                            </AccordionTrigger>
                            <AccordionContent>
                                <ModuleList />
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem
                            value="cargo"
                            className="border border-[#00ff41] bg-[rgba(0,255,65,0.03)] px-2 md:px-2.5 mb-3 md:mb-4"
                        >
                            <AccordionTrigger className="font-['Orbitron'] font-bold text-sm md:text-base text-[#ffb000] hover:text-[#00ff41] py-2 px-1 md:py-2.5 cursor-pointer">
                                ГРУЗОВОЙ ОТСЕК
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
                                АКТИВНЫЕ КОНТРАКТЫ
                            </AccordionTrigger>
                            <AccordionContent>
                                <ContractsList />
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>

                {/* Right Panel */}
                <div className="panel flex-1 lg:flex-1 flex flex-col mt-4 lg:mt-0 min-w-0 lg:h-[calc(100vh-90px)] pl-3 relative">
                    <div className="flex-1 overflow-hidden min-h-0 pb-14">
                        <EventDisplay />
                    </div>

                    {/* Event Journal - at the bottom */}
                    <div className="absolute bottom-0 left-0 right-0 z-10 px-5">
                        <Accordion type="multiple" className="w-full">
                            <AccordionItem
                                value="log"
                                className="border border-[#00ff41] bg-[rgba(0,255,65,0.03)] px-2 md:px-2.5 overflow-hidden"
                            >
                                <AccordionTrigger className="font-['Orbitron'] font-bold text-sm md:text-base text-[#ffb000] hover:text-[#00ff41] py-2 px-1 md:py-2.5 cursor-pointer truncate">
                                    ЖУРНАЛ СОБЫТИЙ
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
        </div>
    );
}
