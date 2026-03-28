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

/** Animated SVG asteroid field */
function AsteroidFieldVisual({ tier, mined }: { tier: number; mined: boolean }) {
    const isAncient = tier === 4;
    const color = isAncient ? "#ffb000" : "#cd853f";
    const glowColor = isAncient ? "rgba(255,176,0,0.35)" : "rgba(205,133,63,0.25)";

    // Deterministic asteroid positions based on tier
    const asteroids = [
        { cx: 38, cy: 52, r: 9,  a: "rotate(-15 38 52)",  dur: "22s" },
        { cx: 78, cy: 28, r: 6,  a: "rotate(10 78 28)",   dur: "18s" },
        { cx: 120, cy: 45, r: 11, a: "rotate(25 120 45)",  dur: "26s" },
        { cx: 160, cy: 22, r: 5,  a: "rotate(-30 160 22)", dur: "15s" },
        { cx: 195, cy: 55, r: 8,  a: "rotate(5 195 55)",   dur: "20s" },
        { cx: 55, cy: 78, r: 4,  a: "rotate(40 55 78)",   dur: "13s" },
        { cx: 100, cy: 72, r: 7,  a: "rotate(-20 100 72)", dur: "24s" },
        { cx: 145, cy: 68, r: 5,  a: "rotate(15 145 68)",  dur: "17s" },
        { cx: 225, cy: 38, r: 10, a: "rotate(-10 225 38)", dur: "28s" },
        { cx: 250, cy: 65, r: 6,  a: "rotate(35 250 65)",  dur: "19s" },
        // Small debris
        { cx: 30, cy: 35, r: 2.5, a: "", dur: "10s" },
        { cx: 90, cy: 50, r: 2,   a: "", dur: "12s" },
        { cx: 175, cy: 40, r: 3,  a: "", dur: "11s" },
        { cx: 210, cy: 70, r: 2,  a: "", dur: "14s" },
    ];

    return (
        <div className="relative w-full overflow-hidden" style={{ height: 96 }}>
            {/* Background gradient */}
            <div
                className="absolute inset-0"
                style={{
                    background: isAncient
                        ? "linear-gradient(135deg, #130d00 0%, #1f1200 50%, #100800 100%)"
                        : "linear-gradient(135deg, #0e0a06 0%, #180f08 50%, #0e0a06 100%)",
                }}
            />

            <svg
                viewBox="0 0 280 90"
                className="absolute inset-0 w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <radialGradient id={`ag-${tier}`} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor={glowColor} />
                        <stop offset="100%" stopColor="transparent" />
                    </radialGradient>
                </defs>

                {/* Nebula glow behind asteroids */}
                <ellipse cx="140" cy="45" rx="130" ry="40" fill={`url(#ag-${tier})`} />

                {/* Star field */}
                {[15, 35, 65, 90, 115, 140, 180, 215, 245, 270].map((x, i) => (
                    <circle
                        key={i}
                        cx={x}
                        cy={[10, 25, 8, 18, 5, 20, 12, 7, 22, 14][i]}
                        r={[0.8, 0.6, 1, 0.7, 0.9, 0.6, 1.1, 0.8, 0.7, 0.9][i]}
                        fill="white"
                        opacity="0.5"
                    />
                ))}

                {/* Asteroids */}
                {asteroids.map((a, i) => (
                    <g key={i} opacity={mined ? 0.25 : 1}>
                        <animateTransform
                            attributeName="transform"
                            attributeType="XML"
                            type="rotate"
                            from={`0 ${a.cx} ${a.cy}`}
                            to={`360 ${a.cx} ${a.cy}`}
                            dur={a.dur}
                            repeatCount="indefinite"
                        />
                        <ellipse
                            cx={a.cx}
                            cy={a.cy}
                            rx={a.r}
                            ry={a.r * 0.7}
                            transform={a.a}
                            fill={color}
                            opacity={isAncient ? 0.85 : 0.7}
                        />
                        {/* Highlight */}
                        <ellipse
                            cx={a.cx - a.r * 0.25}
                            cy={a.cy - a.r * 0.25}
                            rx={a.r * 0.3}
                            ry={a.r * 0.2}
                            fill="white"
                            opacity="0.25"
                        />
                        {/* Shadow */}
                        <ellipse
                            cx={a.cx + a.r * 0.2}
                            cy={a.cy + a.r * 0.2}
                            rx={a.r * 0.4}
                            ry={a.r * 0.3}
                            fill="black"
                            opacity="0.35"
                        />
                    </g>
                ))}

                {/* Ancient sparkle dots */}
                {isAncient && [
                    { x: 50, y: 60 }, { x: 130, y: 20 }, { x: 200, y: 55 }, { x: 260, y: 30 },
                ].map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="1.5" fill="#ffdd88" opacity="0.7">
                        <animate attributeName="opacity" values="0.2;1;0.2" dur={`${2 + i * 0.7}s`} repeatCount="indefinite" />
                    </circle>
                ))}

                {/* "Mined out" X overlay */}
                {mined && (
                    <>
                        <line x1="60" y1="20" x2="220" y2="70" stroke="#ff4444" strokeWidth="1.5" opacity="0.4" strokeDasharray="6 4" />
                        <line x1="220" y1="20" x2="60" y2="70" stroke="#ff4444" strokeWidth="1.5" opacity="0.4" strokeDasharray="6 4" />
                    </>
                )}
            </svg>

            {/* Tier badge */}
            <div
                className="absolute top-2 right-2 px-2 py-0.5 text-xs font-bold font-['Orbitron']"
                style={{
                    background: isAncient ? "rgba(255,176,0,0.2)" : "rgba(139,69,19,0.3)",
                    border: `1px solid ${color}`,
                    color,
                }}
            >
                {isAncient ? "★ " : ""}TIR {tier}
            </div>
        </div>
    );
}

/** Drill compatibility indicator */
function DrillBar({ drillLevel, asteroidTier }: { drillLevel: number; asteroidTier: number }) {
    const { t } = useTranslation();
    const bonusPercent = getMiningBonus(drillLevel, asteroidTier);
    const canMine = bonusPercent >= 0;

    return (
        <div className="flex items-center gap-3">
            <div className="flex gap-1">
                {[1, 2, 3, 4].map((lvl) => (
                    <div
                        key={lvl}
                        className="w-5 h-5 flex items-center justify-center text-[10px] font-bold border"
                        style={{
                            background: lvl <= drillLevel
                                ? lvl <= asteroidTier ? "rgba(0,255,65,0.2)" : "rgba(0,212,255,0.2)"
                                : "rgba(0,0,0,0.3)",
                            borderColor: lvl <= drillLevel
                                ? lvl <= asteroidTier ? "#00ff41" : "#00d4ff"
                                : "#333",
                            color: lvl <= drillLevel
                                ? lvl <= asteroidTier ? "#00ff41" : "#00d4ff"
                                : "#444",
                        }}
                    >
                        {lvl}
                    </div>
                ))}
            </div>
            <span
                className="text-xs font-bold"
                style={{ color: canMine ? "#00ff41" : "#ff4444" }}
            >
                {canMine
                    ? bonusPercent > 0
                        ? `+${bonusPercent}% ${t("asteroid_belt.bonus")}`
                        : "✓"
                    : `⚠ ${t("asteroid_belt.required")} ${asteroidTier}`}
            </span>
        </div>
    );
}

export function AsteroidBeltPanel() {
    const currentLocation = useGameStore((s) => s.currentLocation);
    const getDrillLevel = useGameStore((s) => s.getDrillLevel);
    const getEffectiveScanRange = useGameStore((s) => s.getEffectiveScanRange);
    const mineAsteroid = useGameStore((s) => s.mineAsteroid);
    const showSectorMap = useGameStore((s) => s.showSectorMap);
    const hasEngineer = useGameStore((s) =>
        s.crew.some((c) => c.profession === "engineer"),
    );
    const { t } = useTranslation();

    if (!currentLocation || currentLocation.type !== "asteroid_belt")
        return null;

    const drillLevel = getDrillLevel();
    const scanRange = getEffectiveScanRange();
    const asteroidTier = currentLocation.asteroidTier || 1;
    const resources = currentLocation.resources || { minerals: 0, rare: 0, credits: 0 };
    const bonusPercent = getMiningBonus(drillLevel, asteroidTier);
    const canMine = bonusPercent >= 0 && !currentLocation.mined && hasEngineer;
    const miningResult = currentLocation.miningResult;
    const isAncient = asteroidTier === 4;
    const locationName = getLocationName(currentLocation.name, t);

    const borderColor = isAncient ? "#ffb000" : "#cd853f";
    const titleColor = isAncient ? "#ffb000" : "#cd853f";

    // ── After mining ──────────────────────────────────────────────────────────
    if (currentLocation.mined) {
        return (
            <div
                className="flex flex-col gap-0 overflow-hidden rounded"
                style={{ border: `2px solid ${borderColor}`, background: "rgba(5,8,16,0.95)" }}
            >
                <AsteroidFieldVisual tier={asteroidTier} mined />

                <div className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold font-['Orbitron']" style={{ color: titleColor }}>
                            ⛏️ {locationName}
                        </h2>
                        <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(0,255,65,0.1)", border: "1px solid #00ff41", color: "#00ff41" }}>
                            {t("asteroid_belt.developed")}
                        </span>
                    </div>

                    {miningResult && (
                        <div className="rounded p-3" style={{ background: "rgba(0,255,65,0.04)", border: "1px solid #1a3320" }}>
                            <p className="text-[#ffb000] text-sm font-bold mb-2">
                                {t("asteroid_belt.mining_results")}:
                            </p>
                            <div className="grid grid-cols-2 gap-1.5 text-sm">
                                <div className="flex items-center gap-1.5 text-[#00ff41]">
                                    <span className="opacity-60">📦</span>
                                    <span>{t("asteroid_belt.minerals")}: <strong>+{miningResult.minerals}</strong></span>
                                </div>
                                {miningResult.rare > 0 && (
                                    <div className="flex items-center gap-1.5 text-[#00ff41]">
                                        <span className="opacity-60">💎</span>
                                        <span>{t("asteroid_belt.rare_minerals")}: <strong>+{miningResult.rare}</strong></span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5 text-[#ffb000]">
                                    <span className="opacity-60">₢</span>
                                    <span>{t("asteroid_belt.valuable_samples")}: <strong>+{miningResult.credits}₢</strong></span>
                                </div>
                                {miningResult.researchResources.map((label, i) => (
                                    <div key={i} className="flex items-center gap-1.5 text-[#00d4ff] col-span-2">
                                        <span>💎</span>
                                        <span>{label}</span>
                                    </div>
                                ))}
                            </div>
                            {miningResult.cargoWarning && (
                                <div className="mt-2 text-[#ffb000] text-xs">
                                    ⚠ {miningResult.cargoWarning}
                                </div>
                            )}
                        </div>
                    )}

                    <Button
                        onClick={showSectorMap}
                        className="cursor-pointer w-full bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] font-bold"
                    >
                        {t("asteroid_belt.leave")}
                    </Button>
                </div>
            </div>
        );
    }

    // ── Before mining ─────────────────────────────────────────────────────────
    return (
        <div
            className="flex flex-col gap-0 overflow-hidden rounded"
            style={{ border: `2px solid ${borderColor}`, background: "rgba(5,8,16,0.95)" }}
        >
            <AsteroidFieldVisual tier={asteroidTier} mined={false} />

            <div className="p-4 flex flex-col gap-3">
                {/* Title */}
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold font-['Orbitron']" style={{ color: titleColor }}>
                        ⛏️ {locationName}
                    </h2>
                    {isAncient && (
                        <span
                            className="text-xs px-2 py-0.5 font-bold"
                            style={{ background: "rgba(255,176,0,0.15)", border: "1px solid #ffb000", color: "#ffb000" }}
                        >
                            ★ {t("asteroid_belt.rare")}
                        </span>
                    )}
                </div>

                {/* Ancient warning */}
                {isAncient && (
                    <div className="rounded p-3" style={{ background: "rgba(255,176,0,0.07)", border: "1px solid #ffb000" }}>
                        <p className="text-[#ffb000] font-bold text-sm">⚠ {t("asteroid_belt.ancient_title")}</p>
                        <p className="text-[#888] text-xs mt-1">{t("asteroid_belt.ancient_required")}</p>
                    </div>
                )}

                {/* Resource scan */}
                <div className="rounded p-3" style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${borderColor}44` }}>
                    <p className="text-[#aaa] text-xs mb-2">{t("asteroid_belt.description")}</p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                        {[
                            { icon: "📦", label: t("asteroid_belt.minerals"),        val: resources.minerals, color: "#00ff41" },
                            { icon: "💎", label: t("asteroid_belt.rare_minerals"),   val: resources.rare,     color: "#00d4ff" },
                            { icon: "₢",  label: t("asteroid_belt.valuable_samples"),val: resources.credits,  color: "#ffb000" },
                        ].map(({ icon, label, val, color }) => (
                            <div key={label} className="flex flex-col items-center gap-0.5 p-2 rounded" style={{ background: "rgba(0,0,0,0.25)", border: "1px solid #1a1a1a" }}>
                                <span className="text-base">{icon}</span>
                                <span className="text-[10px] text-[#666] text-center leading-tight">{label}</span>
                                <span className="font-bold text-sm" style={{ color: scanRange >= 5 ? color : "#444" }}>
                                    {scanRange >= 5 ? `~${val}` : "???"}
                                </span>
                            </div>
                        ))}
                    </div>
                    {scanRange < 5 && (
                        <p className="text-[#ffb000] text-xs mt-2">
                            ⚠ {t("asteroid_belt.scan_required")}
                        </p>
                    )}
                </div>

                {/* Drill status */}
                <div className="rounded p-3" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid #1a2a1a" }}>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[#aaa] text-xs">{t("asteroid_belt.your_drill")}</span>
                        <span className="text-xs text-[#555]">{t("asteroid_belt.tier")}: {asteroidTier}</span>
                    </div>
                    <DrillBar drillLevel={drillLevel} asteroidTier={asteroidTier} />
                </div>

                {/* Actions */}
                {canMine ? (
                    <div className="flex gap-3">
                        <Button
                            onClick={mineAsteroid}
                            className="cursor-pointer flex-1 font-bold text-black"
                            style={{ background: isAncient ? "#ffb000" : "#cd853f" }}
                        >
                            ⛏️ {t("asteroid_belt.start_mining")}
                        </Button>
                        <Button
                            onClick={showSectorMap}
                            className="cursor-pointer bg-transparent border border-[#444] text-[#666] hover:border-[#888] hover:text-[#aaa] transition-colors"
                        >
                            {t("asteroid_belt.leave")}
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {bonusPercent < 0 && (
                            <p className="text-[#ff4444] text-sm text-center">
                                ⚠ {t("asteroid_belt.drill_required")} {asteroidTier}!
                            </p>
                        )}
                        {!hasEngineer && (
                            <p className="text-[#ff4444] text-sm text-center">
                                ⚠ {t("asteroid_belt.engineer_required")}
                            </p>
                        )}
                        <Button
                            onClick={showSectorMap}
                            className="cursor-pointer w-full bg-transparent border border-[#444] text-[#666] hover:border-[#888] hover:text-[#aaa]"
                        >
                            {t("asteroid_belt.leave")}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
