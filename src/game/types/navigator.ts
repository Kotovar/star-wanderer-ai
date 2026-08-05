import type { MutationTraitId, Profession, TraitId } from "./crew";
import type { Goods } from "./goods";
import type { GalaxyTierAll } from "./locations/galaxy";
import type { LocationType } from "./locations/locations";
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
  | "planets"
  | "missions"
  | "discovery";

export type NavigatorFilters = {
  category: NavigatorCategory;
  query: string;
  tier: GalaxyTierAll | "all";
  goodId?: Goods;
  race?: RaceId;
  profession?: Profession;
  minLevel?: number;
  trait?: TraitId;
  mutation?: MutationTraitId;
  planetType?: PlanetType;
  population?: "inhabited" | "empty";
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
  trade?: { goodId: Goods; buy: number; sell: number };
  crew?: {
    race: RaceId;
    profession: Profession;
    level: number;
    traits: TraitId[];
    mutation?: MutationTraitId;
  };
};
