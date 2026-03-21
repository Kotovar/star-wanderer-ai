import type { CraftingRecipe, CraftingWeapon } from "@/game/types";

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
        description: "×4 урона по щитам, не повреждает корпус — снимает щиты мгновенно",
    },
};
