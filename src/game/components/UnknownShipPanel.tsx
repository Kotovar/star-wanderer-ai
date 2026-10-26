"use client";

import { useGameStore } from "@/game/store";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";
import { ShipStatsPanel } from "./ShipStatsPanel";
import { getLocationName } from "@/lib/translationHelpers";

export function UnknownShipPanel() {
    const { t } = useTranslation();
    const currentLocation = useGameStore((s) => s.currentLocation);
    const showSectorMap = useGameStore((s) => s.showSectorMap);
    const approachUnknownLocation = useGameStore((s) => s.approachUnknownLocation);
    const canScanObject = useGameStore((s) => s.canScanObject);

    if (!currentLocation) return null;

    const isShip = ["enemy", "friendly_ship", "derelict_ship"].includes(currentLocation.type);
    const canScan = canScanObject(
        currentLocation.type,
        currentLocation.threat ?? currentLocation.anomalyTier,
    );
    const isRevealed = canScan || !!currentLocation.signalRevealed;

    // Get appropriate title and description
    const getTitle = () => {
        if (isRevealed) {
            return getLocationName(currentLocation.name, t);
        }
        if (
            currentLocation.type === "friendly_ship" ||
            currentLocation.type === "enemy" ||
            currentLocation.type === "boss" ||
            currentLocation.type === "derelict_ship"
        ) {
            return t("locations.unknown_ship");
        }
        return t("unknown_ship.unknown_object");
    };

    const getDescription = () => {
        if (isRevealed) {
            if (currentLocation.type === "enemy") {
                return t("unknown_ship.enemy_ship").replace(
                    "{{threat}}",
                    String(currentLocation.threat || 1),
                );
            } else if (currentLocation.type === "friendly_ship") {
                return t("unknown_ship.friendly_ship");
            } else if (currentLocation.type === "boss") {
                return t("unknown_ship.ancient_ship");
            } else if (currentLocation.type === "anomaly") {
                const type =
                    currentLocation.anomalyType === "good"
                        ? t("unknown_ship.anomaly_good")
                        : t("unknown_ship.anomaly_dangerous");
                return `🔮 ${type}`;
            } else if (currentLocation.type === "storm") {
                return t("unknown_ship.storm");
            }
        }
        return t("unknown_ship.no_scanner");
    };

    return (
        <div className="bg-[rgba(50,50,50,0.3)] border-2 border-[#666] p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold font-['Orbitron'] text-[#888]">
                    {getTitle()}
                </h2>
            </div>

            <div className="bg-[rgba(0,0,0,0.4)] p-3 mb-4 border border-[#666]">
                <p className="text-[#888] mb-2">{getDescription()}</p>
                {!isRevealed && (
                    <p className="text-[#ffb000]">
                        {t("unknown_ship.scanner_required")}
                    </p>
                )}
            </div>

            <div className="bg-[rgba(0,0,0,0.3)] p-3 mb-4 border border-[#ffb000]">
                <p className="text-[#ffb000] font-bold mb-2">
                    {t("unknown_ship.warning")}
                </p>
                <p className="text-[#888] text-sm">
                    {isShip
                        ? t("unknown_ship.warning_ship")
                        : t("unknown_ship.warning_object")}
                </p>
            </div>

            <ShipStatsPanel />

            <div className="flex gap-4">
                <Button
                    onClick={approachUnknownLocation}
                    className="flex-1 bg-[#ff4444] hover:bg-[#ff6666] text-white font-bold cursor-pointer"
                >
                    {t("unknown_ship.approach")}
                </Button>
                <Button
                    onClick={showSectorMap}
                    className="bg-transparent border-2 border-[#666] text-[#888] hover:bg-[rgba(100,100,100,0.2)] cursor-pointer"
                >
                    {t("unknown_ship.retreat")}
                </Button>
            </div>
        </div>
    );
}
