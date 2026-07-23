import { calculateExpMultiplier } from "@/game/slices/crew/helpers/calculateExpMultiplier";
import {
    calculateHealthRegen,
    getMergeEffectsBonus,
} from "@/game/slices/crew/helpers";
import { getTechBonusSum } from "@/game/research";
import type {
    ActiveEffect,
    CrewMember,
    Module,
    TechnologyId,
} from "@/game/types";
import { CrewStatusIcon } from "./CrewStatusIcon";

export type TFn = (key: string) => string;

export const useTraitTranslation =
    (t: TFn) => (id: string, fallbackName: string, fallbackDesc: string) => {
        const key = `racial_traits.${id}`;
        const name =
            t(`${key}.name`) !== `${key}.name`
                ? t(`${key}.name`)
                : fallbackName;
        const desc =
            t(`${key}.description`) !== `${key}.description`
                ? t(`${key}.description`)
                : fallbackDesc;
        return { name, desc };
    };

type TraitRowProps = {
    name: string;
    desc: string;
    type?: string;
    bold?: boolean;
    itemKey: string;
};

export const TraitRow = ({
    name,
    desc,
    type,
    bold,
    itemKey,
}: TraitRowProps) => {
    const color =
        type === "negative"
            ? "text-[#ff0040]"
            : type === "mutation"
              ? "text-[#cc44ff]"
              : type === "neutral"
                ? "text-[#888]"
                : "text-[#00ff41]";
    return (
        <div key={itemKey} className={`text-[10px] ${color}`}>
            {bold ? <span className="font-bold">{name}</span> : name}: {desc}
        </div>
    );
};

export const getModuleName = (modules: Module[], t: TFn, moduleId: number) => {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod) return t("crew_member.unknown");
    const translated = t(`module_names.${mod.type}`);
    return translated !== `module_names.${mod.type}` ? translated : mod.name;
};

export const getRegen = (
    member: CrewMember,
    activeEffects: ActiveEffect[],
    crew?: CrewMember[],
    modules?: Module[],
) => {
    const base = calculateHealthRegen(member, { activeEffects });
    if (crew && modules) {
        const bonus = getMergeEffectsBonus(crew, modules);
        return base + (bonus.crewHealthRegen ?? 0);
    }
    return base;
};

export interface DamageReductionInfo {
    traitReduction: number;
    techReduction: number;
    total: number;
}

const getCrewDamageReduction = (
    member: CrewMember,
    researchedTechs: TechnologyId[],
): DamageReductionInfo => {
    const traitReduction =
        member.traits?.reduce(
            (max, trait) =>
                Math.max(max, trait.effect?.combatDamageReduction ?? 0),
            0,
        ) ?? 0;
    const techReduction = getTechBonusSum(
        { researchedTechs },
        "crew_damage_reduction",
    );
    return {
        traitReduction,
        techReduction,
        total: Math.min(0.9, traitReduction + techReduction),
    };
};

const getCrewExpMultiplier = (
    member: CrewMember,
    researchedTechs: TechnologyId[],
): number => calculateExpMultiplier(member, { researchedTechs });

export const CrewDamageReductionRow = ({
    member,
    researchedTechs,
    t,
}: {
    member: CrewMember;
    researchedTechs: TechnologyId[];
    t: TFn;
}) => {
    const dr = getCrewDamageReduction(member, researchedTechs);
    if (dr.total <= 0) return null;
    return (
        <div className="text-[10px] text-[#00aaff] flex flex-wrap items-center gap-1">
            <CrewStatusIcon type="damage_reduction" size={18} />
            <span>{t("crew_member.damage_reduction")}</span>{" "}
            <span className="font-bold">{Math.round(dr.total * 100)}%</span>
            {dr.traitReduction > 0 && dr.techReduction > 0 && (
                <span className="text-[#888] ml-1">
                    ({t("crew_member.trait_short")}:{" "}
                    {Math.round(dr.traitReduction * 100)}% +{" "}
                    {t("crew_member.tech_short")}:{" "}
                    {Math.round(dr.techReduction * 100)}%)
                </span>
            )}
        </div>
    );
};

export const CrewExpBonusRow = ({
    member,
    researchedTechs,
    t,
}: {
    member: CrewMember;
    researchedTechs: TechnologyId[];
    t: TFn;
}) => {
    const expMult = getCrewExpMultiplier(member, researchedTechs);
    if (expMult <= 1) return null;
    return (
        <div className="text-[10px] text-[#00d4ff] flex flex-wrap items-center gap-1">
            <CrewStatusIcon type="experience" size={18} />
            <span>{t("crew_member.exp_bonus")}</span>{" "}
            <span className="font-bold">
                ×{expMult.toFixed(2).replace(/\.?0+$/, "")}
            </span>
        </div>
    );
};

export const getAdjacentModules = (
    modules: Module[],
    isModuleAdjacent: (a: number, b: number) => boolean,
    moduleId: number,
) =>
    modules.filter(
        (m) =>
            m.id !== moduleId &&
            !m.disabled &&
            isModuleAdjacent(moduleId, m.id),
    );
