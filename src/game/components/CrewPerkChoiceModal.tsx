"use client";

import { Button } from "@/components/ui/button";
import { getPendingCrewPerkChoice } from "@/game/crew/techPerks";
import { TECH_TREE } from "@/game/constants/techTree";
import { useGameStore } from "@/game/store";
import type { TechPerkBranch } from "@/game/types";
import { useTranslation } from "@/lib/useTranslation";
import { useShallow } from "zustand/react/shallow";

const BRANCHES: TechPerkBranch[] = ["A", "B"];

export function CrewPerkChoiceModal() {
    const { crew, chooseCrewPerk } = useGameStore(
        useShallow((state) => ({
            crew: state.crew,
            chooseCrewPerk: state.chooseCrewPerk,
        })),
    );
    const { t } = useTranslation();

    const pending = getPendingCrewPerkChoice(crew);
    if (!pending) return null;

    const crewMember = crew.find((c) => c.id === pending.crewMemberId);
    if (!crewMember) return null;

    const options = TECH_TREE[pending.profession][pending.tier];

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

            <div className="grid gap-2 lg:grid-cols-2">
                {BRANCHES.map((branch) => {
                    const option = options[branch];
                    return (
                        <div
                            key={branch}
                            className="flex min-h-32 flex-col border border-[#00ff4144] bg-[rgba(0,255,65,0.025)] p-3"
                        >
                            <div className="font-['Orbitron'] text-[11px] font-bold uppercase tracking-wider text-accent">
                                {option.name}
                            </div>
                            <div className="mt-1 flex-1 text-xs leading-relaxed text-[#7f8b7f]">
                                {option.desc}
                            </div>
                            <Button
                                onClick={() =>
                                    chooseCrewPerk(
                                        pending.crewMemberId,
                                        pending.tier,
                                        branch,
                                    )
                                }
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
