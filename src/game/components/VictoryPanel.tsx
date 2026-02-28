"use client";

import { useGameStore } from "../store";
import { Button } from "@/components/ui/button";

interface VictoryPanelProps {
    reason: string;
}

export function VictoryPanel({ reason }: VictoryPanelProps) {
    const currentSector = useGameStore((s) => s.currentSector);
    const turn = useGameStore((s) => s.turn);
    const crew = useGameStore((s) => s.crew);
    const ship = useGameStore((s) => s.ship);
    const restartGame = useGameStore((s) => s.restartGame);

    return (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.95)] z-50 flex items-center justify-center p-4">
            <div className="bg-[#0a0f1a] border-2 border-[#ff00ff] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-[#ff00ff] bg-[rgba(255,0,255,0.1)]">
                    <h2 className="font-['Orbitron'] text-2xl font-bold text-[#ff00ff] animate-pulse">
                        🎉 ПОБЕДА!
                    </h2>
                    <div className="text-[#ff00ff] text-sm">
                        Ход: {turn} | Сектор:{" "}
                        {currentSector?.name || "Неизвестно"}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Victory reason */}
                    <div className="bg-[rgba(255,0,255,0.1)] border border-[#ff00ff] p-4">
                        <div className="text-[#ff00ff] font-bold text-lg mb-2">
                            🌟 ГРАНИЦА ГАЛАКТИКИ ДОСТИГНУТА:
                        </div>
                        <div className="text-[#ffb000] text-base whitespace-pre-line">
                            {reason}
                        </div>
                    </div>

                    {/* Ship status */}
                    <div className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-4">
                        <div className="text-[#00ff41] font-bold text-lg mb-3">
                            📊 СОСТОЯНИЕ КОРАБЛЯ:
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-[#888]">Корпус:</span>
                                <span className="text-[#00ff41]">
                                    {ship.modules.reduce(
                                        (sum, m) => sum + m.health,
                                        0,
                                    )}
                                    /
                                    {ship.modules.reduce(
                                        (sum, m) => sum + m.maxHealth,
                                        0,
                                    )}{" "}
                                    ед.
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#888]">Щиты:</span>
                                <span className="text-[#0080ff]">
                                    {ship.shields}/{ship.maxShields}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#888]">Экипаж:</span>
                                <span className="text-[#00ff41]">
                                    {crew.length} чел.
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#888]">Модули:</span>
                                <span className="text-[#00ff41]">
                                    {
                                        ship.modules.filter((m) => m.health > 0)
                                            .length
                                    }
                                    /{ship.modules.length}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Crew status */}
                    <div className="bg-[rgba(0,212,255,0.05)] border border-[#00d4ff] p-4">
                        <div className="text-[#00d4ff] font-bold text-lg mb-3">
                            👥 ЭКИПАЖ:
                        </div>
                        <div className="space-y-1 text-sm">
                            {crew.map((member) => (
                                <div
                                    key={member.id}
                                    className="flex justify-between"
                                >
                                    <span className="text-[#888]">
                                        {member.name} ({member.profession})
                                    </span>
                                    <span className="text-[#00ff41]">
                                        Ур.{member.level}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Restart button */}
                    <div className="pt-4">
                        <Button
                            onClick={() => {
                                restartGame();
                                window.location.href = "/";
                            }}
                            className="w-full bg-transparent border-2 border-[#ff00ff] text-[#ff00ff] hover:bg-[#ff00ff] hover:text-[#050810] uppercase tracking-wider text-lg py-6"
                        >
                            🔄 НАЧАТЬ ЗАНОВО
                        </Button>
                    </div>

                    {/* Continue exploring option */}
                    <div className="pt-2">
                        <Button
                            onClick={() => {
                                useGameStore.getState().showGalaxyMap();
                            }}
                            className="w-full bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider text-lg py-6"
                        >
                            🚀 ПРОДОЛЖИТЬ ИССЛЕДОВАНИЕ
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
