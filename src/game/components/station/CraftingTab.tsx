"use client";

import { useGameStore } from "@/game/store";
import { CRAFTING_RECIPES } from "@/game/constants/crafting";
import { WEAPON_TYPES } from "@/game/constants/weapons";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";

export function CraftingTab() {
    const { t } = useTranslation();
    const research = useGameStore((s) => s.research);
    const credits = useGameStore((s) => s.credits);
    const craftWeapon = useGameStore((s) => s.craftWeapon);
    const unlockedRecipes = research.unlockedRecipes ?? [];

    if (unlockedRecipes.length === 0) {
        return (
            <div className="text-[#888] text-sm p-4 border border-[#333] bg-[rgba(0,0,0,0.3)]">
                <div className="text-[#00ff41] font-bold mb-2">
                    {t("crafting.title")}
                </div>
                <p>{t("crafting.no_recipes")}</p>
                <p className="mt-2">{t("crafting.no_recipes_hint")}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 pb-8">
            <div className="text-[#00ff41] font-['Orbitron'] font-bold text-base">
                {t("crafting.title")}
            </div>

            {unlockedRecipes.length > 0 && (
                <div className="flex flex-col gap-3">
                    <div className="text-[#888] text-xs uppercase tracking-wider">
                        {t("crafting.available_recipes")}
                    </div>
                    {unlockedRecipes.map((recipeId) => {
                        const recipe = CRAFTING_RECIPES[recipeId];
                        if (!recipe) return null;

                        const weaponDetails = WEAPON_TYPES[recipe.weaponType];
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
                                className="border border-[#333] bg-[rgba(0,0,0,0.3)] p-3"
                                style={{
                                    borderColor: canCraft ? "#00ff41" : "#444",
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

                                        {/* Resources */}
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
                                                        : {available}/{required}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => craftWeapon(recipeId)}
                                        disabled={!canCraft}
                                        className="bg-transparent border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] text-xs px-3 py-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                    >
                                        {t("crafting.craft_button")}
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
