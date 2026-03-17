"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGameStore } from "../store";
import { useTranslation } from "@/lib/useTranslation";
import { RACES } from "../constants/races";

export function SurvivorModal() {
    const { t } = useTranslation();
    const pendingSurvivor = useGameStore((s) => s.pendingSurvivor);
    const acceptSurvivor = useGameStore((s) => s.acceptSurvivor);
    const declineSurvivor = useGameStore((s) => s.declineSurvivor);

    if (!pendingSurvivor) return null;

    const race = RACES[pendingSurvivor.race];

    return (
        <Dialog open onOpenChange={(open) => !open && declineSurvivor()}>
            <DialogContent className="bg-[rgba(10,20,30,0.95)] border-2 border-[#00ff41] text-[#00ff41] max-w-sm w-[calc(100%-2rem)] md:w-auto">
                <DialogHeader>
                    <DialogTitle className="text-[#00ff41] font-['Orbitron']">
                        {t("survivor_modal.title")}
                    </DialogTitle>
                    <DialogDescription className="text-[#888] text-sm">
                        {t("survivor_modal.subtitle")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 p-2">
                    {/* Name + icon */}
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{race?.icon ?? "👤"}</span>
                        <div className="font-bold text-lg">
                            {pendingSurvivor.name}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-[#aaa]">
                        <div>
                            <span className="text-[#666]">
                                {t("survivor_modal.race_label")}:{" "}
                            </span>
                            {t(`races.${pendingSurvivor.race}.name`)}
                        </div>
                        <div>
                            <span className="text-[#666]">
                                {t("survivor_modal.profession_label")}:{" "}
                            </span>
                            {t(`professions.${pendingSurvivor.profession}`)}
                        </div>
                        <div>
                            <span className="text-[#666]">
                                {t("survivor_modal.level_label")}:{" "}
                            </span>
                            {pendingSurvivor.level}
                        </div>
                    </div>

                    {/* Traits */}
                    {pendingSurvivor.traits.length > 0 && (
                        <div className="text-sm">
                            <span className="text-[#666]">
                                {t("survivor_modal.traits_label")}:{" "}
                            </span>
                            {pendingSurvivor.traits.map((trait) => (
                                <span
                                    key={trait.name}
                                    className={
                                        trait.type === "positive"
                                            ? "text-[#00ff41]"
                                            : trait.type === "negative"
                                              ? "text-[#ff0040]"
                                              : "text-[#ff00ff]"
                                    }
                                    title={trait.desc}
                                >
                                    {trait.name}{" "}
                                </span>
                            ))}
                        </div>
                    )}
                    {pendingSurvivor.traits.length === 0 && (
                        <div className="text-sm text-[#666]">
                            {t("survivor_modal.traits_label")}:{" "}
                            {t("survivor_modal.no_traits")}
                        </div>
                    )}
                </div>

                <div className="flex gap-3 mt-2">
                    <Button
                        onClick={acceptSurvivor}
                        className="flex-1 cursor-pointer bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider"
                    >
                        {t("survivor_modal.accept")}
                    </Button>
                    <Button
                        onClick={declineSurvivor}
                        className="flex-1 cursor-pointer bg-transparent border-2 border-[#ff0040] text-[#ff0040] hover:bg-[#ff0040] hover:text-white uppercase tracking-wider"
                    >
                        {t("survivor_modal.decline")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
