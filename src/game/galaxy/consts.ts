import { StationName } from "../types";

export const TIER_NAMES = [
    "Альфа",
    "Бета",
    "Гамма",
    "Дельта",
    "Эпсилон",
    "Дзета",
    "Эта",
    "Тета",
    "Йота",
    "Каппа",
    "Лямбда",
    "Мю",
    "Ню",
    "Кси",
    "Омикрон",
];

type ShipType = {
    name: string;
    greeting: string;
    hasTrader: boolean;
    hasCrew: boolean;
    hasQuest: boolean;
};

export const SHIP_TYPES: ShipType[] = [
    {
        name: "Странствующий Торговец",
        greeting: "Торговец приветствует вас. У него есть редкие товары.",
        hasTrader: true,
        hasCrew: false,
        hasQuest: false,
    },
    {
        name: "Корабль Наёмников",
        greeting: "Опытные наёмники предлагают свои услуги.",
        hasTrader: false,
        hasCrew: true,
        hasQuest: false,
    },
    {
        name: "Курьерский Фрегат",
        greeting:
            "Капитан фрегата ищет надёжного партнёра для срочной доставки.",
        hasTrader: false,
        hasCrew: false,
        hasQuest: true,
    },
    {
        name: "Торговая Баржа",
        greeting: "Массивная баржа дрейфует в космосе. Экипаж готов торговать.",
        hasTrader: true,
        hasCrew: Math.random() < 0.5,
        hasQuest: false,
    },
    {
        name: "Разведывательный Зонд",
        greeting:
            "Автоматизированный зонд предлагает обмен данными на ресурсы.",
        hasTrader: true,
        hasCrew: false,
        hasQuest: Math.random() < 0.4,
    },
    {
        name: "Корабль Исследователей",
        greeting: "Учёные-исследователи ищут помощи в своей экспедиции.",
        hasTrader: false,
        hasCrew: true,
        hasQuest: true,
    },
];

export const STATION_TYPES: StationName[] = [
    "Торговая",
    "Военная",
    "Исследовательская",
    "Добывающая",
];
