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
        weapon: { name: "Оружие" },
        weaponShed: { name: "Сарай" },
        shield: { name: "Щиты" },
        medical: { name: "Медотсек" },
        scanner: { name: "Сканер" },
        engine: { name: "Двигатель" },
        fueltank: { name: "Топливный бак" },
        drill: { name: "Бур" },
        ai_core: { name: "ИИ Ядро" },
        lab: { name: "Лаборатория" },
        quarters: { name: "Жилой модуль" },
        repair_bay: { name: "Ремонтный отсек" },
        // Hybrid modules
        bio_research_lab: { name: "★ Биолаборатория" },
        pulse_drive: { name: "★ Пульс-ускоритель" },
        habitat_module: { name: "★ Медицинский корпус" },
        deep_survey_array: { name: "★ Сканер-массив" },
        // Boss modules
        ancient_core: { name: "Древнее ядро" },
        plasma_cannon: { name: "Плазменная пушка" },
        regen_hull: { name: "Регенератор корпуса" },
        ancient_shield: { name: "Древний щит" },
        conversion_core: { name: "Конверсионное ядро" },
        disintegrate_beam: { name: "Луч дезинтеграции" },
        nano_swarm: { name: "Нано-рой" },
        absorption_hull: { name: "Поглощающий корпус" },
        ancient_shield_mk2: { name: "Древний щит MK2" },
        prophecy_engine: { name: "Двигатель пророчества" },
        entropy_cannon: { name: "Энтропийная пушка" },
        void_anchor: { name: "Якорь пустоты" },
        temporal_hull: { name: "Временной корпус" },
        singularity_core: { name: "Ядро сингулярности" },
        infinity_core: { name: "Ядро бесконечности" },
        reality_tear: { name: "Разлом реальности" },
        void_embrace: { name: "Объятия пустоты" },
        entropy_field: { name: "Поле энтропии" },
        quantum_barrier: { name: "Квантовый барьер" },
        temporal_shift: { name: "Временной сдвиг" },
    },
    en: {
        reactor: { name: "Reactor" },
        cockpit: { name: "Cockpit" },
        lifesupport: { name: "Life Support" },
        cargo: { name: "Cargo Bay" },
        weaponbay: { name: "Weapon Bay" },
        weapon: { name: "Weapon" },
        weaponShed: { name: "Shed" },
        shield: { name: "Shields" },
        medical: { name: "Medical Bay" },
        scanner: { name: "Scanner" },
        engine: { name: "Engine" },
        fueltank: { name: "Fuel Tank" },
        drill: { name: "Drill" },
        ai_core: { name: "AI Core" },
        lab: { name: "Laboratory" },
        quarters: { name: "Quarters" },
        repair_bay: { name: "Repair Bay" },
        // Hybrid modules
        bio_research_lab: { name: "★ Bio Research Lab" },
        pulse_drive: { name: "★ Pulse Drive" },
        habitat_module: { name: "★ Medical Corps" },
        deep_survey_array: { name: "★ Deep Survey Array" },
        // Boss modules
        ancient_core: { name: "Ancient Core" },
        plasma_cannon: { name: "Plasma Cannon" },
        regen_hull: { name: "Hull Regenerator" },
        ancient_shield: { name: "Ancient Shield" },
        conversion_core: { name: "Conversion Core" },
        disintegrate_beam: { name: "Disintegration Beam" },
        nano_swarm: { name: "Nano Swarm" },
        absorption_hull: { name: "Absorption Hull" },
        ancient_shield_mk2: { name: "Ancient Shield MK2" },
        prophecy_engine: { name: "Prophecy Engine" },
        entropy_cannon: { name: "Entropy Cannon" },
        void_anchor: { name: "Void Anchor" },
        temporal_hull: { name: "Temporal Hull" },
        singularity_core: { name: "Singularity Core" },
        infinity_core: { name: "Infinity Core" },
        reality_tear: { name: "Reality Tear" },
        void_embrace: { name: "Void Embrace" },
        entropy_field: { name: "Entropy Field" },
        quantum_barrier: { name: "Quantum Barrier" },
        temporal_shift: { name: "Temporal Shift" },
    },
};

// Helper function to get module translation
export function getModuleTranslation(
    moduleType: string,
    lang: "ru" | "en" = "ru",
): ModuleTranslation {
    return (
        MODULE_TRANSLATIONS[lang][moduleType] || {
            name: moduleType,
        }
    );
}
