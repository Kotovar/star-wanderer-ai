import { store as i18nStore } from "@/lib/useTranslation";
import { BASE_SERVICE_VALUES } from "@/game/constants/baseModules";
import { buildCrewMember } from "@/game/crew/buildCrewMember";
import { getOutpostCrew } from "@/game/crew/stationed";
import type { GameStore, RaceId, Sector, SetState } from "@/game/types";
import type { Outpost } from "@/game/types/outposts";
import { hasBaseService } from "./baseServices";
import { getCrewSlots } from "./outpostCrew";
import { angleGap } from "./relayContracts";

/**
 * Условное расстояние между секторами в «прыжках».
 *
 * Понятия дистанции в галактике нет — есть кольца тиров и угол на карте.
 * Считаем по ним же, что и соседство ретранслятора: кольцо через кольцо плюс
 * четверть оборота — примерно один прыжок.
 */
function sectorHops(a: Sector, b: Sector): number {
    if (a.id === b.id) return 0;
    const gap =
        a.mapAngle === undefined || b.mapAngle === undefined
            ? Math.PI
            : angleGap(a.mapAngle, b.mapAngle);
    return Math.max(
        1,
        Math.round(Math.abs(a.tier - b.tier) + gap / (Math.PI / 4)),
    );
}

export interface SettlerOffer {
    /** Планета-донор: откуда поедет человек */
    planetName: string;
    /** Её раса: кого именно везут. Планета заари даёт заари, а не человека */
    race?: RaceId;
    hops: number;
    cost: number;
    /** Сколько ходов ехать */
    turns: number;
}

/**
 * Откуда и почём везти поселенца.
 *
 * Ближайшая населённая планета — она же и есть источник людей. Чем глубже
 * забралась база, тем дороже и дольше: у выбора места появляется цена,
 * которую видно не в момент закладки, а весь остаток забега.
 */
export function getSettlerOffer(
    outpost: Outpost,
    sectors: readonly Sector[],
): SettlerOffer | null {
    const origin = sectors.find((sector) => sector.id === outpost.sectorId);
    if (!origin) return null;

    let best: { hops: number; planetName: string; race?: RaceId } | null = null;
    for (const sector of sectors) {
        const planet = sector.locations.find(
            (loc) => loc.type === "planet" && !loc.isEmpty && loc.dominantRace,
        );
        if (!planet) continue;
        const hops = sectorHops(origin, sector);
        if (!best || hops < best.hops) {
            best = { hops, planetName: planet.name, race: planet.dominantRace };
        }
    }
    if (!best) return null;

    const { settlerCost, settlerCostPerHop, settlerTurnsBase, settlerTurnsPerHop } =
        BASE_SERVICE_VALUES;
    return {
        planetName: best.planetName,
        race: best.race,
        hops: best.hops,
        cost: Math.round(settlerCost * (1 + best.hops * settlerCostPerHop)),
        turns: settlerTurnsBase + best.hops * settlerTurnsPerHop,
    };
}

/** Почему нельзя заказать поселенца — или `null` */
export function getHireBlocker(
    outpost: Outpost,
    state: Pick<GameStore, "credits" | "crew" | "galaxy">,
    offer: SettlerOffer | null,
): "no_source" | "in_transit" | "no_slot" | "not_enough_credits" | null {
    if (!offer) return "no_source";
    if (outpost.pendingSettler) return "in_transit";
    if (getOutpostCrew(state.crew, outpost.id).length >= getCrewSlots(outpost)) {
        return "no_slot";
    }
    if (state.credits < offer.cost) return "not_enough_credits";
    return null;
}

/**
 * Заказ поселенца в казарме базы.
 *
 * Профессию выбирает игрок, а не случай, — этим наём на базе и отличается от
 * станции. Но человек не появляется по нажатию: его везут с ближайшей
 * населённой планеты, и до приезда он числится в пути.
 *
 * ponytail: отдельного кулдауна нет — дорога и есть кулдаун, второй заказ
 * не принимается, пока едет первый. Отдельный таймер понадобится, только
 * если приезд когда-нибудь станет мгновенным.
 */
export function hireAtBase(
    outpostId: string,
    profession: string,
    set: SetState,
    get: () => GameStore,
): void {
    const state = get();
    const outpost = state.outposts.find((o) => o.id === outpostId);
    if (!outpost || !hasBaseService(outpost, "garrison")) return;

    if (state.currentLocation?.id !== outpost.locationId) {
        get().addLog(i18nStore.t("game_logs.base_service_remote"), "error");
        return;
    }

    const offer = getSettlerOffer(outpost, state.galaxy.sectors);
    const blocker = getHireBlocker(outpost, state, offer);
    if (blocker || !offer) {
        get().addLog(i18nStore.t(`game_logs.base_hire_${blocker}`), "error");
        return;
    }

    set((s) => ({
        credits: s.credits - offer.cost,
        outposts: s.outposts.map((o) =>
            o.id === outpostId
                ? {
                      ...o,
                      pendingSettler: {
                          profession,
                          race: offer.race,
                          arrivesAtTurn: s.turn + offer.turns,
                      },
                  }
                : o,
        ),
    }));

    get().addLog(
        i18nStore.t("game_logs.base_settler_hired", {
            profession: i18nStore.t(`professions.${profession}`),
            planet: i18nStore.t(offer.planetName),
            turns: offer.turns,
        }),
        "info",
    );
}

/**
 * Приезд поселенцев. Человек встаёт в гарнизон базы, а не на корабль:
 * приехал он именно сюда, а перевести его на борт можно и потом.
 */
export function processSettlerArrivals(
    set: SetState,
    get: () => GameStore,
): void {
    const state = get();
    const arrived = (state.outposts ?? []).filter(
        (o) => o.pendingSettler && state.turn >= o.pendingSettler.arrivesAtTurn,
    );
    if (arrived.length === 0) return;

    let nextId = Math.max(0, ...state.crew.map((c) => c.id));
    const home = state.ship.modules[0];
    if (!home) return;

    const settlers = arrived.map((outpost) => {
        nextId += 1;
        return {
            ...buildCrewMember({
                id: nextId,
                profession: outpost.pendingSettler?.profession as never,
                race: outpost.pendingSettler?.race,
                moduleId: home.id,
                level: 1,
            }),
            // Приехал он на базу, а не на борт: перевести можно и потом
            outpostId: outpost.id,
        };
    });

    const arrivedIds = new Set(arrived.map((o) => o.id));
    set((s) => ({
        crew: [...s.crew, ...settlers],
        outposts: s.outposts.map((o) =>
            arrivedIds.has(o.id) ? { ...o, pendingSettler: undefined } : o,
        ),
    }));

    for (const settler of settlers) {
        get().addLog(
            i18nStore.t("game_logs.base_settler_arrived", {
                name: settler.name,
                profession: i18nStore.t(`professions.${settler.profession}`),
            }),
            "info",
        );
    }
    get().updateShipStats();
}
