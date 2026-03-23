import { useEffect, useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useGameStore } from "../store";
import { RESEARCH_TREE } from "../constants/research";
import type { TechnologyId } from "../types";
import { useTranslation } from "@/lib/useTranslation";
import { getTechnologyBonusesDescription } from "@/game/slices/research/helpers/researchHelpers";

export function TechnologyDiscoveryModal() {
    const { t } = useTranslation();
    // Get the list of researched technologies from the store
    const researchedTechs = useGameStore((s) => s.research.researchedTechs);
    // Get game load counter to detect when game is loaded
    const gameLoadedCount = useGameStore((s) => s.gameLoadedCount);

    // Local state to control the modal
    const [open, setOpen] = useState(false);
    const [techId, setTechId] = useState<TechnologyId | null>(null);

    // Ref to keep track of the previous length of researchedTechs
    const prevLengthRef = useRef(researchedTechs.length);

    // Reset the ref when game is loaded to prevent showing modal for old discoveries
    useEffect(() => {
        prevLengthRef.current = researchedTechs.length;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameLoadedCount]);

    useEffect(() => {
        const prevLength = prevLengthRef.current;
        if (researchedTechs.length > prevLength) {
            // A new technology was researched
            const newTechId = researchedTechs[researchedTechs.length - 1];
            queueMicrotask(() => {
                setTechId(newTechId);
                setOpen(true);
            });
        }
        prevLengthRef.current = researchedTechs.length;
    }, [researchedTechs]);

    // If we don't have a tech to show, or the modal is closed, render nothing
    if (!open || !techId) {
        return null;
    }

    const tech = RESEARCH_TREE[techId];

    if (!tech) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="bg-[rgba(10,20,30,0.95)] border-2 border-[#00ff41] text-[#00ff41] max-w-md w-[calc(100%-2rem)] md:w-auto">
                <DialogHeader>
                    <DialogTitle className="text-[#ffb000] font-['Orbitron']">
                        {t("technology_discovery.title")}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {t("technology_discovery.description")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 p-4">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{tech.icon}</span>
                        <div>
                            <div className="font-bold text-xl">
                                {t(`tech.${techId}.name`)}
                            </div>
                            <div className="text-sm text-[#888]">
                                {t(`tech.${techId}.tier_label`)} {tech.tier} •{" "}
                                {t(`tech.${techId}.category_label`)}
                            </div>
                        </div>
                    </div>

                    <div className="text-sm text-[#888]">
                        <strong>
                            {t("technology_discovery.description_label")}:
                        </strong>{" "}
                        {t(`tech.${techId}.description`)}
                    </div>

                    <div className="text-sm text-[#888]">
                        <strong>{t("technology_discovery.bonuses")}:</strong>{" "}
                        {getTechnologyBonusesDescription(tech)}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
