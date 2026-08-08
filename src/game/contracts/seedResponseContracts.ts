import { CRAFTING_RECIPES } from "@/game/constants/crafting";
import {
    generateCrisisResponseContract,
    generateFabricationContract,
} from "./generateResponseContracts";
import type { ActiveCrisisState } from "@/game/types/crisis";
import type { CraftingWeapon } from "@/game/types/crafting";
import type { Contract, Location, Sector } from "@/game/types";

/**
 * Динамические контракты не ждут стоходового обновления предложений: они
 * подсеваются по событию, которое их вообще делает возможными — старт кризиса
 * и открытие рецепта. Иначе кризис успевал бы кончиться раньше, чем планеты
 * пересоберут свои предложения.
 */

/** Потолок предложений на планете — тот же, что у обычного обновления */
const MAX_OPEN_CONTRACTS = 5;

/** Шанс, что планета выставит заказ на изготовление */
export const FABRICATION_OFFER_CHANCE = 0.25;

const isOfferablePlanet = (location: Location) =>
    location.type === "planet" && !location.isEmpty;

/** Общий проход: дописывает контракт туда, где для него есть место */
const seedPlanets = (
    sectors: Sector[],
    accepts: (location: Location) => boolean,
    build: (location: Location, sector: Sector) => Contract | null,
): Sector[] | null => {
    let changed = false;

    const next = sectors.map((sector) => ({
        ...sector,
        locations: sector.locations.map((location) => {
            if (!isOfferablePlanet(location) || !accepts(location)) {
                return location;
            }

            const offers = location.contracts ?? [];
            if (offers.length >= MAX_OPEN_CONTRACTS) return location;

            const contract = build(location, sector);
            if (!contract) return location;

            changed = true;
            return { ...location, contracts: [...offers, contract] };
        }),
    }));

    return changed ? next : null;
};

/**
 * Заказы на только что открытое оружие. Сеются на ещё не посещённых планетах:
 * посещённые доберут своё на обычном обновлении, а новые заказы должны
 * ждать игрока впереди по маршруту, а не позади него.
 */
export const seedFabricationOffers = (
    sectors: Sector[],
    recipeId: string,
): Sector[] | null => {
    if (!(recipeId in CRAFTING_RECIPES)) return null;
    const weaponType = CRAFTING_RECIPES[recipeId as CraftingWeapon].weaponType;

    return seedPlanets(
        sectors,
        (location) =>
            !location.visited &&
            !(location.contracts ?? []).some(
                (offer) =>
                    offer.type === "fabrication" &&
                    offer.requiredWeaponType === weaponType,
            ),
        (location, sector) =>
            generateFabricationContract(location, sector, [recipeId]),
    );
};

/**
 * Заказы на рецепты, которые игрок знает уже на первом ходу: шаблоны со всеми
 * технологиями и модификатор случайной стартовой технологии (ion_cannon
 * открывается без предпосылок). Такой старт не проходит через processResearch,
 * поэтому без отдельного подсева первые заказы появились бы только на сотом
 * ходу. Бросок делается на планету, а не на рецепт, иначе все предложения
 * планеты оказались бы заказами на изготовление.
 */
export const seedStartingFabricationOffers = (
    sectors: Sector[],
    unlockedRecipes: readonly string[] | undefined,
): Sector[] | null => {
    const available = (unlockedRecipes ?? []).filter(
        (recipeId): recipeId is CraftingWeapon => recipeId in CRAFTING_RECIPES,
    );
    if (available.length === 0) return null;

    return seedPlanets(
        sectors,
        () => Math.random() < FABRICATION_OFFER_CHANCE,
        (location, sector) =>
            generateFabricationContract(location, sector, [
                available[Math.floor(Math.random() * available.length)],
            ]),
    );
};

/**
 * Предложения помощи в только что начавшемся кризисе. Сеются по всей галактике,
 * посещённой и нет: кризис накрывает всех, поэтому работа должна найтись там,
 * куда игрок полетит.
 */
export const seedCrisisResponseOffers = (
    sectors: Sector[],
    activeCrisis: ActiveCrisisState,
): Sector[] | null =>
    seedPlanets(
        sectors,
        (location) =>
            !(location.contracts ?? []).some(
                (offer) =>
                    offer.type === "crisis_response" &&
                    offer.crisisId === activeCrisis.id,
            ),
        (location, sector) =>
            generateCrisisResponseContract(location, sector, activeCrisis),
    );

/**
 * Снимает предложения помощи по кризисам, которые уже прошли. Без этого они
 * висели бы на планетах до следующего обновления — то есть до сотни ходов.
 */
export const dropStaleCrisisOffers = (
    sectors: Sector[],
    activeCrisisId: string | null,
): Sector[] | null => {
    let changed = false;

    const next = sectors.map((sector) => ({
        ...sector,
        locations: sector.locations.map((location) => {
            const offers = location.contracts;
            if (!offers?.length) return location;

            const kept = offers.filter(
                (offer) =>
                    offer.type !== "crisis_response" ||
                    offer.crisisId === activeCrisisId,
            );
            if (kept.length === offers.length) return location;

            changed = true;
            return { ...location, contracts: kept };
        }),
    }));

    return changed ? next : null;
};
