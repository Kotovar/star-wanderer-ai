import type { StationConfig, StationName } from "@/game/types";
import {
  getStationCraftingCapabilities,
  getStationInstallationCapabilities,
} from "../galaxy/config.ts";

export const STATION_DISCOVERY_ICONS = {
  trade: "⚖️",
  military: "⚔️",
  research: "🔬",
  mining: "⛏️",
  shipyard: "🚧",
  medical: "⚕️",
  diplomatic: "🕊️",
  pirate: "☠️",
} satisfies Record<StationName, string>;

type StationRateKey =
  | "goods"
  | "minerals"
  | "rare_minerals"
  | "weapons"
  | "modules"
  | "mineral_sale"
  | "rare_mineral_sale"
  | "cargo_modules";

type StationRate = {
  key: StationRateKey;
  factor: number;
  kind: "discount" | "bonus";
};

export function getStationRates(config?: StationConfig): StationRate[] {
  const rates: StationRate[] = [];
  const add = (
    key: StationRateKey,
    factor: number | undefined,
    kind: StationRate["kind"],
  ) => {
    if (factor !== undefined && factor !== 1) {
      rates.push({ key, factor, kind });
    }
  };

  add("goods", config?.priceDiscount, "discount");
  add("minerals", config?.mineralDiscount, "discount");
  add("rare_minerals", config?.rareMineralDiscount, "discount");
  add("weapons", config?.weaponDiscount, "discount");
  add("modules", config?.moduleDiscount, "discount");
  add("mineral_sale", config?.mineralSellBonus, "bonus");
  add("rare_mineral_sale", config?.rareMineralSellBonus, "bonus");
  add("cargo_modules", config?.cargoBonus, "bonus");

  return rates;
}

export function getStationRateValue(rate: StationRate): string {
  const percent = Math.round(
    (rate.kind === "discount" ? 1 - rate.factor : rate.factor - 1) * 100,
  );
  return `${rate.kind === "discount" ? "-" : "+"}${percent}%`;
}

type StationServiceKey =
  | "refuel"
  | "repairs"
  | "shop"
  | "hiring"
  | "probes"
  | "scrap"
  | "weapon_removal"
  | "trade"
  | "crafting"
  | "install"
  | "healing"
  | "augmentation"
  | "mutation_cure"
  | "genetic_therapy"
  | "research"
  | "mineral_buyback"
  | "diplomacy"
  | "black_market"
  | "pirate_contracts"
  | "laundering";

export function getStationServiceKeys(
  stationType: StationName,
  config?: StationConfig,
): StationServiceKey[] {
  if (stationType === "pirate") {
    return [
      "refuel",
      "repairs",
      "probes",
      "scrap",
      "weapon_removal",
      "black_market",
      "pirate_contracts",
      "laundering",
    ];
  }

  const services: StationServiceKey[] = [
    "refuel",
    "repairs",
    "shop",
    "hiring",
    "probes",
    "scrap",
    "weapon_removal",
  ];

  const crafting = getStationCraftingCapabilities(stationType, config);
  const installation = getStationInstallationCapabilities(stationType, config);

  if (config?.allowsTrade ?? true) services.push("trade");
  if (crafting.weapons || crafting.modules) services.push("crafting");
  if (installation.modules || installation.weapons) services.push("install");
  if (config?.allowsCrewHeal) {
    services.push(
      "healing",
      "augmentation",
      "mutation_cure",
      "genetic_therapy",
    );
  }
  if (stationType === "research") services.push("research");
  if (stationType === "mining") services.push("mineral_buyback");
  if (stationType === "diplomatic") services.push("diplomacy");

  return services;
}
