import type { ModuleType, WeaponType } from "./modules";
import type { Profession } from "./crew";

export type StationName =
    | "trade"
    | "military"
    | "research"
    | "mining"
    | "shipyard"
    | "medical";

export type StationConfig = {
    cargoBonus?: number; // Множитель вместимости грузового отсека (1.5 = +50%)
    priceDiscount?: number; // Множитель цен на товары (0.85 = -15%)
    mineralDiscount?: number; // Скидка на покупку минералов
    rareMineralDiscount?: number; // Скидка на покупку редких минералов
    guaranteedProfessions?: Profession[]; // Профессии, которые гарантированно есть на станции
    guaranteedWeapons: WeaponType[]; // Типы оружия, которые гарантированно есть в продаже
    guaranteedModules: ModuleType[]; // Модули, которые гарантированно есть в продаже
    // Service availability flags
    allowsTrade: boolean; // Торговля товарами (магазин)
    allowsCraft: boolean; // Крафт
    allowsModuleInstall: boolean; // Установка модулей и оружия
    allowsCrewHeal: boolean; // Лечение экипажа
};
