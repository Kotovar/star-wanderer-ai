import type { MutationTraitId, Profession, TraitId } from "./crew";
import type { Goods } from "./goods";
import type { GalaxyTierAll } from "./locations/galaxy";
import type { LocationType } from "./locations/locations";
import type { ModuleType } from "./modules";
import type { PlanetType } from "./planets";
import type { RaceId } from "./races";
import type { ReputationLevel } from "./reputation";

export type NavigatorTarget = { sectorId: number; locationId: string };

export type KnownLocationIntel = {
  sectorId: number;
  locationId: string;
  highestScanRange: number;
  visited: boolean;
};

export const getNavigatorLocationKey = (sectorId: number, locationId: string) =>
  `${sectorId}:${locationId}`;

export type NavigatorCategory =
  | "trade"
  | "crew"
  | "modules"
  | "planets"
  | "missions"
  | "discovery";

export type NavigatorSort =
  | "tier"
  | "name"
  | "sell_desc"
  | "buy_asc";

export type PopulationKnowledge = "known" | "unknown";

export type NavigatorFilters = {
  category: NavigatorCategory;
  query: string;
  tier: GalaxyTierAll | "all";
  sort: NavigatorSort;
  goodId?: Goods;
  cargoOnly?: boolean;
  mineralBuybackOnly?: boolean;
  race?: RaceId;
  profession?: Profession;
  minLevel?: number;
  trait?: TraitId;
  mutation?: MutationTraitId;
  moduleType?: ModuleType;
  moduleLevel?: number;
  planetType?: PlanetType;
  population?: "inhabited" | "empty";
  populationKnowledge?: PopulationKnowledge;
  reputation?: ReputationLevel;
  unresolvedOnly?: boolean;
};

export type NavigatorResult = {
  key: string;
  sectorId: number;
  sectorName: string;
  sectorTier: GalaxyTierAll;
  locationId: string;
  locationName: string;
  category: NavigatorCategory;
  kind: LocationType;
  details: string[];
  trade?: {
    goodId: Goods;
    buy: number;
    sell: number;
    cargoQuantity?: number;
  };
  crew?: {
    race: RaceId;
    profession: Profession;
    level: number;
    traits: TraitId[];
    mutation?: MutationTraitId;
  };
  module?: {
    type: ModuleType;
    level: number;
  };
};
