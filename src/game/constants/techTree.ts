import type {
    CrewMember,
    Profession,
    ProfessionalTechPerkBranch,
    TechPerkTier,
} from "../types/crew";
import type { RaceId } from "../types/races";
// Расширение обязательно: этот файл грузят чек-скрипты через
// --experimental-strip-types, а он не дорезолвит относительный путь без него
import { isWorkingCrew } from "../crew/stationed.ts";

export const TECH_TREE_TIERS: TechPerkTier[] = [3, 6, 9];

export interface TechPerkOption {
    value: number;
    /** Заглушка-эмодзи вместо иконки скилла — заменить на арт в отдельной ветке. */
    icon: string;
}

type TechTreeForProfession = Record<
    TechPerkTier,
    Record<ProfessionalTechPerkBranch, TechPerkOption>
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
    branch: ProfessionalTechPerkBranch,
): string => `tech_tree.${profession}.${tier}.${branch}.name`;

export const getTechPerkDescKey = (
    profession: Profession,
    tier: TechPerkTier,
    branch: ProfessionalTechPerkBranch,
): string => `tech_tree.${profession}.${tier}.${branch}.desc`;

export const TECH_TREE: Record<Profession, TechTreeForProfession> = {
    pilot: {
        3: {
            A: { value: 0.03, icon: "🌀" },
            B: { value: 0.03, icon: "💨" },
        },
        6: {
            A: { value: 0.04, icon: "🌀" },
            B: { value: 0.04, icon: "💨" },
        },
        9: {
            A: { value: 0.05, icon: "🌀" },
            B: { value: 0.05, icon: "💨" },
        },
    },
    engineer: {
        3: {
            A: { value: 0.04, icon: "🔧" },
            B: { value: 1, icon: "⚡" },
        },
        6: {
            A: { value: 0.06, icon: "🔧" },
            B: { value: 1, icon: "⚡" },
        },
        9: {
            A: { value: 0.08, icon: "🔧" },
            B: { value: 1, icon: "⚡" },
        },
    },
    medic: {
        3: {
            A: { value: 0.04, icon: "💉" },
            B: { value: 1, icon: "🧬" },
        },
        6: {
            A: { value: 0.06, icon: "💉" },
            B: { value: 1, icon: "🧬" },
        },
        9: {
            A: { value: 0.08, icon: "💉" },
            B: { value: 1, icon: "🧬" },
        },
    },
    scout: {
        3: {
            A: { value: 0.07, icon: "🧭" },
            B: { value: 0.07, icon: "🛡️" },
        },
        6: {
            A: { value: 0.09, icon: "🧭" },
            B: { value: 0.09, icon: "🛡️" },
        },
        9: {
            A: { value: 0.12, icon: "🧭" },
            B: { value: 0.12, icon: "🛡️" },
        },
    },
    scientist: {
        3: {
            A: { value: 0.05, icon: "🧠" },
            B: { value: 0.03, icon: "🏺" },
        },
        6: {
            A: { value: 0.06, icon: "🧠" },
            B: { value: 0.04, icon: "🏺" },
        },
        9: {
            A: { value: 0.09, icon: "🧠" },
            B: { value: 0.05, icon: "🏺" },
        },
    },
    gunner: {
        3: {
            A: { value: 0.03, icon: "🎯" },
            B: { value: 0.03, icon: "💥" },
        },
        6: {
            A: { value: 0.05, icon: "🎯" },
            B: { value: 0.05, icon: "💥" },
        },
        9: {
            A: { value: 0.06, icon: "🎯" },
            B: { value: 0.06, icon: "💥" },
        },
    },
};

export const RACE_TECH_TREE: Record<
    RaceId,
    Record<TechPerkTier, TechPerkOption>
> = {
    human: {
        3: { value: 0.03, icon: "🤝" },
        6: { value: 0.04, icon: "🤝" },
        9: { value: 0.05, icon: "🤝" },
    },
    synthetic: {
        3: { value: 0.03, icon: "⚙️" },
        6: { value: 0.04, icon: "⚙️" },
        9: { value: 0.05, icon: "⚙️" },
    },
    xenosymbiont: {
        3: { value: 0.03, icon: "🧬" },
        6: { value: 0.04, icon: "🧬" },
        9: { value: 0.05, icon: "🧬" },
    },
    krylorian: {
        3: { value: 0.01, icon: "🦎" },
        6: { value: 0.02, icon: "🦎" },
        9: { value: 0.03, icon: "🦎" },
    },
    voidborn: {
        3: { value: 0.03, icon: "🌌" },
        6: { value: 0.04, icon: "🌌" },
        9: { value: 0.05, icon: "🌌" },
    },
    crystalline: {
        3: { value: 0.1, icon: "💎" },
        6: { value: 0.2, icon: "💎" },
        9: { value: 0.3, icon: "💎" },
    },
};

export const getRaceTechPerkNameKey = (
    race: RaceId,
    tier: TechPerkTier,
): string => `race_tech_tree.${race}.${tier}.name`;

export const getRaceTechPerkDescKey = (
    race: RaceId,
    tier: TechPerkTier,
): string => `race_tech_tree.${race}.${tier}.desc`;

/**
 * Эффективный бонус ветки для члена экипажа: сумма уже выбранных тиров этой
 * ветки. Каждый выбор — отдельное улучшение, а не замена предыдущего.
 */
export function getTechPerkValue(
    crewMember: Pick<CrewMember, "profession" | "techPerks">,
    branch: ProfessionalTechPerkBranch,
): number {
    const tree = TECH_TREE[crewMember.profession];
    if (!tree || !crewMember.techPerks) return 0;

    let total = 0;
    for (const tier of TECH_TREE_TIERS) {
        if (crewMember.techPerks[tier] === branch) {
            total += tree[tier][branch].value;
        }
    }
    return total;
}

export function getRaceTechPerkValue(
    crewMember: Pick<CrewMember, "race" | "techPerks">,
): number {
    if (!crewMember.techPerks) return 0;

    const tree = RACE_TECH_TREE[crewMember.race];
    let total = 0;
    for (const tier of TECH_TREE_TIERS) {
        if (crewMember.techPerks[tier] === "C") {
            total += tree[tier].value;
        }
    }
    return total;
}

/**
 * Сильнейший расовый перк среди работающего экипажа.
 *
 * Фильтр здесь, а не у каждого из восьми вызывающих: все они считают
 * корабельную пассивку (уклонение, броня, реген щитов, потребление, опыт,
 * лечение, ремонт), а навык мёртвого или приписанного к аванпосту в неё
 * входить не должен.
 */
export function getStrongestRaceTechPerkValue(
    crew: Array<Pick<CrewMember, "race" | "techPerks" | "health" | "outpostId">>,
    race: RaceId,
): number {
    return crew.reduce(
        (strongest, crewMember) =>
            crewMember.race === race && isWorkingCrew(crewMember)
                ? Math.max(strongest, getRaceTechPerkValue(crewMember))
                : strongest,
        0,
    );
}

/**
 * Сильнейшая профессиональная ветка среди работающего экипажа этой профессии.
 * Ветки B инженера и учёного не суммируются между людьми — берётся лучший.
 */
export function getStrongestTechPerkValue(
    crew: Array<Pick<CrewMember, "profession" | "techPerks" | "health" | "outpostId">>,
    profession: Profession,
    branch: ProfessionalTechPerkBranch,
): number {
    return crew.reduce(
        (strongest, crewMember) =>
            crewMember.profession === profession && isWorkingCrew(crewMember)
                ? Math.max(strongest, getTechPerkValue(crewMember, branch))
                : strongest,
        0,
    );
}
