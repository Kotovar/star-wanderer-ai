import { useEffect, useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useGameStore } from "../store";
import { RACES } from "../constants/races";
import { RaceId } from "../types";
import { useTranslation } from "@/lib/useTranslation";

export function RaceDiscoveryModal() {
    const { t } = useTranslation();
    // Get the list of known races from the store
    const knownRaces = useGameStore((s) => s.knownRaces);
    // Get game load counter to detect when game is loaded
    const gameLoadedCount = useGameStore((s) => s.gameLoadedCount);

    // Local state to control the modal
    const [open, setOpen] = useState(false);
    const [raceId, setRaceId] = useState<RaceId | null>(null);

    // Ref to keep track of the previous length of knownRaces
    const prevLengthRef = useRef(knownRaces.length);

    // Reset the ref when game is loaded to prevent showing modal for old discoveries
    useEffect(() => {
        prevLengthRef.current = knownRaces.length;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameLoadedCount]);

    useEffect(() => {
        const prevLength = prevLengthRef.current;
        if (knownRaces.length > prevLength) {
            // A new race was discovered
            const newRaceId = knownRaces[knownRaces.length - 1];
            queueMicrotask(() => {
                setRaceId(newRaceId);
                setOpen(true);
            });
        }
        prevLengthRef.current = knownRaces.length;
    }, [knownRaces]);

    // If we don't have a race to show, or the modal is closed, render nothing
    if (!open || !raceId) {
        return null;
    }

    const race = RACES[raceId];

    if (!race) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="bg-[rgba(10,20,30,0.95)] border-2 border-[#ffb000] text-[#00ff41] max-w-md w-[calc(100%-2rem)] md:w-auto">
                <DialogHeader>
                    <DialogTitle className="text-[#ffb000] font-['Orbitron']">
                        {t("race_discovery.title")}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {t("race_discovery.description")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 p-4">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{race.icon}</span>
                        <div>
                            <div className="font-bold text-xl">
                                {t(`races.${raceId}.name`)}
                            </div>
                        </div>
                    </div>

                    <div className="text-sm text-[#888]">
                        <strong>{t("race_discovery.traits")}:</strong>{" "}
                        {race.specialTraits.length > 0
                            ? race.specialTraits
                                  .map((trait) =>
                                      t(`racial_traits.${trait.id}.name`),
                                  )
                                  .join(", ")
                            : t("race_discovery.traits_none")}
                    </div>

                    <div className="text-sm text-[#888]">
                        <strong>
                            {t("race_discovery.description_label")}:
                        </strong>{" "}
                        {t(`races.${raceId}.description`)}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
