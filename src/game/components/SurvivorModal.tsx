"use client";

import {
    Dialog,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { GameDialogContent } from "./GameDialog";
import { Button } from "@/components/ui/button";
import { useGameStore } from "../store";
import { useTranslation } from "@/lib/useTranslation";
import { ProfessionSprite } from "./ProfessionSprite";
import { TraitRow, useTraitTranslation } from "./CrewListHelpers";

export function SurvivorModal() {
    const { t } = useTranslation();
    const translateTrait = useTraitTranslation(t);
    const pendingSurvivor = useGameStore((s) => s.pendingSurvivor);
    const acceptSurvivor = useGameStore((s) => s.acceptSurvivor);
    const declineSurvivor = useGameStore((s) => s.declineSurvivor);

    if (!pendingSurvivor) return null;

    return (
        <Dialog open onOpenChange={(open) => !open && declineSurvivor()}>
            <GameDialogContent className="max-w-sm max-h-[85dvh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-[#00ff41] font-['Orbitron']">
                        {t("survivor_modal.title")}
                    </DialogTitle>
                    <DialogDescription className="text-[#888] text-sm">
                        {t("survivor_modal.subtitle")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 p-2">
                    {/* Name + portrait */}
                    <div className="flex items-center gap-3">
                        <ProfessionSprite
                            race={pendingSurvivor.race}
                            profession={pendingSurvivor.profession}
                            size={48}
                            className="border border-[#00ff4155] bg-[rgba(0,255,65,0.05)] rounded"
                            title={`${t(`professions.${pendingSurvivor.profession}`)}: ${t(`races.${pendingSurvivor.race}.name`)}`}
                        />
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
                        <div>
                            <span className="text-[#666] text-sm">
                                {t("survivor_modal.traits_label")}
                            </span>
                            {pendingSurvivor.traits.map((trait, idx) => {
                                const { name, desc } = translateTrait(
                                    trait.id ?? "",
                                    trait.name,
                                    trait.desc,
                                );
                                return (
                                    <TraitRow
                                        key={`survivor-trait-${idx}-${trait.type}`}
                                        itemKey={`survivor-trait-${idx}`}
                                        name={name}
                                        desc={desc}
                                        type={trait.type}
                                    />
                                );
                            })}
                        </div>
                    )}
                    {pendingSurvivor.traits.length === 0 && (
                        <div className="text-sm text-[#666]">
                            {t("survivor_modal.traits_label")}:{" "}
                            {t("survivor_modal.no_traits")}
                        </div>
                    )}
                </div>

                <div className="text-[10px] text-[#666] px-2">
                    {t("survivor_modal.consequences_hint")}
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
            </GameDialogContent>
        </Dialog>
    );
}
