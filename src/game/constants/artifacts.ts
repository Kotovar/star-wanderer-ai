import type { Artifact } from "../types";

// ============================================
// ANCIENT ARTIFACTS - Unique items from lost civilization
// ============================================

export const ANCIENT_ARTIFACTS: Artifact[] = [
    // RARE artifacts (Tier 1-2 anomalies, easier to find)
    {
        id: "eternal_reactor_core",
        name: "Вечное Ядро",
        description:
            "Древний реактор, работающий без топлива. Генерирует бесплатную энергию.",
        effect: { type: "free_power", value: 10, active: false },
        discovered: false,
        researched: false,
        requiresScientistLevel: 2,
        rarity: "rare",
    },
    {
        id: "nanite_hull",
        name: "Нанитовая Обшивка",
        description:
            "Микроскопические роботы постоянно ремонтируют модули корабля (+5% здоровья каждый ход).",
        effect: { type: "nanite_repair", value: 5, active: false },
        discovered: false,
        researched: false,
        requiresScientistLevel: 2,
        rarity: "rare",
    },
    {
        id: "quantum_scanner",
        name: "Квантовый Сканер",
        description:
            "Сканер с квантовым процессором. +5 к дальности сканирования и показывает скрытые объекты.",
        effect: { type: "quantum_scan", value: 5, active: false },
        discovered: false,
        researched: false,
        requiresScientistLevel: 2,
        rarity: "rare",
    },
    {
        id: "plasma_injector",
        name: "Плазменный Инжектор",
        description: "Усиливает урон всего оружия корабля на 30%.",
        effect: { type: "damage_boost", value: 0.3, active: false },
        discovered: false,
        researched: false,
        requiresScientistLevel: 2,
        rarity: "rare",
    },
    {
        id: "crystalline_armor",
        name: "Кристаллическая Броня",
        description:
            "Древнее покрытие из кристаллов. +3 к защите каждого модуля корабля.",
        effect: { type: "module_armor", value: 3, active: false },
        discovered: false,
        researched: false,
        requiresScientistLevel: 2,
        rarity: "rare",
    },

    // LEGENDARY artifacts (Tier 2-3 anomalies, rare finds)
    {
        id: "mirror_shield",
        name: "Зеркальный Щит",
        description:
            "30% шанс отразить атаку в случайный модуль врага без урона по кораблю.",
        effect: { type: "damage_reflect", value: 0.3, active: false },
        discovered: false,
        researched: false,
        requiresScientistLevel: 3,
        rarity: "legendary",
    },
    {
        id: "warp_coil",
        name: "Варп-Катушка",
        description:
            "Мгновенное перемещение между локациями в секторе без трат хода.",
        effect: { type: "sector_teleport", value: 1, active: false },
        discovered: false,
        researched: false,
        requiresScientistLevel: 3,
        rarity: "legendary",
    },
    {
        id: "void_engine",
        name: "Вакуумный Двигатель",
        description:
            "Корабль больше не потребляет топливо для межсекторных перелётов.",
        effect: { type: "fuel_free", value: 1, active: false },
        discovered: false,
        researched: false,
        requiresScientistLevel: 3,
        rarity: "legendary",
    },
    {
        id: "critical_matrix",
        name: "Критическая Матрица",
        description: "35% шанс нанести критический удар (двойной урон) в бою.",
        effect: { type: "crit_chance", value: 0.35, active: false },
        discovered: false,
        researched: false,
        requiresScientistLevel: 3,
        rarity: "legendary",
    },

    // MYTHIC artifacts (Tier 3 anomalies, black holes, extremely rare)
    {
        id: "life_crystal",
        name: "Кристалл Жизни",
        description:
            "Экипаж становится бессмертным - здоровье не падает ниже 1.",
        effect: { type: "crew_immortal", value: 1, active: false },
        discovered: false,
        researched: false,
        requiresScientistLevel: 4,
        rarity: "mythic",
    },
    {
        id: "artifact_compass",
        name: "Компас Древних",
        description:
            "Увеличивает шанс нахождения артефактов в аномалиях и штормах в 3 раза.",
        effect: { type: "artifact_finder", value: 3, active: false },
        discovered: false,
        researched: false,
        requiresScientistLevel: 4,
        rarity: "mythic",
    },
    {
        id: "ai_neural_link",
        name: "ИИ Нейросеть",
        description:
            "Искусственный интеллект управляет кораблём. Корабль может работать без экипажа.",
        effect: { type: "ai_control", value: 1, active: false },
        discovered: false,
        researched: false,
        requiresScientistLevel: 4,
        rarity: "mythic",
    },

    // ═══════════════════════════════════════════════════════════════
    // CURSED ARTIFACTS - Power at a terrible price
    // These artifacts provide massive bonuses but have permanent drawbacks
    // ═══════════════════════════════════════════════════════════════

    {
        id: "abyss_reactor",
        name: "⚛️ Реактор Бездны",
        description: "+25⚡ энергии каждый ход. Но тьма пожирает души экипажа.",
        effect: { type: "abyss_power", value: 25, active: false },
        negativeEffect: {
            type: "happiness_drain",
            value: 5,
            description: "-5 счастья всего экипажа каждый ход",
        },
        discovered: false,
        researched: false,
        requiresScientistLevel: 3,
        rarity: "cursed",
        cursed: true,
    },
    {
        id: "singularity_eye",
        name: "👁️ Око Сингулярности",
        description:
            "Все враги в секторе видны на карте. Но они тоже видят вас.",
        effect: { type: "all_seeing", value: 1, active: false },
        negativeEffect: {
            type: "ambush_chance",
            value: 50,
            description: "+50% шанс засад в сигналах бедствия",
        },
        discovered: false,
        researched: false,
        requiresScientistLevel: 3,
        rarity: "cursed",
        cursed: true,
    },
    {
        id: "ancient_biosphere",
        name: "🧬 Биосфера Древних",
        description: "Экипаж не может умереть. Но ДНК меняется... навсегда.",
        effect: { type: "undying_crew", value: 1, active: false },
        negativeEffect: {
            type: "crew_mutation",
            value: 1,
            description: "1% шанс мутации каждого члена экипажа каждый ход",
        },
        discovered: false,
        researched: false,
        requiresScientistLevel: 4,
        rarity: "cursed",
        cursed: true,
    },
    {
        id: "black_box",
        name: "📦 Чёрный Ящик",
        description: "+75% ко всем наградам в кредитах. Но что-то ломается.",
        effect: { type: "credit_booster", value: 0.75, active: false },
        negativeEffect: {
            type: "module_damage",
            value: 5,
            description: "Случайный модуль теряет 5% здоровья каждый ход",
        },
        discovered: false,
        researched: false,
        requiresScientistLevel: 2,
        rarity: "cursed",
        cursed: true,
    },
    {
        id: "parasitic_nanites",
        name: "🔧 Паразитические Наниты",
        description: "Все модули автоматически чинятся на 8% за ход.",
        effect: { type: "auto_repair", value: 8, active: false },
        negativeEffect: {
            type: "crew_desertion",
            value: 1,
            description: "1% шанс что член экипажа покинет корабль каждый ход",
        },
        discovered: false,
        researched: false,
        requiresScientistLevel: 3,
        rarity: "cursed",
        cursed: true,
    },
    {
        id: "overload_matrix",
        name: "💥 Матрица Перегрузки",
        description: "+100% критический урон в бою. Мощность сжигает системы.",
        effect: { type: "critical_overload", value: 1.0, active: false },
        negativeEffect: {
            type: "self_damage",
            value: 75,
            description:
                "Случайный модуль получает 75% урона после каждого боя",
        },
        discovered: false,
        researched: false,
        requiresScientistLevel: 3,
        rarity: "cursed",
        cursed: true,
    },
    {
        id: "dark_shield_generator",
        name: "🛡️ Тёмный Щит",
        description: "+100 к максимальным щитам. Но экипаж чувствует холод.",
        effect: { type: "dark_shield", value: 100, active: false },
        negativeEffect: {
            type: "morale_drain",
            value: 3,
            description: "-3 мораль всему экипажу каждый ход",
        },
        discovered: false,
        researched: false,
        requiresScientistLevel: 2,
        rarity: "cursed",
        cursed: true,
    },
    {
        id: "void_drive",
        name: "🌀 Варп Бездны",
        description: "Бесплатные перелёты между секторами. Но экипаж страдает.",
        effect: { type: "void_engine", value: 1, active: false },
        negativeEffect: {
            type: "health_drain",
            value: 10,
            description: "-10 здоровья всего экипажа каждый перелёт",
        },
        discovered: false,
        researched: false,
        requiresScientistLevel: 3,
        rarity: "cursed",
        cursed: true,
    },
];
