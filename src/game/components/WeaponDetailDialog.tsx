"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { GameDialogContent } from "./GameDialog";
import { WEAPON_TYPES, WEAPON_ART } from "../constants";
import { useTranslation } from "@/lib/useTranslation";
import { GameImage } from "./GameImage";

interface WeaponDetailDialogProps {
    weaponType: string;
    onClose: () => void;
}

/** Модалка с характеристиками оружия (магазин, трюм) */
export function WeaponDetailDialog({
    weaponType,
    onClose,
}: WeaponDetailDialogProps) {
    const { t } = useTranslation();
    const weapon = WEAPON_TYPES[weaponType as keyof typeof WEAPON_TYPES];

    if (!weapon) return null;

    const weaponArtUrl = WEAPON_ART[weaponType as keyof typeof WEAPON_ART];

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <GameDialogContent variant="accent" className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-accent font-['Orbitron'] flex items-center gap-2">
                        <span
                            style={{ color: weapon.color, fontSize: "1.5em" }}
                        >
                            {weapon.icon}
                        </span>
                        {t(`weapon_types.${weaponType}`)}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {t("weapon_info.info_title")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {weaponArtUrl && (
                        <div className="flex justify-center">
                            <GameImage
                                src={weaponArtUrl}
                                alt={t(`weapon_types.${weaponType}`)}
                                className="max-h-32 object-contain rounded border border-[#ffb00033] bg-[rgba(0,0,0,0.3)]"
                            />
                        </div>
                    )}
                    {/* Damage */}
                    <div className="bg-[rgba(255,176,0,0.05)] border border-accent p-3 text-xs">
                        <div className="text-accent font-bold mb-2">
                            ⚔ {t("weapon_info.damage")}: {weapon.damage}
                        </div>
                        <div className="text-[#888]">
                            {t("weapon_info.damage_desc")}
                        </div>
                    </div>

                    {/* Accuracy */}
                    <div className="bg-[rgba(255,176,0,0.05)] border border-accent p-3 text-xs">
                        <div className="text-accent font-bold mb-2">
                            🎯 {t("weapon_info.accuracy")}
                        </div>
                        {weaponType === "kinetic" && (
                            <div className="text-[#00ff41]">
                                90% {t("weapon_info.accuracy_desc")}
                            </div>
                        )}
                        {weaponType === "laser" && (
                            <div className="text-[#00ff41]">
                                95% {t("weapon_info.accuracy_desc")}
                            </div>
                        )}
                        {weaponType === "missile" && (
                            <div className="text-[#00ff41]">
                                80% {t("weapon_info.accuracy_desc")}
                            </div>
                        )}
                        <div className="text-[#888] mt-1">
                            {t("weapon_info.accuracy_note")}
                        </div>
                    </div>

                    {/* Special ability */}
                    <div className="bg-[rgba(255,176,0,0.05)] border border-accent p-3 text-xs">
                        <div className="text-accent font-bold mb-2">
                            ★ {t("weapon_info.feature")}
                        </div>
                        <div className="text-[#00ff41]">
                            {t(`weapon_info.${weaponType}_feature`)}
                        </div>
                    </div>

                    {/* Usage tips */}
                    <div className="border-t border-accent pt-3 text-xs">
                        <div className="text-accent font-bold mb-2">
                            💡 {t("weapon_info.when_to_use")}
                        </div>
                        {weaponType === "kinetic" && (
                            <div className="text-[#888] space-y-1">
                                <div>{t("weapon_info.kinetic_usage_1")}</div>
                                <div>{t("weapon_info.kinetic_usage_2")}</div>
                                <div>{t("weapon_info.kinetic_usage_3")}</div>
                            </div>
                        )}
                        {weaponType === "laser" && (
                            <div className="text-[#888] space-y-1">
                                <div>{t("weapon_info.laser_usage_1")}</div>
                                <div>{t("weapon_info.laser_usage_2")}</div>
                                <div>{t("weapon_info.laser_usage_3")}</div>
                            </div>
                        )}
                        {weaponType === "missile" && (
                            <div className="text-[#888] space-y-1">
                                <div>{t("weapon_info.missile_usage_1")}</div>
                                <div>{t("weapon_info.missile_usage_2")}</div>
                                <div>{t("weapon_info.missile_usage_3")}</div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button
                            onClick={onClose}
                            className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] text-xs uppercase flex-1"
                        >
                            {t("weapon_info.close")}
                        </Button>
                    </div>
                </div>
            </GameDialogContent>
        </Dialog>
    );
}
