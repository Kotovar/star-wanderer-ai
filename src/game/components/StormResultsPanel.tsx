"use client";

import { useGameStore } from "../store";
import { Button } from "@/components/ui/button";

export function StormResultsPanel() {
    const stormResult = useGameStore((s) => s.stormResult);
    const showSectorMap = useGameStore((s) => s.showSectorMap);

    if (!stormResult) return null;

    const handleContinue = () => {
        useGameStore.setState({ stormResult: null });
        showSectorMap();
    };

    const stormIcons: Record<string, string> = {
        radiation: "☢️",
        ionic: "⚡",
        plasma: "🔥",
    };

    const stormColors: Record<string, string> = {
        radiation: "#ffaa00",
        ionic: "#00d4ff",
        plasma: "#ff4444",
    };

    const icon = stormIcons[stormResult.stormType] || "🌪️";
    const color = stormColors[stormResult.stormType] || "#ff4444";

    return (
        <div
            className="bg-[rgba(0,255,65,0.1)] border-2 p-6 max-w-lg mx-auto"
            style={{ borderColor: color }}
        >
            <div className="text-center mb-6">
                <div className="text-4xl mb-2">{icon}</div>
                <h2
                    className="text-2xl font-bold font-['Orbitron']"
                    style={{ color }}
                >
                    ШТОРМ ПРЕОДОЛЁН
                </h2>
                <div className="text-[#ffb000] mt-1">
                    {stormResult.stormName} (Интенсивность:{" "}
                    {stormResult.intensity})
                </div>
            </div>

            <div className="space-y-4">
                {/* Rewards */}
                <div className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-4">
                    <div className="text-[#ffb000] font-bold mb-2">
                        💰 Награды:
                    </div>
                    <div className="text-[#00ff41] text-lg">
                        +{stormResult.creditsEarned}₢ кредитов
                    </div>
                    {stormResult.rareLoot && stormResult.rareBonus && (
                        <div className="text-[#ff00ff] mt-2 text-sm">
                            (включая ★ РЕДКАЯ НАХОДКА: +{stormResult.rareBonus}
                            ₢)
                        </div>
                    )}
                </div>

                {/* Damage */}
                <div className="bg-[rgba(255,0,64,0.1)] border border-[#ff0040] p-4">
                    <div className="text-[#ff0040] font-bold mb-2">
                        🔧 Повреждения:
                    </div>
                    {stormResult.shieldDamage > 0 && (
                        <div className="text-[#ffaa00] mb-2">
                            🛡 Щиты: -{stormResult.shieldDamage}
                        </div>
                    )}
                    {stormResult.moduleDamage.length > 0 && (
                        <div className="text-[#ffaa00] mb-2">
                            Модули: -{stormResult.moduleDamagePercent}% x
                            {stormResult.numModulesDamaged}
                            <div className="text-xs mt-1">
                                {stormResult.moduleDamage
                                    .map((m) => `${m.name}: -${m.damage}%`)
                                    .join(" | ")}
                            </div>
                        </div>
                    )}
                    {stormResult.crewDamage > 0 && (
                        <div className="text-[#ff6464]">
                            ❤ Экипаж: -{stormResult.crewDamage} здоровья
                        </div>
                    )}
                    {stormResult.shieldDamage === 0 &&
                        stormResult.moduleDamage.length === 0 &&
                        stormResult.crewDamage === 0 && (
                            <div className="text-[#00ff41]">
                                ✨ Шторм пройден без повреждений!
                            </div>
                        )}
                </div>
            </div>

            <div className="mt-6 flex justify-center">
                <Button
                    onClick={handleContinue}
                    className="bg-[#00ff41] text-[#050810] hover:bg-[#00cc33] font-bold px-8 cursor-pointer"
                >
                    ПРОДОЛЖИТЬ
                </Button>
            </div>
        </div>
    );
}
