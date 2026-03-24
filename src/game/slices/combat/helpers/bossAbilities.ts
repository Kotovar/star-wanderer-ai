import type { GameState, GameStore } from "@/game/types";
import type { EnemyModule } from "@/game/types/enemy";
import { applyModuleDamage } from "./moduleDamage";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BossAttackModifiers {
    shieldPiercePercent: number; // % of player shields to bypass
    shieldBreakAmount: number; // extra shields stripped from player per hit
    multiHitCount: number; // damage multiplier (multi_hit)
    ignoreDefense: boolean; // bypass player module armor
    healOnDamagePercent: number; // boss heals X% of damage dealt
    isGuaranteedCrit: boolean; // this attack is a guaranteed crit
    turnSkipChance: number; // % chance to skip player's next turn
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getAliveMods(modules: EnemyModule[]): EnemyModule[] {
    return modules.filter((m) => m.health > 0);
}

function getAliveModsWithEffect(
    modules: EnemyModule[],
    effectType: string,
): EnemyModule[] {
    return modules.filter(
        (m) => m.health > 0 && m.specialEffect?.type === effectType,
    );
}

function getBossHealthPercent(modules: EnemyModule[]): number {
    const total = modules.reduce((s, m) => s + m.health, 0);
    const max = modules.reduce((s, m) => s + (m.maxHealth ?? 100), 0);
    return max > 0 ? (total / max) * 100 : 0;
}

// ─── 1. Attack modifiers (called before boss attacks) ────────────────────────

/**
 * Collects all active passive attack modifiers from alive boss modules.
 * Called before the boss deals damage to determine how the attack is modified.
 */
export function getBossAttackModifiers(
    aliveBossModules: EnemyModule[],
    bossAttackCount: number,
): BossAttackModifiers {
    let shieldPiercePercent = 0;
    let shieldBreakAmount = 0;
    let multiHitCount = 1;
    let ignoreDefense = false;
    let healOnDamagePercent = 0;
    let isGuaranteedCrit = false;
    let turnSkipChance = 0;

    for (const mod of aliveBossModules) {
        const effect = mod.specialEffect;
        if (!effect) continue;
        switch (effect.type) {
            case "shield_pierce":
                shieldPiercePercent = Math.min(
                    100,
                    shieldPiercePercent + effect.value,
                );
                break;
            case "shield_break":
                shieldBreakAmount += effect.value;
                break;
            case "multi_hit":
                // Take the highest multi_hit count
                multiHitCount = Math.max(multiHitCount, effect.value);
                break;
            case "ignore_defense":
                ignoreDefense = true;
                break;
            case "heal_on_damage":
                healOnDamagePercent += effect.value;
                break;
            case "guaranteed_crit":
                // Every N-th attack is guaranteed crit (attack count starts at 1)
                if (
                    effect.value > 0 &&
                    bossAttackCount > 0 &&
                    bossAttackCount % effect.value === 0
                ) {
                    isGuaranteedCrit = true;
                }
                break;
            case "turn_skip":
                turnSkipChance = Math.max(turnSkipChance, effect.value);
                break;
        }
    }

    return {
        shieldPiercePercent,
        shieldBreakAmount,
        multiHitCount,
        ignoreDefense,
        healOnDamagePercent,
        isGuaranteedCrit,
        turnSkipChance,
    };
}

// ─── 2. Dodge check (passive) ─────────────────────────────────────────────────

/**
 * Checks if boss dodges the player's attack via module dodge passives.
 * Returns true if dodge succeeded (attack is cancelled).
 */
export function checkBossModuleDodge(
    aliveBossModules: EnemyModule[],
    get: () => GameStore,
): boolean {
    const dodgeMods = getAliveModsWithEffect(aliveBossModules, "dodge");
    if (dodgeMods.length === 0) return false;
    const maxDodge = Math.max(...dodgeMods.map((m) => m.specialEffect?.value ?? 0));
    if (Math.random() * 100 < maxDodge) {
        get().addLog(
            `⚡ Уклонение модуля босса! (${maxDodge}% шанс)`,
            "warning",
        );
        return true;
    }
    return false;
}

// ─── 3. Phase shift check (passive) ──────────────────────────────────────────

/**
 * Checks if boss negates a player critical hit via phase_shift passive.
 * Returns true if crit was cancelled.
 */
export function checkBossPhaseShift(
    aliveBossModules: EnemyModule[],
    get: () => GameStore,
): boolean {
    const phaseMods = getAliveModsWithEffect(aliveBossModules, "phase_shift");
    if (phaseMods.length === 0) return false;
    const maxPhaseShift = Math.max(
        ...phaseMods.map((m) => m.specialEffect?.value ?? 0),
    );
    if (Math.random() * 100 < maxPhaseShift) {
        get().addLog(
            `🔮 Фазовый сдвиг! Критический удар заблокирован! (${maxPhaseShift}%)`,
            "info",
        );
        return true;
    }
    return false;
}

// ─── 4. Evasion boost check (active ability) ─────────────────────────────────

/**
 * Checks if boss's evasion_boost active ability dodges the player's attack.
 * Returns true if the attack is fully avoided.
 */
export function checkBossEvasionBoost(
    state: GameState,
    get: () => GameStore,
): boolean {
    const ability = state.currentCombat?.enemy.specialAbility;
    if (ability?.effect !== "evasion_boost" || ability.trigger !== "every_turn")
        return false;
    const chance = ability.value ?? 30;
    if (Math.random() * 100 < chance) {
        get().addLog(
            `★ ${ability.name}: Босс уклонился от атаки! (${chance}% шанс)`,
            "warning",
        );
        return true;
    }
    return false;
}

// ─── 5. Take-damage effects (passive) ────────────────────────────────────────

/**
 * Applies damage_absorb and damage_mirror effects when a boss module takes damage.
 * Called in playerAttack.ts after module damage is applied.
 */
export function applyBossTakeDamageEffects(
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
    damageTaken: number,
): void {
    const combat = state.currentCombat;
    if (!combat?.enemy.isBoss || damageTaken <= 0) return;

    const aliveMods = getAliveMods(combat.enemy.modules);

    // damage_absorb: convert % of incoming damage to boss shields
    const absorbMods = getAliveModsWithEffect(aliveMods, "damage_absorb");
    if (absorbMods.length > 0) {
        const totalPercent = Math.min(
            100,
            absorbMods.reduce((s, m) => s + (m.specialEffect?.value ?? 0), 0),
        );
        const absorbed = Math.floor((damageTaken * totalPercent) / 100);
        if (absorbed > 0) {
            set((s) => {
                if (!s.currentCombat) return;
                s.currentCombat.enemy.shields = Math.min(
                    s.currentCombat.enemy.maxShields,
                    s.currentCombat.enemy.shields + absorbed,
                );
            });
            get().addLog(
                `🔋 Поглощение урона: +${absorbed} щитов боссу`,
                "warning",
            );
        }
    }

    // damage_mirror: reflect % of incoming damage to a random player module
    const mirrorMods = getAliveModsWithEffect(aliveMods, "damage_mirror");
    if (mirrorMods.length > 0) {
        const totalPercent = mirrorMods.reduce(
            (s, m) => s + (m.specialEffect?.value ?? 0),
            0,
        );
        const reflected = Math.floor((damageTaken * totalPercent) / 100);
        if (reflected > 0) {
            const playerActiveMods = state.ship.modules.filter(
                (m) => m.health > 0,
            );
            if (playerActiveMods.length > 0) {
                const target =
                    playerActiveMods[
                        Math.floor(Math.random() * playerActiveMods.length)
                    ];
                applyModuleDamage(state, set, get, reflected, target);
                get().addLog(
                    `🔄 Отражение урона: ${reflected} → "${target.name}"`,
                    "warning",
                );
            }
        }
    }
}

// ─── 6. Resurrect check ───────────────────────────────────────────────────────

/**
 * Checks if boss resurrects when defeated.
 * Returns true if resurrection happened (player hasn't actually won yet).
 */
export function checkBossResurrect(
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): boolean {
    const combat = get().currentCombat;
    if (!combat?.enemy.isBoss) return false;

    const ability = combat.enemy.specialAbility;
    if (ability?.effect !== "resurrect_chance") return false;
    if (combat.bossResurrected) return false; // Only once per fight

    const chance = ability.value ?? 20;
    if (Math.random() * 100 >= chance) return false;

    // Resurrect: restore 30% HP to all modules
    set((s) => {
        if (!s.currentCombat) return;
        s.currentCombat.bossResurrected = true;
        s.currentCombat.enemy.modules.forEach((m) => {
            m.health = Math.floor((m.maxHealth ?? 100) * 0.3);
        });
    });
    get().addLog(
        `♾️ ${ability.name}: БОСС ВОСКРЕС! (${chance}% шанс)`,
        "error",
    );
    return true;
}

// ─── 7. Per-turn passive module effects ──────────────────────────────────────

function applyModulePassives(
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void {
    const combat = get().currentCombat;
    if (!combat) return;

    const aliveMods = getAliveMods(combat.enemy.modules);

    // regen: each module heals itself by value% of its maxHealth
    type RegenEntry = { id: number; heal: number; max: number };
    const regenEntries: RegenEntry[] = [];
    for (const mod of aliveMods) {
        if (mod.specialEffect?.type !== "regen") continue;
        const heal = Math.floor(
            ((mod.maxHealth ?? 100) * mod.specialEffect.value) / 100,
        );
        if (heal > 0)
            regenEntries.push({ id: mod.id, heal, max: mod.maxHealth ?? 100 });
    }

    if (regenEntries.length > 0) {
        set((s) => {
            if (!s.currentCombat) return;
            for (const { id, heal, max } of regenEntries) {
                const m = s.currentCombat.enemy.modules.find(
                    (x) => x.id === id,
                );
                if (m && m.health > 0)
                    m.health = Math.min(max, m.health + heal);
            }
        });
        const names = regenEntries
            .map(({ id, heal }) => {
                const m = combat.enemy.modules.find((x) => x.id === id);
                return `${m?.name ?? "?"} +${heal}`;
            })
            .join(", ");
        get().addLog(`♻️ Пассивная рег. модулей: ${names}`, "warning");
    }

    // damage_aura: sum of all alive aura modules → apply to player each turn
    const auraDamage = aliveMods
        .filter((m) => m.specialEffect?.type === "damage_aura")
        .reduce((s, m) => s + (m.specialEffect?.value ?? 0), 0);

    if (auraDamage > 0) {
        const freshState = get();
        let remaining = auraDamage;

        if (freshState.ship.shields > 0) {
            const shieldAbsorb = Math.min(freshState.ship.shields, remaining);
            set((s) => {
                s.ship.shields = Math.max(0, s.ship.shields - shieldAbsorb);
            });
            remaining -= shieldAbsorb;
            if (shieldAbsorb > 0) {
                get().addLog(`🔥 Аура урона: щиты -${shieldAbsorb}`, "warning");
            }
        }

        if (remaining > 0) {
            const freshState2 = get();
            const playerActiveMods = freshState2.ship.modules.filter(
                (m) => m.health > 0,
            );
            if (playerActiveMods.length > 0) {
                const target =
                    playerActiveMods[
                        Math.floor(Math.random() * playerActiveMods.length)
                    ];
                applyModuleDamage(freshState2, set, get, remaining, target);
                get().addLog(
                    `🔥 Аура урона: "${target.name}" -${remaining}`,
                    "error",
                );
            }
        }
    }
}

// ─── 8. Active special ability ────────────────────────────────────────────────

function applySpecialAbility(
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void {
    const combat = get().currentCombat;
    if (!combat?.enemy.isBoss) return;

    const ability = combat.enemy.specialAbility;
    if (!ability) return;

    const healthPercent = getBossHealthPercent(combat.enemy.modules);

    // ── every_turn abilities ──────────────────────────────────────────────────
    if (ability.trigger === "every_turn") {
        switch (ability.effect) {
            case "aoe_damage": {
                // Deal value damage to all alive player modules (shields absorb first)
                const value = ability.value ?? 20;
                const freshState = get();
                let remaining = value;

                if (freshState.ship.shields > 0) {
                    const absorb = Math.min(freshState.ship.shields, remaining);
                    set((s) => {
                        s.ship.shields = Math.max(0, s.ship.shields - absorb);
                    });
                    remaining -= absorb;
                    get().addLog(
                        `★ ${ability.name}: Щиты поглотили ${absorb} АоЕ урона`,
                        "warning",
                    );
                }

                if (remaining > 0) {
                    const activeMods = get().ship.modules.filter(
                        (m) => m.health > 0,
                    );
                    for (const mod of activeMods) {
                        applyModuleDamage(get(), set, get, remaining, mod);
                    }
                    get().addLog(
                        `★ ${ability.name}: АоЕ ${remaining} урона по всем модулям!`,
                        "error",
                    );
                }
                break;
            }

            case "heal_all": {
                const healAmount = ability.value ?? 10;
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
                get().addLog(
                    `★ ${ability.name}: +${healAmount}% ко всем модулям`,
                    "warning",
                );
                break;
            }

            case "lifesteal": {
                // Heal boss proportionally to total damage it deals this turn
                const currentCombat = get().currentCombat;
                const totalDamage = currentCombat
                    ? getAliveMods(currentCombat.enemy.modules).reduce(
                          (s, m) => s + (m.damage ?? 0),
                          0,
                      )
                    : 0;
                if (totalDamage > 0) {
                    const healAmount = Math.floor(
                        (totalDamage * (ability.value ?? 20)) / 100,
                    );
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
                    get().addLog(
                        `★ ${ability.name}: Вампиризм +${healAmount} HP`,
                        "warning",
                    );
                }
                break;
            }

            case "evasion_boost":
                // Handled in playerAttack.ts via checkBossEvasionBoost()
                break;
        }
    }

    // ── low_health abilities (< 30%) ──────────────────────────────────────────
    if (ability.trigger === "low_health" && healthPercent < 30) {
        switch (ability.effect) {
            case "emergency_repair": {
                // One-shot: fires only once per combat to avoid infinite healing loop
                if (combat.bossOneShotAbilityFired) break;
                const healAmount = ability.value ?? 25;
                set((s) => {
                    if (!s.currentCombat) return;
                    s.currentCombat.bossOneShotAbilityFired = true;
                    s.currentCombat.enemy.modules.forEach((m) => {
                        if (m.health > 0)
                            m.health = Math.min(
                                m.maxHealth ?? 100,
                                m.health + healAmount,
                            );
                    });
                });
                get().addLog(
                    `★ ${ability.name}: Аварийное восстановление! +${healAmount}%`,
                    "warning",
                );
                break;
            }

            case "heal_all": {
                const healAmount = ability.value ?? 25;
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
                get().addLog(
                    `★ ${ability.name}: Аварийное восстановление! +${healAmount}%`,
                    "warning",
                );
                break;
            }

            case "shield_restore": {
                // One-shot: description explicitly says "1 раз за бой"
                if (combat.bossOneShotAbilityFired) break;
                const freshCombat = get().currentCombat;
                if (freshCombat && freshCombat.enemy.shields < freshCombat.enemy.maxShields) {
                    const restorePercent = ability.value ?? 50;
                    set((s) => {
                        if (!s.currentCombat) return;
                        s.currentCombat.bossOneShotAbilityFired = true;
                        const max = s.currentCombat.enemy.maxShields;
                        const amount = Math.floor((max * restorePercent) / 100);
                        s.currentCombat.enemy.shields = Math.min(
                            max,
                            s.currentCombat.enemy.shields + amount,
                        );
                    });
                    get().addLog(
                        `★ ${ability.name}: Восстановление щитов! +${ability.value ?? 50}% (1 раз за бой)`,
                        "warning",
                    );
                }
                break;
            }

            case "shield_regen": {
                // At low health, regen extra shields every turn
                const regenAmount = ability.value ?? 30;
                set((s) => {
                    if (!s.currentCombat) return;
                    s.currentCombat.enemy.shields = Math.min(
                        s.currentCombat.enemy.maxShields,
                        s.currentCombat.enemy.shields + regenAmount,
                    );
                });
                get().addLog(
                    `★ ${ability.name}: Регенерация щитов +${regenAmount}`,
                    "warning",
                );
                break;
            }

            case "self_heal": {
                const chance = ability.value ?? 40;
                if (Math.random() * 100 < chance) {
                    const healAmount = 50;
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
                    get().addLog(
                        `★ ${ability.name}: Самовосстановление +${healAmount}! (${chance}% шанс)`,
                        "warning",
                    );
                }
                break;
            }

            case "resurrect_chance":
                // Handled in playerAttack.ts victory check via checkBossResurrect()
                break;
        }
    }
}

// ─── 9. Main export ───────────────────────────────────────────────────────────

/**
 * Processes all boss end-of-turn effects:
 * base regenRate → per-module passives (regen, damage_aura) → active special ability.
 * Called after the boss attacks, from both executeEnemyAttack and handleEnemyCounterAttack.
 */
export function processBossRegeneration(
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void {
    const combat = state.currentCombat;
    if (!combat?.enemy.isBoss) return;

    const boss = combat.enemy;

    // Base regenRate: heals ALL alive modules by a flat amount each turn
    if (boss.regenRate && boss.regenRate > 0) {
        const aliveCount = boss.modules.filter((m) => m.health > 0).length;
        if (aliveCount > 0) {
            set((s) => {
                if (!s.currentCombat) return;
                s.currentCombat.enemy.modules.forEach((m) => {
                    if (m.health > 0)
                        m.health = Math.min(
                            m.maxHealth ?? 100,
                            m.health + (boss.regenRate ?? 0),
                        );
                });
            });
            get().addLog(
                `⚙️ Регенерация босса: +${boss.regenRate}/мод.`,
                "warning",
            );
        }
    }

    // Per-module passives (regen specialEffect, damage_aura)
    applyModulePassives(state, set, get);

    // Active special ability
    applySpecialAbility(state, set, get);
}
