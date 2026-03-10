import i18n from "./i18n";

// Helper function to get translated profession name
export function getProfessionName(profession: string): string {
    const translations: Record<string, string> = {
        pilot: i18n.t("professions.pilot"),
        engineer: i18n.t("professions.engineer"),
        medic: i18n.t("professions.medic"),
        scout: i18n.t("professions.scout"),
        scientist: i18n.t("professions.scientist"),
        gunner: i18n.t("professions.gunner"),
    };
    return translations[profession] || profession;
}

// Helper function to get translated profession description
export function getProfessionDescription(profession: string): string {
    const translations: Record<string, string> = {
        pilot: i18n.t("profession_descriptions.pilot"),
        engineer: i18n.t("profession_descriptions.engineer"),
        medic: i18n.t("profession_descriptions.medic"),
        scout: i18n.t("profession_descriptions.scout"),
        scientist: i18n.t("profession_descriptions.scientist"),
        gunner: i18n.t("profession_descriptions.gunner"),
    };
    return translations[profession] || "";
}

// Helper function to get translated race name
export function getRaceName(raceId: string): string {
    const translations: Record<string, string> = {
        human: i18n.t("races.human.name"),
        synthetic: i18n.t("races.synthetic.name"),
        xenosymbiont: i18n.t("races.xenosymbiont.name"),
        krylorian: i18n.t("races.krylorian.name"),
        voidborn: i18n.t("races.voidborn.name"),
        crystalline: i18n.t("races.crystalline.name"),
    };
    return translations[raceId] || raceId;
}

// Helper function to get translated race description
export function getRaceDescription(raceId: string): string {
    const translations: Record<string, string> = {
        human: i18n.t("races.human.description"),
        synthetic: i18n.t("races.synthetic.description"),
        xenosymbiont: i18n.t("races.xenosymbiont.description"),
        krylorian: i18n.t("races.krylorian.description"),
        voidborn: i18n.t("races.voidborn.description"),
        crystalline: i18n.t("races.crystalline.description"),
    };
    return translations[raceId] || "";
}

// Helper function to get translated combat action
export function getCombatActionLabel(
    profession: string,
    action: string,
): string {
    const translations: Record<string, Record<string, string>> = {
        pilot: {
            "": i18n.t("combat_actions.waiting"),
            evasion: i18n.t("combat_actions.evasion"),
        },
        engineer: {
            "": i18n.t("combat_actions.waiting"),
            repair: i18n.t("combat_actions.repair"),
            calibration: i18n.t("combat_actions.calibration"),
            overclock: i18n.t("combat_actions.overclock"),
        },
        medic: {
            "": i18n.t("combat_actions.waiting"),
            heal: i18n.t("combat_actions.heal"),
            firstaid: i18n.t("combat_actions.firstaid"),
        },
        scout: {
            "": i18n.t("combat_actions.waiting"),
            sabotage: i18n.t("combat_actions.sabotage"),
        },
        scientist: {
            "": i18n.t("combat_actions.waiting"),
            analysis: i18n.t("combat_actions.analysis"),
        },
        gunner: {
            "": i18n.t("combat_actions.waiting"),
            targeting: i18n.t("combat_actions.targeting"),
            rapidfire: i18n.t("combat_actions.rapidfire"),
        },
    };
    return translations[profession]?.[action] || action;
}

// Helper function to get translated crew action
export function getCrewActionLabel(profession: string, action: string): string {
    const translations: Record<string, Record<string, string>> = {
        pilot: {
            "": i18n.t("crew_actions.waiting"),
            navigation: i18n.t("crew_actions.navigation"),
        },
        engineer: {
            "": i18n.t("crew_actions.waiting"),
            repair: i18n.t("crew_actions.repair"),
            reactor_overload: i18n.t("crew_actions.reactor_overload"),
        },
        medic: {
            "": i18n.t("crew_actions.waiting"),
            heal: i18n.t("crew_actions.heal"),
            morale: i18n.t("crew_actions.morale"),
            firstaid: i18n.t("crew_actions.firstaid"),
        },
        scout: {
            "": i18n.t("crew_actions.waiting"),
            patrol: i18n.t("crew_actions.patrol"),
        },
        scientist: {
            "": i18n.t("crew_actions.waiting"),
            research: i18n.t("crew_actions.research"),
            analyzing: i18n.t("crew_actions.analyzing"),
        },
        gunner: {
            "": i18n.t("crew_actions.waiting"),
            maintenance: i18n.t("crew_actions.maintenance"),
        },
    };
    return translations[profession]?.[action] || action;
}

// Helper function to get translated planet type name
export function getPlanetTypeName(
    planetType: string,
    t?: (key: string) => string,
): string {
    // Map Russian planet types to English keys
    const ruToEn: Record<string, string> = {
        Пустынная: "desert",
        Ледяная: "ice",
        Лесная: "forest",
        Вулканическая: "volcanic",
        Океаническая: "oceanic",
        Радиоактивная: "radioactive",
        Тропическая: "tropical",
        Арктическая: "arctic",
        "Разрушенная войной": "war_torn",
        "Планета-кольцо": "ringed",
        Приливная: "tidal",
    };

    const key = ruToEn[planetType] || planetType.toLowerCase();

    // Use provided t function or fallback to i18n.t
    const translate = t || i18n.t.bind(i18n);
    return translate(`locations.planet_types.${key}`);
}

// Helper function to get translated planet description
export function getPlanetDescription(
    planetType: string,
    t?: (key: string) => string,
): string {
    // Map Russian planet types to English keys
    const ruToEn: Record<string, string> = {
        Пустынная: "desert",
        Ледяная: "ice",
        Лесная: "forest",
        Вулканическая: "volcanic",
        Океаническая: "oceanic",
        Радиоактивная: "radioactive",
        Тропическая: "tropical",
        Арктическая: "arctic",
        "Разрушенная войной": "war_torn",
        "Планета-кольцо": "ringed",
        Приливная: "tidal",
    };

    const key = ruToEn[planetType] || planetType.toLowerCase();

    // Use provided t function or fallback to i18n.t
    const translate = t || i18n.t.bind(i18n);
    return translate(`planet_descriptions.${key}`);
}

// Helper function to get translated star type name
export function getStarTypeName(starType: string): string {
    const translations: Record<string, string> = {
        red_dwarf: i18n.t("star_types.red_dwarf"),
        yellow_dwarf: i18n.t("star_types.yellow_dwarf"),
        white_dwarf: i18n.t("star_types.white_dwarf"),
        blue_giant: i18n.t("star_types.blue_giant"),
        red_supergiant: i18n.t("star_types.red_supergiant"),
        neutron_star: i18n.t("star_types.neutron_star"),
        double: i18n.t("star_types.double"),
        triple: i18n.t("star_types.triple"),
        blackhole: i18n.t("star_types.blackhole"),
        gas_giant: i18n.t("star_types.gas_giant"),
        // Russian fallbacks for direct type values
        "Красный карлик": i18n.t("star_types.red_dwarf"),
        "Жёлтый карлик": i18n.t("star_types.yellow_dwarf"),
        "Белый карлик": i18n.t("star_types.white_dwarf"),
        "Голубой гигант": i18n.t("star_types.blue_giant"),
        "Красный сверхгигант": i18n.t("star_types.red_supergiant"),
        "Нейтронная звезда": i18n.t("star_types.neutron_star"),
        "Двойная звезда": i18n.t("star_types.double"),
        "Тройная звезда": i18n.t("star_types.triple"),
        "Чёрная дыра": i18n.t("star_types.blackhole"),
        "Газовый гигант": i18n.t("star_types.gas_giant"),
    };
    return translations[starType] || starType;
}

// Helper function to get translated location type name
export function getLocationTypeName(locationType: string): string {
    const translations: Record<string, string> = {
        asteroid_belt: i18n.t("location_types.asteroid_belt"),
        anomaly: i18n.t("location_types.anomaly"),
        blackhole: i18n.t("location_types.blackhole"),
        planet: i18n.t("location_types.planet"),
        station: i18n.t("location_types.station"),
        enemy_ship: i18n.t("location_types.enemy_ship"),
        friendly_ship: i18n.t("location_types.friendly_ship"),
        distress_signal: i18n.t("location_types.distress_signal"),
        cosmic_storm: i18n.t("location_types.cosmic_storm"),
        // Russian fallbacks for direct type values
        "Пояс астероидов": i18n.t("location_types.asteroid_belt"),
        Аномалия: i18n.t("location_types.anomaly"),
        "Чёрная дыра": i18n.t("location_types.blackhole"),
        Планета: i18n.t("location_types.planet"),
        Станция: i18n.t("location_types.station"),
        "Вражеский корабль": i18n.t("location_types.enemy_ship"),
        "Дружеский корабль": i18n.t("location_types.friendly_ship"),
        "Сигнал бедствия": i18n.t("location_types.distress_signal"),
        "Космический шторм": i18n.t("location_types.cosmic_storm"),
    };
    return translations[locationType] || locationType;
}

// Helper function to get translated planet specialization name
export function getPlanetSpecializationName(specId: string): string {
    const translations: Record<string, string> = {
        human_academy: i18n.t("planet_specializations.human_academy.name"),
        synthetic_archives: i18n.t(
            "planet_specializations.synthetic_archives.name",
        ),
        xenosymbiont_lab: i18n.t(
            "planet_specializations.xenosymbiont_lab.name",
        ),
        krylorian_dojo: i18n.t("planet_specializations.krylorian_dojo.name"),
        voidborn_ritual: i18n.t("planet_specializations.voidborn_ritual.name"),
        crystalline_resonator: i18n.t(
            "planet_specializations.crystalline_resonator.name",
        ),
    };
    return translations[specId] || specId;
}

// Helper function to get translated planet specialization description
export function getPlanetSpecializationDescription(specId: string): string {
    const translations: Record<string, string> = {
        human_academy: i18n.t(
            "planet_specializations.human_academy.description",
        ),
        synthetic_archives: i18n.t(
            "planet_specializations.synthetic_archives.description",
        ),
        xenosymbiont_lab: i18n.t(
            "planet_specializations.xenosymbiont_lab.description",
        ),
        krylorian_dojo: i18n.t(
            "planet_specializations.krylorian_dojo.description",
        ),
        voidborn_ritual: i18n.t(
            "planet_specializations.voidborn_ritual.description",
        ),
        crystalline_resonator: i18n.t(
            "planet_specializations.crystalline_resonator.description",
        ),
    };
    return translations[specId] || "";
}

// Helper function to get translated location name from key or direct value
export function getLocationName(
    locationName: string,
    i18nT: (key: string) => string,
): string {
    // Check if it's a translation key
    if (
        locationName.startsWith("star_types.") ||
        locationName.startsWith("location_types.") ||
        locationName.startsWith("asteroid_belt_names.") ||
        locationName.startsWith("station_name.")
    ) {
        // Handle station names like "station_name.A"
        if (locationName.startsWith("station_name.")) {
            const letter = locationName.replace("station_name.", "");
            const prefix = i18nT("sector_map.station_prefix");
            return `${prefix} ${letter}`;
        }

        const translated = i18nT(locationName);
        // If translation failed, return the key without prefix
        if (translated === locationName) {
            return locationName
                .replace("star_types.", "")
                .replace("location_types.", "")
                .replace("asteroid_belt_names.", "")
                .replace("station_name.", "");
        }
        return translated;
    }
    // Direct value (already translated or fallback)
    return locationName;
}
