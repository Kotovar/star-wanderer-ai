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
    processLaserDamage,
    processKineticDamage,
    processMissileDamage,
    processPlasmaDamage,
    processDronesDamage,
    processAntimatterDamage,
    processQuantumTorpedoDamage,
} from "./playerDamage";
import { handleVictory } from "./playerVictory";
import { handleEnemyCounterAttack } from "./enemyCounterAttack";
import { applyAlienPresencePenalty } from "./alienPresence";
import { BASE_CRIT_CHANCE, BASE_CRIT_MULTIPLIER } from "@/game/constants";

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
 */
function calculateAllDamage(
    weaponCounts: WeaponCounts,
    finalDamagePerWeapon: number,
    damageMultiplier: number,
    enemyShields: number,
    accuracyModifier: number,
    droneStacks: number,
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
    };

    const getAccuracy = (type: WeaponType) =>
        getWeaponAccuracy(type, accuracyModifier);

    if (weaponCounts.laser > 0) {
        const result = processLaserDamage(
            weaponCounts.laser,
            finalDamagePerWeapon,
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
            finalDamagePerWeapon,
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
            finalDamagePerWeapon,
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
            finalDamagePerWeapon,
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
            finalDamagePerWeapon,
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
            finalDamagePerWeapon,
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
            finalDamagePerWeapon,
            damageMultiplier,
            getAccuracy("quantum_torpedo"),
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
    if (missedShots.quantum_torpedo > 0)
        logs.push(
            `❌ ${missedShots.quantum_torpedo} торпеда(ы) промахнул(ась)!`,
        );

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
        set((s) => {
            if (!s.currentCombat) return;
            s.currentCombat.enemy.shields = Math.max(
                0,
                enemyShields - damage.totalShieldDamage,
            );
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
        weaponCounts.quantum_torpedo;
    if (totalWeapons === 0) return;

    // 2. Target resolution
    const tgtMod = resolveTarget(currentState, crewInWeaponBays, get);
    if (!tgtMod) return;

    // 3. Crit roll
    const crit = rollCrit(currentState, get);
    const damageMultiplier = crit.isCrit ? crit.multiplier : 1;

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
    const damage = calculateAllDamage(
        weaponCounts,
        finalDamagePerWeapon,
        damageMultiplier,
        enemyShields,
        accuracyModifier,
        droneStacks,
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

    // 8. Flush logs
    damage.logs.forEach((log) => get().addLog(log, "combat"));

    // 9. Victory check
    const updatedCombat = get().currentCombat;
    if (updatedCombat?.enemy.modules.every((m) => m.health <= 0)) {
        handleVictory(currentState, set, get, updatedCombat, weaponBays);
        return;
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
