"use client";

import { useEffect, useMemo, useState } from "react";
import { useGameStore } from "../store";
import { showHintOnce } from "@/game/hints/showHint";
import { Button } from "@/components/ui/button";
import { CombatCinematicStage } from "./CombatCinematicStage";
import {
  getCombatCinematicVolleySummary,
  type CombatCinematicVolleySummary,
} from "./combatCinematicPresentation";
import { CrewMemberCard } from "./CrewMemberCard";
import {
  createCombatPresentationSnapshot,
  getPresentedCombat,
} from "./combatPresentationState";
import { useCombatCinematicUiStore } from "./combatCinematicUiStore";
import { getBossAbilityIntent } from "@/game/slices/combat/helpers/bossIntent";
import { isModuleActive } from "@/game/modules/utils";
import type { CrewMember, CrewMemberCombatAssignment, Module, WeaponType } from "../types";
import type { EnemyModule } from "@/game/types/enemy";
import { useTranslation } from "@/lib/useTranslation";
import { WEAPON_TYPES, DRONE_MAX_STACKS, DRONE_STACK_BONUS } from "@/game/constants";
import { calculateCombatTimeCost } from "@/game/slices/combat/helpers/combatTime";
import { getBossModulePassives } from "@/game/slices/combat/helpers/bossEffectLabels";
import { createCombatCinematicSnapshot } from "@/game/slices/combat/helpers/combatTimeline";
import {
  calculateFinalDamagePerWeapon,
  computeBayAccuracyModifier,
  getWeaponAccuracy,
} from "@/game/slices/combat/helpers/playerDamage";

interface WeaponHint {
  text: string;
  color: string;
}

type CombatPhaseId = "ambush" | "targeting" | "salvo" | "counter";

const COMBAT_PHASES: { id: CombatPhaseId; label: string; caption: string }[] = [
  { id: "targeting", label: "Наведение", caption: "выбор целей" },
  { id: "salvo", label: "Залп", caption: "ваш выстрел" },
];

function getWeaponHints(
  type: string,
  w: (typeof WEAPON_TYPES)[keyof typeof WEAPON_TYPES] | undefined,
): WeaponHint[] {
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

type TFn = (key: string, params?: Record<string, string | number>) => string;
type Ship = ReturnType<typeof useGameStore.getState>["ship"];
type Combat = NonNullable<ReturnType<typeof useGameStore.getState>["currentCombat"]>;

/** Оружейные отсеки корабля — используются для назначения целей и проверки «нечем стрелять». */
function getWeaponBayStats(ship: Ship) {
  const weaponBays = ship.modules.filter(
    (m) => m.type === "weaponbay" && isModuleActive(m),
  );
  const hasWeaponBay =
    weaponBays.length > 0 &&
    weaponBays.some((wb) => wb.weapons && wb.weapons.some((w) => w));
  return { weaponBays, hasWeaponBay };
}

/** Текущая фаза боя (засада/наведение/залп/контратака) по состоянию боя и назначенных целей. */
function computeCombatPhase(
  currentCombat: Combat,
  activeBayId: number | null,
  assignedTargetCount: number,
  armedBayCount: number,
): CombatPhaseId {
  return currentCombat.isAmbush && !currentCombat.ambushAttackDone
    ? "ambush"
    : currentCombat.skipPlayerTurn
      ? "counter"
      : activeBayId !== null || assignedTargetCount < armedBayCount
        ? "targeting"
        : "salvo";
}

/** Пояснение для текущей фазы боя. */
function getPhaseNote(
  phase: CombatPhaseId,
  activeBayId: number | null,
  targetingProgress: string,
): string {
  return phase === "counter"
    ? "Следующий залп будет пропущен эффектом оглушения: враг получает инициативу."
    : phase === "salvo"
      ? "Цели назначены. После атаки игра автоматически разыграет ответ врага и конец хода."
      : activeBayId !== null
        ? "Выберите модуль врага для активного оружейного отсека."
        : `Назначьте цели оружейным отсекам. Готово: ${targetingProgress}.`;
}

/** Строка выбора цели для одного оружейного отсека: оружие, урон/точность, подсказки бонусов. */
function WeaponBayTargetRow({
  bay,
  targetMod,
  isActive,
  dmgMultiplier,
  bayAccuracyModifier,
  disabled,
  onSelect,
  t,
}: {
  bay: Module;
  targetMod: EnemyModule | null | undefined;
  isActive: boolean;
  dmgMultiplier: number;
  bayAccuracyModifier: number;
  disabled: boolean;
  onSelect: () => void;
  t: TFn;
}) {
  const bayWeapons = bay.weapons?.filter(Boolean) ?? [];
  // Один поиск WEAPON_TYPES на тип оружия — переиспользуется в обоих
  // проходах рендера (урон/точность и бонус-подсказки) ниже
  const weaponDefsByType = new Map<
    string,
    (typeof WEAPON_TYPES)[keyof typeof WEAPON_TYPES]
  >();
  bayWeapons.forEach((w) => {
    if (w && !weaponDefsByType.has(w.type))
      weaponDefsByType.set(w.type, WEAPON_TYPES[w.type]);
  });

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
      onClick={onSelect}
      disabled={disabled}
      className={`w-full text-left border px-3 py-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${isActive
        ? "border-ring bg-[rgba(0,212,255,0.12)]"
        : "cursor-pointer border-[#333] bg-[rgba(0,0,0,0.3)] hover:border-[#555]"
        }`}
    >
      {/* Top row: weapons + target */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {weaponGroups.map((g) => {
            const wdef = weaponDefsByType.get(g.type);
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
                <span className="opacity-60 ml-0.5">
                  ({Math.round(
                    getWeaponAccuracy(g.type as WeaponType, bayAccuracyModifier) * 100,
                  )}%)
                </span>
              </span>
            );
          })}
        </div>
        <span className={`shrink-0 ${targetMod ? "border-accent" : "text-[#444]"}`}>
          → {targetMod ? targetMod.name : "случайная цель"}
        </span>
      </div>
      {/* Bottom row: bonus hints */}
      {weaponGroups.some(
        (g) => getWeaponHints(g.type, weaponDefsByType.get(g.type)).length > 0,
      ) && (
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
          {weaponGroups.flatMap((g) =>
            getWeaponHints(g.type, weaponDefsByType.get(g.type)).map((hint, i) => (
              <span key={`${g.type}-${i}`} style={{ color: hint.color }} className="opacity-70">
                {hint.text}
              </span>
            )),
          )}
        </div>
      )}
    </button>
  );
}

function CombatPhaseStrip({
  activePhase,
  note,
}: {
  activePhase: CombatPhaseId;
  note: string;
}) {
  const displayedActivePhase: CombatPhaseId =
    activePhase === "ambush" ? "counter" : activePhase;
  const activeIndex = COMBAT_PHASES.findIndex(
    (phase) => phase.id === displayedActivePhase,
  );
  const normalizedActiveIndex = activeIndex >= 0 ? activeIndex : 0;

  return (
    <div className="border border-[#1a3320] bg-[rgba(0,0,0,0.28)] p-3">
      <div className="grid grid-cols-2 gap-2">
        {COMBAT_PHASES.map((phase, index) => {
          const isActive = phase.id === displayedActivePhase;
          const isPast = index < normalizedActiveIndex;
          return (
            <div
              key={phase.id}
              className="min-w-0"
            >
              <div
                className={`min-h-10.5 border px-2 py-1 text-center transition-colors ${isActive
                    ? " bg-[rgba(255,176,0,0.12)] border-accent"
                    : isPast
                      ? "border-[#00ff4133] bg-[rgba(0,255,65,0.05)] text-[#00ff41]"
                      : "border-[#333] bg-[rgba(255,255,255,0.02)] text-[#666]"
                  }`}
              >
                <div className="font-['Orbitron'] text-[10px] font-bold uppercase">
                  {phase.label}
                </div>
                <div className="mt-0.5 text-[9px] normal-case tracking-normal opacity-70">
                  {phase.caption}
                </div>
              </div>
              <div
                className={`mt-1 h-1 ${isActive ? "bg-accent" : isPast ? "bg-[#00ff41]" : "bg-[#222]"
                  }`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-xs leading-snug text-[#889988]">
        {activePhase === "ambush" ? "Засада: враг перехватил инициативу. " : ""}
        {note}
        <span className="text-[#556655]">
          {" "}После залпа игра автоматически разыгрывает ответ врага, ремонт, щиты и переход к следующему ходу.
        </span>
      </div>
    </div>
  );
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
  const addLog = useGameStore((s) => s.addLog);
  const cinematicTimeline = useCombatCinematicUiStore((s) => s.timeline);
  const startCombatPlayback = useCombatCinematicUiStore((s) => s.startCombatPlayback);
  const finishCombatPlayback = useCombatCinematicUiStore((s) => s.finishCombatPlayback);

  useEffect(() => {
    showHintOnce(addLog, "combat", "hints.combat");
  }, [addLog]);

  const [bayTargets, setBayTargets] = useState<Record<number, number | null>>({});
  const [activeBayId, setActiveBayId] = useState<number | null>(null);
  const [selectedCrew, setSelectedCrew] = useState<CrewMember | null>(null);
  const [playbackCombat, setPlaybackCombat] = useState<Combat | null>(null);
  const [lastVolleySummary, setLastVolleySummary] = useState<CombatCinematicVolleySummary | null>(null);

  const isPlaybackActive = cinematicTimeline !== null;
  const presentedCombat = getPresentedCombat(
    currentCombat,
    playbackCombat,
    isPlaybackActive,
  );
  const idleSnapshot = useMemo(
    () => createCombatCinematicSnapshot({ ship, currentCombat: presentedCombat }),
    [presentedCombat, ship],
  );
  const bossIntent = useMemo(
    () => getBossAbilityIntent(presentedCombat),
    [presentedCombat],
  );
  const selectedModuleIds = useMemo(
    () => [
      ...new Set(
        Object.values(bayTargets).filter(
          (targetId): targetId is number => typeof targetId === "number",
        ),
      ),
    ],
    [bayTargets],
  );

  const { weaponBays, hasWeaponBay } = getWeaponBayStats(ship);

  const pDmg = getTotalDamage();
  const hasGunner = crew.some(
    (crewMember) =>
      crewMember.profession === "gunner" &&
      weaponBays.some((bay) => bay.id === crewMember.moduleId),
  );
  // The same multiplier as the attack resolver, including the active gunner bonus.
  const dmgBaseSum = (["kinetic", "laser", "missile", "plasma", "drones", "antimatter", "quantum_torpedo", "ion_cannon"] as const)
    .reduce((s, k) => s + pDmg[k], 0);
  const combatDamageTotal = calculateFinalDamagePerWeapon(pDmg.total, hasGunner);
  const dmgMultiplier = dmgBaseSum > 0 ? combatDamageTotal / dmgBaseSum : 1;
  const isBoss = presentedCombat?.enemy.isBoss || false;
  const combatRound = presentedCombat?.round ?? 1;
  const campaignTimeCost = calculateCombatTimeCost(combatRound);

  const getAdjacentModules = (moduleId: number) => {
    return ship.modules.filter(
      (m) =>
        m.id !== moduleId &&
        !m.manualDisabled &&
        isModuleAdjacent(moduleId, m.id),
    );
  };

  if (!presentedCombat) return null;

  const handleEnemyModuleClick = (moduleId: number) => {
    if (isPlaybackActive) return;
    selectEnemyModule(moduleId);

    if (activeBayId !== null) {
      const newTargets = { ...bayTargets, [activeBayId]: moduleId };
      setBayTargets(newTargets);
      // Auto-advance to next bay without a target
        const next = weaponBays.find(
          (b) => b.id !== activeBayId && newTargets[b.id] === undefined,
        );
      setActiveBayId(next?.id ?? null);
    } else if (weaponBays.length === 1) {
      setBayTargets({ [weaponBays[0].id]: moduleId });
    }
  };

  const handleAttack = () => {
    if (isPlaybackActive) return;
    const timeline = attackEnemyWithBayTargets(bayTargets);
    if (timeline) {
      setPlaybackCombat(createCombatPresentationSnapshot(presentedCombat));
      setLastVolleySummary(getCombatCinematicVolleySummary(timeline));
      startCombatPlayback(timeline);
    }
  };

  const handleSkipCombatTurn = () => {
    if (isPlaybackActive) return;
    const timeline = useGameStore.getState().skipTurn();
    if (timeline) {
      setPlaybackCombat(createCombatPresentationSnapshot(presentedCombat));
      setLastVolleySummary(getCombatCinematicVolleySummary(timeline));
      startCombatPlayback(timeline);
    }
  };

  const handleRetreat = () => {
    if (isPlaybackActive) return;
    const timeline = retreat();
    if (timeline) {
      setPlaybackCombat(createCombatPresentationSnapshot(presentedCombat));
      setLastVolleySummary(getCombatCinematicVolleySummary(timeline));
      startCombatPlayback(timeline);
    }
  };

  const handlePlaybackComplete = () => {
    setPlaybackCombat(null);
    finishCombatPlayback();
  };

  const armedBayIds = weaponBays
    .filter((bay) => bay.weapons?.some((weapon) => weapon))
    .map((bay) => bay.id);
  const assignedTargetCount = armedBayIds.filter(
    (bayId) => bayTargets[bayId] !== undefined,
  ).length;
  const targetingProgress =
    armedBayIds.length > 0
      ? `${Math.min(assignedTargetCount, armedBayIds.length)}/${armedBayIds.length}`
      : "0/0";
  const activeCombatPhase = computeCombatPhase(
    presentedCombat,
    activeBayId,
    assignedTargetCount,
    armedBayIds.length,
  );
  const phaseNote = getPhaseNote(activeCombatPhase, activeBayId, targetingProgress);
  const selectableModuleIds = !isPlaybackActive &&
    (activeBayId !== null || weaponBays.length === 1)
    ? presentedCombat.enemy.modules
      .filter((module) => module.health > 0)
      .map((module) => module.id)
    : [];

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-2">
      <div
        className={`font-['Orbitron'] font-bold text-lg ${isBoss ? "text-[#ff00ff]" : "border-accent"}`}
      >
        {isBoss ? t("combat.boss_title") : t("combat.fight_title")}
        {presentedCombat.enemy.name.toUpperCase()}
      </div>

      <CombatCinematicStage
        idleSnapshot={idleSnapshot}
        timeline={cinematicTimeline}
        selectedModuleIds={selectedModuleIds}
        selectableModuleIds={selectableModuleIds}
        commandPhase={activeCombatPhase}
        bossIntent={bossIntent}
        onTargetSelect={handleEnemyModuleClick}
        onPlaybackComplete={handlePlaybackComplete}
      />

      {!isPlaybackActive && lastVolleySummary && (
        <CombatVolleySummaryCard summary={lastVolleySummary} t={t} />
      )}

      {/* Attack actions */}
      <div className="flex gap-2.5 flex-col sm:flex-row">
        <Button
          disabled={isPlaybackActive || !hasWeaponBay}
          onClick={handleAttack}
          className="cursor-pointer bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
        >
          {t("combat.attack")}
        </Button>
        <Button
          disabled={isPlaybackActive}
          onClick={handleSkipCombatTurn}
          className="cursor-pointer bg-transparent border-2 border-accent text-accent hover:bg-accent hover:text-[#050810] uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-50 w-full sm:w-auto"
        >
          {t("combat.skip_turn")}
        </Button>
        <Button
          variant="destructive"
          disabled={isPlaybackActive}
          onClick={handleRetreat}
          className="cursor-pointer bg-transparent border-2 border-destructive text-destructive hover:bg-destructive hover:text-[#050810] uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-50 w-full sm:w-auto"
        >
          {t("combat.retreat")}
        </Button>
      </div>

      {/* Per-bay target selector */}
      {weaponBays.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs border-accent font-bold uppercase tracking-wider">
            {weaponBays.length > 1 ? "Цели по отсекам:" : "Цель:"}
          </div>
          {weaponBays.map((bay) => {
            const targetId = bayTargets[bay.id] ?? null;
            const targetMod = targetId !== null
              ? presentedCombat.enemy.modules.find((m) => m.id === targetId)
              : null;
            const isActive = activeBayId === bay.id;
            const bayAccuracyModifier = computeBayAccuracyModifier(
              useGameStore.getState(),
              bay.id,
            );

            return (
              <WeaponBayTargetRow
                key={bay.id}
                bay={bay}
                targetMod={targetMod}
                isActive={isActive}
                dmgMultiplier={dmgMultiplier}
                bayAccuracyModifier={bayAccuracyModifier}
                disabled={isPlaybackActive}
                onSelect={() => setActiveBayId(isActive ? null : bay.id)}
                t={t}
              />
            );
          })}
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
            {presentedCombat.enemy.modules.map((module) => {
              const isTargeted = selectedModuleIds.includes(module.id);
              return (
                <button
                  key={module.id}
                  type="button"
                  disabled={isPlaybackActive || module.health <= 0}
                  onClick={() => handleEnemyModuleClick(module.id)}
                  className={`min-w-0 border px-2 py-1.5 text-left text-[10px] transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${isTargeted
                    ? "border-[#ffcb57] bg-[rgba(255,203,87,0.12)] text-[#ffcb57]"
                    : "cursor-pointer border-[#365062] bg-[rgba(0,0,0,0.28)] text-[#b8d9e8] hover:border-[#67e8f9]"
                    }`}
                >
                  <span className="block truncate">{module.name}</span>
                  {!isPlaybackActive && (
                    <span className="mt-0.5 block text-[9px] text-[#7893a2]">
                      {module.health}/{module.maxHealth ?? module.health}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {!isPlaybackActive && activeBayId !== null && (
            <div className="text-[10px] text-ring text-center pt-0.5">
              Нажмите на модуль врага чтобы назначить цель
            </div>
          )}
        </div>
      )}

      <CombatPhaseStrip activePhase={activeCombatPhase} note={phaseNote} />

      <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
        <CombatMetric label="Раунд боя" value={combatRound} color="#00d4ff" />
        <CombatMetric
          label="Время после боя"
          value={`+${campaignTimeCost}`}
          color="#ffb000"
        />
        <CombatMetric label="Цели" value={targetingProgress} color="#00ff41" />
        <CombatMetric
          label="Стаков дронов"
          value={presentedCombat.droneStacks}
          color="#9933ff"
        />
      </div>

      {!hasWeaponBay && (
        <div className="bg-[rgba(255,0,64,0.1)] border border-destructive p-2 text-sm text-destructive">
          {t("combat.no_weapon_bay")}
        </div>
      )}

      {isBoss && presentedCombat.enemy.specialAbility && (
        <BossAbilityCard
          ability={presentedCombat.enemy.specialAbility}
          regenRate={presentedCombat.enemy.regenRate}
          t={t}
        />
      )}

      <BossModulePassivesCard
        modules={presentedCombat.enemy.modules}
        t={t}
      />

      <CrewManagement
        crew={crew}
        ship={ship}
        selectedCrew={selectedCrew}
        onSelectCrew={setSelectedCrew}
        onMoveCrew={moveCrewMember}
        assignCombatTask={assignCombatTask}
        getAdjacentModules={getAdjacentModules}
        disabled={isPlaybackActive}
      />

      {isBoss && (
        <div className="mt-2 text-center text-sm text-[#ffaa00]">
          {t("combat.boss_artifact_guaranteed")}
        </div>
      )}
    </div>
  );
}

function CombatMetric({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div
      className="min-w-0 border bg-[rgba(0,0,0,0.26)] px-2 py-1"
      style={{ borderColor: `${color}66` }}
    >
      <div className="font-['Orbitron'] text-sm font-bold" style={{ color }}>
        {value}
      </div>
      <div className="truncate text-[10px] uppercase tracking-wide text-[#667]">
        {label}
      </div>
    </div>
  );
}

function CombatVolleySummaryCard({
  summary,
  t,
}: {
  summary: CombatCinematicVolleySummary;
  t: TFn;
}) {
  const destroyedModules =
    summary.destroyedEnemyModuleIds.length + summary.destroyedPlayerModuleIds.length;
  const damageColumns = [
    {
      label: t("combat_cinematics.summary.dealt"),
      shield: summary.enemyShieldDamage,
      hull: summary.enemyHullDamage,
      color: "#00ff9d",
    },
    {
      label: t("combat_cinematics.summary.received"),
      shield: summary.playerShieldDamage,
      hull: summary.playerHullDamage,
      color: "#ff4d6d",
    },
  ];

  return (
    <div className="border border-[#34566c] bg-[rgba(3,12,23,0.78)] px-3 py-2">
      <div className="font-['Orbitron'] text-[10px] font-bold tracking-wider text-[#b8f5ff]">
        {t("combat_cinematics.summary.title")}
      </div>
      <div className="mt-1 grid grid-cols-2 gap-3 text-[10px]">
        {damageColumns.map(({ label, shield, hull, color }) => (
          <div key={label} className="min-w-0 border-l-2 pl-2" style={{ borderColor: color }}>
            <div className="font-bold uppercase" style={{ color }}>{label}</div>
            {shield > 0 && <div className="text-[#78c8ff]">{t("combat_cinematics.summary.shield")}: −{shield}</div>}
            {hull > 0 && <div className="text-[#f5d0d9]">{t("combat_cinematics.summary.hull")}: −{hull}</div>}
            {shield === 0 && hull === 0 && <div className="text-[#667788]">—</div>}
          </div>
        ))}
      </div>
      {(summary.criticalHits > 0 || destroyedModules > 0 || summary.droneStacks > 0) && (
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[#aebdca]">
          {summary.criticalHits > 0 && <span className="text-[#ffcb57]">✦ {t("combat_cinematics.summary.critical")}: {summary.criticalHits}</span>}
          {destroyedModules > 0 && <span className="text-[#ff9d8c]">✕ {t("combat_cinematics.summary.modules_destroyed")}: {destroyedModules}</span>}
          {summary.droneStacks > 0 && <span className="text-[#c084fc]">⁘ {t("combat_cinematics.summary.drone_stacks")}: {summary.droneStacks}</span>}
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

/**
 * Показывает пассивные способности живых модулей босса (уклонение, гашение
 * крита, прожиг щитов и т.п.) ДО того, как они впервые сработают — раньше
 * игрок узнавал о них только постфактум, из лога боя.
 */
function BossModulePassivesCard({
  modules,
  t,
}: {
  modules: EnemyModule[];
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const passives = getBossModulePassives(modules.filter((m) => m.health > 0));
  if (passives.length === 0) return null;

  return (
    <div className="bg-[rgba(255,0,255,0.06)] border border-[#ff00ff66] p-3 text-sm">
      <div className="text-[#ff00ff] font-bold mb-1">
        {t("combat.boss_module_passives_title")}
      </div>
      <div className="space-y-0.5">
        {passives.map((p) => (
          <div key={p.moduleId} className="flex justify-between text-xs text-[#cccccc]">
            <span>
              {p.moduleName}: {p.label}
            </span>
            {p.valueText && <span className="text-[#ffaa00]">{p.valueText}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

interface CrewManagementProps {
  crew: CrewMember[];
  ship: ReturnType<typeof useGameStore.getState>["ship"];
  disabled: boolean;
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
  disabled,
  selectedCrew,
  onSelectCrew,
  onMoveCrew,
  assignCombatTask,
  getAdjacentModules,
}: CrewManagementProps) {
  const { t } = useTranslation();
  return (
    <div className="border-t border-[#00ff41] pt-3 mt-2">
      <div className="border-accent font-bold mb-2 text-sm">
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
              disabled={disabled}
            />
          );
        })}
      </div>
    </div>
  );
}
