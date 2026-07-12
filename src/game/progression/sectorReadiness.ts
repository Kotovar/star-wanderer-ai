import type { GameState, Module } from "@/game/types";

const RECOMMENDED_RATING_BY_TIER = [0, 12, 22, 34, 48] as const;
const WARNING_RATIO = 0.8;

function getModuleRating(module: Module): number {
  if (module.health <= 0 || module.disabled || module.manualDisabled) return 0;

  const level = module.level ?? 1;
  const weight =
    module.type === "weaponbay"
      ? 4 + (module.weapons?.length ?? 0) * 2
      : module.type === "shield"
        ? 3
        : ["reactor", "cockpit", "engine"].includes(module.type)
          ? 2
          : 1;
  const healthRatio = Math.max(0.5, module.health / Math.max(1, module.maxHealth));
  return level * weight * healthRatio;
}

export function getSectorReadiness(
  state: Pick<GameState, "ship" | "crew">,
  tier: number,
): { rating: number; recommended: number; needsWarning: boolean } {
  const moduleRating = state.ship.modules.reduce(
    (total, module) => total + getModuleRating(module),
    0,
  );
  const crewRating = state.crew.reduce(
    (total, member) => total + (member.health > 0 ? (member.level ?? 1) : 0),
    0,
  );
  const rating = Math.round(moduleRating + crewRating);
  const recommended = RECOMMENDED_RATING_BY_TIER[Math.min(4, Math.max(1, tier))] ?? 48;

  return {
    rating,
    recommended,
    needsWarning: rating < recommended * WARNING_RATIO,
  };
}
