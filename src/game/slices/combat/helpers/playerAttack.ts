import { store as i18nStore } from "@/lib/useTranslation";
import type {
  GameState,
  GameStore,
  Module,
  WeaponCounts,
  WeaponType,
} from "@/game/types";
import { playSound, type SoundId } from "@/sounds";
import { playCombatSound } from "./combatSound";
import { getArtifactEffectValue, findActiveArtifact } from "@/game/artifacts";
import { getCrewDisplayName } from "@/game/crew/crewNames";
import { ARTIFACT_TYPES, WEAPON_TYPES } from "@/game/constants";
import { isModuleActive } from "@/game/modules/utils";
import {
  getWeaponAccuracy,
  getPlayerCritChance,
  calculateFinalDamagePerWeapon,
  computeAccuracyModifier,
  computeBayAccuracyModifier,
  processLaserDamage,
  processKineticDamage,
  processMissileDamage,
  processSiegeTorpedoDamage,
  processPlasmaDamage,
  processDronesDamage,
  processAntimatterDamage,
  processQuantumTorpedoDamage,
  processIonCannonDamage,
} from "./playerDamage";
import { handleVictory } from "./playerVictory";
import { handleEnemyCounterAttack } from "./enemyCounterAttack";
import { applyAlienPresencePenalty } from "./alienPresence";
import {
  getActivePointDefense,
  getModulePointDefenseChance,
} from "./pointDefense";
import { BASE_CRIT_MULTIPLIER, DRONE_MAX_STACKS, DRONE_STACK_BONUS } from "@/game/constants";
import {
  checkBossEvasionBoost,
  checkBossModuleDodge,
  checkBossPhaseShift,
  applyBossTakeDamageEffects,
  checkBossResurrect,
} from "./bossAbilities";
import { advanceCombatRound } from "./combatTime";
import {
  appendCombatSnapshotDeltaEvents,
  buildVolleyEvents,
  createMissProjectileResolutions,
  createCombatCinematicSnapshot,
  createCombatTimelineCollector,
  finalizeProjectileHullDamage,
  splitVolleyAtHullDestruction,
  type CombatTimelineCollector,
} from "./combatTimeline";
import type {
  CombatProjectileResolution,
  CombatTurnTimeline,
} from "../../../types/combatCinematics";
import { getAugmentationBonus } from "@/game/constants/augmentations";
import type { CrewMember } from "@/game/types";

// Призматическая линза работает только из оружейной палубы с лазером.
const getCrewLaserDamageBonus = (
  crew: CrewMember[],
  modules: Module[],
): number => {
  const laserWeaponBayIds = new Set(
    modules
      .filter(
        (module) =>
          module.type === "weaponbay" &&
          module.weapons?.some((weapon) => weapon?.type === "laser"),
      )
      .map((module) => module.id),
  );

  return crew.reduce(
    (bonus, crewMember) =>
      laserWeaponBayIds.has(crewMember.moduleId)
        ? bonus + getAugmentationBonus(crewMember, "laserDamageBonus")
        : bonus,
    0,
  );
};

// ─── Constants ────────────────────────────────────────────────────────────────

const OVERCLOCK_ARMOR_REDUCTION = 0.1;

const getCoreDestroyedLog = (isBiological?: boolean): string =>
  isBiological
    ? "💥 ЖИВОЕ ЯДРО УНИЧТОЖЕНО! Существо погибает!"
    : "💥 РЕАКТОР ВРАГА УНИЧТОЖЕН! Корабль разрушен!";

/** Finds the enemy's core/reactor module — its destruction = instant victory */
const findEnemyCore = (
  modules: { id: number; type: string; health: number; isBiological?: boolean }[],
) =>
  modules.find((m) => m.type === "reactor" || m.type.includes("core"));

const getBarrierDestroyedLog = (isBiological?: boolean): string =>
  isBiological
    ? "💥 Последняя защитная мембрана разрушена! Биобарьер рассеян!"
    : "💥 Последний щитовой модуль уничтожен! Щиты врага обнулены!";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CritResult {
  isCrit: boolean;
  multiplier: number;
}

interface DamageResult {
  totalShieldDamage: number;
  totalModuleDamage: number;
  remainingShields: number;
  missedShots: WeaponCounts;
  armorPenetration: number;
  plasmaHitCount: number;
  droneHitCount: number;
  logs: string[];
  projectiles: CombatProjectileResolution[];
}

const WEAPON_SOUND_IDS: Record<WeaponType, SoundId> = {
  kinetic: "combat_kinetic",
  laser: "combat_laser",
  missile: "combat_missile",
  plasma: "combat_plasma",
  drones: "combat_drones",
  antimatter: "combat_antimatter",
  siege_torpedo: "combat_missile",
  quantum_torpedo: "combat_quantum_torpedo",
  ion_cannon: "combat_ion_cannon",
};

const playWeaponFires = (weapons: WeaponCounts): void => {
  (Object.keys(WEAPON_SOUND_IDS) as WeaponType[]).forEach((type) => {
    if (weapons[type] > 0) playCombatSound(WEAPON_SOUND_IDS[type]);
  });
};

const createCombatHitEventId = () => Date.now() + Math.random();

function recordEnemyMiss(
  set: (fn: (s: GameState) => void) => void,
  target: NonNullable<ReturnType<typeof resolveTarget>>,
) {
  set((s) => {
    if (!s.currentCombat) return;
    s.currentCombat.lastEnemyHit = {
      eventId: createCombatHitEventId(),
      moduleId: target.id,
      moduleName: target.name,
      shieldDamage: 0,
      hullDamage: 0,
      missed: true,
    };
  });
  playCombatSound("combat_miss");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Пропуск хода игрока (эффект оглушения босса). Сбрасывает флаг и логирует.
 * Возвращает true, если ход был пропущен.
 */
function consumeSkippedTurn(
  set: (fn: (s: GameState) => void) => void,
  get: () => GameStore,
): boolean {
  if (!get().currentCombat?.skipPlayerTurn) return false;
  set((s) => {
    if (!s.currentCombat) return;
    s.currentCombat.skipPlayerTurn = false;
  });
  get().addLog(i18nStore.t("game_logs.playerAttack_10"), "error");
  return true;
}

/**
 * symbiotic_armor: ксеноморфы лечатся на % от суммарного нанесённого урона.
 */
function applyXenoLifesteal(
  totalDealt: number,
  crew: CrewMember[],
  set: (fn: (s: GameState) => void) => void,
  get: () => GameStore,
): void {
  if (totalDealt <= 0) return;
  crew.forEach((c) => {
    if (c.race !== "xenosymbiont") return;
    const damageToHp = getAugmentationBonus(c, "damageToHp");
    if (!damageToHp) return;
    const healAmount = Math.floor(totalDealt * damageToHp);
    if (healAmount <= 0) return;
    set((s) => {
      const member = s.crew.find((m) => m.id === c.id);
      if (member) {
        member.health = Math.min(
          member.maxHealth ?? 100,
          member.health + healAmount,
        );
      }
    });
    get().addLog(
      i18nStore.t("game_logs.playerAttack_13", {
        c_name: getCrewDisplayName(c),
        healAmount,
      }),
      "info",
    );
  });
}

/**
 * Пересчитывает щитовой пул врага, если атакованный щитовой модуль уничтожен.
 * Возвращает актуальное значение щитов врага после пересчёта или null,
 * если модуль жив и пересчёт не требуется.
 */
function recalcEnemyShieldPoolIfDestroyed(
  set: (fn: (s: GameState) => void) => void,
  get: () => GameStore,
  tgtModId: number,
): number | null {
  const updatedTgt = get().currentCombat?.enemy.modules.find(
    (m) => m.id === tgtModId,
  );
  if (!updatedTgt || updatedTgt.health > 0) return null;

  const aliveShieldMods =
    get().currentCombat?.enemy.modules.filter(
      (m) => m.type === "shield" && m.health > 0,
    ) ?? [];

  if (aliveShieldMods.length === 0) {
    set((s) => {
      if (!s.currentCombat) return;
      s.currentCombat.enemy.shields = 0;
      s.currentCombat.enemy.maxShields = 0;
      s.currentCombat.enemy.shieldRegenRate = undefined;
    });
    get().addLog(getBarrierDestroyedLog(updatedTgt.isBiological), "combat");
    return 0;
  }

  const newMax = aliveShieldMods.reduce(
    (sum, m) => sum + (m.shieldContribution ?? 0),
    0,
  );
  const newRegen = aliveShieldMods.reduce(
    (sum, m) => sum + (m.regenContribution ?? 0),
    0,
  );
  set((s) => {
    if (!s.currentCombat) return;
    s.currentCombat.enemy.maxShields = newMax;
    if (s.currentCombat.enemy.shields > newMax)
      s.currentCombat.enemy.shields = newMax;
    s.currentCombat.enemy.shieldRegenRate = newRegen > 0 ? newRegen : undefined;
  });
  get().addLog(
    i18nStore.t(
      updatedTgt.isBiological
        ? "game_logs.shield_module_destroyed_bio"
        : "game_logs.shield_module_destroyed",
      { newMax, newRegen },
    ),
    "combat",
  );
  return get().currentCombat?.enemy.shields ?? 0;
}

/**
 * Проверка победы: ядро/реактор уничтожен = мгновенная победа
 * (fallback: все модули мертвы). Учитывает воскрешение босса.
 * Возвращает true, если бой завершён победой.
 */
function resolveVictoryIfCoreDestroyed(
  currentState: GameStore,
  set: (fn: (s: GameState) => void) => void,
  get: () => GameStore,
  weaponBays: GameState["ship"]["modules"],
  timeline?: CombatTimelineCollector,
): boolean {
  const updatedCombat = get().currentCombat;
  if (!updatedCombat) return false;
  const core = findEnemyCore(updatedCombat.enemy.modules);
  const isVictory = core
    ? core.health <= 0
    : updatedCombat.enemy.modules.every((m) => m.health <= 0);
  if (!isVictory) return false;

  // Boss resurrect_chance: one-time chance to come back from defeat
  const resurrectionSnapshot = timeline ? createCombatCinematicSnapshot(get()) : null;
  if (updatedCombat.enemy.isBoss && checkBossResurrect(set, get)) {
    const revivedSnapshot = timeline ? createCombatCinematicSnapshot(get()) : null;
    const ability = updatedCombat.enemy.specialAbility;
    if (timeline && resurrectionSnapshot && revivedSnapshot && ability) {
      timeline.push({
        kind: "boss_ability",
        effect: ability.effect,
        name: ability.name,
      });
      appendCombatSnapshotDeltaEvents(
        timeline,
        resurrectionSnapshot,
        revivedSnapshot,
        "regen",
      );
    }
    return false;
  }

  if (core && core.health <= 0) {
    get().addLog(getCoreDestroyedLog(core.isBiological), "combat");
  }
  timeline?.push({ kind: "vessel_destroyed", side: "enemy" });
  playCombatSound("combat_enemy_destroyed");
  handleVictory(currentState, set, get, updatedCombat, weaponBays);
  return true;
}

/**
 * Финал хода игрока: контратака врага, сброс выбранной цели,
 * пересчёт статов, продвижение раунда, штраф чужого присутствия.
 */
function finishPlayerTurn(
  currentState: GameStore,
  set: (fn: (s: GameState) => void) => void,
  get: () => GameStore,
  timeline?: CombatTimelineCollector,
): void {
  handleEnemyCounterAttack(set, get, timeline);
  set((s) => {
    if (!s.currentCombat) return;
    s.currentCombat.enemy.selectedModule = null;
  });
  get().updateShipStats();
  const beforeRound = timeline ? createCombatCinematicSnapshot(get()) : null;
  advanceCombatRound(set, get);
  const afterRound = timeline ? createCombatCinematicSnapshot(get()) : null;
  if (timeline && beforeRound && afterRound) {
    appendCombatSnapshotDeltaEvents(timeline, beforeRound, afterRound, "repair");
  }
  applyAlienPresencePenalty(set, get);
}

/**
 * Collects crew members assigned to active weapon bays
 */
function getWeaponBayCrew(state: GameState) {
  const weaponBays = state.ship.modules.filter(
    (m) => m.type === "weaponbay" && isModuleActive(m),
  );

  // Only gunner and engineer ever crew a weapon bay — pilots have no
  // "targeting" option in COMBAT_ACTIONS.pilot (constants/crew.ts), so a
  // pilot branch here was unreachable dead code.
  const crewInWeaponBays = state.crew.filter(
    (c) =>
      weaponBays.some((wb) => wb.id === c.moduleId) &&
      (c.profession === "gunner" || c.profession === "engineer"),
  );

  return { weaponBays, crewInWeaponBays };
}

/**
 * Counts weapons by type across all active weapon bays
 */
function countWeapons(state: GameState): WeaponCounts {
  const counts: WeaponCounts = {
    kinetic: 0,
    laser: 0,
    missile: 0,
    plasma: 0,
    drones: 0,
    antimatter: 0,
    siege_torpedo: 0,
    quantum_torpedo: 0,
    ion_cannon: 0,
  };

  state.ship.modules.forEach((m) => {
    if (m.type === "weaponbay" && m.weapons) {
      m.weapons.forEach((w) => {
        if (w && WEAPON_TYPES[w.type]) counts[w.type]++;
      });
    }
  });

  return counts;
}

/**
 * Resolves the target module for this attack.
 * Returns null and logs an error if no valid target is available.
 */
function resolveTarget(
  state: GameState,
  crewInWeaponBays: ReturnType<typeof getWeaponBayCrew>["crewInWeaponBays"],
  get: () => GameStore,
) {
  if (!state.currentCombat) return null;

  const hasGunner = crewInWeaponBays.some((c) => c.profession === "gunner");
  const hasGunnerWithTargeting = crewInWeaponBays.some(
    (c) => c.profession === "gunner" && c.combatAssignment === "targeting",
  );

  const aliveModules = state.currentCombat.enemy.modules.filter(
    (m) => m.health > 0,
  );
  if (aliveModules.length === 0) return null;

  // No gunner → fully random
  if (!hasGunner) {
    const target =
      aliveModules[Math.floor(Math.random() * aliveModules.length)];
    get().addLog( i18nStore.t("game_logs.playerAttack_1", { target_name: target.name }), "warning");
    return target;
  }

  // Gunner without targeting → random among alive
  if (!hasGunnerWithTargeting) {
    return aliveModules[Math.floor(Math.random() * aliveModules.length)];
  }

  // Gunner with targeting → use selected module
  const selectedTarget = state.currentCombat.enemy.modules.find(
    (m) => m.id === state.currentCombat?.enemy.selectedModule,
  );

  if (!selectedTarget || selectedTarget.health <= 0) {
    get().addLog( i18nStore.t("game_logs.playerAttack_2"), "error");
    return null;
  }

  return selectedTarget;
}

/**
 * Rolls for critical hit, applying artifact bonuses.
 * Logs bonuses only when a crit actually occurs.
 */
function rollCrit(state: GameState, get: () => GameStore): CritResult {
  const critChance = getPlayerCritChance(state);
  let critMultiplier = BASE_CRIT_MULTIPLIER;

  const criticalMatrix = findActiveArtifact(
    state.artifacts,
    ARTIFACT_TYPES.CRITICAL_MATRIX,
  );
  const overloadMatrix = findActiveArtifact(
    state.artifacts,
    ARTIFACT_TYPES.OVERLOAD_MATRIX,
  );
  if (overloadMatrix) {
    critMultiplier += getArtifactEffectValue(overloadMatrix, state);
  }

  const isCrit = Math.random() < critChance;

  if (isCrit) {
    get().addLog( i18nStore.t("game_logs.playerAttack_3", { value: critMultiplier.toFixed(1) }),
      "combat",
    );

    if (criticalMatrix) {
      const bonus = getArtifactEffectValue(criticalMatrix, state);
      get().addLog( i18nStore.t("game_logs.playerAttack_4", { value: Math.round(bonus * 100) }),
        "info",
      );
    }
    if (overloadMatrix) {
      const bonus = getArtifactEffectValue(overloadMatrix, state);
      get().addLog( i18nStore.t("game_logs.playerAttack_5", { value: Math.round(bonus * 100) }),
        "info",
      );
    }
  }

  return { isCrit, multiplier: critMultiplier };
}

/**
 * Builds the accuracy modifier from crew, modules, and artifacts.
 * Uses computeAccuracyModifier for the calculation (shared with UI),
 * then emits log messages for significant bonuses.
 */
function resolveAccuracy(
  state: GameState,
  crewInWeaponBays: ReturnType<typeof getWeaponBayCrew>["crewInWeaponBays"],
  _combatFlags: CombatFlags,
  get: () => GameStore,
): number {
  const modifier = computeAccuracyModifier(state);

  // Logging (no effect on calculation)
  const gunnerInBay = crewInWeaponBays.find((c) => c.profession === "gunner");
  if (gunnerInBay) {
    const gunnerLevel = gunnerInBay.level || 1;
    const gunnerBonus = Math.min(0.2, gunnerLevel * 0.02);
    get().addLog( i18nStore.t("game_logs.playerAttack_6", { gunnerInBay_name: gunnerInBay.name, gunnerLevel, value: Math.round(gunnerBonus * 100) }),
      "info",
    );
  }
  const aiCoreCount = state.ship.modules.filter(
    (m) => m.type === "ai_core" && isModuleActive(m),
  ).length;
  if (aiCoreCount > 0) {
    get().addLog( i18nStore.t("game_logs.playerAttack_7", { value: aiCoreCount * 5 }), "info");
  }
  const targetingCore = findActiveArtifact(
    state.artifacts,
    ARTIFACT_TYPES.TARGETING_CORE,
  );
  if (targetingCore) {
    const bonus = getArtifactEffectValue(targetingCore, state);
    get().addLog( i18nStore.t("game_logs.playerAttack_8", { value: Math.round(bonus) }),
      "info",
    );
  }

  return modifier;
}

/**
 * Calculates all weapon damage (shield + module) for all weapon types.
 * perTypeDamage: per-weapon-type damage values (computed from base type damage * bonus multiplier).
 * Falls back to finalDamagePerWeapon if a type is not present.
 */
function calculateAllDamage(
  weaponCounts: WeaponCounts,
  finalDamagePerWeapon: number,
  damageMultiplier: number,
  enemyShields: number,
  accuracyModifier: number,
  droneStacks: number,
  laserDamageBonus = 0,
  perTypeDamage?: Partial<Record<string, number>>,
  pointDefenseModules: ReadonlyArray<{
    id: number;
    type: string;
    health: number;
    level?: number;
  }> = [],
): DamageResult {
  let remainingShields = enemyShields;
  let totalShieldDamage = 0;
  let totalModuleDamage = 0;
  let armorPenetration = 0;
  let plasmaHitCount = 0;
  let droneHitCount = 0;
  const logs: string[] = [];
  const projectiles: CombatProjectileResolution[] = [];
  const missedShots: WeaponCounts = {
    kinetic: 0,
    laser: 0,
    missile: 0,
    plasma: 0,
    drones: 0,
    antimatter: 0,
    siege_torpedo: 0,
    quantum_torpedo: 0,
    ion_cannon: 0,
  };

  const getAccuracy = (type: WeaponType) =>
    getWeaponAccuracy(type, accuracyModifier);
  const pointDefense = getActivePointDefense(pointDefenseModules);
  const getInterceptChance = (type: WeaponType) =>
    getModulePointDefenseChance(type, pointDefenseModules);

  // Порядок резолва = порядок приоритета. Щиты снимают те, кто умеет:
  // ионная пушка (×4 по щитам) стреляла последней и тратила свой множитель
  // по уже сбитым щитам, пока остальной залп бился о полный барьер.
  if (weaponCounts.ion_cannon > 0) {
    const result = processIonCannonDamage(
      weaponCounts.ion_cannon,
      perTypeDamage?.ion_cannon ?? finalDamagePerWeapon,
      damageMultiplier,
      remainingShields,
      getAccuracy("ion_cannon"),
      WEAPON_TYPES.ion_cannon.shieldBonus ?? 4.0,
      projectiles,
    );
    totalShieldDamage += result.totalShieldDamage;
    totalModuleDamage += result.totalModuleDamage;
    remainingShields = result.remainingShields;
    logs.push(...result.logs);
    missedShots.ion_cannon = result.missedShots;
  }

  if (weaponCounts.antimatter > 0) {
    const result = processAntimatterDamage(
      weaponCounts.antimatter,
      perTypeDamage?.antimatter ?? finalDamagePerWeapon,
      damageMultiplier,
      remainingShields,
      enemyShields,
      getAccuracy("antimatter"),
      WEAPON_TYPES.antimatter.shieldBonus ?? 2.5,
      projectiles,
    );
    totalShieldDamage += result.totalShieldDamage;
    totalModuleDamage += result.totalModuleDamage;
    remainingShields = result.remainingShields;
    logs.push(...result.logs);
    missedShots.antimatter = result.missedShots;
  }

  if (weaponCounts.plasma > 0) {
    const result = processPlasmaDamage(
      weaponCounts.plasma,
      perTypeDamage?.plasma ?? finalDamagePerWeapon,
      damageMultiplier,
      remainingShields,
      enemyShields,
      getAccuracy("plasma"),
      WEAPON_TYPES.plasma.shieldBonus ?? 1.3,
      projectiles,
    );
    totalShieldDamage += result.totalShieldDamage;
    totalModuleDamage += result.totalModuleDamage;
    remainingShields = result.remainingShields;
    logs.push(...result.logs);
    missedShots.plasma = result.missedShots;
    plasmaHitCount += result.plasmaHitCount;
  }

  if (weaponCounts.laser > 0) {
    const laserBase = perTypeDamage?.laser ?? finalDamagePerWeapon;
    const laserDmgPerWeapon = laserDamageBonus > 0
      ? Math.floor(laserBase * (1 + laserDamageBonus))
      : laserBase;
    const result = processLaserDamage(
      weaponCounts.laser,
      laserDmgPerWeapon,
      damageMultiplier,
      remainingShields,
      enemyShields,
      getAccuracy("laser"),
      projectiles,
    );
    totalShieldDamage += result.totalShieldDamage;
    totalModuleDamage += result.totalModuleDamage;
    remainingShields = result.remainingShields;
    logs.push(...result.logs);
    missedShots.laser = result.missedShots;
  }

  if (weaponCounts.kinetic > 0) {
    const result = processKineticDamage(
      weaponCounts.kinetic,
      perTypeDamage?.kinetic ?? finalDamagePerWeapon,
      damageMultiplier,
      remainingShields,
      enemyShields,
      getAccuracy("kinetic"),
      WEAPON_TYPES.kinetic.armorPenetration ?? 0.5,
      projectiles,
    );
    totalShieldDamage += result.totalShieldDamage;
    totalModuleDamage += result.totalModuleDamage;
    remainingShields = result.remainingShields;
    logs.push(...result.logs);
    missedShots.kinetic = result.missedShots;
    // Броню режет только долетевший снаряд: иначе один промазавший ствол
    // снимал защиту для всего залпа.
    if (result.missedShots < weaponCounts.kinetic) {
      armorPenetration = Math.max(armorPenetration, result.kineticArmorPenetration);
    }
  }

  if (weaponCounts.drones > 0) {
    const result = processDronesDamage(
      weaponCounts.drones,
      perTypeDamage?.drones ?? finalDamagePerWeapon,
      damageMultiplier,
      remainingShields,
      enemyShields,
      getAccuracy("drones"),
      droneStacks,
      projectiles,
    );
    totalShieldDamage += result.totalShieldDamage;
    totalModuleDamage += result.totalModuleDamage;
    remainingShields = result.remainingShields;
    logs.push(...result.logs);
    missedShots.drones = result.missedShots;
    droneHitCount += result.droneHitCount;
  }

  if (weaponCounts.missile > 0) {
    const result = processMissileDamage(
      weaponCounts.missile,
      perTypeDamage?.missile ?? finalDamagePerWeapon,
      damageMultiplier,
      remainingShields,
      enemyShields,
      getAccuracy("missile"),
      getInterceptChance("missile"),
      pointDefense?.id,
      projectiles,
    );
    totalShieldDamage += result.totalShieldDamage;
    totalModuleDamage += result.totalModuleDamage;
    remainingShields = result.remainingShields;
    logs.push(...result.logs);
    missedShots.missile = result.missedShots;
    if (result.missedShots + result.interceptedCount < weaponCounts.missile) {
      armorPenetration = Math.max(armorPenetration, WEAPON_TYPES.missile.armorPenetration ?? 0);
    }
  }

  if (weaponCounts.siege_torpedo > 0) {
    const result = processSiegeTorpedoDamage(
      weaponCounts.siege_torpedo,
      perTypeDamage?.siege_torpedo ?? finalDamagePerWeapon,
      damageMultiplier,
      remainingShields,
      enemyShields,
      getAccuracy("siege_torpedo"),
      getInterceptChance("siege_torpedo"),
      pointDefense?.id,
      projectiles,
    );
    totalShieldDamage += result.totalShieldDamage;
    totalModuleDamage += result.totalModuleDamage;
    remainingShields = result.remainingShields;
    logs.push(...result.logs);
    missedShots.siege_torpedo = result.missedShots;
    if (result.missedShots + result.interceptedCount < weaponCounts.siege_torpedo) {
      armorPenetration = Math.max(
        armorPenetration,
        WEAPON_TYPES.siege_torpedo.armorPenetration ?? 0,
      );
    }
  }

  if (weaponCounts.quantum_torpedo > 0) {
    const result = processQuantumTorpedoDamage(
      weaponCounts.quantum_torpedo,
      perTypeDamage?.quantum_torpedo ?? finalDamagePerWeapon,
      damageMultiplier,
      getAccuracy("quantum_torpedo"),
      getInterceptChance("quantum_torpedo"),
      pointDefense?.id,
      projectiles,
    );
    totalModuleDamage += result.totalModuleDamage;
    logs.push(...result.logs);
    missedShots.quantum_torpedo = result.missedShots;
  }

  // Missed shot logs
  if (missedShots.laser > 0)
    logs.push(`❌ ${missedShots.laser} лазер(а) промахнул(ись)!`);
  if (missedShots.kinetic > 0)
    logs.push(
      `❌ ${missedShots.kinetic} кинетических снаряда промахнулось!`,
    );
  if (missedShots.missile > 0)
    logs.push(`❌ ${missedShots.missile} ракета(ы) промахнул(ись)!`);
  if (missedShots.plasma > 0)
    logs.push(
      `❌ ${missedShots.plasma} плазмен(ных) выстр. промахнул(ись)!`,
    );
  if (missedShots.drones > 0)
    logs.push(`❌ ${missedShots.drones} дрон(ов) промахнул(ись)!`);
  if (missedShots.antimatter > 0)
    logs.push(
      `❌ ${missedShots.antimatter} антиматер. выстр. промахнул(ись)!`,
    );
  if (missedShots.siege_torpedo > 0)
    logs.push(
      `❌ ${missedShots.siege_torpedo} осадная торпеда(ы) промахнул(ась)!`,
    );
  if (missedShots.quantum_torpedo > 0)
    logs.push(
      `❌ ${missedShots.quantum_torpedo} торпеда(ы) промахнул(ась)!`,
    );
  if (missedShots.ion_cannon > 0)
    logs.push(`❌ ${missedShots.ion_cannon} ион. выстр. промахнул(ись)!`);

  return {
    totalShieldDamage,
    totalModuleDamage,
    remainingShields,
    missedShots,
    armorPenetration,
    plasmaHitCount,
    droneHitCount,
    logs,
    projectiles,
  };
}

/**
 * Applies shield and module damage to the enemy, returning final module damage dealt.
 */
function applyDamageToEnemy(
  set: (fn: (s: GameState) => void) => void,
  get: () => GameStore,
  tgtMod: NonNullable<ReturnType<typeof resolveTarget>>,
  damage: DamageResult,
  enemyShields: number,
  combatFlags: CombatFlags,
  weaponCounts: WeaponCounts,
  isCrit = false,
): number {
  let finalModuleDamage = 0;

  // Apply shield damage
  if (damage.totalShieldDamage > 0) {
    const newShields = Math.max(0, enemyShields - damage.totalShieldDamage);
    set((s) => {
      if (!s.currentCombat) return;
      s.currentCombat.enemy.shields = newShields;
      if (newShields === 0) {
        s.currentCombat.enemyShieldsJustBroken = true;
      }
    });
    get().addLog( i18nStore.t("game_logs.playerAttack_9", { totalShieldDamage: damage.totalShieldDamage }), "combat");
    playCombatSound("combat_shield_hit");
    if (enemyShields > 0 && newShields === 0) {
      playCombatSound("combat_shield_break");
    }
  }

  // Plasma: permanently reduce target module armor
  if (damage.plasmaHitCount > 0 && (tgtMod.defense ?? 0) > 0) {
    const currentDefense = tgtMod.defense ?? 0;
    const baseDefense = tgtMod.baseDefense ?? currentDefense;
    const reductionPerHit = Math.max(1, Math.ceil(baseDefense / 10));
    const totalReduction = Math.min(
      currentDefense,
      reductionPerHit * damage.plasmaHitCount,
    );

    set((s) => {
      if (!s.currentCombat) return;
      const mod = s.currentCombat.enemy.modules.find(
        (m) => m.id === tgtMod.id,
      );
      if (!mod) return;
      if (mod.baseDefense === undefined)
        mod.baseDefense = mod.defense ?? 0;
      mod.defense = Math.max(0, (mod.defense ?? 0) - totalReduction);
    });

    damage.logs.push(
      `🔥 Плазма разрушает броню: -${totalReduction} (${damage.plasmaHitCount} попад.)`,
    );
  }

  // Drones: increment stack counter (cap at DRONE_MAX_STACKS = +100%)
  if (damage.droneHitCount > 0) {
    const currentStacks = get().currentCombat?.droneStacks ?? 0;
    const newStacks = Math.min(DRONE_MAX_STACKS, currentStacks + damage.droneHitCount);
    if (newStacks > currentStacks) {
      set((s) => {
        if (!s.currentCombat) return;
        s.currentCombat.droneStacks = newStacks;
      });
      damage.logs.push(
        `🤖 Стак дронов: ${newStacks}/${DRONE_MAX_STACKS} (+${Math.round(newStacks * DRONE_STACK_BONUS * 100)}% урон)`,
      );
    }
  }

  // Apply module damage (only if there is actual overflow past shields)
  if (damage.totalModuleDamage > 0) {
    let moduleDefense =
      get()
        .currentCombat?.enemy.modules.filter((m) => m.health > 0)
        .reduce((sum, m) => sum + (m.defense ?? 0), 0) ?? 0;

    if (damage.armorPenetration > 0) {
      const reduced = Math.floor(
        moduleDefense * (1 - damage.armorPenetration),
      );
      damage.logs.push(
        `🛡 Броня снижена на ${Math.round(damage.armorPenetration * 100)}%: ${moduleDefense} → ${reduced}`,
      );
      moduleDefense = reduced;
    }

    if (combatFlags.hasOverclock) {
      const reduced = Math.floor(
        moduleDefense * (1 - OVERCLOCK_ARMOR_REDUCTION),
      );
      damage.logs.push(
        `⚠️ Перегрузка: броня -${OVERCLOCK_ARMOR_REDUCTION * 100}% (${moduleDefense} → ${reduced})`,
      );
      moduleDefense = reduced;
    }

    const finalDamage = Math.max(
      1,
      damage.totalModuleDamage - moduleDefense,
    );
    finalModuleDamage = finalDamage;

    set((s) => {
      if (!s.currentCombat) return;
      const mod = s.currentCombat.enemy.modules.find(
        (m) => m.id === tgtMod.id,
      );
      if (mod) mod.health = Math.max(0, mod.health - finalDamage);
    });

    get().addLog(
      i18nStore.t("game_logs.pierce_hit", {
        name: tgtMod.name,
        damage: finalDamage,
        armor: damage.armorPenetration > 0 ? i18nStore.t("game_logs.pierce_armor", { moduleDefense }) : "",
      }),
      "combat",
    );
    playCombatSound("combat_hull_hit");
  }

  if (damage.totalShieldDamage > 0 || finalModuleDamage > 0) {
    set((s) => {
      if (!s.currentCombat) return;
      s.currentCombat.lastEnemyHit = {
        eventId: createCombatHitEventId(),
        moduleId: tgtMod.id,
        moduleName: tgtMod.name,
        shieldDamage: damage.totalShieldDamage,
        hullDamage: finalModuleDamage,
        isCrit,
      };
    });
  }

  return finalModuleDamage;
}

/**
 * Pushes a bay volley, re-aiming every shot that would otherwise keep pounding a
 * module the earlier shots of the same volley already destroyed. The redirected
 * hull damage lands on the new module instead of being thrown away.
 */
function pushVolleyWithRetargets(
  set: (fn: (s: GameState) => void) => void,
  get: () => GameStore,
  timeline: CombatTimelineCollector,
  firstTargetId: number,
  firstTargetHealth: number,
  projectiles: readonly CombatProjectileResolution[],
  isCrit: boolean,
  volleyId: number,
  sourceModuleId: number,
  droneStacks: number,
  isPhaseShift = false,
): number[] {
  const destroyedModuleIds: number[] = [];
  let targetId = firstTargetId;
  let targetHealth = firstTargetHealth;
  let remaining = projectiles;
  let currentDroneStacks = droneStacks;

  while (remaining.length > 0) {
    const { onTarget, overkill } = splitVolleyAtHullDestruction(remaining, targetHealth);
    // A wreck cannot absorb a shot, so nothing would advance the loop.
    if (onTarget.length === 0) return destroyedModuleIds;

    const events = buildVolleyEvents({
      from: "player",
      to: "enemy",
      targetModuleId: targetId,
      sourceModuleId,
      volleyId,
      droneStacks: currentDroneStacks,
      projectiles: onTarget,
      isCrit,
      isPhaseShift,
    });
    timeline.push(...events);
    for (const event of events) {
      if (event.weapon === "drones" && event.droneStacks !== undefined) {
        currentDroneStacks = event.droneStacks;
      }
    }

    const landedHullDamage = onTarget.reduce(
      (total, projectile) => total + projectile.hullDamage,
      0,
    );
    const destroyed = targetHealth > 0 && landedHullDamage >= targetHealth;
    if (destroyed) {
      destroyedModuleIds.push(targetId);
      timeline.push({ kind: "module_destroyed", side: "enemy", moduleId: targetId });
    }
    if (overkill.length === 0) return destroyedModuleIds;

    const alive = get().currentCombat?.enemy.modules.filter(
      (module) => module.health > 0 && module.id !== targetId,
    ) ?? [];
    if (alive.length === 0) return destroyedModuleIds;

    const next = alive[Math.floor(Math.random() * alive.length)];
    const spilledDamage = overkill.reduce(
      (total, projectile) => total + projectile.hullDamage,
      0,
    );
    set((s) => {
      const spillTarget = s.currentCombat?.enemy.modules.find((m) => m.id === next.id);
      if (spillTarget) {
        spillTarget.health = Math.max(0, spillTarget.health - spilledDamage);
      }
    });
    get().addLog(
      i18nStore.t("game_logs.playerAttack_retarget", {
        module_name: next.name,
        damage: Math.round(spilledDamage),
      }),
      "combat",
    );

    targetId = next.id;
    targetHealth = next.health;
    remaining = overkill;
  }

  return destroyedModuleIds;
}

// ─── Combat flags helper ──────────────────────────────────────────────────────

interface CombatFlags {
  hasGunner: boolean;
  hasEngineer: boolean;
  hasTargeting: boolean;
  hasOverclock: boolean;
  hasRapidfire: boolean;
  hasCalibration: boolean;
  hasAnalysis: boolean;
  hasGunnerWithTargeting: boolean;
}

function resolveCombatFlags(
  state: GameState,
  crewInWeaponBays: ReturnType<typeof getWeaponBayCrew>["crewInWeaponBays"],
): CombatFlags {
  const hasGunner = crewInWeaponBays.some((c) => c.profession === "gunner");
  const hasEngineer = crewInWeaponBays.some(
    (c) => c.profession === "engineer",
  );

  return {
    hasGunner,
    hasEngineer,
    hasTargeting: crewInWeaponBays.some(
      (c) => c.profession === "gunner" && c.combatAssignment === "targeting",
    ),
    hasOverclock: crewInWeaponBays.some(
      (c) => c.profession === "engineer" && c.combatAssignment === "overclock",
    ),
    hasRapidfire: crewInWeaponBays.some(
      (c) => c.profession === "gunner" && c.combatAssignment === "rapidfire",
    ),
    hasCalibration: crewInWeaponBays.some(
      (c) => c.profession === "engineer" && c.combatAssignment === "calibration",
    ),
    hasAnalysis: state.crew.some(
      (c) => c.profession === "scientist" && c.combatAssignment === "analysis",
    ),
    hasGunnerWithTargeting: crewInWeaponBays.some(
      (c) =>
        c.profession === "gunner" && c.combatAssignment === "targeting",
    ),
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * Executes player attack on enemy.
 */
export function executePlayerAttack(
  set: (fn: (s: GameState) => void) => void,
  get: () => GameStore,
) {
  // Use get() for fresh state throughout
  const currentState = get();
  if (!currentState.currentCombat) return;

  // 0. Skip turn check (boss turn_skip effect)
  if (consumeSkippedTurn(set, get)) return;

  // 1. Crew & weapon setup
  const { weaponBays, crewInWeaponBays } = getWeaponBayCrew(currentState);
  const combatFlags = resolveCombatFlags(currentState, crewInWeaponBays);
  const weaponCounts = countWeapons(currentState);

  const totalWeapons =
    weaponCounts.kinetic +
    weaponCounts.laser +
    weaponCounts.missile +
    weaponCounts.plasma +
    weaponCounts.drones +
    weaponCounts.antimatter +
    weaponCounts.siege_torpedo +
    weaponCounts.quantum_torpedo +
    weaponCounts.ion_cannon;
  if (totalWeapons === 0) {
    // Отказ действия — кинематики не будет, звук нужен сразу.
    playSound("combat_no_active_weapons");
    return;
  }

  // 2. Target resolution
  const tgtMod = resolveTarget(currentState, crewInWeaponBays, get);
  if (!tgtMod) return;
  playWeaponFires(weaponCounts);

  // 2a. Boss evasion_boost: entire attack evaded
  if (checkBossEvasionBoost(currentState, get)) {
    recordEnemyMiss(set, tgtMod);
    finishPlayerTurn(currentState, set, get);
    return;
  }

  // 2b. Module dodge passive (boss or space monster)
  const aliveBossMods = currentState.currentCombat.enemy.modules.filter(
    (m) => m.health > 0,
  );
  if (checkBossModuleDodge(aliveBossMods, get)) {
    get().addLog( i18nStore.t("game_logs.playerAttack_11", { tgtMod_name: tgtMod.name }), "warning");
    recordEnemyMiss(set, tgtMod);
    finishPlayerTurn(currentState, set, get);
    return;
  }

  // 3. Crit roll
  const crit = rollCrit(currentState, get);
  let damageMultiplier = crit.isCrit ? crit.multiplier : 1;

  // 3a. Module phase_shift: negate critical hit
  if (crit.isCrit && checkBossPhaseShift(aliveBossMods, get)) {
    damageMultiplier = 1;
  }

  // 4. Accuracy
  const accuracyModifier = resolveAccuracy(
    currentState,
    crewInWeaponBays,
    combatFlags,
    get,
  );

  // 5. Damage per weapon
  const baseWeaponDamage = get().getTotalDamage().total;
  const finalDamagePerWeapon = calculateFinalDamagePerWeapon(
    baseWeaponDamage,
    combatFlags.hasGunner,
  );

  // 6. Calculate all damage
  const enemyShields = currentState.currentCombat.enemy.shields;
  const droneStacks = currentState.currentCombat.droneStacks;

  // Призматическая линза: носитель должен быть в палубе с лазером.
  const laserDamageBonus = getCrewLaserDamageBonus(
    currentState.crew,
    currentState.ship.modules,
  );

  // Build per-type damage using fullMultiplier = finalDamagePerWeapon / rawBaseTotal,
  // where rawBaseTotal is the unmodified sum of per-type bases (no racial/artifact/tech bonuses).
  // This correctly scales each weapon type by ALL bonuses combined.
  const totalDamageByType = get().getTotalDamage();
  const rawBaseTotal = (["kinetic", "laser", "missile", "plasma", "drones", "antimatter", "siege_torpedo", "quantum_torpedo", "ion_cannon"] as const)
    .reduce((s, t) => s + totalDamageByType[t], 0);
  const fullMultiplier = rawBaseTotal > 0 ? finalDamagePerWeapon / rawBaseTotal : 1;
  const perTypeDamage: Partial<Record<string, number>> = {};
  (["kinetic", "laser", "missile", "plasma", "drones", "antimatter", "siege_torpedo", "quantum_torpedo", "ion_cannon"] as const).forEach(
    (type) => {
      if (totalDamageByType[type] > 0) {
        perTypeDamage[type] = Math.floor(totalDamageByType[type] * fullMultiplier);
      }
    },
  );

  const damage = calculateAllDamage(
    weaponCounts,
    finalDamagePerWeapon,
    damageMultiplier,
    enemyShields,
    accuracyModifier,
    droneStacks,
    laserDamageBonus,
    perTypeDamage,
    currentState.currentCombat.enemy.modules,
  );

  // Early return if everything missed
  if (damage.totalShieldDamage === 0 && damage.totalModuleDamage === 0) {
    damage.logs.forEach((log) => get().addLog(log, "combat"));
    get().addLog( i18nStore.t("game_logs.playerAttack_12"), "warning");
    recordEnemyMiss(set, tgtMod);
    finishPlayerTurn(currentState, set, get);
    return;
  }

  // 7. Apply damage
  applyDamageToEnemy(
    set,
    get,
    tgtMod,
    damage,
    enemyShields,
    combatFlags,
    weaponCounts,
    crit.isCrit && damageMultiplier > 1,
  );
  if (crit.isCrit && damageMultiplier > 1) {
    playCombatSound("combat_critical");
  }

  // 7a. Boss take-damage passives (damage_absorb, damage_mirror)
  if (currentState.currentCombat.enemy.isBoss && damage.totalModuleDamage > 0) {
    applyBossTakeDamageEffects(get(), set, get, damage.totalModuleDamage);
  }

  // 8. Flush logs
  damage.logs.forEach((log) => get().addLog(log, "combat"));

  // 8b. symbiotic_armor: xenosymbiont crew heal for % of total damage dealt
  applyXenoLifesteal(
    damage.totalShieldDamage + damage.totalModuleDamage,
    currentState.crew,
    set,
    get,
  );

  // 8a. If a shield module was just destroyed, recalculate enemy shield pool
  if (damage.totalModuleDamage > 0 && tgtMod.type === "shield") {
    recalcEnemyShieldPoolIfDestroyed(set, get, tgtMod.id);
  }

  // 9. Victory check
  if (resolveVictoryIfCoreDestroyed(currentState, set, get, weaponBays)) return;

  // 10-12. Counter-attack, cleanup, round advance
  finishPlayerTurn(currentState, set, get);
}

// ─── Per-bay attack ────────────────────────────────────────────────────────────

/**
 * Counts weapons by type in a single weapon bay module.
 */
function countWeaponsInBay(bay: GameState["ship"]["modules"][number]): WeaponCounts {
  const counts: WeaponCounts = {
    kinetic: 0, laser: 0, missile: 0, plasma: 0,
    drones: 0, antimatter: 0, siege_torpedo: 0, quantum_torpedo: 0, ion_cannon: 0,
  };
  if (bay.weapons) {
    bay.weapons.forEach((w) => {
      if (w && WEAPON_TYPES[w.type]) counts[w.type as keyof WeaponCounts]++;
    });
  }
  return counts;
}

/**
 * Executes player attack with per-bay targeting.
 * Each weapon bay fires at its own assigned target module.
 * Shields are shared — bays fire sequentially, depleting shields before hull damage reaches modules.
 *
 * bayTargets: Record<bayModuleId, enemyModuleId | null>
 * null = pick a random alive module for that bay.
 */
export function executePlayerAttackWithBayTargets(
  bayTargets: Record<number, number | null>,
  set: (fn: (s: GameState) => void) => void,
  get: () => GameStore,
): CombatTurnTimeline | null {
  const currentState = get();
  const combatAtStart = currentState.currentCombat;
  if (!combatAtStart) return null;
  const initialSnapshot = createCombatCinematicSnapshot(currentState);
  if (!initialSnapshot) return null;
  const timeline = createCombatTimelineCollector(initialSnapshot);

  // 0. Skip turn check
  if (consumeSkippedTurn(set, get)) {
    timeline.push({ kind: "turn_skipped", side: "player" });
    return timeline.finish();
  }

  // 1. Crew & weapon setup
  const { weaponBays, crewInWeaponBays } = getWeaponBayCrew(currentState);
  const combatFlags = resolveCombatFlags(currentState, crewInWeaponBays);
  const activeBays = weaponBays.filter(
    (b) => b.weapons?.some((w) => w),
  );
  if (activeBays.length === 0) {
    // Отказ действия — кинематики не будет, звук нужен сразу.
    playSound("combat_no_active_weapons");
    return null;
  }

  // 2. Boss evasion check (entire salvo)
  if (checkBossEvasionBoost(currentState, get)) {
    const ability = combatAtStart.enemy.specialAbility;
    if (ability?.effect === "evasion_boost") {
      timeline.push({
        kind: "boss_ability",
        effect: ability.effect,
        name: ability.name,
      });
    }
    activeBays.forEach((bay) => playWeaponFires(countWeaponsInBay(bay)));
    const fallbackTarget = combatAtStart.enemy.modules.find(
      (m) => m.health > 0,
    );
    if (fallbackTarget) {
      for (const bay of activeBays) {
        const bayWeapons = countWeaponsInBay(bay);
        timeline.push(...buildVolleyEvents({
          from: "player",
          to: "enemy",
          targetModuleId: fallbackTarget.id,
          sourceModuleId: bay.id,
          volleyId: bay.id,
          droneStacks: combatAtStart.droneStacks,
          projectiles: createMissProjectileResolutions(bayWeapons),
          isCrit: false,
          isEvasion: true,
        }));
      }
      recordEnemyMiss(set, fallbackTarget);
    }
    finishPlayerTurn(currentState, set, get, timeline);
    return timeline.finish();
  }

  // 3 & 4. Crit and accuracy are resolved per bay (see bay loop below)

  // 5. Damage per weapon (shared)
  const baseWeaponDamage = get().getTotalDamage().total;
  const finalDamagePerWeapon = calculateFinalDamagePerWeapon(
    baseWeaponDamage,
    combatFlags.hasGunner,
  );

  // 6. Laser bonus
  const laserDamageBonus = getCrewLaserDamageBonus(
    currentState.crew,
    currentState.ship.modules,
  );

  // 7. Process each bay sequentially, sharing shields
  // fullMultiplier = finalDamagePerWeapon / rawBaseTotal where rawBaseTotal = sum of per-type raw bases.
  // This correctly captures ALL bonuses (racial/artifact/tech + gunner/overclock) relative to raw weapon base.
  const totalDamageData = get().getTotalDamage();
  const rawBaseTotal = (["kinetic", "laser", "missile", "plasma", "drones", "antimatter", "siege_torpedo", "quantum_torpedo", "ion_cannon"] as const)
    .reduce((s, t) => s + totalDamageData[t], 0);
  const fullMultiplier = rawBaseTotal > 0 ? finalDamagePerWeapon / rawBaseTotal : 1;
  let remainingShields = combatAtStart.enemy.shields;
  let anyHit = false;

  for (const bay of activeBays) {
    const combatNow = get().currentCombat;
    if (!combatNow) break;
    const droneStacksBeforeBay = combatNow.droneStacks ?? 0;
    const aliveModules = combatNow.enemy.modules.filter((m) => m.health > 0);
    if (aliveModules.length === 0) break;

    // Resolve target for this bay
    const assignedId = bayTargets[bay.id] ?? null;
    let tgtMod = assignedId !== null
      ? aliveModules.find((m) => m.id === assignedId) ?? null
      : null;
    if (!tgtMod) {
      tgtMod = aliveModules[Math.floor(Math.random() * aliveModules.length)];
      if (!assignedId) {
        get().addLog( i18nStore.t("game_logs.playerAttack_15", { bay_id: bay.id, tgtMod_name: tgtMod.name }), "warning");
      }
    }

    const bayWeapons = countWeaponsInBay(bay);
    playWeaponFires(bayWeapons);

    // Module dodge per bay (boss or space monster)
    const aliveBossMods = aliveModules;
    if (checkBossModuleDodge(aliveBossMods, get)) {
      get().addLog( i18nStore.t("game_logs.playerAttack_16", { tgtMod_name: tgtMod.name }), "warning");
      timeline.push(...buildVolleyEvents({
        from: "player",
        to: "enemy",
        targetModuleId: tgtMod.id,
        sourceModuleId: bay.id,
        volleyId: bay.id,
        droneStacks: droneStacksBeforeBay,
        projectiles: createMissProjectileResolutions(bayWeapons),
        isCrit: false,
        isEvasion: true,
      }));
      recordEnemyMiss(set, tgtMod);
      continue;
    }

    // Per-bay crit roll
    const bayCrit = rollCrit(currentState, get);
    let bayDamageMultiplier = bayCrit.isCrit ? bayCrit.multiplier : 1;
    let bayPhaseShifted = false;
    if (bayCrit.isCrit) {
      const aliveBossModsForCrit = combatNow.enemy.modules.filter((m) => m.health > 0);
      if (checkBossPhaseShift(aliveBossModsForCrit, get)) {
        bayDamageMultiplier = 1;
        bayPhaseShifted = true;
      }
    }

    // Per-bay accuracy modifier (gunner/calibration scoped to this bay, global bonuses shared)
    const bayAccuracyModifier = computeBayAccuracyModifier(get(), bay.id);

    const shieldsBeforeBay = remainingShields;

    // Compute per-type damage for this bay: raw base * level bonus * fullMultiplier (all bonuses)
    const bayLevelBonus = 1 + ((bay.level ?? 1) - 1) * 0.1;
    const bayPerTypeDamage: Partial<Record<string, number>> = {};
    bay.weapons?.forEach((w) => {
      if (w && WEAPON_TYPES[w.type]) {
        bayPerTypeDamage[w.type] = Math.floor(
          Math.floor(WEAPON_TYPES[w.type].damage * bayLevelBonus) * fullMultiplier,
        );
      }
    });

    const damage = calculateAllDamage(
      bayWeapons,
      finalDamagePerWeapon,
      bayDamageMultiplier,
      remainingShields,
      bayAccuracyModifier,
      droneStacksBeforeBay,
      laserDamageBonus,
      bayPerTypeDamage,
      combatNow.enemy.modules,
    );

    remainingShields = damage.remainingShields;

    if (damage.totalShieldDamage === 0 && damage.totalModuleDamage === 0) {
      timeline.push(...buildVolleyEvents({
        from: "player",
        to: "enemy",
        targetModuleId: tgtMod.id,
        sourceModuleId: bay.id,
        volleyId: bay.id,
        droneStacks: droneStacksBeforeBay,
        projectiles: damage.projectiles,
        isCrit: false,
        isPhaseShift: bayPhaseShifted,
      }));
      damage.logs.forEach((log) => get().addLog(log, "combat"));
      recordEnemyMiss(set, tgtMod);
      continue;
    }

    anyHit = true;

    const targetHealthBefore = tgtMod.health;
    const finalModuleDamage = applyDamageToEnemy(
      set,
      get,
      tgtMod,
      damage,
      shieldsBeforeBay,
      combatFlags,
      bayWeapons,
      bayCrit.isCrit && bayDamageMultiplier > 1,
    );
    const targetHealthAfter = get().currentCombat?.enemy.modules.find(
      (module) => module.id === tgtMod.id,
    )?.health;
    const targetDestroyed =
      targetHealthBefore > 0 &&
      targetHealthAfter !== undefined &&
      targetHealthAfter <= 0;
    const destroysEnemyVessel = targetDestroyed && (
      findEnemyCore(combatNow.enemy.modules)?.id === tgtMod.id ||
      get().currentCombat?.enemy.modules.every((module) => module.health <= 0) === true
    );
    const volley = finalizeProjectileHullDamage(
      damage.projectiles,
      finalModuleDamage,
    );
    const bayIsCrit = bayCrit.isCrit && bayDamageMultiplier > 1;
    let destroyedModuleIds: number[] = [];
    if (destroysEnemyVessel) {
      timeline.push(...buildVolleyEvents({
        from: "player",
        to: "enemy",
        targetModuleId: tgtMod.id,
        sourceModuleId: bay.id,
        volleyId: bay.id,
        droneStacks: droneStacksBeforeBay,
        targetHullBeforeVolley: targetHealthBefore,
        projectiles: volley,
        isCrit: bayIsCrit,
        isPhaseShift: bayPhaseShifted,
      }));
      timeline.push({ kind: "module_destroyed", side: "enemy", moduleId: tgtMod.id });
      destroyedModuleIds = [tgtMod.id];
    } else {
      destroyedModuleIds = pushVolleyWithRetargets(
        set,
        get,
        timeline,
        tgtMod.id,
        targetHealthBefore,
        volley,
        bayIsCrit,
        bay.id,
        bay.id,
        droneStacksBeforeBay,
        bayPhaseShifted,
      );
    }
    if (bayCrit.isCrit && bayDamageMultiplier > 1) {
      playCombatSound("combat_critical");
    }

    // Boss take-damage effects
    if (combatNow.enemy.isBoss && damage.totalModuleDamage > 0) {
      applyBossTakeDamageEffects(get(), set, get, damage.totalModuleDamage, timeline);
    }

    damage.logs.forEach((log) => get().addLog(log, "combat"));

    // Symbiotic armor heal
    applyXenoLifesteal(
      damage.totalShieldDamage + damage.totalModuleDamage,
      currentState.crew,
      set,
      get,
    );

    // Shield module destroyed: recalc enemy shield pool (retargeted shots count too)
    for (const destroyedId of destroyedModuleIds) {
      const destroyedModule = get().currentCombat?.enemy.modules.find(
        (module) => module.id === destroyedId,
      );
      if (destroyedModule?.type !== "shield") continue;
      const newShields = recalcEnemyShieldPoolIfDestroyed(set, get, destroyedId);
      if (newShields !== null) {
        remainingShields = Math.min(remainingShields, newShields);
      }
    }

    // Victory check after each bay
    if (resolveVictoryIfCoreDestroyed(currentState, set, get, weaponBays, timeline)) {
      return timeline.finish();
    }
  }

  if (!anyHit) {
    get().addLog( i18nStore.t("game_logs.playerAttack_18"), "warning");
  }

  finishPlayerTurn(currentState, set, get, timeline);
  return timeline.finish();
}
