import type { TechnologyId, ResearchResourceType } from "./research";
import type { WeaponType, HybridModuleType } from "./modules";
import type { Goods } from "./goods";
import type { GasType } from "./outposts";

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
    "kinetic" | "laser" | "missile" | "siege_torpedo"
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
    /**
     * Газ из трюма. Гибриды собираются на синтез-полимерах: без них рецепт
     * был чистым «заплати кредиты», а сам газ — товаром с описанием про
     * сборку модулей, которого код не знал.
     */
    gases?: Partial<Record<GasType, number>>;
    credits: number;
}
