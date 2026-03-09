// Module translations for Ship Grid
// This file provides translated names for module types

export interface ModuleTranslation {
    name: string;
}

export const MODULE_TRANSLATIONS: Record<
    "ru" | "en",
    Record<string, ModuleTranslation>
> = {
    ru: {
        reactor: { name: "Реактор" },
        cockpit: { name: "Кабина" },
        lifesupport: { name: "Жизнеобеспечение" },
        cargo: { name: "Грузовой отсек" },
        weaponbay: { name: "Оружейная палуба" },
        weaponShed: { name: "Сарай" },
        shield: { name: "Щиты" },
        medical: { name: "Медотсек" },
        scanner: { name: "Сканер" },
        engine: { name: "Двигатель" },
        fueltank: { name: "Топливный бак" },
        drill: { name: "Бур" },
        ai_core: { name: "ИИ Ядро" },
        lab: { name: "Лаборатория" },
    },
    en: {
        reactor: { name: "Reactor" },
        cockpit: { name: "Cockpit" },
        lifesupport: { name: "Life Support" },
        cargo: { name: "Cargo Bay" },
        weaponbay: { name: "Weapon Bay" },
        weaponShed: { name: "Shed" },
        shield: { name: "Shields" },
        medical: { name: "Medical Bay" },
        scanner: { name: "Scanner" },
        engine: { name: "Engine" },
        fueltank: { name: "Fuel Tank" },
        drill: { name: "Drill" },
        ai_core: { name: "AI Core" },
        lab: { name: "Laboratory" },
    },
};

// Helper function to get module translation
export function getModuleTranslation(
    moduleType: string,
    lang: "ru" | "en" = "ru",
): ModuleTranslation {
    return MODULE_TRANSLATIONS[lang][moduleType] || {
        name: moduleType,
    };
}
