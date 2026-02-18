"use client";

import { useGameStore } from "../store";
import { Button } from "@/components/ui/button";

interface GameOverPanelProps {
    reason: string;
}

export function GameOverPanel({ reason }: GameOverPanelProps) {
    const currentSector = useGameStore((s) => s.currentSector);
    const turn = useGameStore((s) => s.turn);
    const crew = useGameStore((s) => s.crew);
    const ship = useGameStore((s) => s.ship);

    return (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.95)] z-50 flex items-center justify-center p-4">
            <div className="bg-[#0a0f1a] border-2 border-[#ff0040] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-[#ff0040] bg-[rgba(255,0,64,0.1)]">
                    <h2 className="font-['Orbitron'] text-2xl font-bold text-[#ff0040] animate-pulse">
                        💥 ИГРА ОКОНЧЕНА
                    </h2>
                    <div className="text-[#ff0040] text-sm">
                        Ход: {turn} | Сектор:{" "}
                        {currentSector?.name || "Неизвестно"}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Defeat reason */}
                    <div className="bg-[rgba(255,0,64,0.1)] border border-[#ff0040] p-4">
                        <div className="text-[#ff0040] font-bold text-lg mb-2">
                            ⚠️ ПРИЧИНА ПОРАЖЕНИЯ:
                        </div>
                        <div className="text-[#ffb000] text-base">{reason}</div>
                    </div>

                    {/* Ship status */}
                    <div className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-4">
                        <div className="text-[#00ff41] font-bold text-lg mb-3">
                            📊 СОСТОЯНИЕ КОРАБЛЯ:
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-[#888]">Броня:</span>
                                <span
                                    className={
                                        ship.armor <= 0
                                            ? "text-[#ff0040] font-bold"
                                            : "text-[#00ff41]"
                                    }
                                >
                                    {ship.armor}%
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
                                <span
                                    className={
                                        crew.length === 0
                                            ? "text-[#ff0040] font-bold"
                                            : "text-[#00ff41]"
                                    }
                                >
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
                    {crew.length === 0 && (
                        <div className="bg-[rgba(255,0,64,0.1)] border border-[#ff0040] p-4">
                            <div className="text-[#ff0040] font-bold text-lg mb-2">
                                ☠️ ЭКИПАЖ ПОГИБ:
                            </div>
                            <div className="text-[#888] text-sm">
                                Все члены экипажа погибли или покинули корабль.
                                <br />
                                Без ИИ Ядра корабль не может функционировать.
                            </div>
                        </div>
                    )}

                    {/* Restart button */}
                    <div className="pt-4">
                        <Button
                            onClick={() => window.location.reload()}
                            className="w-full bg-transparent border-2 border-[#ff0040] text-[#ff0040] hover:bg-[#ff0040] hover:text-[#050810] uppercase tracking-wider text-lg py-6"
                        >
                            🔄 НАЧАТЬ ЗАНОВО
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
