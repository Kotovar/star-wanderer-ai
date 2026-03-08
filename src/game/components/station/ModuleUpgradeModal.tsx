"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { ShopItem, Module } from "../../types";
import { MODULES_BY_LEVEL } from "./station-data";

interface ModuleUpgradeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pendingUpgrade: ShopItem | null;
    stationItems: ShopItem[];
    shipModules: Module[];
    buyItem: (item: ShopItem, moduleId?: number) => void;
}

export function ModuleUpgradeModal({
    open,
    onOpenChange,
    pendingUpgrade,
    stationItems,
    shipModules,
    buyItem,
}: ModuleUpgradeModalProps) {
    if (!pendingUpgrade) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[rgba(10,20,30,0.95)] border-2 border-[#ffb000] text-[#00ff41] max-w-md w-[calc(100%-2rem)] md:w-auto">
                <DialogHeader>
                    <DialogTitle className="text-[#ffb000] font-['Orbitron']">
                        Выберите модуль для улучшения
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Выбор модуля для улучшения
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    <div className="text-sm text-[#888] mb-4">
                        {pendingUpgrade.name} —{" "}
                        {pendingUpgrade.effect?.power
                            ? `+${pendingUpgrade.effect.power} мощности`
                            : pendingUpgrade.effect?.capacity
                              ? `+${pendingUpgrade.effect.capacity} ёмкости`
                              : "Улучшение"}
                    </div>

                    <ModuleSelectionList
                        targetType={pendingUpgrade.targetType}
                        stationItems={stationItems}
                        shipModules={shipModules}
                        pendingUpgrade={pendingUpgrade}
                        buyItem={buyItem}
                        onClose={onOpenChange}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}

interface ModuleSelectionListProps {
    targetType: string | undefined;
    stationItems: ShopItem[];
    shipModules: Module[];
    pendingUpgrade: ShopItem;
    buyItem: (item: ShopItem, moduleId?: number) => void;
    onClose: (open: boolean) => void;
}

function ModuleSelectionList({
    targetType,
    stationItems,
    shipModules,
    pendingUpgrade,
    buyItem,
    onClose,
}: ModuleSelectionListProps) {
    const eligibleModules = targetType
        ? shipModules.filter((m) => m.type === targetType)
        : [];

    if (eligibleModules.length === 0) {
        return (
            <div className="text-[#ff0040] p-3 border border-[#ff0040]">
                Нет модулей типа &quot;{targetType}&quot; для улучшения!
            </div>
        );
    }

    // Check if all modules are at max level
    const allMaxLevel = eligibleModules.every((m) => (m.level || 1) >= 3);

    if (allMaxLevel) {
        return (
            <div className="text-[#ff0040] p-4 border border-[#ff0040] bg-[rgba(255,0,64,0.05)]">
                <div className="font-bold mb-2">
                    ⚠ Все модули улучшены до максимума!
                </div>
                <div className="text-sm text-[#ff6688]">
                    Все модули типа &quot;{targetType}&quot; уже имеют
                    максимальный уровень (LV3). Для дальнейшего улучшения нужны
                    модули LV4, которые можно найти в секторах тир 3 или
                    получить с боссов.
                </div>
            </div>
        );
    }

    // Number modules of the same type for easier identification
    const modulesWithIndex = eligibleModules.map((module, index) => ({
        module,
        index: index + 1,
    }));

    return (
        <div className="max-h-62.5 overflow-y-auto space-y-2">
            {modulesWithIndex.map(({ module, index }) => {
                const isMaxLevel = (module.level || 1) >= 3;
                const currentLevel = module.level || 1;
                const nextLevel = currentLevel + 1;

                // Find the next level module template to get new consumption
                const nextModuleTemplate = (
                    MODULES_BY_LEVEL[nextLevel] || []
                ).find((m) => m.moduleType === targetType);
                const currentConsumption = module.consumption || 0;
                const nextConsumption = nextModuleTemplate?.consumption || 0;
                const consumptionDiff = nextConsumption - currentConsumption;

                // Calculate upgrade price based on module's current level
                // Find the correct upgrade item for this module's level from station items
                const upgradeItem = stationItems.find((item) => {
                    if (
                        item.type !== "upgrade" ||
                        item.targetType !== targetType
                    ) {
                        return false;
                    }
                    // Match upgrade level from ID (e.g., "reactor-upgrade-1-stationId" → 1)
                    const match = item.id.match(/upgrade-(\d+)/);
                    if (!match) return false;
                    const itemUpgradeLevel = parseInt(match[1], 10);
                    return itemUpgradeLevel === currentLevel;
                });

                // If no upgrade item found for this level, this upgrade is not available at this station tier
                const isUpgradeAvailable = upgradeItem !== undefined;
                const upgradePrice = upgradeItem?.price || pendingUpgrade.price;

                return (
                    <ModuleUpgradeCard
                        key={module.id}
                        module={module}
                        moduleIndex={index}
                        isMaxLevel={isMaxLevel}
                        isUpgradeAvailable={isUpgradeAvailable}
                        pendingUpgrade={pendingUpgrade}
                        upgradePrice={upgradePrice}
                        buyItem={buyItem}
                        onClose={onClose}
                        consumptionDiff={consumptionDiff}
                        nextLevel={nextLevel}
                    />
                );
            })}
        </div>
    );
}

interface ModuleUpgradeCardProps {
    module: Module;
    moduleIndex: number;
    isMaxLevel: boolean;
    isUpgradeAvailable: boolean;
    pendingUpgrade: ShopItem;
    upgradePrice: number;
    buyItem: (item: ShopItem, moduleId?: number) => void;
    onClose: (open: boolean) => void;
    consumptionDiff: number;
    nextLevel: number;
}

function ModuleUpgradeCard({
    module,
    moduleIndex,
    isMaxLevel,
    isUpgradeAvailable,
    pendingUpgrade,
    upgradePrice,
    buyItem,
    onClose,
    consumptionDiff,
    nextLevel,
}: ModuleUpgradeCardProps) {
    const isDisabled = isMaxLevel || !isUpgradeAvailable;

    return (
        <div
            className={`bg-[rgba(0,255,65,0.05)] border p-3 transition-colors relative ${
                isDisabled
                    ? "border-[#666] opacity-50 cursor-not-allowed bg-[rgba(30,30,30,0.3)]"
                    : "border-[#00ff41] cursor-pointer hover:bg-[rgba(0,255,65,0.1)]"
            }`}
            onClick={() => {
                if (isDisabled) return;
                buyItem(pendingUpgrade, module.id);
                onClose(false);
            }}
        >
            {(isMaxLevel || !isUpgradeAvailable) && (
                <div className="absolute top-0 right-0 bg-[#ff0040] text-white text-[9px] px-2 py-0.5 font-bold">
                    {isMaxLevel ? "MAX" : "НЕДОСТУПНО"}
                </div>
            )}
            <div className="flex justify-between items-start">
                <div className="text-[#00d4ff] font-bold pr-8">
                    {module.name} #{moduleIndex}
                </div>
                <div className="text-[10px] text-[#888] bg-[rgba(0,0,0,0.3)] px-2 py-0.5 rounded">
                    Позиция: ({module.x}, {module.y})
                </div>
            </div>
            <div className="text-xs text-[#00ff41] mt-1 flex gap-4">
                {module.power !== undefined && module.power > 0 && (
                    <span>⚡ {module.power}</span>
                )}
                {module.capacity !== undefined && module.capacity > 0 && (
                    <span>📦 {module.capacity}т</span>
                )}
                {module.fuelEfficiency !== undefined && (
                    <span>⛽эф. {module.fuelEfficiency}</span>
                )}
                {module.oxygen !== undefined && <span>💨 {module.oxygen}</span>}
                {module.shields !== undefined && module.shields > 0 && (
                    <span>🛡 Щиты: {module.shields}</span>
                )}
                {module.defense !== undefined && module.defense > 0 && (
                    <span>
                        🛡 Броня:{" "}
                        {module.type === "shield"
                            ? module.level
                            : module.defense}
                    </span>
                )}
                {module.scanRange !== undefined && (
                    <span>📡 {module.scanRange}</span>
                )}
                {module.consumption !== undefined && module.consumption > 0 && (
                    <span>⚡ -{module.consumption}</span>
                )}
            </div>
            <div className="text-[10px] text-[#ffb000] mt-1 flex justify-between">
                <span>
                    Уровень: {module.level} → {nextLevel}
                </span>
                {consumptionDiff > 0 && (
                    <span className="text-[#ff0040]">
                        ⚡ Потребление: +{consumptionDiff}
                    </span>
                )}
            </div>
            <div className="text-sm text-[#ffb000] mt-2 font-bold">
                💰 Цена: {upgradePrice}₢
            </div>
        </div>
    );
}
