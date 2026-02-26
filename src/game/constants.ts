import type { Weapon, WeaponDetails } from "./types";

// ═══════════════════════════════════════════════════════════════

export const WEAPON_TYPES: Record<Weapon["type"], WeaponDetails> = {
    kinetic: {
        name: "Кинетическое",
        damage: 15,
        color: "#888888",
        icon: "●",
        description: "Игнорирует 50% защиты врага",
        armorPenetration: 0.5,
    },
    laser: {
        name: "Лазерное",
        damage: 20,
        color: "#ff0000",
        icon: "◆",
        description: "Точное попадание, +20% к урону по щитам",
        shieldBonus: 1.2,
    },
    missile: {
        name: "Ракетное",
        damage: 25,
        color: "#ffaa00",
        icon: "▲",
        description: "Высокий урон, но 20% могут быть сбиты щитами",
        interceptChance: 0.2,
    },
};

export const TRADE_GOODS: Record<string, { name: string; basePrice: number }> =
    {
        water: { name: "Вода", basePrice: 50 },
        food: { name: "Продукты", basePrice: 80 },
        medicine: { name: "Медикаменты", basePrice: 150 },
        electronics: { name: "Электроника", basePrice: 200 },
        minerals: { name: "Минералы", basePrice: 100 },
        rare_minerals: { name: "Редкие минералы", basePrice: 500 },
    };

export const SECTOR_NAMES = ["Альфа", "Бета", "Гамма", "Дельта", "Эпсилон"];

export const ENEMY_TYPES = ["Пираты", "Рейдеры", "Наёмники", "Мародёры"];
