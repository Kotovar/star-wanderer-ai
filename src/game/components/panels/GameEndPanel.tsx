"use client";

import { useGameStore } from "@/game/store";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";

interface GameEndPanelProps {
    type: "victory" | "gameover";
    reason: string;
}

const THEMES = {
    victory: {
        border: "#ff00ff",
        bg: "rgba(255,0,255,0.1)",
        titleKey: "game_end.victory_title",
        reasonTitleKey: "game_end.reason_title",
        reasonIcon: "🌟",
    },
    gameover: {
        border: "#ff0040",
        bg: "rgba(255,0,64,0.1)",
        titleKey: "game_end.gameover_title",
        reasonTitleKey: "game_end.defeat_reason",
        reasonIcon: "⚠️",
    },
} as const;

export function GameEndPanel({ type, reason }: GameEndPanelProps) {
    const currentSector = useGameStore((s) => s.currentSector);
    const turn = useGameStore((s) => s.turn);
    const crew = useGameStore((s) => s.crew);
    const ship = useGameStore((s) => s.ship);
    const restartGame = useGameStore((s) => s.restartGame);
    const { t } = useTranslation();

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
                        {t(theme.titleKey)}
                    </h2>
                    <div className="text-sm" style={{ color: theme.border }}>
                        {t("game.turn")}: {turn} | {t("game.sector")}:{" "}
                        {currentSector?.name ?? t("game_end.unknown")}
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
                            {theme.reasonIcon} {t(theme.reasonTitleKey)}
                        </div>
                        <div className="text-[#ffb000] text-base whitespace-pre-line">
                            {reason}
                        </div>
                    </div>

                    <div className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-4">
                        <div className="text-[#00ff41] font-bold text-lg mb-3">
                            📊 {t("game_end.ship_status")}:
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-[#888]">
                                    {t("game_end.hull_label")}
                                </span>
                                <span
                                    className={
                                        !isVictory && hullHealth <= 0
                                            ? "text-[#ff0040] font-bold"
                                            : "text-[#00ff41]"
                                    }
                                >
                                    {hullHealth}/{hullMaxHealth}{" "}
                                    {t("game_end.units")}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#888]">
                                    {t("game_end.shields_label")}
                                </span>
                                <span className="text-[#0080ff]">
                                    {ship.shields}/{ship.maxShields}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#888]">
                                    {t("game_end.crew_label")}
                                </span>
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
                                <span className="text-[#888]">
                                    {t("game_end.modules_label")}
                                </span>
                                <span className="text-[#00ff41]">
                                    {activeModules}/{ship.modules.length}
                                </span>
                            </div>
                        </div>
                    </div>

                    {!isVictory && crew.length === 0 && (
                        <div className="bg-[rgba(255,0,64,0.1)] border border-[#ff0040] p-4">
                            <div className="text-[#ff0040] font-bold text-lg mb-2">
                                ☠️ {t("game_end.crew_lost")}:
                            </div>
                            <div className="text-[#888] text-sm">
                                {t("game_end.crew_lost_desc")}
                            </div>
                        </div>
                    )}

                    {isVictory && (
                        <div className="bg-[rgba(0,212,255,0.05)] border border-[#00d4ff] p-4">
                            <div className="text-[#00d4ff] font-bold text-lg mb-3">
                                👥 {t("ship.crew")}:
                            </div>
                            <div className="space-y-1 text-sm">
                                {crew.map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex justify-between"
                                    >
                                        <span className="text-[#888]">
                                            {member.name} (
                                            {t(
                                                `professions.${member.profession}`,
                                            )}
                                            )
                                        </span>
                                        <span className="text-[#00ff41]">
                                            {t("crew_member.level_short")}
                                            {member.level}
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
                            className="text-(--border-color)  cursor-pointer w-full bg-transparent border-2 hover:bg-(--border-color) hover:text-[#050810] uppercase tracking-wider text-lg py-6"
                            style={{
                                borderColor: theme.border,
                                ["--border-color" as string]: theme.border,
                            }}
                        >
                            🔄 {t("game_end.restart")}
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
                                🚀 {t("game_end.continue_exploration")}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
