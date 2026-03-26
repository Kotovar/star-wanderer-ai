import type { Augmentation, AugmentationId } from "@/game/types/augmentations";

export const AUGMENTATIONS: Record<AugmentationId, Augmentation> = {
    // ─── Profession augmentations ──────────────────────────────────────────

    neural_reflex: {
        id: "neural_reflex",
        name: "Нейрорефлекс",
        description: "Нейронный имплант сокращает время реакции пилота. +10% к уклонению корабля.",
        icon: "⚡",
        forProfession: "pilot",
        effect: { evasionBonus: 0.1 },
        installCost: 600,
    },

    nano_hands: {
        id: "nano_hands",
        name: "Нано-руки",
        description: "Нанороботы в руках инженера ускоряют починку модулей. +15% к эффективности ремонта.",
        icon: "🔩",
        forProfession: "engineer",
        effect: { repairBonus: 0.15 },
        installCost: 600,
    },

    accelerated_regen: {
        id: "accelerated_regen",
        name: "Ускоренная регенерация",
        description: "Биоимплант ускоряет регенерацию тканей. Медик лечит на 15% эффективнее.",
        icon: "💉",
        forProfession: "medic",
        effect: { healingBonus: 0.15 },
        installCost: 600,
    },

    optical_implant: {
        id: "optical_implant",
        name: "Оптический имплант",
        description: "Усиленное зрение позволяет разведчику провести 4 вылазки за ход вместо 3.",
        icon: "👁️",
        forProfession: "scout",
        effect: { extraScoutAttempts: 1 },
        installCost: 700,
    },

    memory_core: {
        id: "memory_core",
        name: "Память-ядро",
        description: "Синтетическое хранилище памяти ускоряет обработку данных. +20% к скорости исследований.",
        icon: "🧬",
        forProfession: "scientist",
        effect: { researchSpeedBonus: 0.2 },
        installCost: 650,
    },

    targeting_eye: {
        id: "targeting_eye",
        name: "Прицельный глаз",
        description: "Оптический прицел, интегрированный в сетчатку. +10% к точности, +5% к шансу крита.",
        icon: "🎯",
        forProfession: "gunner",
        effect: { accuracyBonus: 0.1, critBonus: 0.05 },
        installCost: 650,
    },

    // ─── Racial augmentations ──────────────────────────────────────────────

    overclock_core: {
        id: "overclock_core",
        name: "Разгон ядра",
        description: "Снятие ограничений процессора. +50% к эффектам задач, но 5% шанс сбоя ИИ за ход.",
        icon: "⚙️",
        forRace: "synthetic",
        effect: { actionSpeedBonus: 0.5, aiGlitchChance: 0.05 },
        installCost: 800,
    },

    symbiotic_armor: {
        id: "symbiotic_armor",
        name: "Симбиотическая броня",
        description: "Организм преобразует 5% нанесённого урона во врагов в собственные ХП.",
        icon: "🦠",
        forRace: "xenosymbiont",
        effect: { damageToHp: 0.05 },
        installCost: 750,
    },

    phase_step: {
        id: "phase_step",
        name: "Фазовый шаг",
        description: "Частичный фазовый сдвиг тела. 50% шанс полностью избежать урона при попадании по модулю.",
        icon: "👻",
        forRace: "voidborn",
        effect: { fullDodgeChance: 0.5 },
        installCost: 750,
    },

    prismatic_lens: {
        id: "prismatic_lens",
        name: "Призматическая линза",
        description: "Кристаллическая линза фокусирует лазерное оружие. +5% к урону лазерного оружия.",
        icon: "💎",
        forRace: "crystalline",
        effect: { laserDamageBonus: 0.05 },
        installCost: 700,
    },
};

export const AUGMENTATION_INSTALL_BASE_COST = 600;
