"use client";

import { useGameStore } from "../store";
import { Button } from "@/components/ui/button";
import type { StormType } from "../types";
import { useTranslation } from "@/lib/useTranslation";
import { ShipStatsPanel } from "./ShipStatsPanel";

// StormType
type StormDetails = {
    icon: string;
    color: string;
    nameKey: string;
    descKey: string;
    damageKey: string;
    lootKey: string;
};
type StormInfo = Record<StormType, StormDetails>;

const STORM_INFO: StormInfo = {
    radiation: {
        icon: "☢️",
        color: "#00ff00",
        nameKey: "storm.radiation_cloud",
        descKey: "storm.radiation_cloud_desc",
        damageKey: "storm.radiation_cloud_damage",
        lootKey: "storm.radiation_cloud_loot",
    },
    ionic: {
        icon: "⚡",
        color: "#00d4ff",
        nameKey: "storm.ion_storm",
        descKey: "storm.ion_storm_desc",
        damageKey: "storm.ion_storm_damage",
        lootKey: "storm.ion_storm_loot",
    },
    plasma: {
        icon: "🔥",
        color: "#ff4400",
        nameKey: "storm.plasma_storm",
        descKey: "storm.plasma_storm_desc",
        damageKey: "storm.plasma_storm_damage",
        lootKey: "storm.plasma_storm_loot",
    },
};

export function StormPanel() {
    const { t } = useTranslation();
    const currentLocation = useGameStore((s) => s.currentLocation);
    const ship = useGameStore((s) => s.ship);
    const crew = useGameStore((s) => s.crew);
    const completedLocations = useGameStore((s) => s.completedLocations);
    const log = useGameStore((s) => s.log);
    const enterStorm = useGameStore((s) => s.enterStorm);
    const showSectorMap = useGameStore((s) => s.showSectorMap);
    const getEffectiveScanRange = useGameStore((s) => s.getEffectiveScanRange);

    if (!currentLocation || currentLocation.type !== "storm") return null;

    const stormType = currentLocation.stormType || "radiation";
    const intensity = currentLocation.stormIntensity || 1;
    const info = STORM_INFO[stormType];
    const scanRange = getEffectiveScanRange();
    const canScan = scanRange >= 5; // Storm detection requires scanRange >= 5

    const intensityLabels = [
        "",
        t("storm.weak"),
        t("storm.medium"),
        t("storm.strong"),
    ];

    // Check if storm was already entered
    const stormCompleted = completedLocations.includes(currentLocation.id);

    // Get recent storm-related log entries
    const recentStormLogs = log
        .slice(0, 10)
        .filter(
            (entry) =>
                entry.message.includes("Шторм") ||
                entry.message.includes("Storm") ||
                entry.message.includes("Щиты:") ||
                entry.message.includes("Shields:") ||
                entry.message.includes("Модули повреждены") ||
                entry.message.includes("Modules damaged") ||
                entry.message.includes("Экипаж:") ||
                entry.message.includes("Crew:") ||
                entry.message.includes("Добыча:") ||
                entry.message.includes("Loot:") ||
                entry.message.includes("РЕДКАЯ НАХОДКА") ||
                entry.message.includes("RARE FIND") ||
                entry.message.includes("ВХОД В") ||
                entry.message.includes("ENTERING"),
        );

    if (stormCompleted) {
        // Show results after completing the storm
        return (
            <div
                className="bg-[rgba(50,0,50,0.3)] border-2 p-4"
                style={{ borderColor: info.color }}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2
                        className="text-xl font-bold font-['Orbitron']"
                        style={{ color: info.color }}
                    >
                        {info.icon} {t("storm.storm_overcome")}
                    </h2>
                    <span className="text-sm text-[#00ff41]">
                        {t("storm.investigated")}
                    </span>
                </div>

                <div
                    className="bg-[rgba(0,0,0,0.4)] p-3 mb-4 border"
                    style={{ borderColor: info.color }}
                >
                    <p className="text-[#ffb000] mb-3 font-bold">
                        {t("storm.rewards")}
                    </p>
                    <div className="space-y-1.5 text-sm">
                        {recentStormLogs.map((entry, i) => (
                            <div
                                key={i}
                                className={`
                ${entry.type === "error" ? "text-[#ff4444]" : ""}
                ${entry.type === "warning" ? "text-[#ffb000]" : ""}
                ${entry.type === "info" && entry.message.includes("+") ? "text-[#00ff41]" : ""}
                ${entry.type === "info" && !entry.message.includes("+") ? "text-[#888]" : ""}
              `}
                            >
                                {entry.message}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-[rgba(0,0,0,0.3)] p-3 mb-4 border border-[#00ff41]">
                    <p className="text-[#ffb000] mb-2">
                        {t("storm.stats_title")}
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                            <span className="text-[#00d4ff]">
                                {t("storm.shields")}:
                            </span>
                            <span
                                className={`${ship.shields > 0 ? "text-[#00ff41]" : "text-[#ff4444]"} ml-1`}
                            >
                                {Math.floor(ship.shields)}/{ship.maxShields}
                            </span>
                        </div>
                        <div>
                            <span className="text-[#ffb000]">
                                {t("storm.defense_label")}
                            </span>
                            <span className="text-[#00ff41] ml-1">
                                {ship.armor} {t("ship_stats.units")}
                            </span>
                        </div>
                        <div>
                            <span className="text-[#ff4444]">
                                {t("storm.crew_label")}
                            </span>
                            <span
                                className={`${crew.filter((c) => c.health > 50).length === crew.length ? "text-[#00ff41]" : "text-[#ffb000]"} ml-1`}
                            >
                                {crew.filter((c) => c.health > 50).length}/
                                {crew.length}
                            </span>
                        </div>
                    </div>
                </div>

                <Button
                    onClick={showSectorMap}
                    className="w-full bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] font-bold cursor-pointer"
                >
                    {t("storm.leave_storm")}
                </Button>
            </div>
        );
    }

    // Show storm info before entering
    // Without scanner, show generic "Unknown object" info
    if (!canScan) {
        return (
            <div className="bg-[rgba(50,50,50,0.3)] border-2 border-[#666] p-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold font-['Orbitron'] text-[#888]">
                        {t("unknown_ship.unknown_object")}
                    </h2>
                </div>

                <div className="bg-[rgba(0,0,0,0.4)] p-3 mb-4 border border-[#666]">
                    <p className="text-[#888] mb-2">
                        {t("storm.sensors_unknown")}
                    </p>
                    <p className="text-[#ffb000]">
                        {t("storm.scanner_required")}
                    </p>
                </div>

                <div className="bg-[rgba(0,0,0,0.3)] p-3 mb-4 border border-[#ffb000]">
                    <p className="text-[#ffb000] font-bold mb-2">
                        {t("unknown_ship.warning")}
                    </p>
                    <p className="text-[#888] text-sm">
                        {t("unknown_ship.warning_object")}
                    </p>
                </div>

                <ShipStatsPanel />
                <div className="flex gap-4">
                    <Button
                        onClick={enterStorm}
                        className="flex-1 bg-[#ff4444] hover:bg-[#ff6666] text-white font-bold cursor-pointer"
                    >
                        {t("storm.investigate")}
                    </Button>
                    <Button
                        onClick={showSectorMap}
                        className="bg-transparent border-2 border-[#666] text-[#888] hover:bg-[rgba(100,100,100,0.2)] cursor-pointer"
                    >
                        {t("storm.retreat")}
                    </Button>
                </div>
            </div>
        );
    }

    // With scanner, show full storm info
    return (
        <div
            className="bg-[rgba(50,0,50,0.3)] border-2 p-4"
            style={{ borderColor: info.color }}
        >
            <div className="flex justify-between items-center mb-4">
                <h2
                    className="text-xl font-bold font-['Orbitron']"
                    style={{ color: info.color }}
                >
                    {info.icon} {t(info.nameKey)}
                </h2>
                <span className="text-sm text-[#ffb000]">
                    {t("storm.intensity")
                        .replace("{{intensity}}", String(intensity))
                        .replace("{{label}}", intensityLabels[intensity])}
                </span>
            </div>

            <div
                className="bg-[rgba(0,0,0,0.4)] p-3 mb-4 border"
                style={{ borderColor: info.color }}
            >
                <p className="text-[#ffb000] mb-2">{t(info.descKey)}</p>
                <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                    <div>
                        <span className="text-[#ff4444]">
                            {t("storm.danger")}
                        </span>
                        <p className="text-[#888] ml-2">{t(info.damageKey)}</p>
                    </div>
                    <div>
                        <span className="text-[#00ff41]">
                            {t("storm.loot")}
                        </span>
                        <p className="text-[#888] ml-2">{t(info.lootKey)}</p>
                    </div>
                </div>
            </div>

            <div className="bg-[rgba(0,0,0,0.3)] p-3 mb-4 border border-[#ff4444]">
                <p className="text-[#ff4444] font-bold mb-2">
                    {t("storm.warning")}
                </p>
                <p className="text-[#888] text-sm">
                    {t("storm.warning_storm")}
                </p>
            </div>

            <div className="bg-[rgba(0,0,0,0.3)] p-3 mb-4 border border-[#00ff41]">
                <p className="text-[#ffb000] mb-2">{t("storm.your_stats")}</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                        <span className="text-[#00d4ff]">
                            {t("storm.shields")}:
                        </span>
                        <span className="text-[#00ff41] ml-1">
                            {ship.shields}/{ship.maxShields}
                        </span>
                    </div>
                    <div>
                        <span className="text-[#ffb000]">
                            {t("storm.defense_label")}
                        </span>
                        <span className="text-[#00ff41] ml-1">
                            {ship.armor} {t("ship_stats.units")}
                        </span>
                    </div>
                    <div>
                        <span className="text-[#ff4444]">
                            {t("storm.crew_label")}
                        </span>
                        <span className="text-[#00ff41] ml-1">
                            {crew.filter((c) => c.health > 50).length}/
                            {crew.length}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex gap-4">
                <Button
                    onClick={enterStorm}
                    className="flex-1 bg-[#ff4444] hover:bg-[#ff6666] text-white font-bold cursor-pointer"
                >
                    {t("storm.enter_storm").replace("{{icon}}", info.icon)}
                </Button>
                <Button
                    onClick={showSectorMap}
                    className="bg-transparent border-2 border-[#666] text-[#888] hover:bg-[rgba(100,100,100,0.2)] cursor-pointer"
                >
                    {t("storm.retreat")}
                </Button>
            </div>
        </div>
    );
}
