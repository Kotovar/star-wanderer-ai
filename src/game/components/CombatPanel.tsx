"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "../store";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CombatShipVisual } from "./CombatShipVisual";
import { CombatShipGrid } from "./CombatShipGrid";
import { CrewMemberCard } from "./CrewMemberCard";
import type { CrewMember, CrewMemberCombatAssignment } from "../types";
import { getTotalEvasion } from "@/game/slices";
import { useTranslation } from "@/lib/useTranslation";
import { WEAPON_TYPES, DRONE_MAX_STACKS, DRONE_STACK_BONUS } from "@/game/constants";

interface WeaponHint {
  text: string;
  color: string;
}

function getWeaponHints(type: string): WeaponHint[] {
  const w = WEAPON_TYPES[type as keyof typeof WEAPON_TYPES];
  if (!w) return [];
  const hints: WeaponHint[] = [];
  if (w.shieldOnly) {
    hints.push({ text: "×4 щиты", color: "#4488ff" });
    hints.push({ text: "без корпуса", color: "#666" });
  } else if (w.shieldBypass) {
    hints.push({ text: "обход щитов", color: "#00d4ff" });
  } else {
    if (w.shieldBonus && w.shieldBonus >= 2)
      hints.push({ text: `×${w.shieldBonus} щиты`, color: "#4488ff" });
    else if (w.shieldBonus && w.shieldBonus > 1)
      hints.push({ text: `+${Math.round((w.shieldBonus - 1) * 100)}% щиты`, color: "#4488ff" });
    if (w.armorPenetration && w.armorPenetration > 0)
      hints.push({ text: `-${Math.round(w.armorPenetration * 100)}% броня`, color: "#ffb000" });
    if (w.interceptChance && w.interceptChance > 0)
      hints.push({ text: `${Math.round(w.interceptChance * 100)}% перехват`, color: "#ff6600" });
  }
  // drones: stack mechanic
  if (type === "drones")
    hints.push({ text: `+${DRONE_STACK_BONUS * 100}%/стак (макс ${DRONE_MAX_STACKS} = ×2)`, color: "#00ff41" });
  return hints;
}

export function CombatPanel() {
  const { t } = useTranslation();
  const currentCombat = useGameStore((s) => s.currentCombat);
  const ship = useGameStore((s) => s.ship);
  const crew = useGameStore((s) => s.crew);
  const getTotalDamage = useGameStore((s) => s.getTotalDamage);
  const selectEnemyModule = useGameStore((s) => s.selectEnemyModule);
  const attackEnemyWithBayTargets = useGameStore((s) => s.attackEnemyWithBayTargets);
  const retreat = useGameStore((s) => s.retreat);
  const moveCrewMember = useGameStore((s) => s.moveCrewMember);
  const assignCombatTask = useGameStore((s) => s.assignCombatTask);
  const isModuleAdjacent = useGameStore((s) => s.isModuleAdjacent);
  const lastEnemyHit = useGameStore((s) => s.currentCombat?.lastEnemyHit);
  const lastPlayerHit = useGameStore((s) => s.currentCombat?.lastPlayerHit);

  const [bayTargets, setBayTargets] = useState<Record<number, number | null>>({});
  const [activeBayId, setActiveBayId] = useState<number | null>(null);
  const [enemyFlash, setEnemyFlash] = useState<"shield" | "hull" | null>(null);
  const [selectedCrew, setSelectedCrew] = useState<CrewMember | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  useEffect(() => {
    if (!lastEnemyHit) return;
    const type = lastEnemyHit.shieldDamage > 0 ? "shield" : "hull";
    const raf = requestAnimationFrame(() => setEnemyFlash(type));
    const endTimer = setTimeout(() => setEnemyFlash(null), 600);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(endTimer);
    };
  }, [lastEnemyHit]);

  // Suppress unused warning — lastPlayerHit is consumed by CombatShipGrid directly from store
  void lastPlayerHit;

  const weaponBays = ship.modules.filter(
    (m) => m.type === "weaponbay" && !m.disabled && m.health > 0,
  );
  const hasWeaponBay =
    weaponBays.length > 0 &&
    weaponBays.some((wb) => wb.weapons && wb.weapons.some((w) => w));

  const gunnerInWeaponBay = crew.find(
    (c) =>
      weaponBays.some((wb) => wb.id === c.moduleId) &&
      (c.profession === "gunner" ||
        (c.profession === "pilot" &&
          (c.combatAssignment === "targeting" ||
            c.assignment === "targeting"))),
  );
  const hasGunner = !!gunnerInWeaponBay;

  const pDmg = getTotalDamage();
  const actualDamage = pDmg.total;
  // Global damage multiplier (bonuses from crew/artifacts/tech applied only to total)
  const dmgBaseSum = (["kinetic", "laser", "missile", "plasma", "drones", "antimatter", "quantum_torpedo", "ion_cannon"] as const)
    .reduce((s, k) => s + pDmg[k], 0);
  const dmgMultiplier = dmgBaseSum > 0 ? pDmg.total / dmgBaseSum : 1;
  const isBoss = currentCombat?.enemy.isBoss || false;
  const evasionChance = getTotalEvasion(useGameStore.getState());

  const getAdjacentModules = (moduleId: number) => {
    return ship.modules.filter(
      (m) =>
        m.id !== moduleId &&
        !m.manualDisabled &&
        isModuleAdjacent(moduleId, m.id),
    );
  };

  if (!currentCombat) return null;

  const eDmg = currentCombat.enemy.modules.reduce(
    (s, m) => s + (m.health > 0 ? m.damage || 0 : 0),
    0,
  );
  const eDef = currentCombat.enemy.modules.reduce(
    (s, m) => s + (m.health > 0 ? m.defense || 0 : 0),
    0,
  );
  const eHP = currentCombat.enemy.modules.reduce((s, m) => s + m.health, 0);
  const eMaxHP = currentCombat.enemy.modules.reduce(
    (s, m) => s + (m.maxHealth || 100),
    0,
  );
  const playerMaxHP = ship.modules.reduce(
    (s, m) => s + (m.maxHealth || m.health),
    0,
  );
  const playerHP = ship.modules.reduce((s, m) => s + m.health, 0);
  const playerDefense = ship.armor;

  const handleEnemyModuleClick = (moduleId: number) => {
    // Always update enemy selected module (for legacy compatibility)
    selectEnemyModule(moduleId);

    if (activeBayId !== null) {
      const newTargets = { ...bayTargets, [activeBayId]: moduleId };
      setBayTargets(newTargets);
      // Auto-advance to next bay without a target
      const next = weaponBays.find(
        (b) => b.id !== activeBayId && !newTargets[b.id],
      );
      setActiveBayId(next?.id ?? null);
    } else if (weaponBays.length === 1) {
      setBayTargets({ [weaponBays[0].id]: moduleId });
    }
  };

  const handleAttack = () => {
    attackEnemyWithBayTargets(bayTargets);
  };

  // The targeted module for the active bay (for canvas highlight)
  const activeBayTargetId =
    activeBayId !== null ? (bayTargets[activeBayId] ?? null) : null;

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-2">
      <div
        className={`font-['Orbitron'] font-bold text-lg ${isBoss ? "text-[#ff00ff]" : "text-[#ffb000]"}`}
      >
        {isBoss ? t("combat.boss_title") : t("combat.fight_title")}
        {currentCombat.enemy.name.toUpperCase()}
      </div>

      {!hasWeaponBay && (
        <div className="bg-[rgba(255,0,64,0.1)] border border-[#ff0040] p-2 text-sm text-[#ff0040]">
          {t("combat.no_weapon_bay")}
        </div>
      )}

      {isBoss && currentCombat.enemy.specialAbility && (
        <BossAbilityCard
          ability={currentCombat.enemy.specialAbility}
          regenRate={currentCombat.enemy.regenRate}
          t={t}
        />
      )}

      {/* Ship stats summary */}
      <div className="grid grid-cols-2 gap-4 my-3">
        <div className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-4">
          <div className="text-base font-bold mb-3 text-[#00d4ff]">
            {t("combat.your_ship")}
          </div>
          <div className="text-sm space-y-2">
            <div className="text-[#00ff41]">
              {t("ship_stats.damage")} {actualDamage}
            </div>
            <div>
              {t("ship_stats.shields")} {ship.shields}/
              {ship.maxShields}
              <div className="h-2 rounded-full mt-1 bg-[rgba(0,0,0,0.5)] relative">
                <div
                  className="absolute rounded-full top-0 left-0 h-full bg-[#0080ff]"
                  style={{
                    width: `${(ship.shields / Math.max(1, ship.maxShields)) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div>
              {t("combat.hull")} {playerHP}/{playerMaxHP}
              <Progress
                value={
                  (playerHP / Math.max(1, playerMaxHP)) * 100
                }
                className="h-2 mt-1 bg-[rgba(0,0,0,0.5)] [&>div]:bg-[#00ff41]"
              />
            </div>
            <div>
              {t("combat.defense")} {playerDefense}
            </div>
            <div className="text-xs text-[#00ff41]">
              {t("combat.evasion")} {evasionChance}%
            </div>
            {hasGunner && (
              <div className="text-xs text-[#00ff41]">
                {t("combat.gunner")} {gunnerInWeaponBay.name}
              </div>
            )}
          </div>
        </div>

        <div
          className={`${isBoss ? "bg-[rgba(255,0,255,0.05)] border-[#ff00ff]" : "bg-[rgba(255,0,64,0.05)] border-[#ff0040]"} border p-4`}
        >
          <div
            className={`text-base font-bold mb-3 ${isBoss ? "text-[#ff00ff]" : "text-[#ff0040]"}`}
          >
            {currentCombat.enemy.name}
          </div>
          <div className="text-sm space-y-2">
            <div>
              {t("ship_stats.damage")} {eDmg}
            </div>
            <div>
              {t("combat.shields")}{" "}
              {currentCombat.enemy.shields || 0}/
              {currentCombat.enemy.maxShields || 0}
              <div className="h-2 rounded-full mt-1 bg-[rgba(0,0,0,0.5)] relative">
                <div
                  className={`absolute rounded-full top-0 left-0 h-full ${isBoss ? "bg-[#ff00ff]" : "bg-[#0080ff]"}`}
                  style={{
                    width: `${Math.min(100, Math.max(0, ((currentCombat.enemy.shields || 0) / Math.max(1, currentCombat.enemy.maxShields || 0)) * 100))}%`,
                  }}
                />
              </div>
            </div>
            <div>
              {t("combat.hull")} {eHP}/{eMaxHP}
              <Progress
                value={(eHP / eMaxHP) * 100}
                className={`h-2 mt-1 bg-[rgba(0,0,0,0.5)] ${isBoss ? "[&>div]:bg-[#ff00ff]" : "[&>div]:bg-[#ff0040]"}`}
              />
            </div>
            <div>
              {t("combat.defense")} {eDef}
            </div>
          </div>
        </div>
      </div>

      {/* Attack actions */}
      <div className="flex gap-2.5 flex-col sm:flex-row">
        <Button
          disabled={!hasWeaponBay}
          onClick={handleAttack}
          className="cursor-pointer bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
        >
          {t("combat.attack")}
        </Button>
        <Button
          onClick={() => useGameStore.getState().skipTurn()}
          className="cursor-pointer bg-transparent border-2 border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase tracking-wider w-full sm:w-auto"
        >
          {t("combat.skip_turn")}
        </Button>
        <Button
          variant="destructive"
          onClick={retreat}
          className="cursor-pointer bg-transparent border-2 border-[#ff0040] text-[#ff0040] hover:bg-[#ff0040] hover:text-[#050810] uppercase tracking-wider w-full sm:w-auto"
        >
          {t("combat.retreat")}
        </Button>
      </div>

      {/* Per-bay target selector */}
      {weaponBays.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs text-[#ffb000] font-bold uppercase tracking-wider">
            {weaponBays.length > 1 ? "Цели по отсекам:" : "Цель:"}
          </div>
          {weaponBays.map((bay) => {
            const targetId = bayTargets[bay.id] ?? null;
            const targetMod = targetId !== null
              ? currentCombat.enemy.modules.find((m) => m.id === targetId)
              : null;
            const isActive = activeBayId === bay.id;
            const bayWeapons = bay.weapons?.filter(Boolean) ?? [];

            // Group weapons by type
            const weaponGroups = bayWeapons.reduce(
              (acc, w) => {
                if (!w) return acc;
                const g = acc.find((x) => x.type === w.type);
                if (g) g.count++;
                else acc.push({ type: w.type, count: 1 });
                return acc;
              },
              [] as { type: string; count: number }[],
            );

            return (
              <button
                key={bay.id}
                onClick={() => setActiveBayId(isActive ? null : bay.id)}
                className={`cursor-pointer w-full text-left border px-3 py-2 text-xs transition-colors ${isActive
                  ? "border-[#00d4ff] bg-[rgba(0,212,255,0.12)]"
                  : "border-[#333] bg-[rgba(0,0,0,0.3)] hover:border-[#555]"
                  }`}
              >
                {/* Top row: weapons + target */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {weaponGroups.map((g) => {
                      const wdef = WEAPON_TYPES[g.type as keyof typeof WEAPON_TYPES];
                      const color = wdef?.color ?? "#888";
                      const icon = wdef?.icon ?? "?";
                      const name = t(`weapon_types.${g.type}`) || g.type;
                      const bayLevelBonus = 1 + ((bay.level ?? 1) - 1) * 0.1;
                      const dmg = Math.floor(
                        Math.floor((wdef?.damage ?? 0) * bayLevelBonus) * g.count * dmgMultiplier,
                      );
                      return (
                        <span key={g.type} className="flex items-center gap-0.5" style={{ color }}>
                          <span>{icon}{g.count > 1 ? `×${g.count}` : ""}</span>
                          <span className="opacity-80">{name}</span>
                          <span className="opacity-60 ml-0.5">{dmg}</span>
                        </span>
                      );
                    })}
                  </div>
                  <span className={`shrink-0 ${targetMod ? "text-[#ffb000]" : "text-[#444]"}`}>
                    → {targetMod ? targetMod.name : "случайная цель"}
                  </span>
                </div>
                {/* Bottom row: bonus hints */}
                {weaponGroups.some((g) => getWeaponHints(g.type).length > 0) && (
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                    {weaponGroups.flatMap((g) =>
                      getWeaponHints(g.type).map((hint, i) => (
                        <span key={`${g.type}-${i}`} style={{ color: hint.color }} className="opacity-70">
                          {hint.text}
                        </span>
                      )),
                    )}
                  </div>
                )}
              </button>
            );
          })}
          {activeBayId !== null && (
            <div className="text-[10px] text-[#00d4ff] text-center pt-0.5">
              Нажмите на модуль врага чтобы назначить цель
            </div>
          )}
        </div>
      )}

      {/* Ship visuals - side by side */}
      <div className="grid grid-cols-2 gap-4 my-2 items-start">
        <div className="flex flex-col items-center">
          <div className="text-base font-bold mb-4 px-4 py-2 rounded bg-[rgba(0,255,65,0.2)] text-[#00d4ff] min-h-11 flex items-center justify-center">
            {t("combat.your_ship")}
          </div>
          <div className="flex items-center gap-2 mb-3">
            <Button
              onClick={() =>
                setZoomLevel((z) => Math.max(0.5, z - 0.1))
              }
              disabled={zoomLevel <= 0.5}
              className="cursor-pointer bg-[#0a0f1a] border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] w-8 h-8 p-0 text-lg disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Уменьшить"
            >
              −
            </Button>
            <span className="text-[#00ff41] text-xs w-12 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button
              onClick={() =>
                setZoomLevel((z) => Math.min(1, z + 0.1))
              }
              disabled={zoomLevel >= 1}
              className="cursor-pointer bg-[#0a0f1a] border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] w-8 h-8 p-0 text-lg disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Увеличить"
            >
              +
            </Button>
          </div>
          <CombatShipGrid scale={zoomLevel} />
        </div>
        <div className="flex flex-col items-center">
          <div
            className={`text-base font-bold mb-4 px-4 py-2 rounded min-h-11 flex items-center justify-center text-center ${isBoss
              ? "bg-[rgba(255,0,255,0.2)] text-[#ff00ff]"
              : "bg-[rgba(255,0,64,0.2)] text-[#ff0040]"
              }`}
          >
            {currentCombat.enemy.name}
          </div>
          <div className="flex items-center gap-2 h-11" />
          <CombatShipVisual
            modules={currentCombat.enemy.modules}
            crew={[]}
            isEnemy={true}
            isBoss={isBoss}
            onModuleClick={handleEnemyModuleClick}
            title=""
            shields={currentCombat.enemy.shields}
            hitFlash={enemyFlash}
            selectedModuleId={activeBayTargetId ?? undefined}
          />
          {activeBayId !== null && (
            <div className="text-[10px] text-[#00d4ff] mt-2 text-center animate-pulse">
              Выбор цели...
            </div>
          )}
        </div>
      </div>

      <CrewManagement
        crew={crew}
        ship={ship}
        selectedCrew={selectedCrew}
        onSelectCrew={setSelectedCrew}
        onMoveCrew={moveCrewMember}
        assignCombatTask={assignCombatTask}
        getAdjacentModules={getAdjacentModules}
      />

      {isBoss && (
        <div className="mt-2 text-center text-sm text-[#ffaa00]">
          {t("combat.boss_artifact_guaranteed")}
        </div>
      )}
    </div>
  );
}

interface BossAbilityCardProps {
  ability: { name: string; description: string };
  regenRate?: number;
  t?: (key: string) => string;
}

function BossAbilityCard({ ability, regenRate, t }: BossAbilityCardProps) {
  return (
    <div className="bg-[rgba(255,0,255,0.1)] border border-[#ff00ff] p-3 text-sm">
      <div className="text-[#ff00ff] font-bold mb-1">
        ★ {ability.name}
      </div>
      <div className="text-[#cccccc]">{ability.description}</div>
      {regenRate && t && (
        <div className="text-[#ffaa00] mt-1">
          {t("combat.regen").replace("{{rate}}", String(regenRate))}
        </div>
      )}
    </div>
  );
}

interface CrewManagementProps {
  crew: CrewMember[];
  ship: ReturnType<typeof useGameStore.getState>["ship"];
  selectedCrew: CrewMember | null;
  onSelectCrew: (crew: CrewMember | null) => void;
  onMoveCrew: (_crewId: number, _moduleId: number) => void;
  assignCombatTask: (
    crewId: number,
    task: CrewMemberCombatAssignment,
    effect: string,
  ) => void;
  getAdjacentModules: (
    _moduleId: number,
  ) => ReturnType<typeof useGameStore.getState>["ship"]["modules"];
}

function CrewManagement({
  crew,
  ship,
  selectedCrew,
  onSelectCrew,
  onMoveCrew,
  assignCombatTask,
  getAdjacentModules,
}: CrewManagementProps) {
  const { t } = useTranslation();
  return (
    <div className="border-t border-[#00ff41] pt-3 mt-2">
      <div className="text-[#ffb000] font-bold mb-2 text-sm">
        {t("combat.crew_control")}
      </div>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {crew.map((c) => {
          const currentModule = ship.modules.find(
            (m) => m.id === c.moduleId,
          );
          const adjacentModules = getAdjacentModules(c.moduleId);
          const isSelected = selectedCrew?.id === c.id;

          return (
            <CrewMemberCard
              key={c.id}
              crewMember={c}
              module={currentModule}
              adjacentModules={adjacentModules}
              isSelected={isSelected}
              onSelect={() => onSelectCrew(isSelected ? null : c)}
              onMove={onMoveCrew}
              onAssignTask={(id, task) =>
                assignCombatTask(id, task, "")
              }
              isCombat={true}
            />
          );
        })}
      </div>
    </div>
  );
}
