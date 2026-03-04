"use client";

import { useGameStore } from "@/game/store";
import { Button } from "@/components/ui/button";

interface GameEndPanelProps {
    type: "victory" | "gameover";
    reason: string;
}

const THEMES = {
    victory: {
        border: "#ff00ff",
        bg: "rgba(255,0,255,0.1)",
        title: "🎉 ПОБЕДА!",
        reasonTitle: "ГРАНИЦА ГАЛАКТИКИ ДОСТИГНУТА:",
        reasonIcon: "🌟",
    },
    gameover: {
        border: "#ff0040",
        bg: "rgba(255,0,64,0.1)",
        title: "💥 ИГРА ОКОНЧЕНА",
        reasonTitle: "ПРИЧИНА ПОРАЖЕНИЯ:",
        reasonIcon: "⚠️",
    },
} as const;

export function GameEndPanel({ type, reason }: GameEndPanelProps) {
    const currentSector = useGameStore((s) => s.currentSector);
    const turn = useGameStore((s) => s.turn);
    const crew = useGameStore((s) => s.crew);
    const ship = useGameStore((s) => s.ship);
    const restartGame = useGameStore((s) => s.restartGame);

    const theme = THEMES[type];
    const isVictory = type === "victory";

    const hullHealth = ship.modules.reduce((sum, m) => sum + m.health, 0);
    const hullMaxHealth = ship.modules.reduce((sum, m) => sum + m.maxHealth, 0);
    const activeModules = ship.modules.filter((m) => m.health > 0).length;

    return (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.95)] z-50 flex items-center justify-center p-4">
            <div
                className={`bg-[#0a0f1a] border-2 max-w-2xl w-full max-h-[90vh] overflow-y-auto`}
                style={{
                    borderColor: theme.border,
                }}
            >
                <div
                    className="flex justify-between items-center p-4 border-b bg-[rgba(255,255,255,0.05)]"
                    style={{
                        borderColor: theme.border,
                        backgroundColor: theme.bg,
                    }}
                >
                    <h2
                        className="font-['Orbitron'] text-2xl font-bold animate-pulse"
                        style={{ color: theme.border }}
                    >
                        {theme.title}
                    </h2>
                    <div className="text-sm" style={{ color: theme.border }}>
                        Ход: {turn} | Сектор:{" "}
                        {currentSector?.name ?? "Неизвестно"}
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div
                        className="border p-4"
                        style={{
                            borderColor: theme.border,
                            backgroundColor: theme.bg,
                        }}
                    >
                        <div
                            className="font-bold text-lg mb-2"
                            style={{ color: theme.border }}
                        >
                            {theme.reasonIcon} {theme.reasonTitle}
                        </div>
                        <div className="text-[#ffb000] text-base whitespace-pre-line">
                            {reason}
                        </div>
                    </div>

                    <div className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-4">
                        <div className="text-[#00ff41] font-bold text-lg mb-3">
                            📊 СОСТОЯНИЕ КОРАБЛЯ:
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-[#888]">Корпус:</span>
                                <span
                                    className={
                                        !isVictory && hullHealth <= 0
                                            ? "text-[#ff0040] font-bold"
                                            : "text-[#00ff41]"
                                    }
                                >
                                    {hullHealth}/{hullMaxHealth} ед.
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
                                        !isVictory && crew.length === 0
                                            ? "text-[#ff0040] font-bold"
                                            : "text-[#00ff41]"
                                    }
                                >
                                    {crew.length}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#888]">Модули:</span>
                                <span className="text-[#00ff41]">
                                    {activeModules}/{ship.modules.length}
                                </span>
                            </div>
                        </div>
                    </div>

                    {!isVictory && crew.length === 0 && (
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

                    {isVictory && (
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
                    )}

                    <div className="pt-4">
                        <Button
                            onClick={() => {
                                restartGame();
                                window.location.href = "/";
                            }}
                            className="cursor-pointer w-full bg-transparent border-2 hover:bg-(--border-color) hover:text-[#050810] uppercase tracking-wider text-lg py-6"
                            style={{
                                borderColor: theme.border,
                                color: theme.border,
                                ["--border-color" as string]: theme.border,
                            }}
                        >
                            🔄 НАЧАТЬ ЗАНОВО
                        </Button>
                    </div>

                    {isVictory && (
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
                    )}
                </div>
            </div>
        </div>
    );
}
