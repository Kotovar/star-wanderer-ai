"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useGameStore } from "@/game/store";
import type { CrewLevelUpResult, TechPerkTier } from "@/game/types";
import { useTranslation } from "@/lib/useTranslation";
import { GameDialogContent } from "./GameDialog";
import { CrewPerkChoiceContent } from "./CrewPerkChoiceModal";

const isTechPerkTier = (level: number): level is TechPerkTier =>
    level === 3 || level === 6 || level === 9;

export function CrewLevelUpModal() {
    const result = useGameStore((s) => s.pendingCrewLevelUps[0]);
    const hasContractCompletion = useGameStore(
        (s) => s.pendingContractCompletions.length > 0,
    );
    const crewMember = useGameStore((s) =>
        result ? s.crew.find((member) => member.id === result.crewMemberId) : undefined,
    );
    const chooseCrewPerk = useGameStore((s) => s.chooseCrewPerk);
    const dismissCrewLevelUp = useGameStore((s) => s.dismissCrewLevelUp);
    const { t } = useTranslation();
    const [choiceResult, setChoiceResult] = useState<CrewLevelUpResult | null>(null);

    if (!result || hasContractCompletion) return null;

    const talentTier = isTechPerkTier(result.newLevel)
        ? result.newLevel
        : undefined;
    const showingChoices = choiceResult === result;

    return (
        <Dialog open onOpenChange={(open) => !open && dismissCrewLevelUp()}>
            <GameDialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-['Orbitron'] text-[#00ff41]">
                        {t("crew_level_up.title", { name: result.crewMemberName })}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-[#aaa]">
                        {t("crew_level_up.level_transition", {
                            oldLevel: result.oldLevel,
                            newLevel: result.newLevel,
                        })}
                    </DialogDescription>
                </DialogHeader>

                {showingChoices && crewMember && talentTier !== undefined ? (
                    <CrewPerkChoiceContent
                        pending={{
                            crewMemberId: result.crewMemberId,
                            profession: crewMember.profession,
                            tier: talentTier,
                        }}
                        onChoose={(branch) => {
                            chooseCrewPerk(
                                result.crewMemberId,
                                talentTier,
                                branch,
                            );
                            dismissCrewLevelUp();
                        }}
                    />
                ) : (
                    <>
                        <div className="border border-[#00ff4155] bg-[rgba(0,255,65,0.04)] px-3 py-2 text-sm text-[#00ff41]">
                            {t("crew_level_up.max_health", {
                                amount: result.newMaxHealth - result.previousMaxHealth,
                                oldMaxHealth: result.previousMaxHealth,
                                newMaxHealth: result.newMaxHealth,
                            })}
                        </div>
                        <div className="border border-[#00d4ff55] bg-[rgba(0,212,255,0.04)] px-3 py-2 text-sm text-[#00d4ff]">
                            {t("crew_level_up.health_restored", {
                                previousHealth: result.previousHealth,
                                restoredHealth: result.restoredHealth,
                            })}
                        </div>
                        <Button
                            onClick={() =>
                                crewMember && talentTier !== undefined
                                    ? setChoiceResult(result)
                                    : dismissCrewLevelUp()
                            }
                            className="w-full cursor-pointer border-2 border-[#00ff41] bg-transparent text-[#00ff41] uppercase tracking-wider hover:bg-[#00ff41] hover:text-[#050810]"
                        >
                            {t(
                                crewMember && talentTier !== undefined
                                    ? "crew_level_up.choose_talent"
                                    : "crew_level_up.acknowledge",
                            )}
                        </Button>
                    </>
                )}
            </GameDialogContent>
        </Dialog>
    );
}
