"use client";

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
    const captain = useGameStore((s) =>
        s.crew.find((c) => c.profession === "pilot"),
    );
    const research = useGameStore((s) => s.research);

    const { t } = useTranslation();

    const { efficiencyPercent } = useFuelEfficiency();

    const scanRange = getEffectiveScanRange();

    // Регенерация щитов: сумма shieldRegen всех активных модулей щитов
    // плюс бонус от артефакта "Тёмный Щит"
    const shieldRegenerator = findActiveArtifact(
        artifacts,
        ARTIFACT_TYPES.SHIELD_REGENERATOR,
    );

    const darkShield = findActiveArtifact(
        artifacts,
        ARTIFACT_TYPES.DARK_SHIELD,
    );

    const mergeBonus = getMergeEffectsBonus(crew, ship.modules);
    const activeShieldModules = ship.modules.filter(
        (m) => m.type === "shield" && m.health > 0 && !m.disabled,
    );
    let shieldRegen = activeShieldModules.reduce(
        (sum, m) => sum + (m.shieldRegen ?? 4),
        0,
    );
    // Бонус регенерации от планетарных эффектов (Кристаллины)
    shieldRegen += ship.bonusShieldRegen ?? 0;
    // Добавляем регенерацию от "Тёмного Щита" с учётом бонусов науки и ритуалов
    if (darkShield) {
        const artifactRegen = getArtifactShieldRegen(
            darkShield,
            useGameStore.getState(),
        );
        shieldRegen += artifactRegen;
    }
    if (shieldRegen > 0) {
        if (shieldRegenerator) {
            const regenBoost = getArtifactEffectValue(
                shieldRegenerator,
                useGameStore.getState(),
            );
            shieldRegen = Math.floor(shieldRegen * (1 + regenBoost));
        }
        if (mergeBonus.shieldRegenBonus) {
            shieldRegen = Math.floor(
                shieldRegen * (1 + mergeBonus.shieldRegenBonus / 100),
            );
        }
    }

    // Ремонт модулей за ход: исследования + активные артефакты
    const researchRepair = getTechBonusSum(research, "nanite_repair");
    const gameState = useGameStore.getState();
    const naniteArtifact = findActiveArtifact(
        artifacts,
        ARTIFACT_TYPES.NANITE_HULL,
    );
    const autoRepairArtifact = findActiveArtifact(
        artifacts,
        ARTIFACT_TYPES.PARASITIC_NANITES,
    );

    const artifactRepair =
        (naniteArtifact
            ? getArtifactEffectValue(naniteArtifact, gameState)
            : 0) +
        (autoRepairArtifact
            ? getArtifactEffectValue(autoRepairArtifact, gameState)
            : 0);
    const moduleRepairPercent = researchRepair + artifactRepair;

    const totalPower = getTotalPower();
    const totalConsumption = getTotalConsumption();
    const available = totalPower - totalConsumption;
    const damage = getTotalDamage();
    // Применяем бонус стрелка для отображения (как в реальной атаке)
    const hasGunnerInBay =
        crew.some(
            (c) =>
                c.profession === "gunner" &&
                ship.modules.some(
                    (m) => m.type === "weaponbay" && m.id === c.moduleId,
                ),
        ) || crew.some((c) => c.combatAssignment === "targeting");
    const displayDamageTotal = hasGunnerInBay
        ? Math.floor(damage.total * COMBAT_DAMAGE_MODIFIERS.GUNNER_BONUS)
        : damage.total;
    const crewCapacity = getCrewCapacity();

    // Calculate hull stats
    const maxHull = ship.modules.reduce(
        (s, m) => s + (m.maxHealth || m.health),
        0,
    );
    const currentHull = ship.modules.reduce((s, m) => s + m.health, 0);
    // Use ship.armor which includes Crystal Armor artifact bonus
    // Add crystalline crew flat defense bonus (+0.5 per crew member)
    let crystallineDefense = 0;
    crew.filter((c) => c.race === "crystalline").forEach((c) => {
        const armorTrait = RACES[c.race]?.specialTraits?.find(
            (trait) => trait.id === "crystal_armor",
        );
        if (armorTrait?.effects.moduleDefense) {
            crystallineDefense += Number(armorTrait.effects.moduleDefense);
        }
    });
    const totalDefense = (ship.armor || 0) + Math.floor(crystallineDefense);

    // Get engine level from modules
    const engines = getActiveModules(ship.modules, "engine");
    const engineLevel =
        engines.length > 0 ? Math.max(...engines.map((e) => e.level || 1)) : 1;

    // Calculate total evasion chance (outside combat)
    const evasionChance = getTotalEvasion(useGameStore.getState());

    // ═══════════════════════════════════════════════════════════════
    // COMBAT STATS CALCULATION
    // ═══════════════════════════════════════════════════════════════

    // Calculate total crit chance (base + artifacts + traits)
    let totalCritChance = BASE_CRIT_CHANCE;
    const criticalMatrix = findActiveArtifact(
        artifacts,
        ARTIFACT_TYPES.CRITICAL_MATRIX,
    );

    if (criticalMatrix) {
        totalCritChance += getArtifactEffectValue(criticalMatrix, gameState);
    }

    // critBonus от трейтов: только стрелок в оружейном отсеке
    const weaponBayIds = new Set(
        ship.modules.filter((m) => m.type === "weaponbay").map((m) => m.id),
    );
    crew.forEach((c) => {
        if (c.profession === "gunner" && weaponBayIds.has(c.moduleId)) {
            c.traits?.forEach((trait) => {
                totalCritChance += trait.effect?.critBonus ?? 0;
            });
        }
    });

    // Calculate crit damage multiplier (base + artifacts)
    let totalCritDamage = BASE_CRIT_MULTIPLIER;
    const overloadMatrix = findActiveArtifact(
        artifacts,
        ARTIFACT_TYPES.OVERLOAD_MATRIX,
    );

    if (overloadMatrix) {
        totalCritDamage += getArtifactEffectValue(overloadMatrix, gameState);
    }

    // Accuracy — shared calculation with combat logic
    // Base accuracy: average over actually equipped weapon types
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
    const accuracyModifier = computeAccuracyModifier({
        ship,
        crew,
        artifacts,
    } as GameState);
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
        ? getArtifactEffectValue(mirrorShield, gameState) * 100
        : 0;

    // ═══════════════════════════════════════════════════════════════
    // CREDIT BONUS (Black Box artifact)
    // ═══════════════════════════════════════════════════════════════
    const blackBox = findActiveArtifact(artifacts, ARTIFACT_TYPES.BLACK_BOX);
    const creditBonus = blackBox
        ? Math.round(getArtifactEffectValue(blackBox, gameState) * 100)
        : 0;

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
                    <span className="text-[#00ff41]">
                        {efficiencyPercent + (mergeBonus.fuelEfficiency || 0)}%
                    </span>
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
                    {t("ship_stats.oxygen")}:
                </span>
                <span
                    className={
                        crew.filter(
                            (c) => RACES[c.race]?.requiresOxygen !== false,
                        ).length <= getOxygenCapacity()
                            ? "text-[#00ff41]"
                            : "text-[#ff0040]"
                    }
                >
                    {
                        crew.filter(
                            (c) => RACES[c.race]?.requiresOxygen !== false,
                        ).length
                    }
                    /{getOxygenCapacity()}
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
                    <span className="text-[#00ff41]">{totalPower}</span>
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
                    <span className="text-[#00ff41]">{displayDamageTotal}</span>
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
                {damage.plasma > 0 && (
                    <div className="flex justify-between text-sm text-[#c040ff]">
                        <span>{t("ship_stats.plasma")}</span>
                        <span>{damage.plasma}</span>
                    </div>
                )}
                {damage.drones > 0 && (
                    <div className="flex justify-between text-sm text-[#40c0ff]">
                        <span>{t("ship_stats.drones")}</span>
                        <span>{damage.drones}</span>
                    </div>
                )}
                {damage.antimatter > 0 && (
                    <div className="flex justify-between text-sm text-[#ff4040]">
                        <span>{t("ship_stats.antimatter")}</span>
                        <span>{damage.antimatter}</span>
                    </div>
                )}
                {damage.quantum_torpedo > 0 && (
                    <div className="flex justify-between text-sm text-[#40ffb0]">
                        <span>{t("ship_stats.quantum_torpedo")}</span>
                        <span>{damage.quantum_torpedo}</span>
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
                    {Math.round(shieldRegen)} {t("ship_stats.per_turn")}
                    {shieldRegenerator && (
                        <span className="text-[#00ff41] text-xs">
                            {" "}
                            (+
                            {Math.round(
                                getArtifactEffectValue(
                                    shieldRegenerator,
                                    gameState,
                                ) * 100,
                            )}
                            %)
                        </span>
                    )}
                </span>
            </div>

            {/* Module repair per turn */}
            {moduleRepairPercent > 0 && (
                <div className="flex justify-between mb-2 text-sm">
                    <span className="text-[#ffb000]">
                        {t("ship_stats.module_repair")}:
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
                        % {t("ship_stats.per_turn")}
                    </span>
                </div>
            )}

            {/* Credit bonus (Black Box artifact) */}
            {creditBonus > 0 && (
                <div className="flex justify-between mb-2 text-sm">
                    <span className="text-[#ffb000]">💰 Бонус к наградам:</span>
                    <span className="text-[#00ff41]">+{creditBonus}%</span>
                </div>
            )}

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
                <div className="flex justify-between text-sm">
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
        </div>
    );
}
