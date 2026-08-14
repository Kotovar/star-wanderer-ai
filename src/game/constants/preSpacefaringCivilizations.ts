import type { PreSpacefaringCivilization } from "@/game/types";

export const PRE_SPACEFARING_SETTLEMENT_ROLL_DIVISOR = 5;
export const PRE_SPACEFARING_SETTLEMENT_TILE_INDICES = [
    7,
    11,
    13,
    17,
] as const;

/**
 * Каталог — плоская таблица. Действия и награды сюда не переезжают
 * намеренно: они выводятся из характера и уровня, поэтому тринадцатая
 * цивилизация стоит одной строки, а не копии шести действий.
 *
 * Четыре первых идентификатора сохраняют уровень с прежней версии: под тем
 * же названием в старом сохранении должен жить тот же мир.
 */
export const PRE_SPACEFARING_CIVILIZATIONS: readonly PreSpacefaringCivilization[] =
    [
        { id: "river_clans", civilizationId: "river_clans", development: "primitive", temperament: "insular" },
        { id: "ash_walkers", civilizationId: "ash_walkers", development: "primitive", temperament: "waning" },
        { id: "sky_watchers", civilizationId: "sky_watchers", development: "primitive", temperament: "devout" },
        { id: "delta_league", civilizationId: "delta_league", development: "agrarian", temperament: "curious" },
        { id: "thorn_holds", civilizationId: "thorn_holds", development: "agrarian", temperament: "martial" },
        { id: "salt_pilgrims", civilizationId: "salt_pilgrims", development: "agrarian", temperament: "devout" },
        { id: "forge_cities", civilizationId: "forge_cities", development: "industrial", temperament: "martial" },
        { id: "glass_combine", civilizationId: "glass_combine", development: "industrial", temperament: "curious" },
        { id: "lantern_orders", civilizationId: "lantern_orders", development: "industrial", temperament: "insular" },
        { id: "coastal_network", civilizationId: "coastal_network", development: "modern", temperament: "curious" },
        { id: "deep_quorum", civilizationId: "deep_quorum", development: "modern", temperament: "insular" },
        { id: "last_broadcast", civilizationId: "last_broadcast", development: "modern", temperament: "waning" },
    ];

export const getPreSpacefaringCivilization = (id: string) =>
    PRE_SPACEFARING_CIVILIZATIONS.find((entry) => entry.id === id);
