import type {
  Race,
  RaceId,
  XenosymbiontMergeEffect,
  ModuleType,
} from "@/game/types";

export const RACES: Record<RaceId, Race> = {
  human: {
    id: "human",
    name: "Человек",
    pluralName: "Люди",
    adjective: "Человеческий",
    description:
      "Универсальная раса, освоившая космос. Быстро обучаются и адаптируются.",
    homeworld: "Земля",
    environmentPreference: {
      ideal: ["Лесная", "Океаническая", "Тропическая"],
      acceptable: ["Пустынная", "Арктическая", "Планета-кольцо", "Кристаллическая"],
      hostile: [
        "Вулканическая",
        "Ледяная",
        "Радиоактивная",
        "Разрушенная войной",
        "Приливная",
      ],
    },
    crewBonuses: {
      happiness: 10, // +10% base happiness (morale boost)
      healthRegen: 5, // +5 HP regen per turn (passive)
    },
    specialTraits: [
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
      krylorian: 0,
      voidborn: -5,
      crystalline: 10,
    },
    hasHappiness: true,
    hasFatigue: true,
    canGetSick: true,
    requiresOxygen: true,
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
    environmentPreference: {
      ideal: ["Вулканическая", "Радиоактивная"],
      acceptable: [
        "Пустынная",
        "Ледяная",
        "Арктическая",
        "Планета-кольцо",
        "Кристаллическая",
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
      krylorian: -15,
      crystalline: 5,
    },
    hasHappiness: false,
    hasFatigue: false,
    canGetSick: false,
    requiresOxygen: false,
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
    environmentPreference: {
      ideal: ["Океаническая", "Тропическая"],
      acceptable: ["Лесная", "Ледяная", "Планета-кольцо", "Кристаллическая"],
      hostile: [
        "Пустынная",
        "Вулканическая",
        "Арктическая",
        "Радиоактивная",
        "Разрушенная войной",
        "Приливная",
      ],
    },
    crewBonuses: {
      healthRegen: 10, // +10 HP/ход (регенеративная биология)
      heal: 0.25, // +25% к эффективности лечения (симбиотическая биология)
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
        description: "Снижают счастье органиков в экипаже на -5",
        type: "negative",
        effects: { alienPresencePenalty: -5 },
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
    requiresOxygen: true,
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
    environmentPreference: {
      ideal: ["Пустынная", "Тропическая", "Приливная"],
      acceptable: ["Вулканическая", "Лесная", "Разрушенная войной"],
      hostile: [
        "Ледяная",
        "Океаническая",
        "Арктическая",
        "Радиоактивная",
        "Планета-кольцо",
      ],
    },
    crewBonuses: {
      combat: 0.05,
      health: 15, // +15 к maxHealth при создании
    },
    specialTraits: [
      {
        id: "intimidation",
        name: "Устрашение",
        description:
          "Враги чаще промахиваются (-2% шанс попадания по кораблю)",
        type: "positive",
        effects: { evasionBonus: 0.02 },
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
    requiresOxygen: true,
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
    environmentPreference: {
      ideal: ["Планета-кольцо", "Приливная"],
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
      fuelEfficiency: 0.03, // +3% fuel efficiency per crew member (с убывающим эффектом)
      happiness: -10, // Lower base happiness (don't care)
    },
    specialTraits: [
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
        description: "Их присутствие тревожит органиков на -10",
        type: "negative",
        effects: { alienPresencePenalty: -10 },
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
    requiresOxygen: false,
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
    environmentPreference: {
      ideal: ["Ледяная", "Арктическая", "Планета-кольцо", "Кристаллическая"],
      acceptable: ["Пустынная", "Приливная"],
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
      science: 0.2, // +20% research speed (increased)
    },
    specialTraits: [
      {
        id: "crystal_armor",
        name: "Кристаллическая броня",
        description:
          "+0.5 защиты модулей за каждого кристаллоида в экипаже",
        type: "positive",
        effects: { moduleDefense: 0.5 },
      },
      {
        id: "resonance",
        name: "Кристаллический резонанс",
        description: "Может усиливать артефакты Древних на 15%",
        type: "positive",
        effects: { artifactBonus: 0.15 },
      },
      {
        id: "brittle_crystal",
        name: "Хрупкость",
        description: "-15% к максимальному здоровью",
        type: "negative",
        effects: { healthPenalty: -0.15 },
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
    requiresOxygen: true,
    color: "#00ffaa",
    icon: "💎",
  },
};

export interface CrewNameDefinition {
  id: string;
  legacy: string;
}

export const RACE_CREW_NAMES: Record<
  RaceId,
  readonly CrewNameDefinition[]
> = {
  human: [
    // Русские и славянские
    { id: "human.smirnov", legacy: "Смирнов" },
    { id: "human.ivanov", legacy: "Иванов" },
    { id: "human.petrov", legacy: "Петров" },
    { id: "human.sokolov", legacy: "Соколов" },
    { id: "human.lebedev", legacy: "Лебедев" },
    { id: "human.kuznetsov", legacy: "Кузнецов" },
    { id: "human.novak", legacy: "Новак" },
    { id: "human.kowalski", legacy: "Ковальский" },
    { id: "human.dimitrov", legacy: "Димитров" },
    { id: "human.popescu", legacy: "Попеску" },

    // Немецкие
    { id: "human.schmidt", legacy: "Шмидт" },
    { id: "human.mueller", legacy: "Мюллер" },
    { id: "human.schneider", legacy: "Шнайдер" },
    { id: "human.fischer", legacy: "Фишер" },
    { id: "human.weber", legacy: "Вебер" },

    // Французские
    { id: "human.dupont", legacy: "Дюпон" },
    { id: "human.lefevre", legacy: "Лефевр" },
    { id: "human.moreau", legacy: "Моро" },
    { id: "human.girard", legacy: "Жирар" },
    { id: "human.blanc", legacy: "Блан" },

    // Английские
    { id: "human.smith", legacy: "Смит" },
    { id: "human.johnson", legacy: "Джонсон" },
    { id: "human.brown", legacy: "Браун" },
    { id: "human.taylor", legacy: "Тейлор" },
    { id: "human.anderson", legacy: "Андерсон" },

    // Испанские / Латиноамериканские
    { id: "human.garcia", legacy: "Гарсия" },
    { id: "human.martinez", legacy: "Мартинес" },
    { id: "human.rodriguez", legacy: "Родригес" },
    { id: "human.lopez", legacy: "Лопес" },
    { id: "human.hernandez", legacy: "Эрнандес" },

    // Итальянские
    { id: "human.rossini", legacy: "Россини" },
    { id: "human.bianchi", legacy: "Бьянки" },
    { id: "human.romano", legacy: "Романо" },
    { id: "human.greco", legacy: "Греко" },
    { id: "human.ferrari", legacy: "Феррари" },

    // Скандинавские
    { id: "human.andersen", legacy: "Андерсен" },
    { id: "human.nielsen", legacy: "Нильсен" },
    { id: "human.hansen", legacy: "Хансен" },
    { id: "human.johansson", legacy: "Йоханссон" },
    { id: "human.karlsson", legacy: "Карлссон" },

    // Ближний Восток
    { id: "human.haddad", legacy: "Хаддад" },
    { id: "human.nasser", legacy: "Нассер" },
    { id: "human.al_farouk", legacy: "Аль-Фарук" },
    { id: "human.karimov", legacy: "Каримов" },
    { id: "human.saidi", legacy: "Саиди" },

    // Восточная Европа / Балканы
    { id: "human.jovanovic", legacy: "Йованович" },
    { id: "human.stoyanov", legacy: "Стоянов" },
    { id: "human.kovac", legacy: "Ковач" },
    { id: "human.mazur", legacy: "Мазур" },
    { id: "human.tkachenko", legacy: "Ткаченко" },
    { id: "human.orlova", legacy: "Орлова" },
    { id: "human.belov", legacy: "Белов" },
    { id: "human.kim", legacy: "Ким" },
    { id: "human.navarro", legacy: "Наварро" },
    { id: "human.okoye", legacy: "Окойе" },
  ],

  synthetic: [
    { id: "synthetic.alpha", legacy: "АЛЬФА" },
    { id: "synthetic.beta", legacy: "БЕТА" },
    { id: "synthetic.gamma", legacy: "ГАММА" },
    { id: "synthetic.delta", legacy: "ДЕЛЬТА" },
    { id: "synthetic.omega", legacy: "ОМЕГА" },
    { id: "synthetic.sigma", legacy: "СИГМА" },
    { id: "synthetic.theta", legacy: "ТЕТА" },
    { id: "synthetic.zeta", legacy: "ЗЕТА" },
    { id: "synthetic.xr_17", legacy: "XR-17" },
    { id: "synthetic.mk_ultra", legacy: "MK-ULTRA" },
    { id: "synthetic.core_delta", legacy: "CORE-Δ" },
    { id: "synthetic.neuron_5", legacy: "НЕЙРОН-5" },
    { id: "synthetic.module_9", legacy: "МОДУЛЬ-9" },
    { id: "synthetic.archon_3", legacy: "АРХОН-3" },
    { id: "synthetic.helios_4", legacy: "ГЕЛИОС-4" },
    { id: "synthetic.lambda_9", legacy: "ЛЯМБДА-9" },
    { id: "synthetic.contour_12", legacy: "КОНТУР-12" },
    { id: "synthetic.vector_3", legacy: "ВЕКТОР-3" },
    { id: "synthetic.atlas_6", legacy: "АТЛАС-6" },
  ],

  xenosymbiont: [
    { id: "xenosymbiont.shshiirrr", legacy: "Шшшииррр" },
    { id: "xenosymbiont.ksssarr", legacy: "Ксссаррр" },
    { id: "xenosymbiont.zzzitt", legacy: "Зззиттт" },
    { id: "xenosymbiont.vvvaaasss", legacy: "Вввааассс" },
    { id: "xenosymbiont.tttannn", legacy: "Тттаннн" },
    { id: "xenosymbiont.khkkhorrr", legacy: "Хххоррр" },
    { id: "xenosymbiont.zhzhuuull", legacy: "Жжжууулл" },
    { id: "xenosymbiont.rrraaskh", legacy: "Ррраассх" },
    { id: "xenosymbiont.kkkziiit", legacy: "Кккзииит" },
    { id: "xenosymbiont.shaaalll", legacy: "Шааа'ллл" },
    { id: "xenosymbiont.vaaltir", legacy: "Ваал'тир" },
    { id: "xenosymbiont.shaarkes", legacy: "Шаар'кес" },
    { id: "xenosymbiont.nimzala", legacy: "Ним'зала" },
    { id: "xenosymbiont.tekorr", legacy: "Тек'орр" },
    { id: "xenosymbiont.ziirma", legacy: "Зиир'ма" },
  ],

  krylorian: [
    { id: "krylorian.krass", legacy: "Кр'асс" },
    { id: "krylorian.zork", legacy: "З'орк" },
    { id: "krylorian.tark", legacy: "Т'арк" },
    { id: "krylorian.vras", legacy: "В'рас" },
    { id: "krylorian.gorm", legacy: "Г'орм" },
    { id: "krylorian.kitor", legacy: "К'итор" },
    { id: "krylorian.draan", legacy: "Д'раан" },
    { id: "krylorian.skell", legacy: "С'келл" },
    { id: "krylorian.mzir", legacy: "М'зир" },
    { id: "krylorian.vtorrak", legacy: "В'торрак" },
    { id: "krylorian.tarek_voss", legacy: "Тарек Восс" },
    { id: "krylorian.lyra_kane", legacy: "Лира Кейн" },
    { id: "krylorian.oryn_tal", legacy: "Орин Тал" },
    { id: "krylorian.sella_ryn", legacy: "Селла Рин" },
    { id: "krylorian.veyr_kass", legacy: "Вейр Касс" },
  ],

  voidborn: [
    { id: "voidborn.echo_7", legacy: "Эхо-7" },
    { id: "voidborn.shadow_3", legacy: "Тень-3" },
    { id: "voidborn.rift_12", legacy: "Провал-12" },
    { id: "voidborn.abyss_5", legacy: "Бездна-5" },
    { id: "voidborn.darkness_9", legacy: "Мрак-9" },
    { id: "voidborn.twilight_2", legacy: "Сумрак-2" },
    { id: "voidborn.horizon_0", legacy: "Горизонт-0" },
    { id: "voidborn.pulsar_8", legacy: "Пульсар-8" },
    { id: "voidborn.null_13", legacy: "Нуль-13" },
    { id: "voidborn.singularity_4", legacy: "Сингулярность-4" },
    { id: "voidborn.void_echo", legacy: "Эхо Бездны" },
    { id: "voidborn.null_shade", legacy: "Нулевая Тень" },
    { id: "voidborn.rim_whisper", legacy: "Шёпот Предела" },
    { id: "voidborn.silent_pulse", legacy: "Тихий Импульс" },
    { id: "voidborn.ink_light", legacy: "Чернильный Свет" },
  ],

  crystalline: [
    { id: "crystalline.geode_primus", legacy: "Геода-Примус" },
    { id: "crystalline.quartz_secundus", legacy: "Кварц-Секундус" },
    { id: "crystalline.amethyst_tertia", legacy: "Аметист-Терция" },
    { id: "crystalline.topaz_quarta", legacy: "Топаз-Кварта" },
    { id: "crystalline.obsidian_prime", legacy: "Обсидиан-Прайм" },
    { id: "crystalline.citrine_lux", legacy: "Цитрин-Люкс" },
    { id: "crystalline.onyx_nova", legacy: "Оникс-Нова" },
    { id: "crystalline.granite_maximus", legacy: "Гранит-Максимус" },
    { id: "crystalline.basalt_itera", legacy: "Базальт-Итера" },
    { id: "crystalline.beryl_quinta", legacy: "Берилл-Квинта" },
    { id: "crystalline.opal_sexta", legacy: "Опал-Секста" },
    { id: "crystalline.sapphire_septima", legacy: "Сапфир-Септима" },
    { id: "crystalline.ruby_octava", legacy: "Рубин-Октава" },
    { id: "crystalline.diamond_nona", legacy: "Алмаз-Нона" },
  ],
} as const;

// ═══════════════════════════════════════════════════════════════
// XENOSYMBIONT MERGE EFFECTS
// ═══════════════════════════════════════════════════════════════
export const XENOSYMBIONT_MERGE_EFFECTS: Record<
  ModuleType,
  {
    name: string;
    description: string;
    effects: Omit<XenosymbiontMergeEffect, "moduleId" | "moduleType">;
  }
> = {
  // ═══════════════════════════════════════════════════════════
  // ЭНЕРГЕТИКА И ИНФРАСТРУКТУРА
  // ═══════════════════════════════════════════════════════════
  reactor: {
    name: "Симбиоз с реактором",
    description:
      "Ксеноморф срастается с реактором, оптимизируя энергопотоки",
    effects: {
      powerOutput: 10,
    },
  },

  cockpit: {
    name: "Нейронная связь с мостиком",
    description:
      "Симбионт улучшает управление кораблём через нейронную связь",
    effects: {
      evasionBonus: 5,
    },
  },

  lifesupport: {
    name: "Био-усиление систем жизнеобеспечения",
    description:
      "Ксеноморф улучшает циркуляцию кислорода и питательных веществ",
    effects: {
      oxygenEfficiency: 20,
      crewHealthRegen: 2,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // ОБОРУДОВАНИЕ И ХРАНЕНИЕ
  // ═══════════════════════════════════════════════════════════
  cargo: {
    name: "Органическая упаковка",
    description: "Груз оптимизирован биологическими структурами",
    effects: {
      cargoCapacity: 10,
    },
  },

  fueltank: {
    name: "Био-мембрана хранения",
    description: "Топливо хранится в органических резервуарах",
    effects: {
      fuelEfficiency: 15,
      fuelCapacity: 10,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // НАУКА И РАЗВЕДКА
  // ═══════════════════════════════════════════════════════════
  scanner: {
    name: "Органическое сканирование",
    description: "Био-сенсоры расширяют диапазон сканирования",
    effects: {
      scanRange: 3,
    },
  },

  lab: {
    name: "Био-лаборатория",
    description: "Живые структуры ускоряют исследования",
    effects: {
      researchSpeed: 15,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // БОЕВЫЕ СИСТЕМЫ
  // ═══════════════════════════════════════════════════════════
  weaponbay: {
    name: "Живое оружие",
    description: "Оружейные системы усилены био-усилителями",
    effects: {
      weaponDamage: 10,
      weaponAccuracy: 5,
    },
  },

  shield: {
    name: "Щитовой симбиоз",
    description: "Био-поле усиливает генератор щита",
    effects: {
      shieldRegenBonus: 15,
      shieldCapacity: 10,
    },
  },

  point_defense: {
    name: "Симбиоз с ПВО",
    description: "Био-сенсоры ускоряют наведение противоракетных систем",
    effects: {
      pointDefense: 10,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // МЕДИЦИНА И ПОДДЕРЖКА
  // ═══════════════════════════════════════════════════════════
  medical: {
    name: "Регенеративная камера",
    description: "Живые ткани увеличивают эффективность лечения",
    effects: {
      healing: 25,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // ДВИЖЕНИЕ И ДОБЫЧА
  // ═══════════════════════════════════════════════════════════
  engine: {
    name: "Био-двигатель",
    description: "Органические компоненты улучшают тягу",
    effects: {
      fuelEfficiency: 10,
    },
  },

  drill: {
    name: "Живой бур",
    description: "Био-минеральные структуры улучшают добычу",
    effects: {
      resourceYield: 10,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // ИСКУССТВЕННЫЙ ИНТЕЛЛЕКТ
  // ═══════════════════════════════════════════════════════════
  ai_core: {
    name: "Нейро-синтез",
    description: "Симбиоз органического и искусственного интеллекта",
    effects: {
      glitchResistance: 50,
    },
  },

  quarters: {
    name: "Симбиоз с жилым модулем",
    description: "Ксеноморф срастается с жилыми помещениями, улучшая регенерацию экипажа",
    effects: { crewHealthRegen: 5 },
  },
  repair_bay: {
    name: "Симбиоз с ремонтным отсеком",
    description: "Ксеноморф улучшает эффективность ремонтных дронов (+50% HP к ремонту)",
    effects: { repairBonus: 50 },
  },
  // weaponShed не поддерживает сращивание
  weaponShed: {
    name: "",
    description: "",
    effects: {},
  },
  // Гибридные модули — базовый эффект сращивания
  bio_research_lab: {
    name: "Симбиоз с биолабораторией",
    description: "Ксеноморф ускоряет биологические исследования (+25% скорость науки)",
    effects: { researchSpeed: 25 },
  },
  pulse_drive: {
    name: "Симбиоз с пульс-двигателем",
    description: "Ксеноморф снижает расход топлива (-10%)",
    effects: { fuelEfficiency: 10 },
  },
  habitat_module: {
    name: "Симбиоз с жилым модулем",
    description: "Ксеноморф восстанавливает здоровье соседей",
    effects: { healing: 10 },
  },
  deep_survey_array: {
    name: "Симбиоз с сканером",
    description: "Ксеноморф расширяет дальность сканирования (+1 клетка)",
    effects: { scanRange: 1 },
  },
};
