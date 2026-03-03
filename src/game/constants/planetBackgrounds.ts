import type { PlanetType } from "@/game/types";

/**
 * Returns the CSS class for planet background based on planet type
 */
export function getPlanetBackgroundClass(planetType: PlanetType | undefined): string {
    if (!planetType) return "";

    const classMap: Record<PlanetType, string> = {
        "Пустынная": "planet-bg-пустынная",
        "Ледяная": "planet-bg-ледяная",
        "Лесная": "planet-bg-лесная",
        "Вулканическая": "planet-bg-вулканическая",
        "Океаническая": "planet-bg-океаническая",
        "Газовый гигант": "planet-bg-газовый-гигант",
        "Радиоактивная": "planet-bg-радиоактивная",
        "Тропическая": "planet-bg-тропическая",
        "Арктическая": "planet-bg-арктическая",
        "Разрушенная войной": "planet-bg-разрушенная-войной",
        "Планета-кольцо": "planet-bg-планета-кольцо",
        "Приливная": "planet-bg-приливная",
    };

    return classMap[planetType] || "";
}
