"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { getFactionDeliveryReward } from "@/game/contracts/factionDelivery";
import { RACES } from "@/game/constants/races";
import { useGameStore } from "@/game/store";
import { useTranslation } from "@/lib/useTranslation";
import { GameDialogContent } from "./GameDialog";

export function FactionDeliveryDecisionModal() {
    const pendingContractDecision = useGameStore(
        (state) => state.pendingContractDecision,
    );
    const activeContracts = useGameStore((state) => state.activeContracts);
    const resolveFactionDeliveryDecision = useGameStore(
        (state) => state.resolveFactionDeliveryDecision,
    );
    const { t } = useTranslation();

    const contract = pendingContractDecision
        ? activeContracts.find(
              (active) => active.id === pendingContractDecision.contractId,
          )
        : undefined;
    if (!contract?.factionDelivery || !contract.sourceDominantRace) return null;

    const { localRace, context } = contract.factionDelivery;
    const sourceRace = contract.sourceDominantRace;
    const sourceRaceName = t(`races.${sourceRace}.plural`);
    const localRaceName = t(`races.${localRace}.plural`);
    const cargoName = contract.cargo
        ? t(`delivery_goods.${contract.cargo}`)
        : t("contracts.cargo");
    const localReward = getFactionDeliveryReward(contract.reward);

    return (
        <Dialog open onOpenChange={() => undefined}>
            <GameDialogContent
                variant="warning"
                showCloseButton={false}
                className="max-h-[85dvh] max-w-2xl overflow-y-auto"
                onEscapeKeyDown={(event) => event.preventDefault()}
                onInteractOutside={(event) => event.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle className="font-['Orbitron'] text-lg text-[#ffb000]">
                        {t("contracts.faction_delivery.title")}
                    </DialogTitle>
                    <DialogDescription className="text-sm leading-relaxed text-[#b8c3cc]">
                        {t("contracts.faction_delivery.description", {
                            cargo: cargoName,
                            sourceRace: sourceRaceName,
                            localRace: localRaceName,
                        })}
                    </DialogDescription>
                </DialogHeader>

                <div className="border-y border-[#ffb00055] bg-[rgba(255,176,0,0.05)] px-3 py-2 text-sm text-[#e6c27a]">
                    {t(`contracts.faction_delivery.context.${context}`, {
                        cargo: cargoName,
                    })}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <section
                        className="flex flex-col gap-3 border-l-4 bg-[rgba(5,12,20,0.7)] p-3"
                        style={{ borderColor: RACES[sourceRace].color }}
                    >
                        <div>
                            <div
                                className="font-['Orbitron'] text-xs uppercase tracking-wider"
                                style={{ color: RACES[sourceRace].color }}
                            >
                                {t("contracts.faction_delivery.issuer_title")}
                            </div>
                            <div className="mt-1 text-sm text-[#e9f5ef]">
                                {sourceRaceName}
                            </div>
                        </div>
                        <p className="text-xs leading-relaxed text-[#aebac4]">
                            {t("contracts.faction_delivery.issuer_outcome", {
                                reward: contract.reward,
                                sourceRace: sourceRaceName,
                            })}
                        </p>
                        <Button
                            className="mt-auto w-full border bg-transparent uppercase tracking-wider hover:bg-[#00ff4120]"
                            style={{ borderColor: RACES[sourceRace].color, color: RACES[sourceRace].color }}
                            onClick={() =>
                                resolveFactionDeliveryDecision("issuer")
                            }
                        >
                            {t("contracts.faction_delivery.issuer_action")}
                        </Button>
                    </section>

                    <section
                        className="flex flex-col gap-3 border-l-4 bg-[rgba(5,12,20,0.7)] p-3"
                        style={{ borderColor: RACES[localRace].color }}
                    >
                        <div>
                            <div
                                className="font-['Orbitron'] text-xs uppercase tracking-wider"
                                style={{ color: RACES[localRace].color }}
                            >
                                {t("contracts.faction_delivery.local_title")}
                            </div>
                            <div className="mt-1 text-sm text-[#e9f5ef]">
                                {localRaceName}
                            </div>
                        </div>
                        <p className="text-xs leading-relaxed text-[#aebac4]">
                            {t("contracts.faction_delivery.local_outcome", {
                                reward: localReward,
                                sourceRace: sourceRaceName,
                                localRace: localRaceName,
                            })}
                        </p>
                        <Button
                            className="mt-auto w-full border bg-transparent uppercase tracking-wider hover:bg-[#ffb00020]"
                            style={{ borderColor: RACES[localRace].color, color: RACES[localRace].color }}
                            onClick={() =>
                                resolveFactionDeliveryDecision("local")
                            }
                        >
                            {t("contracts.faction_delivery.local_action")}
                        </Button>
                    </section>
                </div>
            </GameDialogContent>
        </Dialog>
    );
}
