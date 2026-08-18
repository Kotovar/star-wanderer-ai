import type { ModuleType, WeaponType } from "./modules";
import type { Profession } from "./crew";

export type StationName =
    | "trade"
    | "military"
    | "research"
    | "mining"
    | "shipyard"
    | "medical"
    | "diplomatic"
    | "pirate";

export type StationConfig = {
    cargoBonus?: number; // Множитель вместимости грузового отсека (1.5 = +50%)
    priceDiscount?: number; // Множитель цен на обычные товары в торговле (0.85 = -15%). Влияет только на allowsTrade-станциях
    weaponDiscount?: number; // Множитель цены оружия в магазине станции (0.85 = -15%)
    moduleDiscount?: number; // Множитель цены модулей (без апгрейдов) в магазине станции (0.9 = -10%)
    mineralDiscount?: number; // Множитель цены покупки минералов игроком у станции (0.9 = -10%, trade)
    rareMineralDiscount?: number; // Множитель цены покупки редких минералов игроком у станции (trade)
    mineralSellBonus?: number; // Множитель цены продажи минералов игроком станции (1.2 = +20%, mining)
    rareMineralSellBonus?: number; // Множитель цены продажи редких минералов игроком станции (mining)
    guaranteedProfessions?: Profession[]; // Профессии, которые гарантированно есть на станции
    guaranteedWeapons: WeaponType[]; // Типы оружия, которые гарантированно есть в продаже
    guaranteedModules: ModuleType[]; // Модули, которые гарантированно есть в продаже
    // Service availability flags
    allowsTrade: boolean; // Торговля товарами (магазин)
    allowsCraft: boolean; // Крафт
    allowsWeaponCraft?: boolean; // Крафт оружия
    allowsModuleCraft?: boolean; // Сборка модулей
    allowsModuleInstall: boolean; // Установка модулей
    allowsWeaponInstall?: boolean; // Установка оружия
    allowsCrewHeal: boolean; // Лечение экипажа
    isPirate?: boolean; // Пиратская станция (чёрный рынок, контракты, риск засады)
};
