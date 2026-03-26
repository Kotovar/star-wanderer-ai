"use client";

import { useGameStore } from "../store";
import { Button } from "@/components/ui/button";
import { MODULE_RECIPES } from "@/game/constants/crafting";
import { useTranslation } from "@/lib/useTranslation";

export function DerelictShipPanel() {
    const currentLocation = useGameStore((s) => s.currentLocation);
    const crew = useGameStore((s) => s.crew);
    const exploreDerelictShip = useGameStore((s) => s.exploreDerelictShip);
    const showSectorMap = useGameStore((s) => s.showSectorMap);
    const { t } = useTranslation();

    if (!currentLocation || currentLocation.type !== "derelict_ship") return null;

    const hasScout = crew.some((c) => c.profession === "scout");
    const isExplored = currentLocation.derelictExplored ?? false;
    const loot = currentLocation.derelictLoot;

    const hasAnyLoot =
        loot &&
        (loot.spares || loot.electronics || loot.rare_minerals || loot.moduleRecipeId);

    return (
        <div className="flex flex-col gap-4 p-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <span className="text-4xl">🛸</span>
                <div>
                    <div className="font-['Orbitron'] font-bold text-lg text-[#00d4ff]">
                        ▸ {t("derelict_ship.title")}
                    </div>
                    <div className="text-sm text-[#888]">
                        {t("derelict_ship.subtitle")}
                    </div>
                </div>
            </div>

            <div className="border border-[#00d4ff33] bg-[rgba(0,212,255,0.03)] p-4">
                <p className="text-sm text-[#aaa] mb-3">
                    {t("derelict_ship.description")}
                </p>

                {isExplored ? (
                    <div className="space-y-3">
                        {hasAnyLoot ? (
                            <>
                                <div className="text-[#00ff41] text-sm font-bold mb-2">
                                    ✓ {t("derelict_ship.explored_results")}
                                </div>
                                <div className="space-y-1 text-sm">
                                    {loot?.spares && loot.spares > 0 && (
                                        <div className="text-[#aaa]">
                                            🔧 {t("derelict_ship.loot_spares")}: ×{loot.spares}
                                        </div>
                                    )}
                                    {loot?.electronics && loot.electronics > 0 && (
                                        <div className="text-[#aaa]">
                                            💾 {t("derelict_ship.loot_electronics")}: ×{loot.electronics}
                                        </div>
                                    )}
                                    {loot?.rare_minerals && loot.rare_minerals > 0 && (
                                        <div className="text-[#aaa]">
                                            💎 {t("derelict_ship.loot_rare_minerals")}: ×{loot.rare_minerals}
                                        </div>
                                    )}
                                    {loot?.moduleRecipeId && (
                                        <div className="text-[#ffb000] font-bold">
                                            📐 {t("derelict_ship.loot_blueprint")}:{" "}
                                            {MODULE_RECIPES[loot.moduleRecipeId as keyof typeof MODULE_RECIPES]
                                                ? `${MODULE_RECIPES[loot.moduleRecipeId as keyof typeof MODULE_RECIPES].icon} ${MODULE_RECIPES[loot.moduleRecipeId as keyof typeof MODULE_RECIPES].name}`
                                                : loot.moduleRecipeId}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="text-[#888] text-sm p-2 border border-[#00d4ff33] bg-[rgba(0,212,255,0.03)]">
                                ✓ {t("derelict_ship.explored_empty")}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="text-xs text-[#888] space-y-1">
                            <div>• {t("derelict_ship.hint_scout")}</div>
                            <div>• {t("derelict_ship.hint_loot")}</div>
                            <div>• {t("derelict_ship.hint_blueprint")}</div>
                        </div>

                        {!hasScout && (
                            <div className="text-[#ff0040] text-xs p-2 border border-[#ff004033]">
                                ⚠ {t("derelict_ship.requires_scout")}
                            </div>
                        )}

                        <Button
                            disabled={!hasScout}
                            onClick={() => exploreDerelictShip(currentLocation.id)}
                            className="w-full bg-transparent border-2 border-[#00d4ff] text-[#00d4ff] hover:bg-[#00d4ff] hover:text-[#050810] uppercase tracking-wider text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            🔍 {t("derelict_ship.explore_button")}
                        </Button>
                    </div>
                )}
            </div>

            <Button
                onClick={showSectorMap}
                className="bg-transparent border-2 border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase tracking-wider w-fit cursor-pointer"
            >
                ◂ {t("common.leave")}
            </Button>
        </div>
    );
}
