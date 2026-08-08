/**
 * Особенности пустых планет — модификаторы операций на поверхности.
 * Вычисляются детерминированно из id планеты, в сейв ничего не пишется,
 * поэтому работают и на старых сохранениях.
 */

export type PlanetFeatureId =
    | "rich_deposits"
    | "aggressive_fauna"
    | "dense_ionosphere"
    | "ancient_traces"
    | "seismic_activity"
    | "ice_caps"
    | "low_gravity"
    | "ruined_settlement";

export const PLANET_FEATURES: Record<PlanetFeatureId, { icon: string }> = {
    rich_deposits: { icon: "⛏️" }, // добыча бура ×2, +1 проход бурения
    aggressive_fauna: { icon: "🐾" }, // разведка опаснее, но находки богаче
    dense_ionosphere: { icon: "🌩️" }, // орбитальное сканирование заблокировано, анализ атмосферы +1 к ресурсам
    ancient_traces: { icon: "🏺" }, // удвоенный шанс научных образцов при разведке
    seismic_activity: { icon: "🌋" }, // бур добывает больше, но каждый проход бьёт по буру
    ice_caps: { icon: "🧊" }, // проход бурения дозаправляет корабль
    low_gravity: { icon: "🪶" }, // экспедиция получает дополнительные очки действий
    ruined_settlement: { icon: "🏚️" }, // сетка экспедиции насыщена руинами
};

/** Прибавка к добыче бура на планете с сейсмической активностью */
export const SEISMIC_DRILL_YIELD_BONUS = 0.6;
/** Шанс, что проход бурения повредит бур на сейсмической планете */
export const SEISMIC_DRILL_DAMAGE_CHANCE = 0.4;
/** Урон буру от подземного толчка */
export const SEISMIC_DRILL_DAMAGE = 18;
/** Сколько топлива даёт проход бурения на планете с ледяными шапками */
export const ICE_CAPS_FUEL = 8;
/** Дополнительные очки действий экспедиции при низкой гравитации */
export const LOW_GRAVITY_EXPEDITION_AP = 2;
/** Прибавка к весу тайлов руин на планете с заброшенным поселением */
export const RUINED_SETTLEMENT_RUINS_WEIGHT = 5;

/** Детерминированный хэш id планеты */
export const hashPlanetId = (id: string): number => {
    let h = 7;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return Math.abs(h);
};

const ALL_FEATURES = Object.keys(PLANET_FEATURES) as PlanetFeatureId[];

/**
 * Независимый бросок из одного хэша. Простая нарезка битов (`h >> 3`, `h >> 7`)
 * давала перекос до ×2 между чертами, потому что броски делили общие биты —
 * поэтому каждый бросок сначала домешивает свой номер.
 */
const roll = (hash: number, index: number): number => {
    let x = (hash ^ (index * 0x9e3779b9)) | 0;
    x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) | 0;
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) | 0;
    return Math.abs(x ^ (x >>> 16));
};

/** 0–2 особенности планеты: 25% — ни одной, 50% — одна, 25% — две */
export function getPlanetFeatures(planetId: string): PlanetFeatureId[] {
    const h = hashPlanetId(planetId);
    const count = roll(h, 1) % 4;
    if (count === 0) return [];
    const first = ALL_FEATURES[roll(h, 2) % ALL_FEATURES.length];
    if (count < 3) return [first];
    const rest = ALL_FEATURES.filter((f) => f !== first);
    return [first, rest[roll(h, 3) % rest.length]];
}

export const planetHasFeature = (
    planetId: string,
    feature: PlanetFeatureId,
): boolean => getPlanetFeatures(planetId).includes(feature);
