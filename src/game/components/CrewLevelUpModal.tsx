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
import { useCombatCinematicUiStore } from "./combatCinematicUiStore";
import { CrewPerkChoiceContent } from "./CrewPerkChoiceModal";
import { getProfessionLevelGains } from "@/game/crew/professionLevelGains";
import type { Profession } from "@/game/types";

/** Что стало сильнее в профессии персонажа на новом уровне. */
function ProfessionGains({
    profession,
    oldLevel,
    newLevel,
}: {
    profession: Profession;
    oldLevel: number;
    newLevel: number;
}) {
    const { t } = useTranslation();
    const gains = getProfessionLevelGains(profession, oldLevel, newLevel);
    if (gains.length === 0) return null;

    return (
        <div className="border border-[#ffb00055] bg-[rgba(255,176,0,0.04)] px-3 py-2 text-sm text-[#ffb000]">
            <div className="font-bold">
                {t("crew_level_up.gains_title", {
                    profession: t(`professions.${profession}`),
                })}
            </div>
            <ul className="mt-1 space-y-0.5 text-xs">
                {gains.map((gain) => (
                    <li
                        key={gain.key}
                        className="flex flex-wrap items-center gap-1"
                    >
                        <span>
                            ▸ {t(`crew_level_up.gains.${gain.key}`)}:
                        </span>
                        <span className="tabular-nums">{gain.from}</span>
                        <span className="leading-none">→</span>
                        <span className="font-bold tabular-nums">
                            {gain.to}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

type TalentChoiceState = {
    result: CrewLevelUpResult;
    tierIndex: number;
};

export function CrewLevelUpModal() {
    const result = useGameStore((s) => s.pendingCrewLevelUps[0]);
    const hasContractCompletion = useGameStore(
        (s) => s.pendingContractCompletions.length > 0,
    );
    // Бой резолвится синхронно, а кинематика показывает его позже: повышение
    // случается «в середине залпа» и накрывает анимацию диалогом. Очередь
    // никуда не денется — покажем, когда сцена доиграет
    const cinematicPlaying = useCombatCinematicUiStore((s) =>
        Boolean(s.timeline),
    );
    const crewMember = useGameStore((s) =>
        result ? s.crew.find((member) => member.id === result.crewMemberId) : undefined,
    );
    const chooseCrewPerk = useGameStore((s) => s.chooseCrewPerk);
    const dismissCrewLevelUp = useGameStore((s) => s.dismissCrewLevelUp);
    const { t } = useTranslation();
    const [choiceState, setChoiceState] = useState<TalentChoiceState | null>(null);

    if (!result || hasContractCompletion || cinematicPlaying) return null;

    const crossedTalentTiers = TECH_TREE_TIERS.filter((tier) => result.oldLevel < tier && tier <= result.newLevel);
    const currentChoice = choiceState?.result === result ? choiceState : null;
    const talentTier = currentChoice
        ? crossedTalentTiers[currentChoice.tierIndex]
        : undefined;

    return (
        <Dialog open onOpenChange={(open) => !open && crossedTalentTiers.length === 0 && dismissCrewLevelUp()}>
            <GameDialogContent
                className={currentChoice ? "sm:max-w-3xl" : "max-w-md"}
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
                        {crewMember && (
                            <ProfessionGains
                                profession={crewMember.profession}
                                oldLevel={result.oldLevel}
                                newLevel={result.newLevel}
                            />
                        )}
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
