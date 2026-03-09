"use client";

import { getTotalEvasion } from "@/game/slices";
import { useGameStore } from "@/game/store";
import { useFuelEfficiency } from "./ship/useFuelEfficiency";
import { useTranslation } from "@/lib/useTranslation";
import {
    BASE_CRIT_CHANCE,
    BASE_CRIT_MULTIPLIER,
    BASE_ACCURACY,
} from "../constants";

export function ShipStats() {
    const ship = useGameStore((s) => s.ship);
    const crew = useGameStore((s) => s.crew);
    const artifacts = useGameStore((s) => s.artifacts);
    const getTotalPower = useGameStore((s) => s.getTotalPower);
    const getTotalConsumption = useGameStore((s) => s.getTotalConsumption);
    const getTotalDamage = useGameStore((s) => s.getTotalDamage);
    const getCrewCapacity = useGameStore((s) => s.getCrewCapacity);
    const getEffectiveScanRange = useGameStore((s) => s.getEffectiveScanRange);
    const captain = useGameStore((s) =>
        s.crew.find((c) => c.profession === "pilot"),
    );

    const { t } = useTranslation();

    const { efficiencyPercent } = useFuelEfficiency();

    const scanRange = getEffectiveScanRange();

    const totalPower = getTotalPower();
    const engineerBoost = crew.find((c) => c.assignment === "power") ? 5 : 0;
    const totalConsumption = getTotalConsumption();
    const available = totalPower + engineerBoost - totalConsumption;
    const damage = getTotalDamage();
    const crewCapacity = getCrewCapacity();

    // Calculate hull stats
    const maxHull = ship.modules.reduce(
        (s, m) => s + (m.maxHealth || m.health),
        0,
    );
    const currentHull = ship.modules.reduce((s, m) => s + m.health, 0);
    // Use ship.armor which includes Crystal Armor artifact bonus
    const totalDefense = ship.armor || 0;

    // Get engine level from modules
    const engines = ship.modules.filter(
        (m) =>
            m.type === "engine" &&
            !m.disabled &&
            !m.manualDisabled &&
            m.health > 0,
    );
    const engineLevel =
        engines.length > 0 ? Math.max(...engines.map((e) => e.level || 1)) : 1;

    // Calculate total evasion chance (outside combat)
    const evasionChance = getTotalEvasion(useGameStore.getState());

    // ═══════════════════════════════════════════════════════════════
    // COMBAT STATS CALCULATION
    // ═══════════════════════════════════════════════════════════════

    // Calculate total crit chance (base + artifacts)
    let totalCritChance = BASE_CRIT_CHANCE;
    const criticalMatrix = artifacts.find(
        (a) => a.effect.type === "crit_chance" && a.effect.active,
    );
    if (criticalMatrix) {
        const critChanceBonus = criticalMatrix.effect.value || 0;
        totalCritChance += critChanceBonus;
    }

    // Calculate crit damage multiplier (base + artifacts)
    let totalCritDamage = BASE_CRIT_MULTIPLIER;
    const overloadMatrix = artifacts.find(
        (a) => a.effect.type === "crit_damage_boost" && a.effect.active,
    );
    if (overloadMatrix) {
        const critDamageBonus = overloadMatrix.effect.value || 0;
        totalCritDamage += critDamageBonus;
    }

    // Calculate base accuracy (average across all weapon types)
    const baseAccuracy =
        (BASE_ACCURACY.laser + BASE_ACCURACY.kinetic + BASE_ACCURACY.missile) /
        3;

    // Calculate accuracy modifier from artifacts
    let accuracyModifier = 0;
    const targetingCore = artifacts.find(
        (a) => a.effect.type === "accuracy_boost" && a.effect.active,
    );
    if (targetingCore) {
        accuracyModifier += targetingCore.effect.value || 0;
    }

    // Crew assignment modifiers
    const hasGunner = crew.some(
        (c) => c.combatAssignment === "targeting" || c.profession === "gunner",
    );
    const hasTargeting = crew.some((c) => c.combatAssignment === "targeting");
    const hasMaintenance = crew.some((c) => c.assignment === "maintenance");
    const hasCalibration = crew.some(
        (c) => c.combatAssignment === "calibration",
    );
    const hasEngineer = crew.some((c) => c.profession === "engineer");

    if (!hasGunner) {
        accuracyModifier -= 0.2;
    } else {
        const gunner = crew.find((c) => c.profession === "gunner");
        if (gunner) {
            const gunnerLevel = gunner.level || 1;
            const gunnerAccuracyBonus = Math.min(0.2, gunnerLevel * 0.02);
            accuracyModifier += gunnerAccuracyBonus;
        }
    }

    if (hasTargeting) accuracyModifier += 0.05;
    if (hasMaintenance) accuracyModifier += 0.05;
    if (hasCalibration && hasEngineer) accuracyModifier += 0.1;

    // AI Core module bonus
    const aiCoreModules = ship.modules.filter(
        (m) => m.type === "ai_core" && !m.disabled && m.health > 0,
    ).length;
    if (aiCoreModules > 0) {
        accuracyModifier += aiCoreModules * 0.05;
    }

    // Crew trait modifiers
    crew.forEach((c) => {
        c.traits?.forEach((trait) => {
            if (trait.effect?.accuracyPenalty) {
                accuracyModifier -= Number(trait.effect.accuracyPenalty);
            }
        });
    });

    // Final accuracy (clamped)
    const finalAccuracy = Math.max(
        0.5,
        Math.min(1.0, baseAccuracy + accuracyModifier),
    );

    // ═══════════════════════════════════════════════════════════════
    // REFLECT CHANCE (Mirror Shield)
    // ═══════════════════════════════════════════════════════════════
    const mirrorShield = artifacts.find(
        (a) => a.effect.type === "damage_reflect" && a.effect.active,
    );
    const reflectChance = mirrorShield
        ? (mirrorShield.effect.value || 0) * 100
        : 0;

    // ═══════════════════════════════════════════════════════════════
    // SHIELD REGENERATION PER TURN
    // ═══════════════════════════════════════════════════════════════
    // Base regen: 5-10 (random), we show average (7.5)
    const BASE_SHIELD_REGEN = 7.5;
    let shieldRegen = BASE_SHIELD_REGEN;

    // Race bonuses (Xenosymbiont +2)
    crew.forEach((c) => {
        if (c.race === "xenosymbiont") {
            shieldRegen += 2;
        }
    });

    // Nanite Hull artifact: +10
    const naniteHull = artifacts.find(
        (a) => a.effect.type === "nanite_repair" && a.effect.active,
    );
    if (naniteHull) {
        shieldRegen += naniteHull.effect.value ?? 10;
    }

    // Shield Regenerator artifact: +50% multiplier
    const shieldRegenerator = artifacts.find(
        (a) => a.effect.type === "shield_regen_boost" && a.effect.active,
    );
    if (shieldRegenerator) {
        const regenBoost = shieldRegenerator.effect.value ?? 0;
        shieldRegen = Math.floor(shieldRegen * (1 + regenBoost));
    }

    return (
        <div className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-4 mt-2.5">
            {/* Новые параметры в верхней части */}
            <div className="flex justify-between mb-2 text-sm">
                <span className="text-[#ffb000]">{t("ship_stats.fuel")}:</span>
                <span className="text-[#9933ff]">
                    {ship.fuel || 0}/{ship.maxFuel || 0}
                </span>
            </div>
            {efficiencyPercent >= 0 && (
                <div className="flex justify-between mb-2 text-sm">
                    <span className="text-[#ffb000]">
                        {t("ship_stats.fuel_efficiency")}:
                    </span>
                    <span className="text-[#00ff41]">{efficiencyPercent}%</span>
                </div>
            )}
            <div className="flex justify-between mb-2 text-sm">
                <span className="text-[#ffb000]">
                    {t("ship_stats.engine")}:
                </span>
                <span className="text-[#00ff41]">
                    {t("ship_stats.level")}
                    {engineLevel}
                </span>
            </div>
            <div className="flex justify-between mb-2 text-sm">
                <span className="text-[#ffb000]">
                    {t("ship_stats.captain")}:
                </span>
                <span className="text-[#00ff41]">
                    {t("ship_stats.level")}
                    {captain?.level ?? 1}
                </span>
            </div>
            <div className="flex justify-between mb-2 text-sm">
                <span className="text-[#ffb000]">
                    {t("ship_stats.crew_count")}:
                </span>
                <span
                    className={
                        crew.length <= crewCapacity
                            ? "text-[#00ff41]"
                            : "text-[#ff0040]"
                    }
                >
                    {crew.length}/{crewCapacity}
                </span>
            </div>
            <div className="flex justify-between mb-2 text-sm">
                <span className="text-[#ffb000]">
                    {t("ship_stats.scan_range")}:
                </span>
                <span className="text-[#00ff41]">
                    {scanRange > 0 ? `${scanRange}` : "—"}
                </span>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-[#00ff41]">
                <div className="flex justify-between mb-2 text-sm">
                    <span className="text-[#ffb000]">
                        {t("ship_stats.power_generation")}:
                    </span>
                    <span className="text-[#00ff41]">
                        {totalPower + engineerBoost}
                        {engineerBoost > 0 ? ` (+${engineerBoost})` : ""}
                    </span>
                </div>
                <div className="flex justify-between mb-2 text-sm">
                    <span className="text-[#ffb000]">
                        {t("ship_stats.power_consumption")}:
                    </span>
                    <span
                        className={
                            available >= 0 ? "text-[#00ff41]" : "text-[#ff0040]"
                        }
                    >
                        {totalConsumption}
                    </span>
                </div>
                <div className="flex justify-between mb-2 text-sm font-bold">
                    <span className="text-[#ffb000]">
                        {t("ship_stats.power_available")}:
                    </span>
                    <span
                        className={
                            available >= 0 ? "text-[#00ff41]" : "text-[#ff0040]"
                        }
                    >
                        {available}
                    </span>
                </div>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-[#00ff41]">
                <div className="flex justify-between mb-2 text-sm">
                    <span className="text-[#ffb000]">
                        {t("ship_stats.damage")}:
                    </span>
                    <span className="text-[#00ff41]">{damage.total}</span>
                </div>
                {damage.kinetic > 0 && (
                    <div className="flex justify-between text-sm text-[#888]">
                        <span>{t("ship_stats.kinetic")}</span>
                        <span>{damage.kinetic}</span>
                    </div>
                )}
                {damage.laser > 0 && (
                    <div className="flex justify-between text-sm text-[#f00]">
                        <span>{t("ship_stats.laser")}</span>
                        <span>{damage.laser}</span>
                    </div>
                )}
                {damage.missile > 0 && (
                    <div className="flex justify-between text-sm text-[#fa0]">
                        <span>{t("ship_stats.missile")}</span>
                        <span>{damage.missile}</span>
                    </div>
                )}
            </div>
            <div className="flex justify-between mb-2 text-sm">
                <span className="text-[#ffb000]">{t("ship_stats.hull")}:</span>
                <span className="text-[#00ff41]">
                    {currentHull}/{maxHull}
                </span>
            </div>
            <div className="flex justify-between mb-2 text-sm">
                <span className="text-[#ffb000]">
                    {t("ship_stats.shields")}:
                </span>
                <span className="text-[#00d4ff]">
                    {ship.shields}/{ship.maxShields}
                </span>
            </div>
            <div className="flex justify-between mb-2 text-sm">
                <span className="text-[#ffb000]">
                    {t("ship_stats.defense")}:
                </span>
                <span className="text-[#00ff41]">
                    {totalDefense} {t("ship_stats.units")}
                </span>
            </div>
            <div className="flex justify-between mb-2 text-sm">
                <span className="text-[#ffb000]">
                    {t("ship_stats.evasion")}:
                </span>
                <span className="text-[#00ff41]">{evasionChance}%</span>
            </div>

            {/* Shield reflect chance (Mirror Shield artifact) */}
            {reflectChance > 0 && (
                <div className="flex justify-between mb-2 text-sm">
                    <span className="text-[#ffb000]">
                        {t("ship_stats.reflection")}:
                    </span>
                    <span className="text-[#00d4ff]">
                        {Math.round(reflectChance)}%
                    </span>
                </div>
            )}

            {/* Shield regeneration per turn */}
            <div className="flex justify-between mb-2 text-sm">
                <span className="text-[#ffb000]">
                    {t("ship_stats.shield_regen")}:
                </span>
                <span
                    className={
                        shieldRegen >= 15
                            ? "text-[#00ff41]"
                            : shieldRegen >= 10
                              ? "text-[#ffb000]"
                              : "text-[#888]"
                    }
                >
                    ~{Math.round(shieldRegen)} {t("ship_stats.per_turn")}
                    {shieldRegenerator && (
                        <span className="text-[#00ff41] text-xs">
                            {" "}
                            (+
                            {Math.round(
                                (shieldRegenerator.effect.value ?? 0) * 100,
                            )}
                            %)
                        </span>
                    )}
                </span>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                COMBAT STATS - Critical hit chance, crit damage, accuracy
                ═══════════════════════════════════════════════════════════════ */}
            <div className="mt-2.5 pt-2.5 border-t border-[#00ff41]">
                <div className="text-xs text-[#ffb000] mb-2 font-bold">
                    {t("ship_stats.combat_stats")}
                </div>
                <div className="flex justify-between mb-2 text-sm">
                    <span className="text-[#ffb000]">
                        {t("ship_stats.crit_chance")}:
                    </span>
                    <span className="text-[#ff6600]">
                        {Math.round(totalCritChance * 100)}%
                        {totalCritChance > BASE_CRIT_CHANCE && (
                            <span className="text-[#00ff41] text-xs">
                                {" "}
                                (+
                                {Math.round(
                                    (totalCritChance - BASE_CRIT_CHANCE) * 100,
                                )}
                                %)
                            </span>
                        )}
                    </span>
                </div>
                <div className="flex justify-between mb-2 text-sm">
                    <span className="text-[#ffb000]">
                        {t("ship_stats.crit_damage")}:
                    </span>
                    <span className="text-[#ff0040]">
                        x{totalCritDamage.toFixed(1)}
                        {totalCritDamage > BASE_CRIT_MULTIPLIER && (
                            <span className="text-[#00ff41] text-xs">
                                {" "}
                                (+
                                {Math.round(
                                    (totalCritDamage - BASE_CRIT_MULTIPLIER) *
                                        100,
                                )}
                                %)
                            </span>
                        )}
                    </span>
                </div>
                <div className="flex justify-between mb-2 text-sm">
                    <span className="text-[#ffb000]">
                        {t("ship_stats.accuracy")}:
                    </span>
                    <span
                        className={
                            finalAccuracy >= 0.9
                                ? "text-[#00ff41]"
                                : finalAccuracy >= 0.7
                                  ? "text-[#ffb000]"
                                  : "text-[#ff0040]"
                        }
                    >
                        {Math.round(finalAccuracy * 100)}%
                        {accuracyModifier !== 0 && (
                            <span
                                className={
                                    accuracyModifier > 0
                                        ? "text-[#00ff41] text-xs"
                                        : "text-[#ff0040] text-xs"
                                }
                            >
                                {" "}
                                ({accuracyModifier > 0 ? "+" : ""}
                                {Math.round(accuracyModifier * 100)}%)
                            </span>
                        )}
                    </span>
                </div>
            </div>

            <div className="flex justify-between text-sm">
                <span className="text-[#ffb000]">
                    {t("ship_stats.oxygen")}:
                </span>
                <span
                    className={
                        crew.length <= ship.crewCapacity
                            ? "text-[#00ff41]"
                            : "text-[#ff0040]"
                    }
                >
                    {crew.length}/{ship.crewCapacity}
                </span>
            </div>
        </div>
    );
}
