"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useGameStore } from "@/game/store";
import { PLANET_SPECIALIZATIONS } from "@/game/constants/planets";
import { RACES } from "@/game/constants/races";
import { Button } from "@/components/ui/button";
import { PlanetSpecializationPanel } from "./PlanetSpecializationPanel";
import { DELIVERY_GOODS } from "@/game/constants/contracts";
import { DELIVERY_CONTRACT_CARGO_AMOUNT } from "@/game/slices/contracts/constants";
import type { DeliveryGoods } from "@/game/types/contracts";
import { TRADE_GOODS } from "@/game/constants/goods";
import type { Goods } from "@/game/types/goods";
import { EmptyPlanetPanel } from "./EmptyPlanetPanel";
import { PlanetExpeditionSetup } from "./PlanetExpeditionSetup";
import { PlanetExplorationPanel } from "./PlanetExplorationPanel";
import { getPlanetBackgroundClass } from "@/game/planets";
import { useTranslation } from "@/lib/useTranslation";
import {
    getLocationName,
    getPlanetDescription,
    getPlanetTypeName,
} from "@/lib/translationHelpers";
import {
    getRaceReputation,
    getRaceReputationLevel,
    isRaceContractAvailable,
} from "@/game/reputation/utils";
import { isContractTargetAvailable } from "@/game/contracts/targetAvailability";
import {
    REPUTATION_COLORS,
    REPUTATION_ICONS,
    getReputationLevel,
} from "@/game/types/reputation";
import { RaceSprite } from "./RaceSprite";
import { ContractReputationImpact } from "./ContractReputationImpact";

const RACE_PLANET_BACKGROUNDS = {
    human: "/assets/planet-races/human-settlement.webp",
    synthetic: "/assets/planet-races/synthetic-foundry.webp",
    xenosymbiont: "/assets/planet-races/xenosymbiont-grove.webp",
    krylorian: "/assets/planet-races/krylorian-citadel.webp",
    voidborn: "/assets/planet-races/voidborn-rift.webp",
    crystalline: "/assets/planet-races/crystalline-geode.webp",
} satisfies Record<keyof typeof RACES, string>;

const RACE_PLANET_BACKGROUND_URLS = Object.values(RACE_PLANET_BACKGROUNDS);

export function preloadRacePlanetBackgrounds() {
    for (const backgroundUrl of RACE_PLANET_BACKGROUND_URLS) {
        const image = new window.Image();
        image.src = backgroundUrl;
    }
}

export function PlanetPanel() {
    const currentLocation = useGameStore((s) => s.currentLocation);
    const credits = useGameStore((s) => s.credits);
    const activeContracts = useGameStore((s) => s.activeContracts);
    const completedContractIds = useGameStore((s) => s.completedContractIds);
    const raceReputation = useGameStore((s) => s.raceReputation);
    const sectors = useGameStore((s) => s.galaxy.sectors);
    const completedLocations = useGameStore((s) => s.completedLocations);
    const get = useGameStore.getState;

    const { t } = useTranslation();

    const acceptContract = useGameStore((s) => s.acceptContract);
    const completeDeliveryContract = useGameStore(
        (s) => s.completeDeliveryContract,
    );
    const showSectorMap = useGameStore((s) => s.showSectorMap);
    const discoverRace = useGameStore((s) => s.discoverRace);
    const knownRaces = useGameStore((s) => s.knownRaces);
    const ship = useGameStore((s) => s.ship);

    const [showSpecialization, setShowSpecialization] = useState(false);
    const [showExpeditionSetup, setShowExpeditionSetup] = useState(false);
    const activeExpedition = useGameStore((s) => s.activeExpedition);
    const planetId = currentLocation?.id;
    const isOnCooldown = useGameStore(
        (s) => !!(planetId && s.planetCooldowns[planetId]),
    );

    // Discover race when visiting (useEffect to avoid setState during render)
    const dominantRace = currentLocation?.dominantRace;
    const race = dominantRace ? RACES[dominantRace] : null;
    const raceAccent = race?.color ?? "#ffb000";
    const raceBg = race ? `${race.color}12` : "rgba(0,0,0,0)";
    const raceBorder = race ? `${race.color}55` : "#333";
    const raceBackground = dominantRace
        ? RACE_PLANET_BACKGROUNDS[dominantRace]
        : null;

    useEffect(() => {
        if (dominantRace && race && !knownRaces.includes(dominantRace)) {
            discoverRace(dominantRace);
        }
    }, [dominantRace, race, knownRaces, discoverRace]);

    if (!currentLocation) return null;

    // Active expedition for either inhabited or empty planet
    if (activeExpedition && activeExpedition.planetId === currentLocation.id) {
        const currentLocationPlanetTypePlanet = currentLocation.planetType;
        const planetBgClassPlanet = getPlanetBackgroundClass(
            currentLocationPlanetTypePlanet,
        );
        return (
            <div
                className={`flex flex-col h-full min-h-0 rounded-lg border ${planetBgClassPlanet}`}
                style={{ borderColor: raceBorder }}
            >
                <div
                    className="relative z-10 bg-[rgba(5,8,16,0.85)] rounded border flex-1 overflow-y-auto p-4 min-h-0"
                    style={{ borderColor: raceBorder }}
                >
                    <PlanetExplorationPanel />
                </div>
            </div>
        );
    }

    // Empty planet
    if (currentLocation.isEmpty) {
        return <EmptyPlanetPanel />;
    }

    // Inhabited planet
    // Check for delivery contracts that target THIS specific location
    const deliveryContracts = activeContracts.filter(
        (c) =>
            c.type === "delivery" &&
            c.targetLocationId === currentLocation.id &&
            ship.cargo.some((cargo) => cargo.contractId === c.id), // Must have the cargo
    );

    // Filter available contracts - exclude completed ones, race quests with
    // insufficient reputation, and contracts whose target no longer exists
    const availableContracts = (currentLocation.contracts || []).filter(
        (c) =>
            !completedContractIds.includes(c.id) &&
            !activeContracts.some((ac) => ac.id === c.id) &&
            !(
                c.isRaceQuest &&
                c.requiredRace &&
                !isRaceContractAvailable(raceReputation, c.requiredRace)
            ) &&
            isContractTargetAvailable(c, sectors, completedLocations),
    );

    const currentLocationPlanetType = currentLocation.planetType;
    const planetBgClass = getPlanetBackgroundClass(currentLocationPlanetType);
    return (
        <div
            className={`flex flex-col gap-3 p-2 sm:p-3 rounded-lg border ${planetBgClass}`}
            style={{ borderColor: raceAccent + "88" }}
        >
            <div
                className="relative z-10 min-h-0 overflow-hidden rounded border"
                style={{
                    borderColor: raceBorder,
                    backgroundColor: "rgba(5,8,16,0.9)",
                }}
            >
                <section
                    className="relative min-h-0 sm:min-h-52 overflow-hidden border-b"
                    style={{ borderColor: raceBorder }}
                >
                    {raceBackground && (
                        <Image
                            src={raceBackground}
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 50vw, 100vw"
                            preload
                            unoptimized
                            className="object-cover"
                        />
                    )}
                    <div
                        className="absolute inset-0"
                        style={{
                            background:
                                "linear-gradient(90deg, rgba(5,8,16,0.96) 0%, rgba(5,8,16,0.78) 52%, rgba(5,8,16,0.32) 100%)",
                        }}
                    />
                    <div
                        className="absolute inset-x-0 bottom-0 h-2/3"
                        style={{
                            background:
                                "linear-gradient(0deg, rgba(5,8,16,0.92) 0%, rgba(5,8,16,0) 100%)",
                        }}
                    />
                    <div className="relative z-10 flex min-h-0 sm:min-h-52 flex-col justify-between gap-2 sm:gap-5 p-3 sm:p-5">
                        <div className="max-w-2xl">
                            <div
                                className="font-['Orbitron'] font-bold text-lg sm:text-xl"
                                style={{ color: raceAccent }}
                            >
                                ▸ {getLocationName(currentLocation.name, t)} -{" "}
                                {currentLocationPlanetType
                                    ? getPlanetTypeName(
                                          currentLocationPlanetType,
                                          t,
                                      )
                                    : ""}
                            </div>
                            <div className="mt-1 text-sm italic leading-relaxed text-[#b5c1c6]">
                                {currentLocationPlanetType
                                    ? getPlanetDescription(
                                          currentLocationPlanetType,
                                          t,
                                      ) || t("planet_panel.empty_description")
                                    : t("planet_panel.empty_description")}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-end gap-1.5 sm:gap-2 text-xs sm:text-sm">
                            {race && (
                                <div
                                    className="flex max-w-xl items-center gap-1.5 sm:gap-2 border px-2 py-1 sm:px-3 sm:py-2 backdrop-blur-sm"
                                    style={{
                                        borderColor: race.color,
                                        backgroundColor: `${race.color}20`,
                                    }}
                                >
                                    <RaceSprite
                                        race={dominantRace ?? "human"}
                                        size={32}
                                        title={t(`races.${dominantRace}.plural`)}
                                    />
                                    <div>
                                        <div
                                            className="font-bold"
                                            style={{ color: race.color }}
                                        >
                                            {t(
                                                `races.${dominantRace}.plural`,
                                            )}
                                        </div>
                                        {currentLocation.population && (
                                            <div className="text-xs text-[#c0ccd0]">
                                                👥 {currentLocation.population}{" "}
                                                {t("planet_panel.thousands")}
                                            </div>
                                        )}
                                        <div className="hidden max-w-md text-xs leading-relaxed text-[#d0dbdf] sm:block">
                                            {t(
                                                `races.${dominantRace}.description`,
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {raceReputation && dominantRace && (
                                <div
                                    className="flex items-center gap-2 border px-3 py-2 text-xs backdrop-blur-sm"
                                    style={{
                                        borderColor:
                                            REPUTATION_COLORS[
                                                getReputationLevel(
                                                    getRaceReputation(
                                                        raceReputation,
                                                        dominantRace,
                                                    ),
                                                )
                                            ],
                                        backgroundColor: `${
                                            REPUTATION_COLORS[
                                                getReputationLevel(
                                                    getRaceReputation(
                                                        raceReputation,
                                                        dominantRace,
                                                    ),
                                                )
                                            ]
                                        }20`,
                                    }}
                                >
                                    <span>
                                        {
                                            REPUTATION_ICONS[
                                                getReputationLevel(
                                                    getRaceReputation(
                                                        raceReputation,
                                                        dominantRace,
                                                    ),
                                                )
                                            ]
                                        }
                                    </span>
                                    <span
                                        style={{
                                            color: REPUTATION_COLORS[
                                                getReputationLevel(
                                                    getRaceReputation(
                                                        raceReputation,
                                                        dominantRace,
                                                    ),
                                                )
                                            ],
                                        }}
                                    >
                                        {t(
                                            `reputation.levels.${getRaceReputationLevel(raceReputation, dominantRace)}`,
                                        )}
                                    </span>
                                    <span className="text-[#c0ccd0]">
                                        (
                                        {getRaceReputation(
                                            raceReputation,
                                            dominantRace,
                                        ) > 0
                                            ? "+"
                                            : ""}
                                        {getRaceReputation(
                                            raceReputation,
                                            dominantRace,
                                        )}
                                        )
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <div
                    className="flex flex-wrap items-center justify-between gap-3 border-b bg-[rgba(5,8,16,0.9)] p-3 backdrop-blur-sm"
                    style={{ borderColor: raceBorder }}
                >
                    {dominantRace && (
                        <div className="flex flex-wrap gap-2">
                        {currentLocation.expeditionCompleted ? (
                            <div className="text-xs text-[#444] border border-[#222] px-3 py-1.5">
                                {t("planet.surface_explored")}
                            </div>
                        ) : (
                            <Button
                                onClick={() => setShowExpeditionSetup(true)}
                                className="bg-transparent border-2 uppercase tracking-wider text-xs px-3 py-1.5 cursor-pointer"
                                style={{
                                    borderColor: raceAccent,
                                    color: raceAccent,
                                }}
                            >
                                🗺️ {t("planet_panel.explore_planet")}
                            </Button>
                        )}
                        {race &&
                            PLANET_SPECIALIZATIONS[dominantRace] && (
                                <Button
                                    onClick={() => setShowSpecialization(true)}
                                    disabled={isOnCooldown}
                                    className="bg-transparent border-2 text-xs px-3 py-1.5 uppercase"
                                    style={
                                        isOnCooldown
                                            ? {
                                                  borderColor: "#444",
                                                  color: "#444",
                                                  cursor: "not-allowed",
                                              }
                                            : {
                                                  borderColor: raceAccent,
                                                  color: raceAccent,
                                                  cursor: "pointer",
                                              }
                                    }
                                >
                                    {isOnCooldown
                                        ? t("planet_panel.on_cooldown")
                                        : t("planet_panel.activity")}
                                </Button>
                            )}
                        </div>
                    )}
                    <div className="text-right text-xs text-[#aab8bd]">
                        {t("planet_panel.inhabited_planet")}
                        {availableContracts.length > 0
                            ? ` ${t("planet_panel.tasks_available")}`
                            : ` ${t("planet_panel.no_tasks")}`}
                    </div>
                </div>

                <div className="p-4">

                {/* Delivery contracts completion */}
                {deliveryContracts.length > 0 && (
                    <>
                        <div className="font-['Orbitron'] font-bold text-base text-[#00ff41] mt-4">
                            {t("planet_panel.submit_cargo")}
                        </div>
                        <div className="text-xs text-[#888] mb-2">
                            {t("planet_panel.arrived_at_destination")}
                        </div>
                        <div className="flex flex-col gap-2">
                            {deliveryContracts.map((c) => (
                                <div
                                    key={c.id}
                                    className="flex justify-between items-center bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-3"
                                >
                                    <div className="flex-1">
                                        <div className="text-ring font-bold">
                                            {c.desc}
                                        </div>
                                        {c.cargo && (
                                            <div className="text-[11px] mt-1 text-[#00ff41]">
                                                📦 {t("contracts.cargo")}:{" "}
                                                {DELIVERY_GOODS[
                                                    c.cargo as DeliveryGoods
                                                ]?.name} (
                                                {c.quantity ??
                                                    DELIVERY_CONTRACT_CARGO_AMOUNT}
                                                т)
                                            </div>
                                        )}
                                        <div className="text-accent text-xs mt-1">
                                            💰 {c.reward}₢
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() =>
                                            completeDeliveryContract(c.id)
                                        }
                                        className="cursor-pointer bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-xs"
                                    >
                                        {t("planet_panel.submit")}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Available contracts */}
                {availableContracts.length > 0 && (
                    <>
                        <div
                            className="font-['Orbitron'] font-bold text-base mt-4"
                            style={{ color: raceAccent }}
                        >
                            {t("planet_panel.available_tasks")}
                        </div>
                        <div className="flex flex-col gap-2 max-h-75 overflow-y-auto">
                            {availableContracts.map((c) => {
                                const isActive = activeContracts.some(
                                    (ac) => ac.id === c.id,
                                );
                                const isCompleted =
                                    completedContractIds.includes(c.id);
                                if (isCompleted) return null;

                                // Get race info for race-specific quests
                                const raceInfo = c.requiredRace
                                    ? RACES[c.requiredRace]
                                    : null;

                                // Determine destination type text
                                const getDestText = (contract: typeof c) => {
                                    if (!contract.targetLocationType)
                                        return (
                                            contract.targetSectorName ||
                                            "Неизвестно"
                                        );
                                    const typeText =
                                        contract.targetLocationType === "planet"
                                            ? "планете"
                                            : contract.targetLocationType ===
                                                "station"
                                              ? "станции"
                                              : "кораблю";
                                    return `${contract.targetLocationName} (${typeText}), сектор ${contract.targetSectorName}`;
                                };
                                const rawTitle = c.desc.startsWith(
                                    "contracts.",
                                )
                                    ? t(c.desc, {
                                          planetType: c.planetType
                                              ? getPlanetTypeName(
                                                    c.planetType,
                                                    t,
                                                )
                                              : "",
                                      })
                                    : c.desc;
                                const title = c.isRaceQuest
                                    ? stripLeadingEmoji(rawTitle)
                                    : rawTitle;

                                return (
                                    <div
                                        key={c.id}
                                        className={`border p-3 ${isActive ? "opacity-40" : ""} ${c.isRaceQuest ? "border-[#9933ff]" : ""}`}
                                        style={{
                                            background: raceBg,
                                            ...(c.isRaceQuest
                                                ? {}
                                                : { borderColor: raceBorder }),
                                        }}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-ring font-bold flex items-center gap-2 flex-wrap">
                                                    {title}
                                                    {c.isRaceQuest &&
                                                        raceInfo && (
                                                            <span
                                                                className="inline-flex items-center gap-1 text-xs px-1 py-0.5 rounded"
                                                                style={{
                                                                    backgroundColor: `${raceInfo.color}20`,
                                                                    color: raceInfo.color,
                                                                }}
                                                            >
                                                                <RaceSprite
                                                                    race={
                                                                        c.requiredRace ??
                                                                        "human"
                                                                    }
                                                                    size={18}
                                                                    title={t(
                                                                        `races.${c.requiredRace}.plural`,
                                                                    )}
                                                                />
                                                                {t(
                                                                    `races.${c.requiredRace}.plural`,
                                                                )}
                                                            </span>
                                                        )}
                                                </div>
                                            </div>
                                            <Button
                                                disabled={
                                                    isActive || credits < 50
                                                }
                                                onClick={() =>
                                                    acceptContract(c)
                                                }
                                                className="cursor-pointer bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-xs ml-2"
                                            >
                                                {isActive
                                                    ? t("contracts.accepted")
                                                    : t("contracts.accept")}
                                            </Button>
                                        </div>

                                        <ContractReputationImpact contract={c} />

                                        {/* Quest details */}
                                        <div className="text-[11px] mt-1.5 space-y-0.5">
                                            {/* What to do */}
                                            <div className="text-[#00ff41]">
                                                {c.type === "delivery" &&
                                                    c.cargo &&
                                                    t(
                                                        "contracts.desc_delivery",
                                                        {
                                                            cargo: DELIVERY_GOODS[
                                                                c.cargo as DeliveryGoods
                                                            ].name,
                                                            amount: String(
                                                                c.quantity ??
                                                                    DELIVERY_CONTRACT_CARGO_AMOUNT,
                                                            ),
                                                            destination:
                                                                getDestText(
                                                                    c,
                                                                ) || "",
                                                        },
                                                    )}
                                                {c.type === "combat" &&
                                                    t(
                                                        c.isRaceQuest
                                                            ? "contracts.desc_combat_race"
                                                            : "contracts.desc_combat",
                                                        {
                                                            sector:
                                                                c.sectorName ||
                                                                "",
                                                        },
                                                    )}
                                                {c.type === "research" &&
                                                    (c.requiresTechResearch
                                                        ? stripRaceQuestEmoji(
                                                              t(
                                                                  "contracts.desc_research_synth",
                                                              ),
                                                              c.isRaceQuest,
                                                          )
                                                        : t(
                                                              "contracts.desc_research",
                                                              {
                                                                  count:
                                                                      c.requiresAnomalies ||
                                                                      0,
                                                              },
                                                          ))}
                                                {c.type === "bounty" &&
                                                    t("contracts.desc_bounty", {
                                                        threat:
                                                            c.targetThreat || 1,
                                                        sector:
                                                            c.targetSectorName ||
                                                            "",
                                                    })}
                                                {c.type === "diplomacy" &&
                                                    t(
                                                        "contracts.desc_diplomacy",
                                                        {
                                                            planet:
                                                                c.targetPlanetName ||
                                                                "",
                                                            type:
                                                                c.targetPlanetType ||
                                                                "",
                                                            sector:
                                                                c.targetSectorName ||
                                                                "",
                                                        },
                                                    )}
                                                {c.type === "patrol" &&
                                                    t("contracts.desc_patrol", {
                                                        sectors:
                                                            c.targetSectorNames ||
                                                            "",
                                                        visited:
                                                            c.visitedSectors
                                                                ?.length || 0,
                                                        target:
                                                            c.targetSectors
                                                                ?.length || 0,
                                                    })}
                                                {c.type === "rescue" && (
                                                    <>
                                                        {t(
                                                            "contracts.desc_rescue",
                                                            {
                                                                stormName:
                                                                    c.stormName ||
                                                                    t(
                                                                        "storm.radiation_cloud",
                                                                    ),
                                                                sectorName:
                                                                    c.sectorName ||
                                                                    "",
                                                            },
                                                        )}
                                                        {(c.requiredStormIntensity ??
                                                            1) > 1 && (
                                                            <span className="ml-1 text-yellow-400">
                                                                {t(
                                                                    "contracts.rescue_intensity",
                                                                ).replace(
                                                                    "{{intensity}}",
                                                                    String(
                                                                        c.requiredStormIntensity,
                                                                    ),
                                                                )}
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                                {c.type === "mining" &&
                                                    t("contracts.desc_mining")}
                                                {c.type === "scan_planet" &&
                                                    ((c.requiresVisit ?? 1) > 1
                                                        ? t(
                                                              "contracts.desc_scan_multi",
                                                              {
                                                                  count: String(
                                                                      c.requiresVisit,
                                                                  ),
                                                                  planetType:
                                                                      c.planetType ||
                                                                      "",
                                                              },
                                                          )
                                                        : t(
                                                              "contracts.desc_scan",
                                                              {
                                                                  planetType:
                                                                      c.planetType ||
                                                                      "",
                                                                  sector:
                                                                      c.targetSectorName ||
                                                                      "",
                                                              },
                                                          ))}
                                                {c.type === "supply_run" &&
                                                    c.cargo &&
                                                    (() => {
                                                        const cargoOwned =
                                                            get().ship.tradeGoods.find(
                                                                (g) =>
                                                                    g.item ===
                                                                    c.cargo,
                                                            )?.quantity ?? 0;
                                                        return t(
                                                            "contracts.desc_supply",
                                                            {
                                                                cargo:
                                                                    TRADE_GOODS[
                                                                        c.cargo as Goods
                                                                    ]?.name ||
                                                                    "",
                                                                quantity:
                                                                    c.quantity ||
                                                                    0,
                                                                progress:
                                                                    cargoOwned,
                                                                destination:
                                                                    c.sourceName ||
                                                                    c.sourceSectorName ||
                                                                    "",
                                                            },
                                                        );
                                                    })()}
                                                {c.type ===
                                                    "expedition_survey" &&
                                                    t(
                                                        "contracts.desc_expedition_survey_offer",
                                                        {
                                                            planet:
                                                                c.targetPlanetName ??
                                                                "",
                                                            sector:
                                                                c.targetSectorName ??
                                                                "",
                                                            count: String(
                                                                c.requiredDiscoveries ??
                                                                    1,
                                                            ),
                                                        },
                                                    )}
                                                {c.type === "gas_dive" &&
                                                    t(
                                                        "contracts.desc_gas_dive_offer",
                                                        {
                                                            count: String(
                                                                c.requiredMembranes ??
                                                                    1,
                                                            ),
                                                        },
                                                    )}
                                            </div>

                                            {/* Reward */}
                                            <div className="text-[#ffaa00] font-bold">
                                                💰 {c.reward}₢
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {availableContracts.length === 0 &&
                    deliveryContracts.length === 0 && (
                        <div className="text-sm text-[#888] mt-4">
                            {t("contracts.no_contracts")}
                        </div>
                    )}

                <div className="flex gap-2.5 flex-wrap mt-5">
                    <Button
                        onClick={showSectorMap}
                        className="cursor-pointer bg-transparent border-2 border-accent text-accent hover:bg-accent hover:text-[#050810] uppercase tracking-wider"
                    >
                        {t("planet_panel.leave_planet")}
                    </Button>
                </div>
                </div>

                {/* Expedition Setup Modal */}
                {showExpeditionSetup && planetId && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div
                            className="bg-[rgba(10,20,30,0.95)] border-2 p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
                            style={{ borderColor: raceAccent }}
                        >
                            <PlanetExpeditionSetup
                                planetId={planetId}
                                onClose={() => setShowExpeditionSetup(false)}
                            />
                        </div>
                    </div>
                )}

                {/* Planet Specialization Modal */}
                {showSpecialization && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-[rgba(10,20,30,0.95)] border-2 border-[#9933ff] p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
                            <PlanetSpecializationPanel
                                onClose={() => setShowSpecialization(false)}
                            />
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}

function stripRaceQuestEmoji(text: string, isRaceQuest?: boolean): string {
    return isRaceQuest ? stripLeadingEmoji(text) : text;
}

function stripLeadingEmoji(text: string): string {
    return text.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, "");
}
