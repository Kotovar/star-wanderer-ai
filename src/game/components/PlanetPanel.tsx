"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/game/store";
import { PLANET_SPECIALIZATIONS } from "@/game/constants/planets";
import { RACES } from "@/game/constants/races";
import { Button } from "@/components/ui/button";
import { PlanetSpecializationPanel } from "./PlanetSpecializationPanel";
import { DELIVERY_GOODS } from "@/game/constants/contracts";
import { DELIVERY_CONTRACT_CARGO_AMOUNT } from "@/game/slices/contracts/constants";
import type { DeliveryGoods } from "@/game/types/contracts";
import { TRADE_GOODS } from "@/game/constants/goods";
import { RESEARCH_RESOURCES } from "@/game/constants";
import type { Goods } from "@/game/types/goods";
import { PlanetVisual } from "./PlanetVisual";
import { PlanetExpeditionSetup } from "./PlanetExpeditionSetup";
import { PlanetExplorationPanel } from "./PlanetExplorationPanel";
import { getPlanetBackgroundClass } from "@/game/planets";
import { useTranslation } from "@/lib/useTranslation";
import {
    getLocationName,
    getPlanetDescription,
    getPlanetTypeName,
} from "@/lib/translationHelpers";
import { AUGMENTATIONS } from "@/game/constants/augmentations";
import {
    getRaceReputation,
    getRaceReputationLevel,
    isRaceContractAvailable,
} from "@/game/reputation/utils";
import {
    REPUTATION_COLORS,
    REPUTATION_ICONS,
    getReputationLevel,
} from "@/game/types/reputation";

export function PlanetPanel() {
    const currentLocation = useGameStore((s) => s.currentLocation);
    const crew = useGameStore((s) => s.crew);
    const credits = useGameStore((s) => s.credits);
    const activeContracts = useGameStore((s) => s.activeContracts);
    const completedContractIds = useGameStore((s) => s.completedContractIds);
    const raceReputation = useGameStore((s) => s.raceReputation);
    const get = useGameStore.getState;

    const { t } = useTranslation();

    const acceptContract = useGameStore((s) => s.acceptContract);
    const completeDeliveryContract = useGameStore(
        (s) => s.completeDeliveryContract,
    );
    const sendScoutingMission = useGameStore((s) => s.sendScoutingMission);
    const planetaryDrill = useGameStore((s) => s.planetaryDrill);
    const atmosphericAnalysis = useGameStore((s) => s.atmosphericAnalysis);
    const researchedTechs = useGameStore((s) => s.research.researchedTechs);
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

    useEffect(() => {
        if (dominantRace && race && !knownRaces.includes(dominantRace)) {
            discoverRace(dominantRace);
        }
    }, [dominantRace, race, knownRaces, discoverRace]);

    if (!currentLocation) return null;

    // Empty planet
    if (currentLocation.isEmpty) {
        const hasScout = crew.some((c) => c.profession === "scout");
        const scoutedTimes = currentLocation.scoutedTimes || 0;
        const bestScout = crew
            .filter((c) => c.profession === "scout")
            .sort((a, b) => (b.level ?? 1) - (a.level ?? 1))[0];
        const scoutHasOptical = bestScout?.augmentation
            ? (AUGMENTATIONS[bestScout.augmentation]?.effect
                  ?.extraScoutAttempts ?? 0) > 0
            : false;
        const maxScoutAttempts = 3 + (scoutHasOptical ? 1 : 0);
        const canScout = scoutedTimes < maxScoutAttempts;
        const lastScoutResult = currentLocation.lastScoutResult;
        const currentLocationPlanetType = currentLocation.planetType;

        const hasDrillTech = researchedTechs.includes("planetary_drill");
        const hasDrillModule = ship.modules.some(
            (m) =>
                m.type === "drill" &&
                m.health > 0 &&
                !m.disabled &&
                !m.manualDisabled,
        );
        const canDrill =
            hasDrillTech && hasDrillModule && !currentLocation.planetaryDrilled;

        const hasAtmoTech = researchedTechs.includes("atmospheric_analysis");
        const hasScientist = crew.some((c) => c.profession === "scientist");
        const canAnalyze =
            hasAtmoTech && hasScientist && !currentLocation.atmosphereAnalyzed;
        const planetBgClass = getPlanetBackgroundClass(
            currentLocationPlanetType,
        );

        return (
            <div
                className={`flex flex-col gap-4 p-4 rounded-lg border border-[#333] ${planetBgClass}`}
            >
                {/* Content overlay for readability */}
                <div className="relative z-10 bg-[rgba(5,8,16,0.85)] p-4 rounded border border-[#333]">
                    {/* Planet Visual */}
                    <PlanetVisual planetType={currentLocationPlanetType} />

                    <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000]">
                        ▸ {getLocationName(currentLocation.name, t)} -{" "}
                        {currentLocationPlanetType
                            ? getPlanetTypeName(currentLocationPlanetType, t)
                            : ""}
                    </div>
                    <div className="text-sm text-[#888] italic">
                        {currentLocationPlanetType
                            ? getPlanetDescription(
                                  currentLocationPlanetType,
                                  t,
                              ) || t("planet_panel.empty_description")
                            : t("planet_panel.empty_description")}
                    </div>
                    <div className="text-sm leading-relaxed">
                        {t("planet_panel.empty_planet")}
                        <br />
                        <br />
                        {canScout ? (
                            <span className="text-[#ffb000]">
                                {t("planet_panel.can_scout")} ({scoutedTimes}/
                                {maxScoutAttempts}).
                            </span>
                        ) : (
                            <span className="text-[#00ff41]">
                                {t("planet_panel.fully_explored")} (
                                {maxScoutAttempts}/{maxScoutAttempts}).
                            </span>
                        )}
                    </div>

                    {/* Last scouting result */}
                    {lastScoutResult && (
                        <div className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-3 mt-2">
                            <div className="text-[#ffb000] font-bold text-sm mb-1">
                                {t("planet_panel.last_scouting")}
                            </div>
                            {lastScoutResult.type === "credits" &&
                                lastScoutResult.value && (
                                    <div className="text-[#00ff41] text-sm">
                                        {t("planet_panel.found_resources", {
                                            value: lastScoutResult.value,
                                        })}
                                    </div>
                                )}
                            {lastScoutResult.type === "tradeGood" &&
                                lastScoutResult.itemName && (
                                    <div className="text-[#00ff41] text-sm">
                                        {t("planet_panel.found_goods", {
                                            name: lastScoutResult.itemName,
                                            quantity:
                                                lastScoutResult.quantity ?? 1,
                                        })}
                                    </div>
                                )}
                            {lastScoutResult.type === "nothing" &&
                                !lastScoutResult.researchResources?.length &&
                                !lastScoutResult.mutationName && (
                                    <div className="text-[#888] text-sm">
                                        {t("planet_panel.found_nothing")}
                                    </div>
                                )}
                            {lastScoutResult.researchResources &&
                                lastScoutResult.researchResources.length >
                                    0 && (
                                    <div className="text-[#4488ff] text-sm">
                                        {lastScoutResult.researchResources
                                            .map((res) => {
                                                const id = res.type;
                                                const rd =
                                                    RESEARCH_RESOURCES[id];
                                                return `🔬 ${rd?.icon ?? ""} ${rd?.name ?? res.type} x${res.quantity}`;
                                            })
                                            .join(", ")}
                                    </div>
                                )}
                            {lastScoutResult.mutationName && (
                                <div className="text-[#cc44ff] text-sm">
                                    {t("planet_panel.scout_mutation", {
                                        name: lastScoutResult.mutationName,
                                    })}
                                </div>
                            )}
                            {lastScoutResult.type === "enemy" &&
                                lastScoutResult.enemyThreat && (
                                    <div className="text-[#ff0040] text-sm">
                                        {t("planet_panel.found_enemy", {
                                            threat: lastScoutResult.enemyThreat,
                                        })}
                                    </div>
                                )}
                        </div>
                    )}

                    {hasScout && canScout && (
                        <>
                            <div className="font-['Orbitron'] font-bold text-base text-[#ffb000] mt-4">
                                {t("planet_panel.scouting")}
                            </div>
                            <div className="text-sm leading-relaxed">
                                {t("planet_panel.scouting_desc_1")}
                                <br />
                                {t("planet_panel.scouting_credits")}
                                <br />
                                {t("planet_panel.scouting_goods")}
                                <br />
                                {t("planet_panel.scouting_enemies")}
                            </div>
                            <Button
                                onClick={() =>
                                    sendScoutingMission(currentLocation.id)
                                }
                                className="cursor-pointer bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider mt-3"
                            >
                                {t("planet.scout_surface")}
                            </Button>
                        </>
                    )}

                    {!hasScout && canScout && (
                        <div className="text-[#ff0040] text-sm mt-4 p-3 border border-[#ff0040] bg-[rgba(255,0,64,0.1)]">
                            {t("planet.scout_requires_scout")}
                        </div>
                    )}

                    {/* Planetary Drill */}
                    {hasDrillTech && (
                        <div className="mt-4">
                            <div className="font-['Orbitron'] font-bold text-base text-[#ffb000]">
                                {t("planet.drill_title")}
                            </div>
                            {canDrill ? (
                                <>
                                    <div className="text-sm text-[#888] mt-1">
                                        {t("planet.drill_desc")}
                                    </div>
                                    <Button
                                        onClick={() =>
                                            planetaryDrill(currentLocation.id)
                                        }
                                        className="cursor-pointer bg-transparent border-2 border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase tracking-wider mt-2"
                                    >
                                        {t("planet.drill_button")}
                                    </Button>
                                </>
                            ) : currentLocation.planetaryDrilled ? (
                                <>
                                    <div className="text-[#555] text-sm mt-1">
                                        {t("planet.drill_done")}
                                    </div>
                                    {currentLocation.lastDrillResult && (
                                        <div className="bg-[rgba(255,176,0,0.05)] border border-[#ffb000] p-3 mt-2">
                                            <div className="text-[#ffb000] font-bold text-sm mb-1">
                                                {t("planet.drill_result")}
                                            </div>
                                            {currentLocation.lastDrillResult
                                                .tradeGood && (
                                                <div className="text-[#00ff41] text-sm">
                                                    📦{" "}
                                                    {
                                                        currentLocation
                                                            .lastDrillResult
                                                            .tradeGood.name
                                                    }{" "}
                                                    x
                                                    {
                                                        currentLocation
                                                            .lastDrillResult
                                                            .tradeGood.quantity
                                                    }
                                                </div>
                                            )}
                                            {currentLocation.lastDrillResult.researchResources.map(
                                                (res) => {
                                                    const rd =
                                                        RESEARCH_RESOURCES[
                                                            res.type
                                                        ];
                                                    return (
                                                        <div
                                                            key={res.type}
                                                            className="text-[#4488ff] text-sm"
                                                        >
                                                            🔬 {rd?.icon ?? ""}{" "}
                                                            {rd?.name ??
                                                                res.type}{" "}
                                                            x{res.quantity}
                                                        </div>
                                                    );
                                                },
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-[#ff0040] text-sm mt-1 p-2 border border-[#ff0040] bg-[rgba(255,0,64,0.1)]">
                                    {t("planet.drill_requires_drill")}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Atmospheric Analysis */}
                    {hasAtmoTech && (
                        <div className="mt-4">
                            <div className="font-['Orbitron'] font-bold text-base text-[#00d4ff]">
                                {t("planet.analysis_title")}
                            </div>
                            {canAnalyze ? (
                                <>
                                    <div className="text-sm text-[#888] mt-1">
                                        {t("planet.analysis_desc")}
                                    </div>
                                    <Button
                                        onClick={() =>
                                            atmosphericAnalysis(
                                                currentLocation.id,
                                            )
                                        }
                                        className="cursor-pointer bg-transparent border-2 border-[#00d4ff] text-[#00d4ff] hover:bg-[#00d4ff] hover:text-[#050810] uppercase tracking-wider mt-2"
                                    >
                                        {t("planet.analysis_button")}
                                    </Button>
                                </>
                            ) : currentLocation.atmosphereAnalyzed ? (
                                <>
                                    <div className="text-[#555] text-sm mt-1">
                                        {t("planet.analysis_done")}
                                    </div>
                                    {currentLocation.lastAtmosphericResult && (
                                        <div className="bg-[rgba(0,212,255,0.05)] border border-[#00d4ff] p-3 mt-2">
                                            <div className="text-[#00d4ff] font-bold text-sm mb-1">
                                                {t("planet.analysis_result")}
                                            </div>
                                            {currentLocation.lastAtmosphericResult.researchResources.map(
                                                (res) => {
                                                    const rd =
                                                        RESEARCH_RESOURCES[
                                                            res.type
                                                        ];
                                                    return (
                                                        <div
                                                            key={res.type}
                                                            className="text-[#4488ff] text-sm"
                                                        >
                                                            🔬 {rd?.icon ?? ""}{" "}
                                                            {rd?.name ??
                                                                res.type}{" "}
                                                            x{res.quantity}
                                                        </div>
                                                    );
                                                },
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-[#ff0040] text-sm mt-1 p-2 border border-[#ff0040] bg-[rgba(255,0,64,0.1)]">
                                    {t("planet.drill_requires_scientist")}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-2.5 flex-wrap mt-5">
                        <Button
                            onClick={showSectorMap}
                            className="cursor-pointer bg-transparent border-2 border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase tracking-wider"
                        >
                            {t("planet_panel.leave_planet")}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Inhabited planet — show expedition if active for this planet
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

    // Inhabited planet
    // Check for delivery contracts that target THIS specific location
    const deliveryContracts = activeContracts.filter(
        (c) =>
            c.type === "delivery" &&
            c.targetLocationId === currentLocation.id &&
            ship.cargo.some((cargo) => cargo.contractId === c.id), // Must have the cargo
    );

    // Filter available contracts - exclude completed ones and race quests with insufficient reputation
    const availableContracts = (currentLocation.contracts || []).filter(
        (c) =>
            !completedContractIds.includes(c.id) &&
            !activeContracts.some((ac) => ac.id === c.id) &&
            !(
                c.isRaceQuest &&
                c.requiredRace &&
                !isRaceContractAvailable(raceReputation, c.requiredRace)
            ),
    );

    const currentLocationPlanetType = currentLocation.planetType;
    const planetBgClass = getPlanetBackgroundClass(currentLocationPlanetType);
    return (
        <div
            className={`flex flex-col gap-4 p-4 rounded-lg border ${planetBgClass}`}
            style={{ borderColor: raceAccent + "88" }}
        >
            {/* Content overlay for readability */}
            <div
                className="relative z-10 p-4 rounded border"
                style={{
                    borderColor: raceBorder,
                    backgroundColor: "rgba(5,8,16,0.9)",
                }}
            >
                {race && (
                    <div
                        className="h-0.5 -mx-4 -mt-4 mb-4"
                        style={{
                            background: `linear-gradient(90deg, ${race.color}cc 0%, ${race.color}22 100%)`,
                        }}
                    />
                )}
                <div
                    className="font-['Orbitron'] font-bold text-lg"
                    style={{ color: raceAccent }}
                >
                    ▸ {getLocationName(currentLocation.name, t)} -{" "}
                    {currentLocationPlanetType
                        ? getPlanetTypeName(currentLocationPlanetType, t)
                        : ""}
                </div>

                {/* Planet type description */}
                <div className="text-sm text-[#888] italic leading-relaxed">
                    {currentLocationPlanetType
                        ? getPlanetDescription(currentLocationPlanetType, t) ||
                          t("planet_panel.empty_description")
                        : t("planet_panel.empty_description")}
                </div>

                {/* Population and Race info */}
                <div className="flex items-center gap-3 text-sm relative z-20">
                    {race && (
                        <div
                            className="flex items-center gap-2 px-3 py-1.5 rounded border"
                            style={{
                                borderColor: race.color,
                                backgroundColor: `${race.color}15`,
                            }}
                        >
                            <span className="text-xl">{race.icon}</span>
                            <div>
                                <div
                                    style={{ color: race.color }}
                                    className="font-bold"
                                >
                                    {t(
                                        `races.${currentLocation.dominantRace}.plural`,
                                    )}
                                </div>
                                {currentLocation.population && (
                                    <div className="text-xs text-gray-400">
                                        👥 {currentLocation.population}{" "}
                                        {t("planet_panel.thousands")}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Reputation badge */}
                    {raceReputation && currentLocation.dominantRace && (
                        <div
                            className="flex items-center gap-2 px-3 py-1.5 rounded border text-xs"
                            style={{
                                borderColor:
                                    REPUTATION_COLORS[
                                        getReputationLevel(
                                            getRaceReputation(
                                                raceReputation,
                                                currentLocation.dominantRace,
                                            ),
                                        )
                                    ],
                                backgroundColor: `${
                                    REPUTATION_COLORS[
                                        getReputationLevel(
                                            getRaceReputation(
                                                raceReputation,
                                                currentLocation.dominantRace,
                                            ),
                                        )
                                    ]
                                }15`,
                            }}
                        >
                            <span>
                                {
                                    REPUTATION_ICONS[
                                        getReputationLevel(
                                            getRaceReputation(
                                                raceReputation,
                                                currentLocation.dominantRace,
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
                                                currentLocation.dominantRace,
                                            ),
                                        )
                                    ],
                                }}
                            >
                                {t(
                                    `reputation.levels.${getRaceReputationLevel(raceReputation, currentLocation.dominantRace)}`,
                                )}
                            </span>
                            <span className="text-gray-400">
                                (
                                {getRaceReputation(
                                    raceReputation,
                                    currentLocation.dominantRace,
                                ) > 0
                                    ? "+"
                                    : ""}
                                {getRaceReputation(
                                    raceReputation,
                                    currentLocation.dominantRace,
                                )}
                                )
                            </span>
                        </div>
                    )}
                    {/* Planet Specialization Button */}
                    {race &&
                        currentLocation.dominantRace &&
                        PLANET_SPECIALIZATIONS[
                            currentLocation.dominantRace
                        ] && (
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

                {/* Expedition button */}
                {currentLocation.dominantRace &&
                    (currentLocation.expeditionCompleted ? (
                        <div className="mt-2 text-xs text-[#444] border border-[#222] px-3 py-1.5 inline-block">
                            {t("planet.surface_explored")}
                        </div>
                    ) : (
                        <Button
                            onClick={() => setShowExpeditionSetup(true)}
                            className="mt-2 bg-transparent border-2 uppercase tracking-wider text-xs px-3 py-1.5 cursor-pointer"
                            style={{
                                borderColor: raceAccent,
                                color: raceAccent,
                            }}
                        >
                            🗺️ {t("planet_panel.explore_planet")}
                        </Button>
                    ))}

                {/* Planet Visual */}
                <PlanetVisual planetType={currentLocationPlanetType} />

                <div className="text-sm">
                    {t("planet_panel.inhabited_planet")}
                    {availableContracts.length > 0
                        ? ` ${t("planet_panel.tasks_available")}`
                        : ` ${t("planet_panel.no_tasks")}`}
                </div>

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
                                        <div className="text-[#00d4ff] font-bold">
                                            {c.desc}
                                        </div>
                                        {c.cargo && (
                                            <div className="text-[11px] mt-1 text-[#00ff41]">
                                                📦 Груз &quot;
                                                {
                                                    DELIVERY_GOODS[
                                                        c.cargo as DeliveryGoods
                                                    ]?.name
                                                }
                                                &quot; (
                                                {c.quantity ??
                                                    DELIVERY_CONTRACT_CARGO_AMOUNT}
                                                т)
                                            </div>
                                        )}
                                        <div className="text-[#ffb000] text-xs mt-1">
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
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="text-[#00d4ff] font-bold flex items-center gap-2">
                                                    {c.desc.startsWith(
                                                        "contracts.",
                                                    )
                                                        ? t(c.desc, {
                                                              planetType:
                                                                  c.planetType
                                                                      ? getPlanetTypeName(
                                                                            c.planetType,
                                                                            t,
                                                                        )
                                                                      : "",
                                                          })
                                                        : c.desc}
                                                    {c.isRaceQuest &&
                                                        raceInfo && (
                                                            <span
                                                                className="text-xs px-1 py-0.5 rounded"
                                                                style={{
                                                                    backgroundColor: `${raceInfo.color}20`,
                                                                    color: raceInfo.color,
                                                                }}
                                                            >
                                                                {raceInfo.icon}{" "}
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

                                        {/* Quest details */}
                                        <div className="text-[11px] mt-2 space-y-1">
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
                                                        ? t(
                                                              "contracts.desc_research_synth",
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

                                            {/* Where to turn in */}
                                            <div className="text-[#ffb000]">
                                                {c.type === "delivery" &&
                                                    t(
                                                        "contracts.turn_in_delivery",
                                                    )}
                                                {c.type === "combat" &&
                                                    t(
                                                        "contracts.turn_in_combat",
                                                    )}
                                                {c.type === "research" &&
                                                    t(
                                                        "contracts.turn_in_research",
                                                    )}
                                                {c.type === "bounty" &&
                                                    t(
                                                        "contracts.turn_in_bounty",
                                                    )}
                                                {c.type === "diplomacy" &&
                                                    t(
                                                        "contracts.turn_in_diplomacy",
                                                    )}
                                                {c.type === "patrol" &&
                                                    t(
                                                        "contracts.turn_in_patrol",
                                                    )}
                                                {c.type === "rescue" &&
                                                    t(
                                                        "contracts.turn_in_rescue",
                                                    )}
                                                {c.type === "mining" &&
                                                    t(
                                                        "contracts.turn_in_mining",
                                                    )}
                                                {c.type === "scan_planet" &&
                                                    t("contracts.turn_in_scan")}
                                                {c.type === "supply_run" &&
                                                    t(
                                                        "contracts.turn_in_supply",
                                                    )}
                                                {(c.type ===
                                                    "expedition_survey" ||
                                                    c.type === "gas_dive") &&
                                                    t("contracts.turn_in_here")}
                                            </div>

                                            {/* Reward */}
                                            <div className="text-[#ffaa00] font-bold">
                                                {t("contracts.reward_label")}{" "}
                                                {c.reward}₢
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
                        className="cursor-pointer bg-transparent border-2 border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase tracking-wider"
                    >
                        {t("planet_panel.leave_planet")}
                    </Button>
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
    );
}
