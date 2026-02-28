import type { Weapon, WeaponDetails } from "@/game/types";

const interceptChance = 0.2;
const shieldBonus = 1.2;
const armorPenetration = 0.5;

export const WEAPON_TYPES: Record<Weapon["type"], WeaponDetails> = {
    kinetic: {
        name: "Кинетическое",
        damage: 15,
        color: "#888888",
        icon: "●",
        description: `Игнорирует ${armorPenetration * 100}% защиты врага`,
        armorPenetration: 0.5,
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
        damage: 25,
        color: "#ffaa00",
        icon: "▲",
        description: `Высокий урон, но ${interceptChance * 100}% могут быть сбиты щитами`,
        interceptChance,
    },
};
