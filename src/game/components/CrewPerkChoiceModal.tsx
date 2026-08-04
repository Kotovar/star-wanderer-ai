"use client";

import { Button } from "@/components/ui/button";
import {
    getCrewPerkNoEffectSource,
    getPendingCrewPerkChoice,
} from "@/game/crew/techPerks";
import {
    RACE_TECH_TREE,
    TECH_TREE,
    getRaceTechPerkDescKey,
    getRaceTechPerkNameKey,
    getTechPerkDescKey,
    getTechPerkNameKey,
} from "@/game/constants/techTree";
import { useGameStore } from "@/game/store";
import { isModuleActive } from "@/game/modules/utils";
import { useTranslation } from "@/lib/useTranslation";
import { useShallow } from "zustand/react/shallow";
import type { PendingCrewPerkChoice } from "@/game/crew/techPerks";

interface CrewPerkChoiceContentProps {
    pending: PendingCrewPerkChoice;
    onChoose: (branch: "A" | "B" | "C") => void;
}

export function CrewPerkChoiceContent({
    pending,
    onChoose,
}: CrewPerkChoiceContentProps) {
    const { crew, ship } = useGameStore(
        useShallow((state) => ({
            crew: state.crew,
            ship: state.ship,
        })),
    );
    const { t } = useTranslation();

    const crewMember = crew.find((c) => c.id === pending.crewMemberId);
    if (!crewMember) return null;

    const professionalOptions = TECH_TREE[pending.profession][pending.tier];
    const activeWeaponBayIds = new Set(
        ship.modules
            .filter((module) => module.type === "weaponbay" && isModuleActive(module))
            .map((module) => module.id),
    );
    const activeGunnerIds = crew
        .filter(
            (member) =>
                member.profession === "gunner" && activeWeaponBayIds.has(member.moduleId),
        )
        .map((member) => member.id);
    const options = [
        {
            branch: "A" as const,
            option: professionalOptions.A,
            nameKey: getTechPerkNameKey(pending.profession, pending.tier, "A"),
            descKey: getTechPerkDescKey(pending.profession, pending.tier, "A"),
        },
        {
            branch: "B" as const,
            option: professionalOptions.B,
            nameKey: getTechPerkNameKey(pending.profession, pending.tier, "B"),
            descKey: getTechPerkDescKey(pending.profession, pending.tier, "B"),
        },
        {
            branch: "C" as const,
            option: RACE_TECH_TREE[crewMember.race][pending.tier],
            nameKey: getRaceTechPerkNameKey(crewMember.race, pending.tier),
            descKey: getRaceTechPerkDescKey(crewMember.race, pending.tier),
        },
    ];

    return (
        <div className="flex min-h-0 flex-col gap-3 p-1 pb-3 lg:h-full lg:overflow-y-auto">
            <div className="relative overflow-hidden border border-[#00d4ff77] p-3 sm:p-4">
                <div className="text-[9px] uppercase tracking-[0.22em] text-[#687868]">
                    {t("crew_perk_choice.signal")}
                </div>
                <h2 className="mt-1 font-['Orbitron'] text-base font-bold uppercase tracking-wider text-[#00d4ff]">
                    {t("crew_perk_choice.title", { name: crewMember.name })}
                </h2>
                <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[#889988]">
                    {t("crew_perk_choice.subtitle", {
                        tier: pending.tier,
                        profession: t(`professions.${pending.profession}`),
                    })}
                </div>
            </div>

            <div className="grid gap-2 lg:grid-cols-3">
                {options.map(({ branch, option, nameKey, descKey }) => {
                    const noEffectSource = getCrewPerkNoEffectSource(
                        crew,
                        crewMember,
                        pending.tier,
                        branch,
                        activeGunnerIds,
                    );
                    return (
                        <div
                            key={branch}
                            className="flex min-h-32 flex-col border border-[#00ff4144] bg-[rgba(0,255,65,0.025)] p-3"
                        >
                            <div className="flex items-center gap-2 font-['Orbitron'] text-[11px] font-bold uppercase tracking-wider text-accent">
                                <span className="text-xl leading-none">
                                    {option.icon}
                                </span>
                                {t(nameKey)}
                            </div>
                            <div className="mt-1 flex-1 text-xs leading-relaxed text-[#7f8b7f]">
                                {t(descKey)}
                            </div>
                            {noEffectSource && (
                                <div className="mt-2 border-l-2 border-[#ffb000] pl-2 text-[10px] leading-relaxed text-[#ffb000]">
                                    ⚠ {t("crew_perk_choice.no_additional_effect", {
                                        name: noEffectSource.name,
                                    })}
                                </div>
                            )}
                            <Button
                                onClick={() => onChoose(branch)}
                                className="mt-3 cursor-pointer border border-[#00ff41] bg-transparent text-[10px] uppercase tracking-wider text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810]"
                            >
                                {t("crew_perk_choice.choose")}
                            </Button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function CrewPerkChoiceModal() {
    const { crew, chooseCrewPerk } = useGameStore(
        useShallow((state) => ({
            crew: state.crew,
            chooseCrewPerk: state.chooseCrewPerk,
        })),
    );
    const pending = getPendingCrewPerkChoice(crew);
    if (!pending) return null;

    return (
        <CrewPerkChoiceContent
            pending={pending}
            onChoose={(branch) =>
                chooseCrewPerk(pending.crewMemberId, pending.tier, branch)
            }
        />
    );
}
