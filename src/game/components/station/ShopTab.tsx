"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { WEAPON_TYPES, WEAPON_ART } from "../../constants";
import type { ShopItem, Module } from "../../types";
import { ModuleDetailDialog } from "../ModuleList";
import { WeaponDetailDialog } from "../WeaponDetailDialog";
import { getModuleImageUrl } from "../moduleArt";
import { GameImage } from "../GameImage";
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
        quarters: "module_names.quarters",
        repair_bay: "module_names.repair_bay",
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
        weaponbay: "station_upgrades.weaponbay_upgrade",
        quarters: "station_upgrades.quarters_upgrade",
        repair_bay: "station_upgrades.repair_bay_upgrade",
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
        const filtered = stationItems.filter((item) => {
            // Always show non-upgrade items
            if (item.type !== "upgrade") return true;
            // Only show upgrades for modules we own
            if (!item.targetType || !ownedModuleTypes.has(item.targetType)) {
                return false;
            }

            const modulesOfType = ship.modules.filter(
                (m) =>
                    m.type === item.targetType && !m.disabled && m.health > 0,
            );

            // Hide upgrade if all modules are at max level (3)
            const allAtMaxLevel = modulesOfType.every(
                (m) => (m.level || 1) >= 3,
            );
            if (allAtMaxLevel) return false;

            // For all upgrades, check if any module can use it
            // Extract upgrade level from ID (e.g., "reactor-upgrade-1-stationId" → 1)
            const upgradeMatch = item.id.match(/-upgrade-(\d+)-/);
            if (!upgradeMatch) return true;

            const upgradeLevel = parseInt(upgradeMatch[1], 10);

            // Show upgrade if any module matches this upgrade level
            return modulesOfType.some((m) => (m.level || 1) === upgradeLevel);
        });

        // Deduplicate: one upgrade card per targetType (modal handles all modules)
        const seenUpgradeTypes = new Set<string>();
        return filtered.filter((item) => {
            if (item.type !== "upgrade" || !item.targetType) return true;
            if (seenUpgradeTypes.has(item.targetType)) return false;
            seenUpgradeTypes.add(item.targetType);
            return true;
        });
    }, [stationItems, ownedModuleTypes, ship.modules]);

    return (
        <>
            <div className="flex flex-col gap-2.5 flex-1 min-h-0 overflow-y-auto pr-1 pb-2">
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
                        repairAmount: selectedItem.repairAmount || 0,
                        repairTargets: selectedItem.repairTargets || 1,
                        width: selectedItem.width || 1,
                        height: selectedItem.height || 1,
                        x: 0,
                        y: 0,
                        level: selectedItem.level ?? 1,
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

    const moduleArtUrl =
        item.type === "module" && item.moduleType
            ? getModuleImageUrl(
                  item.moduleType,
                  item.width || 1,
                  item.height || 1,
              )
            : undefined;

    const weaponArtUrl =
        item.type === "weapon" && item.weaponType
            ? WEAPON_ART[item.weaponType as keyof typeof WEAPON_ART]
            : undefined;

    return (
        <div
            className={`flex gap-3 items-center border p-2.5 transition-colors hover:bg-[rgba(0,255,65,0.06)] ${
                isUnique
                    ? "border-accent bg-[rgba(255,176,0,0.05)]"
                    : "border-[#00ff41] bg-[rgba(0,255,65,0.05)]"
            } ${disabled ? "opacity-40" : ""}`}
        >
            {/* Thumbnail */}
            <button
                type="button"
                onClick={onViewDetails}
                className={`shrink-0 w-14 h-14 flex items-center justify-center bg-[rgba(0,0,0,0.35)] border ${
                    isUnique ? "border-[#ffb00055]" : "border-[#00ff4155]"
                } cursor-pointer hover:border-[#00ff41] transition-colors`}
            >
                {moduleArtUrl ? (
                    <GameImage
                        src={moduleArtUrl}
                        alt={displayName}
                        className="max-w-full max-h-full object-contain"
                    />
                ) : weaponArtUrl ? (
                    <GameImage
                        src={weaponArtUrl}
                        alt={displayName}
                        className="max-w-full max-h-full object-contain"
                    />
                ) : (
                    <span className="text-2xl">{isUpgrade ? "⬆" : "📦"}</span>
                )}
            </button>

            <div className="flex-1 min-w-0">
                <div
                    className={`${isUnique ? "text-accent" : "text-ring"} font-bold cursor-pointer hover:underline`}
                    onClick={onViewDetails}
                >
                    {isUnique && "★ "}
                    {displayName}
                    {item.type === "module" && item.level && (
                        <span className="ml-1.5 text-[10px] font-normal text-[#888] bg-[rgba(255,255,255,0.08)] px-1.5 py-0.5 rounded">
                            Ур.{item.level}
                        </span>
                    )}
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
        <div className="text-accent mt-1 text-xs">
            💰 {isUpgrade ? "" : price + " ₢"}
            <span
                className={`${isUpgrade ? "" : "ml-4"} ${
                    soldOut || noWB || (alreadyOwned && !isUpgrade)
                        ? "text-destructive"
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
                <div className="text-accent mb-1">
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
                    ? "border-accent text-accent hover:bg-accent hover:text-[#050810]"
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
