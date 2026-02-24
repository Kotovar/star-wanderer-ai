"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { ShopItem, Module } from "../../types";

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
            <DialogContent
                className="bg-[rgba(10,20,30,0.95)] border-2 border-[#ffb000] text-[#00ff41] max-w-md"
                aria-describedby="upgrade-modal-description"
            >
                <DialogHeader>
                    <DialogTitle className="text-[#ffb000] font-['Orbitron']">
                        Выберите модуль для улучшения
                    </DialogTitle>
                    <div id="upgrade-modal-description" className="sr-only">
                        Выбор модуля для улучшения
                    </div>
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

                return (
                    <ModuleUpgradeCard
                        key={module.id}
                        module={module}
                        isMaxLevel={isMaxLevel}
                        pendingUpgrade={pendingUpgrade}
                        buyItem={buyItem}
                        onClose={onClose}
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
}

function ModuleUpgradeCard({
    module,
    isMaxLevel,
    pendingUpgrade,
    buyItem,
    onClose,
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
                {module.defense !== undefined && (
                    <span>🛡 {module.defense}</span>
                )}
                {module.scanRange !== undefined && (
                    <span>📡 {module.scanRange}</span>
                )}
            </div>
            {module.level && (
                <div className="text-[10px] text-[#ffb000] mt-1">
                    Уровень: {module.level}
                </div>
            )}
            {isMaxLevel && (
                <div className="text-[9px] text-[#ff0040] mt-1">
                    ⚠ МАКСИМАЛЬНЫЙ УРОВЕНЬ
                </div>
            )}
        </div>
    );
}
