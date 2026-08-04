"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { formatContractDescription } from "@/game/contracts/formatContractDescription";
import { RACES } from "@/game/constants/races";
import { useGameStore } from "@/game/store";
import { useTranslation } from "@/lib/useTranslation";
import { GameDialogContent } from "./GameDialog";

export function ContractCompletionModal() {
    const completion = useGameStore((s) => s.pendingContractCompletions[0]);
    const dismissContractCompletion = useGameStore(
        (s) => s.dismissContractCompletion,
    );
    const { t } = useTranslation();

    if (!completion) return null;

    const { contract } = completion;

    return (
        <Dialog
            open
            onOpenChange={(open) => !open && dismissContractCompletion()}
        >
            <GameDialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-['Orbitron'] text-[#00ff41]">
                        {t("contracts.completion_title")}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-[#aaa]">
                        {formatContractDescription(contract, t)}
                    </DialogDescription>
                </DialogHeader>

                <div className="border border-[#ffb00077] bg-[rgba(255,176,0,0.06)] px-3 py-2 text-sm text-accent">
                    {t("contracts.reward_short", { reward: completion.credits })}
                </div>

                {completion.reputationChanges.length > 0 && (
                    <div className="border border-[#ffb00055] bg-[rgba(255,176,0,0.06)] px-3 py-2 text-xs">
                        <div className="mb-1 uppercase tracking-wider text-[#ffb000]">
                            {t("contracts.completion_reputation")}
                        </div>
                        {completion.reputationChanges.map(({ raceId, change }) => (
                            <div key={raceId} style={{ color: change > 0 ? RACES[raceId].color : "#ff6677" }}>
                                {t("contracts.completion_reputation_row", { race: t(`races.${raceId}.plural`), change: `${change > 0 ? "+" : ""}${change}` })}
                            </div>
                        ))}
                    </div>
                )}

                {completion.experience.length > 0 && (
                    <div className="border border-[#00ff4155] bg-[rgba(0,255,65,0.04)] px-3 py-2 text-xs">
                        <div className="mb-1 uppercase tracking-wider text-[#00ff41]">
                            {t("contracts.completion_experience")}
                        </div>
                        {completion.experience.map(({ crewMemberId, name, amount }) => (
                            <div key={crewMemberId}>
                                {t("contracts.completion_experience_row", { name, amount })}
                            </div>
                        ))}
                    </div>
                )}

                <Button
                    onClick={dismissContractCompletion}
                    className="w-full cursor-pointer border-2 border-[#00ff41] bg-transparent text-[#00ff41] uppercase tracking-wider hover:bg-[#00ff41] hover:text-[#050810]"
                >
                    {t("common.confirm")}
                </Button>
            </GameDialogContent>
        </Dialog>
    );
}
