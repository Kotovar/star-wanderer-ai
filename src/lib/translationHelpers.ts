import { store } from "./useTranslation";

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
        Кристаллическая: "crystalline",
        Радиоактивная: "radioactive",
        Тропическая: "tropical",
        Арктическая: "arctic",
        "Разрушенная войной": "war_torn",
        "Планета-кольцо": "ringed",
        Приливная: "tidal",
    };

    const key = ruToEn[planetType] || planetType.toLowerCase();

    // Use provided t function or fallback to the translation store
    const translate = t || store.t.bind(store);
    const translationKey = `locations.planet_types.${key}`;
    const translated = translate(translationKey);
    return translated === translationKey ? planetType : translated;
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
        Кристаллическая: "crystalline",
        Радиоактивная: "radioactive",
        Тропическая: "tropical",
        Арктическая: "arctic",
        "Разрушенная войной": "war_torn",
        "Планета-кольцо": "ringed",
        Приливная: "tidal",
    };

    const key = ruToEn[planetType] || planetType.toLowerCase();

    // Use provided t function or fallback to the translation store
    const translate = t || store.t.bind(store);
    return translate(`planet_descriptions.${key}`);
}

// Helper function to get translated location name from key or direct value
export function getLocationName(
    locationName: string,
    i18nT: (key: string) => string,
): string {
    if (locationName.startsWith("sector_names.")) {
        return getSectorName(locationName, i18nT);
    }

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
        locationName.startsWith("gas_giant_names.") ||
        locationName.startsWith("space_monsters.") ||
        locationName.startsWith("location_names.")
    ) {
        const translated = i18nT(locationName);
        // If translation failed, return the key without prefix
        if (translated === locationName) {
            return locationName
                .replace("star_types.", "")
                .replace("location_types.", "")
                .replace("asteroid_belt_names.", "")
                .replace("gas_giant_names.", "")
                .replace("space_monsters.", "")
                .replace("location_names.", "");
        }
        return translated;
    }

    // Direct value (already translated or fallback)
    return locationName;
}

export function getSectorName(
    sectorName: string,
    i18nT: (key: string) => string,
): string {
    if (!sectorName.startsWith("sector_names.")) return sectorName;

    const translated = i18nT(sectorName);
    return translated === sectorName
        ? sectorName.replace("sector_names.", "")
        : translated;
}

export function getSectorNames(
    sectorNames: string,
    i18nT: (key: string) => string,
): string {
    return sectorNames
        .split(", ")
        .map((sectorName) => getSectorName(sectorName, i18nT))
        .join(", ");
}

/**
 * Название типа оружия. Имена в CRAFTING_RECIPES и WEAPONS захардкожены
 * по-русски, поэтому в интерфейсе берём их из каталога, а константу
 * оставляем запасным вариантом.
 */
export function getWeaponTypeName(
    weaponType: string | undefined,
    i18nT: (key: string) => string,
    fallback = "",
): string {
    if (!weaponType) return fallback;
    const key = `weapon_types.${weaponType}`;
    const translated = i18nT(key);
    return translated === key ? fallback || weaponType : translated;
}

/** Название торгового товара — та же история, что и с оружием. */
export function getTradeGoodName(
    good: string | undefined,
    i18nT: (key: string) => string,
    fallback = "",
): string {
    if (!good) return fallback;
    const key = `trade.goods.${good}`;
    const translated = i18nT(key);
    return translated === key ? fallback || good : translated;
}

/** Название контрактного груза доставки. */
export function getDeliveryGoodName(
    good: string | undefined,
    i18nT: (key: string) => string,
    fallback = "",
): string {
    if (!good) return fallback;
    const key = `delivery_goods.${good}`;
    const translated = i18nT(key);
    return translated === key ? fallback || good : translated;
}

/** Название рецепта гибридного модуля. */
export function getModuleRecipeName(
    recipeId: string,
    i18nT: (key: string) => string,
    fallback = "",
): string {
    const key = `crafting.module_names.${recipeId}`;
    const translated = i18nT(key);
    return translated === key ? fallback || recipeId : translated;
}

/**
 * Описание рецепта — оружия или гибридного модуля. Оба набора описаний
 * захардкожены по-русски в constants/crafting.ts, каталог их перекрывает.
 */
export function getRecipeDescription(
    recipeId: string,
    kind: "weapon" | "module",
    i18nT: (key: string) => string,
    fallback = "",
): string {
    const section =
        kind === "weapon" ? "recipe_descriptions" : "module_descriptions";
    const key = `crafting.${section}.${recipeId}`;
    const translated = i18nT(key);
    return translated === key ? fallback : translated;
}
