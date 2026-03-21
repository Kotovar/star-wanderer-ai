import type { ResearchResource, ResearchResourceType } from "@/game/types";

export const RESEARCH_RESOURCES: Record<
    ResearchResourceType,
    ResearchResource
> = {
    ancient_data: {
        id: "ancient_data",
        name: "Древние данные",
        description: "Зашифрованная информация цивилизации Древних",
        icon: "📊",
        color: "#00d4ff",
        rarity: "uncommon",
    },
    rare_minerals: {
        id: "rare_minerals",
        name: "Редкие минералы",
        description: "Экзотические элементы с уникальными свойствами",
        icon: "💎",
        color: "#ff6b35",
        rarity: "common",
    },
    alien_biology: {
        id: "alien_biology",
        name: "Чужеродная биология",
        description: "Образцы инопланетной флоры и фауны",
        icon: "🧬",
        color: "#00ff41",
        rarity: "uncommon",
    },
    energy_samples: {
        id: "energy_samples",
        name: "Образцы энергии",
        description: "Концентрированные энергетические сигнатуры",
        icon: "⚡",
        color: "#ffb000",
        rarity: "rare",
    },
    quantum_crystals: {
        id: "quantum_crystals",
        name: "Квантовые кристаллы",
        description: "Кристаллы с квантовыми свойствами из аномалий",
        icon: "💠",
        color: "#9933ff",
        rarity: "legendary",
    },
    tech_salvage: {
        id: "tech_salvage",
        name: "Технологический лом",
        description: "Восстановленные компоненты вражеских технологий",
        icon: "🔧",
        color: "#ff00ff",
        rarity: "common",
    },
};
