"use client";

import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { TRADE_GOODS } from "@/game/constants/goods";
import { PLANET_TYPES } from "@/game/constants/planets";
import { RACES } from "@/game/constants/races";
import { CREW_TRAITS, MUTATION_TRAITS } from "@/game/constants/traits";
import { getNavigatorResults, getNavigatorTierOptions } from "@/game/navigator/search";
import { useGameStore } from "@/game/store";
import type {
  NavigatorCategory,
  NavigatorFilters,
  NavigatorResult,
} from "@/game/types/navigator";
import type {
  Goods,
  MutationTraitId,
  Profession,
  RaceId,
  TraitId,
} from "@/game/types";
import type { PlanetType } from "@/game/types/planets";
import type { ReputationLevel } from "@/game/types/reputation";
import { getLocationName } from "@/lib/translationHelpers";
import { useTranslation } from "@/lib/useTranslation";
import { SectionPanel } from "./SectionPanel";

const CATEGORIES: NavigatorCategory[] = [
  "trade",
  "crew",
  "planets",
  "missions",
  "discovery",
];
const PROFESSIONS: Profession[] = [
  "pilot",
  "engineer",
  "medic",
  "scout",
  "scientist",
  "gunner",
];
const REPUTATION_LEVELS: ReputationLevel[] = [
  "hostile",
  "unfriendly",
  "neutral",
  "friendly",
  "allied",
];
const TRAIT_IDS: TraitId[] = [
  ...Object.values(CREW_TRAITS).flatMap((traits) =>
    traits.map((trait) => trait.id),
  ),
  ...MUTATION_TRAITS,
];

const EMPTY_FILTERS: NavigatorFilters = {
  category: "trade",
  query: "",
  tier: "all",
};
const LOCATION_KIND_TRANSLATION_KEYS: Partial<
  Record<NavigatorResult["kind"], string>
> = {
  enemy: "enemy_ship",
  storm: "cosmic_storm",
};

const formatId = (value: string) => value.replaceAll("_", " ");
const optionalValue = <T extends string>(value: string): T | undefined =>
  value === "" ? undefined : (value as T);

export function NavigatorResultDetails({
  result,
}: {
  result: NavigatorResult;
}) {
  const { t } = useTranslation();
  const kind = LOCATION_KIND_TRANSLATION_KEYS[result.kind] ?? result.kind;

  return (
    <div className="mt-2 space-y-1 text-xs leading-relaxed text-[#9aa59a]">
      <div>
        {t("navigator.facts.kind", { value: t(`location_types.${kind}`) })}
      </div>
      {result.crew && (
        <>
          <div>
            {t("navigator.facts.crew", {
              race: t(`race_names.${result.crew.race}`),
              profession: t(`professions.${result.crew.profession}`),
              level: result.crew.level,
            })}
          </div>
          {result.crew.traits.length > 0 && (
            <div>
              {t("navigator.facts.traits", {
                values: result.crew.traits.map(formatId).join(", "),
              })}
            </div>
          )}
        </>
      )}
      {result.details.length > 0 && !result.crew && (
        <div>
          {t("navigator.facts.details", { values: result.details.join(" · ") })}
        </div>
      )}
    </div>
  );
}

export function NavigatorPanel() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<NavigatorFilters>(EMPTY_FILTERS);
  const navigatorData = useGameStore(
    useShallow((state) => ({
      artifacts: state.artifacts,
      friendlyShipStock: state.friendlyShipStock,
      hiredCrew: state.hiredCrew,
      hiredCrewFromShips: state.hiredCrewFromShips,
      knownLocationIntel: state.knownLocationIntel,
      knownTradeStations: state.knownTradeStations,
      raceReputation: state.raceReputation,
      sectors: state.galaxy.sectors,
      shipModules: state.ship.modules,
      stationPrices: state.stationPrices,
    })),
  );
  const scanRange = useGameStore((state) => state.getEffectiveScanRange());
  const navigatorTargets = useGameStore((state) => state.navigatorTargets);
  const { clearNavigatorTargets, closeNavigator, pinNavigatorTarget, unpinNavigatorTarget } =
    useGameStore(
      useShallow((state) => ({
        clearNavigatorTargets: state.clearNavigatorTargets,
        closeNavigator: state.closeNavigator,
        pinNavigatorTarget: state.pinNavigatorTarget,
        unpinNavigatorTarget: state.unpinNavigatorTarget,
      })),
    );

  const results = useMemo(
    () =>
      getNavigatorResults({
        ...navigatorData,
        filters,
        galaxy: { sectors: navigatorData.sectors, nebulae: [] },
        ship: { modules: navigatorData.shipModules },
        scanRange,
      }),
    [filters, navigatorData, scanRange],
  );
  const tiers = useMemo(
    () =>
      getNavigatorTierOptions({
        artifacts: navigatorData.artifacts,
        ship: { modules: navigatorData.shipModules },
        scanRange,
      }),
    [navigatorData, scanRange],
  );

  const updateFilters = (patch: Partial<NavigatorFilters>) =>
    setFilters((current) => ({ ...current, ...patch }));
  const isMarked = (result: NavigatorResult) =>
    navigatorTargets.some(
      (target) =>
        target.sectorId === result.sectorId &&
        target.locationId === result.locationId,
    );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto font-['Orbitron'] text-base font-bold text-accent">
          ▸ {t("navigator.title")}
        </h2>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={navigatorTargets.length === 0}
          onClick={clearNavigatorTargets}
          className="border-[#ffb000] bg-transparent text-xs text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810]"
        >
          {t("navigator.clear_markers")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={closeNavigator}
          className="border-ring bg-transparent text-xs text-ring hover:bg-ring hover:text-[#050810]"
        >
          {t("navigator.close")}
        </Button>
      </div>

      <SectionPanel padding="sm" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs text-[#9aa59a]">
          {t("navigator.filters.category")}
          <select
            value={filters.category}
            onChange={(event) =>
              updateFilters({ category: event.target.value as NavigatorCategory })
            }
            className="mt-1 w-full border border-[#00ff4166] bg-[#071019] px-2 py-1 text-[#d7f8ff]"
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {t(`navigator.categories.${category}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[#9aa59a]">
          {t("navigator.filters.search")}
          <input
            value={filters.query}
            onChange={(event) => updateFilters({ query: event.target.value })}
            placeholder={t("navigator.filters.search_placeholder")}
            className="mt-1 w-full border border-[#00ff4166] bg-[#071019] px-2 py-1 text-[#d7f8ff] placeholder:text-[#53605b]"
          />
        </label>
        <label className="text-xs text-[#9aa59a]">
          {t("navigator.filters.tier")}
          <select
            value={filters.tier}
            onChange={(event) =>
              updateFilters({
                tier:
                  event.target.value === "all"
                    ? "all"
                    : Number(event.target.value) as 1 | 2 | 3 | 4,
              })
            }
            className="mt-1 w-full border border-[#00ff4166] bg-[#071019] px-2 py-1 text-[#d7f8ff]"
          >
            <option value="all">{t("navigator.filters.all_tiers")}</option>
            {tiers.map((tier) => (
              <option key={tier} value={tier}>
                {t("navigator.filters.tier_value", { tier })}
              </option>
            ))}
          </select>
        </label>

        {filters.category === "trade" && (
          <label className="text-xs text-[#9aa59a]">
            {t("navigator.filters.good")}
            <select
              value={filters.goodId ?? ""}
              onChange={(event) =>
                updateFilters({
                  goodId: optionalValue<Goods>(event.target.value),
                })
              }
              className="mt-1 w-full border border-[#00ff4166] bg-[#071019] px-2 py-1 text-[#d7f8ff]"
            >
              <option value="">{t("navigator.filters.any")}</option>
              {Object.keys(TRADE_GOODS).map((goodId) => (
                <option key={goodId} value={goodId}>
                  {t(`trade.goods.${goodId}`)}
                </option>
              ))}
            </select>
          </label>
        )}

        {filters.category === "crew" && (
          <>
            <label className="text-xs text-[#9aa59a]">
              {t("navigator.filters.race")}
              <select
                value={filters.race ?? ""}
                onChange={(event) =>
                  updateFilters({ race: optionalValue<RaceId>(event.target.value) })
                }
                className="mt-1 w-full border border-[#00ff4166] bg-[#071019] px-2 py-1 text-[#d7f8ff]"
              >
                <option value="">{t("navigator.filters.any")}</option>
                {Object.keys(RACES).map((race) => (
                  <option key={race} value={race}>
                    {t(`race_names.${race}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-[#9aa59a]">
              {t("navigator.filters.profession")}
              <select
                value={filters.profession ?? ""}
                onChange={(event) =>
                  updateFilters({
                    profession: optionalValue<Profession>(event.target.value),
                  })
                }
                className="mt-1 w-full border border-[#00ff4166] bg-[#071019] px-2 py-1 text-[#d7f8ff]"
              >
                <option value="">{t("navigator.filters.any")}</option>
                {PROFESSIONS.map((profession) => (
                  <option key={profession} value={profession}>
                    {t(`professions.${profession}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-[#9aa59a]">
              {t("navigator.filters.min_level")}
              <select
                value={filters.minLevel ?? ""}
                onChange={(event) =>
                  updateFilters({
                    minLevel: event.target.value
                      ? Number(event.target.value)
                      : undefined,
                  })
                }
                className="mt-1 w-full border border-[#00ff4166] bg-[#071019] px-2 py-1 text-[#d7f8ff]"
              >
                <option value="">{t("navigator.filters.any")}</option>
                {[1, 2, 3, 4, 5].map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-[#9aa59a]">
              {t("navigator.filters.trait")}
              <select
                value={filters.trait ?? ""}
                onChange={(event) =>
                  updateFilters({ trait: optionalValue<TraitId>(event.target.value) })
                }
                className="mt-1 w-full border border-[#00ff4166] bg-[#071019] px-2 py-1 text-[#d7f8ff]"
              >
                <option value="">{t("navigator.filters.any")}</option>
                {TRAIT_IDS.map((trait) => (
                  <option key={trait} value={trait}>
                    {formatId(trait)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-[#9aa59a]">
              {t("navigator.filters.mutation")}
              <select
                value={filters.mutation ?? ""}
                onChange={(event) =>
                  updateFilters({
                    mutation: optionalValue<MutationTraitId>(event.target.value),
                  })
                }
                className="mt-1 w-full border border-[#00ff4166] bg-[#071019] px-2 py-1 text-[#d7f8ff]"
              >
                <option value="">{t("navigator.filters.any")}</option>
                {MUTATION_TRAITS.map((mutation) => (
                  <option key={mutation} value={mutation}>
                    {formatId(mutation)}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {filters.category === "planets" && (
          <>
            <label className="text-xs text-[#9aa59a]">
              {t("navigator.filters.planet_type")}
              <select
                value={filters.planetType ?? ""}
                onChange={(event) =>
                  updateFilters({
                    planetType: optionalValue<PlanetType>(event.target.value),
                  })
                }
                className="mt-1 w-full border border-[#00ff4166] bg-[#071019] px-2 py-1 text-[#d7f8ff]"
              >
                <option value="">{t("navigator.filters.any")}</option>
                {PLANET_TYPES.map((planetType) => (
                  <option key={planetType} value={planetType}>
                    {planetType}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-[#9aa59a]">
              {t("navigator.filters.population")}
              <select
                value={filters.population ?? ""}
                onChange={(event) =>
                  updateFilters({
                    population: optionalValue<"inhabited" | "empty">(
                      event.target.value,
                    ),
                  })
                }
                className="mt-1 w-full border border-[#00ff4166] bg-[#071019] px-2 py-1 text-[#d7f8ff]"
              >
                <option value="">{t("navigator.filters.any")}</option>
                <option value="inhabited">
                  {t("navigator.population.inhabited")}
                </option>
                <option value="empty">{t("navigator.population.empty")}</option>
              </select>
            </label>
            <label className="text-xs text-[#9aa59a]">
              {t("navigator.filters.race")}
              <select
                value={filters.race ?? ""}
                onChange={(event) =>
                  updateFilters({ race: optionalValue<RaceId>(event.target.value) })
                }
                className="mt-1 w-full border border-[#00ff4166] bg-[#071019] px-2 py-1 text-[#d7f8ff]"
              >
                <option value="">{t("navigator.filters.any")}</option>
                {Object.keys(RACES).map((race) => (
                  <option key={race} value={race}>
                    {t(`race_names.${race}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-[#9aa59a]">
              {t("navigator.filters.reputation")}
              <select
                value={filters.reputation ?? ""}
                onChange={(event) =>
                  updateFilters({
                    reputation: optionalValue<ReputationLevel>(event.target.value),
                  })
                }
                className="mt-1 w-full border border-[#00ff4166] bg-[#071019] px-2 py-1 text-[#d7f8ff]"
              >
                <option value="">{t("navigator.filters.any")}</option>
                {REPUTATION_LEVELS.map((reputation) => (
                  <option key={reputation} value={reputation}>
                    {t(`reputation.levels.${reputation}`)}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {(filters.category === "missions" || filters.category === "discovery") && (
          <label className="flex items-center gap-2 self-end pb-1 text-xs text-[#9aa59a]">
            <input
              type="checkbox"
              checked={Boolean(filters.unresolvedOnly)}
              onChange={(event) =>
                updateFilters({ unresolvedOnly: event.target.checked })
              }
            />
            {t("navigator.filters.unresolved")}
          </label>
        )}
      </SectionPanel>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {results.length === 0 ? (
          <SectionPanel className="text-center text-sm text-[#9aa59a]">
            {t("navigator.empty")}
          </SectionPanel>
        ) : (
          results.map((result) => {
            const marked = isMarked(result);
            return (
              <SectionPanel key={result.key} padding="sm" tone="cyan">
                <div className="flex flex-wrap items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-['Orbitron'] text-sm font-bold text-[#d7f8ff]">
                      {getLocationName(result.locationName, t)}
                    </div>
                    <div className="mt-1 text-[11px] text-ring">
                      {t("navigator.facts.sector", {
                        name: result.sectorName,
                        tier: result.sectorTier,
                      })}
                    </div>
                    <NavigatorResultDetails result={result} />
                    {result.trade ? (
                      <div className="mt-2 text-xs text-[#b8dfc2]">
                        <div>{t("navigator.prices.known")}</div>
                        <div>
                          {t("navigator.prices.buy", { price: result.trade.buy })} ·{" "}
                          {t("navigator.prices.sell", { price: result.trade.sell })}
                        </div>
                      </div>
                    ) : filters.category === "trade" ? (
                      <div className="mt-2 text-xs text-[#77857d]">
                        {t("navigator.prices.unknown")}
                      </div>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      marked
                        ? unpinNavigatorTarget(result)
                        : pinNavigatorTarget(result)
                    }
                    className={
                      marked
                        ? "border-[#ffb000] bg-transparent text-xs text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810]"
                        : "border-[#00ff41] bg-transparent text-xs text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810]"
                    }
                  >
                    {t(marked ? "navigator.unmark" : "navigator.mark")}
                  </Button>
                </div>
              </SectionPanel>
            );
          })
        )}
      </div>
    </div>
  );
}
