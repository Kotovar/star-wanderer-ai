"use client";

import { useGameStore } from "../store";
import { Button } from "@/components/ui/button";
import { RACES } from "../constants/races";
import type { RaceId } from "../types";
import { useTranslation } from "@/lib/useTranslation";

export function HostileApproachWarningPanel() {
    const currentLocation = useGameStore((s) => s.currentLocation);
    const bannedPlanets = useGameStore((s) => s.bannedPlanets);
    const confirmHostileApproach = useGameStore(
        (s) => s.confirmHostileApproach,
    );
    const cancelHostileApproach = useGameStore((s) => s.cancelHostileApproach);
    const { t } = useTranslation();

    if (!currentLocation) return null;

    const race = currentLocation.dominantRace
        ? RACES[currentLocation.dominantRace as RaceId]
        : null;
    const isBanned = bannedPlanets.includes(currentLocation.id);
    const locType = currentLocation.type;

    // Friendly ships can attack — show combat option
    // Stations and planets refuse entry — show access denied
    const isFriendlyShip = locType === "friendly_ship";

    // Get location display name - handle station_name.X keys
    const getDisplayName = () => {
        const fullName = currentLocation.name;
        if (fullName.startsWith("station_name.")) {
            return `${t("events.station")} ${fullName.replace("station_name.", "")}`;
        }
        return fullName;
    };

    let warningText: string;
    if (isBanned) {
        warningText = t("reputation.access_denied.banned");
    } else if (isFriendlyShip) {
        warningText = `${race?.name ?? ""} ${t("reputation.hostile_ship_warning")}`;
    } else if (locType === "station") {
        warningText = t("reputation.access_denied.station");
    } else {
        warningText = t("reputation.access_denied.planet");
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="font-['Orbitron'] font-bold text-lg text-[#ff0040]">
                {t("reputation.hostile_territory")}
            </div>

            {race && (
                <div
                    className="flex items-center gap-3 px-3 py-2 rounded border"
                    style={{
                        borderColor: race.color,
                        backgroundColor: `${race.color}15`,
                    }}
                >
                    <span className="text-2xl">{race.icon}</span>
                    <div>
                        <div
                            className="font-bold"
                            style={{ color: race.color }}
                        >
                            {getDisplayName()}
                        </div>
                        <div className="text-xs text-[#888]">{race.name}</div>
                    </div>
                </div>
            )}

            <div className="text-sm text-[#ffb000] leading-relaxed border border-[#ff0040] bg-[rgba(255,0,64,0.08)] p-3 rounded">
                {warningText}
            </div>

            <div className="flex flex-col gap-2">
                {(isFriendlyShip || isBanned) && (
                    <Button
                        onClick={confirmHostileApproach}
                        className="bg-transparent border-2 border-[#ff0040] text-[#ff0040] hover:bg-[#ff0040] hover:text-[#050810] uppercase tracking-wider cursor-pointer"
                    >
                        {t("reputation.approach_combat")}
                    </Button>
                )}
                <Button
                    onClick={cancelHostileApproach}
                    className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider cursor-pointer"
                >
                    {isFriendlyShip || isBanned
                        ? t("reputation.retreat")
                        : t("reputation.access_denied.return")}
                </Button>
            </div>
        </div>
    );
}
