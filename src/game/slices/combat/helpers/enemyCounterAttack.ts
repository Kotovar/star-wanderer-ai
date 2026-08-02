import { store as i18nStore } from "@/lib/useTranslation";
import type { GameState, GameStore, Module } from "@/game/types";
import type { CombatProjectileEvent } from "@/game/types/combatCinematics";
import { playCombatSound } from "./combatSound";
import { getArtifactEffectValue, findActiveArtifact } from "@/game/artifacts";
import { getPilotInCockpit } from "@/game/crew";
import { ARTIFACT_TYPES } from "@/game/constants";
import { COMBAT_ACCURACY_MODIFIERS } from "@/game/constants/combat";
import { PILOT_EVASION_COMBAT_EXP } from "@/game/constants/experience";
import { getTotalEvasion } from "@/game/slices/ship/helpers/getTotalEvasion";
import { shouldPhaseShieldAbsorb } from "@/game/research/specialAbilities";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers/mergeEffects";
import { isModuleActive } from "@/game/modules/utils";
import { applyModuleDamage } from "./moduleDamage";
import { getBossAttackModifiers, processBossRegeneration } from "./bossAbilities";
import {
    appendCombatSnapshotDamageEvents,
    appendCombatSnapshotDeltaEvents,
    appendCombatSnapshotSecondaryDamageEvents,
    buildEnemyVolleyProjectileEvents,
    createCombatCinematicSnapshot,
    getProjectileOutcome,
    type CombatTimelineCollector,
} from "./combatTimeline";
import * as enemyAttack from "./enemyAttack";
import {
    getActivePointDefense,
    getModulePointDefenseChance,
    getPointDefenseOperatorBonus,
} from "./pointDefense";
import {
    DEFAULT_MODULE_PRIORITY,
    MODULE_HEALTH_PRIORITY,
    MODULE_TARGET_PRIORITY,
} from "./combatConstants";

const createCombatHitEventId = () => Date.now() + Math.random();

function recordPlayerHit(
    set: (fn: (s: GameState) => void) => void,
    targetModule: Module,
    shieldDamage: number,
    hullDamage: number,
    isCrit = false,
    missed = false,
) {
    set((s) => {
        if (!s.currentCombat) return;
        s.currentCombat.lastPlayerHit = {
            eventId: createCombatHitEventId(),
            moduleId: targetModule.id,
            moduleName: targetModule.name,
            shieldDamage,
            hullDamage,
            isCrit,
            missed,
        };
    });
}

/** Записывает промах по цели (0 урона, флаг missed) — общий случай уклонения и саботажа. */
const recordMiss = (set: (fn: (s: GameState) => void) => void, tgt: Module) => {
    recordPlayerHit(set, tgt, 0, 0, false, true);
    playCombatSound("combat_miss");
};

function pushEnemyProjectile(
    timeline: CombatTimelineCollector | undefined,
    target: Module,
    shieldDamage: number,
    hullDamage: number,
    isCrit = false,
    outcome: CombatProjectileEvent["outcome"] = shieldDamage === 0 && hullDamage === 0
        ? "blocked"
        : getProjectileOutcome(shieldDamage, hullDamage),
    enemyWeapon?: string,
    interceptorModuleId?: number,
    sourceModuleId?: number,
    volleyId?: number,
): CombatProjectileEvent | null {
    if (!timeline) return null;
    const event: CombatProjectileEvent = {
        kind: "projectile",
        from: "enemy",
        to: "player",
        weapon: "enemy",
        targetModuleId: target.id,
        outcome,
        shieldDamage,
        hullDamage,
        isCrit,
        ...(enemyWeapon === undefined ? {} : { enemyWeapon }),
        ...(interceptorModuleId === undefined ? {} : { interceptorModuleId }),
        ...(sourceModuleId === undefined ? {} : { sourceModuleId }),
        ...(volleyId === undefined ? {} : { volleyId }),
    };
    timeline.push(event);
    return event;
}

/** Живые орудия врага — по одному выстрелу на каждое. */
function getEnemyGuns(
    combat: NonNullable<GameState["currentCombat"]>,
    excludedGunId?: number,
) {
    return combat.enemy.modules.filter(
        (module) =>
            module.id !== excludedGunId &&
            module.health > 0 &&
            (module.damage ?? 0) > 0,
    ).map((module) => ({
        ...module,
        type: module.weaponKind ?? module.type,
    }));
}

/**
 * Разносит уже посчитанный урон залпа по орудиям врага — один снаряд на живое
 * орудие вместо одного общего болта. Сумма долей равна исходному урону, поэтому
 * баланс не меняется: игрок просто видит, из чего именно по нему стреляют и что
 * даёт уничтожение конкретной пушки.
 */
function pushEnemyVolley(
    timeline: CombatTimelineCollector | undefined,
    combat: NonNullable<GameState["currentCombat"]>,
    target: Module,
    shieldDamage: number,
    hullDamage: number,
    isCrit: boolean,
    outcome: CombatProjectileEvent["outcome"] | undefined,
    excludedGunId?: number,
    isEvasion = false,
    repetitions = 1,
): CombatProjectileEvent[] {
    if (!timeline) return [];
    const events = buildEnemyVolleyProjectileEvents(
        getEnemyGuns(combat, excludedGunId),
        target.id,
        shieldDamage,
        hullDamage,
        isCrit,
        outcome,
        repetitions,
    );
    const visualEvents = isEvasion
        ? events.map((event) => ({ ...event, isEvasion: true }))
        : events;
    timeline.push(...visualEvents);
    return visualEvents;
}

/**
 * Handles enemy counter-attack after player attack (used mid-round, following
 * the player's own attack — regenerates enemy shields first, per round rules).
 */
export function handleEnemyCounterAttack(
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
    timeline?: CombatTimelineCollector,
) {
    performEnemyAttack(set, get, { regenShieldsFirst: true }, timeline);
}

/**
 * Executes a full enemy attack against the player's ship: target selection,
 * evasion/sabotage/artifact/phase-shield checks, damage application, and all
 * boss-modifier side effects (shield break, heal-on-damage, turn skip).
 *
 * Shared by two call shapes:
 * - `handleEnemyCounterAttack` — enemy's counter-turn after the player attacks
 *   (regenerates enemy shields first, per round rules).
 * - `executeEnemyAttack` (executeEnemyAttack.ts) — a standalone forced enemy
 *   attack (ambush, `processEnemyAttack` action) that does NOT regen shields
 *   first, since it isn't part of the normal round structure.
 */
export function performEnemyAttack(
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
    options: { regenShieldsFirst: boolean },
    timeline?: CombatTimelineCollector,
) {
    if (!get().currentCombat) return;

    if (options.regenShieldsFirst) {
        // Skipped if player broke shields to 0 this round (see enemyShieldsJustBroken flag).
        const restored = processEnemyShieldRegen(set, get);
        if (restored > 0) {
            timeline?.push({
                kind: "shield_restore",
                side: "enemy",
                amount: restored,
                source: "regen",
            });
        }
    }

    // Состояние читается здесь, а не приходит от вызывающего: его снимок сделан
    // ДО залпа игрока, и по нему враг стрелял из орудийных модулей, которые
    // игрок только что уничтожил.
    const state: GameState = get();
    const combat = state.currentCombat;
    if (!combat) return;

    const eDmg = enemyAttack.calculateEnemyDamage(combat.enemy.modules);

    if (eDmg <= 0) {
        get().addLog( i18nStore.t("game_logs.enemyCounterAttack_1"),
            "info",
        );
        return;
    }

    // Attack modifiers from alive passive modules (bosses and space monsters alike)
    const aliveBossMods = combat.enemy.modules.filter((m) => m.health > 0);
    const bossModifiers = getBossAttackModifiers(
        aliveBossMods,
        combat.enemy.bossAttackCount ?? 0,
    );

    // Apply guaranteed crit and multi_hit
    let finalDamage = eDmg;
    let isCrit = false;
    if (bossModifiers) {
        if (bossModifiers.isGuaranteedCrit) {
            finalDamage = Math.floor(finalDamage * 1.5);
            isCrit = true;
            get().addLog( i18nStore.t("game_logs.enemyCounterAttack_2"), "error");
        }
        finalDamage = Math.floor(finalDamage * bossModifiers.multiHitCount);
    }

    // Select target module
    const activeMods = state.ship.modules.filter((m) => m.health > 0);
    const tgt = selectTargetModule(activeMods, get);
    if (!tgt) return;
    playCombatSound("combat_enemy_fire");

    // Evasion check
    const evasionChance = getTotalEvasion(state) / 100;
    if (evasionChance > 0 && Math.random() < evasionChance) {
        // Опыт за уклонение — пилоту за штурвалом (он и дал уклонение)
        const pilot = getPilotInCockpit(state.crew, state.ship.modules);
        const hasEvasion = pilot?.combatAssignment === "evasion";
        const evasionSource = i18nStore.t(
            hasEvasion ? "game_logs.evade_maneuvers" : "game_logs.evade_plain",
            { chance: Math.round(evasionChance * 100) },
        );
        get().addLog(
            pilot
                ? i18nStore.t("game_logs.evade_pilot", { name: pilot.name, source: evasionSource })
                : i18nStore.t("game_logs.evade_ship", { source: evasionSource }),
            "info",
        );
        recordMiss(set, tgt);
        pushEnemyVolley(timeline, combat, tgt, 0, 0, false, "miss", undefined, true);
        if (pilot) get().gainExp(pilot, PILOT_EVASION_COMBAT_EXP);
        return;
    }

    // Sabotage check (scales with scout level)
    const scoutWithSabotage = state.crew.find(
        (c) =>
            c.profession === "scout" && c.combatAssignment === "sabotage",
    );
    if (scoutWithSabotage) {
        const sabotageChance =
            Math.abs(COMBAT_ACCURACY_MODIFIERS.SABOTAGE_PENALTY) +
            (scoutWithSabotage.level ?? 1) * 0.01;
        if (Math.random() < sabotageChance) {
            get().addLog( i18nStore.t("game_logs.enemyCounterAttack_3"), "info");
            recordMiss(set, tgt);
            pushEnemyProjectile(timeline, tgt, 0, 0, false, "miss");
            return;
        }
    }

    const activePlayerModules = state.ship.modules.filter(isModuleActive);
    const playerPointDefense = getActivePointDefense(activePlayerModules);
    const missileLauncher = combat.enemy.modules.find(
        (module) =>
            module.health > 0 && module.weaponKind === "missile_launcher",
    );
    const canInterceptEnemyVolley =
        !combat.enemy.bossId &&
        !combat.enemy.spaceMonsterType &&
        missileLauncher !== undefined;
    const pointDefenseChance = canInterceptEnemyVolley
        ? getModulePointDefenseChance("missile", activePlayerModules, {
              operatorBonus: getPointDefenseOperatorBonus(
                  state.crew,
                  activePlayerModules,
              ),
              mergeBonus:
                  (getMergeEffectsBonus(state.crew, state.ship.modules)
                      .pointDefense ?? 0) / 100,
          })
        : 0;
    const interceptedMissileLauncher =
        pointDefenseChance > 0 && Math.random() < pointDefenseChance
            ? missileLauncher
            : undefined;
    if (interceptedMissileLauncher) {
        get().addLog(i18nStore.t("game_logs.point_defense_intercept"), "info");
        pushEnemyProjectile(
            timeline,
            tgt,
            0,
            0,
            false,
            "intercepted",
            "missile_launcher",
            playerPointDefense?.id,
            interceptedMissileLauncher.id,
            interceptedMissileLauncher.id,
        );
        finalDamage -= interceptedMissileLauncher.damage ?? 0;
        if (finalDamage <= 0) return;
    }

    // Mirror Shield check
    const mirrorShield = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.MIRROR_SHIELD,
    );
    if (
        mirrorShield &&
        Math.random() < getArtifactEffectValue(mirrorShield, state)
    ) {
        playCombatSound("combat_miss");
        const reflection = reflectAttack(state, set, get, eDmg, combat);
        if (reflection) {
            timeline?.push({
                kind: "reflection",
                attacker: "enemy",
                defender: "player",
                targetModuleId: reflection.targetModuleId,
                shieldDamage: reflection.shieldDamage,
                hullDamage: reflection.hullDamage,
            });
            if (reflection.destroyed) {
                timeline?.push({
                    kind: "module_destroyed",
                    side: "enemy",
                    moduleId: reflection.targetModuleId,
                });
            }
        }
        return;
    }

    // Phase Shield: 20% chance to nullify attack if shields >= 20% of max
    if (
        shouldPhaseShieldAbsorb(
            state.research.researchedTechs,
            state.ship.shields,
            state.ship.maxShields,
        )
    ) {
        get().addLog( i18nStore.t("game_logs.enemyCounterAttack_4"), "info");
        recordMiss(set, tgt);
        pushEnemyProjectile(timeline, tgt, 0, 0, false, "absorbed");
        return;
    }

    // Apply damage
    const shieldPierce = bossModifiers?.shieldPiercePercent ?? 0;
    const ignoreDefense = bossModifiers?.ignoreDefense ?? false;
    const targetHealthBefore = get().ship.modules.find((module) => module.id === tgt.id)
        ?.health ?? tgt.health;
    const beforeDirectHit = timeline ? createCombatCinematicSnapshot(get()) : null;
    let crewImmortalityModuleId: number | undefined;
    const onCrewImmortality = timeline
        ? (moduleId: number) => { crewImmortalityModuleId = moduleId; }
        : undefined;
    if (state.ship.shields > 0) {
        applyDamageWithShields(
            state,
            set,
            get,
            finalDamage,
            tgt,
            shieldPierce,
            ignoreDefense,
            isCrit,
            onCrewImmortality,
        );
    } else {
        applyDamageNoShields(
            state,
            set,
            get,
            finalDamage,
            tgt,
            ignoreDefense,
            isCrit,
            onCrewImmortality,
        );
    }

    const hit = get().currentCombat?.lastPlayerHit;
    let volleyEvents: CombatProjectileEvent[] = [];
    if (hit?.moduleId === tgt.id) {
        const outcome =
            shieldPierce > 0 && hit.shieldDamage > 0 && hit.hullDamage > 0
                ? "piercing"
                : undefined;
        volleyEvents = pushEnemyVolley(
            timeline,
            combat,
            tgt,
            hit.shieldDamage,
            hit.hullDamage,
            hit.isCrit ?? false,
            outcome,
            interceptedMissileLauncher?.id,
            false,
            bossModifiers?.multiHitCount,
        );
    }
    const targetHealthAfter = get().ship.modules.find((module) => module.id === tgt.id)
        ?.health;
    if (targetHealthBefore > 0 && targetHealthAfter !== undefined && targetHealthAfter <= 0) {
        timeline?.push({ kind: "module_destroyed", side: "player", moduleId: tgt.id });
    }
    const afterDirectHit = timeline ? createCombatCinematicSnapshot(get()) : null;
    if (timeline && beforeDirectHit && afterDirectHit && volleyEvents.length > 0) {
        appendCombatSnapshotSecondaryDamageEvents(
            timeline,
            beforeDirectHit,
            afterDirectHit,
            volleyEvents,
        );
    }
    if (crewImmortalityModuleId !== undefined) {
        timeline?.push({
            kind: "crew_immortality",
            side: "player",
            moduleId: crewImmortalityModuleId,
        });
    }

    const beforeBossEffects = timeline ? createCombatCinematicSnapshot(get()) : null;
    applyBossAttackSideEffects(bossModifiers, finalDamage, combat, set, get, timeline);
    const afterBossEffects = timeline ? createCombatCinematicSnapshot(get()) : null;
    if (timeline && beforeBossEffects && afterBossEffects) {
        appendCombatSnapshotDamageEvents(timeline, beforeBossEffects, afterBossEffects);
        appendCombatSnapshotDeltaEvents(
            timeline,
            beforeBossEffects,
            afterBossEffects,
            "lifesteal",
        );
    }
    cleanupAfterEnemyAttack(state, set, get, timeline);
}

/** Побочные эффекты атаки босса: счётчик атак, пробитие щита, лечение от урона, пропуск хода игрока. */
function applyBossAttackSideEffects(
    bossModifiers: ReturnType<typeof getBossAttackModifiers>,
    finalDamage: number,
    combat: NonNullable<GameState["currentCombat"]>,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
    timeline?: CombatTimelineCollector,
) {
    // Increment boss attack count
    if (combat.enemy.isBoss) {
        set((s) => {
            if (!s.currentCombat) return;
            s.currentCombat.enemy.bossAttackCount =
                (s.currentCombat.enemy.bossAttackCount ?? 0) + 1;
        });
    }

    // Shield break
    if (bossModifiers && bossModifiers.shieldBreakAmount > 0 && get().ship.shields > 0) {
        const shieldsBefore = get().ship.shields;
        set((s) => {
            s.ship.shields = Math.max(0, s.ship.shields - bossModifiers.shieldBreakAmount);
        });
        if (shieldsBefore <= bossModifiers.shieldBreakAmount) {
            playCombatSound("combat_shield_break");
        }
        get().addLog( i18nStore.t("game_logs.enemyCounterAttack_5", { shieldBreakAmount: bossModifiers.shieldBreakAmount }), "warning");
    }

    // Heal on damage
    if (bossModifiers && bossModifiers.healOnDamagePercent > 0) {
        const healAmount = Math.floor((finalDamage * bossModifiers.healOnDamagePercent) / 100);
        if (healAmount > 0) {
            set((s) => {
                if (!s.currentCombat) return;
                s.currentCombat.enemy.modules.forEach((m) => {
                    if (m.health > 0)
                        m.health = Math.min(m.maxHealth ?? 100, m.health + healAmount);
                });
            });
            get().addLog( i18nStore.t("game_logs.enemyCounterAttack_6", { healAmount }), "warning");
        }
    }

    // Turn skip
    if (
        bossModifiers &&
        bossModifiers.turnSkipChance > 0 &&
        Math.random() * 100 < bossModifiers.turnSkipChance
    ) {
        set((s) => {
            if (!s.currentCombat) return;
            s.currentCombat.skipPlayerTurn = true;
        });
        get().addLog( i18nStore.t("game_logs.enemyCounterAttack_7"), "error");
        timeline?.push({ kind: "turn_skip_applied", side: "player" });
    }
}

/** Уборка после атаки врага: погибший экипаж, регенерация босса, проверка поражения, сброс выделения. */
function cleanupAfterEnemyAttack(
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
    timeline?: CombatTimelineCollector,
) {
    // Remove dead crew
    const deadCrew = get().crew.filter((c) => c.health <= 0);
    if (deadCrew.length > 0) {
        set((s) => ({ crew: s.crew.filter((c) => c.health > 0) }));
        get().addLog( i18nStore.t("game_logs.enemyCounterAttack_8", { value: deadCrew.map((c) => c.name).join(", ") }),
            "error",
        );
    }

    // Boss regeneration
    processBossRegeneration(state, set, get, timeline);

    get().checkGameOver();

    // Clear selection (harmless no-op if already cleared elsewhere, e.g.
    // finishPlayerTurn after handleEnemyCounterAttack)
    set((s) => {
        if (!s.currentCombat) return;
        s.currentCombat.enemy.selectedModule = null;
    });
}

/**
 * Selects target module by priority
 */
function selectTargetModule(
    activeMods: Module[],
    get: () => GameStore,
): Module | null {
    if (activeMods.length === 0) return null;

    const getModuleTargetPriority = (m: Module): number => {
        let priority = 0;
        const crewInModule = get().crew.filter((c) => c.moduleId === m.id);

        priority = MODULE_TARGET_PRIORITY[m.type] ?? DEFAULT_MODULE_PRIORITY;

        if (m.health < MODULE_HEALTH_PRIORITY.LOW)
            priority += MODULE_HEALTH_PRIORITY.LOW_BONUS;
        else if (m.health < MODULE_HEALTH_PRIORITY.MIDDLE)
            priority += MODULE_HEALTH_PRIORITY.MIDDLE_BONUS;
        else if (m.health < MODULE_HEALTH_PRIORITY.HIGH)
            priority += MODULE_HEALTH_PRIORITY.HIGH_BONUS;

        priority += crewInModule.length * MODULE_HEALTH_PRIORITY.LENGTH_BONUS;
        priority += Math.random() * MODULE_HEALTH_PRIORITY.RANDOM_BONUS;

        return priority;
    };

    const sortedMods = [...activeMods].sort(
        (a, b) => getModuleTargetPriority(b) - getModuleTargetPriority(a),
    );
    return sortedMods[0];
}

/**
 * Reflects attack with Mirror Shield
 */
function reflectAttack(
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
    eDmg: number,
    combat: NonNullable<GameState["currentCombat"]>,
): {
    targetModuleId: number;
    shieldDamage: number;
    hullDamage: number;
    destroyed: boolean;
} | null {
    const aliveModules = combat.enemy.modules.filter((m) => m.health > 0);
    if (aliveModules.length === 0) return null;

    const reflectedTarget =
        aliveModules[Math.floor(Math.random() * aliveModules.length)];
    const targetWasAlive = reflectedTarget.health > 0;
    let remainingDamage = eDmg;
    let shieldDamage = 0;

    if (combat.enemy.shields > 0) {
        const shieldAbsorb = Math.min(combat.enemy.shields, remainingDamage);
        set((s) => {
            if (!s.currentCombat) return;
            s.currentCombat.enemy.shields -= shieldAbsorb;
        });
        shieldDamage = shieldAbsorb;
        remainingDamage -= shieldAbsorb;
        get().addLog( i18nStore.t("game_logs.enemyCounterAttack_9", { shieldAbsorb }), "info");
    }

    if (remainingDamage > 0) {
        set((s) => {
            if (!s.currentCombat) return;
            const mod = s.currentCombat.enemy.modules.find(
                (m) => m.id === reflectedTarget.id,
            );
            if (mod) mod.health = Math.max(0, mod.health - remainingDamage);
        });
        get().addLog( i18nStore.t("game_logs.enemyCounterAttack_10", { reflectedTarget_name: reflectedTarget.name, remainingDamage }),
            "info",
        );
    }

    const targetAfterReflection = get().currentCombat?.enemy.modules.find(
        (module) => module.id === reflectedTarget.id,
    );
    return {
        targetModuleId: reflectedTarget.id,
        shieldDamage,
        hullDamage: remainingDamage,
        destroyed: targetWasAlive && targetAfterReflection?.health === 0,
    };
}

/**
 * Applies damage with shields
 * @param shieldPiercePercent - % of damage that bypasses shields
 * @param ignoreDefense - bypass module armor
 */
function applyDamageWithShields(
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
    eDmg: number,
    tgt: Module,
    shieldPiercePercent = 0,
    ignoreDefense = false,
    isCrit = false,
    onCrewImmortality?: (moduleId: number) => void,
) {
    // Split damage: piercing portion bypasses shields
    const piercingDamage = shieldPiercePercent > 0
        ? Math.floor((eDmg * shieldPiercePercent) / 100)
        : 0;
    const normalDamage = eDmg - piercingDamage;
    let hullDamageDealt = 0;
    let shieldsBroken = false;

    if (piercingDamage > 0) {
        get().addLog( i18nStore.t("game_logs.enemyCounterAttack_11", { piercingDamage }), "warning");
        hullDamageDealt += applyModuleDamage(
            state,
            set,
            get,
            piercingDamage,
            tgt,
            false,
            onCrewImmortality,
        );
    }

    let shieldDamageDealt = 0;

    if (normalDamage > 0) {
        const shieldsBefore = get().ship.shields;
        const sDmg = Math.min(shieldsBefore, normalDamage);
        shieldDamageDealt = sDmg;
        set((s) => ({ ship: { ...s.ship, shields: s.ship.shields - sDmg } }));
        // Пробитие: щиты упали в 0 — реген игрока пропустит один ход
        // (зеркально enemyShieldsJustBroken)
        if (sDmg > 0 && shieldsBefore - sDmg === 0) {
            shieldsBroken = true;
            set((s) => {
                if (!s.currentCombat) return;
                s.currentCombat.playerShieldsJustBroken = true;
            });
        }
        get().addLog( i18nStore.t("game_logs.enemyCounterAttack_12", { sDmg }), "warning");

        const overflow = normalDamage - sDmg;
        if (overflow > 0) {
            hullDamageDealt += applyModuleDamage(
                state,
                set,
                get,
                overflow,
                tgt,
                ignoreDefense,
                onCrewImmortality,
            );
        }
    }

    recordPlayerHit(set, tgt, shieldDamageDealt, hullDamageDealt, isCrit);
    if (shieldDamageDealt > 0) playCombatSound("combat_shield_hit");
    if (shieldsBroken) playCombatSound("combat_shield_break");
    if (hullDamageDealt > 0) playCombatSound("combat_hull_hit");
    if (isCrit && (shieldDamageDealt > 0 || hullDamageDealt > 0)) {
        playCombatSound("combat_critical");
    }
}

/**
 * Regenerates enemy shields at the START of each enemy turn.
 * Skipped if player broke shields to 0 this round (flag cleared here).
 * Skips bosses (they have their own ability-based shield mechanics).
 */
function processEnemyShieldRegen(
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): number {
    const combat = get().currentCombat;
    if (!combat) return 0;

    // If player just broke shields this turn — skip regen, clear flag
    if (combat.enemyShieldsJustBroken) {
        set((s) => {
            if (!s.currentCombat) return;
            s.currentCombat.enemyShieldsJustBroken = false;
        });
        return 0;
    }

    const regenRate = combat.enemy.shieldRegenRate;
    if (!regenRate || regenRate <= 0) return 0;
    const current = combat.enemy.shields;
    const max = combat.enemy.maxShields;
    if (current >= max) return 0;

    const restored = Math.min(regenRate, max - current);
    set((s) => {
        if (!s.currentCombat) return;
        s.currentCombat.enemy.shields = current + restored;
    });
    get().addLog( i18nStore.t("game_logs.enemyCounterAttack_13", { restored, restored2: current + restored, max }),
        "info",
    );
    return restored;
}

/**
 * Applies damage without shields
 */
function applyDamageNoShields(
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
    eDmg: number,
    tgt: Module,
    ignoreDefense = false,
    isCrit = false,
    onCrewImmortality?: (moduleId: number) => void,
) {
    const actualDamage = applyModuleDamage(
        state,
        set,
        get,
        eDmg,
        tgt,
        ignoreDefense,
        onCrewImmortality,
    );
    recordPlayerHit(set, tgt, 0, actualDamage, isCrit);
    if (actualDamage > 0) playCombatSound("combat_hull_hit");
    if (isCrit && actualDamage > 0) playCombatSound("combat_critical");
}
