import type {
    CrewMember,
    Profession,
    TechPerkBranch,
    TechPerkTier,
} from "../types/crew";

export const TECH_TREE_TIERS: TechPerkTier[] = [3, 6, 9];

export interface TechPerkOption {
    name: string;
    desc: string;
    value: number;
    /** Заглушка-эмодзи вместо иконки скилла — заменить на арт в отдельной ветке. */
    icon: string;
}

type TechTreeForProfession = Record<
    TechPerkTier,
    Record<TechPerkBranch, TechPerkOption>
>;

export const TECH_TREE: Record<Profession, TechTreeForProfession> = {
    pilot: {
        3: {
            A: {
                name: "Ас пилотирования",
                desc: "+4% к уклонению корабля, пока вы в кабине",
                value: 0.04,
                icon: "🌀",
            },
            B: {
                name: "Мастер экстренного манёвра",
                desc: "+15% к шансу успешного отступления из боя",
                value: 0.15,
                icon: "💨",
            },
        },
        6: {
            A: {
                name: "Ас пилотирования",
                desc: "+8% к уклонению корабля, пока вы в кабине",
                value: 0.08,
                icon: "🌀",
            },
            B: {
                name: "Мастер экстренного манёвра",
                desc: "+30% к шансу успешного отступления из боя",
                value: 0.3,
                icon: "💨",
            },
        },
        9: {
            A: {
                name: "Ас пилотирования",
                desc: "+12% к уклонению корабля, пока вы в кабине",
                value: 0.12,
                icon: "🌀",
            },
            B: {
                name: "Мастер экстренного манёвра",
                desc: "Гарантированное отступление из боя",
                value: 1,
                icon: "💨",
            },
        },
    },
    engineer: {
        3: {
            A: {
                name: "Механик-виртуоз",
                desc: "+8% к эффективности ремонта и разгона реактора",
                value: 0.08,
                icon: "🔧",
            },
            B: {
                name: "Реакторный инженер",
                desc: "+1 к энергии каждого реактора корабля",
                value: 1,
                icon: "⚡",
            },
        },
        6: {
            A: {
                name: "Механик-виртуоз",
                desc: "+12% к эффективности ремонта и разгона реактора",
                value: 0.12,
                icon: "🔧",
            },
            B: {
                name: "Реакторный инженер",
                desc: "+2 к энергии каждого реактора корабля",
                value: 2,
                icon: "⚡",
            },
        },
        9: {
            A: {
                name: "Механик-виртуоз",
                desc: "+18% к эффективности ремонта и разгона реактора",
                value: 0.18,
                icon: "🔧",
            },
            B: {
                name: "Реакторный инженер",
                desc: "+3 к энергии каждого реактора корабля",
                value: 3,
                icon: "⚡",
            },
        },
    },
    medic: {
        3: {
            A: {
                name: "Полевой хирург",
                desc: "+8% к эффективности лечения",
                value: 0.08,
                icon: "💉",
            },
            B: {
                name: "Иммунолог",
                desc: "+1 HP пассивной регенерации за ход",
                value: 1,
                icon: "🧬",
            },
        },
        6: {
            A: {
                name: "Полевой хирург",
                desc: "+12% к эффективности лечения",
                value: 0.12,
                icon: "💉",
            },
            B: {
                name: "Иммунолог",
                desc: "+2 HP пассивной регенерации за ход",
                value: 2,
                icon: "🧬",
            },
        },
        9: {
            A: {
                name: "Полевой хирург",
                desc: "+18% к эффективности лечения",
                value: 0.18,
                icon: "💉",
            },
            B: {
                name: "Иммунолог",
                desc: "+3 HP пассивной регенерации за ход",
                value: 3,
                icon: "🧬",
            },
        },
    },
    scout: {
        3: {
            A: {
                name: "Опытный следопыт",
                desc: "+10% к находкам при разведке",
                value: 0.1,
                icon: "🧭",
            },
            B: {
                name: "Хладнокровный",
                desc: "-10% шанс негативного исхода при разведке",
                value: 0.1,
                icon: "🛡️",
            },
        },
        6: {
            A: {
                name: "Опытный следопыт",
                desc: "+18% к находкам при разведке",
                value: 0.18,
                icon: "🧭",
            },
            B: {
                name: "Хладнокровный",
                desc: "-18% шанс негативного исхода при разведке",
                value: 0.18,
                icon: "🛡️",
            },
        },
        9: {
            A: {
                name: "Опытный следопыт",
                desc: "+28% к находкам при разведке",
                value: 0.28,
                icon: "🧭",
            },
            B: {
                name: "Хладнокровный",
                desc: "-28% шанс негативного исхода при разведке",
                value: 0.28,
                icon: "🛡️",
            },
        },
    },
    scientist: {
        3: {
            A: {
                name: "Теоретик",
                desc: "+10% к личному вкладу в науку",
                value: 0.1,
                icon: "🧠",
            },
            B: {
                name: "Ксеноархеолог",
                desc: "+5% к силе эффектов артефактов",
                value: 0.05,
                icon: "🏺",
            },
        },
        6: {
            A: {
                name: "Теоретик",
                desc: "+15% к личному вкладу в науку",
                value: 0.15,
                icon: "🧠",
            },
            B: {
                name: "Ксеноархеолог",
                desc: "+8% к силе эффектов артефактов",
                value: 0.08,
                icon: "🏺",
            },
        },
        9: {
            A: {
                name: "Теоретик",
                desc: "+20% к личному вкладу в науку",
                value: 0.2,
                icon: "🧠",
            },
            B: {
                name: "Ксеноархеолог",
                desc: "+12% к силе эффектов артефактов",
                value: 0.12,
                icon: "🏺",
            },
        },
    },
    gunner: {
        3: {
            A: {
                name: "Снайпер",
                desc: "+5% к точности (в орудийном отсеке)",
                value: 0.05,
                icon: "🎯",
            },
            B: {
                name: "Разрушитель",
                desc: "+5% к шансу критического удара",
                value: 0.05,
                icon: "💥",
            },
        },
        6: {
            A: {
                name: "Снайпер",
                desc: "+9% к точности (в орудийном отсеке)",
                value: 0.09,
                icon: "🎯",
            },
            B: {
                name: "Разрушитель",
                desc: "+9% к шансу критического удара",
                value: 0.09,
                icon: "💥",
            },
        },
        9: {
            A: {
                name: "Снайпер",
                desc: "+14% к точности (в орудийном отсеке)",
                value: 0.14,
                icon: "🎯",
            },
            B: {
                name: "Разрушитель",
                desc: "+14% к шансу критического удара",
                value: 0.14,
                icon: "💥",
            },
        },
    },
};

/**
 * Эффективный бонус ветки для члена экипажа: максимум среди уже выбранных
 * тиров этой ветки (повторный выбор той же ветки на более высоком уровне
 * заменяет старое значение, а не складывается с ним).
 */
export function getTechPerkValue(
    crewMember: Pick<CrewMember, "profession" | "techPerks">,
    branch: TechPerkBranch,
): number {
    const tree = TECH_TREE[crewMember.profession];
    if (!tree || !crewMember.techPerks) return 0;

    let max = 0;
    for (const tier of TECH_TREE_TIERS) {
        if (crewMember.techPerks[tier] === branch) {
            max = Math.max(max, tree[tier][branch].value);
        }
    }
    return max;
}
