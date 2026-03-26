import type { TechnologyId, ResearchResourceType } from "./research";
import type { WeaponType, HybridModuleType } from "./modules";
import type { Goods } from "./goods";

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

// One-time module recipes found by Scout at derelict ships
export type ModuleRecipeId = HybridModuleType;

export interface ModuleRecipe {
    id: ModuleRecipeId;
    name: string;
    icon: string;
    description: string;
    goods: Partial<Record<Goods, number>>;
    credits: number;
}
