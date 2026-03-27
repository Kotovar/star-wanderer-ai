"use client";

import { useState } from "react";
import { useGameStore } from "../store";
import { GalaxyMap } from "./GalaxyMap";
import { SectorMap } from "./SectorMap";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";
import { calculateFuelCostForUI } from "@/game/slices/travel/helpers";

import { CombatPanel } from "./CombatPanel";
import { AssignmentsPanel } from "./AssignmentsPanel";
import { StationPanel } from "./StationPanel";
import { PlanetPanel } from "./PlanetPanel";
import { AnomalyPanel } from "./AnomalyPanel";
import { FriendlyShipPanel } from "./FriendlyShipPanel";
import { AsteroidBeltPanel } from "./AsteroidBeltPanel";
import { StormPanel } from "./StormPanel";
import { DistressSignalPanel } from "./DistressSignalPanel";
import { ArtifactPanel } from "./ArtifactPanel";
import { UnknownShipPanel } from "./UnknownShipPanel";
import { BattleResultsPanel } from "./BattleResultsPanel";
import { StormResultsPanel } from "./StormResultsPanel";
import { ResearchPanel } from "./ResearchPanel";
import { DerelictShipPanel } from "./DerelictShipPanel";
import { GasGiantPanel } from "./GasGiantPanel";

export function EventDisplay() {
    const gameMode = useGameStore((s) => s.gameMode);
    const traveling = useGameStore((s) => s.traveling);
    const showGalaxyMap = useGameStore((s) => s.showGalaxyMap);
    const showSectorMap = useGameStore((s) => s.showSectorMap);
    const showAssignments = useGameStore((s) => s.showAssignments);
    const skipTurn = useGameStore((s) => s.skipTurn);
    const currentSector = useGameStore((s) => s.currentSector);
    const emergencyJump = useGameStore((s) => s.emergencyJump);
    const isStuckInBlackHole = useGameStore((s) => {
        if (s.currentSector?.star?.type !== "blackhole") return false;
        const nonBH = s.galaxy.sectors.filter(
            (sec) =>
                sec.star?.type !== "blackhole" &&
                sec.id !== s.currentSector?.id,
        );
        if (nonBH.length === 0) return true;
        const minCost = Math.min(
            ...nonBH.map((sec) => calculateFuelCostForUI(s, sec.id).fuelCost),
        );
        return s.ship.fuel < minCost;
    });
    const { t } = useTranslation();

    const [isSkipping, setIsSkipping] = useState(false);

    const handleSkipTurn = () => {
        setIsSkipping(true);
        skipTurn();
        setTimeout(() => setIsSkipping(false), 600);
    };

    // Traveling state
    if (traveling) {
        return (
            <div className="flex flex-col gap-4">
                <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000] mb-4">
                    ▸ ПУТЕШЕСТВИЕ
                </div>
                <div className="text-sm leading-relaxed">
                    Корабль движется к{" "}
                    <span className="text-[#ffb000]">
                        {traveling.destination.name}
                    </span>
                    <br />
                    <br />
                    Осталось ходов:{" "}
                    <span className="text-[#00d4ff]">
                        {traveling.turnsLeft}
                    </span>
                </div>
                <div className="flex gap-2.5 flex-wrap mt-5">
                    <Button
                        onClick={handleSkipTurn}
                        disabled={isSkipping}
                        className={`bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                            isSkipping
                                ? "scale-95 bg-[#00ff41] text-[#050810]"
                                : ""
                        }`}
                    >
                        {isSkipping
                            ? "⏱️ ПРОПУСКАЕМ..."
                            : t("galaxy.buttons.next_turn")}
                    </Button>
                    <Button
                        onClick={showAssignments}
                        className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    >
                        {t("galaxy.buttons.crew_tasks")}
                    </Button>
                </div>
            </div>
        );
    }

    switch (gameMode) {
        case "galaxy_map":
            return (
                <div className="flex flex-col h-full">
                    <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000] mb-2 uppercase">
                        ▸ {t(`galaxy.tiers.tier${currentSector?.tier ?? 1}`)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 shrink-0">
                        <Button
                            onClick={showSectorMap}
                            className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider text-xs transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        >
                            {t("galaxy.buttons.sector_map")}
                        </Button>
                        <div className="grid grid-rows-2 gap-2">
                            <Button
                                onClick={showAssignments}
                                className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider text-xs transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                            >
                                {t("galaxy.buttons.crew_tasks")}
                            </Button>
                            <Button
                                onClick={handleSkipTurn}
                                disabled={isSkipping}
                                className={` bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider text-xs transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                                    isSkipping
                                        ? "scale-95 bg-[#00ff41] text-[#050810]"
                                        : ""
                                }`}
                            >
                                {isSkipping ? "⏱️ " : ""}
                                {t("galaxy.buttons.skip_turn")}
                            </Button>
                        </div>
                    </div>
                    <div className="text-sm text-center shrink-0 h-6 flex items-center justify-center">
                        {t("galaxy.labels.sector")}:{" "}
                        <span className="text-[#ffb000]">
                            {currentSector?.name}
                        </span>
                    </div>
                    <div className="h-80 md:h-auto md:flex-1 relative shrink-0">
                        <GalaxyMap />
                    </div>
                    <div className="text-[11px] text-center text-[#00ff41] py-2 shrink-0">
                        {t("galaxy.labels.click_sector")}
                    </div>
                </div>
            );

        case "sector_map":
            return (
                <div className="flex flex-col h-full">
                    <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000] mb-2">
                        ▸ {currentSector?.name}
                    </div>
                    <div className="grid grid-cols-2 gap-2 shrink-0">
                        <Button
                            onClick={showGalaxyMap}
                            className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider text-xs transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        >
                            {t("galaxy.buttons.galaxy_map")}
                        </Button>
                        <div className="grid grid-rows-2 gap-2">
                            <Button
                                onClick={showAssignments}
                                className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider text-xs transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                            >
                                {t("galaxy.buttons.crew_tasks")}
                            </Button>
                            <Button
                                onClick={handleSkipTurn}
                                disabled={isSkipping}
                                className={`cursor-pointer bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider text-xs transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                                    isSkipping
                                        ? "scale-95 bg-[#00ff41] text-[#050810]"
                                        : ""
                                }`}
                            >
                                {isSkipping ? "⏱️ " : ""}
                                {t("galaxy.buttons.skip_turn")}
                            </Button>
                        </div>
                    </div>
                    <div className="text-sm text-center shrink-0 h-6 flex items-center justify-center">
                        {t("galaxy.labels.threat_level")}:{" "}
                        {currentSector?.danger}
                    </div>
                    <div className="h-80 md:h-auto md:flex-1 relative shrink-0">
                        <SectorMap />
                    </div>
                    {currentSector?.star?.type === "blackhole" ? (
                        <div className="text-[11px] text-center py-2 shrink-0">
                            <span className="text-[#ff00ff] font-bold">
                                {t("galaxy.black_hole.title")}
                            </span>
                            <span className="text-[#ffb000] ml-1">
                                — {t("galaxy.black_hole.hint")}
                            </span>
                            {isStuckInBlackHole && (
                                <div className="mt-1">
                                    <button
                                        onClick={emergencyJump}
                                        className="cursor-pointer bg-[rgba(255,50,50,0.2)] border border-[#ff3232] text-[#ff3232] px-3 py-1 text-xs font-bold hover:bg-[rgba(255,50,50,0.4)] transition-colors"
                                    >
                                        {t("galaxy.black_hole.emergency_jump")}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-[11px] text-center text-[#00ff41] py-2 shrink-0">
                            {t("galaxy.labels.click_object")}
                        </div>
                    )}
                </div>
            );

        case "station":
            return <StationPanel />;

        case "planet":
            return <PlanetPanel />;

        case "combat":
            return <CombatPanel />;

        case "anomaly":
            return <AnomalyPanel />;

        case "friendly_ship":
            return <FriendlyShipPanel />;

        case "asteroid_belt":
            return <AsteroidBeltPanel />;

        case "storm":
            return <StormPanel />;

        case "distress_signal":
            return <DistressSignalPanel />;

        case "derelict_ship":
            return <DerelictShipPanel />;

        case "gas_giant":
            return <GasGiantPanel />;

        case "artifacts":
            return (
                <>
                    {/* Desktop: inline panel with fixed height */}
                    <div className="hidden md:flex md:flex-col md:h-full">
                        <ArtifactPanel />
                    </div>
                    {/* Mobile: full-screen modal */}
                    <div className="md:hidden fixed inset-0 bg-[rgba(0,0,0,0.9)] z-50 flex items-center justify-center p-4">
                        <div className="bg-[#0a0f1a] border-2 border-[#ff00ff] max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center p-4 border-b border-[#ff00ff] sticky top-0 bg-[#0a0f1a]">
                                <h2 className="font-['Orbitron'] text-xl font-bold text-[#ff00ff]">
                                    ★ АРТЕФАКТЫ ДРЕВНИХ
                                </h2>
                                <button
                                    onClick={() =>
                                        useGameStore
                                            .getState()
                                            .closeArtifactsPanel()
                                    }
                                    className="text-[#ff0040] hover:text-white text-2xl font-bold cursor-pointer px-2"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="p-4">
                                <ArtifactPanel />
                            </div>
                        </div>
                    </div>
                </>
            );

        case "unknown_ship":
            return <UnknownShipPanel />;

        case "battle_results":
            return <BattleResultsPanel />;

        case "storm_results":
            return <StormResultsPanel />;

        case "assignments":
            return <AssignmentsPanel />;

        case "research":
            return (
                <>
                    {/* Desktop: full panel */}
                    <div className="hidden md:block">
                        <ResearchPanel />
                    </div>
                    {/* Mobile: show button that triggers modal in ResearchPanel */}
                    <div className="md:hidden p-4">
                        <ResearchPanel />
                    </div>
                </>
            );

        default:
            return null;
    }
}
