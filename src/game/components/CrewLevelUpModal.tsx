"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { TECH_TREE_TIERS } from "@/game/constants/techTree";
import { useGameStore } from "@/game/store";
import type { CrewLevelUpResult } from "@/game/types";
import { useTranslation } from "@/lib/useTranslation";
import { GameDialogContent } from "./GameDialog";
import { CrewPerkChoiceContent } from "./CrewPerkChoiceModal";

type TalentChoiceState = {
    result: CrewLevelUpResult;
    tierIndex: number;
};

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
    const [choiceState, setChoiceState] = useState<TalentChoiceState | null>(null);

    if (!result || hasContractCompletion) return null;

    const crossedTalentTiers = TECH_TREE_TIERS.filter((tier) => result.oldLevel < tier && tier <= result.newLevel);
    const currentChoice = choiceState?.result === result ? choiceState : null;
    const talentTier = currentChoice
        ? crossedTalentTiers[currentChoice.tierIndex]
        : undefined;

    return (
        <Dialog open onOpenChange={(open) => !open && crossedTalentTiers.length === 0 && dismissCrewLevelUp()}>
            <GameDialogContent
                className="max-w-md"
                showCloseButton={crossedTalentTiers.length === 0}
            >
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

                {crewMember && currentChoice && talentTier !== undefined ? (
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
                            const nextTierIndex = currentChoice.tierIndex + 1;
                            if (nextTierIndex < crossedTalentTiers.length) {
                                setChoiceState({ result, tierIndex: nextTierIndex });
                                return;
                            }
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
                                crewMember && crossedTalentTiers.length > 0
                                    ? setChoiceState({ result, tierIndex: 0 })
                                    : dismissCrewLevelUp()
                            }
                            className="w-full cursor-pointer border-2 border-[#00ff41] bg-transparent text-[#00ff41] uppercase tracking-wider hover:bg-[#00ff41] hover:text-[#050810]"
                        >
                            {t(
                                crewMember && crossedTalentTiers.length > 0
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
