import type {
  CraftingRecipe,
  CraftingWeapon,
  ModuleRecipe,
  ModuleRecipeId,
} from "@/game/types";
import type { ShopItem } from "@/game/types/shops";

export const CRAFTING_RECIPES: Record<CraftingWeapon, CraftingRecipe> = {
  plasma: {
    id: "plasma",
    name: "Плазменное орудие",
    icon: "◉",
    weaponType: "plasma",
    resources: { energy_samples: 5, tech_salvage: 8 },
    credits: 600,
    unlockedBy: "plasma_weapons",
    description: "Пробивает 25% брони и наносит +30% урона по щитам",
  },
  drones: {
    id: "drones",
    name: "Боевые дроны",
    icon: "⬡",
    weaponType: "drones",
    resources: { tech_salvage: 8, rare_minerals: 5 },
    credits: 500,
    unlockedBy: "combat_drones",
    description: "Атакует дважды за выстрел — двойной шанс попасть",
  },
  antimatter: {
    id: "antimatter",
    name: "Антиматериальное орудие",
    icon: "◈",
    weaponType: "antimatter",
    resources: { energy_samples: 12, quantum_crystals: 2, tech_salvage: 8 },
    credits: 1200,
    unlockedBy: "antimatter_weapons",
    description: "×2.5 урона по щитам — сокрушает защиту противника",
  },
  quantum_torpedo: {
    id: "quantum_torpedo",
    name: "Квантовая торпеда",
    icon: "◇",
    weaponType: "quantum_torpedo",
    resources: {
      quantum_crystals: 3,
      tech_salvage: 10,
      energy_samples: 10,
    },
    credits: 1600,
    unlockedBy: "quantum_torpedo",
    description:
      "Полностью игнорирует щиты, наносит урон напрямую по модулям",
  },
  ion_cannon: {
    id: "ion_cannon",
    name: "Ионная пушка",
    icon: "⚡",
    weaponType: "ion_cannon",
    resources: {
      energy_samples: 8,
      tech_salvage: 6,
    },
    credits: 700,
    unlockedBy: "ion_cannon",
    description:
      "×4 урона по щитам, не повреждает корпус — снимает щиты мгновенно",
  },
};

// One-time module recipes found by Scout at derelict ships
export const MODULE_RECIPES: Record<ModuleRecipeId, ModuleRecipe> = {
  bio_research_lab: {
    id: "bio_research_lab",
    name: "Биоисследовательская лаборатория",
    icon: "🧬",
    description:
      "Работает как медотсек и лаборатория одновременно: +10 науки/ход, +8 HP лечения/ход",
    goods: { electronics: 4, rare_minerals: 3 },
    credits: 800,
  },
  pulse_drive: {
    id: "pulse_drive",
    name: "Пульс-ускоритель",
    icon: "⚡",
    description:
      "Реактор и двигатель в одном: +5 энергии, меньше расход топлива",
    goods: { spares: 5, rare_minerals: 3 },
    credits: 900,
  },
  habitat_module: {
    id: "habitat_module",
    name: "Медицинский корпус",
    icon: "🏥",
    description:
      "Медотсек с жилыми каютами: +8 HP лечения/ход, +6 мест экипажа",
    goods: { spares: 4, electronics: 3 },
    credits: 700,
  },
  deep_survey_array: {
    id: "deep_survey_array",
    name: "Массив глубинного сканирования",
    icon: "🔭",
    description:
      "Лаборатория со сканером: +8 науки/ход, +3 к дальности сканирования",
    goods: { electronics: 5, rare_minerals: 2 },
    credits: 850,
  },
};

// ShopItem templates for crafted hybrid modules (added to cargo on craft)
export const HYBRID_MODULE_SHOP_ITEMS: Record<ModuleRecipeId, ShopItem> = {
  bio_research_lab: {
    id: "bio-research-lab",
    name: "★ Биоисследовательская лаборатория",
    type: "module",
    moduleType: "bio_research_lab",
    level: 3,
    maxHealth: 150,
    width: 2,
    height: 2,
    consumption: 4,
    researchOutput: 10,
    healing: 8,
    price: 0,
    stock: 1,
    description: "Гибридный модуль: лечение и исследования одновременно",
  },
  pulse_drive: {
    id: "pulse-drive",
    name: "★ Пульс-ускоритель",
    type: "module",
    moduleType: "pulse_drive",
    level: 3,
    maxHealth: 150,
    width: 2,
    height: 2,
    power: 5,
    fuelEfficiency: 6,
    price: 0,
    stock: 1,
    description:
      "Гибридный модуль: мощность реактора + топливная эффективность",
  },
  habitat_module: {
    id: "habitat-module",
    name: "★ Медицинский корпус",
    type: "module",
    moduleType: "habitat_module",
    level: 3,
    maxHealth: 150,
    width: 2,
    height: 2,
    consumption: 3,
    healing: 8,
    capacity: 6,
    price: 0,
    stock: 1,
    description: "Гибридный модуль: лечение + вместимость экипажа",
  },
  deep_survey_array: {
    id: "deep-survey-array",
    name: "★ Массив глубинного сканирования",
    type: "module",
    moduleType: "deep_survey_array",
    level: 3,
    maxHealth: 150,
    width: 2,
    height: 2,
    consumption: 4,
    researchOutput: 8,
    scanRange: 3,
    price: 0,
    stock: 1,
    description: "Гибридный модуль: исследования + дальность сканирования",
  },
};
