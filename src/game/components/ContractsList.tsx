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
                return `📦 Доставить в ${contract.targetSectorName}`;
            case "scan_planet":
                return `📡 Сканировать планету в ${contract.targetSectorName}`;
            case "combat":
                return `⚔ Зачистить ${contract.sectorName}`;
            case "research":
                return `🔬 Исследовать ${contract.requiresAnomalies} аномалии (${contract.visitedAnomalies || 0}/${contract.requiresAnomalies})`;
            default:
                return "✓ Выполнить задание";
        }
    };

    const getContractDetails = (contract: Contract) => {
        // Determine destination text
        const getDestText = () => {
            if (!contract.targetLocationType)
                return contract.targetSectorName || "Неизвестно";
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
                    type: "Доставка груза",
                    tasks: [
                        {
                            label: "Что сделать",
                            value: `Доставить груз "${deliveryCargoName}" (10т) на ${getDestText()}`,
                        },
                        { label: "Куда доставить", value: getDestText() },
                        { label: "Где сдать", value: "На месте назначения" },
                    ],
                };
            case "scan_planet":
                return {
                    type: "Сканирование",
                    tasks: [
                        {
                            label: "Что сделать",
                            value: `Провести сканирование ${contract.planetType?.toLowerCase() || ""} планеты`,
                        },
                        {
                            label: "Целевая планета",
                            value: contract.targetPlanetName
                                ? `${contract.targetPlanetName} (${contract.targetSectorName})`
                                : "Неизвестно",
                        },
                        {
                            label: "Требования",
                            value: "Необходим модуль сканера на корабле",
                        },
                        {
                            label: "Где сдать",
                            value: "Автоматически после сканирования",
                        },
                    ],
                };
            case "supply_run":
                if (!contract.cargo) return;

                const cargoName = TRADE_GOODS[contract.cargo as Goods]?.name;

                return {
                    type: "Поставка товаров",
                    tasks: [
                        {
                            label: "Что сделать",
                            value: `Найти и доставить ${cargoName} (${contract.quantity}т)`,
                        },
                        {
                            label: "Где найти",
                            value: "Купить на любой торговой станции или найти в другом месте",
                        },
                        {
                            label: "Где сдать",
                            value: `${contract.sourceType === "planet" ? "Планета" : "Корабль"} "${contract.sourceName}" (${contract.sourceSectorName})`,
                        },
                    ],
                };
            case "combat":
                return {
                    type: "Боевое задание",
                    tasks: [
                        {
                            label: "Что сделать",
                            value: "Уничтожить всех врагов в указанном секторе",
                        },
                        {
                            label: "Целевой сектор",
                            value: contract.sectorName || "Неизвестно",
                        },
                        {
                            label: "Где сдать",
                            value: "Автоматически после победы",
                        },
                    ],
                };
            case "research":
                return {
                    type: "Исследование",
                    tasks: [
                        {
                            label: "Что сделать",
                            value: `Исследовать ${contract.requiresAnomalies} аномалии`,
                        },
                        {
                            label: "Где выполнить",
                            value: "В любом секторе",
                        },
                        {
                            label: "Прогресс",
                            value: `${contract.visitedAnomalies || 0} / ${contract.requiresAnomalies} аномалий`,
                        },
                        {
                            label: "Требования",
                            value: "Необходим учёный соответствующего уровня",
                        },
                        {
                            label: "Где сдать",
                            value: "Автоматически при выполнении",
                        },
                    ],
                };
            case "rescue":
                return {
                    type: "Спасение",
                    tasks: [
                        {
                            label: "Что сделать",
                            value: `Войти в ${contract.stormName || "шторм"} в секторе ${contract.sectorName || "Неизвестно"}`,
                        },
                        {
                            label: "Где сдать",
                            value: "Автоматически после прохождения шторма",
                        },
                    ],
                };
            case "mining":
                return {
                    type: "Добыча",
                    tasks: [
                        {
                            label: "Что сделать",
                            value: "Найти артефакт (исследовать аномалии или победить босса)",
                        },
                        {
                            label: "Прогресс",
                            value: contract.bossDefeated
                                ? "✓ Босс побеждён, ждём доставки"
                                : "⚠ Босс не найден",
                        },
                        {
                            label: "Где сдать",
                            value: "Автоматически при находке артефакта",
                        },
                    ],
                };
            case "patrol":
                const visitedCount = contract.visitedSectors?.length || 0;
                const targetCount = contract.targetSectors?.length || 0;
                return {
                    type: "Патрулирование",
                    tasks: [
                        {
                            label: "Что сделать",
                            value: `Посетить сектора: ${contract.targetSectorNames || "Неизвестно"} (${visitedCount}/${targetCount})`,
                        },
                        {
                            label: "Где сдать",
                            value: "Автоматически после посещения всех секторов",
                        },
                    ],
                };
            case "bounty":
                return {
                    type: "Охота за головой",
                    tasks: [
                        {
                            label: "Что сделать",
                            value: `Уничтожить врага (угроза ${contract.targetThreat || 1}) в секторе ${contract.targetSectorName || "Неизвестно"}`,
                        },
                        {
                            label: "Где сдать",
                            value: "Автоматически после победы",
                        },
                    ],
                };
            case "diplomacy":
                return {
                    type: "Дипломатия",
                    tasks: [
                        {
                            label: "Что сделать",
                            value: `Посетить планету ${contract.targetPlanetName || "Неизвестно"} (${contract.targetPlanetType || "планета"})`,
                        },
                        {
                            label: "Целевой сектор",
                            value: contract.targetSectorName || "Неизвестно",
                        },
                        {
                            label: "Где сдать",
                            value: "Автоматически при посещении планеты",
                        },
                    ],
                };
            default:
                return {
                    type: "Задание",
                    tasks: [
                        { label: "Что сделать", value: contract.desc },
                        { label: "Где сдать", value: "См. описание задания" },
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
                            {contract.desc}
                        </div>
                        <div className="text-[11px] mt-1">
                            {getStatusText(contract)}
                        </div>
                        <div className="text-[#ffb000] text-xs mt-1">
                            💰 Награда: {contract.reward}₢
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
                            Детали задания
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
                                            💰 Награда:{" "}
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
