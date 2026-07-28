import type {
    CrewMember,
    Profession,
    TechPerkBranch,
    TechPerkTier,
} from "../types/crew";

export const TECH_TREE_TIERS: TechPerkTier[] = [3, 6, 9];

export interface TechPerkOption {
    value: number;
    /** Заглушка-эмодзи вместо иконки скилла — заменить на арт в отдельной ветке. */
    icon: string;
}

type TechTreeForProfession = Record<
    TechPerkTier,
    Record<TechPerkBranch, TechPerkOption>
>;

/**
 * Название и описание ветки живут в locale-файлах (ru.json/en.json,
 * секция "tech_tree"), а не здесь — в отличие от трейтов (constants/traits.ts),
 * где текст литеральный и только на русском. Эти два хелпера — единственное
 * место, где формируется ключ перевода, чтобы не дублировать шаблон строки
 * по всем местам использования.
 */
export const getTechPerkNameKey = (
    profession: Profession,
    tier: TechPerkTier,
    branch: TechPerkBranch,
): string => `tech_tree.${profession}.${tier}.${branch}.name`;

export const getTechPerkDescKey = (
    profession: Profession,
    tier: TechPerkTier,
    branch: TechPerkBranch,
): string => `tech_tree.${profession}.${tier}.${branch}.desc`;

export const TECH_TREE: Record<Profession, TechTreeForProfession> = {
    pilot: {
        3: {
            A: { value: 0.04, icon: "🌀" },
            B: { value: 0.15, icon: "💨" },
        },
        6: {
            A: { value: 0.08, icon: "🌀" },
            B: { value: 0.3, icon: "💨" },
        },
        9: {
            A: { value: 0.12, icon: "🌀" },
            B: { value: 1, icon: "💨" },
        },
    },
    engineer: {
        3: {
            A: { value: 0.08, icon: "🔧" },
            B: { value: 1, icon: "⚡" },
        },
        6: {
            A: { value: 0.12, icon: "🔧" },
            B: { value: 2, icon: "⚡" },
        },
        9: {
            A: { value: 0.18, icon: "🔧" },
            B: { value: 3, icon: "⚡" },
        },
    },
    medic: {
        3: {
            A: { value: 0.08, icon: "💉" },
            B: { value: 1, icon: "🧬" },
        },
        6: {
            A: { value: 0.12, icon: "💉" },
            B: { value: 2, icon: "🧬" },
        },
        9: {
            A: { value: 0.18, icon: "💉" },
            B: { value: 3, icon: "🧬" },
        },
    },
    scout: {
        3: {
            A: { value: 0.1, icon: "🧭" },
            B: { value: 0.1, icon: "🛡️" },
        },
        6: {
            A: { value: 0.18, icon: "🧭" },
            B: { value: 0.18, icon: "🛡️" },
        },
        9: {
            A: { value: 0.28, icon: "🧭" },
            B: { value: 0.28, icon: "🛡️" },
        },
    },
    scientist: {
        3: {
            A: { value: 0.1, icon: "🧠" },
            B: { value: 0.05, icon: "🏺" },
        },
        6: {
            A: { value: 0.15, icon: "🧠" },
            B: { value: 0.08, icon: "🏺" },
        },
        9: {
            A: { value: 0.2, icon: "🧠" },
            B: { value: 0.12, icon: "🏺" },
        },
    },
    gunner: {
        3: {
            A: { value: 0.05, icon: "🎯" },
            B: { value: 0.05, icon: "💥" },
        },
        6: {
            A: { value: 0.09, icon: "🎯" },
            B: { value: 0.09, icon: "💥" },
        },
        9: {
            A: { value: 0.14, icon: "🎯" },
            B: { value: 0.14, icon: "💥" },
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
