"use client";

import { useGameStore } from "../store";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";
import { getLocationName } from "@/lib/translationHelpers";

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
    const getEffectiveScanRange = useGameStore((s) => s.getEffectiveScanRange);
    const mineAsteroid = useGameStore((s) => s.mineAsteroid);
    const showSectorMap = useGameStore((s) => s.showSectorMap);
    const log = useGameStore((s) => s.log);
    const { t } = useTranslation();

    if (!currentLocation || currentLocation.type !== "asteroid_belt")
        return null;

    const drillLevel = getDrillLevel();
    const scanRange = getEffectiveScanRange();
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
    const locationName = getLocationName(currentLocation.name, t);

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
                        ⛏️ {locationName}
                    </h2>
                    <span className="text-sm text-[#00ff41]">
                        {t("asteroid_belt.developed")}
                    </span>
                </div>

                <div className="bg-[rgba(0,0,0,0.4)] p-3 mb-4 border border-[#00ff41]">
                    <p className="text-[#ffb000] mb-3 font-bold">
                        {t("asteroid_belt.mining_results")}:
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
                    className="cursor-pointer w-full bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] font-bold"
                >
                    {t("asteroid_belt.leave")}
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
                    ⛏️ {locationName}
                </h2>
                <span
                    className={`text-sm ${isAncient ? "text-[#ffb000]" : "text-[#ffb000]"}`}
                >
                    {isAncient ? t("asteroid_belt.rare") : ""}{" "}
                    {t("asteroid_belt.tier")}: {asteroidTier}
                </span>
            </div>

            {isAncient && (
                <div className="bg-[rgba(255,170,0,0.1)] p-3 mb-4 border border-[#ffb000]">
                    <p className="text-[#ffb000] font-bold">
                        ⚠ {t("asteroid_belt.ancient_title")}
                    </p>
                    <p className="text-[#888] text-sm mt-1">
                        {t("asteroid_belt.ancient_required")}
                    </p>
                </div>
            )}

            <div className="bg-[rgba(0,0,0,0.3)] p-3 mb-4 border border-[#cd853f]">
                <p className="text-[#ffb000] mb-2">
                    {t("asteroid_belt.description")}
                </p>
                {scanRange >= 5 ? (
                    <>
                        <p className="text-[#00ff41]">
                            {t("asteroid_belt.detected_resources")}
                        </p>
                        <ul className="text-sm ml-4 mt-1">
                            <li>
                                📦 {t("asteroid_belt.minerals")}: ~
                                {resources.minerals}
                            </li>
                            <li>
                                💎 {t("asteroid_belt.rare_minerals")}: ~
                                {resources.rare}
                            </li>
                            <li>
                                ₢ {t("asteroid_belt.valuable_samples")}: ~
                                {resources.credits}₢
                            </li>
                        </ul>
                    </>
                ) : (
                    <>
                        <p className="text-[#888]">
                            {t("asteroid_belt.detected_resources")}
                        </p>
                        <ul className="text-sm ml-4 mt-1 text-[#888]">
                            <li>📦 {t("asteroid_belt.minerals")}: ???</li>
                            <li>💎 {t("asteroid_belt.rare_minerals")}: ???</li>
                            <li>
                                ₢ {t("asteroid_belt.valuable_samples")}: ???
                            </li>
                        </ul>
                        <p className="text-[#ffb000] text-xs mt-2">
                            ⚠ {t("asteroid_belt.scan_required")}
                        </p>
                    </>
                )}
            </div>

            <div className="bg-[rgba(0,0,0,0.3)] p-3 mb-4 border border-[#00ff41]">
                <div className="flex justify-between">
                    <span className="text-[#ffb000]">
                        {t("asteroid_belt.your_drill")}
                    </span>
                    <span
                        className={
                            bonusPercent >= 0
                                ? "text-[#00ff41]"
                                : "text-[#ff0040]"
                        }
                    >
                        {t("asteroid_belt.level")} {drillLevel}{" "}
                        {bonusPercent >= 0
                            ? "✓"
                            : `(${t("asteroid_belt.required")} ${asteroidTier})`}
                    </span>
                </div>
                {bonusPercent > 0 && (
                    <p className="text-[#00ff41] text-sm mt-1">
                        {t("asteroid_belt.bonus")}: +{bonusPercent}%
                    </p>
                )}
            </div>

            {canMine ? (
                <div className="flex gap-4">
                    <Button
                        onClick={mineAsteroid}
                        className={`cursor-pointer flex-1 font-bold ${isAncient ? "bg-[#ffb000] hover:bg-[#ffc000] text-black" : "bg-[#cd853f] hover:bg-[#daa520] text-black"}`}
                    >
                        ⛏️ {t("asteroid_belt.start_mining")}
                    </Button>
                    <Button
                        onClick={showSectorMap}
                        className="cursor-pointer bg-transparent border-2 border-[#666] text-[#888] hover:bg-[rgba(100,100,100,0.2)]"
                    >
                        {t("asteroid_belt.leave")}
                    </Button>
                </div>
            ) : (
                <div className="text-center">
                    <p className="text-[#ff0040] mb-4">
                        ⚠ {t("asteroid_belt.drill_required")} {asteroidTier}!
                    </p>
                    <Button
                        onClick={showSectorMap}
                        className="cursor-pointer bg-transparent border-2 border-[#666] text-[#888] hover:bg-[rgba(100,100,100,0.2)]"
                    >
                        {t("asteroid_belt.leave")}
                    </Button>
                </div>
            )}
        </div>
    );
}
