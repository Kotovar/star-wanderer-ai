import type { GameState } from "@/game/types";
import type { BossAbilityEffectType } from "@/game/types/bosses";
import {
    BOSS_LOW_HEALTH_PERCENT,
    getBossAbilityTurnsUntilReady,
    getBossHealthPercent,
} from "./bossAbilities";

/** Способности, которые срабатывают ровно один раз за бой. */
const ONE_SHOT_EFFECTS = new Set<BossAbilityEffectType>([
    "emergency_repair",
    "shield_restore",
]);

export type BossIntentStatus =
    /** Сработает на следующем ходу врага. */
    | "imminent"
    /** Ответит на действие игрока (урон, крит, добивающий выстрел). */
    | "reactive"
    /** Условие ещё не выполнено — способность ждёт низкого здоровья. */
    | "armed"
    /** Уже израсходована за этот бой. */
    | "spent"
    /** Периодическая способность: ждёт своего хода. */
    | "pending";

export interface BossIntent {
    name: string;
    description: string;
    effect: BossAbilityEffectType;
    status: BossIntentStatus;
    /** Ходов до срабатывания, если статус `pending`. */
    turnsUntil?: number;
}

/** Способности, которые срабатывают в ответ на действие игрока, а не в свой ход. */
const REACTIVE_EFFECTS = new Set<BossAbilityEffectType>([
    "evasion_boost",
    "resurrect_chance",
]);

/**
 * Что босс сделает следующим ходом. Триггеры детерминированы (см.
 * applySpecialAbility в bossAbilities.ts), поэтому намерение выводится из
 * текущего состояния и ничего не нужно предварительно бросать или хранить.
 */
export function getBossAbilityIntent(
    combat: GameState["currentCombat"],
): BossIntent | null {
    if (!combat?.enemy.isBoss) return null;
    const ability = combat.enemy.specialAbility;
    if (!ability) return null;

    const base = {
        name: ability.name,
        description: ability.description,
        effect: ability.effect,
    };

    if (ONE_SHOT_EFFECTS.has(ability.effect) && combat.bossOneShotAbilityFired) {
        return { ...base, status: "spent" };
    }
    if (REACTIVE_EFFECTS.has(ability.effect) || ability.trigger === "on_damage") {
        return { ...base, status: "reactive" };
    }
    if (ability.trigger === "every_turn") {
        // Периодическая способность бьёт не каждый ход — обещать «следующий»
        // значит врать игроку.
        const turnsUntil = getBossAbilityTurnsUntilReady(
            ability,
            combat.enemy.bossAttackCount ?? 0,
        );
        return turnsUntil === 0
            ? { ...base, status: "imminent" }
            : { ...base, status: "pending", turnsUntil };
    }

    // Тот же расчёт, что и в applySpecialAbility — телеграф не должен врать.
    const healthPercent = getBossHealthPercent(combat.enemy.modules);

    return {
        ...base,
        status: healthPercent < BOSS_LOW_HEALTH_PERCENT ? "imminent" : "armed",
    };
}
