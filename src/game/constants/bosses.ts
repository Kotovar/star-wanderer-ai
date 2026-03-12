import type { AncientBoss } from "@/game/types";

// ═══════════════════════════════════════════════════════════════
// ANCIENT BOSSES - Relicts of lost civilization
// Autonomous machines from the Ancients, not pirates, not factions
// Features: Unique modules, Regeneration, Guaranteed artifact drop
// ═══════════════════════════════════════════════════════════════

export const ANCIENT_BOSSES: AncientBoss[] = [
    // ═══════════════════════════════════════════════════════════
    // TIER 1 BOSSES (3 variants)
    // ═══════════════════════════════════════════════════════════

    // Tier 1 Boss - Guardian of the Gate
    {
        id: "guardian_sentinel",
        name: "⚙️ Страж Врат",
        bossType: "sentinel",
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
                specialEffect: { type: "regen", value: 15 },
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
            name: "Энергетический Барьер",
            description:
                "При низком здоровье восстанавливает 50% щитов 1 раз за бой",
            trigger: "low_health",
            effect: "shield_restore",
            value: 50,
        },
        guaranteedArtifactRarity: "rare",
    },

    // Tier 1 Boss - Nova Stalker
    {
        id: "nova_stalker",
        name: "🔥 Ловец Нов",
        bossType: "stalker",
        description:
            "Охотник за звёздной энергией. Поглощает излучение звёзд для подзарядки своих систем.",
        tier: 1,
        modules: [
            {
                type: "solar_collector",
                name: "Солнечный Коллектор",
                health: 140,
                defense: 4,
                isAncient: true,
                specialEffect: { type: "regen", value: 10 },
                description: "Восстанавливает 10% здоровья каждый ход",
            },
            {
                type: "flare_launcher",
                name: "Метатель Вспышек",
                health: 70,
                damage: 30,
                isAncient: true,
                description: "Выстреливает звёздными вспышками",
            },
            {
                type: "heat_sink",
                name: "Теплоотвод",
                health: 100,
                defense: 6,
                isAncient: true,
                description: "Рассеивает избыточное тепло",
            },
            {
                type: "radiation_core",
                name: "Радиационное Ядро",
                health: 90,
                damage: 20,
                isAncient: true,
                specialEffect: { type: "damage_aura", value: 5 },
                description: "Наносит 5 урона каждый ход",
            },
        ],
        shields: 60,
        regenRate: 8,
        specialAbility: {
            name: "Звёздная Вспышка",
            description: "Каждый 3-й ход наносит 40 урона всем модулям",
            trigger: "every_turn",
            effect: "aoe_damage",
            value: 40,
        },
        guaranteedArtifactRarity: "rare",
    },

    // Tier 1 Boss - Void Leech
    {
        id: "void_leech",
        name: "🩸 Пустотный Паразит",
        bossType: "leech",
        description:
            "Машина-паразит, питающаяся энергией кораблей. Присасывается к жертве и высасывает силы.",
        tier: 1,
        modules: [
            {
                type: "energy_drain",
                name: "Энергетический Вампир",
                health: 100,
                damage: 20,
                isAncient: true,
                specialEffect: { type: "heal_on_damage", value: 30 },
                description: "Лечится на 30% нанесённого урона",
            },
            {
                type: "grapple_arm",
                name: "Захватная Клешня",
                health: 80,
                defense: 4,
                isAncient: true,
                description: "Удерживает цель для атаки",
            },
            {
                type: "power_cell",
                name: "Энергоячейка",
                health: 130,
                defense: 5,
                isAncient: true,
                specialEffect: { type: "regen", value: 12 },
                description: "Восстанавливает 12% здоровья каждый ход",
            },
            {
                type: "shield_drain",
                name: "Поглотитель Щитов",
                health: 70,
                damage: 15,
                isAncient: true,
                specialEffect: { type: "shield_break", value: 15 },
                description: "Каждый удар снимает 15 щитов",
            },
        ],
        shields: 50,
        regenRate: 12,
        specialAbility: {
            name: "Энергетический Вампиризм",
            description: "При атаке лечится на 20% от нанесённого урона",
            trigger: "every_turn",
            effect: "lifesteal",
            value: 20,
        },
        guaranteedArtifactRarity: "rare",
    },

    // ═══════════════════════════════════════════════════════════
    // TIER 2 BOSSES (3 variants)
    // ═══════════════════════════════════════════════════════════

    // Tier 2 Boss - Harvester
    {
        id: "harvester_prime",
        name: "🌀 Жнец Прайм",
        bossType: "harvester",
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
                specialEffect: { type: "shield_pierce", value: 50 },
                description: "Игнорирует 50% щитов",
            },
            {
                type: "nano_swarm",
                name: "Рой Нанитов",
                health: 80,
                damage: 15,
                isAncient: true,
                specialEffect: { type: "multi_hit", value: 3 },
                description: "Атакует 3 раза за ход",
            },
            {
                type: "absorption_hull",
                name: "Поглощающий Корпус",
                health: 180,
                defense: 7,
                isAncient: true,
                specialEffect: { type: "damage_absorb", value: 25 },
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

    // Tier 2 Boss - Phase Hunter
    {
        id: "phase_hunter",
        name: "⚡ Фазовый Охотник",
        bossType: "hunter",
        description:
            "Машина, способная перемещаться между измерениями. Появляется из ниоткуда и атакует.",
        tier: 2,
        modules: [
            {
                type: "phase_drive",
                name: "Фазовый Двигатель",
                health: 160,
                defense: 6,
                isAncient: true,
                specialEffect: { type: "dodge", value: 25 },
                description: "25% шанс уклонения",
            },
            {
                type: "void_cannon",
                name: "Пушка Пустоты",
                health: 110,
                damage: 50,
                isAncient: true,
                specialEffect: { type: "ignore_defense", value: 100 },
                description: "Игнорирует всю защиту",
            },
            {
                type: "dimensional_anchor",
                name: "Якорь Измерений",
                health: 140,
                defense: 8,
                isAncient: true,
                description: "Стабилизирует положение в пространстве",
            },
            {
                type: "quantum_reflector",
                name: "Квантовый Отражатель",
                health: 90,
                defense: 7,
                isAncient: true,
                specialEffect: { type: "damage_mirror", value: 15 },
                description: "Отражает 15% урона",
            },
        ],
        shields: 100,
        regenRate: 12,
        specialAbility: {
            name: "Фазовый Сдвиг",
            description: "30% шанс полностью избежать атаки",
            trigger: "every_turn",
            effect: "evasion_boost",
            value: 30,
        },
        guaranteedArtifactRarity: "legendary",
    },

    // Tier 2 Boss - Cryo Reaver
    {
        id: "cryo_reaver",
        name: "❄️ Ледяной Разоритель",
        bossType: "reaver",
        description:
            "Машина холода, замораживающая всё вокруг. Её системы работают при абсолютном нуле.",
        tier: 2,
        modules: [
            {
                type: "cryo_core",
                name: "Крио Ядро",
                health: 180,
                defense: 8,
                isAncient: true,
                specialEffect: { type: "regen", value: 18 },
                description: "Восстанавливает 18% здоровья каждый ход",
            },
            {
                type: "ice_beam",
                name: "Ледяной Луч",
                health: 95,
                damage: 45,
                isAncient: true,
                specialEffect: { type: "shield_break", value: 25 },
                description: "Каждый удар снимает 25 щитов",
            },
            {
                type: "frost_shield",
                name: "Морозный Щит",
                health: 120,
                defense: 9,
                isAncient: true,
                specialEffect: { type: "shield_regen", value: 15 },
                description: "Восстанавливает 15 щитов каждый ход",
            },
            {
                type: "absolute_zero",
                name: "Абсолютный Ноль",
                health: 100,
                damage: 35,
                isAncient: true,
                specialEffect: { type: "guaranteed_crit", value: 4 },
                description: "Каждая 4-я атака - критическая",
            },
        ],
        shields: 140,
        regenRate: 18,
        specialAbility: {
            name: "Вечная Мерзлота",
            description:
                "При низком здоровье восстанавливает 30 щитов каждый ход",
            trigger: "low_health",
            effect: "shield_regen",
            value: 30,
        },
        guaranteedArtifactRarity: "legendary",
    },

    // ═══════════════════════════════════════════════════════════
    // TIER 3 BOSSES (3 variants)
    // ═══════════════════════════════════════════════════════════

    // Tier 3 Boss - Void Oracle
    {
        id: "void_oracle",
        name: "👁️ Оракул Пустоты",
        bossType: "oracle",
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
                specialEffect: { type: "dodge", value: 30 },
                description: "30% шанс уклонения",
            },
            {
                type: "entropy_cannon",
                name: "Пушка Энтропии",
                health: 120,
                damage: 60,
                isAncient: true,
                specialEffect: { type: "ignore_defense", value: 100 },
                description: "Игнорирует всю защиту",
            },
            {
                type: "void_anchor",
                name: "Якорь Пустоты",
                health: 150,
                damage: 30,
                isAncient: true,
                specialEffect: { type: "shield_break", value: 20 },
                description: "Каждый удар снимает 20 щитов",
            },
            {
                type: "temporal_hull",
                name: "Временной Корпус",
                health: 200,
                defense: 10,
                isAncient: true,
                specialEffect: { type: "phase_shift", value: 50 },
                description: "50% шанс избежать критического удара",
            },
            {
                type: "singularity_core",
                name: "Ядро Сингулярности",
                health: 180,
                defense: 8,
                isAncient: true,
                specialEffect: { type: "damage_mirror", value: 20 },
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
    },

    // Tier 3 Boss - Nexus Destroyer
    {
        id: "nexus_destroyer",
        name: "💀 Разрушитель Связи",
        bossType: "destroyer",
        description:
            "Машина разрушения, способная разрывать связи между модулями корабля. Её присутствие дестабилизирует системы.",
        tier: 3,
        modules: [
            {
                type: "disruption_field",
                name: "Поле Помех",
                health: 220,
                defense: 9,
                isAncient: true,
                specialEffect: { type: "damage_aura", value: 15 },
                description: "Наносит 15 урона каждый ход",
            },
            {
                type: "link_breaker",
                name: "Разрыватель Связей",
                health: 140,
                damage: 55,
                isAncient: true,
                specialEffect: { type: "shield_break", value: 30 },
                description: "Каждый удар снимает 30 щитов",
            },
            {
                type: "chaos_core",
                name: "Ядро Хаоса",
                health: 200,
                defense: 7,
                isAncient: true,
                specialEffect: { type: "regen", value: 20 },
                description: "Восстанавливает 20% здоровья каждый ход",
            },
            {
                type: "void_shield",
                name: "Щит Пустоты",
                health: 130,
                defense: 11,
                isAncient: true,
                specialEffect: { type: "shield_regen", value: 25 },
                description: "Восстанавливает 25 щитов каждый ход",
            },
            {
                type: "annihilation_beam",
                name: "Луч Уничтожения",
                health: 150,
                damage: 70,
                isAncient: true,
                specialEffect: { type: "guaranteed_crit", value: 3 },
                description: "Каждая 3-я атака - критическая",
            },
        ],
        shields: 180,
        regenRate: 22,
        specialAbility: {
            name: "Хаотическая Регенерация",
            description: "Каждый ход восстанавливает 15% здоровья всем модулям",
            trigger: "every_turn",
            effect: "heal_all",
            value: 15,
        },
        guaranteedArtifactRarity: "mythic",
    },

    // Tier 3 Boss - Chronos Warden
    {
        id: "chronos_warden",
        name: "⏳ Хранитель Времени",
        bossType: "warden",
        description:
            "Машина, управляющая потоком времени. Может замедлять противника и ускорять свои системы.",
        tier: 3,
        modules: [
            {
                type: "time_core",
                name: "Временное Ядро",
                health: 240,
                defense: 10,
                isAncient: true,
                specialEffect: { type: "regen", value: 22 },
                description: "Восстанавливает 22% здоровья каждый ход",
            },
            {
                type: "temporal_cannon",
                name: "Временная Пушка",
                health: 130,
                damage: 65,
                isAncient: true,
                specialEffect: { type: "ignore_defense", value: 100 },
                description: "Игнорирует всю защиту",
            },
            {
                type: "stasis_field",
                name: "Поле Стазиса",
                health: 160,
                defense: 12,
                isAncient: true,
                specialEffect: { type: "turn_skip", value: 25 },
                description: "25% шанс пропустить ход противника",
            },
            {
                type: "acceleration_matrix",
                name: "Матрица Ускорения",
                health: 110,
                defense: 8,
                isAncient: true,
                specialEffect: { type: "dodge", value: 35 },
                description: "35% шанс уклонения",
            },
            {
                type: "paradox_engine",
                name: "Двигатель Парадоксов",
                health: 170,
                damage: 50,
                isAncient: true,
                specialEffect: { type: "multi_hit", value: 2 },
                description: "Атакует 2 раза за ход",
            },
        ],
        shields: 200,
        regenRate: 25,
        specialAbility: {
            name: "Петля Времени",
            description:
                "При низком здоровье 40% шанс восстановить 50 здоровья",
            trigger: "low_health",
            effect: "self_heal",
            value: 50,
        },
        guaranteedArtifactRarity: "mythic",
    },

    // ═══════════════════════════════════════════════════════════
    // SPECIAL BOSSES (Black Holes)
    // ═══════════════════════════════════════════════════════════

    // Special Black Hole Boss - The Eternal
    {
        id: "the_eternal",
        name: "♾️ Вечный",
        bossType: "eternal",
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
                specialEffect: { type: "regen", value: 25 },
                description: "Восстанавливает 25% здоровья каждый ход",
            },
            {
                type: "reality_tear",
                name: "Разрыв Реальности",
                health: 150,
                damage: 80,
                isAncient: true,
                specialEffect: { type: "guaranteed_crit", value: 3 },
                description: "Каждая 3-я атака - критическая",
            },
            {
                type: "void_embrace",
                name: "Объятие Пустоты",
                health: 180,
                damage: 45,
                isAncient: true,
                specialEffect: { type: "heal_on_damage", value: 50 },
                description: "Лечится на 50% нанесённого урона",
            },
            {
                type: "entropy_field",
                name: "Поле Энтропии",
                health: 200,
                defense: 10,
                isAncient: true,
                specialEffect: { type: "damage_aura", value: 10 },
                description: "Наносит 10 урона каждый ход",
            },
            {
                type: "quantum_barrier",
                name: "Квантовый Барьер",
                health: 120,
                defense: 10,
                isAncient: true,
                specialEffect: { type: "shield_regen", value: 20 },
                description: "Восстанавливает 20 щитов каждый ход",
            },
            {
                type: "temporal_shift",
                name: "Временной Сдвиг",
                health: 100,
                defense: 8,
                isAncient: true,
                specialEffect: { type: "turn_skip", value: 20 },
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
    },
];
