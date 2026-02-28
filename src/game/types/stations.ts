import type { ModuleType } from "./modules";

export type StationName =
    | "Торговая"
    | "Военная"
    | "Исследовательская"
    | "Добывающая";

export type StationConfig = {
    cargoBonus?: number; // Множитель груза на станции (1.5 = +50%)
    priceDiscount?: number; // Множитель цен (0.85 = -15%)
    mineralDiscount?: number; // Скидка на минералы
    rareMineralDiscount?: number; // Скидка на редкие минералы
    hasScientist?: boolean; // Учёный в найме
    scannerAvailable?: boolean; // Сканер в продаже
    drillAvailable?: boolean; // Бур в продаже
    hasShieldGenerator?: boolean; // Генератор щита
    weapons?: string; // Доступное оружие
    modules: ModuleType[]; // Базовые модули в продаже
};
