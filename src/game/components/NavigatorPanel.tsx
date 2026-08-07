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
  PopulationKnowledge,
  NavigatorResult,
  NavigatorSort,
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
import { getLocationName, getPlanetTypeName } from "@/lib/translationHelpers";
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
const MINERAL_BUYBACK_GOODS: Goods[] = ["minerals", "rare_minerals"];
export const NAVIGATOR_TRAIT_IDS: TraitId[] = [
  ...CREW_TRAITS.positive,
  ...CREW_TRAITS.negative,
].map((trait) => trait.id);

const EMPTY_FILTERS: NavigatorFilters = {
  category: "trade",
  query: "",
  tier: "all",
  sort: "tier",
};
const LOCATION_KIND_TRANSLATION_KEYS: Partial<
  Record<NavigatorResult["kind"], string>
> = {
  enemy: "enemy_ship",
  storm: "cosmic_storm",
};

const optionalValue = <T extends string>(value: string): T | undefined =>
  value === "" ? undefined : (value as T);
const getLocationKindLabel = (kind: string, t: (key: string) => string) =>
  t(
    `location_types.${
      LOCATION_KIND_TRANSLATION_KEYS[kind as NavigatorResult["kind"]] ?? kind
    }`,
  );
const getResultDetailLabel = (
  detail: string,
  result: NavigatorResult,
  t: (key: string) => string,
) => {
  if (result.category === "planets") {
    if (PLANET_TYPES.includes(detail as PlanetType)) {
      return getPlanetTypeName(detail, t);
    }
    if (detail === "inhabited" || detail === "empty") {
      return t(`navigator.population.${detail}`);
    }
    if (RACES[detail as RaceId]) return t(`race_names.${detail}`);
  }
  if (result.category === "trade" && TRADE_GOODS[detail as Goods]) {
    return t(`trade.goods.${detail}`);
  }
  if (result.category === "missions" || result.category === "discovery") {
    return getLocationKindLabel(detail, t);
  }
  return detail;
};

export function NavigatorResultDetails({
  result,
}: {
  result: NavigatorResult;
}) {
  const { t } = useTranslation();

  return (
    <div className="mt-2 space-y-1 text-xs leading-relaxed text-[#9aa59a]">
      <div>
        {t("navigator.facts.kind", {
          value: getLocationKindLabel(result.kind, t),
        })}
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
                values: result.crew.traits
                  .map((trait) => t(`racial_traits.${trait}.name`))
                  .join(", "),
              })}
            </div>
          )}
        </>
      )}
      {result.details.length > 0 && !result.crew && (
        <div>
          {t("navigator.facts.details", {
            values: result.details
              .map((detail) => getResultDetailLabel(detail, result, t))
              .join(" · "),
          })}
        </div>
      )}
    </div>
  );
}

export function NavigatorPanel() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<NavigatorFilters>(EMPTY_FILTERS);
  const [showMobileAdvancedFilters, setShowMobileAdvancedFilters] = useState(false);
  const navigatorData = useGameStore(
    useShallow((state) => ({
      activeCrisis: state.activeCrisis,
      artifacts: state.artifacts,
      friendlyShipStock: state.friendlyShipStock,
      hiredCrew: state.hiredCrew,
      hiredCrewFromShips: state.hiredCrewFromShips,
      knownLocationIntel: state.knownLocationIntel,
      knownTradeStations: state.knownTradeStations,
      raceReputation: state.raceReputation,
      sectors: state.galaxy.sectors,
      shipModules: state.ship.modules,
      shipTradeGoods: state.ship.tradeGoods,
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
        ship: {
          modules: navigatorData.shipModules,
          tradeGoods: navigatorData.shipTradeGoods,
        },
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
  const hasAdvancedFilters =
    filters.category === "trade" ||
    filters.category === "crew" ||
    filters.category === "planets" ||
    filters.category === "missions" ||
    filters.category === "discovery";
  const cargoGoodCount = navigatorData.shipTradeGoods.filter(
    ({ quantity }) => quantity > 0,
  ).length;
  const isMarked = (result: NavigatorResult) =>
    navigatorTargets.some(
      (target) =>
        target.sectorId === result.sectorId &&
        target.locationId === result.locationId,
    );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto font-['Orbitron'] text-base font-bold text-accent">
          ▸ {t("navigator.title")}
        </h2>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setFilters(EMPTY_FILTERS);
            setShowMobileAdvancedFilters(false);
          }}
          className="border-[#00ff41] bg-transparent text-xs text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810]"
        >
          {t("navigator.reset_filters")}
        </Button>
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

      <SectionPanel padding="sm" className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        <label className="text-xs text-[#9aa59a]">
          {t("navigator.filters.category")}
          <select
            value={filters.category}
            onChange={(event) => {
              const category = event.target.value as NavigatorCategory;
              setShowMobileAdvancedFilters(false);
              updateFilters({
                category,
                sort:
                  category === "trade" ||
                  (filters.sort !== "sell_desc" && filters.sort !== "buy_asc")
                    ? filters.sort
                    : "tier",
              });
            }}
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
        <label className="text-xs text-[#9aa59a]">
          {t("navigator.filters.sort")}
          <select
            value={filters.sort}
            onChange={(event) =>
              updateFilters({ sort: event.target.value as NavigatorSort })
            }
            className="mt-1 w-full border border-[#00ff4166] bg-[#071019] px-2 py-1 text-[#d7f8ff]"
          >
            <option value="tier">{t("navigator.sort.tier")}</option>
            <option value="name">{t("navigator.sort.name")}</option>
            {filters.category === "trade" && (
              <>
                <option value="sell_desc">{t("navigator.sort.sell_desc")}</option>
                <option value="buy_asc">{t("navigator.sort.buy_asc")}</option>
              </>
            )}
          </select>
        </label>

        {hasAdvancedFilters && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-expanded={showMobileAdvancedFilters}
            onClick={() => setShowMobileAdvancedFilters((current) => !current)}
            className="col-span-2 border-[#00d4ff] bg-transparent text-xs text-[#00d4ff] hover:bg-[#00d4ff] hover:text-[#050810] lg:hidden"
          >
            {showMobileAdvancedFilters ? "▾" : "▸"} {t("navigator.filters.advanced")}
          </Button>
        )}

        <div
          className={
            showMobileAdvancedFilters
              ? "col-span-2 grid max-h-48 grid-cols-2 gap-2 overflow-y-auto pr-1 lg:contents"
              : "hidden lg:contents"
          }
        >
          {filters.category === "trade" && (
          <>
            <label className="flex items-center gap-2 self-end pb-1 text-xs text-[#9aa59a]">
              <input
                type="checkbox"
                checked={Boolean(filters.cargoOnly)}
                disabled={!filters.cargoOnly && cargoGoodCount === 0}
                onChange={(event) =>
                  updateFilters({
                    cargoOnly: event.target.checked || undefined,
                    goodId: event.target.checked ? undefined : filters.goodId,
                    sort: event.target.checked ? "sell_desc" : filters.sort,
                  })
                }
              />
              {t("navigator.filters.cargo_goods_only")}
            </label>
            {!filters.cargoOnly && (
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
                  {(filters.mineralBuybackOnly
                    ? MINERAL_BUYBACK_GOODS
                    : Object.keys(TRADE_GOODS)
                  ).map((goodId) => (
                    <option key={goodId} value={goodId}>
                      {t(`trade.goods.${goodId}`)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex items-center gap-2 self-end pb-1 text-xs text-[#9aa59a]">
              <input
                type="checkbox"
                checked={Boolean(filters.mineralBuybackOnly)}
                onChange={(event) =>
                  updateFilters({
                    mineralBuybackOnly: event.target.checked,
                    goodId:
                      event.target.checked &&
                      filters.goodId &&
                      !MINERAL_BUYBACK_GOODS.includes(filters.goodId)
                        ? undefined
                        : filters.goodId,
                  })
                }
              />
              {t("navigator.filters.mineral_buyback_only")}
            </label>
          </>
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
                {NAVIGATOR_TRAIT_IDS.map((trait) => (
                  <option key={trait} value={trait}>
                    {t(`racial_traits.${trait}.name`)}
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
                    {t(`racial_traits.${mutation}.name`)}
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
                    {getPlanetTypeName(planetType, t)}
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
                <option value="">{t("navigator.population.any")}</option>
                <option value="inhabited">
                  {t("navigator.population.inhabited")}
                </option>
                <option value="empty">{t("navigator.population.empty")}</option>
              </select>
            </label>
            <label className="text-xs text-[#9aa59a]">
              {t("navigator.filters.population_knowledge")}
              <select
                value={filters.populationKnowledge ?? ""}
                onChange={(event) =>
                  updateFilters({
                    populationKnowledge: optionalValue<PopulationKnowledge>(
                      event.target.value,
                    ),
                  })
                }
                className="mt-1 w-full border border-[#00ff4166] bg-[#071019] px-2 py-1 text-[#d7f8ff]"
              >
                <option value="">{t("navigator.filters.any")}</option>
                <option value="known">{t("navigator.population.known")}</option>
                <option value="unknown">
                  {t("navigator.population.unknown")}
                </option>
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
        </div>
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
                        name: getLocationName(result.sectorName, t),
                        tier: result.sectorTier,
                      })}
                    </div>
                    <NavigatorResultDetails result={result} />
                    {result.trade ? (
                      <div className="mt-2 text-xs text-[#b8dfc2]">
                        <div>{t("navigator.prices.known")}</div>
                        {result.trade.cargoQuantity !== undefined && (
                          <div>
                            {t("navigator.prices.cargo", {
                              quantity: result.trade.cargoQuantity,
                            })}
                          </div>
                        )}
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
