/**
 * Особенности пустых планет — модификаторы операций на поверхности.
 * Вычисляются детерминированно из id планеты, в сейв ничего не пишется,
 * поэтому работают и на старых сохранениях.
 */

export type PlanetFeatureId =
    | "rich_deposits"
    | "aggressive_fauna"
    | "dense_ionosphere"
    | "ancient_traces";

export const PLANET_FEATURES: Record<PlanetFeatureId, { icon: string }> = {
    rich_deposits: { icon: "⛏️" }, // добыча бура ×2, +1 проход бурения
    aggressive_fauna: { icon: "🐾" }, // разведка опаснее, но находки богаче
    dense_ionosphere: { icon: "🌩️" }, // орбитальное сканирование заблокировано, анализ атмосферы +1 к ресурсам
    ancient_traces: { icon: "🏺" }, // удвоенный шанс научных образцов при разведке
};

/** Детерминированный хэш id планеты */
export const hashPlanetId = (id: string): number => {
    let h = 7;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return Math.abs(h);
};

const ALL_FEATURES = Object.keys(PLANET_FEATURES) as PlanetFeatureId[];

/** 0–2 особенности планеты: 25% — ни одной, 50% — одна, 25% — две */
export function getPlanetFeatures(planetId: string): PlanetFeatureId[] {
    const h = hashPlanetId(planetId);
    const roll = h % 4;
    if (roll === 0) return [];
    const first = ALL_FEATURES[(h >> 3) % ALL_FEATURES.length];
    if (roll < 3) return [first];
    const rest = ALL_FEATURES.filter((f) => f !== first);
    return [first, rest[(h >> 7) % rest.length]];
}

export const planetHasFeature = (
    planetId: string,
    feature: PlanetFeatureId,
): boolean => getPlanetFeatures(planetId).includes(feature);
