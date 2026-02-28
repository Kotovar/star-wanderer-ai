import type { ModuleType, WeaponType } from "./modules";
import type { Profession } from "./crew";

export type StationName =
    | "Торговая"
    | "Военная"
    | "Исследовательская"
    | "Добывающая";

export type StationConfig = {
    cargoBonus?: number; // Множитель вместимости грузового отсека (1.5 = +50%)
    priceDiscount?: number; // Множитель цен на товары (0.85 = -15%)
    mineralDiscount?: number; // Скидка на покупку минералов
    rareMineralDiscount?: number; // Скидка на покупку редких минералов
    guaranteedProfessions?: Profession[]; // Профессии, которые гарантированно есть на станции
    guaranteedWeapons: WeaponType[]; // Типы оружия, которые гарантированно есть в продаже
    guaranteedModules: ModuleType[]; // Модули, которые гарантированно есть в продаже
};
