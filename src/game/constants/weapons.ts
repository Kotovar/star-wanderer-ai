import type { Weapon, WeaponDetails } from "@/game/types";

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
        description: "Высокий урон, пробивает 35% брони; перехватывается только активным ПВО",
        armorPenetration: 0.35,
    },
    plasma: {
        name: "Плазменное",
        damage: 30,
        color: "#ff6600",
        icon: "◉",
        description: "Наносит +30% урона по щитам и навсегда разрушает броню модуля с каждым попаданием",
        shieldBonus: 1.3,
    },
    drones: {
        name: "Боевые дроны",
        damage: 22,
        color: "#00ff41",
        icon: "⬡",
        description: "Базовый урон ниже, но каждое попадание даёт +10% к урону всех дронов (стакается до 10 раз = ×2 урон к концу боя)",
    },
    antimatter: {
        name: "Антиматерия",
        damage: 40,
        color: "#ff00ff",
        icon: "◈",
        description: "×2.5 урона по щитам",
        shieldBonus: 2.5,
    },
    siege_torpedo: {
        name: "Осадная торпеда",
        damage: 96,
        color: "#ff8844",
        icon: "◈",
        description: "Медленная тяжёлая торпеда: огромный урон, 50% базовая точность; ПВО перехватывает её особенно легко",
        armorPenetration: 0.5,
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
        description: "×4 урона по щитам, но всего 1 урон корпусу, когда щиты уже сняты — не ставьте им весь отсек, комбинируйте с оружием по корпусу",
        shieldBonus: 4.0,
        shieldOnly: true,
    },
};

export const WEAPON_ART: Record<Weapon["type"], string> = {
    kinetic: "/assets/weapons/kinetic.webp",
    laser: "/assets/weapons/laser.webp",
    missile: "/assets/weapons/missile.webp",
    plasma: "/assets/weapons/plasma.webp",
    drones: "/assets/weapons/drones.webp",
    antimatter: "/assets/weapons/antimatter.webp",
    siege_torpedo: "/assets/weapons/siege_torpedo.webp",
    quantum_torpedo: "/assets/weapons/quantum_torpedo.webp",
    ion_cannon: "/assets/weapons/ion_cannon.webp",
};
