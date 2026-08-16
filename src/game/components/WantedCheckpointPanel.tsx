"use client";

import { Button } from "@/components/ui/button";
import {
    canFightWantedPursuit,
    getWantedBribeCost,
} from "@/game/slices/pirate/wanted";
import { useGameStore } from "@/game/store";
import { getLocationName } from "@/lib/translationHelpers";
import { useTranslation } from "@/lib/useTranslation";

export function WantedCheckpointPanel() {
    const currentLocation = useGameStore((state) => state.currentLocation);
    const wantedHeat = useGameStore((state) => state.wantedHeat ?? 0);
    const credits = useGameStore((state) => state.credits);
    const contraband = useGameStore(
        (state) =>
            state.ship.tradeGoods.find((good) => good.item === "contraband")
                ?.quantity ?? 0,
    );
    const resolveWantedCheckpoint = useGameStore(
        (state) => state.resolveWantedCheckpoint,
    );
    const { t } = useTranslation();

    if (!currentLocation) return null;

    const bribeCost = getWantedBribeCost(wantedHeat);
    const canFight = canFightWantedPursuit(wantedHeat);

    return (
        <div className="flex flex-col gap-4">
            <div className="font-['Orbitron'] text-lg font-bold text-[#ff0040]">
                ☠ {t("pirate.checkpoint_title")}
            </div>
            <div className="border border-[#ff004066] bg-[rgba(255,0,64,0.08)] p-3 text-sm leading-relaxed text-[#ffb000]">
                {t("pirate.checkpoint_desc", {
                    station: getLocationName(currentLocation.name, t),
                })}
            </div>
            <div className="border border-[#ff004088] bg-[rgba(255,0,64,0.05)] p-3 text-sm">
                <div className="font-bold text-[#ff6677]">
                    {t("pirate.checkpoint_heat", { heat: wantedHeat })}
                </div>
                <div className="mt-2 h-2 bg-[#330000]">
                    <div
                        className="h-full bg-gradient-to-r from-[#ff6600] to-[#ff0040]"
                        style={{ width: `${Math.min(100, wantedHeat)}%` }}
                    />
                </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
                <CheckpointAction
                    label={t("pirate.checkpoint_bribe", { cost: bribeCost })}
                    hint={t("pirate.checkpoint_bribe_hint")}
                    disabled={credits < bribeCost}
                    tone="amber"
                    onClick={() => resolveWantedCheckpoint("bribe")}
                />
                <CheckpointAction
                    label={t("pirate.checkpoint_dump", { quantity: contraband })}
                    hint={t("pirate.checkpoint_dump_hint")}
                    disabled={contraband === 0}
                    tone="red"
                    onClick={() => resolveWantedCheckpoint("dump")}
                />
                {canFight && (
                    <CheckpointAction
                        label={t("pirate.checkpoint_fight")}
                        hint={t("pirate.checkpoint_fight_hint")}
                        tone="red"
                        onClick={() => resolveWantedCheckpoint("fight")}
                    />
                )}
                <CheckpointAction
                    label={t("pirate.checkpoint_leave")}
                    tone="green"
                    onClick={() => resolveWantedCheckpoint("leave")}
                />
            </div>
        </div>
    );
}

function CheckpointAction({
    label,
    hint,
    disabled = false,
    tone,
    onClick,
}: {
    label: string;
    hint?: string;
    disabled?: boolean;
    tone: "amber" | "green" | "red";
    onClick: () => void;
}) {
    const colors = {
        amber: "border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000]",
        green: "border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41]",
        red: "border-[#ff0040] text-[#ff0040] hover:bg-[#ff0040]",
    }[tone];

    return (
        <div className="flex flex-col gap-1">
            <Button
                onClick={onClick}
                disabled={disabled}
                className={`cursor-pointer border-2 bg-transparent uppercase tracking-wider hover:text-[#050810] disabled:cursor-not-allowed disabled:opacity-40 ${colors}`}
            >
                {label}
            </Button>
            {hint && <div className="text-xs text-[#888]">{hint}</div>}
        </div>
    );
}
