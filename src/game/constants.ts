import type {
    Profession,
    CrewTrait,
    Artifact,
    AncientBoss,
    Race,
    RaceId,
    Weapon,
    WeaponDetails,
    PartialModuleType,
    GalaxyTier,
} from "./types";

// ═══════════════════════════════════════════════════════════════
// GALACTIC RACES - Species system
// ═══════════════════════════════════════════════════════════════

export const RACES: Record<RaceId, Race> = {
    human: {
        id: "human",
        name: "Человек",
        pluralName: "Люди",
        adjective: "Человеческий",
        description:
            "Универсальная раса, освоившая космос. Быстро обучаются и адаптируются.",
        homeworld: "Земля",
        biology: {
            lifespan: "80-120 лет",
            diet: "omnivore",
            reproduction: "Естественное, 9 месяцев",
        },
        environmentPreference: {
            ideal: ["Лесная", "Океаническая", "Тропическая"],
            acceptable: ["Пустынная", "Арктическая", "Планета-кольцо"],
            hostile: [
                "Вулканическая",
                "Ледяная",
                "Газовый гигант",
                "Радиоактивная",
                "Разрушенная войной",
                "Приливная",
            ],
        },
        crewBonuses: {
            happiness: 10, // +10% base happiness (morale boost)
            health: 5, // +5 health regen per turn when resting
        },
        specialTraits: [
            {
                id: "adaptable",
                name: "Универсальность",
                description:
                    "+10% к базовому настроению, +5 к регенерации здоровья",
                type: "positive",
                effects: { happiness: 10, healthRegen: 5 },
            },
            {
                id: "quick_learner",
                name: "Быстрый ученик",
                description: "+15% к получаемому опыту",
                type: "positive",
                effects: { expBonus: 0.15 },
            },
        ],
        relations: {
            synthetic: -10, // Some distrust of AI
            xenosymbiont: 5, // Friendly curiosity
        },
        hasHappiness: true,
        hasFatigue: true,
        canGetSick: true,
        color: "#4a90d9",
        icon: "👤",
    },

    synthetic: {
        id: "synthetic",
        name: "Синтетик",
        pluralName: "Синтетики",
        adjective: "Синтетический",
        description:
            "Искусственный разум, созданный древней цивилизацией или людьми. Не имеют эмоций, но обладают безупречной логикой.",
        homeworld: "Неизвестно",
        biology: {
            lifespan: "Неограниченно",
            diet: "synthetic",
            reproduction: "Производство",
            specialNeeds: "Энергия для зарядки",
        },
        environmentPreference: {
            ideal: ["Вулканическая", "Радиоактивная"],
            acceptable: [
                "Пустынная",
                "Ледяная",
                "Газовый гигант",
                "Арктическая",
                "Планета-кольцо",
                "Приливная",
            ],
            hostile: [
                "Лесная",
                "Океаническая",
                "Тропическая",
                "Разрушенная войной",
            ],
        },
        crewBonuses: {
            repair: 0.25, // +25% repair efficiency
            science: 0.25, // +25% research speed
        },
        specialTraits: [
            {
                id: "no_happiness",
                name: "Отсутствие эмоций",
                description:
                    "Не имеют счастья - иммунитет к моральным эффектам",
                type: "neutral",
                effects: { noHappiness: 1 },
            },
            {
                id: "tireless",
                name: "Неутомимость",
                description: "Никогда не устают",
                type: "positive",
                effects: { noFatigue: 1 },
            },
            {
                id: "ai_glitch",
                name: "Сбой ИИ",
                description: "Иногда принимают нелогичные решения",
                type: "negative",
                effects: { glitchChance: 0.05 },
            },
        ],
        relations: {
            human: -10,
            xenosymbiont: -20,
        },
        hasHappiness: false,
        hasFatigue: false,
        canGetSick: false,
        color: "#00d4ff",
        icon: "🤖",
    },

    xenosymbiont: {
        id: "xenosymbiont",
        name: "Ксеноморф-симбионт",
        pluralName: "Ксеноморфы-симбионты",
        adjective: "Симбионтский",
        description:
            'Полуорганические существа, живущие в симбиозе с технологиями. Могут "сращиваться" с кораблём.',
        homeworld: "Неизвестная планета в Тире 3",
        biology: {
            lifespan: "200-500 лет",
            diet: "energy",
            reproduction: "Почкование",
            specialNeeds: "Биоинтерфейс для сращивания",
        },
        environmentPreference: {
            ideal: ["Океаническая", "Тропическая"],
            acceptable: ["Лесная", "Ледяная", "Планета-кольцо"],
            hostile: [
                "Пустынная",
                "Вулканическая",
                "Газовый гигант",
                "Арктическая",
                "Радиоактивная",
                "Разрушенная войной",
                "Приливная",
            ],
        },
        crewBonuses: {
            energy: -0.25, // -25% energy consumption by modules
            health: 10, // +10 health (regenerative biology)
        },
        specialTraits: [
            {
                id: "symbiosis",
                name: "Техно-симбиоз",
                description:
                    "Могут сращиваться с кораблём, получая уникальные трейты",
                type: "positive",
                effects: { canMerge: 1 },
            },
            {
                id: "disturbing_presence",
                name: "Беспокоящее присутствие",
                description: "Снижают счастье людей в экипаже",
                type: "negative",
                effects: { humanHappinessPenalty: -5 },
            },
        ],
        relations: {
            human: 5,
            synthetic: -20,
            crystalline: 15,
        },
        hasHappiness: true,
        hasFatigue: true,
        canGetSick: true,
        color: "#aa55ff",
        icon: "🦠",
    },

    krylorian: {
        id: "krylorian",
        name: "Крилорианец",
        pluralName: "Крилорианцы",
        adjective: "Крилорианский",
        description:
            "Воинственная рептилоидная раса с сильным чувством чести. Превосходные бойцы.",
        homeworld: "Крилор Прайм",
        biology: {
            lifespan: "150-200 лет",
            diet: "carnivore",
            reproduction: "Откладывание яиц",
            specialNeeds: "Тёплый климат",
        },
        environmentPreference: {
            ideal: ["Пустынная", "Тропическая", "Приливная"],
            acceptable: ["Вулканическая", "Лесная", "Разрушенная войной"],
            hostile: [
                "Ледяная",
                "Океаническая",
                "Газовый гигант",
                "Арктическая",
                "Радиоактивная",
                "Планета-кольцо",
            ],
        },
        crewBonuses: {
            combat: 0.35, // +35% combat efficiency (increased)
            health: 15, // +15 health (tough)
        },
        specialTraits: [
            {
                id: "warrior_honor",
                name: "Воинская честь",
                description: "+35% урон в бою, +15 к здоровью",
                type: "positive",
                effects: { combatBonus: 0.35, healthBonus: 15 },
            },
            {
                id: "intimidation",
                name: "Устрашение",
                description:
                    "Враги чаще промахиваются (-10% шанс попадания по кораблю)",
                type: "positive",
                effects: { evasionBonus: 0.1 },
            },
            {
                id: "cold_blooded",
                name: "Хладнокровие",
                description: "Медленнее на холодных планетах",
                type: "negative",
                effects: { coldPenalty: -0.2 },
            },
        ],
        relations: {
            human: 0,
            synthetic: -15,
            voidborn: 20,
        },
        hasHappiness: true,
        hasFatigue: true,
        canGetSick: true,
        color: "#ff6600",
        icon: "🦎",
    },

    voidborn: {
        id: "voidborn",
        name: "Порождённый Пустотой",
        pluralName: "Порождённые Пустотой",
        adjective: "Пустотный",
        description:
            "Существа, рождённые в глубинах космоса. Не нуждаются в атмосфере и комфорте.",
        homeworld: "Неизвестно",
        biology: {
            lifespan: "500-1000 лет",
            diet: "energy",
            reproduction: "Деление",
            specialNeeds: "Космическое излучение",
        },
        environmentPreference: {
            ideal: ["Газовый гигант", "Планета-кольцо", "Приливная"],
            acceptable: [
                "Пустынная",
                "Ледяная",
                "Вулканическая",
                "Арктическая",
                "Разрушенная войной",
            ],
            hostile: ["Лесная", "Океаническая", "Тропическая", "Радиоактивная"],
        },
        crewBonuses: {
            fuelEfficiency: 0.2, // +20% fuel efficiency (increased)
            happiness: -10, // Lower base happiness (don't care)
        },
        specialTraits: [
            {
                id: "void_child",
                name: "Дитя Пустоты",
                description: "+20% к эффективности топлива, не устаёт",
                type: "positive",
                effects: { fuelBonus: 0.2, noFatigue: 1 },
            },
            {
                id: "void_shield",
                name: "Пустотная защита",
                description:
                    "Щиты корабля восстанавливаются на 5% больше за ход",
                type: "positive",
                effects: { shieldRegen: 5 },
            },
            {
                id: "unnerving",
                name: "Беспокойство",
                description: "Их присутствие тревожит органиков",
                type: "negative",
                effects: { organicHappinessPenalty: -10 },
            },
            {
                id: "low_health",
                name: "Эфирное тело",
                description: "-20% к максимальному здоровью",
                type: "negative",
                effects: { healthPenalty: -0.2 },
            },
        ],
        relations: {
            human: -5,
            krylorian: 20,
            crystalline: 10,
        },
        hasHappiness: true,
        hasFatigue: false,
        canGetSick: false,
        color: "#9933ff",
        icon: "👁️",
    },

    crystalline: {
        id: "crystalline",
        name: "Кристаллоид",
        pluralName: "Кристаллоиды",
        adjective: "Кристаллический",
        description:
            "Разумные кристаллические существа. Медленно думают, но обладают огромной мудростью.",
        homeworld: "Геода Прайм",
        biology: {
            lifespan: "1000-5000 лет",
            diet: "mineral",
            reproduction: "Выращивание",
            specialNeeds: "Минералы для роста",
        },
        environmentPreference: {
            ideal: ["Ледяная", "Арктическая", "Планета-кольцо"],
            acceptable: ["Пустынная", "Газовый гигант", "Приливная"],
            hostile: [
                "Лесная",
                "Океаническая",
                "Вулканическая",
                "Тропическая",
                "Радиоактивная",
                "Разрушенная войной",
            ],
        },
        crewBonuses: {
            science: 0.4, // +40% research speed (increased)
            health: 5, // +5 health (crystalline durability)
        },
        specialTraits: [
            {
                id: "ancient_wisdom",
                name: "Древняя мудрость",
                description: "+40% к исследованиям и анализу аномалий",
                type: "positive",
                effects: { scienceBonus: 0.4 },
            },
            {
                id: "crystal_armor",
                name: "Кристаллическая броня",
                description: "+5% к защите модулей корабля",
                type: "positive",
                effects: { moduleDefense: 0.05 },
            },
            {
                id: "slow_thought",
                name: "Медленные мысли",
                description: "-15% к скорости передвижения",
                type: "negative",
                effects: { speedPenalty: -0.15 },
            },
            {
                id: "resonance",
                name: "Кристаллический резонанс",
                description: "Может усиливать артефакты Древних на 15%",
                type: "positive",
                effects: { artifactBonus: 0.15 },
            },
        ],
        relations: {
            human: 10,
            synthetic: 5,
            xenosymbiont: 15,
            voidborn: 10,
        },
        hasHappiness: true,
        hasFatigue: true,
        canGetSick: false,
        color: "#00ffaa",
        icon: "💎",
    },
};

// Get race by ID
export const getRaceById = (id: RaceId): Race | undefined => RACES[id];

// Get random race weighted by rarity
export const getRandomRace = (
    excludeIds: RaceId[] = ["human"],
    seed?: number,
): RaceId => {
    const weights: Record<RaceId, number> = {
        human: 40,
        synthetic: 15,
        xenosymbiont: 10,
        krylorian: 20,
        voidborn: 8,
        crystalline: 7,
    };

    const available = (Object.keys(weights) as RaceId[]).filter(
        (r) => !excludeIds.includes(r),
    );
    const totalWeight = available.reduce((sum, r) => sum + weights[r], 0);

    // Use seeded random if seed provided, otherwise use Math.random()
    let random: number;
    if (seed !== undefined) {
        random = (Math.abs(Math.sin(seed) * 10000) % 1) * totalWeight;
    } else {
        random = Math.random() * totalWeight;
    }

    for (const raceId of available) {
        random -= weights[raceId];
        if (random <= 0) return raceId;
    }

    return available[0];
};

// Generate race-appropriate name
export const getRandomRaceName = (
    raceId: RaceId,
    profession: Profession,
    seed?: number,
): string => {
    const profName = PROFESSION_NAMES[profession];

    const names: Record<RaceId, string[]> = {
        human: [
            "Смирнов",
            "Иванов",
            "Петров",
            "Сидоров",
            "Козлов",
            "Новиков",
            "Морозов",
            "Волков",
        ],
        synthetic: [
            "АЛЬФА",
            "БЕТА",
            "ГАММА",
            "ДЕЛЬТА",
            "ОМЕГА",
            "СИГМА",
            "ТЕТА",
            "ЗЕТА",
        ],
        xenosymbiont: [
            "Шшшииррр",
            "Ксссаррр",
            "Зззиттт",
            "Вввааассс",
            "Тттаннн",
            "Хххоррр",
        ],
        krylorian: ["Кр'асс", "З'орк", "Т'арк", "В'рас", "Г'орм", "К'итор"],
        voidborn: [
            "Эхо-7",
            "Тень-3",
            "Провал-12",
            "Бездна-5",
            "Мрак-9",
            "Сумрак-2",
        ],
        crystalline: [
            "Геода-Примус",
            "Кварц-Секундус",
            "Аметист-Терция",
            "Топаз-Кварта",
        ],
    };

    const raceNames = names[raceId] || names.human;

    let index: number;
    if (seed !== undefined) {
        // Deterministic selection based on seed
        // Combine seed with raceId and profession for more uniqueness
        let combinedSeed = seed;
        for (let i = 0; i < raceId.length; i++) {
            combinedSeed =
                (combinedSeed << 5) - combinedSeed + raceId.charCodeAt(i);
        }
        for (let i = 0; i < profession.length; i++) {
            combinedSeed =
                (combinedSeed << 5) - combinedSeed + profession.charCodeAt(i);
        }
        const hash = Math.abs(Math.sin(combinedSeed) * 10000);
        index = Math.floor(hash % raceNames.length);
    } else {
        // Fallback to random for backward compatibility
        index = Math.floor(Math.random() * raceNames.length);
    }

    const lastName = raceNames[index];

    return `${profName} ${lastName}`;
};

// ═══════════════════════════════════════════════════════════════

export const MODULE_TYPES: Record<
    PartialModuleType,
    { color: string; borderColor: string }
> = {
    reactor: { color: "#ffb00033", borderColor: "#ffb000" },
    cockpit: { color: "#00d4ff33", borderColor: "#00d4ff" },
    lifesupport: { color: "#00ff4133", borderColor: "#00ff41" },
    cargo: { color: "#ff004033", borderColor: "#ff0040" },
    weaponbay: { color: "#ff00ff33", borderColor: "#ff00ff" },
    shield: { color: "#0080ff33", borderColor: "#0080ff" },
    medical: { color: "#00ffaa33", borderColor: "#00ffaa" },
    scanner: { color: "#ffff0033", borderColor: "#ffff00" },
    engine: { color: "#ff660033", borderColor: "#ff6600" },
    fueltank: { color: "#9933ff33", borderColor: "#9933ff" },
    drill: { color: "#8b451333", borderColor: "#cd853f" },
    ai_core: { color: "#00ffff33", borderColor: "#00ffff" },
};

export const WEAPON_TYPES: Record<Weapon["type"], WeaponDetails> = {
    kinetic: {
        name: "Кинетическое",
        damage: 15,
        color: "#888888",
        icon: "●",
        description: "Игнорирует 50% защиты врага",
        armorPenetration: 0.5,
    },
    laser: {
        name: "Лазерное",
        damage: 20,
        color: "#ff0000",
        icon: "◆",
        description: "Точное попадание, +20% к урону по щитам",
        shieldBonus: 1.2,
    },
    missile: {
        name: "Ракетное",
        damage: 25,
        color: "#ffaa00",
        icon: "▲",
        description: "Высокий урон, но 20% могут быть сбиты щитами",
        interceptChance: 0.2,
    },
};

export const TRADE_GOODS: Record<string, { name: string; basePrice: number }> =
    {
        water: { name: "Вода", basePrice: 50 },
        food: { name: "Продукты", basePrice: 80 },
        medicine: { name: "Медикаменты", basePrice: 150 },
        electronics: { name: "Электроника", basePrice: 200 },
        minerals: { name: "Минералы", basePrice: 100 },
        rare_minerals: { name: "Редкие минералы", basePrice: 500 },
    };

// Extended crew traits with different rarities
export const CREW_TRAITS = {
    positive: [
        // Common positive traits (60% chance)
        {
            name: "Меткий стрелок",
            desc: "+10% к урону",
            effect: { damageBonus: 0.1 },
            rarity: "common",
            priceMod: 1.1,
        },
        {
            name: "Опытный",
            desc: "+15% эффективность",
            effect: { taskBonus: 0.15 },
            rarity: "common",
            priceMod: 1.15,
        },
        {
            name: "Харизматичный",
            desc: "+10 настроение команды",
            effect: { moraleBonus: 10 },
            rarity: "common",
            priceMod: 1.1,
        },
        {
            name: "Выносливый",
            desc: "+20% здоровье",
            effect: { healthBonus: 0.2 },
            rarity: "common",
            priceMod: 1.15,
        },
        {
            name: "Трудолюбивый",
            desc: "+10% к опыту",
            effect: { expBonus: 0.1 },
            rarity: "common",
            priceMod: 1.1,
        },
        {
            name: "Быстрый",
            desc: "+5% скорость действий",
            effect: { speedBonus: 0.05 },
            rarity: "common",
            priceMod: 1.1,
        },

        // Rare positive traits (30% chance)
        {
            name: "Ветеран",
            desc: "+25% к урону, +15% защита",
            effect: { damageBonus: 0.25, defenseBonus: 0.15 },
            rarity: "rare",
            priceMod: 1.4,
        },
        {
            name: "Гений",
            desc: "+30% эффективность, +20% опыт",
            effect: { taskBonus: 0.3, expBonus: 0.2 },
            rarity: "rare",
            priceMod: 1.5,
        },
        {
            name: "Лидер",
            desc: "+20 настроение команды, +10% эффективность",
            effect: { moraleBonus: 20, taskBonus: 0.1 },
            rarity: "rare",
            priceMod: 1.4,
        },
        {
            name: "Удачливый",
            desc: "+30% награды, +10% шанс успеха",
            effect: { lootBonus: 0.3, successBonus: 0.1 },
            rarity: "rare",
            priceMod: 1.45,
        },
        {
            name: "Непобедимый",
            desc: "+40% здоровье, +10% регенерация",
            effect: { healthBonus: 0.4, regenBonus: 0.1 },
            rarity: "rare",
            priceMod: 1.5,
        },

        // Legendary positive traits (10% chance)
        {
            name: "Легенда",
            desc: "+50% ко всем характеристикам",
            effect: { allBonus: 0.5 },
            rarity: "legendary",
            priceMod: 2.5,
        },
        {
            name: "Мастер",
            desc: "Двойной эффект от заданий",
            effect: { doubleTaskEffect: 1 },
            rarity: "legendary",
            priceMod: 2.8,
        },
        {
            name: "Везунчик",
            desc: "+50% награды, критический успех",
            effect: { lootBonus: 0.5, criticalSuccess: 0.15 },
            rarity: "legendary",
            priceMod: 2.6,
        },
    ],
    negative: [
        // Common negative traits (50% chance)
        {
            name: "Трус",
            desc: "-10 настроение в бою",
            effect: { combatMorale: -10 },
            rarity: "common",
            priceMod: 0.9,
        },
        {
            name: "Неряха",
            desc: "-5 настроение других",
            effect: { teamMorale: -5 },
            rarity: "common",
            priceMod: 0.9,
        },
        {
            name: "Болезненный",
            desc: "-15% здоровье",
            effect: { healthPenalty: 0.15 },
            rarity: "common",
            priceMod: 0.85,
        },
        {
            name: "Ленивый",
            desc: "-10% эффективность",
            effect: { taskPenalty: 0.1 },
            rarity: "common",
            priceMod: 0.85,
        },
        {
            name: "Медлительный",
            desc: "-10% скорость",
            effect: { speedPenalty: 0.1 },
            rarity: "common",
            priceMod: 0.9,
        },
        {
            name: "Неуклюжий",
            desc: "+10% шанс неудачи",
            effect: { failureChance: 0.1 },
            rarity: "common",
            priceMod: 0.85,
        },

        // Rare negative traits (30% chance)
        {
            name: "Жадный",
            desc: "-30% к цене продажи товаров",
            effect: { sellPenalty: 0.3 },
            rarity: "rare",
            priceMod: 0.7,
        },
        {
            name: "Пессимист",
            desc: "-20 настроение команды",
            effect: { teamMorale: -20 },
            rarity: "rare",
            priceMod: 0.65,
        },
        {
            name: "Хрупкий",
            desc: "-30% здоровье",
            effect: { healthPenalty: 0.3 },
            rarity: "rare",
            priceMod: 0.6,
        },
        {
            name: "Неудачник",
            desc: "-20% награды",
            effect: { lootPenalty: 0.2 },
            rarity: "rare",
            priceMod: 0.65,
        },
        {
            name: "Бунтарь",
            desc: "-15 настроение, риск дезертирства",
            effect: { moralePenalty: 15, desertionRisk: 0.1 },
            rarity: "rare",
            priceMod: 0.55,
        },
    ],
    // Mutation traits - from Ancient Biosphere curse
    mutation: [
        {
            name: "Мутация: Щупальца",
            desc: "+20% урон, -30% скорость",
            effect: { damageBonus: 0.2, speedPenalty: 0.3 },
            rarity: "mutation",
            priceMod: 1.0,
        },
        {
            name: "Мутация: Третий глаз",
            desc: "+15% крит, -10 счастья/ход",
            effect: { critBonus: 0.15, happinessDrain: 10 },
            rarity: "mutation",
            priceMod: 1.0,
        },
        {
            name: "Мутация: Хитин",
            desc: "+25% защита, -20% эффективность",
            effect: { defenseBonus: 0.25, taskPenalty: 0.2 },
            rarity: "mutation",
            priceMod: 1.0,
        },
        {
            name: "Мутация: Телепатия",
            desc: "Видит намерения, -15 мораль команды",
            effect: { ambushAvoid: 0.5, teamMorale: -15 },
            rarity: "mutation",
            priceMod: 1.0,
        },
        {
            name: "Мутация: Регенерация",
            desc: "+5 здоровье/ход, -25% макс. здоровье",
            effect: { regenBonus: 0.5, healthPenalty: 0.25 },
            rarity: "mutation",
            priceMod: 1.0,
        },
        {
            name: "Мутация: Фотосинтез",
            desc: "Не ест, но нужен свет",
            effect: { foodFree: 1, needsLight: 1 },
            rarity: "mutation",
            priceMod: 1.0,
        },
    ],
};

// Helper functions for mutation traits
export const getMutationTraitName = (type: string): string => {
    const names: Record<string, string> = {
        nightmares: "Мутация: Кошмары",
        paranoid: "Мутация: Паранойя",
        unstable: "Мутация: Нестабильность",
    };
    return names[type] || "Мутация";
};

export const getMutationTraitDesc = (type: string): string => {
    const descs: Record<string, string> = {
        nightmares: "-10 счастья каждый ход",
        paranoid: "-15 морали, +10% уклонение",
        unstable: "Случайные перепады настроения",
    };
    return descs[type] || "Неизвестная мутация";
};

export const PROFESSION_NAMES: Record<Profession, string> = {
    pilot: "Пилот",
    engineer: "Инженер",
    medic: "Медик",
    scout: "Разведчик",
    scientist: "Учёный",
    gunner: "Стрелок",
};

export const PROFESSION_DESCRIPTIONS: Record<Profession, string> = {
    pilot: "Может улучшать маневрирование и навигацию. Управляет щитами.",
    engineer: "Может ремонтировать и улучшать системы корабля.",
    medic: "Может лечить экипаж и поддерживать мораль в модуле.",
    scout: "Может исследовать пустые планеты и находить ресурсы.",
    scientist:
        "Может исследовать аномалии. Уровень определяет сложность аномалий.",
    gunner: "Управляет огнём корабля. Может выбирать цели в бою, +15% урон.",
};

export const CREW_ACTIONS: Record<
    Profession,
    { value: string; label: string; effect: string | null }[]
> = {
    pilot: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
        { value: "evasion", label: "Маневры", effect: "+15 щитов за ход" },
        { value: "navigation", label: "Навигация", effect: "-1⚡ потребление" },
    ],
    engineer: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
        { value: "power", label: "Разгон", effect: "+5⚡ генерация" },
        { value: "repair", label: "Ремонт", effect: "+15% броня за ход" },
        {
            value: "overclock",
            label: "Перегрузка",
            effect: "+25% урон,-10% броня",
        },
    ],
    medic: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
        { value: "heal", label: "Лечение", effect: "+20 здоровье" },
        { value: "morale", label: "Мораль", effect: "+15 настроение" },
        { value: "firstaid", label: "Медпаки", effect: "Защита при уроне" },
    ],
    scout: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
        { value: "patrol", label: "Патруль", effect: "+инфо о враге" },
    ],
    scientist: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
        {
            value: "research",
            label: "Исследование",
            effect: "+данные аномалий",
        },
    ],
    gunner: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
        {
            value: "targeting",
            label: "Прицеливание",
            effect: "Выбор цели,+15% урон",
        },
        {
            value: "rapidfire",
            label: "Скорострельность",
            effect: "+25% урон,-5% точность",
        },
    ],
};

export const SECTOR_NAMES = ["Альфа", "Бета", "Гамма", "Дельта", "Эпсилон"];
export const PLANET_TYPES = [
    "Пустынная",
    "Ледяная",
    "Лесная",
    "Вулканическая",
    "Океаническая",
    "Газовый гигант",
    "Радиоактивная",
    "Тропическая",
    "Арктическая",
    "Разрушенная войной",
    "Планета-кольцо",
    "Приливная",
];

// Planet type descriptions
export const PLANET_DESCRIPTIONS: Record<string, string> = {
    Пустынная:
        "Засушливый мир с экстремальными перепадами температур. Богата минералами, но требует импорта воды.",
    Ледяная:
        "Замерзший мир с подлёдными океанами. Перспективен для добычи дейтерия и редких газов.",
    Лесная: "Планета с богатой биосферой и умеренным климатом. Идеальна для колонизации и сельского хозяйства.",
    Вулканическая:
        "Геологически активный мир с постоянными извержениями. Богата серой и редкими металлами.",
    Океаническая:
        "Водный мир с архипелагами. Перспективен для рыболовства и добычи морских ресурсов.",
    "Газовый гигант":
        "Огромная планета из газа с мощными штормами. Добыча гелия-3 возможна только орбитальными станциями.",
    Радиоактивная:
        "Мир с высоким уровнем радиации после катастрофы или бомбардировки. Требует защитных костюмов.",
    Тропическая:
        "Влажная планета с густыми джунглями. Богата биоресурсами, но опасна болезнями.",
    Арктическая:
        "Холодный мир с ледяными пустошами. Перспективен для добычи льда и криогенных минералов.",
    "Разрушенная войной":
        "Планета, опустошённая древними конфликтами. Полна руин, артефактов и опасных зон.",
    "Планета-кольцо":
        "Планета с выраженной системой колец. Кольца богаты минералами и льдом.",
    Приливная:
        "Мир с мощной приливной активностью. Геотермальная энергия доступна, но поверхность нестабильна.",
};

export const ENEMY_TYPES = ["Пираты", "Рейдеры", "Наёмники", "Мародёры"];

// Generate crew traits based on quality level
export const generateCrewTraits = (
    quality: "poor" | "average" | "good" | "excellent" = "average",
    seed: number = 0,
): { traits: CrewTrait[]; priceModifier: number } => {
    const traits: CrewTrait[] = [];
    let priceModifier = 1;

    const positiveChance = {
        poor: 0.3,
        average: 0.5,
        good: 0.7,
        excellent: 0.9,
    }[quality];
    const negativeChance = {
        poor: 0.6,
        average: 0.4,
        good: 0.2,
        excellent: 0.1,
    }[quality];
    const rareChance = { poor: 0.05, average: 0.15, good: 0.3, excellent: 0.5 }[
        quality
    ];
    const legendaryChance = {
        poor: 0,
        average: 0.05,
        good: 0.1,
        excellent: 0.2,
    }[quality];

    // Seeded random helper
    const seededRandom = (offset: number) => {
        return Math.abs(Math.sin(seed + offset) * 10000) % 1;
    };

    // Add positive trait
    if (seededRandom(100) < positiveChance) {
        const roll = seededRandom(101);
        let pool;
        if (roll < legendaryChance) {
            pool = CREW_TRAITS.positive.filter((t) => t.rarity === "legendary");
        } else if (roll < rareChance) {
            pool = CREW_TRAITS.positive.filter((t) => t.rarity === "rare");
        } else {
            pool = CREW_TRAITS.positive.filter((t) => t.rarity === "common");
        }
        if (pool.length > 0) {
            const trait = pool[Math.floor(seededRandom(102) * pool.length)];
            traits.push({
                name: trait.name,
                desc: trait.desc,
                effect: trait.effect,
                type: "positive",
            });
            priceModifier *= trait.priceMod;
        }
    }

    // Add negative trait
    if (seededRandom(200) < negativeChance) {
        const roll = seededRandom(201);
        let pool;
        if (roll < 0.2) {
            pool = CREW_TRAITS.negative.filter((t) => t.rarity === "rare");
        } else {
            pool = CREW_TRAITS.negative.filter((t) => t.rarity === "common");
        }
        if (pool.length > 0) {
            const trait = pool[Math.floor(seededRandom(202) * pool.length)];
            traits.push({
                name: trait.name,
                desc: trait.desc,
                effect: trait.effect,
                type: "negative" as const,
            });
            priceModifier *= trait.priceMod;
        }
    }

    return { traits, priceModifier };
};

export const getRandomName = (profession: Profession): string => {
    const lastNames = [
        "Смирнов",
        "Иванов",
        "Петров",
        "Сидоров",
        "Козлов",
        "Новиков",
        "Морозов",
        "Волков",
        "Соколов",
        "Попов",
        "Лебедев",
        "Кузнецов",
        "Козлова",
        "Новикова",
        "Морозова",
    ];
    const profName = PROFESSION_NAMES[profession];
    return `${profName} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
};

// Base prices for crew by profession
export const CREW_BASE_PRICES: Record<Profession, number> = {
    pilot: 400,
    engineer: 450,
    medic: 500,
    scout: 550,
    scientist: 600,
    gunner: 500,
};

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
        effect: { type: "free_power", value: 5, active: false },
        discovered: false,
        researched: false,
        requiresScientistLevel: 2,
        rarity: "rare",
    },
    {
        id: "nanite_hull",
        name: "Нанитовая Обшивка",
        description:
            "Микроскопические роботы постоянно ремонтируют корпус корабля.",
        effect: { type: "shield_regen", value: 10, active: false },
        discovered: false,
        researched: false,
        requiresScientistLevel: 2,
        rarity: "rare",
    },
    {
        id: "quantum_scanner",
        name: "Квантовый Сканер",
        description:
            "Сканер с квантовым процессором. Значительно увеличивает дальность обнаружения.",
        effect: { type: "scan_boost", value: 2, active: false },
        discovered: false,
        researched: false,
        requiresScientistLevel: 2,
        rarity: "rare",
    },
    {
        id: "plasma_injector",
        name: "Плазменный Инжектор",
        description: "Усиливает урон всего оружия корабля на 20%.",
        effect: { type: "damage_boost", value: 0.2, active: false },
        discovered: false,
        researched: false,
        requiresScientistLevel: 2,
        rarity: "rare",
    },
    {
        id: "crystalline_armor",
        name: "Кристаллическая Броня",
        description:
            "Древнее покрытие из кристаллов. +2 к защите каждого модуля корабля.",
        effect: { type: "module_armor", value: 2, active: false },
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
            "20% шанс отразить атаку в случайный модуль врага без урона по кораблю.",
        effect: { type: "damage_reflect", value: 0.2, active: false },
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
        description: "25% шанс нанести критический удар (двойной урон) в бою.",
        effect: { type: "crit_chance", value: 0.25, active: false },
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
        description: "+15⚡ энергии каждый ход. Но тьма пожирает души экипажа.",
        effect: { type: "abyss_power", value: 15, active: false },
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
        description: "+50% ко всем наградам в кредитах. Но что-то ломается.",
        effect: { type: "credit_booster", value: 0.5, active: false },
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
        description: "Все модули автоматически чинятся на 3% за ход.",
        effect: { type: "auto_repair", value: 3, active: false },
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
        description: "+75% критический урон в бою. Мощность сжигает системы.",
        effect: { type: "critical_overload", value: 0.75, active: false },
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
        description: "+50 к максимальным щитам. Но экипаж чувствует холод.",
        effect: { type: "dark_shield", value: 50, active: false },
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

// Get artifact by ID
export const getArtifactById = (id: string): Artifact | undefined => {
    return ANCIENT_ARTIFACTS.find((a) => a.id === id);
};

// Get random undiscovered artifact weighted by rarity
export const getRandomUndiscoveredArtifact = (
    artifacts: Artifact[],
): Artifact | null => {
    const undiscovered = artifacts.filter((a) => !a.discovered);
    if (undiscovered.length === 0) return null;

    // Weight by rarity (cursed is moderately rare but not impossible)
    const weights: Record<string, number> = {
        rare: 60,
        legendary: 30,
        mythic: 10,
        cursed: 20,
    };
    const totalWeight = undiscovered.reduce(
        (sum, a) => sum + (weights[a.rarity] || 10),
        0,
    );
    let random = Math.random() * totalWeight;

    for (const artifact of undiscovered) {
        random -= weights[artifact.rarity] || 10;
        if (random <= 0) return artifact;
    }

    return undiscovered[0];
};

// Distress signal outcomes
export const DISTRESS_SIGNAL_OUTCOMES = {
    pirate_ambush: {
        name: "Засада пиратов",
        description: "Это ловушка! Пираты притворялись терпящими бедствие.",
        chance: 0.35, // 35% chance
    },
    survivors: {
        name: "Выжившие",
        description: "На борту настоящие выжившие, нуждающиеся в помощи.",
        chance: 0.3, // 30% chance
    },
    abandoned_cargo: {
        name: "Заброшенный груз",
        description: "Корабль покинут, но груз остался нетронутым.",
        chance: 0.35, // 35% chance
    },
};

// Determine distress signal outcome
export const determineSignalOutcome = (
    ambushChanceModifier: number = 0,
): "pirate_ambush" | "survivors" | "abandoned_cargo" => {
    const roll = Math.random();
    let cumulative = 0;

    // Eye of Singularity increases ambush chance by 50%
    const ambushChance = 0.35 + ambushChanceModifier;
    const survivorsChance = 0.3 - ambushChanceModifier / 2;
    const cargoChance = 0.35 - ambushChanceModifier / 2;

    const outcomes = [
        { type: "pirate_ambush", chance: ambushChance },
        { type: "survivors", chance: survivorsChance },
        { type: "abandoned_cargo", chance: cargoChance },
    ];

    for (const outcome of outcomes) {
        cumulative += outcome.chance;
        if (roll < cumulative)
            return outcome.type as
                | "pirate_ambush"
                | "survivors"
                | "abandoned_cargo";
    }

    return "abandoned_cargo";
};

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
    },
];

// Get boss by ID
export const getBossById = (id: string): AncientBoss | undefined => {
    return ANCIENT_BOSSES.find((b) => b.id === id);
};

// Get random boss for tier (used in sector generation)
export const getRandomBossForTier = (tier: GalaxyTier): AncientBoss | null => {
    const eligibleBosses = ANCIENT_BOSSES.filter((b) => b.tier <= tier);
    if (eligibleBosses.length === 0) return null;
    return eligibleBosses[Math.floor(Math.random() * eligibleBosses.length)];
};

// ═══════════════════════════════════════════════════════════════
// PLANET SPECIALIZATIONS - Unique activities per race
// ═══════════════════════════════════════════════════════════════

export interface PlanetSpecialization {
    id: string;
    name: string;
    description: string;
    icon: string;
    cost: number; // Cost in credits
    duration: number; // Turns required
    cooldown?: number; // Cooldown in turns (optional)
    requirements?: {
        minLevel?: number; // Minimum crew level
        maxLevel?: number; // Maximum crew level
        requiredModule?: string; // Required ship module
        requiredRace?: RaceId; // Only available for specific race
    };
    effects: {
        type: string;
        value: number | string;
        description: string;
    }[];
}

export const PLANET_SPECIALIZATIONS: Record<RaceId, PlanetSpecialization> = {
    human: {
        id: "human_academy",
        name: "Космическая Академия",
        description:
            "Военная академия людей предлагает обучение для членов экипажа. Интенсивная программа повышает боевую эффективность.",
        icon: "🎓",
        cost: 500,
        duration: 0, // Permanent
        cooldown: 999, // Once per planet
        requirements: {
            minLevel: 1,
            maxLevel: 3,
        },
        effects: [
            {
                type: "crew_level",
                value: 1,
                description: "+1 уровень выбранному члену экипажа",
            },
        ],
    },
    synthetic: {
        id: "synthetic_archives",
        name: "Архивы Данных",
        description:
            "Синтетики хранят знания древних цивилизаций. Можно получить ценную информацию о секторе.",
        icon: "📚",
        cost: 300,
        duration: 0, // Instant effect
        cooldown: 999,
        effects: [
            {
                type: "sector_scan",
                value: 1,
                description:
                    "Полное сканирование текущего сектора (все локации)",
            },
            {
                type: "artifact_hints",
                value: 3,
                description: "3 подсказки о местонахождении артефактов",
            },
        ],
    },
    xenosymbiont: {
        id: "xenosymbiont_lab",
        name: "Биолаборатория",
        description:
            "Ксилориане — мастера биотехнологий. Улучшите здоровье и регенерацию экипажа.",
        icon: "🧬",
        cost: 400,
        duration: 5,
        cooldown: 999,
        effects: [
            {
                type: "health_boost",
                value: 20,
                description:
                    "+20 к максимальному здоровью всему экипажу (постоянно)",
            },
            {
                type: "regen_boost",
                value: 5,
                description: "+5 к регенерации здоровья за ход",
            },
        ],
    },
    krylorian: {
        id: "krylorian_dojo",
        name: "Воинское Додзё",
        description:
            "Инсектоиды-крилориане — прирождённые воины. Обучение в додзё повышает боевые навыки.",
        icon: "⚔️",
        cost: 450,
        duration: 5,
        cooldown: 999,
        effects: [
            {
                type: "combat_bonus",
                value: 0.15,
                description: "+15% к урону в бою (постоянно для экипажа)",
            },
            {
                type: "evasion_bonus",
                value: 0.1,
                description: "+10% к уклонению от атак",
            },
        ],
    },
    voidborn: {
        id: "voidborn_ritual",
        name: "Мистический Ритуал",
        description:
            "Рождённые Пустотой проводят древние ритуалы для усиления артефактов и связи с космосом.",
        icon: "🔮",
        cost: 600,
        duration: 5,
        cooldown: 999,
        effects: [
            {
                type: "artifact_boost",
                value: 1,
                description:
                    "Усиление одного активного артефакта (+50% эффект)",
            },
            {
                type: "fuel_efficiency",
                value: 0.1,
                description: "+10% к эффективности топлива",
            },
        ],
    },
    crystalline: {
        id: "crystalline_resonator",
        name: "Кристальный Резонатор",
        description:
            "Кристаллические существа могут настроить энергосистемы корабля на резонанс с кристаллами.",
        icon: "💎",
        cost: 550,
        duration: 5,
        cooldown: 999,
        effects: [
            {
                type: "power_boost",
                value: 10,
                description: "+10 к максимальной энергии реактора",
            },
            {
                type: "shield_boost",
                value: 25,
                description: "+25 к максимальным щитам",
            },
        ],
    },
};
