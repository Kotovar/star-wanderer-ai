import { calculateHealthRegen } from "@/game/slices/crew/helpers";
import type { ActiveEffect, CrewMember, Module } from "@/game/types";

export type TFn = (key: string) => string;

export const useTraitTranslation =
    (t: TFn) => (id: string, fallbackName: string, fallbackDesc: string) => {
        const key = `racial_traits.${id}`;
        const name =
            t(`${key}.name`) !== `${key}.name` ? t(`${key}.name`) : fallbackName;
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

export const TraitRow = ({ name, desc, type, bold, itemKey }: TraitRowProps) => {
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
) => calculateHealthRegen(member, { activeEffects });

export const getAdjacentModules = (
    modules: Module[],
    isModuleAdjacent: (a: number, b: number) => boolean,
    moduleId: number,
) =>
    modules.filter(
        (m) => m.id !== moduleId && !m.disabled && isModuleAdjacent(moduleId, m.id),
    );
