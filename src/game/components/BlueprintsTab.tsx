"use client";

import { useState } from "react";
import { useGameStore } from "@/game/store";
import { CRAFTING_RECIPES, MODULE_RECIPES } from "@/game/constants/crafting";
import { WEAPON_TYPES } from "@/game/constants/weapons";
import { useTranslation } from "@/lib/useTranslation";

type ExpandedId = string | null;

function ResourceList({
  resources,
  t,
}: {
  resources: Record<string, number>;
  t: (key: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {Object.entries(resources).map(([key, qty]) => (
        <span key={key} className="text-[#aaa]">
          {t(`blueprints.resources.${key}`)}{" "}
          <span className="text-[#ffb000] font-bold">×{qty}</span>
        </span>
      ))}
    </div>
  );
}

function DetailsPanel({
  description,
  resources,
  credits,
  t,
}: {
  description: string;
  resources: Record<string, number>;
  credits: number;
  t: (key: string) => string;
}) {
  return (
    <div className="mt-1 ml-6 flex flex-col gap-1 text-[10px] border-l border-[#333] pl-2">
      <div>
        <span className="text-[#555] uppercase tracking-wider">
          {t("blueprints.details_effects")}:{" "}
        </span>
        <span className="text-[#bbb]">{description}</span>
      </div>
      <div>
        <span className="text-[#555] uppercase tracking-wider">
          {t("blueprints.details_requires")}:{" "}
        </span>
        <ResourceList resources={resources} t={t} />
        <span className="text-[#aaa] ml-1">
          ·{" "}
          <span className="text-[#ffb000] font-bold">{credits}₢</span>
        </span>
      </div>
      <div>
        <span className="text-[#555] uppercase tracking-wider">
          {t("blueprints.details_where")}:{" "}
        </span>
        <span className="text-[#00ff41]">
          🏭 {t("blueprints.details_shipyard")}
        </span>
      </div>
    </div>
  );
}

export function BlueprintsTab() {
  const { t } = useTranslation();
  const unlockedRecipes = useGameStore(
    (s) => s.research.unlockedRecipes ?? [],
  );
  const moduleRecipes = useGameStore((s) => s.moduleRecipes);
  const [expandedId, setExpandedId] = useState<ExpandedId>(null);

  const hasAnything = unlockedRecipes.length > 0 || moduleRecipes.length > 0;

  const toggle = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="flex flex-col gap-3 pb-2">
      {!hasAnything && (
        <div className="text-[#555] text-xs p-3 border border-[#222]">
          <div className="mb-1">{t("blueprints.no_blueprints")}</div>
          <div className="text-[#444]">
            {t("blueprints.no_blueprints_weapons")}
          </div>
          <div className="text-[#444]">
            {t("blueprints.no_blueprints_modules")}
          </div>
        </div>
      )}

      {/* Weapon blueprints */}
      {unlockedRecipes.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-[#888] text-xs uppercase tracking-wider border-b border-[#222] pb-1">
            {t("blueprints.section_weapons")} (
            {unlockedRecipes.length})
          </div>
          {unlockedRecipes.map((recipeId) => {
            const recipe = CRAFTING_RECIPES[recipeId];
            if (!recipe) return null;
            const weaponDetails = WEAPON_TYPES[recipe.weaponType];
            const isExpanded = expandedId === recipeId;
            return (
              <div key={recipeId}>
                <button
                  type="button"
                  className="flex items-center gap-2 p-2 border border-[#222] bg-[rgba(0,0,0,0.2)] text-xs cursor-pointer hover:border-[#333] hover:bg-[rgba(255,255,255,0.02)] transition-colors w-full text-left"
                  onClick={() => toggle(recipeId)}
                >
                  <span
                    style={{
                      color:
                        weaponDetails?.color ?? "#fff",
                    }}
                  >
                    {recipe.icon}
                  </span>
                  <div className="flex-1">
                    <div
                      className="font-bold"
                      style={{
                        color:
                          weaponDetails?.color ??
                          "#fff",
                      }}
                    >
                      {recipe.name}
                    </div>
                    <div className="text-[#555] text-[10px]">
                      {t("blueprints.craft_hint")} ·{" "}
                      {recipe.credits}₢
                    </div>
                  </div>
                  <span className="text-[#444] text-[10px]">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </button>
                {isExpanded && (
                  <DetailsPanel
                    description={recipe.description}
                    resources={recipe.resources}
                    credits={recipe.credits}
                    t={t}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Module blueprints (one-time) */}
      {moduleRecipes.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-[#888] text-xs uppercase tracking-wider border-b border-[#222] pb-1">
            {t("blueprints.section_modules")} (
            {moduleRecipes.length})
          </div>
          {moduleRecipes.map((recipeId) => {
            const recipe = MODULE_RECIPES[recipeId];
            if (!recipe) return null;
            const isExpanded = expandedId === recipeId;
            return (
              <div key={recipeId}>
                <button
                  type="button"
                  className="flex items-center gap-2 p-2 border border-[#00d4ff33] bg-[rgba(0,212,255,0.03)] text-xs cursor-pointer hover:border-[#00d4ff55] hover:bg-[rgba(0,212,255,0.06)] transition-colors w-full text-left"
                  onClick={() => toggle(recipeId)}
                >
                  <span>{recipe.icon}</span>
                  <div className="flex-1">
                    <div className="font-bold text-[#00d4ff]">
                      {recipe.name}
                    </div>
                    <div className="text-[#555] text-[10px]">
                      {t("blueprints.craft_hint")} ·{" "}
                      {recipe.credits}₢ ·{" "}
                      {t("blueprints.one_time")}
                    </div>
                  </div>
                  <span className="text-[#ffb000] text-[10px]">
                    {isExpanded ? "▲" : "●"}
                  </span>
                </button>
                {isExpanded && (
                  <DetailsPanel
                    description={recipe.description}
                    resources={recipe.goods}
                    credits={recipe.credits}
                    t={t}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
