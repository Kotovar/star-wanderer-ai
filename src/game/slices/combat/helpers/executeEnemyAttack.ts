import { store as i18nStore } from "@/lib/useTranslation";
import { getArtifactEffectValue, findActiveArtifact } from "@/game/artifacts";
import { getPilotInCockpit } from "@/game/crew";
import {
    ARTIFACT_TYPES,
    COMBAT_ACCURACY_MODIFIERS,
    PILOT_EVASION_COMBAT_EXP,
} from "@/game/constants";
import { getTotalEvasion } from "@/game/slices/ship/helpers/getTotalEvasion";
import { shouldPhaseShieldAbsorb } from "@/game/research/specialAbilities";
import type { GameState, GameStore } from "@/game/types";
import * as enemyAttack from "./enemyAttack";
import {
    getBossAttackModifiers,
    processBossRegeneration,
} from "./bossAbilities";
import {
    selectTargetModule,
    reflectAttack,
    applyDamageWithShields,
    applyDamageNoShields,
    recordPlayerHit,
} from "./enemyCounterAttack";

/**
 * Обрабатывает атаку врага по кораблю игрока
 */
export function executeEnemyAttack(
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
) {
    const combat = state.currentCombat;
    if (!combat) return;

    // Calculate enemy damage from alive modules
    const eDmg = enemyAttack.calculateEnemyDamage(combat.enemy.modules);
    if (eDmg <= 0) {
        get().addLog( i18nStore.t("game_logs.executeEnemyAttack_1"),
            "info",
        );
        return;
    }

    // Boss attack modifiers (from alive passive modules)
    const aliveBossMods = combat.enemy.isBoss
        ? combat.enemy.modules.filter((m) => m.health > 0)
        : [];
    const bossModifiers = combat.enemy.isBoss
        ? getBossAttackModifiers(
              aliveBossMods,
              combat.enemy.bossAttackCount ?? 0,
          )
        : null;

    // Apply guaranteed crit and multi_hit multipliers
    let finalDamage = eDmg;
    let isCrit = false;
    if (bossModifiers) {
        if (bossModifiers.isGuaranteedCrit) {
            finalDamage = Math.floor(finalDamage * 1.5);
            isCrit = true;
            get().addLog( i18nStore.t("game_logs.executeEnemyAttack_2"), "error");
        }
        finalDamage = Math.floor(finalDamage * bossModifiers.multiHitCount);
    }

    // Select target module by priority
    const activeMods = state.ship.modules.filter((m) => m.health > 0);
    const targetModule = selectTargetModule(activeMods, get);
    if (!targetModule) return;

    // Evasion check
    const evasionChance = getTotalEvasion(state) / 100;
    if (evasionChance > 0 && Math.random() < evasionChance) {
        // Опыт за уклонение — пилоту за штурвалом (он и дал уклонение)
        const pilot = getPilotInCockpit(state.crew, state.ship.modules);
        get().addLog(
            pilot
                ? i18nStore.t("game_logs.evade_pilot_pct", { name: pilot.name, chance: Math.round(evasionChance * 100) })
                : i18nStore.t("game_logs.evade_ship_pct", { chance: Math.round(evasionChance * 100) }),
            "info",
        );
        recordPlayerHit(set, targetModule, 0, 0, false, true);
        if (pilot) get().gainExp(pilot, PILOT_EVASION_COMBAT_EXP);
        return;
    }

    // phase_step: handled per-crew-member below in the damage loop

    // Sabotage check — scout's sabotage gives enemy a miss chance (scales with level)
    const scoutWithSabotage = state.crew.find(
        (c) => c.combatAssignment === "sabotage",
    );
    if (scoutWithSabotage) {
        const sabotageChance =
            Math.abs(COMBAT_ACCURACY_MODIFIERS.SABOTAGE_PENALTY) +
            (scoutWithSabotage.level ?? 1) * 0.01;
        if (Math.random() < sabotageChance) {
            get().addLog( i18nStore.t("game_logs.executeEnemyAttack_3"), "info");
            recordPlayerHit(set, targetModule, 0, 0, false, true);
            return;
        }
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
        reflectAttack(state, set, get, eDmg, combat);
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
        get().addLog( i18nStore.t("game_logs.executeEnemyAttack_4"),
            "info",
        );
        recordPlayerHit(set, targetModule, 0, 0, false, true);
        return;
    }

    // Apply damage to ship
    const shieldPierce = bossModifiers?.shieldPiercePercent ?? 0;
    const ignoreDefense = bossModifiers?.ignoreDefense ?? false;
    if (state.ship.shields > 0) {
        applyDamageWithShields(
            state,
            set,
            get,
            finalDamage,
            targetModule,
            shieldPierce,
            ignoreDefense,
            isCrit,
        );
    } else {
        applyDamageNoShields(
            state,
            set,
            get,
            finalDamage,
            targetModule,
            ignoreDefense,
            isCrit,
        );
    }

    // Increment boss attack count
    if (combat.enemy.isBoss) {
        set((s) => {
            if (!s.currentCombat) return;
            s.currentCombat.enemy.bossAttackCount =
                (s.currentCombat.enemy.bossAttackCount ?? 0) + 1;
        });
    }

    // Shield break: strip extra shields after attack
    if (
        bossModifiers &&
        bossModifiers.shieldBreakAmount > 0 &&
        get().ship.shields > 0
    ) {
        set((s) => {
            s.ship.shields = Math.max(
                0,
                s.ship.shields - bossModifiers.shieldBreakAmount,
            );
        });
        get().addLog( i18nStore.t("game_logs.executeEnemyAttack_5", { shieldBreakAmount: bossModifiers.shieldBreakAmount }),
            "warning",
        );
    }

    // Heal on damage
    if (bossModifiers && bossModifiers.healOnDamagePercent > 0) {
        const healAmount = Math.floor(
            (finalDamage * bossModifiers.healOnDamagePercent) / 100,
        );
        if (healAmount > 0) {
            set((s) => {
                if (!s.currentCombat) return;
                s.currentCombat.enemy.modules.forEach((m) => {
                    if (m.health > 0)
                        m.health = Math.min(
                            m.maxHealth ?? 100,
                            m.health + healAmount,
                        );
                });
            });
            get().addLog( i18nStore.t("game_logs.executeEnemyAttack_6", { healAmount }), "warning");
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
        get().addLog( i18nStore.t("game_logs.executeEnemyAttack_7"),
            "error",
        );
    }

    // Check for dead crew
    const deadCrew = get().crew.filter((c) => c.health <= 0);
    if (deadCrew.length > 0) {
        set((s) => ({ crew: s.crew.filter((c) => c.health > 0) }));
        get().addLog( i18nStore.t("game_logs.executeEnemyAttack_8", { value: deadCrew.map((c) => c.name).join(", ") }),
            "error",
        );
    }

    // Boss regeneration and special abilities
    processBossRegeneration(state, set, get);

    // Check defeat
    get().checkGameOver();

    // Clear selection
    set((s) => {
        if (!s.currentCombat) return;
        s.currentCombat.enemy.selectedModule = null;
    });
}
