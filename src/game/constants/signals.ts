import type { SignalDetails, SignalType } from "@/game/types";

// Distress signal outcomes
export const DISTRESS_SIGNAL_OUTCOMES: Record<SignalType, SignalDetails> = {
    pirate_ambush: {
        name: "Засада пиратов",
        description: "Это ловушка! Пираты притворялись терпящими бедствие.",
        chance: 0.35, // 35% chance
    },
    survivors: {
        name: "Выжившие",
        description: "На борту настоящие выжившие, нуждающиеся в помощи.",
        chance: 0.3, // 30% chance
    },
    abandoned_cargo: {
        name: "Заброшенный груз",
        description: "Корабль покинут, но груз остался нетронутым.",
        chance: 0.35, // 35% chance
    },
};
