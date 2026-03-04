"use client";

import { useGameStore } from "../store";
import { Button } from "@/components/ui/button";

// Calculate mining bonus percentage
function getMiningBonus(drillLevel: number, asteroidTier: number): number {
    if (drillLevel < asteroidTier) return -1; // Can't mine
    if (drillLevel === asteroidTier) return 0; // No bonus

    // Ancient drill has special bonuses
    if (drillLevel === 4) {
        // Ancient drill: 70% for tier 1, 50% for tier 2, 30% for tier 3, 0% for tier 4
        const bonuses: Record<number, number> = { 1: 70, 2: 50, 3: 30, 4: 0 };
        return bonuses[asteroidTier] || 0;
    }

    // Regular drill: 20% per level above
    return (drillLevel - asteroidTier) * 20;
}

export function AsteroidBeltPanel() {
    const currentLocation = useGameStore((s) => s.currentLocation);
    const getDrillLevel = useGameStore((s) => s.getDrillLevel);
    const getScanLevel = useGameStore((s) => s.getScanLevel);
    const mineAsteroid = useGameStore((s) => s.mineAsteroid);
    const showSectorMap = useGameStore((s) => s.showSectorMap);
    const log = useGameStore((s) => s.log);

    if (!currentLocation || currentLocation.type !== "asteroid_belt")
        return null;

    const drillLevel = getDrillLevel();
    const scanLevel = getScanLevel();
    const asteroidTier = currentLocation.asteroidTier || 1;
    const resources = currentLocation.resources || {
        minerals: 0,
        rare: 0,
        credits: 0,
    };
    const bonusPercent = getMiningBonus(drillLevel, asteroidTier);
    const canMine = bonusPercent >= 0 && !currentLocation.mined;

    // Get recent mining-related log entries (only the most recent set)
    const recentMiningLogs = log
        .slice(0, 20)
        .filter(
            (entry) =>
                entry.message.includes("Минералы:") ||
                entry.message.includes("Редкие") ||
                entry.message.includes("Кредиты: +"),
        )
        .slice(0, 4); // Only show the most recent 4 entries (one set of results)

    // Check if this is a rare ancient belt
    const isAncient = asteroidTier === 4;

    // After mining - show results
    if (currentLocation.mined) {
        return (
            <div
                className={`border-2 p-4 ${isAncient ? "bg-[rgba(255,170,0,0.2)] border-[#ffb000]" : "bg-[rgba(139,69,19,0.2)] border-[#cd853f]"}`}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2
                        className={`text-xl font-bold font-['Orbitron'] ${isAncient ? "text-[#ffb000]" : "text-[#cd853f]"}`}
                    >
                        ⛏️ {currentLocation.name}
                    </h2>
                    <span className="text-sm text-[#00ff41]">✓ Разработан</span>
                </div>

                <div className="bg-[rgba(0,0,0,0.4)] p-3 mb-4 border border-[#00ff41]">
                    <p className="text-[#ffb000] mb-3 font-bold">
                        Результаты добычи:
                    </p>
                    <div className="space-y-1.5 text-sm">
                        {recentMiningLogs.map((entry, i) => (
                            <div
                                key={i}
                                className={`
                ${entry.type === "info" && entry.message.includes("+") ? "text-[#00ff41]" : ""}
                ${entry.type === "info" && !entry.message.includes("+") ? "text-[#888]" : ""}
              `}
                            >
                                {entry.message}
                            </div>
                        ))}
                    </div>
                </div>

                <Button
                    onClick={showSectorMap}
                    className="w-full bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] font-bold"
                >
                    ПОКИНУТЬ ПОЯС
                </Button>
            </div>
        );
    }

    // Before mining - show info
    return (
        <div
            className={`border-2 p-4 ${isAncient ? "bg-[rgba(255,170,0,0.2)] border-[#ffb000]" : "bg-[rgba(139,69,19,0.2)] border-[#cd853f]"}`}
        >
            <div className="flex justify-between items-center mb-4">
                <h2
                    className={`text-xl font-bold font-['Orbitron'] ${isAncient ? "text-[#ffb000]" : "text-[#cd853f]"}`}
                >
                    ⛏️ {currentLocation.name}
                </h2>
                <span
                    className={`text-sm ${isAncient ? "text-[#ffb000]" : "text-[#ffb000]"}`}
                >
                    {isAncient ? "★ Редкий" : ""} Уровень: {asteroidTier}
                </span>
            </div>

            {isAncient && (
                <div className="bg-[rgba(255,170,0,0.1)] p-3 mb-4 border border-[#ffb000]">
                    <p className="text-[#ffb000] font-bold">
                        ⚠ ДРЕВНИЙ ПОЯС АСТЕРОИДОВ
                    </p>
                    <p className="text-[#888] text-sm mt-1">
                        Требуется Древний бур
                    </p>
                </div>
            )}

            <div className="bg-[rgba(0,0,0,0.3)] p-3 mb-4 border border-[#cd853f]">
                <p className="text-[#ffb000] mb-2">
                    Плотное скопление астероидов с ценными ресурсами.
                </p>
                {scanLevel >= 2 ? (
                    <>
                        <p className="text-[#00ff41]">Обнаруженные ресурсы:</p>
                        <ul className="text-sm ml-4 mt-1">
                            <li>📦 Минералы: ~{resources.minerals}</li>
                            <li>💎 Редкие минералы: ~{resources.rare}</li>
                            <li>₢ Ценные образцы: ~{resources.credits}₢</li>
                        </ul>
                    </>
                ) : (
                    <>
                        <p className="text-[#888]">Обнаруженные ресурсы:</p>
                        <ul className="text-sm ml-4 mt-1 text-[#888]">
                            <li>📦 Минералы: ???</li>
                            <li>💎 Редкие минералы: ???</li>
                            <li>₢ Ценные образцы: ???</li>
                        </ul>
                        <p className="text-[#ffb000] text-xs mt-2">
                            ⚠ Требуется сканер уровня 2+ для точных данных
                        </p>
                    </>
                )}
            </div>

            <div className="bg-[rgba(0,0,0,0.3)] p-3 mb-4 border border-[#00ff41]">
                <div className="flex justify-between">
                    <span className="text-[#ffb000]">Ваш бур:</span>
                    <span
                        className={
                            bonusPercent >= 0
                                ? "text-[#00ff41]"
                                : "text-[#ff0040]"
                        }
                    >
                        Уровень {drillLevel}{" "}
                        {bonusPercent >= 0
                            ? "✓"
                            : `(требуется ${asteroidTier})`}
                    </span>
                </div>
                {bonusPercent > 0 && (
                    <p className="text-[#00ff41] text-sm mt-1">
                        Бонус к добыче: +{bonusPercent}%
                    </p>
                )}
            </div>

            {canMine ? (
                <div className="flex gap-4">
                    <Button
                        onClick={mineAsteroid}
                        className={`cursor-pointer flex-1 font-bold ${isAncient ? "bg-[#ffb000] hover:bg-[#ffc000] text-black" : "bg-[#cd853f] hover:bg-[#daa520] text-black"}`}
                    >
                        ⛏️ НАЧАТЬ ДОБЫЧУ
                    </Button>
                    <Button
                        onClick={showSectorMap}
                        className="cursor-pointer bg-transparent border-2 border-[#666] text-[#888] hover:bg-[rgba(100,100,100,0.2)]"
                    >
                        УЙТИ
                    </Button>
                </div>
            ) : (
                <div className="text-center">
                    <p className="text-[#ff0040] mb-4">
                        ⚠ Требуется буровой модуль уровня {asteroidTier}!
                    </p>
                    <Button
                        onClick={showSectorMap}
                        className="cursor-pointer bg-transparent border-2 border-[#666] text-[#888] hover:bg-[rgba(100,100,100,0.2)]"
                    >
                        УЙТИ
                    </Button>
                </div>
            )}
        </div>
    );
}
