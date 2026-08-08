import {
    GAS_BY_ATMOSPHERE,
    GAS_COLLECTOR_BUNKER_CAP,
    GAS_COLLECTOR_RATE,
} from "@/game/constants/outposts";
import type { GasType, Outpost } from "@/game/types/outposts";
import type { Sector } from "@/game/types";

/**
 * Накопление за один ход. Чистая функция: принимает постройки и сектора,
 * возвращает новые постройки — ничего не читает из стора, поэтому проверка
 * может прогнать сотню ходов без игры.
 *
 * Полный бункер простаивает намеренно. Это и есть разница между постройкой
 * и пассивным доходом: добыча копится, только пока за ней собираются прилететь.
 */
export function accrueOutposts(
    outposts: readonly Outpost[],
    sectors: readonly Sector[],
): Outpost[] {
    if (outposts.length === 0) return [...outposts];

    const atmosphereOf = new Map<string, string | undefined>();
    for (const sector of sectors) {
        for (const location of sector.locations) {
            atmosphereOf.set(location.id, location.gasGiantAtmosphere);
        }
    }

    return outposts.map((outpost) => {
        if (outpost.kind !== "gas_collector") return outpost;

        const atmosphere = atmosphereOf.get(outpost.locationId);
        const gas = atmosphere ? GAS_BY_ATMOSPHERE[atmosphere] : undefined;
        if (!gas) return outpost;

        const stored = outpost.bunker[gas] ?? 0;
        if (stored >= GAS_COLLECTOR_BUNKER_CAP) return outpost;

        return {
            ...outpost,
            bunker: {
                ...outpost.bunker,
                [gas]: Math.min(
                    GAS_COLLECTOR_BUNKER_CAP,
                    stored + GAS_COLLECTOR_RATE,
                ),
            },
        };
    });
}

/** Заполнен ли бункер целиком — постройка простаивает и ждёт вывоза */
export const isBunkerFull = (outpost: Outpost): boolean =>
    outpost.kind === "gas_collector" &&
    Object.values(outpost.bunker).some(
        (amount) => (amount ?? 0) >= GAS_COLLECTOR_BUNKER_CAP,
    );

/** Сколько всего лежит в бункере */
export const getBunkerTotal = (outpost: Outpost): number =>
    Object.values(outpost.bunker).reduce<number>(
        (sum, amount) => sum + (amount ?? 0),
        0,
    );

/** Виды газа в бункере с ненулевым количеством */
export const getBunkerEntries = (outpost: Outpost): [GasType, number][] =>
    (Object.entries(outpost.bunker) as [GasType, number][]).filter(
        ([, amount]) => amount > 0,
    );
