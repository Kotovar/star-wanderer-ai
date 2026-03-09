"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { WEAPON_TYPES } from "../../constants";
import type { ShopItem, Module } from "../../types";
import { ModuleDetailDialog } from "../ModuleList";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/useTranslation";

// Helper to get translated module name
function getTranslatedModuleName(
    moduleType: string,
    t: (key: string) => string,
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
    item: { type: string; targetType?: string; name: string },
    t: (key: string, params?: Record<string, string | number>) => string,
): string {
    if (item.type !== "upgrade" || !item.targetType) return item.name;

    const nameMap: Record<string, string> = {
        reactor: "station_upgrades.reactor_upgrade",
        cargo: "station_upgrades.cargo_expansion",
        fueltank: "station_upgrades.tank_upgrade",
        lifesupport: "station_upgrades.lifesupport_upgrade",
        engine: "station_upgrades.engine_tuning",
        scanner: "station_upgrades.scanner_upgrade",
        drill: "station_upgrades.drill_upgrade",
        shield: "station_upgrades.shield_upgrade",
        lab: "station_upgrades.lab_upgrade",
        medical: "station_upgrades.medical_upgrade",
    };
    const key = nameMap[item.targetType];
    return key ? t(key) : item.name;
}

interface ShopTabProps {
    stationId: string;
    stationItems: ShopItem[];
    stationInventory: Record<string, Record<string, number>>;
    credits: number;
    ship: {
        modules: Module[];
    };
    stationConfig?: {
        guaranteedWeapons?: string[];
        guaranteedModules: string[];
    };
    buyItem: (item: ShopItem, moduleId?: number) => void;
    onUpgradeClick: (item: ShopItem) => void;
}

export function ShopTab({
    stationId,
    stationItems,
    stationInventory,
    credits,
    ship,
    buyItem,
    onUpgradeClick,
}: ShopTabProps) {
    const inv = stationId ? stationInventory[stationId] || {} : {};
    const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
    const [selectedWeapon, setSelectedWeapon] = useState<ShopItem | null>(null);

    // Get owned module types for filtering upgrades
    const ownedModuleTypes = useMemo(() => {
        const types = new Set<string>();
        ship.modules.forEach((m) => types.add(m.type));
        return types;
    }, [ship.modules]);

    // Filter items - hide upgrades for modules we don't own
    const filteredItems = useMemo(() => {
        return stationItems.filter((item) => {
            // Always show non-upgrade items
            if (item.type !== "upgrade") return true;
            // Only show upgrades for modules we own
            if (!item.targetType || !ownedModuleTypes.has(item.targetType)) {
                return false;
            }

            // For all upgrades, check if any module can use it
            // Extract upgrade level from ID (e.g., "reactor-upgrade-1-stationId" → 1)
            const upgradeMatch = item.id.match(/-upgrade-(\d+)-/);
            if (!upgradeMatch) return true;

            const upgradeLevel = parseInt(upgradeMatch[1], 10);

            const modulesOfType = ship.modules.filter(
                (m) =>
                    m.type === item.targetType && !m.disabled && m.health > 0,
            );

            // Check if any module matches this upgrade level
            const hasMatchingModule = modulesOfType.some(
                (m) => (m.level || 1) === upgradeLevel,
            );

            // Hide upgrade if all modules are at max level (3)
            const allAtMaxLevel = modulesOfType.every(
                (m) => (m.level || 1) >= 3,
            );
            if (allAtMaxLevel) return false;

            // Show upgrade if any module can use it
            return hasMatchingModule;
        });
    }, [stationItems, ownedModuleTypes, ship.modules]);

    return (
        <>
            <div className="flex flex-col gap-2.5 max-h-[55vh] overflow-y-auto pr-1">
                {filteredItems.map((item) => {
                    const stockLeft =
                        inv[item.id] !== undefined
                            ? Math.max(0, item.stock - inv[item.id])
                            : item.stock;

                    // For upgrades, check if all modules of this type are at max level (3)
                    const isUpgrade = item.type === "upgrade";
                    let soldOut = false;
                    if (isUpgrade && item.targetType) {
                        const modulesOfType = ship.modules.filter(
                            (m) => m.type === item.targetType,
                        );
                        // Sold out if all modules are at max level (3)
                        soldOut = modulesOfType.every(
                            (m) => (m.level || 1) >= 3,
                        );
                    } else {
                        soldOut = stockLeft === 0;
                    }

                    // Check weapon bay requirement - weapons require weapon bay with free slots
                    const hasFreeWeaponSlot = ship.modules.some(
                        (m) =>
                            m.type === "weaponbay" &&
                            m.weapons &&
                            m.weapons.some((w) => w === null),
                    );
                    const noWB = Boolean(
                        item.requiresWeaponBay && !hasFreeWeaponSlot,
                    );

                    const hasScanner = ship.modules.some(
                        (m) => m.type === "scanner",
                    );
                    const hasDrill = ship.modules.some(
                        (m) => m.type === "drill",
                    );
                    // Only check alreadyOwned for regular modules, not upgrades
                    const isScanner =
                        item.type === "module" &&
                        item.moduleType === "scanner" &&
                        !item.id.includes("quantum");
                    const isDrill =
                        item.type === "module" &&
                        item.moduleType === "drill" &&
                        !item.id.includes("ancient");
                    const alreadyOwned =
                        (isScanner && hasScanner) || (isDrill && hasDrill);

                    const disabled = Boolean(
                        soldOut || noWB || credits < item.price || alreadyOwned,
                    );

                    const isUnique =
                        item.id.includes("ancient") ||
                        item.id.includes("fusion") ||
                        item.id.includes("quantum");

                    return (
                        <ShopItemCard
                            key={item.id}
                            item={item}
                            stockLeft={stockLeft}
                            credits={credits}
                            disabled={disabled}
                            soldOut={soldOut}
                            noWB={noWB}
                            alreadyOwned={alreadyOwned}
                            isUnique={isUnique}
                            isUpgrade={isUpgrade}
                            onViewDetails={() =>
                                item.type === "upgrade"
                                    ? onUpgradeClick(item)
                                    : item.type === "weapon"
                                      ? setSelectedWeapon(item)
                                      : setSelectedItem(item)
                            }
                            onBuy={() => {
                                if (
                                    item.type === "upgrade" &&
                                    item.targetType
                                ) {
                                    onUpgradeClick(item);
                                } else {
                                    buyItem(item);
                                }
                            }}
                        />
                    );
                })}
            </div>
            {selectedItem && selectedItem.type === "module" && (
                <ModuleDetailDialog
                    module={{
                        id: new Date().getTime(),
                        type: selectedItem.moduleType || "reactor",
                        name: selectedItem.name,
                        health: 100,
                        maxHealth: 100,
                        power: selectedItem.power || 0,
                        consumption: selectedItem.consumption || 0,
                        defense: selectedItem.defense || 0,
                        capacity: selectedItem.capacity || 0,
                        oxygen: selectedItem.oxygen || 0,
                        scanRange: selectedItem.scanRange || 0,
                        fuelEfficiency: selectedItem.fuelEfficiency || 0,
                        width: selectedItem.width || 1,
                        height: selectedItem.height || 1,
                        x: 0,
                        y: 0,
                        level: parseInt(
                            selectedItem.id.split("-")[1] || "1",
                            10,
                        ),
                        weapons: [],
                        disabled: false,
                        movedThisTurn: false,
                    }}
                    onClose={() => setSelectedItem(null)}
                    isStationItem={true}
                />
            )}
            {/* Weapon details dialog */}
            {selectedWeapon &&
                selectedWeapon.type === "weapon" &&
                selectedWeapon.weaponType && (
                    <WeaponDetailDialog
                        weaponType={selectedWeapon.weaponType}
                        onClose={() => setSelectedWeapon(null)}
                    />
                )}
        </>
    );
}

interface ShopItemCardProps {
    item: ShopItem;
    stockLeft: number;
    credits: number;
    disabled: boolean;
    soldOut: boolean;
    noWB: boolean;
    alreadyOwned: boolean;
    isUnique: boolean;
    isUpgrade: boolean;
    onViewDetails: () => void;
    onBuy: () => void;
}

function ShopItemCard({
    item,
    stockLeft,
    disabled,
    soldOut,
    noWB,
    alreadyOwned,
    isUnique,
    isUpgrade,
    onViewDetails,
    onBuy,
}: ShopItemCardProps) {
    const { t } = useTranslation();

    // Get translated name for modules, weapons, and upgrades
    const displayName =
        item.type === "module" && item.moduleType
            ? getTranslatedModuleName(item.moduleType, t)
            : item.type === "weapon" && item.weaponType
              ? t(`weapon_types.${item.weaponType}`)
              : item.type === "upgrade" && item.targetType
                ? getTranslatedUpgradeName(item, t)
                : item.name;

    return (
        <div
            className={`flex justify-between items-center bg-[rgba(0,255,65,0.05)] border p-3 ${
                isUnique
                    ? "border-[#ffb000] bg-[rgba(255,176,0,0.05)]"
                    : "border-[#00ff41]"
            } ${disabled ? "opacity-40" : ""}`}
        >
            <div className="flex-1">
                <div
                    className={`${isUnique ? "text-[#ffb000]" : "text-[#00d4ff]"} font-bold cursor-pointer hover:underline`}
                    onClick={onViewDetails}
                >
                    {isUnique && "★ "}
                    {displayName}
                </div>
                <ItemPriceAndStock
                    price={item.price}
                    stockLeft={stockLeft}
                    soldOut={soldOut}
                    noWB={noWB}
                    alreadyOwned={alreadyOwned}
                    isUpgrade={isUpgrade}
                />
                <ItemDescription item={item} />
            </div>
            <BuyButton
                disabled={disabled}
                soldOut={soldOut}
                noWB={noWB}
                isUnique={isUnique}
                isUpgrade={isUpgrade}
                onClick={onBuy}
            />
        </div>
    );
}

function ItemPriceAndStock({
    price,
    stockLeft,
    soldOut,
    noWB,
    alreadyOwned,
    isUpgrade,
}: {
    price: number;
    stockLeft: number;
    soldOut: boolean;
    noWB: boolean;
    alreadyOwned: boolean;
    isUpgrade: boolean;
}) {
    const { t } = useTranslation();

    return (
        <div className="text-[#ffb000] mt-1 text-xs">
            💰 {isUpgrade ? "" : price + " ₢"}
            <span
                className={`${isUpgrade ? "" : "ml-4"} ${
                    soldOut || noWB || (alreadyOwned && !isUpgrade)
                        ? "text-[#ff0040]"
                        : "text-[#00ff41]"
                }`}
            >
                {soldOut
                    ? isUpgrade
                        ? t("station_upgrades.max_level")
                        : t("station_upgrades.sold_out")
                    : noWB
                      ? t("station_upgrades.need_weapon_bay")
                      : alreadyOwned && !isUpgrade
                        ? t("station_upgrades.already_owned")
                        : isUpgrade
                          ? t("station_upgrades.available")
                          : t("station_upgrades.in_stock", {
                                count: stockLeft,
                            })}
            </span>
        </div>
    );
}

type ItemDescriptionProps = {
    item: ShopItem;
};

function ItemDescription({ item }: ItemDescriptionProps) {
    const { t } = useTranslation();

    // Get module level from ID (e.g., "reactor-2-station123" = level 2)
    const getModuleLevel = () => {
        if (item.type !== "module") return null;
        // Match the first number after the module type (e.g., "drill-3" or "reactor-2")
        const match = item.id.match(
            /^(drill|reactor|cargo|shield|scanner|lifesupport|engine|fueltank|weaponbay|medical|ai_core)-(\d+)/,
        );
        return match ? parseInt(match[2]) : null;
    };
    const moduleLevel = getModuleLevel();

    return (
        <div className="text-[11px] mt-1 text-[#00ff41]">
            {/* Module level - only show for ancient/quantum modules (level 4+) */}
            {moduleLevel && moduleLevel >= 4 && (
                <div className="text-[#ffb000] mb-1">
                    ★ {t("module_list.level")}: {moduleLevel}
                </div>
            )}
            {/* Module size */}
            {item.type === "module" && item.width && item.height && (
                <div className="text-[#888] mb-1">
                    {t("module_list.size")}: {item.width}x{item.height}
                </div>
            )}
            {/* Weapon info */}
            {item.type === "weapon" && item.weaponType && (
                <span>
                    ⚔ {t(`weapon_types.${item.weaponType}`)} (
                    {WEAPON_TYPES[item.weaponType].damage})
                </span>
            )}
            {item.type === "upgrade" && item.targetType === "engine" && (
                <span>
                    {t("station_upgrades.efficiency", {
                        value: item.effect?.fuelEfficiency ?? 2,
                    })}
                </span>
            )}
            {item.type === "upgrade" &&
                item.targetType === "fueltank" &&
                t("station_upgrades.fuel", {
                    value: item.effect?.capacity ?? 20,
                })}
            {item.type === "upgrade" &&
                item.targetType === "reactor" &&
                t("station_upgrades.energy", {
                    value: item.effect?.power ?? 5,
                })}
            {item.type === "upgrade" &&
                item.targetType === "cargo" &&
                t("station_upgrades.capacity", {
                    value: item.effect?.capacity ?? 20,
                })}
            {item.type === "upgrade" &&
                item.targetType === "lifesupport" &&
                t("station_upgrades.oxygen", {
                    value: item.effect?.oxygen ?? 3,
                })}
            {item.type === "upgrade" &&
                item.targetType === "scanner" &&
                `📡 +${item.effect?.scanRange ?? 2} ${t("module_list.scan_range")}`}
            {item.type === "upgrade" &&
                item.targetType === "drill" &&
                `⛏ +${item.effect?.level ?? 2} ${t("module_list.drill_level")}`}
            {item.type === "upgrade" &&
                item.targetType === "shield" &&
                `🛡 +${item.effect?.shields ?? 15} ${t("module_list.shields")}`}
            {item.type === "upgrade" &&
                item.targetType === "lab" &&
                `🔬 +${item.effect?.researchOutput ?? 3} ${t("module_list.search_per_turn")}`}
            {item.type === "upgrade" &&
                item.targetType === "medical" &&
                `🏥 +${item.effect?.healing ?? 6} ${t("crew_member.regen_short").replace("❤ Регенерация: +", "").replace("/ход", "")}`}
        </div>
    );
}

function BuyButton({
    disabled,
    soldOut,
    noWB,
    isUnique,
    isUpgrade,
    onClick,
}: {
    disabled: boolean;
    soldOut: boolean;
    noWB: boolean;
    isUnique: boolean;
    isUpgrade: boolean;
    onClick: () => void;
}) {
    const { t } = useTranslation();

    return (
        <Button
            disabled={disabled}
            onClick={onClick}
            className={`bg-transparent border-2 text-xs uppercase cursor-pointer ${
                isUnique
                    ? "border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810]"
                    : "border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810]"
            }`}
        >
            {soldOut
                ? t("station_upgrades.no")
                : noWB
                  ? "--"
                  : isUpgrade
                    ? t("station_upgrades.upgrade")
                    : t("station_upgrades.buy")}
        </Button>
    );
}

// Weapon detail dialog component
interface WeaponDetailDialogProps {
    weaponType: string;
    onClose: () => void;
}

function WeaponDetailDialog({ weaponType, onClose }: WeaponDetailDialogProps) {
    const { t } = useTranslation();
    const weapon = WEAPON_TYPES[weaponType as keyof typeof WEAPON_TYPES];

    if (!weapon) return null;

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="bg-[rgba(10,20,30,0.95)] border-2 border-[#ffb000] text-[#ffb000] max-w-md w-[calc(100%-2rem)] md:w-auto">
                <DialogHeader>
                    <DialogTitle className="text-[#ffb000] font-['Orbitron'] flex items-center gap-2">
                        <span
                            style={{ color: weapon.color, fontSize: "1.5em" }}
                        >
                            {weapon.icon}
                        </span>
                        {t(`weapon_types.${weaponType}`)}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {t("weapon_info.info_title")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Damage */}
                    <div className="bg-[rgba(255,176,0,0.05)] border border-[#ffb000] p-3 text-xs">
                        <div className="text-[#ffb000] font-bold mb-2">
                            ⚔ {t("weapon_info.damage")}: {weapon.damage}
                        </div>
                        <div className="text-[#888]">
                            {t("weapon_info.damage_desc")}
                        </div>
                    </div>

                    {/* Accuracy */}
                    <div className="bg-[rgba(255,176,0,0.05)] border border-[#ffb000] p-3 text-xs">
                        <div className="text-[#ffb000] font-bold mb-2">
                            🎯 {t("weapon_info.accuracy")}
                        </div>
                        {weaponType === "kinetic" && (
                            <div className="text-[#00ff41]">
                                90% {t("weapon_info.accuracy_desc")}
                            </div>
                        )}
                        {weaponType === "laser" && (
                            <div className="text-[#00ff41]">
                                95% {t("weapon_info.accuracy_desc")}
                            </div>
                        )}
                        {weaponType === "missile" && (
                            <div className="text-[#00ff41]">
                                80% {t("weapon_info.accuracy_desc")}
                            </div>
                        )}
                        <div className="text-[#888] mt-1">
                            {t("weapon_info.accuracy_note")}
                        </div>
                    </div>

                    {/* Special ability */}
                    <div className="bg-[rgba(255,176,0,0.05)] border border-[#ffb000] p-3 text-xs">
                        <div className="text-[#ffb000] font-bold mb-2">
                            ★ {t("weapon_info.feature")}
                        </div>
                        <div className="text-[#00ff41]">
                            {t(`weapon_info.${weaponType}_feature`)}
                        </div>
                    </div>

                    {/* Usage tips */}
                    <div className="border-t border-[#ffb000] pt-3 text-xs">
                        <div className="text-[#ffb000] font-bold mb-2">
                            💡 {t("weapon_info.when_to_use")}
                        </div>
                        {weaponType === "kinetic" && (
                            <div className="text-[#888] space-y-1">
                                <div>{t("weapon_info.kinetic_usage_1")}</div>
                                <div>{t("weapon_info.kinetic_usage_2")}</div>
                                <div>{t("weapon_info.kinetic_usage_3")}</div>
                            </div>
                        )}
                        {weaponType === "laser" && (
                            <div className="text-[#888] space-y-1">
                                <div>{t("weapon_info.laser_usage_1")}</div>
                                <div>{t("weapon_info.laser_usage_2")}</div>
                                <div>{t("weapon_info.laser_usage_3")}</div>
                            </div>
                        )}
                        {weaponType === "missile" && (
                            <div className="text-[#888] space-y-1">
                                <div>{t("weapon_info.missile_usage_1")}</div>
                                <div>{t("weapon_info.missile_usage_2")}</div>
                                <div>{t("weapon_info.missile_usage_3")}</div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button
                            onClick={onClose}
                            className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] text-xs uppercase flex-1"
                        >
                            {t("weapon_info.close")}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
