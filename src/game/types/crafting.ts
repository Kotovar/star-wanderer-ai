import type { TechnologyId, ResearchResourceType } from "./research";
import type { WeaponType } from "./modules";

export interface CraftingRecipe {
    id: CraftingRecipeId;
    name: string;
    icon: string;
    weaponType: WeaponType;
    resources: Partial<Record<ResearchResourceType, number>>;
    credits: number;
    unlockedBy: TechnologyId;
    description: string;
}

export type CraftingWeapon = Exclude<
    WeaponType,
    "kinetic" | "laser" | "missile"
>;

export type CraftingRecipeId = CraftingWeapon;
