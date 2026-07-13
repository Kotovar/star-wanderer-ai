"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
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
  WEAPON_TYPES,
} from "@/game/constants";
import { computeAccuracyModifier } from "@/game/slices/combat/helpers/playerDamage";
import type { GameState, WeaponType } from "@/game/types";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";
import { getTechBonusSum } from "@/game/research";
import { getActiveModules } from "../modules";
import { RACES } from "@/game/constants/races";
import { AUGMENTATIONS } from "@/game/constants/augmentations";
import { StatIcon, type StatIconType } from "./StatIcon";

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mt-3 mb-1.5">
      <span className="text-[10px] text-accent font-bold tracking-widest uppercase opacity-80">
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
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="w-full h-1 bg-[rgba(255,255,255,0.08)] rounded-sm mb-1.5">
      <div
        className="h-1 rounded-sm transition-all"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

function StatLabel({
  icon,
  children,
}: {
  icon: StatIconType;
  children: ReactNode;
}) {
  return (
    <span className="text-accent inline-flex items-center gap-1.5">
      <StatIcon type={icon} size={34} />
      <span>{children}</span>
    </span>
  );
}

function DashboardCard({
  label,
  value,
  max,
  color,
  icon,
  displayValue,
  detail,
  className = "",
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  icon: StatIconType;
  displayValue?: string;
  detail?: ReactNode;
  className?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={`group relative min-w-0 overflow-hidden border border-[#00ff4133] bg-[linear-gradient(145deg,rgba(0,255,65,0.06),rgba(4,10,18,0.72))] p-2.5 flex flex-col gap-1.5 transition-colors hover:border-[#00ff4177] ${className}`}>
      <div
        className="absolute inset-y-0 left-0 w-px opacity-70"
        style={{ backgroundColor: color }}
      />
      <div className="flex items-center justify-between gap-2 text-[9px] text-[#889988] uppercase tracking-[0.14em]">
        <span className="flex min-w-0 items-center gap-1.5">
          <StatIcon type={icon} size={24} />
          <span className="truncate">{label}</span>
        </span>
        <span className="font-['Share_Tech_Mono'] tabular-nums" style={{ color }}>
          {Math.round(pct)}%
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="text-xl font-bold font-['Orbitron'] leading-none tabular-nums" style={{ color }}>
          {displayValue ?? `${value}/${max}`}
        </div>
        {detail}
      </div>
      <div className="relative h-1.5 w-full overflow-hidden bg-[rgba(255,255,255,0.07)]">
        <div
          className="h-full transition-[width]"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent 0 8px, rgba(4,10,18,0.8) 8px 10px)",
          }}
        />
      </div>
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

  const scanRange = getEffectiveScanRange();
  const cargoCapacity = getCargoCapacity();
  const oxygenCapacity = getOxygenCapacity();
  const crewCapacity = getCrewCapacity();

  const probes = useGameStore((s) => s.probes);

  const currentCargo = useMemo(
    () =>
      ship.cargo.reduce((sum, c) => sum + c.quantity, 0) +
      ship.tradeGoods.reduce((sum, g) => sum + g.quantity, 0) +
      probes,
    [ship.cargo, ship.tradeGoods, probes],
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

  const { displayLaserDamage, displayDamageTotal, damage, dmgMultiplier } = useMemo(() => {
    const dmg = getTotalDamage();
    const weaponTypeKeys = ["kinetic", "laser", "missile", "plasma", "drones", "antimatter", "quantum_torpedo", "ion_cannon"] as const;
    const rawBaseSum = weaponTypeKeys.reduce((s, type) => s + dmg[type], 0);
    // multiplier = total (with all bonuses) / raw base sum — same ratio applied to per-type display
    const multiplier = rawBaseSum > 0 ? dmg.total / rawBaseSum : 1;
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
        ? Math.floor(dmg.laser * multiplier * (1 + laserDamageBonus))
        : Math.floor(dmg.laser * multiplier);
    const hasGunnerInBay =
      crew.some(
        (c) =>
          c.profession === "gunner" &&
          ship.modules.some(
            (m) => m.type === "weaponbay" && m.id === c.moduleId,
          ),
      ) || crew.some((c) => c.combatAssignment === "targeting");
    const damageTotal = hasGunnerInBay
      ? Math.floor(dmg.total * COMBAT_DAMAGE_MODIFIERS.GUNNER_BONUS)
      : dmg.total;
    return {
      damage: dmg,
      displayLaserDamage: laserDisplay,
      displayDamageTotal: damageTotal,
      dmgMultiplier: multiplier,
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

  const { accuracyByType, accuracyModifier } = useMemo(() => {
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
    const modifier = computeAccuracyModifier({
      ship,
      crew,
      artifacts,
    } as GameState);
    const byType = (Object.entries(BASE_ACCURACY) as [WeaponType, number][])
      .filter(([type]) => equippedWeaponTypes.has(type))
      .map(([type, base]) => ({
        type,
        accuracy: Math.max(0.5, Math.min(1.0, base + modifier)),
      }));
    return {
      accuracyByType: byType,
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
  const hasDamage = displayDamageTotal > 0;
  const systemStatus =
    available < 0 || hullPct < 0.3 || fuelPct < 0.2
      ? "critical"
      : available < 5 || hullPct < 0.6 || fuelPct < 0.5 || cargoPct > 0.9
        ? "warning"
        : "nominal";
  const systemStatusColor =
    systemStatus === "critical"
      ? "#ff0040"
      : systemStatus === "warning"
        ? "#ffb000"
        : "#00ff41";

  return (
    <div className="bg-[rgba(0,255,65,0.04)] border border-[#00ff41] p-3 mt-2.5 text-sm">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-[#00ff4133] pb-2">
        <div>
          <div className="font-['Orbitron'] text-[10px] font-bold uppercase tracking-[0.18em] text-[#b7c8b7]">
            {t("ship_stats.telemetry")}
          </div>
          <div className="mt-0.5 text-[9px] uppercase tracking-[0.22em] text-[#526452]">
            {t("ship_stats.telemetry_subtitle")}
          </div>
        </div>
        <div
          className="flex shrink-0 items-center gap-2 border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em]"
          style={{ color: systemStatusColor, borderColor: `${systemStatusColor}66` }}
        >
          <span
            className="h-1.5 w-1.5"
            style={{ backgroundColor: systemStatusColor, boxShadow: `0 0 8px ${systemStatusColor}` }}
          />
          {t(`ship_stats.status_${systemStatus}`)}
        </div>
      </div>

      {/* ── Dashboard ────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 mb-4 md:grid-cols-[1fr_1fr_1.6fr_1fr]">
        <DashboardCard label={t("ship_stats.hull")} value={currentHull} max={maxHull} color={hullColor} icon="health" />
        <DashboardCard label={t("ship_stats.shields")} value={ship.shields} max={ship.maxShields} color="#00d4ff" icon="shields" />
        <DashboardCard
          label={t("ship_stats.power_available")}
          value={available}
          max={Math.max(totalPower, 1)}
          color={powerColor}
          icon="power_generation"
          displayValue={available > 0 ? `+${available}` : `${available}`}
          className="col-span-2 md:col-span-1"
          detail={
            <div className="grid grid-cols-2 gap-x-2 border-l border-[#00ff4133] pl-2 text-[8px] font-bold uppercase tracking-[0.08em]">
              <span className="flex items-center gap-1 whitespace-nowrap text-accent">
                <StatIcon type="power_consumption" size={14} />
                {t("ship_stats.power_consumption")} {totalConsumption}
              </span>
              <span className="flex items-center gap-1 whitespace-nowrap text-ring">
                <StatIcon type="power_generation" size={14} />
                {t("ship_stats.power_generation")} {totalPower}
              </span>
            </div>
          }
        />
        <DashboardCard
          label={t("ship_stats.fuel")}
          value={ship.fuel || 0}
          max={ship.maxFuel || 0}
          color={fuelColor}
          icon="fuel_efficiency"
          className="col-span-2 md:col-span-1"
        />
      </div>

      {/* ── Корпус и защита ──────────────────────── */}
      <SectionHeader label={t("ship_stats.section_hull")} />

      <div className="flex justify-between items-baseline mb-1.5">
        <StatLabel icon="shield_regen">{t("ship_stats.shield_regen")}</StatLabel>
        <span
          className={
            shieldRegen >= 15
              ? "text-[#00ff41]"
              : shieldRegen >= 10
                ? "text-accent"
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
        <StatLabel icon="armor">{t("ship_stats.defense")}</StatLabel>
        <span className="text-[#00ff41]">
          {totalDefense} {t("ship_stats.units")}
        </span>
      </div>

      <div className="flex justify-between items-baseline mb-1.5">
        <StatLabel icon="evasion">{t("ship_stats.evasion")}</StatLabel>
        <span
          className={
            evasionChance >= 30
              ? "text-[#00ff41]"
              : evasionChance >= 15
                ? "text-accent"
                : "text-[#888]"
          }
        >
          {evasionChance}%
        </span>
      </div>

      {reflectChance > 0 && (
        <div className="flex justify-between items-baseline mb-1.5">
          <StatLabel icon="reflection">{t("ship_stats.reflection")}</StatLabel>
          <span className="text-ring">
            {Math.round(reflectChance)}%
          </span>
        </div>
      )}

      {moduleRepairPercent > 0 && (
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="text-accent">
            <StatLabel icon="repair">{t("ship_stats.module_repair")}</StatLabel>
          </span>
          <span
            className={
              moduleRepairPercent >= 10
                ? "text-[#00ff41]"
                : moduleRepairPercent >= 5
                  ? "text-accent"
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
      <SectionHeader label={t("ship_stats.section_resources")} />

      <div className="flex justify-between items-baseline mb-0.5">
        <StatLabel icon="crew">{t("ship_stats.crew_count")}</StatLabel>
        <span
          className={
            crew.length <= crewCapacity
              ? "text-[#00ff41]"
              : "text-destructive"
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
        <StatLabel icon="oxygen">{t("ship_stats.oxygen")}</StatLabel>
        <span
          className={
            oxygenRequiredCount <= oxygenCapacity
              ? "text-[#00ff41]"
              : "text-destructive"
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
        <StatLabel icon="cargo">{t("ship_stats.cargo")}</StatLabel>
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
      <SectionHeader label={t("ship_stats.section_navigation")} />

      <div className="flex justify-between items-baseline mb-1.5">
        <StatLabel icon="engine_level">{t("ship_stats.engine")}</StatLabel>
        <span className="text-[#00ff41]">
          {t("ship_stats.level")}
          {engineLevel}
        </span>
      </div>
      <div className="flex justify-between items-baseline mb-1.5">
        <StatLabel icon="captain_level">{t("ship_stats.captain")}</StatLabel>
        <span className="text-[#00ff41]">
          {t("ship_stats.level")}
          {captain?.level ?? 1}
        </span>
      </div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-accent">
          <StatLabel icon="scan_range">{t("ship_stats.scan_range")}</StatLabel>
        </span>
        <span className="text-[#00ff41]">
          {scanRange > 0 ? `${scanRange}` : "—"}
        </span>
      </div>

      {/* ── Вооружение ───────────────────────────── */}
      <SectionHeader label={t("ship_stats.section_weapons")} />

      {hasDamage && (
        <>
          <div className="flex justify-between items-baseline mb-1.5 font-bold">
            <span className="text-accent">
              <StatLabel icon="damage_bonus">{t("ship_stats.damage")}</StatLabel>
            </span>
            <span className="text-[#ff6600]">{displayDamageTotal}</span>
          </div>

          <div className="pl-2 mb-1.5 space-y-1">
            {damage.kinetic > 0 && (
              <div className="flex justify-between text-xs text-[#aaa]">
                <span>{t("ship_stats.kinetic")}</span>
                <span>{Math.floor(damage.kinetic * dmgMultiplier)}</span>
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
                <span>{Math.floor(damage.missile * dmgMultiplier)}</span>
              </div>
            )}
            {damage.plasma > 0 && (
              <div
                className="flex justify-between text-xs"
                style={{ color: "#c040ff" }}
              >
                <span>{t("ship_stats.plasma")}</span>
                <span>{Math.floor(damage.plasma * dmgMultiplier)}</span>
              </div>
            )}
            {damage.drones > 0 && (
              <div
                className="flex justify-between text-xs"
                style={{ color: "#40c0ff" }}
              >
                <span>{t("ship_stats.drones")}</span>
                <span>{Math.floor(damage.drones * dmgMultiplier)}</span>
              </div>
            )}
            {damage.antimatter > 0 && (
              <div
                className="flex justify-between text-xs"
                style={{ color: "#ff4040" }}
              >
                <span>{t("ship_stats.antimatter")}</span>
                <span>{Math.floor(damage.antimatter * dmgMultiplier)}</span>
              </div>
            )}
            {damage.ion_cannon > 0 && (
              <div
                className="flex justify-between text-xs"
                style={{ color: "#40c8ff" }}
              >
                <span>{t("ship_stats.ion_cannon")}</span>
                <span>{Math.floor(damage.ion_cannon * dmgMultiplier)}</span>
              </div>
            )}
            {damage.quantum_torpedo > 0 && (
              <div
                className="flex justify-between text-xs"
                style={{ color: "#40ffb0" }}
              >
                <span>{t("ship_stats.quantum_torpedo")}</span>
                <span>{Math.floor(damage.quantum_torpedo * dmgMultiplier)}</span>
              </div>
            )}
          </div>
        </>
      )}

      <div className="mb-1">
        <div className="flex justify-between items-baseline mb-0.5">
          <span className="text-accent">
            <StatLabel icon="accuracy">{t("ship_stats.accuracy")}</StatLabel>
          </span>
          {accuracyModifier !== 0 && (
            <span className={accuracyModifier > 0 ? "text-[#00ff41] text-xs" : "text-destructive text-xs"}>
              {accuracyModifier > 0 ? "+" : ""}{Math.round(accuracyModifier * 100)}% {t("ship_stats.accuracy_base")}
            </span>
          )}
        </div>
        {accuracyByType.length === 0 ? (
          <span className="text-[#666] text-xs">—</span>
        ) : (
          <div className="flex flex-col gap-0.5">
            {accuracyByType.map(({ type, accuracy }) => {
              const color = accuracy >= 0.9 ? "#00ff41" : accuracy >= 0.7 ? "#ffb000" : "#ff0040";
              const icon = WEAPON_TYPES[type as WeaponType]?.icon ?? "•";
              const name = t(`weapon_types.${type}`) || WEAPON_TYPES[type as WeaponType]?.name || type;
              const pct = Math.round(accuracy * 100);
              return (
                <div key={type} className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[#888] text-xs w-24 shrink-0">{icon} {name}</span>
                  <div className="flex-1 h-1 bg-[rgba(255,255,255,0.08)] rounded-sm">
                    <div className="h-1 rounded-sm transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <span className="text-xs shrink-0" style={{ color }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-accent">
          <StatLabel icon="crit_chance">{t("ship_stats.crit_chance")}</StatLabel>
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
        <span className="text-accent">
          <StatLabel icon="crit_damage">{t("ship_stats.crit_damage")}</StatLabel>
        </span>
        <span className="text-destructive">
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
          <SectionHeader label={t("ship_stats.section_bonuses")} />
          <div className="flex justify-between items-baseline mb-1.5">
            <StatLabel icon="credit_bonus">{t("ship_stats.credit_bonus")}</StatLabel>
            <span className="text-[#00ff41]">+{creditBonus}%</span>
          </div>
        </>
      )}
    </div>
  );
}
