import type { AncientBoss } from "@/game/types";

// ═══════════════════════════════════════════════════════════════
// ANCIENT BOSSES - Relicts of lost civilization
// Autonomous machines from the Ancients, not pirates, not factions
// Features: Unique modules, Regeneration, Guaranteed artifact drop
// ═══════════════════════════════════════════════════════════════

export const ANCIENT_BOSSES: AncientBoss[] = [
    // Tier 1 Boss - Guardian of the Gate
    {
        id: "guardian_sentinel",
        name: "⚙️ Страж Врат",
        description:
            "Древний страж, охраняющий границы обитаемого пространства. Его системы работают вечно.",
        tier: 1,
        modules: [
            {
                type: "ancient_core",
                name: "Древнее Ядро",
                health: 150,
                defense: 5,
                isAncient: true,
                description: "Неразрушимое энергетическое ядро",
            },
            {
                type: "plasma_cannon",
                name: "Плазменная Пушка",
                health: 80,
                damage: 25,
                isAncient: true,
                description: "Оружие, которого нет у игроков",
            },
            {
                type: "regen_hull",
                name: "Регенерирующий Корпус",
                health: 120,
                defense: 5,
                isAncient: true,
                specialEffect: "regen_15",
                description: "Восстанавливает 15% здоровья каждый ход",
            },
            {
                type: "ancient_shield",
                name: "Энергетический Барьер",
                health: 60,
                defense: 8,
                isAncient: true,
                description: "Мощный щит древних",
            },
        ],
        shields: 80,
        regenRate: 10,
        specialAbility: {
            name: "Автономное Восстановление",
            description: "Восстанавливает 10% здоровья всех модулей каждый ход",
            trigger: "every_turn",
            effect: "heal_all",
            value: 10,
        },
        guaranteedArtifactRarity: "rare",
    },

    // Tier 2 Boss - Harvester
    {
        id: "harvester_prime",
        name: "🌀 Жнец Прайм",
        description:
            "Колоссальная машина для сбора ресурсов. Автоматически перерабатывает всё, что встречает.",
        tier: 2,
        modules: [
            {
                type: "conversion_core",
                name: "Ядро Конвертации",
                health: 200,
                defense: 7,
                isAncient: true,
                description: "Преобразует урон в энергию",
            },
            {
                type: "disintegrate_beam",
                name: "Дезинтегратор",
                health: 100,
                damage: 40,
                isAncient: true,
                specialEffect: "shield_pierce",
                description: "Игнорирует 50% щитов",
            },
            {
                type: "nano_swarm",
                name: "Рой Нанитов",
                health: 80,
                damage: 15,
                isAncient: true,
                specialEffect: "multi_hit",
                description: "Атакует 3 раза за ход",
            },
            {
                type: "absorption_hull",
                name: "Поглощающий Корпус",
                health: 180,
                defense: 7,
                isAncient: true,
                specialEffect: "damage_absorb",
                description: "25% урона конвертируется в щиты",
            },
            {
                type: "ancient_shield_mk2",
                name: "Барьер Прайм",
                health: 90,
                defense: 10,
                isAncient: true,
                description: "Улучшенный щит древних",
            },
        ],
        shields: 120,
        regenRate: 15,
        specialAbility: {
            name: "Поглощение Материи",
            description:
                "При низком здоровье восстанавливает 25% от всех модулей",
            trigger: "low_health",
            effect: "emergency_repair",
            value: 25,
        },
        guaranteedArtifactRarity: "legendary",
    },

    // Tier 3 Boss - Void Oracle
    {
        id: "void_oracle",
        name: "👁️ Оракул Пустоты",
        description:
            "Машина-оракул, видящая все возможные исходы. Её атаки неизбежны.",
        tier: 3,
        modules: [
            {
                type: "prophecy_engine",
                name: "Двигатель Пророчеств",
                health: 250,
                defense: 8,
                isAncient: true,
                specialEffect: "dodge_30",
                description: "30% шанс уклонения",
            },
            {
                type: "entropy_cannon",
                name: "Пушка Энтропии",
                health: 120,
                damage: 60,
                isAncient: true,
                specialEffect: "ignore_defense",
                description: "Игнорирует всю защиту",
            },
            {
                type: "void_anchor",
                name: "Якорь Пустоты",
                health: 150,
                damage: 30,
                isAncient: true,
                specialEffect: "shield_break",
                description: "Каждый удар снимает 20 щитов",
            },
            {
                type: "temporal_hull",
                name: "Временной Корпус",
                health: 200,
                defense: 10,
                isAncient: true,
                specialEffect: "phase_shift",
                description: "50% шанс избежать критического удара",
            },
            {
                type: "singularity_core",
                name: "Ядро Сингулярности",
                health: 180,
                defense: 8,
                isAncient: true,
                specialEffect: "damage_mirror",
                description: "Отражает 20% урона",
            },
        ],
        shields: 150,
        regenRate: 20,
        specialAbility: {
            name: "Предвидение",
            description: "Каждый ход 25% шанс полностью избежать урона",
            trigger: "every_turn",
            effect: "evasion_boost",
            value: 25,
        },
        guaranteedArtifactRarity: "mythic",
        guaranteedModuleDrop: "quantum_engine",
    },

    // Special Black Hole Boss - The Eternal
    {
        id: "the_eternal",
        name: "♾️ Вечный",
        description:
            "Древний хранитель чёрных дыр. Существует вне времени. Неизвестно, машина ли это.",
        tier: 3,
        modules: [
            {
                type: "infinity_core",
                name: "Ядро Бесконечности",
                health: 300,
                defense: 10,
                isAncient: true,
                specialEffect: "regen_25",
                description: "Восстанавливает 25% здоровья каждый ход",
            },
            {
                type: "reality_tear",
                name: "Разрыв Реальности",
                health: 150,
                damage: 80,
                isAncient: true,
                specialEffect: "guaranteed_crit",
                description: "Каждая 3-я атака - критическая",
            },
            {
                type: "void_embrace",
                name: "Объятие Пустоты",
                health: 180,
                damage: 45,
                isAncient: true,
                specialEffect: "heal_on_damage",
                description: "Лечится на 50% нанесённого урона",
            },
            {
                type: "entropy_field",
                name: "Поле Энтропии",
                health: 200,
                defense: 10,
                isAncient: true,
                specialEffect: "damage_aura",
                description: "Наносит 10 урона каждый ход",
            },
            {
                type: "quantum_barrier",
                name: "Квантовый Барьер",
                health: 120,
                defense: 10,
                isAncient: true,
                specialEffect: "shield_regen_20",
                description: "Восстанавливает 20 щитов каждый ход",
            },
            {
                type: "temporal_shift",
                name: "Временной Сдвиг",
                health: 100,
                defense: 8,
                isAncient: true,
                specialEffect: "turn_skip_20",
                description: "20% шанс пропустить ход противника",
            },
        ],
        shields: 200,
        regenRate: 25,
        specialAbility: {
            name: "Бесконечный Цикл",
            description: "При смерти 20% шанс воскреснуть с 30% здоровья",
            trigger: "low_health",
            effect: "resurrect_chance",
            value: 20,
        },
        guaranteedArtifactRarity: "cursed",
        guaranteedModuleDrop: "quantum_engine",
    },
];
