import {
    BASE_BUNKER_CAP,
    BASE_MODULES,
    getModuleOutput,
} from "@/game/constants/baseModules";
import type { PlanetType } from "@/game/types/planets";
import { planetHasFeature } from "@/game/planets";
import type { OutpostResource } from "@/game/types/outposts";
import {
    CRYOGEN_BURN_PER_TURN,
    GAS_BY_ATMOSPHERE,
    GAS_COLLECTOR_BUNKER_CAP,
    GAS_COLLECTOR_RATE,
} from "@/game/constants/outposts";
import type { GasType, Outpost } from "@/game/types/outposts";
import type { CrewMember, Sector } from "@/game/types";
import { getOutpostOutputMultiplier } from "./outpostCrew";

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
    crew: readonly CrewMember[] = [],
): Outpost[] {
    if (outposts.length === 0) return [...outposts];

    const atmosphereOf = new Map<string, string | undefined>();
    const typeOf = new Map<string, PlanetType | undefined>();
    for (const sector of sectors) {
        for (const location of sector.locations) {
            atmosphereOf.set(location.id, location.gasGiantAtmosphere);
            typeOf.set(location.id, location.planetType);
        }
    }

    return outposts.map((outpost) => {
        // Захваченная постройка стоит: бункер остался, но работает на рейдеров
        if (outpost.capturedAtTurn !== undefined) return outpost;
        if (outpost.kind === "base") {
            return accrueBase(outpost, crew, typeOf.get(outpost.locationId));
        }
        if (outpost.kind !== "gas_collector") return outpost;

        const atmosphere = atmosphereOf.get(outpost.locationId);
        const gas = atmosphere ? GAS_BY_ATMOSPHERE[atmosphere] : undefined;
        if (!gas) return outpost;

        const stored = outpost.bunker[gas] ?? 0;
        if (stored >= GAS_COLLECTOR_BUNKER_CAP) return outpost;

        // Экипаж делает выработку дробной, поэтому копим остаток отдельно и
        // переносим в бункер только целые единицы. Остаток считаем в сотых
        // целыми числами: на дробях 0.7 накапливалось как 0.9999… и каждая
        // десятая единица терялась молча.
        const rate = Math.round(
            GAS_COLLECTOR_RATE * getOutpostOutputMultiplier(outpost, crew) * 100,
        );
        const progress = (outpost.progress ?? 0) + rate;
        const gained = Math.floor(progress / 100);

        return {
            ...outpost,
            progress: progress - gained * 100,
            bunker: {
                ...outpost.bunker,
                [gas]: Math.min(GAS_COLLECTOR_BUNKER_CAP, stored + gained),
            },
        };
    });
}

/**
 * Ход базы: каждый установленный модуль добывает своё в общий бункер.
 * Черта планеты, под которую модуль заточен, удваивает его выход — ради
 * этого «где строить» и остаётся решением после того, как база построена.
 */
function accrueBase(
    outpost: Outpost,
    crew: readonly CrewMember[],
    planetType: PlanetType | undefined,
): Outpost {
    const modules = outpost.modules ?? [];
    if (modules.length === 0) return outpost;

    const multiplier = getOutpostOutputMultiplier(outpost, crew);
    const bunker = { ...outpost.bunker };
    const progress = { ...(outpost.moduleProgress ?? {}) };

    for (const moduleId of modules) {
        const def = BASE_MODULES[moduleId];
        const boosted =
            def.boostedBy && planetHasFeature(outpost.locationId, def.boostedBy)
                ? 2
                : 1;

        for (const [resource, amount] of Object.entries(
            getModuleOutput(moduleId, planetType),
        ) as [OutpostResource, number][]) {
            const stored = bunker[resource] ?? 0;
            if (stored >= BASE_BUNKER_CAP) continue;

            // Тот же приём, что у сборщика: остаток в целых сотых, иначе на
            // дробных множителях молча теряется каждая десятая единица
            const rate = Math.round(amount * boosted * multiplier * 100);
            const carried = (progress[resource] ?? 0) + rate;
            const gained = Math.floor(carried / 100);
            progress[resource] = carried - gained * 100;
            if (gained > 0) {
                bunker[resource] = Math.min(BASE_BUNKER_CAP, stored + gained);
            }
        }
    }

    return { ...outpost, bunker, moduleProgress: progress };
}

/**
 * Сжигает криоген за ход. Возвращает новый запас газов либо `null`, если
 * жечь нечего — тогда вызывающий не трогает состояние вовсе.
 */
export function burnCryogen(
    gases: Partial<Record<GasType, number>>,
): Partial<Record<GasType, number>> | null {
    const stock = gases.cryogen ?? 0;
    if (stock <= 0) return null;
    return { ...gases, cryogen: Math.max(0, stock - CRYOGEN_BURN_PER_TURN) };
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
