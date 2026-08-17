"use client";

import { useState } from "react";
import { useGameStore } from "@/game/store";
import {
  CRAFTING_RECIPES,
  HYBRID_MODULE_SHOP_ITEMS,
  MODULE_RECIPES,
} from "@/game/constants/crafting";
import { WEAPON_TYPES } from "@/game/constants/weapons";
import { useTranslation } from "@/lib/useTranslation";
import {
  getModuleRecipeName,
  getWeaponTypeName,
} from "@/lib/translationHelpers";
import type { CraftingRecipe, ModuleRecipe } from "@/game/types";

type ExpandedId = string | null;

function RecipeRequirements({
  resources,
  gases,
  credits,
  t,
}: {
  resources: Record<string, number>;
  /** Газ из трюма: у него свой словарь имён, не blueprints.resources */
  gases?: Record<string, number | undefined>;
  credits: number;
  t: (key: string) => string;
}) {
  return (
    <div className="border-t border-[#1a1a1a] pt-2">
      <div className="text-[#444] text-[9px] uppercase tracking-wider mb-1">
        {t("blueprints.details_requires")}
      </div>
      <div className="flex flex-wrap gap-x-2 gap-y-0.5">
        {Object.entries(resources).map(([key, qty]) => (
          <span key={key} className="text-[#aaa] text-[10px]">
            {t(`blueprints.resources.${key}`)}{" "}
            <span className="text-[#ffb000] font-bold">×{qty}</span>
          </span>
        ))}
        {Object.entries(gases ?? {}).map(([key, qty]) => (
          <span key={key} className="text-[#aaa] text-[10px]">
            {t(`gases.${key}.name`)}{" "}
            <span className="text-[#00d4ff] font-bold">×{qty}</span>
          </span>
        ))}
        <span className="text-[#ffb000] font-bold text-[10px]">
          {credits}₢
        </span>
      </div>
    </div>
  );
}

function WeaponPreview({
  recipe,
  t,
}: {
  recipe: CraftingRecipe;
  t: (key: string) => string;
}) {
  const weaponDetails = WEAPON_TYPES[recipe.weaponType];
  const color = weaponDetails?.color ?? "#fff";

  return (
    <div
      className="mt-1 border bg-[rgba(0,0,0,0.4)] p-2"
      style={{ borderColor: `${color}55` }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 mb-2 border-b border-[#1a1a1a]">
        <span className="text-2xl leading-none" style={{ color }}>
          {recipe.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[11px] truncate" style={{ color }}>
            {getWeaponTypeName(recipe.weaponType, t, recipe.name)}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[#ff4444] font-bold text-base leading-none">
            {weaponDetails?.damage}
          </div>
          <div className="text-[#555] text-[9px]">{t("weapon_info.damage")}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-col gap-0.5 text-[10px] mb-2">
        {weaponDetails?.shieldBonus && (
          <div className="flex justify-between gap-2">
            <span className="text-[#555]">{t("crafting.stat_shield_damage")}</span>
            <span className="text-[#4488ff] font-bold">
              ×{weaponDetails.shieldBonus}
            </span>
          </div>
        )}
        {weaponDetails?.armorPenetration && (
          <div className="flex justify-between gap-2">
            <span className="text-[#555]">{t("crafting.stat_armor_penetration")}</span>
            <span className="text-[#ffb000] font-bold">
              {weaponDetails.armorPenetration * 100}%
            </span>
          </div>
        )}
        {weaponDetails?.shieldBypass && (
          <div className="flex justify-between gap-2">
            <span className="text-[#555]">{t("combat.shields")}</span>
            <span className="text-[#00ff41] font-bold">{t("crafting.ignores")}</span>
          </div>
        )}
        {weaponDetails?.interceptChance && (
          <div className="flex justify-between gap-2">
            <span className="text-[#555]">{t("crafting.stat_intercept_risk")}</span>
            <span className="text-[#ff6666] font-bold">
              {weaponDetails.interceptChance * 100}%
            </span>
          </div>
        )}
      </div>

      <RecipeRequirements
        resources={recipe.resources}
        credits={recipe.credits}
        t={t}
      />

      <div className="text-[#00ff41] text-[9px] mt-2">
        🏭 {t("blueprints.details_shipyard")}
      </div>
    </div>
  );
}

function ModulePreview({
  recipe,
  t,
}: {
  recipe: ModuleRecipe;
  t: (key: string) => string;
}) {
  const shopItem = HYBRID_MODULE_SHOP_ITEMS[recipe.id];

  return (
    <div className="mt-1 border border-[#00d4ff44] bg-[rgba(0,0,0,0.4)] p-2">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 mb-2 border-b border-[#1a1a1a]">
        <span className="text-2xl leading-none">{recipe.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[11px] text-[#00d4ff] truncate">
            {getModuleRecipeName(recipe.id, t, recipe.name)}
          </div>
          <div className="text-[#555] text-[9px] uppercase tracking-wider">
            {t("crafting.hybrid_module")}
          </div>
        </div>
        {shopItem && (
          <div className="shrink-0 flex flex-col items-center gap-0.5">
            {Array.from({ length: shopItem.height ?? 2 }).map((_, row) => (
              <div key={row} className="flex gap-0.5">
                {Array.from({ length: shopItem.width ?? 2 }).map((__, col) => (
                  <div
                    key={col}
                    className="w-3 h-3 border border-[#00d4ff66] bg-[rgba(0,212,255,0.2)]"
                  />
                ))}
              </div>
            ))}
            <div className="text-[#555] text-[8px]">
              {shopItem.width}×{shopItem.height}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {shopItem && (
        <div className="flex flex-col gap-0.5 text-[10px] mb-2">
          {shopItem.researchOutput && (
            <div className="flex justify-between gap-2">
              <span className="text-[#555]">{t("crafting.stat_research")}</span>
              <span className="text-[#a855f7] font-bold">
                +{shopItem.researchOutput}{t("crafting.per_turn")}
              </span>
            </div>
          )}
          {shopItem.healing && (
            <div className="flex justify-between gap-2">
              <span className="text-[#555]">{t("crafting.stat_healing")}</span>
              <span className="text-[#00ff41] font-bold">
                +{shopItem.healing} HP{t("crafting.per_turn")}
              </span>
            </div>
          )}
          {shopItem.power && (
            <div className="flex justify-between gap-2">
              <span className="text-[#555]">{t("crafting.stat_power")}</span>
              <span className="text-[#ffb000] font-bold">+{shopItem.power}</span>
            </div>
          )}
          {shopItem.capacity && (
            <div className="flex justify-between gap-2">
              <span className="text-[#555]">{t("crafting.stat_crew")}</span>
              <span className="text-[#00d4ff] font-bold">
                +{shopItem.capacity} {t("crafting.crew_slots")}
              </span>
            </div>
          )}
          {shopItem.scanRange && (
            <div className="flex justify-between gap-2">
              <span className="text-[#555]">{t("crafting.stat_scan")}</span>
              <span className="text-[#00d4ff] font-bold">+{shopItem.scanRange}</span>
            </div>
          )}
          {shopItem.fuelEfficiency && (
            <div className="flex justify-between gap-2">
              <span className="text-[#555]">{t("crafting.stat_fuel")}</span>
              <span className="text-[#ffaa00] font-bold">
                -{Math.round((1 - shopItem.fuelEfficiency / 10) * 100)}%
              </span>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <span className="text-[#555]">{t("crafting.stat_health")}</span>
            <span className="text-[#666] font-bold">{shopItem.maxHealth} HP</span>
          </div>
        </div>
      )}

      <RecipeRequirements
        resources={recipe.goods}
        gases={recipe.gases}
        credits={recipe.credits}
        t={t}
      />

      <div className="text-[#00ff41] text-[9px] mt-2">
        🏭 {t("blueprints.details_shipyard")}
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
            {t("blueprints.section_weapons")} ({unlockedRecipes.length})
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
                  <span style={{ color: weaponDetails?.color ?? "#fff" }}>
                    {recipe.icon}
                  </span>
                  <div className="flex-1">
                    <div
                      className="font-bold"
                      style={{ color: weaponDetails?.color ?? "#fff" }}
                    >
                      {getWeaponTypeName(recipe.weaponType, t, recipe.name)}
                    </div>
                    <div className="text-[#555] text-[10px]">
                      {t("blueprints.craft_hint")} · {recipe.credits}₢
                    </div>
                  </div>
                  <span className="text-[#444] text-[10px]">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </button>
                {isExpanded && <WeaponPreview recipe={recipe} t={t} />}
              </div>
            );
          })}
        </div>
      )}

      {/* Module blueprints (one-time) */}
      {moduleRecipes.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-[#888] text-xs uppercase tracking-wider border-b border-[#222] pb-1">
            {t("blueprints.section_modules")} ({moduleRecipes.length})
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
                      {getModuleRecipeName(recipe.id, t, recipe.name)}
                    </div>
                    <div className="text-[#555] text-[10px]">
                      {t("blueprints.craft_hint")} · {recipe.credits}₢ ·{" "}
                      {t("blueprints.one_time")}
                    </div>
                  </div>
                  <span className="text-[#ffb000] text-[10px]">
                    {isExpanded ? "▲" : "●"}
                  </span>
                </button>
                {isExpanded && <ModulePreview recipe={recipe} t={t} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
