// Technology translations for Research Panel

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
        reinforced_hull: {
            name: "Металлургия сплавов",
            description:
                "Экзотические сплавы нового поколения повышают прочность всех модулей на 10%.",
        },
        efficient_reactor: {
            name: "Термоядерный синтез",
            description:
                "Усовершенствованные камеры синтеза увеличивают выработку энергии реактора на 15%.",
        },
        targeting_matrix: {
            name: "Баллистические вычисления",
            description:
                "Продвинутые алгоритмы наведения улучшают точность стрельбы и урон оружия на 10%.",
        },
        scanner_mk2: {
            name: "Дистанционное зондирование",
            description:
                "Сенсорные технологии нового поколения расширяют дальность сканирования на +1 сектор.",
        },
        automated_repair: {
            name: "Нанороботика",
            description:
                "Рой нанороботов непрерывно восстанавливает повреждения — 2% прочности модулей за ход.",
        },
        medbay_upgrade: {
            name: "Экзобиология",
            description:
                "Изучение инопланетных организмов совершенствует медицинские протоколы, давая экипажу +15% здоровья.",
        },

        // ═══════════════════════════════════════════════════════════════
        // TIER 2 - Advanced Technologies
        // ═══════════════════════════════════════════════════════════════
        xenobiology: {
            name: "Ксенобиология",
            description:
                "Изучение инопланетной биологии позволяет лечить мутации экипажа на медицинских станциях.",
        },
        ion_drive: {
            name: "Ионная пропульсия",
            description:
                "Ионные двигатели снижают расход топлива на 30% и повышают КПД энергосистем на 10%.",
        },
        shield_booster: {
            name: "Электромагнитные поля",
            description:
                "Управление электромагнитными полями нового типа повышает мощность защитных щитов на 25%.",
        },
        combat_drones: {
            name: "Автономные системы",
            description:
                "Автономные боевые дроны атакуют цели без участия экипажа, давая +15% к урону.",
        },
        plasma_weapons: {
            name: "Физика плазмы",
            description:
                "Применение плазменных разрядов в бою открывает новое оружие и даёт +15% к урону.",
        },
        lab_network: {
            name: "Сетевая наука",
            description:
                "Объединение лабораторий в единую сеть ускоряет обмен данными и все исследования на 25%.",
        },
        quantum_scanner: {
            name: "Квантовая оптика",
            description:
                "Квантово-запутанные сенсоры сканируют пространство, расширяя дальность обнаружения на +2 сектора.",
        },
        cargo_expansion: {
            name: "Модульная архитектура",
            description:
                "Компактная компоновка грузовых отсеков увеличивает объём трюма на 30%.",
        },
        crew_training: {
            name: "Когнитивные технологии",
            description:
                "Нейропрограммы и симуляторы ускоряют обучение экипажа, давая +25% к получаемому опыту.",
        },

        // ═══════════════════════════════════════════════════════════════
        // TIER 3 - Elite Technologies
        // ═══════════════════════════════════════════════════════════════
        singularity_reactor: {
            name: "Гравитационная компрессия",
            description:
                "Управление микросингулярностью даёт неисчерпаемый источник энергии: +50% к мощности всех систем.",
        },
        phase_shield: {
            name: "Фазовая инженерия",
            description:
                "Фазовые щиты смещают атаки в другое измерение: 20% шанс полностью поглотить удар, +50% к мощности.",
        },
        quantum_torpedo: {
            name: "Квантовая запутанность",
            description:
                "Запутанные заряды телепортируются сквозь щиты противника, нанося +30% урона.",
        },
        antimatter_weapons: {
            name: "Физика антиматерии",
            description:
                "Аннигиляция антиматерии наносит двойной урон по щитам и увеличивает общий урон на 25%.",
        },
        deep_scan: {
            name: "Нейтринная томография",
            description:
                "Нейтринные детекторы просматривают материю насквозь, расширяя дальность сканирования на +3 сектора.",
        },
        nanite_hull: {
            name: "Молекулярная сборка",
            description:
                "Молекулярные машины в обшивке корабля непрерывно регенерируют 5% прочности всех модулей за ход.",
        },
        neural_interface: {
            name: "Нейрокибернетика",
            description:
                "Прямой интерфейс мозг-корабль ускоряет реакцию: +30% к опыту экипажа и скорости исследований.",
        },
        genetic_enhancement: {
            name: "Генная инженерия",
            description:
                "Целевая модификация ДНК укрепляет биологию экипажа: +30% к здоровью и +15% к опыту.",
        },

        // ═══════════════════════════════════════════════════════════════
        // TIER 4 - Ancient Technologies (Endgame)
        // ═══════════════════════════════════════════════════════════════
        void_resonance: {
            name: "Резонанс Пустоты",
            description:
                "Гармоники пространства Пустоты усиливают щиты на 40% и увеличивают урон всего оружия на 20%.",
        },
        ancient_power: {
            name: "Теория Древних",
            description:
                "Полная расшифровка технологий Древних открывает доступ к принципам, дающим +50% ко всем параметрам корабля.",
        },
        stellar_genetics: {
            name: "Звёздная генетика",
            description:
                "Изучение ДНК звёздных сущностей открывает путь к эволюции: +50% здоровья, +40% опыта экипажа, +20% скорость науки.",
        },
        warp_drive: {
            name: "Варп-метрика",
            description:
                "Управление метрикой пространства-времени позволяет прыгать между секторами без расхода топлива.",
        },

        // ═══════════════════════════════════════════════════════════════
        // ARTIFACT BRANCH
        // ═══════════════════════════════════════════════════════════════
        artifact_study: {
            name: "Реликварная наука",
            description:
                "Базовые протоколы работы с реликвиями Древних позволяют активировать на один артефакт больше.",
        },
        relic_chamber: {
            name: "Камера реликвий",
            description:
                "Специализированное хранилище усиливает взаимодействие с артефактами: +1 слот и +5% к их эффектам.",
        },
        ancient_resonance: {
            name: "Резонанс Древних",
            description:
                "Резонансная настройка корабельных систем под частоты реликвий: +1 слот и +10% к эффектам артефактов.",
        },
        artifact_mastery: {
            name: "Мастерство реликвий",
            description:
                "Полное единение с наследием Древних: +2 слота активных артефактов и +15% ко всем их эффектам.",
        },
        planetary_drill: {
            name: "Планетарный бур",
            description:
                "Адаптирует буровой модуль для работы на поверхности планет. Тип планеты определяет добычу: лёд — вода, вулканы — энергия, джунгли — биоматериалы и т.д.",
        },
        atmospheric_analysis: {
            name: "Атмосферный анализ",
            description:
                "Учёный может однократно собрать атмосферные образцы с любой пустой планеты. Тип атмосферы определяет полученные исследовательские ресурсы.",
        },
        storm_shields: {
            name: "Штормовые щиты",
            description:
                "Специальные экранирующие поля снижают урон от всех типов штормов на 50%.",
        },
        modular_arsenal: {
            name: "Модульный арсенал",
            description:
                "Переработка конструкции оружейных палуб позволяет разместить на 1 орудие больше в каждом отсеке. Двойные палубы вмещают 3 орудия вместо 2.",
        },
        ion_cannon: {
            name: "Ионная пушка",
            description:
                "Разработка ионного орудия, которое наносит огромный урон щитам (×4), но не повреждает корпус. Незаменимо для снятия щитов перед добивающим залпом.",
        },
    },

    en: {
        // ═══════════════════════════════════════════════════════════════
        // TIER 1 - Basic Technologies
        // ═══════════════════════════════════════════════════════════════
        reinforced_hull: {
            name: "Alloy Metallurgy",
            description:
                "Next-generation exotic alloys increase durability of all modules by 10%.",
        },
        efficient_reactor: {
            name: "Fusion Engineering",
            description:
                "Improved fusion chambers increase reactor power output by 15%.",
        },
        targeting_matrix: {
            name: "Ballistic Computing",
            description:
                "Advanced targeting algorithms improve weapon accuracy and damage by 10%.",
        },
        scanner_mk2: {
            name: "Remote Sensing",
            description:
                "Next-gen sensor technology extends scan range by +1 sector.",
        },
        automated_repair: {
            name: "Nanorobotics",
            description:
                "A nanite swarm continuously repairs damage — restoring 2% module health per turn.",
        },
        medbay_upgrade: {
            name: "Exobiology",
            description:
                "Study of alien organisms improves medical protocols, increasing crew health by 15%.",
        },

        // ═══════════════════════════════════════════════════════════════
        // TIER 2 - Advanced Technologies
        // ═══════════════════════════════════════════════════════════════
        xenobiology: {
            name: "Xenobiology",
            description:
                "Study of alien biology enables treating crew mutations at medical stations.",
        },
        ion_drive: {
            name: "Ion Propulsion",
            description:
                "Ion engines reduce fuel consumption by 30% and improve power efficiency by 10%.",
        },
        shield_booster: {
            name: "Electromagnetic Fields",
            description:
                "Mastery of new electromagnetic field types increases shield power by 25%.",
        },
        combat_drones: {
            name: "Autonomous Systems",
            description:
                "Autonomous combat drones attack targets without crew input, providing +15% damage.",
        },
        plasma_weapons: {
            name: "Plasma Physics",
            description:
                "Weaponized plasma discharges unlock new armaments and provide +15% damage.",
        },
        lab_network: {
            name: "Network Science",
            description:
                "Networking all laboratories accelerates data sharing and all research by 25%.",
        },
        quantum_scanner: {
            name: "Quantum Optics",
            description:
                "Quantum-entangled sensors scan space, extending detection range by +2 sectors.",
        },
        cargo_expansion: {
            name: "Modular Architecture",
            description:
                "Compact cargo bay design principles increase cargo capacity by 30%.",
        },
        crew_training: {
            name: "Cognitive Technology",
            description:
                "Neural programs and simulators accelerate crew learning, providing +25% experience gain.",
        },

        // ═══════════════════════════════════════════════════════════════
        // TIER 3 - Elite Technologies
        // ═══════════════════════════════════════════════════════════════
        singularity_reactor: {
            name: "Gravitational Compression",
            description:
                "Harnessing a micro-singularity provides an inexhaustible energy source: +50% power to all systems.",
        },
        phase_shield: {
            name: "Phase Engineering",
            description:
                "Phase shields deflect attacks into another dimension: 20% chance to fully absorb a hit, +50% power.",
        },
        quantum_torpedo: {
            name: "Quantum Entanglement",
            description:
                "Entangled warheads teleport through enemy shields, dealing +30% damage.",
        },
        antimatter_weapons: {
            name: "Antimatter Physics",
            description:
                "Matter-antimatter annihilation deals double damage to shields and +25% overall damage.",
        },
        deep_scan: {
            name: "Neutrino Tomography",
            description:
                "Neutrino detectors see through matter, extending scan range by +3 sectors.",
        },
        nanite_hull: {
            name: "Molecular Assembly",
            description:
                "Molecular machines in the hull continuously regenerate 5% of all module health per turn.",
        },
        neural_interface: {
            name: "Neurocybernetics",
            description:
                "Direct brain-ship interface accelerates reaction: +30% crew exp and research speed.",
        },
        genetic_enhancement: {
            name: "Genetic Engineering",
            description:
                "Targeted DNA modification strengthens crew biology: +30% health and +15% experience.",
        },

        // ═══════════════════════════════════════════════════════════════
        // TIER 4 - Ancient Technologies (Endgame)
        // ═══════════════════════════════════════════════════════════════
        void_resonance: {
            name: "Void Resonance",
            description:
                "Void-space harmonics amplify shields by 40% and increase all weapon damage by 20%.",
        },
        ancient_power: {
            name: "Theory of the Ancients",
            description:
                "Full decipherment of Ancient technology reveals principles granting +50% to all ship parameters.",
        },
        stellar_genetics: {
            name: "Stellar Genetics",
            description:
                "Studying the DNA of stellar entities unlocks evolutionary paths: +50% health, +40% crew exp, +20% research speed.",
        },
        warp_drive: {
            name: "Warp Metrics",
            description:
                "Mastery of spacetime metrics enables sector jumps without any fuel consumption.",
        },

        // ═══════════════════════════════════════════════════════════════
        // ARTIFACT BRANCH
        // ═══════════════════════════════════════════════════════════════
        artifact_study: {
            name: "Relic Science",
            description:
                "Basic protocols for working with Ancient relics allow activating one additional artifact.",
        },
        relic_chamber: {
            name: "Relic Chamber",
            description:
                "Specialized storage enhances interaction with artifacts: +1 slot and +5% to their effects.",
        },
        ancient_resonance: {
            name: "Ancient Resonance",
            description:
                "Tuning ship systems to relic frequencies: +1 slot and +10% to artifact effects.",
        },
        artifact_mastery: {
            name: "Relic Mastery",
            description:
                "Complete unity with the Ancient heritage: +2 active artifact slots and +15% to all their effects.",
        },
        planetary_drill: {
            name: "Planetary Drill",
            description:
                "Adapts the drill module for planetary surface operations. Resource yield depends on planet type: ice worlds yield water, volcanic worlds yield energy, jungles yield biomatter, and so on.",
        },
        atmospheric_analysis: {
            name: "Atmospheric Analysis",
            description:
                "A scientist can collect atmospheric samples from any empty planet once. Planet type determines which research resources are gathered.",
        },
        storm_shields: {
            name: "Storm Shields",
            description:
                "Specialized shielding fields reduce damage from all storm types by 50%.",
        },
        modular_arsenal: {
            name: "Modular Arsenal",
            description:
                "Redesigned weapon bay architecture allows one additional weapon per bay. Double bays hold 3 weapons instead of 2.",
        },
        ion_cannon: {
            name: "Ion Cannon",
            description:
                "Develops an ion weapon that deals massive shield damage (×4) but cannot damage the hull. Essential for stripping shields before a finishing volley.",
        },
    },
};

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
