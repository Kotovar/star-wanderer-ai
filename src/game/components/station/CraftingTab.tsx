"use client";

import { useState } from "react";
import { useGameStore } from "@/game/store";
import { CRAFTING_RECIPES, MODULE_RECIPES } from "@/game/constants/crafting";
import { TRADE_GOODS } from "@/game/constants/goods";
import { WEAPON_TYPES } from "@/game/constants/weapons";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";

export function CraftingTab() {
    const { t } = useTranslation();
    const research = useGameStore((s) => s.research);
    const credits = useGameStore((s) => s.credits);
    const tradeGoods = useGameStore((s) => s.ship.tradeGoods);
    const moduleRecipes = useGameStore((s) => s.moduleRecipes);
    const craftWeapon = useGameStore((s) => s.craftWeapon);
    const craftModule = useGameStore((s) => s.craftModule);
    const unlockedRecipes = research.unlockedRecipes ?? [];

    const [activeTab, setActiveTab] = useState<"weapons" | "modules">(
        "weapons",
    );

    const hasWeaponRecipes = unlockedRecipes.length > 0;
    const hasModuleRecipes = moduleRecipes.length > 0;

    if (!hasWeaponRecipes && !hasModuleRecipes) {
        return (
            <div className="text-[#888] text-sm p-4 border border-[#333] bg-[rgba(0,0,0,0.3)]">
                <div className="text-[#00ff41] font-bold mb-2">
                    {t("crafting.title")}
                </div>
                <p>{t("crafting.no_recipes")}</p>
                <p className="mt-2">{t("crafting.no_recipes_hint")}</p>
                <p className="mt-2 text-[#555]">
                    {t("crafting.no_recipes_modules_hint")}
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto pb-2">
            <div className="text-[#00ff41] font-['Orbitron'] font-bold text-base">
                {t("crafting.title")}
            </div>

            {/* Tabs */}
            <div className="flex gap-1">
                <button
                    onClick={() => setActiveTab("weapons")}
                    className={`cursor-pointer px-3 py-1 text-xs uppercase border transition-colors ${
                        activeTab === "weapons"
                            ? "border-[#00ff41] bg-[rgba(0,255,65,0.15)] text-[#00ff41]"
                            : "border-[#333] text-[#555] hover:border-[#555]"
                    }`}
                >
                    {t("crafting.tab_weapons")}{" "}
                    {hasWeaponRecipes && `(${unlockedRecipes.length})`}
                </button>
                <button
                    onClick={() => setActiveTab("modules")}
                    className={`cursor-pointer px-3 py-1 text-xs uppercase border transition-colors ${
                        activeTab === "modules"
                            ? "border-[#00d4ff] bg-[rgba(0,212,255,0.15)] text-[#00d4ff]"
                            : "border-[#333] text-[#555] hover:border-[#555]"
                    }`}
                >
                    {t("crafting.tab_modules")}{" "}
                    {hasModuleRecipes && (
                        <span className="text-[#ffb000]">
                            ({moduleRecipes.length})
                        </span>
                    )}
                </button>
            </div>

            {/* Weapon recipes */}
            {activeTab === "weapons" && (
                <div className="flex flex-col gap-3">
                    {unlockedRecipes.length === 0 ? (
                        <div className="text-[#555] text-xs p-3 border border-[#222]">
                            {t("crafting.no_weapon_recipes")}
                        </div>
                    ) : (
                        unlockedRecipes.map((recipeId) => {
                            const recipe = CRAFTING_RECIPES[recipeId];
                            if (!recipe) return null;

                            const weaponDetails =
                                WEAPON_TYPES[recipe.weaponType];
                            const hasEnoughCredits = credits >= recipe.credits;
                            const resourcesMet = Object.entries(
                                recipe.resources,
                            ).every(([resType, required]) => {
                                const available =
                                    research.resources[
                                        resType as keyof typeof research.resources
                                    ] ?? 0;
                                return available >= (required ?? 0);
                            });
                            const canCraft = hasEnoughCredits && resourcesMet;

                            return (
                                <div
                                    key={recipeId}
                                    className="border bg-[rgba(0,0,0,0.3)] p-3"
                                    style={{
                                        borderColor: canCraft
                                            ? "#00ff41"
                                            : "#444",
                                    }}
                                >
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span
                                                    style={{
                                                        color:
                                                            weaponDetails?.color ??
                                                            "#fff",
                                                    }}
                                                >
                                                    {recipe.icon}
                                                </span>
                                                <span
                                                    className="font-bold text-sm"
                                                    style={{
                                                        color:
                                                            weaponDetails?.color ??
                                                            "#fff",
                                                    }}
                                                >
                                                    {recipe.name}
                                                </span>
                                                <span className="text-[#888] text-xs">
                                                    {weaponDetails &&
                                                        `${weaponDetails.damage} ${t("crafting.damage_suffix")}`}
                                                </span>
                                            </div>
                                            <div className="text-[#aaa] text-xs mb-2">
                                                {recipe.description}
                                            </div>
                                            <div className="flex flex-wrap gap-2 text-xs">
                                                <span
                                                    className={
                                                        hasEnoughCredits
                                                            ? "text-[#ffb000]"
                                                            : "text-red-400"
                                                    }
                                                >
                                                    💰 {recipe.credits}₢
                                                </span>
                                                {Object.entries(
                                                    recipe.resources,
                                                ).map(([resType, required]) => {
                                                    const available =
                                                        research.resources[
                                                            resType as keyof typeof research.resources
                                                        ] ?? 0;
                                                    const enough =
                                                        available >=
                                                        (required ?? 0);
                                                    return (
                                                        <span
                                                            key={resType}
                                                            className={
                                                                enough
                                                                    ? "text-[#00d4ff]"
                                                                    : "text-red-400"
                                                            }
                                                        >
                                                            {t(
                                                                `research.resources.${resType}.name`,
                                                            )}
                                                            : {available}/
                                                            {required}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() =>
                                                craftWeapon(recipeId)
                                            }
                                            disabled={!canCraft}
                                            className="bg-transparent border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] text-xs px-3 py-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                        >
                                            {t("crafting.craft_button")}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Module recipes */}
            {activeTab === "modules" && (
                <div className="flex flex-col gap-3">
                    {moduleRecipes.length === 0 ? (
                        <div className="text-[#555] text-xs p-3 border border-[#222]">
                            {t("crafting.no_module_recipes")}
                        </div>
                    ) : (
                        moduleRecipes.map((recipeId) => {
                            const recipe = MODULE_RECIPES[recipeId];
                            if (!recipe) return null;

                            const hasEnoughCredits = credits >= recipe.credits;
                            const goodsMet = Object.entries(recipe.goods).every(
                                ([goodId, required]) => {
                                    const available =
                                        tradeGoods.find(
                                            (g) => g.item === goodId,
                                        )?.quantity ?? 0;
                                    return available >= (required ?? 0);
                                },
                            );
                            const canCraft = hasEnoughCredits && goodsMet;

                            return (
                                <div
                                    key={recipeId}
                                    className="border bg-[rgba(0,0,0,0.3)] p-3"
                                    style={{
                                        borderColor: canCraft
                                            ? "#00d4ff"
                                            : "#444",
                                    }}
                                >
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span>{recipe.icon}</span>
                                                <span className="font-bold text-sm text-[#00d4ff]">
                                                    {recipe.name}
                                                </span>
                                                <span className="text-[10px] text-[#888] bg-[rgba(255,255,255,0.08)] px-1.5 py-0.5 rounded">
                                                    {t("crafting.one_time_use")}
                                                </span>
                                            </div>
                                            <div className="text-[#aaa] text-xs mb-2">
                                                {recipe.description}
                                            </div>
                                            <div className="flex flex-wrap gap-2 text-xs">
                                                <span
                                                    className={
                                                        hasEnoughCredits
                                                            ? "text-[#ffb000]"
                                                            : "text-red-400"
                                                    }
                                                >
                                                    💰 {recipe.credits}₢
                                                </span>
                                                {Object.entries(
                                                    recipe.goods,
                                                ).map(([goodId, required]) => {
                                                    const available =
                                                        tradeGoods.find(
                                                            (g) =>
                                                                g.item ===
                                                                goodId,
                                                        )?.quantity ?? 0;
                                                    const enough =
                                                        available >=
                                                        (required ?? 0);
                                                    const goodName =
                                                        TRADE_GOODS[
                                                            goodId as keyof typeof TRADE_GOODS
                                                        ]?.name ?? goodId;
                                                    return (
                                                        <span
                                                            key={goodId}
                                                            className={
                                                                enough
                                                                    ? "text-[#00d4ff]"
                                                                    : "text-red-400"
                                                            }
                                                        >
                                                            {goodName}:{" "}
                                                            {available}/
                                                            {required}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() =>
                                                craftModule(recipeId)
                                            }
                                            disabled={!canCraft}
                                            className="bg-transparent border border-[#00d4ff] text-[#00d4ff] hover:bg-[#00d4ff] hover:text-[#050810] text-xs px-3 py-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                        >
                                            {t("crafting.assemble_button")}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
