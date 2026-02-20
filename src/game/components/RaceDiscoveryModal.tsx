import { useEffect, useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useGameStore } from "../store";
import { RACES } from "../constants";
import { RaceId } from "../types";

export function RaceDiscoveryModal() {
    // Get the list of known races from the store
    const knownRaces = useGameStore((s) => s.knownRaces);
    console.log(knownRaces);
    // Local state to control the modal
    const [open, setOpen] = useState(false);
    const [raceId, setRaceId] = useState<RaceId | null>(null);

    // Ref to keep track of the previous length of knownRaces
    const prevLengthRef = useRef(knownRaces.length);

    useEffect(() => {
        const prevLength = prevLengthRef.current;
        if (knownRaces.length > prevLength) {
            // A new race was discovered
            const newRaceId = knownRaces[knownRaces.length - 1];
            // eslint-disable-next-line react-hooks/exhaustive-deps
            setRaceId(newRaceId);
            setOpen(true);
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
            <DialogContent
                className="bg-[rgba(10,20,30,0.95)] border-2 border-[#ffb000] text-[#00ff41] max-w-md"
                aria-describedby="race-discovery-description"
            >
                <DialogHeader>
                    <DialogTitle className="text-[#ffb000] font-['Orbitron']">
                        Открыта новая раса
                    </DialogTitle>
                    <div id="race-discovery-description" className="sr-only">
                        Детали расы
                    </div>
                </DialogHeader>

                <div className="space-y-3 p-4">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{race.icon}</span>
                        <div>
                            <div className="font-bold text-xl">{race.name}</div>
                            <div className="text-sm text-[#888]">
                                {race.pluralName}
                            </div>
                        </div>
                    </div>

                    <div className="text-sm text-[#888]">
                        <strong>Особенности:</strong>{" "}
                        {race.specialTraits
                            .map((trait) => trait.name)
                            .join(", ") || "Отсутствуют"}
                    </div>

                    <div className="text-sm text-[#888]">
                        <strong>Описание:</strong> {race.description}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
