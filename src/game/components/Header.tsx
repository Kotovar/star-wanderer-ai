"use client";

import { useState } from "react";
import { useGameStore } from "../store";
import { HelpPanel } from "./HelpPanel";

export function GameHeader() {
    const [showHelp, setShowHelp] = useState(false);
    const turn = useGameStore((s) => s.turn);
    const credits = useGameStore((s) => s.credits);
    const currentSector = useGameStore((s) => s.currentSector);
    const artifacts = useGameStore((s) => s.artifacts);
    const showArtifacts = useGameStore((s) => s.showArtifacts);
    const gameMode = useGameStore((s) => s.gameMode);

    const discoveredArtifacts = artifacts.filter((a) => a.discovered).length;
    const activeArtifacts = artifacts.filter((a) => a.effect.active).length;

    const handleArtifactsClick = () => {
        if (gameMode === "artifacts") {
            // If artifacts panel is open, close it by going to sector map
            useGameStore.getState().showSectorMap();
        } else {
            showArtifacts();
        }
    };

    return (
        <>
            <header className="bg-[rgba(10,20,30,0.9)] border-b-2 border-[#00ff41] px-4 py-3 md:px-5 md:py-4 flex flex-col md:flex-row justify-between items-center gap-3 md:gap-0 shadow-[0_0_20px_rgba(0,255,65,0.3)]">
                <h1 className="font-['Orbitron'] font-black text-lg md:text-2xl tracking-[2px] md:tracking-[3px] text-[#00ff41] animate-pulse drop-shadow-[0_0_10px_#00ff41] text-center md:text-left">
                    ◆ ЗВЁЗДНЫЙ СТРАННИК ◆
                </h1>
                <div className="flex gap-2 md:gap-5 text-xs md:text-sm items-center flex-wrap justify-center md:justify-normal">
                    <button
                        onClick={() => setShowHelp(true)}
                        className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 border border-[#00d4ff] hover:bg-[rgba(0,212,255,0.2)] transition-colors cursor-pointer"
                        title="Справка"
                    >
                        <span className="text-[#00d4ff]">📖</span>
                        <span className="text-[#00d4ff] hidden md:inline">
                            СПРАВКА
                        </span>
                    </button>
                    <button
                        onClick={handleArtifactsClick}
                        className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 border border-[#ff00ff] hover:bg-[rgba(255,0,255,0.2)] transition-colors cursor-pointer"
                        title="Артефакты Древних"
                    >
                        <span className="text-[#ff00ff]">★</span>
                        <span className="text-[#ff00ff]">
                            {discoveredArtifacts}
                        </span>
                        {activeArtifacts > 0 && (
                            <span className="text-[#00ff41] text-xs">
                                ({activeArtifacts})
                            </span>
                        )}
                    </button>
                    <div className="flex items-center gap-1 md:gap-2">
                        <span className="text-[#ffb000] hidden md:inline">
                            ХОД:
                        </span>
                        <span className="text-[#ffb000] md:hidden">🔢</span>
                        <span className="font-bold text-[#00ff41]">{turn}</span>
                    </div>
                    <div className="flex items-center gap-1 md:gap-2">
                        <span className="text-[#ffb000]">₢</span>
                        <span className="font-bold text-[#00ff41]">
                            {isNaN(credits) ? 0 : credits}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 md:gap-2">
                        <span className="text-[#ffb000] hidden md:inline">
                            СЕКТОР:
                        </span>
                        <span className="text-[#ffb000] md:hidden">📍</span>
                        <span className="font-bold text-[#00ff41] text-xs md:text-base">
                            {currentSector?.name || "СТАРТ"}
                        </span>
                    </div>
                </div>
            </header>

            {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}
        </>
    );
}
