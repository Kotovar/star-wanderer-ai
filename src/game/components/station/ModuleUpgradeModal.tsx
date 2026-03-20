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
import { useTranslation } from "@/lib/useTranslation";

// Helper to get translated module name
function getTranslatedModuleName(
    moduleType: string,
    t: (key: string, params?: Record<string, string | number>) => string,
): string {
    const nameMap: Record<string, string> = {
        reactor: "module_names.reactor",
        cockpit: "module_names.cockpit",
        lifesupport: "module_names.lifesupport",
        cargo: "module_names.cargo",
        weaponbay: "module_names.weaponbay",
        shield: "module_names.shield",
        medical: "module_names.medical",
        scanner: "module_names.scanner",
        engine: "module_names.engine",
        fueltank: "module_names.fueltank",
        drill: "module_names.drill",
        ai_core: "module_names.ai_core",
        lab: "module_names.lab",
    };
    const key = nameMap[moduleType];
    return key ? t(key) : moduleType;
}

// Helper to get translated upgrade name
function getTranslatedUpgradeName(
    item: ShopItem,
    t: (key: string, params?: Record<string, string | number>) => string,
): string {
    if (item.type !== "upgrade" || !item.targetType) return item.name;

    const nameMap: Record<string, string> = {
        reactor: "station_upgrades.reactor_upgrade",
        cargo: "station_upgrades.cargo_expansion",
        fueltank: "station_upgrades.tank_upgrade",
        lifesupport: "station_upgrades.lifesupport_upgrade",
        engine: "station_upgrades.engine_tuning",
        weaponbay: "station_upgrades.weaponbay_upgrade",
    };
    const key = nameMap[item.targetType];
    return key ? t(key) : item.name;
}
// 🏥 +{module.healing} HP
// Helper to get translated upgrade effect
function getUpgradeEffect(
    item: ShopItem,
    t: (key: string, params?: Record<string, string | number>) => string,
): string {
    if (item.type !== "upgrade") return "";

    if (item.effect?.power) {
        return t("station_upgrades.energy", { value: item.effect.power });
    }
    if (item.effect?.capacity && item.targetType === "cargo") {
        return t("station_upgrades.capacity", { value: item.effect.capacity });
    }
    if (item.effect?.capacity && item.targetType === "fueltank") {
        return t("station_upgrades.fuel", { value: item.effect.capacity });
    }
    if (item.effect?.oxygen) {
        return t("station_upgrades.oxygen", { value: item.effect.oxygen });
    }
    if (item.effect?.healing) {
        return t("station_upgrades.healing", { value: item.effect.healing });
    }
    if (item.effect?.fuelEfficiency) {
        return t("station_upgrades.efficiency", {
            value: item.effect.fuelEfficiency,
        });
    }
    return "";
}

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
    const { t } = useTranslation();

    if (!pendingUpgrade) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[rgba(10,20,30,0.95)] border-2 border-[#ffb000] text-[#00ff41] max-w-md w-[calc(100%-2rem)] md:w-auto">
                <DialogHeader>
                    <DialogTitle className="text-[#ffb000] font-['Orbitron']">
                        {t("station_upgrades.select_module")}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {t("station_upgrades.select_module_desc")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    <div className="text-sm text-[#888] mb-4">
                        {getTranslatedUpgradeName(pendingUpgrade, t)}:{" "}
                        {getUpgradeEffect(pendingUpgrade, t)}
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
    const { t } = useTranslation();

    // targetType must be defined for this to work
    if (!targetType) return null;

    const eligibleModules = shipModules.filter((m) => m.type === targetType);

    if (eligibleModules.length === 0) {
        return (
            <div className="text-[#ff0040] p-3 border border-[#ff0040]">
                {t("station_upgrades.no_modules")} &quot;
                {getTranslatedModuleName(targetType, t)}&quot;{" "}
                {t("station_upgrades.for_upgrade")}!
            </div>
        );
    }

    // Check if all modules are at max level
    const allMaxLevel = eligibleModules.every((m) => (m.level || 1) >= 3);

    if (allMaxLevel) {
        return (
            <div className="text-[#ff0040] p-4 border border-[#ff0040] bg-[rgba(255,0,64,0.05)]">
                <div className="font-bold mb-2">
                    {t("station_upgrades.all_max_title")}
                </div>
                <div className="text-sm text-[#ff6688]">
                    {t("station_upgrades.all_max_desc", {
                        type: getTranslatedModuleName(targetType, t),
                    })}
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

                const currentHealing = module.healing ?? 0;
                const nextHealing = nextModuleTemplate?.healing ?? 0;
                const healingDiff = nextHealing - currentHealing;
                const healingAfter = nextHealing > 0 ? nextHealing : undefined;

                const powerAfter = nextModuleTemplate?.power;
                const capacityAfter = nextModuleTemplate?.capacity;
                const shieldsAfter = nextModuleTemplate?.shields;
                const shieldRegenAfter = nextModuleTemplate?.shieldRegen;
                const scanRangeAfter = nextModuleTemplate?.scanRange;
                const oxygenAfter = nextModuleTemplate?.oxygen;
                const researchOutputAfter = nextModuleTemplate?.researchOutput;

                const fuelEfficiencyAfter =
                    module.fuelEfficiency !== undefined
                        ? Math.max(
                              1,
                              (module.fuelEfficiency || 10) +
                                  (pendingUpgrade.effect?.fuelEfficiency || 0),
                          )
                        : undefined;

                const defenseAfter = nextModuleTemplate?.defense ?? nextLevel;

                const newWidth = nextModuleTemplate?.width ?? module.width;
                const newHeight = nextModuleTemplate?.height ?? module.height;

                const consumptionAfter =
                    targetType === "engine"
                        ? nextLevel
                        : (nextModuleTemplate?.consumption ??
                          currentConsumption);

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
                        healingDiff={healingDiff}
                        healingAfter={healingAfter}
                        nextLevel={nextLevel}
                        powerAfter={powerAfter}
                        fuelEfficiencyAfter={fuelEfficiencyAfter}
                        defenseAfter={defenseAfter}
                        consumptionAfter={consumptionAfter}
                        capacityAfter={capacityAfter}
                        shieldsAfter={shieldsAfter}
                        shieldRegenAfter={shieldRegenAfter}
                        scanRangeAfter={scanRangeAfter}
                        oxygenAfter={oxygenAfter}
                        researchOutputAfter={researchOutputAfter}
                        newWidth={newWidth}
                        newHeight={newHeight}
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
    healingDiff?: number;
    healingAfter?: number;
    powerAfter?: number;
    fuelEfficiencyAfter?: number;
    defenseAfter?: number;
    consumptionAfter?: number;
    capacityAfter?: number;
    shieldsAfter?: number;
    shieldRegenAfter?: number;
    scanRangeAfter?: number;
    oxygenAfter?: number;
    researchOutputAfter?: number;
    newWidth?: number;
    newHeight?: number;
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
    nextLevel,
    healingAfter,
    powerAfter,
    fuelEfficiencyAfter,
    defenseAfter,
    consumptionAfter,
    capacityAfter,
    shieldsAfter,
    shieldRegenAfter,
    scanRangeAfter,
    oxygenAfter,
    researchOutputAfter,
    newWidth,
    newHeight,
}: ModuleUpgradeCardProps) {
    const { t } = useTranslation();
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
                    {isMaxLevel
                        ? t("station_upgrades.max")
                        : t("station_upgrades.unavailable")}
                </div>
            )}
            <div className="flex justify-between items-start">
                <div className="text-[#00d4ff] font-bold pr-8">
                    {getTranslatedModuleName(module.type, t)} #{moduleIndex}
                </div>
                <div className="text-[10px] text-[#888] bg-[rgba(0,0,0,0.3)] px-2 py-0.5 rounded">
                    {t("station_upgrades.position")}: ({module.x}, {module.y})
                </div>
            </div>
            <div className="text-xs text-[#00ff41] mt-1 flex gap-4">
                {module.power !== undefined && module.power > 0 && (
                    <span>
                        ⚡ {module.power}
                        {powerAfter !== undefined &&
                            powerAfter !== module.power && (
                                <span className="text-[#ffb000]">
                                    {" "}
                                    → {powerAfter}
                                </span>
                            )}
                    </span>
                )}
                {module.capacity !== undefined && module.capacity > 0 && (
                    <span>
                        {module.type === "fueltank" ? "⛽" : "📦"}{" "}
                        {module.capacity}
                        {module.type === "cargo" && "т"}
                        {capacityAfter !== undefined &&
                            capacityAfter !== module.capacity && (
                                <span className="text-[#ffb000]">
                                    {" "}
                                    → {capacityAfter}
                                    {module.type === "cargo" && "т"}
                                </span>
                            )}
                    </span>
                )}
                {module.fuelEfficiency !== undefined && (
                    <span>
                        ⛽эф. {module.fuelEfficiency}
                        {fuelEfficiencyAfter !== undefined &&
                            fuelEfficiencyAfter !== module.fuelEfficiency && (
                                <span className="text-[#ffb000]">
                                    {" "}
                                    → {fuelEfficiencyAfter}
                                </span>
                            )}
                    </span>
                )}
                {module.oxygen !== undefined && (
                    <span>
                        💨 {module.oxygen}
                        {oxygenAfter !== undefined &&
                            oxygenAfter !== module.oxygen && (
                                <span className="text-[#ffb000]">
                                    {" "}
                                    → {oxygenAfter}
                                </span>
                            )}
                    </span>
                )}
                {module.researchOutput !== undefined &&
                    module.researchOutput > 0 && (
                    <span>
                        🔬 {module.researchOutput}
                        {researchOutputAfter !== undefined &&
                            researchOutputAfter !== module.researchOutput && (
                                <span className="text-[#ffb000]">
                                    {" "}
                                    → {researchOutputAfter}
                                </span>
                            )}
                    </span>
                )}
                {module.type === "drill" && (
                    <span>
                        ⛏ {module.level ?? 1}
                        <span className="text-[#ffb000]"> → {nextLevel}</span>
                    </span>
                )}
                {module.shields !== undefined && module.shields > 0 && (
                    <span>
                        {t("module_list.shields")}: {module.shields}
                        {shieldsAfter !== undefined &&
                            shieldsAfter !== module.shields && (
                                <span className="text-[#ffb000]">
                                    {" "}
                                    → {shieldsAfter}
                                </span>
                            )}
                    </span>
                )}
                {module.shieldRegen !== undefined && module.shieldRegen > 0 && (
                    <span>
                        🔄 {module.shieldRegen}
                        {shieldRegenAfter !== undefined &&
                            shieldRegenAfter !== module.shieldRegen && (
                                <span className="text-[#ffb000]">
                                    {" "}
                                    → {shieldRegenAfter}
                                </span>
                            )}
                    </span>
                )}
                {module.defense !== undefined && module.defense > 0 && (
                    <span>
                        {t("module_list.armor")}: {module.defense}
                        {defenseAfter !== undefined &&
                            defenseAfter !== module.defense && (
                                <span className="text-[#ffb000]">
                                    {" "}
                                    → {defenseAfter}
                                </span>
                            )}
                    </span>
                )}
                {module.scanRange !== undefined && (
                    <span>
                        📡 {module.scanRange}
                        {scanRangeAfter !== undefined &&
                            scanRangeAfter !== module.scanRange && (
                                <span className="text-[#ffb000]">
                                    {" "}
                                    → {scanRangeAfter}
                                </span>
                            )}</span>
                )}
                {module.consumption !== undefined && module.consumption > 0 && (
                    <span>
                        ⚡ -{module.consumption}
                        {consumptionAfter !== undefined &&
                            consumptionAfter !== module.consumption && (
                                <span className="text-[#ff6644]">
                                    {" "}
                                    → -{consumptionAfter}
                                </span>
                            )}
                    </span>
                )}
                {module.healing !== undefined && module.healing > 0 && (
                    <span>
                        🏥 {module.healing} HP
                        {healingAfter !== undefined &&
                            healingAfter !== module.healing && (
                                <span className="text-[#ffb000]">
                                    {" "}
                                    → {healingAfter} HP
                                </span>
                            )}
                    </span>
                )}
                {module.type === "weaponbay" && (
                    <span>
                        ⚔ +{((module.level ?? 1) - 1) * 10}%
                        <span className="text-[#ffb000]">
                            {" "}
                            → +{(nextLevel - 1) * 10}%
                        </span>
                    </span>
                )}
            </div>
            <div className="text-[10px] text-[#ffb000] mt-1 flex gap-3">
                <span>
                    {t("station_upgrades.level")}: {module.level} → {nextLevel}
                </span>
                {newWidth !== undefined &&
                    newHeight !== undefined &&
                    (newWidth !== module.width ||
                        newHeight !== module.height) && (
                        <span>
                            📐 {module.width}×{module.height} → {newWidth}×
                            {newHeight}
                        </span>
                    )}
            </div>
            <div className="text-sm text-[#ffb000] mt-2 font-bold">
                💰 {t("station_upgrades.price")}: {upgradePrice}₢
            </div>
        </div>
    );
}
