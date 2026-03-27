import i18n from "./i18n";

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

// Helper function to get translated location name from key or direct value
export function getLocationName(
    locationName: string,
    i18nT: (key: string) => string,
): string {
    // Handle station names like "station_name.A"
    if (locationName.startsWith("station_name.")) {
        const letter = locationName.replace("station_name.", "");
        const prefix = i18nT("sector_map.station_prefix");
        return `${prefix} ${letter}`;
    }

    // Handle Russian station names like "Станция A"
    if (locationName.startsWith("Станция ")) {
        const letter = locationName.replace("Станция ", "");
        const prefix = i18nT("sector_map.station_prefix");
        return `${prefix} ${letter}`;
    }

    // Handle English station names like "Station A"
    if (locationName.startsWith("Station ")) {
        const letter = locationName.replace("Station ", "");
        const prefix = i18nT("sector_map.station_prefix");
        return `${prefix} ${letter}`;
    }

    // Check if it's a translation key for other types
    if (
        locationName.startsWith("star_types.") ||
        locationName.startsWith("location_types.") ||
        locationName.startsWith("asteroid_belt_names.") ||
        locationName.startsWith("gas_giant_names.")
    ) {
        const translated = i18nT(locationName);
        // If translation failed, return the key without prefix
        if (translated === locationName) {
            return locationName
                .replace("star_types.", "")
                .replace("location_types.", "")
                .replace("asteroid_belt_names.", "")
                .replace("gas_giant_names.", "");
        }
        return translated;
    }

    // Direct value (already translated or fallback)
    return locationName;
}
