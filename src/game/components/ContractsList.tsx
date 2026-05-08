"use client";

import { useState } from "react";
import { useGameStore } from "@/game/store";
import type { ArtifactRarity, Contract, Goods } from "@/game/types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TRADE_GOODS, DELIVERY_GOODS } from "@/game/constants";
import { RACES } from "@/game/constants/races";
import { DELIVERY_CONTRACT_CARGO_AMOUNT } from "@/game/slices/contracts/constants";
import { useTranslation } from "@/lib/useTranslation";
import { RaceSprite } from "./RaceSprite";

function stripLeadingEmoji(text: string): string {
    return text.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, "");
}

function stripRaceQuestEmoji(text: string, isRaceQuest?: boolean): string {
    return isRaceQuest ? stripLeadingEmoji(text) : text;
}

function ProgressBar({ current, total }: { current: number; total: number }) {
    const pct = total > 0 ? Math.min(1, current / total) : 0;
    return (
        <div className="mt-1.5 h-1 bg-[rgba(0,255,65,0.15)] rounded-sm overflow-hidden">
            <div
                className="h-full bg-[#00ff41] transition-all duration-300"
                style={{ width: `${pct * 100}%` }}
            />
        </div>
    );
}

function ContractMetric({ label, value }: { label: string; value: number }) {
    return (
        <div className="min-w-0 border border-[#00d4ff44] bg-[rgba(0,212,255,0.055)] px-2 py-1">
            <div className="text-[#00d4ff] font-bold tabular-nums">
                {value}
            </div>
            <div className="text-[#667] uppercase tracking-wide truncate">
                {label}
            </div>
        </div>
    );
}

export function ContractsList() {
    const activeContracts = useGameStore((s) => s.activeContracts);
    const cancelContract = useGameStore((s) => s.cancelContract);
    const get = useGameStore.getState;
    const { t } = useTranslation();
    const [selectedContract, setSelectedContract] = useState<Contract | null>(
        null,
    );

    if (activeContracts.length === 0) {
        return (
            <div className="border border-[#333] bg-[rgba(255,255,255,0.025)] p-3 text-xs text-[#888]">
                <div className="text-[#ffb000] font-bold uppercase tracking-wide mb-1">
                    {t("ship.contracts")}
                </div>
                <div>{t("contracts.no_active")}</div>
            </div>
        );
    }

    const locationTypeText = (type: string | undefined): string =>
        type === "planet"
            ? t("contracts.location_planet")
            : type === "station"
              ? t("contracts.location_station")
              : t("contracts.location_ship");

    const getProgress = (
        contract: Contract,
    ): { current: number; total: number } | null => {
        switch (contract.type) {
            case "scan_planet": {
                const req = contract.requiresVisit ?? 1;
                return req > 1 ? { current: contract.visited ?? 0, total: req } : null;
            }
            case "supply_run": {
                if (!contract.quantity) return null;
                const state = get();
                const cargoOwned =
                    state.ship.tradeGoods.find((g) => g.item === contract.cargo)
                        ?.quantity ?? 0;
                return {
                    current: Math.min(cargoOwned, contract.quantity),
                    total: contract.quantity,
                };
            }
            case "gas_dive":
                return {
                    current: contract.collectedMembranes ?? 0,
                    total: contract.requiredMembranes ?? 1,
                };
            case "patrol": {
                const targetCount = contract.targetSectors?.length || 0;
                const visitedCount = (contract.visitedSectors || []).filter(
                    (id) => (contract.targetSectors || []).includes(id),
                ).length;
                return targetCount > 0
                    ? { current: visitedCount, total: targetCount }
                    : null;
            }
            case "expedition_survey":
                return {
                    current: contract.tilesRevealed ?? 0,
                    total: contract.requiredDiscoveries ?? 1,
                };
            case "research":
                if (!contract.requiresTechResearch && contract.requiresAnomalies) {
                    return {
                        current: contract.visitedAnomalies ?? 0,
                        total: contract.requiresAnomalies,
                    };
                }
                return null;
            default:
                return null;
        }
    };

    const isContractReady = (contract: Contract): boolean => {
        if (contract.type === "expedition_survey" && contract.expeditionDone) {
            return true;
        }
        const progress = getProgress(contract);
        return progress !== null && progress.current >= progress.total;
    };

    const getStatusText = (contract: Contract): string => {
        switch (contract.type) {
            case "delivery":
                if (
                    contract.targetLocationName &&
                    contract.targetLocationType
                ) {
                    const typeText = locationTypeText(contract.targetLocationType);
                    const rawName = contract.targetLocationName || "";
                    const displayName = rawName.startsWith("station_name.")
                        ? `${t("events.station")} ${rawName.replace("station_name.", "")}`
                        : rawName;
                    return t("contracts.deliver_to_named", {
                        type: typeText,
                        name: displayName,
                        sector: contract.targetSectorName ?? "",
                    });
                }
                return t("contracts.deliver_to").replace(
                    "{{sector}}",
                    contract.targetSectorName || t("contracts.unknown"),
                );
            case "scan_planet": {
                const req = contract.requiresVisit ?? 1;
                const vis = contract.visited ?? 0;
                return req > 1
                    ? `${t("contracts.scan_sector")} (${vis}/${req})`
                    : t("contracts.scan_sector");
            }
            case "combat":
                return t("contracts.clear_sector").replace(
                    "{{sector}}",
                    contract.sectorName || t("contracts.unknown"),
                );
            case "research":
                if (contract.requiresTechResearch) {
                    return t("contracts.research_tech");
                }
                return t("contracts.research_count")
                    .replace("{{count}}", String(contract.requiresAnomalies))
                    .replace(
                        "{{current}}",
                        String(contract.visitedAnomalies || 0),
                    )
                    .replace("{{total}}", String(contract.requiresAnomalies));
            case "gas_dive": {
                const collected = contract.collectedMembranes ?? 0;
                const required = contract.requiredMembranes ?? 1;
                return `🪸 ${t("contracts.gas_dive_progress", { current: String(collected), total: String(required) })}`;
            }
            case "expedition_survey": {
                const revealed = contract.tilesRevealed ?? 0;
                const required = contract.requiredDiscoveries ?? 1;
                if (contract.expeditionDone) {
                    return `🗺️ ${t("contracts.expedition_done")}`;
                }
                return revealed > 0
                    ? `🗺️ ${t("contracts.expedition_tiles_progress", { current: String(revealed), total: String(required) })}`
                    : `🗺️ ${t("contracts.expedition_pending", { planet: contract.targetPlanetName ?? "?", sector: contract.targetSectorName ?? "?" })}`;
            }
            default:
                return t("contracts.default");
        }
    };

    // Get translated contract name for display
    const getContractName = (contract: Contract): string => {
        switch (contract.type) {
            case "delivery":
                if (contract.cargo) {
                    const cargoName =
                        DELIVERY_GOODS[
                            contract.cargo as keyof typeof DELIVERY_GOODS
                        ]?.name || contract.cargo;
                    return t("contracts.name_delivery", { cargo: cargoName });
                }
                return t("contracts.name_delivery", {
                    cargo: t("contracts.cargo"),
                });
            case "scan_planet": {
                const scanReq = contract.requiresVisit ?? 1;
                return scanReq > 1
                    ? t("contracts.name_scan_multi", {
                          count: String(scanReq),
                          planetType:
                              contract.planetType || t("contracts.unknown"),
                      })
                    : t("contracts.name_scan", {
                          planetType:
                              contract.planetType || t("contracts.unknown"),
                      });
            }
            case "combat":
                return t("contracts.name_combat");
            case "research":
                return contract.requiresTechResearch
                    ? t("contracts.name_research_tech")
                    : t("contracts.name_research");
            case "bounty":
                return t("contracts.name_bounty");
            case "diplomacy":
                return t("contracts.name_diplomacy");
            case "patrol":
                return t("contracts.name_patrol");
            case "rescue":
                return contract.isRaceQuest && contract.requiredRace === "voidborn"
                    ? t("contracts.name_rescue_void")
                    : t("contracts.name_rescue");
            case "mining":
                return t("contracts.name_mining");
            case "supply_run":
                if (contract.cargo) {
                    const cargoName =
                        TRADE_GOODS[contract.cargo as Goods]?.name ||
                        contract.cargo;
                    return t("contracts.name_supply", { cargo: cargoName });
                }
                return t("contracts.name_supply", {
                    cargo: t("contracts.cargo"),
                });
            case "gas_dive":
                return t("contracts.name_gas_dive");
            case "expedition_survey":
                return t("contracts.name_expedition_survey");
            default:
                return contract.desc;
        }
    };

    const getContractDetails = (contract: Contract) => {
        // Determine destination text
        const resolveLocationName = (name: string | undefined) => {
            if (!name) return t("contracts.unknown");
            if (name.startsWith("station_name.")) {
                return `${t("events.station")} ${name.replace("station_name.", "")}`;
            }
            return name;
        };
        const getDestText = () => {
            if (!contract.targetLocationType)
                return contract.targetSectorName || t("contracts.unknown");
            return t("contracts.destination_full", {
                name: resolveLocationName(contract.targetLocationName),
                type: locationTypeText(contract.targetLocationType),
                sector: contract.targetSectorName ?? "",
            });
        };

        switch (contract.type) {
            case "delivery":
                // Handle both key (new format) and name (old format)
                let deliveryCargoName = "Груз";
                if (contract.cargo) {
                    // Try to look up by key first (new format: "construction_materials")
                    const cargoByKey =
                        DELIVERY_GOODS[
                            contract.cargo as keyof typeof DELIVERY_GOODS
                        ]?.name;
                    if (cargoByKey) {
                        deliveryCargoName = cargoByKey;
                    } else {
                        // Fallback: format the key (capitalize and replace underscores)
                        deliveryCargoName =
                            contract.cargo.charAt(0).toUpperCase() +
                            contract.cargo.slice(1).replace(/_/g, " ");
                    }
                }
                return {
                    type: t("contracts.type_delivery"),
                    tasks: [
                        {
                            label: t("contracts.task_what"),
                            value: t("contracts.delivery_cargo")
                                .replace("{{cargo}}", deliveryCargoName)
                                .replace(
                                    "{{amount}}",
                                    String(DELIVERY_CONTRACT_CARGO_AMOUNT),
                                )
                                .replace("{{destination}}", getDestText()),
                        },
                        {
                            label: t("contracts.task_destination"),
                            value: getDestText(),
                        },
                        {
                            label: t("contracts.task_where"),
                            value: t("contracts.delivery_turn_in"),
                        },
                    ],
                };
            case "scan_planet": {
                const scanVisited = contract.visited ?? 0;
                const scanRequired = contract.requiresVisit ?? 1;
                return {
                    type: t("contracts.type_scan"),
                    tasks: [
                        {
                            label: t("contracts.task_what"),
                            value:
                                scanRequired > 1
                                    ? t("contracts.scan_planet_multi")
                                          .replace(
                                              "{{count}}",
                                              String(scanRequired),
                                          )
                                          .replace(
                                              "{{type}}",
                                              contract.planetType?.toLowerCase() ||
                                                  "",
                                          )
                                    : t("contracts.scan_planet"),
                        },
                        {
                            label: t("contracts.task_target"),
                            value: t("contracts.task_planet_type_value", {
                                type: contract.planetType?.toLowerCase() || "",
                            }),
                        },
                        {
                            label: t("contracts.task_requirements"),
                            value: t("contracts.scan_requirement"),
                        },
                        {
                            label: t("contracts.task_where"),
                            value: contract.sourcePlanetName
                                ? `${contract.sourceSectorName}, ${contract.sourcePlanetName}`
                                : contract.sourceSectorName ||
                                  t("contracts.unknown"),
                        },
                        {
                            label: t("contracts.task_status"),
                            value:
                                scanVisited >= scanRequired
                                    ? t("contracts.completed")
                                    : `${t("contracts.in_progress")} (${scanVisited}/${scanRequired})`,
                        },
                    ],
                };
            }
            case "supply_run":
                if (!contract.cargo) return;

                const cargoName = TRADE_GOODS[contract.cargo as Goods]?.name;

                // Calculate how much cargo the player currently has
                const state = get();
                const cargoOwned =
                    state.ship.tradeGoods.find((g) => g.item === contract.cargo)
                        ?.quantity ?? 0;
                const progress = `${cargoOwned}/${contract.quantity}`;

                return {
                    type: t("contracts.type_supply"),
                    tasks: [
                        {
                            label: t("contracts.task_what"),
                            value: t("contracts.supply_find")
                                .replace("{{cargo}}", cargoName || "")
                                .replace(
                                    "{{quantity}}",
                                    String(contract.quantity),
                                ),
                        },
                        {
                            label: t("contracts.task_progress"),
                            value: `${progress}т`,
                        },
                        {
                            label: t("contracts.task_where"),
                            value: t("contracts.supply_find_location"),
                        },
                        {
                            label: t("contracts.task_where"),
                            value: `${contract.sourceType === "planet" ? t("events.planet") : t("events.friendly_ship")} "${contract.sourceName}" (${contract.sourceSectorName})`,
                        },
                    ],
                };
            case "combat":
                return {
                    type: t("contracts.type_combat"),
                    tasks: [
                        {
                            label: t("contracts.task_what"),
                            value: contract.isRaceQuest
                                ? t("contracts.combat_destroy_race")
                                : t("contracts.combat_destroy"),
                        },
                        {
                            label: t("contracts.task_sector"),
                            value:
                                contract.sectorName || t("contracts.unknown"),
                        },
                        {
                            label: t("contracts.task_where"),
                            value: t("contracts.combat_auto"),
                        },
                    ],
                };
            case "research":
                if (contract.requiresTechResearch) {
                    const minTier = contract.requiredTechTier ?? 1;
                    return {
                        type: t("contracts.type_research"),
                        tasks: [
                            {
                                label: t("contracts.task_what"),
                                value:
                                    minTier > 1
                                        ? t(
                                              "contracts.research_tech_tier",
                                          ).replace("{{tier}}", String(minTier))
                                        : t("contracts.research_tech"),
                            },
                            {
                                label: t("contracts.task_where"),
                                value: t("contracts.research_tech_auto"),
                            },
                        ],
                    };
                }
                return {
                    type: t("contracts.type_research"),
                    tasks: [
                        {
                            label: t("contracts.task_what"),
                            value: t("contracts.research_anomalies").replace(
                                "{{count}}",
                                String(contract.requiresAnomalies),
                            ),
                        },
                        {
                            label: t("contracts.task_where"),
                            value: t("contracts.research_location"),
                        },
                        {
                            label: t("contracts.task_progress"),
                            value: `${contract.visitedAnomalies || 0} / ${contract.requiresAnomalies}`,
                        },
                        {
                            label: t("contracts.task_requirements"),
                            value: t("contracts.research_scientist"),
                        },
                        {
                            label: t("contracts.task_where"),
                            value: t("contracts.research_auto"),
                        },
                    ],
                };
            case "rescue": {
                const rescueTasks: { label: string; value: string }[] = [
                    {
                        label: t("contracts.task_what"),
                        value: t("contracts.rescue_enter")
                            .replace(
                                "{{stormName}}",
                                contract.stormName || t("contracts.unknown"),
                            )
                            .replace(
                                "{{sectorName}}",
                                contract.sectorName || t("contracts.unknown"),
                            ),
                    },
                ];
                if (contract.requiredStormIntensity && contract.requiredStormIntensity > 1) {
                    rescueTasks.push({
                        label: t("contracts.task_requirements"),
                        value: t("contracts.rescue_intensity").replace(
                            "{{intensity}}",
                            String(contract.requiredStormIntensity),
                        ),
                    });
                }
                rescueTasks.push({
                    label: t("contracts.task_where"),
                    value: t("contracts.rescue_auto"),
                });
                return {
                    type: t("contracts.type_rescue"),
                    tasks: rescueTasks,
                };
            }
            case "mining": {
                const rarityLabels: Record<ArtifactRarity, string> = {
                    rare: t("artifacts.rarity.rare"),
                    legendary: t("artifacts.rarity.legendary"),
                    mythic: t("artifacts.rarity.mythic"),
                    cursed: t("artifacts.rarity.cursed"),
                };
                const rarityStr = contract.requiredRarities
                    ? contract.requiredRarities
                          .map((r) => rarityLabels[r] ?? r)
                          .join(" / ")
                    : null;
                return {
                    type: t("contracts.type_mining"),
                    tasks: [
                        {
                            label: t("contracts.task_what"),
                            value: t("contracts.mining_find"),
                        },
                        ...(rarityStr
                            ? [
                                  {
                                      label: t(
                                          "contracts.mining_required_rarity",
                                      ),
                                      value: rarityStr,
                                  },
                              ]
                            : []),
                        {
                            label: t("contracts.task_progress"),
                            value: contract.bossDefeated
                                ? t("contracts.mining_boss_done")
                                : t("contracts.mining_boss_not_found"),
                        },
                        {
                            label: t("contracts.task_where"),
                            value: t("contracts.mining_auto"),
                        },
                    ],
                };
            }
            case "patrol": {
                const targetCount = contract.targetSectors?.length || 0;
                const visitedTargetCount = (contract.visitedSectors || []).filter(
                    (id) => (contract.targetSectors || []).includes(id),
                ).length;
                return {
                    type: t("contracts.type_patrol"),
                    tasks: [
                        {
                            label: t("contracts.task_what"),
                            value: t("contracts.patrol_visit").replace(
                                "{{sectors}}",
                                contract.targetSectorNames ||
                                    t("contracts.unknown"),
                            ),
                        },
                        {
                            label: t("contracts.task_progress"),
                            value: `${visitedTargetCount} / ${targetCount} ${t("contracts.patrol_sectors")}`,
                        },
                        {
                            label: t("contracts.task_where"),
                            value: t("contracts.patrol_auto"),
                        },
                    ],
                };
            }
            case "bounty":
                return {
                    type: t("contracts.type_bounty"),
                    tasks: [
                        {
                            label: t("contracts.task_what"),
                            value: t("contracts.bounty_destroy")
                                .replace(
                                    "{{threat}}",
                                    String(contract.targetThreat || 1),
                                )
                                .replace(
                                    "{{sector}}",
                                    contract.targetSectorName ||
                                        t("contracts.unknown"),
                                ),
                        },
                        {
                            label: t("contracts.task_where"),
                            value: t("contracts.bounty_auto"),
                        },
                    ],
                };
            case "gas_dive": {
                const gdCollected = contract.collectedMembranes ?? 0;
                const gdRequired = contract.requiredMembranes ?? 1;
                const gdDone = gdCollected >= gdRequired;
                return {
                    type: t("contracts.type_gas_dive"),
                    tasks: [
                        {
                            label: t("contracts.task_what"),
                            value: t("contracts.gas_dive_task").replace(
                                "{{count}}",
                                String(gdRequired),
                            ),
                        },
                        {
                            label: t("contracts.task_progress"),
                            value: gdDone
                                ? t("contracts.completed")
                                : `${gdCollected} / ${gdRequired}`,
                        },
                        {
                            label: t("contracts.task_where"),
                            value: contract.sourcePlanetName
                                ? `${contract.sourceSectorName}, ${contract.sourcePlanetName}`
                                : contract.sourceSectorName ?? t("contracts.unknown"),
                        },
                    ],
                };
            }
            case "expedition_survey": {
                const expRequired = contract.requiredDiscoveries ?? 1;
                return {
                    type: t("contracts.type_expedition_survey"),
                    tasks: [
                        {
                            label: t("contracts.task_what"),
                            value: t("contracts.expedition_survey_task").replace(
                                "{{count}}",
                                String(expRequired),
                            ),
                        },
                        {
                            label: t("contracts.task_target"),
                            value: contract.targetPlanetName
                                ? `${contract.targetPlanetName} (${contract.targetSectorName})`
                                : contract.targetSectorName ?? t("contracts.unknown"),
                        },
                        {
                            label: t("contracts.task_progress"),
                            value: contract.expeditionDone
                                ? t("contracts.completed")
                                : `${contract.tilesRevealed ?? 0} / ${contract.requiredDiscoveries ?? 1}`,
                        },
                        {
                            label: t("contracts.task_where"),
                            value: contract.sourcePlanetName
                                ? `${contract.sourceSectorName}, ${contract.sourcePlanetName}`
                                : contract.sourceSectorName ?? t("contracts.unknown"),
                        },
                    ],
                };
            }
            case "diplomacy":
                return {
                    type: t("contracts.type_diplomacy"),
                    tasks: [
                        {
                            label: t("contracts.task_what"),
                            value: t("contracts.diplomacy_visit")
                                .replace(
                                    "{{planet}}",
                                    contract.targetPlanetName ||
                                        t("contracts.unknown"),
                                )
                                .replace(
                                    "{{type}}",
                                    contract.targetPlanetType ||
                                        t("events.planet"),
                                ),
                        },
                        {
                            label: t("contracts.task_target"),
                            value:
                                contract.targetSectorName ||
                                t("contracts.unknown"),
                        },
                        {
                            label: t("contracts.task_where"),
                            value: t("contracts.diplomacy_auto"),
                        },
                    ],
                };
            default:
                return {
                    type: t("contracts.default"),
                    tasks: [
                        {
                            label: t("contracts.task_what"),
                            value: contract.desc,
                        },
                        {
                            label: t("contracts.task_where"),
                            value: contract.desc,
                        },
                    ],
                };
        }
    };

    const readyContracts = activeContracts.filter(isContractReady).length;
    const totalRewards = activeContracts.reduce(
        (sum, contract) => sum + contract.reward,
        0,
    );

    return (
        <>
            <div className="mb-2 grid grid-cols-3 gap-1.5 text-center text-[10px]">
                <ContractMetric
                    label={t("ship.contracts")}
                    value={activeContracts.length}
                />
                <ContractMetric
                    label={t("contracts.ready_badge")}
                    value={readyContracts}
                />
                <ContractMetric label="₢" value={totalRewards} />
            </div>

            <div className="flex flex-col gap-2">
                {activeContracts.map((contract) => {
                    const progress = getProgress(contract);
                    const ready = isContractReady(contract);
                    const raceInfo = contract.requiredRace
                        ? RACES[contract.requiredRace]
                        : null;
                    const contractName = stripRaceQuestEmoji(
                        getContractName(contract),
                        contract.isRaceQuest,
                    );
                    const statusText = stripRaceQuestEmoji(
                        getStatusText(contract),
                        contract.isRaceQuest,
                    );
                    return (
                        <div
                            key={contract.id}
                            className={`relative overflow-hidden border p-3 cursor-pointer transition-colors ${
                                ready
                                    ? "bg-[rgba(0,255,65,0.08)] border-[#00ff41] hover:bg-[rgba(0,255,65,0.15)]"
                                    : "bg-[rgba(0,255,65,0.035)] border-[#00ff4166] hover:border-[#00ff41] hover:bg-[rgba(0,255,65,0.09)]"
                            }`}
                            onClick={() => setSelectedContract(contract)}
                        >
                            <div
                                className={`absolute inset-y-0 left-0 w-1 ${
                                    ready ? "bg-[#00ff41]" : "bg-[#00d4ff]"
                                }`}
                            />
                            <div className="flex items-start justify-between gap-2">
                                <div className="pl-1 flex min-w-0 items-center gap-2 text-[#00d4ff] font-bold leading-tight">
                                    {contract.isRaceQuest &&
                                        raceInfo &&
                                        contract.requiredRace && (
                                            <span
                                                className="shrink-0 inline-flex items-center justify-center rounded-sm border px-1 py-0.5"
                                                style={{
                                                    borderColor: `${raceInfo.color}70`,
                                                    backgroundColor: `${raceInfo.color}18`,
                                                }}
                                            >
                                                <RaceSprite
                                                    race={contract.requiredRace}
                                                    size={22}
                                                    title={t(
                                                        `races.${contract.requiredRace}.plural`,
                                                    )}
                                                />
                                            </span>
                                        )}
                                    <span className="min-w-0">
                                        {contractName}
                                    </span>
                                </div>
                                {ready && (
                                    <span className="shrink-0 text-[10px] font-bold text-[#050810] bg-[#00ff41] px-1.5 py-0.5 rounded-sm">
                                        {t("contracts.ready_badge")}
                                    </span>
                                )}
                            </div>
                            <div className="pl-1 text-[11px] mt-1 text-[#99aa99] leading-snug">
                                {statusText}
                            </div>
                            {progress && (
                                <ProgressBar
                                    current={progress.current}
                                    total={progress.total}
                                />
                            )}
                            <div className="pl-1 mt-2 inline-flex border border-[#ffb00055] bg-[rgba(255,176,0,0.08)] px-1.5 py-0.5 text-[#ffb000] text-xs">
                                {t("contracts.reward_short", {
                                    reward: contract.reward,
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            <Dialog
                open={!!selectedContract}
                onOpenChange={() => setSelectedContract(null)}
            >
                <DialogContent className="bg-[rgba(10,20,30,0.96)] border-2 border-[#00ff41] text-[#00ff41] max-w-lg w-[calc(100%-2rem)] md:w-auto">
                    <DialogHeader>
                        <DialogTitle className="text-[#ffb000] font-['Orbitron'] flex items-center gap-2">
                            {selectedContract &&
                                selectedContract.isRaceQuest &&
                                selectedContract.requiredRace && (
                                    <RaceSprite
                                        race={selectedContract.requiredRace}
                                        size={26}
                                        title={t(
                                            `races.${selectedContract.requiredRace}.plural`,
                                        )}
                                    />
                                )}
                            <span>
                                {selectedContract &&
                                    stripRaceQuestEmoji(
                                        getContractName(selectedContract),
                                        selectedContract.isRaceQuest,
                                    )}
                            </span>
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {t("contracts.details_title")}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedContract &&
                        (() => {
                            const details =
                                getContractDetails(selectedContract);

                            if (!details) {
                                return (
                                    <span className="text-[#ffb000]">
                                        {t("contracts.not_found")}
                                    </span>
                                );
                            }
                            return (
                                <div className="space-y-4 text-sm">
                                    <div className="inline-flex border border-[#00d4ff55] bg-[rgba(0,212,255,0.06)] px-2 py-1">
                                        <span className="text-[#888] mr-1">
                                            {t("contracts.type")}:
                                        </span>
                                        <span className="text-[#00d4ff] font-bold">
                                            {details.type}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        {details.tasks.map((task, index) => (
                                            <div
                                                key={index}
                                                className="bg-[rgba(0,255,65,0.045)] border border-[#1a3320] border-l-[#ffb000] border-l-2 px-3 py-2"
                                            >
                                                <div className="text-[#ffb000] text-[10px] uppercase tracking-wide">
                                                    {task.label}:
                                                </div>
                                                <div className="text-[#00ff41] leading-snug">
                                                    {task.value}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-4 border-t border-[#00ff4144]">
                                        <span className="text-[#00ff41] text-lg font-bold">
                                            {t("contracts.reward_label")}{" "}
                                            {selectedContract.reward}₢
                                        </span>
                                    </div>

                                    <div className="flex gap-2 justify-center">
                                        <Button
                                            variant="outline"
                                            onClick={() =>
                                                setSelectedContract(null)
                                            }
                                            className="cursor-pointer bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[rgba(0,255,65,0.1)] hover:text-[#00ff41]"
                                        >
                                            {t("contracts.close")}
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={() => {
                                                cancelContract(
                                                    selectedContract.id,
                                                );
                                                setSelectedContract(null);
                                            }}
                                            className="cursor-pointer bg-transparent border-2 border-[#ff0040] text-[#ff0040] hover:bg-[#ff0040] hover:text-[#050810]"
                                        >
                                            {t("contracts.cancel")}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })()}
                </DialogContent>
            </Dialog>
        </>
    );
}
