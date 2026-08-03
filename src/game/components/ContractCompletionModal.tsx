"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { formatContractDescription } from "@/game/contracts/formatContractDescription";
import { useGameStore } from "@/game/store";
import { useTranslation } from "@/lib/useTranslation";
import { GameDialogContent } from "./GameDialog";

export function ContractCompletionModal() {
    const contract = useGameStore((s) => s.pendingContractCompletions[0]);
    const dismissContractCompletion = useGameStore(
        (s) => s.dismissContractCompletion,
    );
    const { t } = useTranslation();

    if (!contract) return null;

    return (
        <Dialog
            open
            onOpenChange={(open) => !open && dismissContractCompletion()}
        >
            <GameDialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="font-['Orbitron'] text-[#00ff41]">
                        {t("contracts.completion_title")}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-[#aaa]">
                        {formatContractDescription(contract, t)}
                    </DialogDescription>
                </DialogHeader>

                <div className="border border-[#ffb00077] bg-[rgba(255,176,0,0.06)] px-3 py-2 text-sm text-accent">
                    {t("contracts.reward_short", { reward: contract.reward })}
                </div>

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
