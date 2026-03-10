"use client";

import { useState } from "react";
import { useGameStore } from "../store";
import type { Contract, Goods } from "../types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TRADE_GOODS } from "../constants/goods";
import { DELIVERY_GOODS } from "../constants/contracts";
import { useTranslation } from "@/lib/useTranslation";

export function ContractsList() {
    const activeContracts = useGameStore((s) => s.activeContracts);
    const cancelContract = useGameStore((s) => s.cancelContract);
    const { t } = useTranslation();
    const [selectedContract, setSelectedContract] = useState<Contract | null>(
        null,
    );

    if (activeContracts.length === 0) {
        return (
            <div className="text-xs text-[#888] p-2.5">
                {t("contracts.no_active")}
            </div>
        );
    }

    const getStatusText = (contract: Contract): string => {
        switch (contract.type) {
            case "delivery":
                // Show specific destination
                if (
                    contract.targetLocationName &&
                    contract.targetLocationType
                ) {
                    const typeText =
                        contract.targetLocationType === "planet"
                            ? "планете"
                            : contract.targetLocationType === "station"
                              ? "станции"
                              : "кораблю";
                    return `📦 Доставить на ${typeText} "${contract.targetLocationName}" (${contract.targetSectorName})`;
                }
                return t("contracts.deliver_to").replace(
                    "{{sector}}",
                    contract.targetSectorName || t("contracts.unknown"),
                );
            case "scan_planet":
                return t("contracts.scan_sector").replace(
                    "{{sector}}",
                    contract.targetSectorName || t("contracts.unknown"),
                );
            case "combat":
                return t("contracts.clear_sector").replace(
                    "{{sector}}",
                    contract.sectorName || t("contracts.unknown"),
                );
            case "research":
                return t("contracts.research_count")
                    .replace("{{count}}", String(contract.requiresAnomalies))
                    .replace(
                        "{{current}}",
                        String(contract.visitedAnomalies || 0),
                    )
                    .replace("{{total}}", String(contract.requiresAnomalies));
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
            case "scan_planet":
                return t("contracts.name_scan", {
                    planetType: contract.planetType || t("contracts.unknown"),
                });
            case "combat":
                return t("contracts.name_combat");
            case "research":
                return t("contracts.name_research");
            case "bounty":
                return t("contracts.name_bounty");
            case "diplomacy":
                return t("contracts.name_diplomacy");
            case "patrol":
                return t("contracts.name_patrol");
            case "rescue":
                return t("contracts.name_rescue");
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
            default:
                return contract.desc;
        }
    };

    const getContractDetails = (contract: Contract) => {
        // Determine destination text
        const getDestText = () => {
            if (!contract.targetLocationType)
                return contract.targetSectorName || t("contracts.unknown");
            const typeText =
                contract.targetLocationType === "planet"
                    ? "планете"
                    : contract.targetLocationType === "station"
                      ? "станции"
                      : "кораблю";
            return `${contract.targetLocationName} (${typeText}), сектор ${contract.targetSectorName}`;
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
                                .replace("{{destination}}", getDestText()),
                        },
                        {
                            label: t("contracts.task_destination"),
                            value: getDestText(),
                        },
                        {
                            label: t("contracts.task_where"),
                            value: t("contracts.scan_auto"),
                        },
                    ],
                };
            case "scan_planet":
                return {
                    type: t("contracts.type_scan"),
                    tasks: [
                        {
                            label: t("contracts.task_what"),
                            value: t("contracts.scan_planet").replace(
                                "{{planetType}}",
                                contract.planetType?.toLowerCase() || "",
                            ),
                        },
                        {
                            label: t("contracts.task_target"),
                            value: contract.targetPlanetName
                                ? `${contract.targetPlanetName} (${contract.targetSectorName})`
                                : t("contracts.unknown"),
                        },
                        {
                            label: t("contracts.task_requirements"),
                            value: t("contracts.scan_requirement"),
                        },
                        {
                            label: t("contracts.task_where"),
                            value: t("contracts.scan_auto"),
                        },
                    ],
                };
            case "supply_run":
                if (!contract.cargo) return;

                const cargoName = TRADE_GOODS[contract.cargo as Goods]?.name;

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
                            value: t("contracts.combat_destroy"),
                        },
                        {
                            label: t("contracts.task_target"),
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
            case "rescue":
                return {
                    type: t("contracts.type_rescue"),
                    tasks: [
                        {
                            label: t("contracts.task_what"),
                            value: t("contracts.rescue_enter")
                                .replace(
                                    "{{stormName}}",
                                    contract.stormName ||
                                        t("contracts.unknown"),
                                )
                                .replace(
                                    "{{sectorName}}",
                                    contract.sectorName ||
                                        t("contracts.unknown"),
                                ),
                        },
                        {
                            label: t("contracts.task_where"),
                            value: t("contracts.rescue_auto"),
                        },
                    ],
                };
            case "mining":
                return {
                    type: t("contracts.type_mining"),
                    tasks: [
                        {
                            label: t("contracts.task_what"),
                            value: t("contracts.mining_find"),
                        },
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
            case "patrol":
                const visitedCount = contract.visitedSectors?.length || 0;
                const targetCount = contract.targetSectors?.length || 0;
                return {
                    type: t("contracts.type_patrol"),
                    tasks: [
                        {
                            label: t("contracts.task_what"),
                            value: t("contracts.patrol_visit")
                                .replace(
                                    "{{sectors}}",
                                    contract.targetSectorNames ||
                                        t("contracts.unknown"),
                                )
                                .replace("{{visited}}", String(visitedCount))
                                .replace("{{target}}", String(targetCount)),
                        },
                        {
                            label: t("contracts.task_where"),
                            value: t("contracts.patrol_auto"),
                        },
                    ],
                };
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

    return (
        <>
            <div className="flex flex-col gap-2.5">
                {activeContracts.map((contract) => (
                    <div
                        key={contract.id}
                        className="bg-[rgba(0,255,65,0.03)] border border-[#00ff41] p-3 cursor-pointer hover:bg-[rgba(0,255,65,0.1)]"
                        onClick={() => setSelectedContract(contract)}
                    >
                        <div className="text-[#00d4ff] font-bold">
                            {getContractName(contract)}
                        </div>
                        <div className="text-[11px] mt-1">
                            {getStatusText(contract)}
                        </div>
                        <div className="text-[#ffb000] text-xs mt-1">
                            {t("contracts.reward_short", {
                                reward: contract.reward,
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <Dialog
                open={!!selectedContract}
                onOpenChange={() => setSelectedContract(null)}
            >
                <DialogContent className="bg-[rgba(10,20,30,0.95)] border-2 border-[#00ff41] text-[#00ff41] max-w-md w-[calc(100%-2rem)] md:w-auto">
                    <DialogHeader>
                        <DialogTitle className="text-[#ffb000] font-['Orbitron']">
                            {selectedContract?.desc}
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
                                    <div>
                                        <span className="text-[#ffb000]">
                                            {t("contracts.type")}:{" "}
                                        </span>
                                        <span className="text-[#00d4ff]">
                                            {details.type}
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        {details.tasks.map((task, index) => (
                                            <div
                                                key={index}
                                                className="bg-[rgba(0,255,65,0.05)] border-l-2 border-[#ffb000] pl-3 py-1"
                                            >
                                                <div className="text-[#ffb000] text-xs">
                                                    {task.label}:
                                                </div>
                                                <div className="text-[#00ff41]">
                                                    {task.value}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-4 border-t border-[#00ff41]">
                                        <span className="text-[#00ff41] text-lg">
                                            {t("contracts.reward_label")}{" "}
                                            {selectedContract.reward}₢
                                        </span>
                                    </div>

                                    <div className="flex gap-2 justify-center">
                                        <Button
                                            variant="destructive"
                                            onClick={() => {
                                                cancelContract(
                                                    selectedContract.id,
                                                );
                                                setSelectedContract(null);
                                            }}
                                            className="bg-transparent border-2 border-[#ff0040] text-[#ff0040] hover:bg-[#ff0040] hover:text-[#050810]"
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
