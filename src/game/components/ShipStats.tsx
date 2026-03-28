"use client";

import { useMemo } from "react";
import { getTotalEvasion } from "@/game/slices";
import { useGameStore } from "@/game/store";
import {
    findActiveArtifact,
    getArtifactEffectValue,
    getArtifactShieldRegen,
} from "@/game/artifacts/utils";
import { useTranslation } from "@/lib/useTranslation";
import {
    BASE_CRIT_CHANCE,
    BASE_CRIT_MULTIPLIER,
    BASE_ACCURACY,
    ARTIFACT_TYPES,
    COMBAT_DAMAGE_MODIFIERS,
} from "@/game/constants";
import { computeAccuracyModifier } from "@/game/slices/combat/helpers/playerDamage";
import type { GameState, WeaponType } from "@/game/types";
import { useFuelEfficiency } from "@/game/hooks";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";
import { getTechBonusSum } from "@/game/research";
import { getActiveModules } from "../modules";
import { RACES } from "@/game/constants/races";
import { AUGMENTATIONS } from "@/game/constants/augmentations";

function SectionHeader({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-2 mt-3 mb-1.5">
            <span className="text-[10px] text-[#ffb000] font-bold tracking-widest uppercase opacity-80">
                {label}
            </span>
            <div className="flex-1 h-px bg-[rgba(0,255,65,0.25)]" />
        </div>
    );
}

function StatBar({
    value,
    max,
    color,
}: {
    value: number;
    max: number;
    color: string;
}) {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    return (
        <div className="w-full h-1 bg-[rgba(255,255,255,0.08)] rounded-sm mb-1.5">
            <div
                className="h-1 rounded-sm transition-all"
                style={{ width: `${pct}%`, backgroundColor: color }}
            />
        </div>
    );
}

export function ShipStats() {
    const ship = useGameStore((s) => s.ship);
    const crew = useGameStore((s) => s.crew);
    const artifacts = useGameStore((s) => s.artifacts);
    const getTotalPower = useGameStore((s) => s.getTotalPower);
    const getTotalConsumption = useGameStore((s) => s.getTotalConsumption);
    const getTotalDamage = useGameStore((s) => s.getTotalDamage);
    const getCrewCapacity = useGameStore((s) => s.getCrewCapacity);
    const getOxygenCapacity = useGameStore((s) => s.getOxygenCapacity);
    const getEffectiveScanRange = useGameStore((s) => s.getEffectiveScanRange);
    const getCargoCapacity = useGameStore((s) => s.getCargoCapacity);
    const captain = useGameStore((s) =>
        s.crew.find((c) => c.profession === "pilot"),
    );
    const research = useGameStore((s) => s.research);

    const { t } = useTranslation();

    const { efficiencyPercent } = useFuelEfficiency();

    const scanRange = getEffectiveScanRange();
    const cargoCapacity = getCargoCapacity();
    const oxygenCapacity = getOxygenCapacity();
    const crewCapacity = getCrewCapacity();

    const currentCargo = useMemo(
        () =>
            ship.cargo.reduce((sum, c) => sum + c.quantity, 0) +
            ship.tradeGoods.reduce((sum, g) => sum + g.quantity, 0),
        [ship.cargo, ship.tradeGoods],
    );

    const shieldRegenerator = findActiveArtifact(
        artifacts,
        ARTIFACT_TYPES.SHIELD_REGENERATOR,
    );
    const darkShield = findActiveArtifact(artifacts, ARTIFACT_TYPES.DARK_SHIELD);

    const mergeBonus = useMemo(
        () => getMergeEffectsBonus(crew, ship.modules),
        [crew, ship],
    );

    const shieldRegen = useMemo(() => {
        const activeShieldModules = ship.modules.filter(
            (m) => m.type === "shield" && m.health > 0 && !m.disabled,
        );
        let regen = activeShieldModules.reduce(
            (sum, m) => sum + (m.shieldRegen ?? 4),
            0,
        );
        regen += ship.bonusShieldRegen ?? 0;
        if (darkShield) {
            regen += getArtifactShieldRegen(darkShield, useGameStore.getState());
        }
        if (regen > 0) {
            let raceMultiplier = 0;
            crew.forEach((c) => {
                const race = RACES[c.race];
                const shieldTrait = race?.specialTraits?.find(
                    (trait) => trait.effects.shieldRegen,
                );
                if (shieldTrait?.effects.shieldRegen) {
                    raceMultiplier +=
                        Number(shieldTrait.effects.shieldRegen) / 100;
                }
            });
            if (raceMultiplier > 0) {
                regen = Math.floor(regen * (1 + raceMultiplier));
            }
            if (shieldRegenerator) {
                const regenBoost = getArtifactEffectValue(
                    shieldRegenerator,
                    useGameStore.getState(),
                );
                regen = Math.floor(regen * (1 + regenBoost));
            }
            if (mergeBonus.shieldRegenBonus) {
                regen = Math.floor(
                    regen * (1 + mergeBonus.shieldRegenBonus / 100),
                );
            }
            const techRegenMultiplier = getTechBonusSum(research, "shield_regen");
            if (techRegenMultiplier > 0) {
                regen = Math.floor(regen * (1 + techRegenMultiplier));
            }
        }
        return regen;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ship, crew, artifacts, research, mergeBonus]);

    const researchRepair = getTechBonusSum(research, "nanite_repair");
    const moduleRepairPercent = useMemo(() => {
        const gs = useGameStore.getState();
        const naniteArtifact = findActiveArtifact(
            artifacts,
            ARTIFACT_TYPES.NANITE_HULL,
        );
        const autoRepairArtifact = findActiveArtifact(
            artifacts,
            ARTIFACT_TYPES.PARASITIC_NANITES,
        );
        const artifactRepair =
            (naniteArtifact ? getArtifactEffectValue(naniteArtifact, gs) : 0) +
            (autoRepairArtifact
                ? getArtifactEffectValue(autoRepairArtifact, gs)
                : 0);
        return researchRepair + artifactRepair;
    }, [artifacts, researchRepair]);

    const totalPower = getTotalPower();
    const totalConsumption = getTotalConsumption();
    const available = totalPower - totalConsumption;

    const { displayLaserDamage, displayDamageTotal, damage } = useMemo(() => {
        const dmg = getTotalDamage();
        const laserDamageBonus = crew.reduce((bonus, c) => {
            if (c.augmentation) {
                const augEffect = AUGMENTATIONS[c.augmentation]?.effect;
                if (augEffect?.laserDamageBonus)
                    return bonus + augEffect.laserDamageBonus;
            }
            return bonus;
        }, 0);
        const laserDisplay =
            laserDamageBonus > 0
                ? Math.floor(dmg.laser * (1 + laserDamageBonus))
                : dmg.laser;
        const hasGunnerInBay =
            crew.some(
                (c) =>
                    c.profession === "gunner" &&
                    ship.modules.some(
                        (m) => m.type === "weaponbay" && m.id === c.moduleId,
                    ),
            ) || crew.some((c) => c.combatAssignment === "targeting");
        const laserBonusDelta = laserDisplay - dmg.laser;
        const damageTotal = hasGunnerInBay
            ? Math.floor(
                  (dmg.total + laserBonusDelta) *
                      COMBAT_DAMAGE_MODIFIERS.GUNNER_BONUS,
              )
            : dmg.total + laserBonusDelta;
        return {
            damage: dmg,
            displayLaserDamage: laserDisplay,
            displayDamageTotal: damageTotal,
        };
    }, [crew, ship, getTotalDamage]);

    const oxygenRequiredCount = useMemo(
        () =>
            crew.filter((c) => RACES[c.race]?.requiresOxygen !== false).length,
        [crew],
    );

    const { maxHull, currentHull } = useMemo(
        () => ({
            maxHull: ship.modules.reduce(
                (s, m) => s + (m.maxHealth || m.health),
                0,
            ),
            currentHull: ship.modules.reduce((s, m) => s + m.health, 0),
        }),
        [ship],
    );

    const totalDefense = useMemo(() => {
        let crystallineDefense = 0;
        crew.filter((c) => c.race === "crystalline").forEach((c) => {
            const armorTrait = RACES[c.race]?.specialTraits?.find(
                (trait) => trait.id === "crystal_armor",
            );
            if (armorTrait?.effects.moduleDefense) {
                crystallineDefense += Number(armorTrait.effects.moduleDefense);
            }
        });
        return (ship.armor || 0) + Math.floor(crystallineDefense);
    }, [ship, crew]);

    const engines = getActiveModules(ship.modules, "engine");
    const engineLevel =
        engines.length > 0 ? Math.max(...engines.map((e) => e.level || 1)) : 1;

    const evasionChance = getTotalEvasion(useGameStore.getState());

    const { totalCritChance, totalCritDamage } = useMemo(() => {
        const gs = useGameStore.getState();
        let critChance = BASE_CRIT_CHANCE;
        const criticalMatrix = findActiveArtifact(
            artifacts,
            ARTIFACT_TYPES.CRITICAL_MATRIX,
        );
        if (criticalMatrix) {
            critChance += getArtifactEffectValue(criticalMatrix, gs);
        }
        const weaponBayIds = new Set(
            ship.modules
                .filter((m) => m.type === "weaponbay")
                .map((m) => m.id),
        );
        crew.forEach((c) => {
            if (c.profession === "gunner" && weaponBayIds.has(c.moduleId)) {
                c.traits?.forEach((trait) => {
                    critChance += trait.effect?.critBonus ?? 0;
                });
                if (c.augmentation) {
                    critChance +=
                        AUGMENTATIONS[c.augmentation]?.effect?.critBonus ?? 0;
                }
            }
        });
        let critDmg = BASE_CRIT_MULTIPLIER;
        const overloadMatrix = findActiveArtifact(
            artifacts,
            ARTIFACT_TYPES.OVERLOAD_MATRIX,
        );
        if (overloadMatrix) {
            critDmg += getArtifactEffectValue(overloadMatrix, gs);
        }
        return { totalCritChance: critChance, totalCritDamage: critDmg };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ship, crew, artifacts, research]);

    const { finalAccuracy, accuracyModifier } = useMemo(() => {
        const equippedWeaponTypes = new Set(
            ship.modules
                .filter(
                    (m) =>
                        m.type === "weaponbay" &&
                        !m.disabled &&
                        !m.manualDisabled &&
                        m.health > 0,
                )
                .flatMap((m) => m.weapons ?? [])
                .filter(Boolean)
                .map((w) => w.type),
        );
        const relevantAccuracies = (
            Object.entries(BASE_ACCURACY) as [WeaponType, number][]
        ).filter(([type]) => equippedWeaponTypes.has(type));
        const baseAccuracy =
            relevantAccuracies.length > 0
                ? relevantAccuracies.reduce((s, [, v]) => s + v, 0) /
                  relevantAccuracies.length
                : (BASE_ACCURACY.laser +
                      BASE_ACCURACY.kinetic +
                      BASE_ACCURACY.missile) /
                  3;
        const modifier = computeAccuracyModifier({
            ship,
            crew,
            artifacts,
        } as GameState);
        return {
            finalAccuracy: Math.max(0.5, Math.min(1.0, baseAccuracy + modifier)),
            accuracyModifier: modifier,
        };
    }, [ship, crew, artifacts]);

    const { reflectChance, creditBonus } = useMemo(() => {
        const gs = useGameStore.getState();
        const mirrorShield = artifacts.find(
            (a) => a.effect.type === "damage_reflect" && a.effect.active,
        );
        const blackBox = findActiveArtifact(artifacts, ARTIFACT_TYPES.BLACK_BOX);
        return {
            reflectChance: mirrorShield
                ? getArtifactEffectValue(mirrorShield, gs) * 100
                : 0,
            creditBonus: blackBox
                ? Math.round(getArtifactEffectValue(blackBox, gs) * 100)
                : 0,
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [artifacts, research]);

    // Derived colors
    const hullPct = maxHull > 0 ? currentHull / maxHull : 0;
    const hullColor =
        hullPct < 0.3 ? "#ff0040" : hullPct < 0.6 ? "#ffb000" : "#00ff41";
    const fuelPct = (ship.maxFuel || 0) > 0 ? (ship.fuel || 0) / (ship.maxFuel || 1) : 0;
    const fuelColor =
        fuelPct < 0.2 ? "#ff0040" : fuelPct < 0.5 ? "#ffb000" : "#9933ff";
    const cargoPct = cargoCapacity > 0 ? currentCargo / cargoCapacity : 0;
    const cargoColor =
        cargoPct > 0.9 ? "#ff0040" : cargoPct > 0.7 ? "#ffb000" : "#00ff41";
    const powerColor =
        available < 0 ? "#ff0040" : available < 5 ? "#ffb000" : "#00ff41";
    const accuracyColor =
        finalAccuracy >= 0.9
            ? "#00ff41"
            : finalAccuracy >= 0.7
              ? "#ffb000"
              : "#ff0040";
    const hasDamage = displayDamageTotal > 0;

    return (
        <div className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-3 mt-2.5 text-sm">
            {/* ── Корпус и защита ──────────────────────── */}
            <SectionHeader label="Корпус и защита" />

            <div className="flex justify-between items-baseline mb-0.5">
                <span className="text-[#ffb000]">{t("ship_stats.hull")}</span>
                <span style={{ color: hullColor }}>
                    {currentHull}/{maxHull}
                </span>
            </div>
            <StatBar value={currentHull} max={maxHull} color={hullColor} />

            <div className="flex justify-between items-baseline mb-0.5">
                <span className="text-[#ffb000]">{t("ship_stats.shields")}</span>
                <span className="text-[#00d4ff]">
                    {ship.shields}/{ship.maxShields}
                </span>
            </div>
            <StatBar value={ship.shields} max={ship.maxShields} color="#00d4ff" />

            <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-[#ffb000]">
                    {t("ship_stats.shield_regen")}
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
                    +{Math.round(shieldRegen)}/{t("ship_stats.per_turn")}
                    {shieldRegenerator && (
                        <span className="text-[#00ff41] text-xs">
                            {" "}
                            (+
                            {Math.round(
                                getArtifactEffectValue(
                                    shieldRegenerator,
                                    useGameStore.getState(),
                                ) * 100,
                            )}
                            %)
                        </span>
                    )}
                </span>
            </div>

            <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-[#ffb000]">{t("ship_stats.defense")}</span>
                <span className="text-[#00ff41]">
                    {totalDefense} {t("ship_stats.units")}
                </span>
            </div>

            <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-[#ffb000]">{t("ship_stats.evasion")}</span>
                <span
                    className={
                        evasionChance >= 30
                            ? "text-[#00ff41]"
                            : evasionChance >= 15
                              ? "text-[#ffb000]"
                              : "text-[#888]"
                    }
                >
                    {evasionChance}%
                </span>
            </div>

            {reflectChance > 0 && (
                <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-[#ffb000]">
                        {t("ship_stats.reflection")}
                    </span>
                    <span className="text-[#00d4ff]">
                        {Math.round(reflectChance)}%
                    </span>
                </div>
            )}

            {moduleRepairPercent > 0 && (
                <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-[#ffb000]">
                        {t("ship_stats.module_repair")}
                    </span>
                    <span
                        className={
                            moduleRepairPercent >= 10
                                ? "text-[#00ff41]"
                                : moduleRepairPercent >= 5
                                  ? "text-[#ffb000]"
                                  : "text-[#888]"
                        }
                    >
                        {moduleRepairPercent % 1 === 0
                            ? moduleRepairPercent
                            : moduleRepairPercent.toFixed(1)}
                        %/{t("ship_stats.per_turn")}
                    </span>
                </div>
            )}

            {/* ── Ресурсы ──────────────────────────────── */}
            <SectionHeader label="Ресурсы" />

            <div className="flex justify-between items-baseline mb-0.5">
                <span className="text-[#ffb000]">
                    {t("ship_stats.fuel")}
                    {efficiencyPercent >= 0 && (
                        <span className="text-[#888] text-xs">
                            {" "}
                            (
                            {efficiencyPercent + (mergeBonus.fuelEfficiency || 0)}
                            %)
                        </span>
                    )}
                </span>
                <span style={{ color: fuelColor }}>
                    {ship.fuel || 0}/{ship.maxFuel || 0}
                </span>
            </div>
            <StatBar
                value={ship.fuel || 0}
                max={ship.maxFuel || 0}
                color={fuelColor}
            />

            <div className="flex justify-between items-baseline mb-0.5">
                <span className="text-[#ffb000]">
                    {t("ship_stats.crew_count")}
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
            <StatBar
                value={crew.length}
                max={crewCapacity}
                color={crew.length <= crewCapacity ? "#00ff41" : "#ff0040"}
            />

            <div className="flex justify-between items-baseline mb-0.5">
                <span className="text-[#ffb000]">{t("ship_stats.oxygen")}</span>
                <span
                    className={
                        oxygenRequiredCount <= oxygenCapacity
                            ? "text-[#00ff41]"
                            : "text-[#ff0040]"
                    }
                >
                    {oxygenRequiredCount}/{oxygenCapacity}
                </span>
            </div>
            <StatBar
                value={oxygenRequiredCount}
                max={oxygenCapacity}
                color={
                    oxygenRequiredCount <= oxygenCapacity ? "#00d4ff" : "#ff0040"
                }
            />

            <div className="flex justify-between items-baseline mb-0.5">
                <span className="text-[#ffb000]">Грузовой отсек</span>
                <span style={{ color: cargoColor }}>
                    {currentCargo}/{cargoCapacity}
                </span>
            </div>
            <StatBar
                value={currentCargo}
                max={cargoCapacity}
                color={cargoColor}
            />

            {/* ── Навигация ────────────────────────────── */}
            <SectionHeader label="Навигация" />

            <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-[#ffb000]">{t("ship_stats.engine")}</span>
                <span className="text-[#00ff41]">
                    {t("ship_stats.level")}
                    {engineLevel}
                </span>
            </div>
            <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-[#ffb000]">{t("ship_stats.captain")}</span>
                <span className="text-[#00ff41]">
                    {t("ship_stats.level")}
                    {captain?.level ?? 1}
                </span>
            </div>
            <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-[#ffb000]">
                    {t("ship_stats.scan_range")}
                </span>
                <span className="text-[#00ff41]">
                    {scanRange > 0 ? `${scanRange}` : "—"}
                </span>
            </div>

            {/* ── Энергетика ───────────────────────────── */}
            <SectionHeader label="Энергетика" />

            <div className="flex justify-between items-baseline mb-0.5">
                <span className="text-[#ffb000]">
                    {t("ship_stats.power_consumption")} /{" "}
                    {t("ship_stats.power_generation")}
                </span>
                <span style={{ color: powerColor }}>
                    {totalConsumption}/{totalPower}
                </span>
            </div>
            <StatBar
                value={totalConsumption}
                max={totalPower}
                color={powerColor}
            />
            <div className="flex justify-between items-baseline mb-1.5 font-bold">
                <span className="text-[#ffb000]">
                    {t("ship_stats.power_available")}
                </span>
                <span style={{ color: powerColor }}>
                    {available > 0 ? `+${available}` : available}
                </span>
            </div>

            {/* ── Вооружение ───────────────────────────── */}
            <SectionHeader label="Вооружение" />

            {hasDamage && (
                <>
                    <div className="flex justify-between items-baseline mb-1.5 font-bold">
                        <span className="text-[#ffb000]">
                            {t("ship_stats.damage")}
                        </span>
                        <span className="text-[#ff6600]">{displayDamageTotal}</span>
                    </div>

                    <div className="pl-2 mb-1.5 space-y-1">
                        {damage.kinetic > 0 && (
                            <div className="flex justify-between text-xs text-[#aaa]">
                                <span>{t("ship_stats.kinetic")}</span>
                                <span>{damage.kinetic}</span>
                            </div>
                        )}
                        {damage.laser > 0 && (
                            <div
                                className="flex justify-between text-xs"
                                style={{ color: "#ff4444" }}
                            >
                                <span>{t("ship_stats.laser")}</span>
                                <span>{displayLaserDamage}</span>
                            </div>
                        )}
                        {damage.missile > 0 && (
                            <div
                                className="flex justify-between text-xs"
                                style={{ color: "#ffaa00" }}
                            >
                                <span>{t("ship_stats.missile")}</span>
                                <span>{damage.missile}</span>
                            </div>
                        )}
                        {damage.plasma > 0 && (
                            <div
                                className="flex justify-between text-xs"
                                style={{ color: "#c040ff" }}
                            >
                                <span>{t("ship_stats.plasma")}</span>
                                <span>{damage.plasma}</span>
                            </div>
                        )}
                        {damage.drones > 0 && (
                            <div
                                className="flex justify-between text-xs"
                                style={{ color: "#40c0ff" }}
                            >
                                <span>{t("ship_stats.drones")}</span>
                                <span>{damage.drones}</span>
                            </div>
                        )}
                        {damage.antimatter > 0 && (
                            <div
                                className="flex justify-between text-xs"
                                style={{ color: "#ff4040" }}
                            >
                                <span>{t("ship_stats.antimatter")}</span>
                                <span>{damage.antimatter}</span>
                            </div>
                        )}
                        {damage.quantum_torpedo > 0 && (
                            <div
                                className="flex justify-between text-xs"
                                style={{ color: "#40ffb0" }}
                            >
                                <span>{t("ship_stats.quantum_torpedo")}</span>
                                <span>{damage.quantum_torpedo}</span>
                            </div>
                        )}
                    </div>
                </>
            )}

            <div className="flex justify-between items-baseline mb-0.5">
                <span className="text-[#ffb000]">
                    {t("ship_stats.accuracy")}
                </span>
                <span style={{ color: accuracyColor }}>
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
            <StatBar
                value={Math.round(finalAccuracy * 100)}
                max={100}
                color={accuracyColor}
            />

            <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-[#ffb000]">
                    {t("ship_stats.crit_chance")}
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
            <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-[#ffb000]">
                    {t("ship_stats.crit_damage")}
                </span>
                <span className="text-[#ff0040]">
                    ×{totalCritDamage.toFixed(1)}
                    {totalCritDamage > BASE_CRIT_MULTIPLIER && (
                        <span className="text-[#00ff41] text-xs">
                            {" "}
                            (+
                            {Math.round(
                                (totalCritDamage - BASE_CRIT_MULTIPLIER) * 100,
                            )}
                            %)
                        </span>
                    )}
                </span>
            </div>

            {/* ── Бонусы ───────────────────────────────── */}
            {creditBonus > 0 && (
                <>
                    <SectionHeader label="Бонусы" />
                    <div className="flex justify-between items-baseline mb-1.5">
                        <span className="text-[#ffb000]">💰 Бонус к наградам</span>
                        <span className="text-[#00ff41]">+{creditBonus}%</span>
                    </div>
                </>
            )}
        </div>
    );
}
