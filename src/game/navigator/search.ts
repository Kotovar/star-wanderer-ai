import { TRADE_GOODS } from "@/game/constants/goods";
import { RACES } from "@/game/constants/races";
import { generateStationCrew } from "@/game/components/station/station-data";
import { generateCrewTraits, rollQuality } from "@/game/crew/utils";
import { canSeeTier4 } from "@/game/galaxy/galaxy-map-utils";
import { applyReputationPriceModifier } from "@/game/reputation/priceModifier";
import {
  canHireRace,
  getRaceReputationLevel,
} from "@/game/reputation/utils";
import { getTierPriceMultiplier } from "@/game/slices/trade/constants";
import type {
  GameState,
  GalaxyTierAll,
  Goods,
  Location,
  MutationTraitId,
  Profession,
  RaceId,
  Sector,
  TraitId,
} from "@/game/types";
import {
  getNavigatorLocationKey,
  type KnownLocationIntel,
  type NavigatorFilters,
  type NavigatorResult,
} from "@/game/types/navigator";

type NavigatorInput = Pick<
  GameState,
  | "artifacts"
  | "friendlyShipStock"
  | "galaxy"
  | "knownLocationIntel"
  | "knownTradeStations"
  | "raceReputation"
  | "stationPrices"
> & {
  filters: Pick<NavigatorFilters, "category"> &
    Partial<Omit<NavigatorFilters, "category">>;
  scanRange?: number;
  ship: Pick<GameState["ship"], "modules">;
};

type TierInput = Pick<GameState, "artifacts"> & {
  scanRange?: number;
  ship: Pick<GameState["ship"], "modules">;
};

const FRIENDLY_TRADE_GOODS: Goods[] = ["water", "food", "medicine"];
const FRIENDLY_CREW_PROFESSIONS: Profession[] = [
  "pilot",
  "engineer",
  "medic",
  "scout",
  "scientist",
  "gunner",
];
const FRIENDLY_CREW_RACES: RaceId[] = [
  "human",
  "synthetic",
  "xenosymbiont",
  "krylorian",
  "voidborn",
  "crystalline",
];
const DISCOVERY_TYPES = new Set<Location["type"]>([
  "friendly_ship",
  "derelict_ship",
  "anomaly",
  "storm",
  "distress_signal",
  "wreck_field",
  "asteroid_belt",
  "space_monster",
  "gas_giant",
  "profile_signal",
]);

const hashId = (id: string): number => {
  let seed = 0;
  for (let index = 0; index < id.length; index++) {
    seed = (seed << 5) - seed + id.charCodeAt(index);
    seed &= seed;
  }
  return seed;
};

const seedRandom = (seed: number): number => {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
};

const getTraitIds = (
  traits: Array<{ id?: TraitId; type: string }>,
): TraitId[] =>
  traits.flatMap((trait) => (trait.id === undefined ? [] : [trait.id]));

const toCrewResult = (
  member: {
    race: RaceId;
    profession: Profession;
    level?: number;
    traits: Array<{ id?: TraitId; type: string }>;
  },
): NonNullable<NavigatorResult["crew"]> => {
  const traits = getTraitIds(member.traits);
  return {
    race: member.race,
    profession: member.profession,
    level: member.level ?? 1,
    traits,
    mutation: member.traits.find((trait) => trait.type === "mutation")?.id as
      | MutationTraitId
      | undefined,
  };
};

const getFriendlyCrew = (
  location: Location,
): NonNullable<NavigatorResult["crew"]> => {
  const seed = hashId(location.id);
  const profession =
    FRIENDLY_CREW_PROFESSIONS[
      Math.floor(seedRandom(seed + 100) * FRIENDLY_CREW_PROFESSIONS.length)
    ];
  const race =
    FRIENDLY_CREW_RACES[
      Math.floor(seedRandom(seed + 103) * FRIENDLY_CREW_RACES.length)
    ];
  const quality = rollQuality(seedRandom(seed + 102));
  const { traits } = generateCrewTraits(
    quality,
    0,
    RACES[race].hasHappiness,
    profession,
    race,
  );

  return toCrewResult({
    race,
    profession,
    level:
      profession === "scientist"
        ? 1 + Math.floor(seedRandom(seed + 101) * 3)
        : 1,
    traits,
  });
};

const matchesCrewFilters = (
  crew: NonNullable<NavigatorResult["crew"]>,
  filters: NavigatorInput["filters"],
): boolean =>
  (!filters.race || crew.race === filters.race) &&
  (!filters.profession || crew.profession === filters.profession) &&
  (!filters.minLevel || crew.level >= filters.minLevel) &&
  (!filters.trait || crew.traits.includes(filters.trait)) &&
  (!filters.mutation || crew.mutation === filters.mutation);

const createResult = (
  sector: Sector,
  location: Location,
  category: NavigatorResult["category"],
  details: string[],
): NavigatorResult => ({
  key: getNavigatorLocationKey(sector.id, location.id),
  sectorId: sector.id,
  sectorName: sector.name,
  sectorTier: sector.tier,
  locationId: location.id,
  locationName: location.name,
  category,
  kind: location.type,
  details,
});

const withReputation = (
  prices: { buy: number; sell: number },
  input: NavigatorInput,
  location: Location,
): { buy: number; sell: number } => {
  if (!location.dominantRace) return prices;
  return {
    buy: applyReputationPriceModifier(
      input.raceReputation,
      location.dominantRace,
      prices.buy,
      "buy",
      prices.sell,
    ),
    sell: applyReputationPriceModifier(
      input.raceReputation,
      location.dominantRace,
      prices.sell,
      "sell",
      prices.buy,
    ),
  };
};

const getTradeResult = (
  input: NavigatorInput,
  sector: Sector,
  location: Location,
  intel: KnownLocationIntel,
): NavigatorResult | null => {
  const { goodId } = input.filters;
  const result = createResult(sector, location, "trade", []);

  if (location.type === "station" && location.stationConfig?.allowsTrade) {
    if (!goodId) return result;
    const stationId = location.stationId ?? location.id;
    const prices = input.knownTradeStations.includes(stationId)
      ? input.stationPrices[stationId]?.[goodId]
      : undefined;
    return prices
      ? {
          ...result,
          details: [goodId],
          trade: { goodId, ...withReputation(prices, input, location) },
        }
      : null;
  }

  if (
    location.type !== "friendly_ship" ||
    !location.hasTrader ||
    !intel.visited
  ) {
    return null;
  }
  if (!goodId) return result;
  const index = FRIENDLY_TRADE_GOODS.indexOf(goodId);
  if (index < 0 || input.friendlyShipStock[location.id]?.[goodId] === undefined) {
    return null;
  }
  const price = Math.floor(
    TRADE_GOODS[goodId].basePrice *
      getTierPriceMultiplier(sector.tier) *
      (0.9 + seedRandom(hashId(location.id) + index) * 0.4),
  );
  return {
    ...result,
    details: [goodId],
    trade: {
      goodId,
      ...withReputation(
        { buy: price, sell: Math.floor(price * 0.6) },
        input,
        location,
      ),
    },
  };
};

const getCrewResults = (
  input: NavigatorInput,
  sector: Sector,
  location: Location,
  intel: KnownLocationIntel,
): NavigatorResult[] => {
  if (!intel.visited) return [];

  const crew =
    location.type === "station"
      ? generateStationCrew(
          location.stationId ?? location.id,
          location.dominantRace,
          location.stationConfig,
        ).map(({ member }) => toCrewResult(member))
      : location.type === "friendly_ship" && location.hasCrew
        ? [getFriendlyCrew(location)]
        : [];

  return crew.flatMap((candidate, index) => {
    if (
      !canHireRace(input.raceReputation, candidate.race) ||
      !matchesCrewFilters(candidate, input.filters)
    ) {
      return [];
    }
    return [
      {
        ...createResult(sector, location, "crew", [
          candidate.race,
          candidate.profession,
          String(candidate.level),
          ...candidate.traits,
        ]),
        key: `${getNavigatorLocationKey(sector.id, location.id)}:crew:${index}`,
        crew: candidate,
      },
    ];
  });
};

const getPlanetResult = (
  input: NavigatorInput,
  sector: Sector,
  location: Location,
  intel: KnownLocationIntel,
): NavigatorResult | null => {
  if (location.type !== "planet") return null;
  const { filters } = input;
  const knowsType = intel.highestScanRange >= 3;
  const knowsSettlement = intel.highestScanRange >= 5;
  const population = location.isEmpty ? "empty" : "inhabited";

  if (
    (filters.planetType &&
      (!knowsType || location.planetType !== filters.planetType)) ||
    (filters.population &&
      (!knowsSettlement || population !== filters.population)) ||
    (filters.race &&
      (!knowsSettlement || location.dominantRace !== filters.race)) ||
    (filters.reputation &&
      (!knowsSettlement ||
        !location.dominantRace ||
        getRaceReputationLevel(
          input.raceReputation,
          location.dominantRace,
        ) !== filters.reputation))
  ) {
    return null;
  }

  return createResult(
    sector,
    location,
    "planets",
    [
      knowsType ? location.planetType : undefined,
      knowsSettlement ? population : undefined,
      knowsSettlement ? location.dominantRace : undefined,
      intel.highestScanRange >= 8 && location.population !== undefined
        ? String(location.population)
        : undefined,
    ].filter((detail): detail is string => detail !== undefined),
  );
};

const isMission = (location: Location, intel: KnownLocationIntel): boolean =>
  location.type === "enemy" ||
  location.type === "boss" ||
  (intel.visited &&
    (Boolean(location.hasQuest) || Boolean(location.contracts?.length)));

const isUnresolved = (location: Location): boolean => {
  switch (location.type) {
    case "enemy":
      return !location.defeated;
    case "boss":
      return !location.bossDefeated;
    case "wreck_field":
      return !location.wreckExhausted;
    case "asteroid_belt":
      return !location.mined;
    case "derelict_ship":
      return !location.derelictExplored;
    case "distress_signal":
      return !location.signalResolved;
    case "space_monster":
      return location.spaceMonsterResolved !== "hunted";
    default:
      return true;
  }
};

export const getNavigatorTierOptions = (
  input: TierInput,
): GalaxyTierAll[] =>
  canSeeTier4(input.ship.modules, input.artifacts, input.scanRange)
    ? [1, 2, 3, 4]
    : [1, 2, 3];

export const getNavigatorResults = (input: NavigatorInput): NavigatorResult[] => {
  const results: NavigatorResult[] = [];
  const tiers = new Set(getNavigatorTierOptions(input));
  const query = input.filters.query?.trim().toLocaleLowerCase() ?? "";

  for (const sector of input.galaxy.sectors) {
    if (
      !tiers.has(sector.tier) ||
      (input.filters.tier &&
        input.filters.tier !== "all" &&
        sector.tier !== input.filters.tier)
    ) {
      continue;
    }

    for (const location of sector.locations) {
      const intel =
        input.knownLocationIntel[
          getNavigatorLocationKey(sector.id, location.id)
        ];
      if (
        !intel ||
        (query &&
          !`${sector.name} ${location.name}`.toLocaleLowerCase().includes(query))
      ) {
        continue;
      }

      switch (input.filters.category) {
        case "trade": {
          const result = getTradeResult(input, sector, location, intel);
          if (result) results.push(result);
          break;
        }
        case "crew":
          results.push(...getCrewResults(input, sector, location, intel));
          break;
        case "planets": {
          const result = getPlanetResult(input, sector, location, intel);
          if (result) results.push(result);
          break;
        }
        case "missions":
          if (
            isMission(location, intel) &&
            (!input.filters.unresolvedOnly || isUnresolved(location))
          ) {
            results.push(
              createResult(sector, location, "missions", [location.type]),
            );
          }
          break;
        case "discovery":
          if (
            DISCOVERY_TYPES.has(location.type) &&
            (!input.filters.unresolvedOnly || isUnresolved(location))
          ) {
            results.push(
              createResult(sector, location, "discovery", [location.type]),
            );
          }
          break;
      }
    }
  }

  return results.sort(
    (left, right) =>
      left.sectorTier - right.sectorTier ||
      left.sectorName.localeCompare(right.sectorName) ||
      left.locationName.localeCompare(right.locationName) ||
      left.key.localeCompare(right.key),
  );
};
