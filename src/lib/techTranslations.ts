// Technology translations for Research Panel
// This file provides translated names and descriptions for technologies

export interface TechTranslation {
    name: string;
    description: string;
}

export const TECH_TRANSLATIONS: Record<
    "ru" | "en",
    Record<string, TechTranslation>
> = {
    ru: {
        // ═══════════════════════════════════════════════════════════════
        // TIER 1 - Basic Technologies
        // ═══════════════════════════════════════════════════════════════

        // Ship Systems
        reinforced_hull: {
            name: "Усиленный корпус",
            description:
                "Улучшенные сплавы повышают прочность всех модулей на 10%.",
        },
        efficient_reactor: {
            name: "Эффективный реактор",
            description: "Оптимизация реактора даёт +15% к генерации энергии.",
        },

        // Weapons
        targeting_matrix: {
            name: "Матрица прицеливания",
            description:
                "Улучшенные системы наведения увеличивают урон оружия на 10%.",
        },

        // Science
        scanner_mk2: {
            name: "Модуль сканера +1",
            description:
                "Улучшение сканера увеличивает дальность сканирования на +1.",
        },

        // Engineering
        automated_repair: {
            name: "Автоматический ремонт",
            description:
                "Наниты-ремонтники восстанавливают 2% здоровья модулей каждый ход.",
        },

        // Biology
        medbay_upgrade: {
            name: "Улучшенный медотсек",
            description:
                "Медицинские технологии увеличивают здоровье экипажа на 15%.",
        },

        // ═══════════════════════════════════════════════════════════════
        // TIER 2 - Advanced Technologies
        // ═══════════════════════════════════════════════════════════════

        // Ship Systems
        shield_booster: {
            name: "Усилитель щитов",
            description:
                "Генераторы щитов новой конструкции дают +25% к защите.",
        },

        // Weapons
        plasma_weapons: {
            name: "Плазменное оружие",
            description:
                "Открывает доступ к плазменным орудиям, игнорирующим 25% брони.",
        },

        // Science
        quantum_scanner: {
            name: "Модуль сканера +2",
            description:
                "Квантовые сенсоры увеличивают дальность сканирования на +2.",
        },

        // Engineering
        cargo_expansion: {
            name: "Расширение трюма",
            description:
                "Технологии компактного хранения увеличивают трюм на 50%.",
        },

        // Biology
        crew_training: {
            name: "Программа подготовки",
            description:
                "Улучшенное обучение даёт экипажу +25% к получаемому опыту.",
        },

        // ═══════════════════════════════════════════════════════════════
        // TIER 3 - Elite Technologies
        // ═══════════════════════════════════════════════════════════════

        // Ship Systems
        phase_shield: {
            name: "Фазовый щит",
            description:
                "Щиты с фазовым сдвигом имеют 20% шанс полностью поглотить атаку.",
        },

        // Weapons
        antimatter_weapons: {
            name: "Антивещественное оружие",
            description: "Орудия на антиматерии наносят двойной урон по щитам.",
        },

        // Science
        deep_scan: {
            name: "Модуль сканера +3",
            description: "Глубокое сканирование увеличивает дальность на +3.",
        },

        // Engineering
        nanite_hull: {
            name: "Нанитовая обшивка",
            description:
                "Наниты в корпусе восстанавливают 5% здоровья всех модулей каждый ход.",
        },

        // Biology
        genetic_enhancement: {
            name: "Генетическое улучшение",
            description:
                "Биологические улучшения увеличивают здоровье экипажа на 30%.",
        },

        // ═══════════════════════════════════════════════════════════════
        // TIER 4 - Ancient Technologies (Endgame)
        // ═══════════════════════════════════════════════════════════════

        ancient_power: {
            name: "Сила Древних",
            description:
                "Технологии Древних дают +50% ко всем характеристикам корабля.",
        },
        warp_drive: {
            name: "Варп-двигатель",
            description:
                "Двигатель Древних позволяет перемещаться без затрат топлива.",
        },
    },

    en: {
        // ═══════════════════════════════════════════════════════════════
        // TIER 1 - Basic Technologies
        // ═══════════════════════════════════════════════════════════════

        // Ship Systems
        reinforced_hull: {
            name: "Reinforced Hull",
            description: "Improved alloys increase all module health by 10%.",
        },
        efficient_reactor: {
            name: "Efficient Reactor",
            description: "Reactor optimization provides +15% power generation.",
        },

        // Weapons
        targeting_matrix: {
            name: "Targeting Matrix",
            description:
                "Improved targeting systems increase weapon damage by 10%.",
        },

        // Science
        scanner_mk2: {
            name: "Scanner Module +1",
            description: "Scanner upgrade increases scan range by +1.",
        },

        // Engineering
        automated_repair: {
            name: "Automated Repair",
            description: "Repair nanites restore 2% module health every turn.",
        },

        // Biology
        medbay_upgrade: {
            name: "Medbay Upgrade",
            description: "Medical technologies increase crew health by 15%.",
        },

        // ═══════════════════════════════════════════════════════════════
        // TIER 2 - Advanced Technologies
        // ═══════════════════════════════════════════════════════════════

        // Ship Systems
        shield_booster: {
            name: "Shield Booster",
            description:
                "New generation shield generators provide +25% protection.",
        },

        // Weapons
        plasma_weapons: {
            name: "Plasma Weapons",
            description: "Unlocks plasma cannons that ignore 25% armor.",
        },

        // Science
        quantum_scanner: {
            name: "Scanner Module +2",
            description: "Quantum sensors increase scan range by +2.",
        },

        // Engineering
        cargo_expansion: {
            name: "Cargo Expansion",
            description:
                "Compact storage technologies increase cargo bay by 50%.",
        },

        // Biology
        crew_training: {
            name: "Crew Training Program",
            description: "Improved training gives crew +25% experience gain.",
        },

        // ═══════════════════════════════════════════════════════════════
        // TIER 3 - Elite Technologies
        // ═══════════════════════════════════════════════════════════════

        // Ship Systems
        phase_shield: {
            name: "Phase Shield",
            description:
                "Phase-shift shields have 20% chance to fully absorb attacks.",
        },

        // Weapons
        antimatter_weapons: {
            name: "Antimatter Weapons",
            description: "Antimatter cannons deal double damage to shields.",
        },

        // Science
        deep_scan: {
            name: "Scanner Module +3",
            description: "Deep scan technology increases range by +3.",
        },

        // Engineering
        nanite_hull: {
            name: "Nanite Hull",
            description:
                "Hull nanites restore 5% health of all modules every turn.",
        },

        // Biology
        genetic_enhancement: {
            name: "Genetic Enhancement",
            description: "Biological enhancements increase crew health by 30%.",
        },

        // ═══════════════════════════════════════════════════════════════
        // TIER 4 - Ancient Technologies (Endgame)
        // ═══════════════════════════════════════════════════════════════

        ancient_power: {
            name: "Power of the Ancients",
            description: "Ancient technologies provide +50% to all ship stats.",
        },
        warp_drive: {
            name: "Warp Drive",
            description:
                "Ancient drive allows travel without fuel consumption.",
        },
    },
};

// Helper function to get technology translation
export function getTechTranslation(
    techId: string,
    lang: "ru" | "en" = "ru",
): TechTranslation {
    return (
        TECH_TRANSLATIONS[lang][techId] || {
            name: techId,
            description: "",
        }
    );
}
