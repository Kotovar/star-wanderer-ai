import type {
    Augmentation,
    AugmentationEffect,
    AugmentationId,
} from "@/game/types/augmentations";
import type { Profession } from "@/game/types/crew";

/**
 * Бонус аугментации члена экипажа с дефолтом 0.
 * Единственная точка чтения effect в формулах — не дублировать по коду.
 */
export const getAugmentationBonus = (
    crewMember: { augmentation?: AugmentationId | null } | undefined | null,
    key: keyof AugmentationEffect,
): number =>
    crewMember?.augmentation
        ? (AUGMENTATIONS[crewMember.augmentation]?.effect?.[key] ?? 0)
        : 0;

/** Number of additional scouting sorties granted by the installed implant. */
export const getExtraScoutAttempts = (
    crewMember: { augmentation?: AugmentationId | null } | undefined | null,
): number => Math.max(0, Math.floor(getAugmentationBonus(crewMember, "extraScoutAttempts")));

/** Лучший имплант разведгруппы определяет число вылазок за ход. */
export const getMaxExtraScoutAttempts = (
    crewMembers: { augmentation?: AugmentationId | null }[],
): number =>
    crewMembers.reduce(
        (maxAttempts, crewMember) =>
            Math.max(maxAttempts, getExtraScoutAttempts(crewMember)),
        0,
    );

/** Несколько исследовательских имплантов дают убывающую отдачу. */
export const getDiminishingResearchSpeedBonus = (
    crewMembers: { augmentation?: AugmentationId | null }[],
): number =>
    1 -
    crewMembers.reduce(
        (remainingBonus, crewMember) =>
            remainingBonus *
            (1 - getAugmentationBonus(crewMember, "researchSpeedBonus")),
        1,
    );

export const AUGMENTATIONS: Record<AugmentationId, Augmentation> = {
    // ─── Profession augmentations ──────────────────────────────────────────

    neural_reflex: {
        id: "neural_reflex",
        name: "Нейрорефлекс",
        description: "Нейронный имплант сокращает время реакции пилота. +10% к уклонению корабля.",
        icon: "⚡",
        forProfession: "pilot",
        effect: { evasionBonus: 0.1 },
        rarity: "common",
        installCost: 650,
    },

    nano_hands: {
        id: "nano_hands",
        name: "Нано-руки",
        description: "Нанороботы в руках инженера ускоряют починку модулей. +15% к эффективности ремонта.",
        icon: "🔩",
        forProfession: "engineer",
        effect: { repairBonus: 0.15 },
        rarity: "common",
        installCost: 650,
    },

    accelerated_regen: {
        id: "accelerated_regen",
        name: "Ускоренная регенерация",
        description: "Биоимплант ускоряет регенерацию тканей. Медик лечит на 15% эффективнее.",
        icon: "💉",
        forProfession: "medic",
        effect: { healingBonus: 0.15 },
        rarity: "common",
        installCost: 650,
    },

    optical_implant: {
        id: "optical_implant",
        name: "Оптический имплант",
        description: "Усиленное зрение позволяет разведчику провести 4 вылазки за ход вместо 3.",
        icon: "👁️",
        forProfession: "scout",
        effect: { extraScoutAttempts: 1 },
        rarity: "common",
        installCost: 700,
    },

    memory_core: {
        id: "memory_core",
        name: "Память-ядро",
        description: "Синтетическое хранилище памяти ускоряет обработку данных. +20% к скорости исследований.",
        icon: "🧬",
        forProfession: "scientist",
        effect: { researchSpeedBonus: 0.2 },
        rarity: "uncommon",
        installCost: 1000,
    },

    targeting_eye: {
        id: "targeting_eye",
        name: "Прицельный глаз",
        description: "Оптический прицел, интегрированный в сетчатку. +10% к точности, +5% к шансу крита.",
        icon: "🎯",
        forProfession: "gunner",
        effect: { accuracyBonus: 0.1, critBonus: 0.05 },
        rarity: "uncommon",
        installCost: 1100,
    },

    survey_uplink: {
        id: "survey_uplink",
        name: "Картографический аплинк",
        description: "Нейросеть маршрутной разведки даёт разведчику ещё 2 вылазки за ход.",
        icon: "🛰️",
        forProfession: "scout",
        effect: { extraScoutAttempts: 2 },
        rarity: "rare",
        installCost: 2200,
    },

    quantum_memory_core: {
        id: "quantum_memory_core",
        name: "Квантовое память-ядро",
        description: "Квантовая память учёного ускоряет исследования на 40%.",
        icon: "🔬",
        forProfession: "scientist",
        effect: { researchSpeedBonus: 0.4 },
        rarity: "rare",
        installCost: 2500,
    },

    combat_cognition: {
        id: "combat_cognition",
        name: "Боевое предвидение",
        description: "Предиктивный боевой контур даёт стрелку +25% точности и +15% шанса крита.",
        icon: "🧿",
        forProfession: "gunner",
        effect: { accuracyBonus: 0.25, critBonus: 0.15 },
        rarity: "legendary",
        installCost: 5000,
    },

    // ─── Racial augmentations ──────────────────────────────────────────────

    adaptive_neural_link: {
        id: "adaptive_neural_link",
        name: "Адаптивный нейроузел",
        description: "Нейросеть синхронизирует действия экипажа. +15% к эффектам задач.",
        icon: "🧠",
        forRace: "human",
        effect: { actionSpeedBonus: 0.15 },
        rarity: "uncommon",
        installCost: 1100,
    },

    overclock_core: {
        id: "overclock_core",
        name: "Разгон ядра",
        description: "Снятие ограничений процессора. +50% к эффектам задач, но 5% шанс сбоя ИИ за ход.",
        icon: "⚙️",
        forRace: "synthetic",
        effect: { actionSpeedBonus: 0.5, aiGlitchChance: 0.05 },
        rarity: "legendary",
        installCost: 5000,
    },

    symbiotic_armor: {
        id: "symbiotic_armor",
        name: "Симбиотическая броня",
        description: "Организм преобразует 10% нанесённого урона во врагов в собственные ХП.",
        icon: "🦠",
        forRace: "xenosymbiont",
        effect: { damageToHp: 0.1 },
        rarity: "rare",
        installCost: 2400,
    },

    combat_targeting_matrix: {
        id: "combat_targeting_matrix",
        name: "Боевая матрица наведения",
        description: "Рептильные рефлексы усиливают боевую телеметрию. +5% к точности, +10% к шансу крита.",
        icon: "🦎",
        forRace: "krylorian",
        effect: { accuracyBonus: 0.05, critBonus: 0.1 },
        rarity: "rare",
        installCost: 2400,
    },

    phase_step: {
        id: "phase_step",
        name: "Фазовый шаг",
        description: "Частичный фазовый сдвиг тела. 50% шанс полностью избежать урона при попадании по модулю.",
        icon: "👻",
        forRace: "voidborn",
        effect: { fullDodgeChance: 0.5 },
        rarity: "legendary",
        installCost: 5000,
    },

    prismatic_lens: {
        id: "prismatic_lens",
        name: "Призматическая линза",
        description: "Кристаллическая линза фокусирует лазерное оружие. +5% к урону лазерного оружия.",
        icon: "💎",
        forRace: "crystalline",
        effect: { laserDamageBonus: 0.05 },
        rarity: "common",
        installCost: 700,
    },
};

/** Профильные импланты каждой профессии по возрастанию цены — это «ранг». */
const AUGMENTATIONS_BY_PROFESSION = Object.values(AUGMENTATIONS).reduce(
    (byProfession, augmentation) => {
        if (!augmentation.forProfession) return byProfession;
        const list = byProfession[augmentation.forProfession] ?? [];
        list.push(augmentation);
        byProfession[augmentation.forProfession] = list;
        return byProfession;
    },
    {} as Partial<Record<Profession, Augmentation[]>>,
);
Object.values(AUGMENTATIONS_BY_PROFESSION).forEach((list) =>
    list.sort((a, b) => a.installCost - b.installCost),
);

/**
 * Во что превращается имплант при переучивании.
 *
 * Имплант остаётся тем же железом — его перенастраивают под новую профессию,
 * а не меняют на другой: берётся имплант новой профессии того же ранга по
 * цене. Рангов у профессий разное количество (у пилота один, у стрелка два),
 * поэтому ранг зажимается по длине списка новой профессии.
 *
 * Расовые импланты от профессии не зависят и возвращаются как есть — как и
 * `null`, и всё, чего нет в каталоге.
 */
export const getRetrainedAugmentation = (
    augmentationId: AugmentationId | null | undefined,
    newProfession: Profession,
): AugmentationId | null => {
    if (!augmentationId) return null;
    const current = AUGMENTATIONS[augmentationId];
    if (!current?.forProfession) return augmentationId;
    if (current.forProfession === newProfession) return augmentationId;

    const currentRank =
        AUGMENTATIONS_BY_PROFESSION[current.forProfession]?.indexOf(current) ??
        -1;
    const target = AUGMENTATIONS_BY_PROFESSION[newProfession];
    if (currentRank < 0 || !target?.length) return augmentationId;

    return target[Math.min(currentRank, target.length - 1)].id;
};
