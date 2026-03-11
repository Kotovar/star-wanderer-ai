// ═══════════════════════════════════════════════════════════════
// ANCIENT BOSSES - Relicts of lost civilization
// ═══════════════════════════════════════════════════════════════

import type { ArtifactRarity } from "./artifacts";
import type { GalaxyTierAll } from "./locations/galaxy";

export type BossModuleType =
    | "ancient_core"
    | "conversion_core"
    | "quantum_engine";

// ═══════════════════════════════════════════════════════════════
// PASSIVE MODULE EFFECTS
// Effects that boss modules have (passive bonuses)
// ═══════════════════════════════════════════════════════════════
export type BossModuleEffectType =
    | "regen" // Регенерация здоровья за ход (value: %)
    | "damage_aura" // Аура урона каждый ход (value: урон)
    | "heal_on_damage" // Лечение при нанесении урона (value: %)
    | "shield_break" // Снятие щитов при атаке (value: количество щитов)
    | "shield_pierce" // Игнорирование процента щитов (value: %)
    | "multi_hit" // Несколько атак за ход (value: количество атак)
    | "damage_absorb" // Поглощение урона в щиты (value: %)
    | "dodge" // Шанс уклонения (value: %)
    | "ignore_defense" // Игнорирование защиты (value: 100 = вся защита)
    | "damage_mirror" // Отражение урона (value: %)
    | "shield_regen" // Регенерация щитов за ход (value: количество)
    | "guaranteed_crit" // Гарантированный критический удар (value: каждая N-я атака)
    | "phase_shift" // Шанс избежать критического удара (value: %)
    | "turn_skip"; // Шанс пропустить ход противника (value: %);

// Конфигурация специального эффекта модуля
export interface BossModuleEffect {
    type: BossModuleEffectType;
    value: number; // Числовое значение эффекта
}

// ═══════════════════════════════════════════════════════════════
// ACTIVE BOSS ABILITIES
// Special abilities that bosses use (active skills)
// ═══════════════════════════════════════════════════════════════
export type BossAbilityEffectType =
    | "aoe_damage" // АоЕ урон по всем модулям
    | "emergency_repair" // Экстренный ремонт модулей при низком HP
    | "evasion_boost" // Повышение уклонения (постоянное)
    | "heal_all" // Лечение всех модулей босса
    | "lifesteal" // Вампиризм при каждой атаке
    | "module_disable" // Шанс отключить модуль противника
    | "resurrect_chance" // Шанс воскреснуть после смерти
    | "self_heal" // Самолечение при низком HP
    | "shield_regen" // Регенерация щитов каждый ход
    | "shield_restore"; // Мгновенное восстановление щитов при низком HP

export interface AncientBoss {
    id: string;
    name: string;
    description: string;
    tier: GalaxyTierAll; // Minimum sector tier to spawn

    modules: BossModule[];
    shields: number;
    regenRate: number; // HP regenerated per turn in combat
    specialAbility: BossAbility;
    guaranteedArtifactRarity: ArtifactRarity;
    // Note: Module reward is randomly selected from MODULES_FROM_BOSSES
}

export interface BossModule {
    type: string;
    name: string;
    isAncient: boolean; // Module not available to player
    description: string;
    specialEffect?: BossModuleEffect;
    health: number;
    damage?: number;
    defense?: number;
}

export type BossAbilityTrigger = "every_turn" | "low_health" | "on_damage";

export interface BossAbility {
    name: string;
    description: string;
    trigger: BossAbilityTrigger;
    effect: BossAbilityEffectType;
    value?: number;
}
