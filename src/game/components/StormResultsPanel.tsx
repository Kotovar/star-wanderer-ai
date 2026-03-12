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
        plasma: "✦",
        gravitational: "🕳️",
        temporal: "⏳",
        nanite: "🦠",
    };

    const stormColors: Record<string, string> = {
        radiation: "#00ff00",
        ionic: "#00d4ff",
        plasma: "#ff4400",
        gravitational: "#9d00ff",
        temporal: "#ff00ff",
        nanite: "#ffaa00",
    };

    const icon = stormIcons[stormResult.stormType] || "🌪️";
    const color = stormColors[stormResult.stormType] || "#ff4444";

    return (
        <div
            className={`border-2 p-6 bg-[rgba(50,0,50,0.3)]`}
            style={{ borderColor: color }}
        >
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <span className="text-4xl">{icon}</span>
                    <div>
                        <h2
                            className="text-2xl font-bold font-['Orbitron']"
                            style={{ color }}
                        >
                            ШТОРМ ПРЕОДОЛЁН
                        </h2>
                        <div className="text-[#ffb000] text-sm">
                            {stormResult.stormName} (Интенсивность:{" "}
                            {stormResult.intensity})
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    {stormResult.specialResources &&
                        stormResult.specialResources.map((res, idx) => (
                            <div
                                key={idx}
                                className="text-[#00ffff] mt-1 text-sm"
                            >
                                {res.type === "quantum_crystals" &&
                                    `+${res.amount} Квантовых кристаллов`}
                                {res.type === "ancient_data" &&
                                    `+${res.amount} Древних данных`}
                            </div>
                        ))}
                </div>

                {/* Damage */}
                <div className="bg-[rgba(255,0,64,0.05)] border border-[#ff0040] p-4">
                    <div className="text-[#ff0040] font-bold mb-2">
                        🔧 Повреждения:
                    </div>
                    {stormResult.shieldDamage > 0 && (
                        <div className="text-[#ffaa00]">
                            🛡 Щиты: -{stormResult.shieldDamage}
                        </div>
                    )}
                    {stormResult.moduleDamage.length > 0 && (
                        <div className="text-[#ffaa00] mt-1">
                            <div>
                                Модули: -{stormResult.moduleDamagePercent}% x
                                {stormResult.numModulesDamaged}
                            </div>
                            <div className="text-xs mt-1 text-[#888]">
                                {stormResult.moduleDamage
                                    .map((m) => `${m.name}: -${m.damage}%`)
                                    .join(" | ")}
                            </div>
                        </div>
                    )}
                    {stormResult.crewDamage > 0 && (
                        <div className="text-[#ff6464] mt-1">
                            ❤ Экипаж: -{stormResult.crewDamage} здоровья
                        </div>
                    )}
                    {stormResult.shieldDamage === 0 &&
                        stormResult.moduleDamage.length === 0 &&
                        stormResult.crewDamage === 0 && (
                            <div className="text-[#00ff41]">
                                ✨ Без повреждений
                            </div>
                        )}
                </div>
            </div>

            <div className="mt-6 flex justify-center">
                <Button
                    onClick={handleContinue}
                    className="bg-[#00ff41] text-[#050810] hover:bg-[#00cc33] font-bold px-12 cursor-pointer"
                >
                    ПРОДОЛЖИТЬ
                </Button>
            </div>
        </div>
    );
}
