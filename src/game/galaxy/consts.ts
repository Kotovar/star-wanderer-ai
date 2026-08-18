import type { FriendlyShipTypeId, StationName } from "../types";
import type { ContractType } from "../types/contracts";
import type { Profession } from "../types/crew";
import type { Goods } from "../types/goods";

type FriendlyShipQuestType = Extract<
    ContractType,
    "delivery" | "scan_planet" | "supply_run" | "expedition_survey"
>;

export const getSectorNameKey = (sectorIdx: number, tier: number): string =>
    `sector_names.sector_${String(sectorIdx + 1).padStart(2, "0")}_${tier}`;

type ShipType = {
    id: FriendlyShipTypeId;
    nameKey: string;
    greetingKey: string;
    legacyName: string;
    legacyGreeting: string;
    hasTrader: boolean;
    hasCrew: boolean;
    hasQuest: boolean;
    hasDistress?: boolean;
    crewChance?: number;
    questChance?: number;
    stockGoods?: Goods[];
    crewProfessions?: Profession[];
    questTypes?: FriendlyShipQuestType[];
};

export const FRIENDLY_SHIP_DISTRESS_REPUTATION = 2;

export const SHIP_TYPES: ShipType[] = [
    {
        id: "trader",
        nameKey: "friendly_ship.names.trader",
        greetingKey: "friendly_ship.greetings.trader",
        legacyName: "Странствующий Торговец",
        legacyGreeting: "Торговец приветствует вас. У него есть редкие товары.",
        hasTrader: true,
        hasCrew: false,
        hasQuest: false,
        stockGoods: ["water", "food", "medicine"],
    },
    {
        id: "mercenary",
        nameKey: "friendly_ship.names.mercenary",
        greetingKey: "friendly_ship.greetings.mercenary",
        legacyName: "Корабль Наёмников",
        legacyGreeting: "Опытные наёмники предлагают свои услуги.",
        hasTrader: false,
        hasCrew: true,
        hasQuest: false,
        crewProfessions: ["gunner", "engineer"],
    },
    {
        id: "courier",
        nameKey: "friendly_ship.names.courier",
        greetingKey: "friendly_ship.greetings.courier",
        legacyName: "Курьерский Фрегат",
        legacyGreeting:
            "Капитан фрегата ищет надёжного партнёра для срочной доставки.",
        hasTrader: false,
        hasCrew: false,
        hasQuest: true,
        questTypes: ["delivery"],
    },
    {
        id: "barge",
        nameKey: "friendly_ship.names.barge",
        greetingKey: "friendly_ship.greetings.barge",
        legacyName: "Торговая Баржа",
        legacyGreeting:
            "Массивная баржа дрейфует в космосе. Экипаж готов торговать.",
        hasTrader: true,
        hasCrew: false,
        hasQuest: true,
        crewChance: 0.5,
        stockGoods: ["water", "food", "minerals", "spares"],
        questTypes: ["supply_run"],
    },
    {
        id: "probe",
        nameKey: "friendly_ship.names.probe",
        greetingKey: "friendly_ship.greetings.probe",
        legacyName: "Разведывательный Зонд",
        legacyGreeting:
            "Автоматизированный зонд предлагает обмен данными на ресурсы.",
        hasTrader: true,
        hasCrew: false,
        hasQuest: false,
        questChance: 0.4,
        stockGoods: ["electronics", "rare_minerals"],
        questTypes: ["scan_planet"],
    },
    {
        id: "explorer",
        nameKey: "friendly_ship.names.explorer",
        greetingKey: "friendly_ship.greetings.explorer",
        legacyName: "Корабль Исследователей",
        legacyGreeting: "Учёные-исследователи ищут помощи в своей экспедиции.",
        hasTrader: false,
        hasCrew: true,
        hasQuest: true,
        crewProfessions: ["scout", "scientist"],
        questTypes: ["scan_planet", "expedition_survey"],
    },
    {
        id: "distress",
        nameKey: "friendly_ship.names.distress",
        greetingKey: "friendly_ship.greetings.distress",
        legacyName: "Аварийный Транспорт",
        legacyGreeting:
            "⚠️ СИГНАЛ БЕДСТВИЯ: Корабль получил критические повреждения и запрашивает помощь.",
        hasTrader: false,
        hasCrew: false,
        hasQuest: false,
        hasDistress: true,
    },
];

export const getFriendlyShipNameKey = (name: string): string | undefined =>
    SHIP_TYPES.find(
        (shipType) =>
            name === shipType.nameKey || name.endsWith(shipType.legacyName),
    )?.nameKey;

export const getFriendlyShipType = (
    type?: FriendlyShipTypeId,
): ShipType | undefined =>
    type ? SHIP_TYPES.find((shipType) => shipType.id === type) : undefined;

export const getFriendlyShipGreetingKey = (
    type?: FriendlyShipTypeId,
    greeting?: string,
): string | undefined =>
    (type
        ? getFriendlyShipType(type)
        : SHIP_TYPES.find(
              (shipType) =>
                  greeting === shipType.greetingKey ||
                  greeting === shipType.legacyGreeting,
          ))?.greetingKey;

export const STATION_TYPES: StationName[] = [
    "trade",
    "military",
    "research",
    "mining",
    "shipyard",
    "medical",
    "diplomatic",
    "pirate",
];
