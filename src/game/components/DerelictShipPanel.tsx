"use client";

import { useGameStore } from "../store";
import { Button } from "@/components/ui/button";
import { MODULE_RECIPES } from "@/game/constants/crafting";
import type { DerelictApproach } from "@/game/types";
import { getDerelictApproachBlockReason } from "@/game/slices/locations/helpers/exploreDerelictShip";
import { useTranslation } from "@/lib/useTranslation";
import {
    ArrowLeft,
    Cpu,
    Database,
    DraftingCompass,
    Gem,
    Search,
    Wrench,
} from "lucide-react";
import { EventIllustration } from "./EventIllustration";

export function DerelictShipPanel() {
    const currentLocation = useGameStore((s) => s.currentLocation);
    const crew = useGameStore((s) => s.crew);
    const modules = useGameStore((s) => s.ship.modules);
    const exploreDerelictShip = useGameStore((s) => s.exploreDerelictShip);
    const resolveDerelictDiscovery = useGameStore(
        (s) => s.resolveDerelictDiscovery,
    );
    const showSectorMap = useGameStore((s) => s.showSectorMap);
    const { t } = useTranslation();

    if (!currentLocation || currentLocation.type !== "derelict_ship") return null;

    const isExplored = currentLocation.derelictExplored ?? false;
    const loot = currentLocation.derelictLoot;
    const profile = currentLocation.derelictProfile;
    const pendingDiscovery =
        isExplored && profile && !loot?.discovery;
    const approaches: DerelictApproach[] = [
        "boarding",
        "engineering",
        "archive",
    ];

    const hasAnyLoot = Boolean(
        loot &&
            (loot.spares ||
                loot.electronics ||
                loot.rare_minerals ||
                loot.ancient_data ||
                loot.tech_salvage ||
                loot.moduleRecipeId ||
                loot.crewDamage ||
                loot.moduleDamage),
    );

    return (
        <div className="flex flex-col gap-4 p-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div>
                    <div className="font-['Orbitron'] font-bold text-lg text-[#00d4ff]">
                        ▸ {t("derelict_ship.title")}
                    </div>
                    <div className="text-sm text-[#888]">
                        {t("derelict_ship.subtitle")}
                    </div>
                </div>
            </div>

            <EventIllustration variant="derelict" accent="#00d4ff" muted={isExplored} />

            <div className="rounded border border-[#00d4ff33] bg-[rgba(0,212,255,0.03)] p-4">
                <p className="text-sm text-[#aaa] mb-3">
                    {t("derelict_ship.description")}
                </p>

                {profile && (
                    <div className="mb-3 rounded border border-[#00d4ff55] bg-[rgba(0,212,255,0.06)] px-3 py-2">
                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ring">
                            {t("derelict_ship.signature_title")}
                        </div>
                        <div className="mt-1 text-xs font-bold text-[#67e8f9]">
                            {t(`derelict_ship.profile.${profile}.name`)}
                        </div>
                        <div className="mt-0.5 text-[11px] leading-snug text-[#a8c5d2]">
                            {t(`derelict_ship.profile.${profile}.description`)}
                        </div>
                    </div>
                )}

                {isExplored ? (
                    <div className="space-y-3">
                        {hasAnyLoot ? (
                            <>
                                <div className="text-[#00ff41] text-sm font-bold mb-2">
                                    ✓ {t("derelict_ship.explored_results")}
                                </div>
                                <div className="space-y-1 text-sm">
                                    {loot?.approach && (
                                        <div className="text-[#00d4ff] text-xs uppercase tracking-wider">
                                            {t(`derelict_ship.approach.${loot.approach}.name`)}
                                        </div>
                                    )}
                                    {loot?.spares && loot.spares > 0 && (
                                        <div className="flex items-center gap-2 text-[#aaa]">
                                            <Wrench size={14} /> {t("derelict_ship.loot_spares")}: ×{loot.spares}
                                        </div>
                                    )}
                                    {loot?.electronics && loot.electronics > 0 && (
                                        <div className="flex items-center gap-2 text-[#aaa]">
                                            <Cpu size={14} /> {t("derelict_ship.loot_electronics")}: ×{loot.electronics}
                                        </div>
                                    )}
                                    {loot?.rare_minerals && loot.rare_minerals > 0 && (
                                        <div className="flex items-center gap-2 text-[#aaa]">
                                            <Gem size={14} /> {t("derelict_ship.loot_rare_minerals")}: ×{loot.rare_minerals}
                                        </div>
                                    )}
                                    {loot?.moduleRecipeId && (
                                        <div className="flex items-center gap-2 text-[#ffb000] font-bold">
                                            <DraftingCompass size={14} /> {t("derelict_ship.loot_blueprint")}:{" "}
                                            {MODULE_RECIPES[loot.moduleRecipeId as keyof typeof MODULE_RECIPES]
                                                ? MODULE_RECIPES[loot.moduleRecipeId as keyof typeof MODULE_RECIPES].name
                                                : loot.moduleRecipeId}
                                        </div>
                                    )}
                                    {loot?.ancient_data && loot.ancient_data > 0 && (
                                        <div className="flex items-center gap-2 text-[#cc44ff]">
                                            <Database size={14} /> {t("derelict_ship.loot_ancient_data")}: ×{loot.ancient_data}
                                        </div>
                                    )}
                                    {loot?.tech_salvage && loot.tech_salvage > 0 && (
                                        <div className="flex items-center gap-2 text-[#00d4ff]">
                                            <Wrench size={14} /> {t("derelict_ship.loot_tech_salvage")}: ×{loot.tech_salvage}
                                        </div>
                                    )}
                                    {loot?.crewDamage && loot.crewDamage > 0 && (
                                        <div className="text-[#ff6644]">
                                            {t("derelict_ship.result_crew_damage", {
                                                damage: loot.crewDamage,
                                            })}
                                        </div>
                                    )}
                                    {loot?.moduleDamage && loot.damagedModuleName && (
                                        <div className="text-[#ff6644]">
                                            {t("derelict_ship.result_module_damage", {
                                                damage: loot.moduleDamage,
                                                module_name: loot.damagedModuleName,
                                            })}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="rounded border border-[#00d4ff33] bg-[rgba(0,212,255,0.03)] p-2 text-sm text-[#888]">
                                ✓ {t("derelict_ship.explored_empty")}
                            </div>
                        )}

                        {pendingDiscovery && (
                            <div className="rounded border border-[#ffb00077] bg-[rgba(255,176,0,0.06)] p-3">
                                <div className="text-xs font-bold uppercase tracking-wider text-[#ffcb57]">
                                    {t("derelict_ship.discovery.title")}
                                </div>
                                <p className="mt-1 text-[11px] leading-snug text-[#b8d9e8]">
                                    {t("derelict_ship.discovery.intro")}
                                </p>
                                <p className="mt-1 text-[11px] leading-snug text-[#ffcb57]">
                                    {t(`derelict_ship.profile.${profile}.discovery`)}
                                </p>
                                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                                    <Button
                                        onClick={() =>
                                            resolveDerelictDiscovery(
                                                currentLocation.id,
                                                "deepen",
                                            )
                                        }
                                        className="h-auto cursor-pointer border border-[#ffb000] bg-transparent px-2.5 py-2 text-xs text-[#ffcb57] hover:bg-[#ffb000] hover:text-[#050810]"
                                    >
                                        {t("derelict_ship.discovery.deepen")}
                                    </Button>
                                    <Button
                                        onClick={() =>
                                            resolveDerelictDiscovery(
                                                currentLocation.id,
                                                "secure",
                                            )
                                        }
                                        className="h-auto cursor-pointer border border-[#00d4ff88] bg-transparent px-2.5 py-2 text-xs text-[#67e8f9] hover:bg-[#00d4ff] hover:text-[#050810]"
                                    >
                                        {t("derelict_ship.discovery.secure")}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {loot?.discovery && (
                            <div className="rounded border border-[#00d4ff44] bg-[rgba(0,212,255,0.035)] p-3 text-sm">
                                <div className="text-xs font-bold uppercase tracking-wider text-[#67e8f9]">
                                    {loot.discovery.choice === "deepen"
                                        ? t("derelict_ship.discovery.result_deepen")
                                        : t("derelict_ship.discovery.result_secure")}
                                </div>
                                {loot.discovery.choice === "deepen" && (
                                    <div className="mt-1 space-y-1 text-xs text-[#b8d9e8]">
                                        {loot.discovery.credits && (
                                            <div>₢ {t("derelict_ship.loot_credits")}: ×{loot.discovery.credits}</div>
                                        )}
                                        {loot.discovery.spares && (
                                            <div><Wrench size={14} className="mr-1 inline" />{t("derelict_ship.loot_spares")}: ×{loot.discovery.spares}</div>
                                        )}
                                        {loot.discovery.electronics && (
                                            <div><Cpu size={14} className="mr-1 inline" />{t("derelict_ship.loot_electronics")}: ×{loot.discovery.electronics}</div>
                                        )}
                                        {loot.discovery.ancient_data && (
                                            <div><Database size={14} className="mr-1 inline" />{t("derelict_ship.loot_ancient_data")}: ×{loot.discovery.ancient_data}</div>
                                        )}
                                        {loot.discovery.tech_salvage && (
                                            <div><Wrench size={14} className="mr-1 inline" />{t("derelict_ship.loot_tech_salvage")}: ×{loot.discovery.tech_salvage}</div>
                                        )}
                                        {loot.discovery.crewDamage && (
                                            <div className="text-[#ff6644]">{t("derelict_ship.result_crew_damage", { damage: loot.discovery.crewDamage })}</div>
                                        )}
                                        {loot.discovery.moduleDamage && loot.discovery.damagedModuleName && (
                                            <div className="text-[#ff6644]">{t("derelict_ship.result_module_damage", { damage: loot.discovery.moduleDamage, module_name: loot.discovery.damagedModuleName })}</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="text-xs text-[#888] uppercase tracking-wider">
                            {t("derelict_ship.choose_approach")}
                        </div>
                        {approaches.map((approach) => {
                            const blockReason = getDerelictApproachBlockReason(
                                approach,
                                crew,
                                modules,
                            );

                            return (
                                <div key={approach} className="space-y-1">
                                    <Button
                                        disabled={Boolean(blockReason)}
                                        onClick={() =>
                                            exploreDerelictShip(
                                                currentLocation.id,
                                                approach,
                                            )
                                        }
                                        className="h-auto w-full justify-start bg-transparent border border-[#00d4ff88] px-3 py-2 text-left hover:bg-[#00d4ff11] cursor-pointer disabled:cursor-not-allowed"
                                    >
                                        <span className="flex flex-col gap-0.5">
                                            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#00d4ff]">
                                                <Search size={14} /> {t(`derelict_ship.approach.${approach}.name`)}
                                            </span>
                                            <span className="text-[10px] font-normal normal-case leading-tight text-[#aaa]">
                                                {t(`derelict_ship.approach.${approach}.description`)}
                                            </span>
                                            <span className="text-[10px] font-normal normal-case leading-tight text-[#ffb000]">
                                                {t(`derelict_ship.approach.${approach}.risk`)}
                                            </span>
                                        </span>
                                    </Button>
                                    {blockReason && (
                                        <div className="text-[10px] text-[#ff6644] px-1">
                                            {t(`derelict_ship.requires_${blockReason}`)}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <Button
                onClick={showSectorMap}
                className="bg-transparent border-2 border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase tracking-wider w-fit cursor-pointer"
            >
                <ArrowLeft size={14} /> {t("common.leave")}
            </Button>
        </div>
    );
}
