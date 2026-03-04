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
    shipModules: Module[];
    buyItem: (item: ShopItem, moduleId?: number) => void;
}

export function ModuleUpgradeModal({
    open,
    onOpenChange,
    pendingUpgrade,
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
                    <div className="text-sm text-[#ffb000] mb-2">
                        💰 Цена: {pendingUpgrade.price}₢
                    </div>

                    <ModuleSelectionList
                        targetType={pendingUpgrade.targetType}
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
    shipModules: Module[];
    pendingUpgrade: ShopItem;
    buyItem: (item: ShopItem, moduleId?: number) => void;
    onClose: (open: boolean) => void;
}

function ModuleSelectionList({
    targetType,
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

    return (
        <div className="max-h-62.5 overflow-y-auto space-y-2">
            {eligibleModules.map((module) => {
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

                return (
                    <ModuleUpgradeCard
                        key={module.id}
                        module={module}
                        isMaxLevel={isMaxLevel}
                        pendingUpgrade={pendingUpgrade}
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
    isMaxLevel: boolean;
    pendingUpgrade: ShopItem;
    buyItem: (item: ShopItem, moduleId?: number) => void;
    onClose: (open: boolean) => void;
    consumptionDiff: number;
    nextLevel: number;
}

function ModuleUpgradeCard({
    module,
    isMaxLevel,
    pendingUpgrade,
    buyItem,
    onClose,
    consumptionDiff,
    nextLevel,
}: ModuleUpgradeCardProps) {
    return (
        <div
            className={`bg-[rgba(0,255,65,0.05)] border p-3 transition-colors ${
                isMaxLevel
                    ? "border-[#666] opacity-60 cursor-not-allowed"
                    : "border-[#00ff41] cursor-pointer hover:bg-[rgba(0,255,65,0.1)]"
            }`}
            onClick={() => {
                if (isMaxLevel) return;
                buyItem(pendingUpgrade, module.id);
                onClose(false);
            }}
        >
            <div className="text-[#00d4ff] font-bold">{module.name}</div>
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
            {isMaxLevel && (
                <div className="text-[9px] text-[#ff0040] mt-1">
                    ⚠ МАКСИМАЛЬНЫЙ УРОВЕНЬ
                </div>
            )}
        </div>
    );
}
