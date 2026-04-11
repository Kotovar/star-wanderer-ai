import type { Weapon, WeaponDetails } from "@/game/types";

const interceptChance = 0.2;
const shieldBonus = 1.2;
const armorPenetration = 0.5;

export const WEAPON_TYPES: Record<Weapon["type"], WeaponDetails> = {
    kinetic: {
        name: "Кинетическое",
        damage: 18,
        color: "#888888",
        icon: "●",
        description: `Игнорирует ${armorPenetration * 100}% защиты врага`,
        armorPenetration,
    },
    laser: {
        name: "Лазерное",
        damage: 20,
        color: "#ff0000",
        icon: "◆",
        description: `Точное попадание, +${Math.round((shieldBonus - 1) * 100)}% к урону по щитам`,
        shieldBonus,
    },
    missile: {
        name: "Ракетное",
        damage: 28,
        color: "#ffaa00",
        icon: "▲",
        description: `Высокий урон, пробивает 35% брони, но ${interceptChance * 100}% могут быть сбиты щитами`,
        interceptChance: 0.1,
        armorPenetration: 0.35,
    },
    plasma: {
        name: "Плазменное",
        damage: 30,
        color: "#ff6600",
        icon: "◉",
        description: "Пробивает 25% брони и наносит +30% урона по щитам",
        armorPenetration: 0.25,
        shieldBonus: 1.3,
    },
    drones: {
        name: "Боевые дроны",
        damage: 22,
        color: "#00ff41",
        icon: "⬡",
        description: "Каждое попадание даёт +10% к урону (макс. 10 стаков = ×2)",
    },
    antimatter: {
        name: "Антиматерия",
        damage: 40,
        color: "#ff00ff",
        icon: "◈",
        description: "×2.5 урона по щитам",
        shieldBonus: 2.5,
    },
    quantum_torpedo: {
        name: "Квантовая торпеда",
        damage: 55,
        color: "#00d4ff",
        icon: "◇",
        description: "Полностью игнорирует щиты, атакует модули напрямую",
        shieldBypass: true,
    },
    ion_cannon: {
        name: "Ионная пушка",
        damage: 26,
        color: "#4488ff",
        icon: "⚡",
        description: "×4 урона по щитам, не наносит урон корпусу — идеально для сноса щитов",
        shieldBonus: 4.0,
        shieldOnly: true,
    },
};
