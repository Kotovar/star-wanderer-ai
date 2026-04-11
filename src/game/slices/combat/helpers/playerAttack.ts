import type {
  GameState,
  GameStore,
  WeaponCounts,
  WeaponType,
} from "@/game/types";
import { playSound } from "@/sounds";
import { getArtifactEffectValue, findActiveArtifact } from "@/game/artifacts";
import { ARTIFACT_TYPES, WEAPON_TYPES } from "@/game/constants";
import { isModuleActive } from "@/game/modules/utils";
import { getActiveAssignment } from "@/game/crew";
import {
  getWeaponAccuracy,
  calculateFinalDamagePerWeapon,
  computeAccuracyModifier,
  computeBayAccuracyModifier,
  processLaserDamage,
  processKineticDamage,
  processMissileDamage,
  processPlasmaDamage,
  processDronesDamage,
  processAntimatterDamage,
  processQuantumTorpedoDamage,
  processIonCannonDamage,
} from "./playerDamage";
import { handleVictory } from "./playerVictory";
import { handleEnemyCounterAttack } from "./enemyCounterAttack";
import { applyAlienPresencePenalty } from "./alienPresence";
import { BASE_CRIT_CHANCE, BASE_CRIT_MULTIPLIER } from "@/game/constants";
import {
  checkBossEvasionBoost,
  checkBossModuleDodge,
  checkBossPhaseShift,
  applyBossTakeDamageEffects,
  checkBossResurrect,
} from "./bossAbilities";
import { AUGMENTATIONS } from "@/game/constants/augmentations";

// ─── Constants ────────────────────────────────────────────────────────────────

const OVERCLOCK_ARMOR_REDUCTION = 0.1;
const KINETIC_ARMOR_REDUCTION_LABEL = 50; // percent, for logs

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
  kineticArmorPenetration: number;
  plasmaHitCount: number;
  droneHitCount: number;
  logs: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Collects crew members assigned to active weapon bays
 */
function getWeaponBayCrew(state: GameState) {
  const weaponBays = state.ship.modules.filter(
    (m) => m.type === "weaponbay" && isModuleActive(m),
  );

  const crewInWeaponBays = state.crew.filter(
    (c) =>
      weaponBays.some((wb) => wb.id === c.moduleId) &&
      (c.profession === "gunner" ||
        c.profession === "engineer" ||
        (c.profession === "pilot" &&
          getActiveAssignment(c, true) === "targeting")),
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
    get().addLog(`Случайная цель: ${target.name}`, "warning");
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
    get().addLog("Выберите цель!", "error");
    return null;
  }

  return selectedTarget;
}

/**
 * Rolls for critical hit, applying artifact bonuses.
 * Logs bonuses only when a crit actually occurs.
 */
function rollCrit(state: GameState, get: () => GameStore): CritResult {
  let critChance = BASE_CRIT_CHANCE;
  let critMultiplier = BASE_CRIT_MULTIPLIER;

  const criticalMatrix = findActiveArtifact(
    state.artifacts,
    ARTIFACT_TYPES.CRITICAL_MATRIX,
  );
  if (criticalMatrix) {
    critChance += getArtifactEffectValue(criticalMatrix, state);
  }

  const overloadMatrix = findActiveArtifact(
    state.artifacts,
    ARTIFACT_TYPES.OVERLOAD_MATRIX,
  );
  if (overloadMatrix) {
    critMultiplier += getArtifactEffectValue(overloadMatrix, state);
  }

  // critBonus от трейта: только стрелок в оружейном отсеке
  const weaponBayIds = new Set(
    state.ship.modules
      .filter((m) => m.type === "weaponbay")
      .map((m) => m.id),
  );
  state.crew.forEach((c) => {
    if (c.profession === "gunner" && weaponBayIds.has(c.moduleId)) {
      c.traits?.forEach((trait) => {
        if (trait.effect?.critBonus) {
          critChance += trait.effect.critBonus;
        }
      });
      // Бонус аугментации targeting_eye (+5% крит для стрелка)
      if (c.augmentation) {
        const augEffect = AUGMENTATIONS[c.augmentation]?.effect;
        if (augEffect?.critBonus) {
          critChance += augEffect.critBonus;
        }
      }
    }
  });

  const isCrit = Math.random() < critChance;

  if (isCrit) {
    get().addLog(
      `💥 КРИТИЧЕСКИЙ УДАР! x${critMultiplier.toFixed(1)} урон!`,
      "combat",
    );

    if (criticalMatrix) {
      const bonus = getArtifactEffectValue(criticalMatrix, state);
      get().addLog(
        `💎 Критическая Матрица: +${Math.round(bonus * 100)}% шанс крита`,
        "info",
      );
    }
    if (overloadMatrix) {
      const bonus = getArtifactEffectValue(overloadMatrix, state);
      get().addLog(
        `💥 Матрица Перегрузки: +${Math.round(bonus * 100)}% крит. урон`,
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
    get().addLog(
      `🎯 Стрелок ${gunnerInBay.name} (Ур.${gunnerLevel}): +${Math.round(gunnerBonus * 100)}% точность`,
      "info",
    );
  }
  const aiCoreCount = state.ship.modules.filter(
    (m) => m.type === "ai_core" && isModuleActive(m),
  ).length;
  if (aiCoreCount > 0) {
    get().addLog(`🤖 ИИ Ядро: +${aiCoreCount * 5}% точность`, "info");
  }
  const targetingCore = findActiveArtifact(
    state.artifacts,
    ARTIFACT_TYPES.TARGETING_CORE,
  );
  if (targetingCore) {
    const bonus = getArtifactEffectValue(targetingCore, state);
    get().addLog(
      `🎯 Ядро Прицеливания: +${Math.round(bonus)}% точность`,
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
): DamageResult {
  let remainingShields = enemyShields;
  let totalShieldDamage = 0;
  let totalModuleDamage = 0;
  let kineticArmorPenetration = 0;
  let plasmaHitCount = 0;
  let droneHitCount = 0;
  const logs: string[] = [];
  const missedShots: WeaponCounts = {
    kinetic: 0,
    laser: 0,
    missile: 0,
    plasma: 0,
    drones: 0,
    antimatter: 0,
    quantum_torpedo: 0,
    ion_cannon: 0,
  };

  const getAccuracy = (type: WeaponType) =>
    getWeaponAccuracy(type, accuracyModifier);

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
    );
    totalShieldDamage += result.totalShieldDamage;
    totalModuleDamage += result.totalModuleDamage;
    remainingShields = result.remainingShields;
    logs.push(...result.logs);
    missedShots.kinetic = result.missedShots;
    kineticArmorPenetration = result.kineticArmorPenetration;
  }

  if (weaponCounts.missile > 0) {
    const result = processMissileDamage(
      weaponCounts.missile,
      perTypeDamage?.missile ?? finalDamagePerWeapon,
      damageMultiplier,
      remainingShields,
      enemyShields,
      getAccuracy("missile"),
      WEAPON_TYPES.missile.interceptChance ?? 0.2,
      accuracyModifier,
    );
    totalShieldDamage += result.totalShieldDamage;
    totalModuleDamage += result.totalModuleDamage;
    remainingShields = result.remainingShields;
    logs.push(...result.logs);
    missedShots.missile = result.missedShots;
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
    );
    totalShieldDamage += result.totalShieldDamage;
    totalModuleDamage += result.totalModuleDamage;
    remainingShields = result.remainingShields;
    logs.push(...result.logs);
    missedShots.plasma = result.missedShots;
    plasmaHitCount += result.plasmaHitCount;
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
    );
    totalShieldDamage += result.totalShieldDamage;
    totalModuleDamage += result.totalModuleDamage;
    remainingShields = result.remainingShields;
    logs.push(...result.logs);
    missedShots.drones = result.missedShots;
    droneHitCount += result.droneHitCount;
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
    );
    totalShieldDamage += result.totalShieldDamage;
    totalModuleDamage += result.totalModuleDamage;
    remainingShields = result.remainingShields;
    logs.push(...result.logs);
    missedShots.antimatter = result.missedShots;
  }

  if (weaponCounts.quantum_torpedo > 0) {
    const result = processQuantumTorpedoDamage(
      weaponCounts.quantum_torpedo,
      perTypeDamage?.quantum_torpedo ?? finalDamagePerWeapon,
      damageMultiplier,
      getAccuracy("quantum_torpedo"),
    );
    totalModuleDamage += result.totalModuleDamage;
    logs.push(...result.logs);
    missedShots.quantum_torpedo = result.missedShots;
  }

  if (weaponCounts.ion_cannon > 0) {
    const result = processIonCannonDamage(
      weaponCounts.ion_cannon,
      perTypeDamage?.ion_cannon ?? finalDamagePerWeapon,
      damageMultiplier,
      remainingShields,
      enemyShields,
      getAccuracy("ion_cannon"),
      WEAPON_TYPES.ion_cannon.shieldBonus ?? 4.0,
    );
    totalShieldDamage += result.totalShieldDamage;
    totalModuleDamage += result.totalModuleDamage;
    remainingShields = result.remainingShields;
    logs.push(...result.logs);
    missedShots.ion_cannon = result.missedShots;
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
    kineticArmorPenetration,
    plasmaHitCount,
    droneHitCount,
    logs,
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
) {
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
    get().addLog(`Урон щитам врага: ${damage.totalShieldDamage}`, "combat");
    playSound("shield");
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

  // Drones: increment stack counter (cap at 20 = +100%)
  if (damage.droneHitCount > 0) {
    const currentStacks = get().currentCombat?.droneStacks ?? 0;
    const newStacks = Math.min(20, currentStacks + damage.droneHitCount);
    if (newStacks > currentStacks) {
      set((s) => {
        if (!s.currentCombat) return;
        s.currentCombat.droneStacks = newStacks;
      });
      damage.logs.push(
        `🤖 Стак дронов: ${newStacks}/20 (+${newStacks * 5}% урон)`,
      );
    }
  }

  // Apply module damage (only if there is actual overflow past shields)
  if (damage.totalModuleDamage > 0) {
    let moduleDefense =
      get()
        .currentCombat?.enemy.modules.filter((m) => m.health > 0)
        .reduce((sum, m) => sum + (m.defense ?? 0), 0) ?? 0;

    if (weaponCounts.kinetic > 0 && damage.kineticArmorPenetration > 0) {
      const reduced = Math.floor(
        moduleDefense * (1 - damage.kineticArmorPenetration),
      );
      damage.logs.push(
        `🛡 Броня снижена на ${KINETIC_ARMOR_REDUCTION_LABEL}%: ${moduleDefense} → ${reduced}`,
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

    set((s) => {
      if (!s.currentCombat) return;
      const mod = s.currentCombat.enemy.modules.find(
        (m) => m.id === tgtMod.id,
      );
      if (mod) mod.health = Math.max(0, mod.health - finalDamage);
    });

    get().addLog(
      `Пробитие! Модуль "${tgtMod.name}": -${finalDamage}%${weaponCounts.kinetic > 0 ? ` (броня -${moduleDefense})` : ""}`,
      "combat",
    );
    playSound("damage");
  }
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
    hasTargeting: state.crew.some(
      (c) => c.combatAssignment === "targeting",
    ),
    hasOverclock: state.crew.some(
      (c) => c.combatAssignment === "overclock",
    ),
    hasRapidfire: state.crew.some(
      (c) => c.combatAssignment === "rapidfire",
    ),
    hasCalibration: state.crew.some(
      (c) => c.combatAssignment === "calibration",
    ),
    hasAnalysis: state.crew.some((c) => c.combatAssignment === "analysis"),
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
  if (currentState.currentCombat.skipPlayerTurn) {
    set((s) => {
      if (!s.currentCombat) return;
      s.currentCombat.skipPlayerTurn = false;
    });
    get().addLog(`⏭️ Ваш ход пропущен! Эффект оглушения босса.`, "error");
    return;
  }

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
    weaponCounts.quantum_torpedo +
    weaponCounts.ion_cannon;
  if (totalWeapons === 0) return;

  // 2. Target resolution
  const tgtMod = resolveTarget(currentState, crewInWeaponBays, get);
  if (!tgtMod) return;

  // 2a. Boss evasion_boost: entire attack evaded
  if (checkBossEvasionBoost(currentState, get)) {
    handleEnemyCounterAttack(currentState, set, get);
    return;
  }

  // 2b. Boss module dodge passive
  const aliveBossMods = currentState.currentCombat.enemy.isBoss
    ? currentState.currentCombat.enemy.modules.filter((m) => m.health > 0)
    : [];
  if (currentState.currentCombat.enemy.isBoss && checkBossModuleDodge(aliveBossMods, get)) {
    get().addLog(`⚡ Модуль "${tgtMod.name}" уклонился от атаки!`, "warning");
    handleEnemyCounterAttack(currentState, set, get);
    return;
  }

  // 3. Crit roll
  const crit = rollCrit(currentState, get);
  let damageMultiplier = crit.isCrit ? crit.multiplier : 1;

  // 3a. Boss phase_shift: negate critical hit
  if (crit.isCrit && currentState.currentCombat.enemy.isBoss && checkBossPhaseShift(aliveBossMods, get)) {
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
    combatFlags.hasOverclock,
    combatFlags.hasRapidfire,
    combatFlags.hasAnalysis,
    combatFlags.hasTargeting,
    combatFlags.hasGunnerWithTargeting,
    get,
  );

  // 6. Calculate all damage
  const enemyShields = currentState.currentCombat.enemy.shields;
  const droneStacks = currentState.currentCombat.droneStacks;

  // prismatic_lens: +5% laser damage for any crew member with this augmentation
  const laserDamageBonus = currentState.crew.reduce((bonus, c) => {
    if (c.augmentation) {
      const augEffect = AUGMENTATIONS[c.augmentation]?.effect;
      if (augEffect?.laserDamageBonus) return bonus + augEffect.laserDamageBonus;
    }
    return bonus;
  }, 0);

  // Build per-type damage: scale each type's base damage by the same bonus multiplier
  const bonusMultiplier = baseWeaponDamage > 0 ? finalDamagePerWeapon / baseWeaponDamage : 1;
  const totalDamageByType = get().getTotalDamage();
  const perTypeDamage: Partial<Record<string, number>> = {};
  (["kinetic", "laser", "missile", "plasma", "drones", "antimatter", "quantum_torpedo", "ion_cannon"] as const).forEach(
    (type) => {
      if (totalDamageByType[type] > 0) {
        perTypeDamage[type] = Math.floor(totalDamageByType[type] * bonusMultiplier);
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
  );

  // Early return if everything missed
  if (damage.totalShieldDamage === 0 && damage.totalModuleDamage === 0) {
    damage.logs.forEach((log) => get().addLog(log, "combat"));
    get().addLog("Все выстрелы промахнулись!", "warning");
    handleEnemyCounterAttack(currentState, set, get);
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
  );

  // 7a. Boss take-damage passives (damage_absorb, damage_mirror)
  if (currentState.currentCombat.enemy.isBoss && damage.totalModuleDamage > 0) {
    applyBossTakeDamageEffects(get(), set, get, damage.totalModuleDamage);
  }

  // 8. Flush logs
  damage.logs.forEach((log) => get().addLog(log, "combat"));

  // 8b. symbiotic_armor: xenosymbiont crew heal for 5% of total damage dealt
  const totalDamageDealt = damage.totalShieldDamage + damage.totalModuleDamage;
  if (totalDamageDealt > 0) {
    currentState.crew.forEach((c) => {
      if (c.race === "xenosymbiont" && c.augmentation) {
        const augEffect = AUGMENTATIONS[c.augmentation]?.effect;
        if (augEffect?.damageToHp) {
          const healAmount = Math.floor(totalDamageDealt * augEffect.damageToHp);
          if (healAmount > 0) {
            set((s) => {
              const member = s.crew.find((m) => m.id === c.id);
              if (member) member.health = Math.min(100, member.health + healAmount);
            });
            get().addLog(`🧬 ${c.name} симбиоз: +${healAmount} HP`, "info");
          }
        }
      }
    });
  }

  // 8a. If a shield module was just destroyed, recalculate enemy shield pool
  if (damage.totalModuleDamage > 0 && tgtMod.type === "shield" && tgtMod.health > 0) {
    const updatedTgtMod = get().currentCombat?.enemy.modules.find((m) => m.id === tgtMod.id);
    if (updatedTgtMod && updatedTgtMod.health <= 0) {
      const aliveShields = get().currentCombat?.enemy.modules.filter(
        (m) => m.type === "shield" && m.health > 0,
      ) ?? [];
      if (aliveShields.length === 0) {
        set((s) => {
          if (!s.currentCombat) return;
          s.currentCombat.enemy.shields = 0;
          s.currentCombat.enemy.maxShields = 0;
          s.currentCombat.enemy.shieldRegenRate = undefined;
        });
        get().addLog("💥 Последний щитовой модуль уничтожен! Щиты врага обнулены!", "combat");
      } else {
        const newMax = aliveShields.reduce((sum, m) => sum + (m.shieldContribution ?? 0), 0);
        const newRegen = aliveShields.reduce((sum, m) => sum + (m.regenContribution ?? 0), 0);
        set((s) => {
          if (!s.currentCombat) return;
          s.currentCombat.enemy.maxShields = newMax;
          if (s.currentCombat.enemy.shields > newMax)
            s.currentCombat.enemy.shields = newMax;
          s.currentCombat.enemy.shieldRegenRate = newRegen > 0 ? newRegen : undefined;
        });
        get().addLog(
          `🛡 Щитовой модуль уничтожен! Макс. щиты врага: ${newMax}, регенерация: ${newRegen}/ход`,
          "combat",
        );
      }
    }
  }

  // 9. Victory check — reactor destroyed = instant win; fallback: all modules dead
  const updatedCombat = get().currentCombat;
  const reactorModule = updatedCombat?.enemy.modules.find((m) => m.type === "reactor");
  const isVictory = reactorModule
    ? reactorModule.health <= 0
    : updatedCombat?.enemy.modules.every((m) => m.health <= 0) ?? false;
  if (isVictory) {
    // Boss resurrect_chance: one-time chance to come back from defeat
    if (updatedCombat?.enemy.isBoss && checkBossResurrect(set, get)) {
      // Boss resurrected — continue combat (no victory yet)
    } else {
      if (reactorModule && reactorModule.health <= 0) {
        get().addLog("💥 РЕАКТОР ВРАГА УНИЧТОЖЕН! Корабль разрушен!", "combat");
      }
      if (updatedCombat) {
        handleVictory(currentState, set, get, updatedCombat, weaponBays);
      }
      return;
    }
  }

  // 10. Enemy counter-attack
  handleEnemyCounterAttack(currentState, set, get);

  // 11. Cleanup
  set((s) => {
    if (!s.currentCombat) return;
    s.currentCombat.enemy.selectedModule = null;
  });

  get().updateShipStats();
  get().nextTurn();

  // 12. Alien presence penalty
  applyAlienPresencePenalty(set, get);
}

// ─── Per-bay attack ────────────────────────────────────────────────────────────

/**
 * Counts weapons by type in a single weapon bay module.
 */
function countWeaponsInBay(bay: GameState["ship"]["modules"][number]): WeaponCounts {
  const counts: WeaponCounts = {
    kinetic: 0, laser: 0, missile: 0, plasma: 0,
    drones: 0, antimatter: 0, quantum_torpedo: 0, ion_cannon: 0,
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
): void {
  const currentState = get();
  if (!currentState.currentCombat) return;

  // 0. Skip turn check
  if (currentState.currentCombat.skipPlayerTurn) {
    set((s) => {
      if (!s.currentCombat) return;
      s.currentCombat.skipPlayerTurn = false;
    });
    get().addLog(`⏭️ Ваш ход пропущен! Эффект оглушения босса.`, "error");
    return;
  }

  // 1. Crew & weapon setup
  const { weaponBays, crewInWeaponBays } = getWeaponBayCrew(currentState);
  const combatFlags = resolveCombatFlags(currentState, crewInWeaponBays);
  const activeBays = weaponBays.filter(
    (b) => b.weapons?.some((w) => w),
  );
  if (activeBays.length === 0) return;

  // 2. Boss evasion check (entire salvo)
  if (checkBossEvasionBoost(currentState, get)) {
    handleEnemyCounterAttack(currentState, set, get);
    return;
  }

  // 3 & 4. Crit and accuracy are resolved per bay (see bay loop below)

  // 5. Damage per weapon (shared)
  const baseWeaponDamage = get().getTotalDamage().total;
  const finalDamagePerWeapon = calculateFinalDamagePerWeapon(
    baseWeaponDamage,
    combatFlags.hasGunner,
    combatFlags.hasOverclock,
    combatFlags.hasRapidfire,
    combatFlags.hasAnalysis,
    combatFlags.hasTargeting,
    combatFlags.hasGunnerWithTargeting,
    get,
  );

  // 6. Laser bonus
  const laserDamageBonus = currentState.crew.reduce((bonus, c) => {
    if (c.augmentation) {
      const augEffect = AUGMENTATIONS[c.augmentation]?.effect;
      if (augEffect?.laserDamageBonus) return bonus + augEffect.laserDamageBonus;
    }
    return bonus;
  }, 0);

  // 7. Process each bay sequentially, sharing shields
  // bonusMultiplier scales per-type base damage by the same ratio as all bonuses applied to total
  const bonusMultiplier = baseWeaponDamage > 0 ? finalDamagePerWeapon / baseWeaponDamage : 1;
  let remainingShields = currentState.currentCombat.enemy.shields;
  const droneStacks = currentState.currentCombat.droneStacks ?? 0;
  let anyHit = false;
  let totalShieldDamageDealt = 0;
  let lastHitModuleId: number | null = null;
  let lastHitModuleName = "";

  for (const bay of activeBays) {
    const combatNow = get().currentCombat;
    if (!combatNow) break;
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
        get().addLog(`[Отсек ${bay.id}] Цель не выбрана — случайный выстрел: ${tgtMod.name}`, "warning");
      }
    }

    // Boss module dodge per bay
    const aliveBossMods = combatNow.enemy.isBoss
      ? aliveModules
      : [];
    if (combatNow.enemy.isBoss && checkBossModuleDodge(aliveBossMods, get)) {
      get().addLog(`⚡ Модуль "${tgtMod.name}" уклонился!`, "warning");
      continue;
    }

    // Per-bay crit roll
    const bayCrit = rollCrit(currentState, get);
    let bayDamageMultiplier = bayCrit.isCrit ? bayCrit.multiplier : 1;
    if (bayCrit.isCrit && combatNow.enemy.isBoss) {
      const aliveBossModsForCrit = combatNow.enemy.modules.filter((m) => m.health > 0);
      if (checkBossPhaseShift(aliveBossModsForCrit, get)) bayDamageMultiplier = 1;
    }

    // Per-bay accuracy modifier (gunner/calibration scoped to this bay, global bonuses shared)
    const bayAccuracyModifier = computeBayAccuracyModifier(get(), bay.id);

    // Count weapons in this bay only
    const bayWeapons = countWeaponsInBay(bay);
    const shieldsBeforeBay = remainingShields;

    // Compute per-type damage for this bay (base type damage * level bonus * bonus multiplier)
    const bayLevelBonus = 1 + ((bay.level ?? 1) - 1) * 0.1;
    const bayPerTypeDamage: Partial<Record<string, number>> = {};
    bay.weapons?.forEach((w) => {
      if (w && WEAPON_TYPES[w.type]) {
        bayPerTypeDamage[w.type] = Math.floor(
          Math.floor(WEAPON_TYPES[w.type].damage * bayLevelBonus) * bonusMultiplier,
        );
      }
    });

    const damage = calculateAllDamage(
      bayWeapons,
      finalDamagePerWeapon,
      bayDamageMultiplier,
      remainingShields,
      bayAccuracyModifier,
      droneStacks,
      laserDamageBonus,
      bayPerTypeDamage,
    );

    remainingShields = damage.remainingShields;

    if (damage.totalShieldDamage === 0 && damage.totalModuleDamage === 0) {
      damage.logs.forEach((log) => get().addLog(log, "combat"));
      continue;
    }

    anyHit = true;
    totalShieldDamageDealt += damage.totalShieldDamage;
    if (damage.totalModuleDamage > 0) {
      lastHitModuleId = tgtMod.id;
      lastHitModuleName = tgtMod.name;
    }

    applyDamageToEnemy(set, get, tgtMod, damage, shieldsBeforeBay, combatFlags, bayWeapons);

    // Boss take-damage effects
    if (combatNow.enemy.isBoss && damage.totalModuleDamage > 0) {
      applyBossTakeDamageEffects(get(), set, get, damage.totalModuleDamage);
    }

    damage.logs.forEach((log) => get().addLog(log, "combat"));

    // Symbiotic armor heal
    const totalDealt = damage.totalShieldDamage + damage.totalModuleDamage;
    if (totalDealt > 0) {
      currentState.crew.forEach((c) => {
        if (c.race === "xenosymbiont" && c.augmentation) {
          const augEffect = AUGMENTATIONS[c.augmentation]?.effect;
          if (augEffect?.damageToHp) {
            const heal = Math.floor(totalDealt * augEffect.damageToHp);
            if (heal > 0) {
              set((s) => {
                const m = s.crew.find((x) => x.id === c.id);
                if (m) m.health = Math.min(100, m.health + heal);
              });
              get().addLog(`🧬 ${c.name} симбиоз: +${heal} HP`, "info");
            }
          }
        }
      });
    }

    // Shield module destroyed: recalc enemy shield pool
    if (damage.totalModuleDamage > 0 && tgtMod.type === "shield") {
      const updatedTgt = get().currentCombat?.enemy.modules.find((m) => m.id === tgtMod.id);
      if (updatedTgt && updatedTgt.health <= 0) {
        const aliveShieldMods = get().currentCombat?.enemy.modules.filter(
          (m) => m.type === "shield" && m.health > 0,
        ) ?? [];
        if (aliveShieldMods.length === 0) {
          set((s) => {
            if (!s.currentCombat) return;
            s.currentCombat.enemy.shields = 0;
            s.currentCombat.enemy.maxShields = 0;
            s.currentCombat.enemy.shieldRegenRate = undefined;
          });
          get().addLog("💥 Последний щитовой модуль уничтожен! Щиты обнулены!", "combat");
          remainingShields = 0;
        }
      }
    }

    // Victory check after each bay
    const updatedCombat = get().currentCombat;
    const reactorMod = updatedCombat?.enemy.modules.find((m) => m.type === "reactor");
    const isVictory = reactorMod
      ? reactorMod.health <= 0
      : updatedCombat?.enemy.modules.every((m) => m.health <= 0) ?? false;

    if (isVictory) {
      if (updatedCombat?.enemy.isBoss && checkBossResurrect(set, get)) {
        // Boss resurrected — continue
      } else {
        if (reactorMod?.health === 0) {
          get().addLog("💥 РЕАКТОР ВРАГА УНИЧТОЖЕН! Корабль разрушен!", "combat");
        }
        if (updatedCombat) {
          handleVictory(currentState, set, get, updatedCombat, weaponBays);
        }
        return;
      }
    }
  }

  // Record last hit for UI animations
  if (lastHitModuleId !== null) {
    set((s) => {
      if (!s.currentCombat) return;
      s.currentCombat.lastEnemyHit = {
        moduleId: lastHitModuleId,
        moduleName: lastHitModuleName,
        shieldDamage: totalShieldDamageDealt,
        hullDamage: 1,
      };
    });
  }

  if (!anyHit) {
    get().addLog("Все выстрелы промахнулись!", "warning");
  }

  handleEnemyCounterAttack(currentState, set, get);

  set((s) => {
    if (!s.currentCombat) return;
    s.currentCombat.enemy.selectedModule = null;
  });

  get().updateShipStats();
  get().nextTurn();
  applyAlienPresencePenalty(set, get);
}
