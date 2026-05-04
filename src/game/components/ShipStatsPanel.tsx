"use client";

import { useGameStore } from "@/game/store";
import { useTranslation } from "@/lib/useTranslation";
import { StatIcon } from "./StatIcon";

interface ShipStatsPanelProps {
    title?: string;
    showEvasion?: boolean;
}

export function ShipStatsPanel({ title, showEvasion = true }: ShipStatsPanelProps) {
    const { t } = useTranslation();
    const ship = useGameStore((s) => s.ship);
    const crew = useGameStore((s) => s.crew);
    const captain = useGameStore((s) =>
        s.crew.find((c) => c.profession === "pilot"),
    );

    const currentHull = ship.modules.reduce((s, m) => s + m.health, 0);
    const maxHull = ship.modules.reduce(
        (s, m) => s + (m.maxHealth || m.health),
        0,
    );

    return (
        <div className="bg-[rgba(0,0,0,0.3)] p-3 mb-4 border border-[#00ff41]">
            {title && (
                <p className="text-[#ffb000] font-bold mb-2">{title}</p>
            )}
            {!title && (
                <p className="text-[#ffb000] mb-2">
                    {t("unknown_ship.your_stats")}
                </p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs md:text-sm">
                <div className="min-w-0">
                    <span className="text-[#00d4ff] whitespace-nowrap">
                        <StatIcon type="shields" size={32} className="mr-1" />
                        {t("unknown_ship.shields")}
                    </span>
                    <span className="text-[#00ff41] ml-1">
                        {ship.shields}/{ship.maxShields}
                    </span>
                </div>
                <div className="min-w-0">
                    <span className="text-[#ffb000] whitespace-nowrap">
                        <StatIcon type="armor" size={32} className="mr-1" />
                        {t("unknown_ship.defense")}
                    </span>
                    <span className="text-[#00ff41] ml-1">
                        {ship.armor}
                    </span>
                </div>
                <div className="min-w-0">
                    <span className="text-[#ffb000] whitespace-nowrap">
                        <StatIcon type="health" size={32} className="mr-1" />
                        {t("unknown_ship.hull")}
                    </span>
                    <span className="text-[#00ff41] ml-1">
                        {currentHull}/{maxHull}
                    </span>
                </div>
                <div className="min-w-0">
                    <span className="text-[#ff4444] whitespace-nowrap">
                        <StatIcon type="crew" size={32} className="mr-1" />
                        {t("unknown_ship.crew")}
                    </span>
                    <span className="text-[#00ff41] ml-1">
                        {crew.filter((c) => c.health > 50).length}/
                        {crew.length}
                    </span>
                </div>
            </div>
            {showEvasion && (
                <div className="mt-2 text-xs md:text-sm">
                    <span className="text-[#00ff41] whitespace-nowrap">
                        <StatIcon type="evasion" size={32} className="mr-1" />
                        {t("unknown_ship.evasion")}
                    </span>
                    <span className="text-[#00ff41] ml-1">
                        {(captain?.level || 1) + (ship.bonusEvasion || 0)}%
                        {ship.bonusEvasion ? (
                            <span className="text-[#9933ff]">
                                {" "}
                                {t("unknown_ship.bonus").replace(
                                    "{{bonus}}",
                                    String(ship.bonusEvasion),
                                )}
                            </span>
                        ) : null}
                    </span>
                </div>
            )}
        </div>
    );
}
