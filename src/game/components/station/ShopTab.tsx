"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { WEAPON_TYPES } from "../../constants";
import type { ShopItem, Module } from "../../types";
import { ModuleDetailDialog } from "../ModuleList";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface ShopTabProps {
    stationId: string;
    stationItems: ShopItem[];
    stationInventory: Record<string, Record<string, number>>;
    credits: number;
    weaponBays: number;
    ship: {
        modules: Module[];
    };
    buyItem: (item: ShopItem, moduleId?: number) => void;
    onUpgradeClick: (item: ShopItem) => void;
}

export function ShopTab({
    stationId,
    stationItems,
    stationInventory,
    credits,
    weaponBays,
    ship,
    buyItem,
    onUpgradeClick,
}: ShopTabProps) {
    const inv = stationId ? stationInventory[stationId] || {} : {};
    const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
    const [selectedUpgrade, setSelectedUpgrade] = useState<ShopItem | null>(
        null,
    );

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
            return item.targetType && ownedModuleTypes.has(item.targetType);
        });
    }, [stationItems, ownedModuleTypes]);

    return (
        <>
            <div className="flex flex-col gap-2.5 max-h-87.5 overflow-y-auto pr-1 pb-2">
                {filteredItems.map((item) => {
                    const stockLeft =
                        inv[item.id] !== undefined
                            ? Math.max(0, item.stock - inv[item.id])
                            : item.stock;
                    const soldOut = stockLeft === 0;
                    const noWB = Boolean(
                        item.requiresWeaponBay && weaponBays === 0,
                    );

                    const hasScanner = ship.modules.some(
                        (m) => m.type === "scanner",
                    );
                    const hasDrill = ship.modules.some(
                        (m) => m.type === "drill",
                    );
                    const isScanner =
                        item.moduleType === "scanner" &&
                        !item.id.includes("quantum");
                    const isDrill =
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
                            onViewDetails={() =>
                                item.type === "upgrade"
                                    ? setSelectedUpgrade(item)
                                    : setSelectedItem(item)
                            }
                            onBuy={() => {
                                if (
                                    item.type === "upgrade" &&
                                    item.targetType
                                ) {
                                    setSelectedUpgrade(item);
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
            {/* Upgrade dialog */}
            {selectedUpgrade && (
                <UpgradeDialog
                    item={selectedUpgrade}
                    ship={ship}
                    credits={credits}
                    onClose={() => setSelectedUpgrade(null)}
                    onUpgrade={() => {
                        onUpgradeClick(selectedUpgrade);
                        setSelectedUpgrade(null);
                    }}
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
    onViewDetails,
    onBuy,
}: ShopItemCardProps) {
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
                    {item.name}
                </div>
                <ItemPriceAndStock
                    price={item.price}
                    stockLeft={stockLeft}
                    soldOut={soldOut}
                    noWB={noWB}
                    alreadyOwned={alreadyOwned}
                />
                <ItemDescription item={item} />
            </div>
            <BuyButton
                disabled={disabled}
                soldOut={soldOut}
                noWB={noWB}
                isUnique={isUnique}
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
}: {
    price: number;
    stockLeft: number;
    soldOut: boolean;
    noWB: boolean;
    alreadyOwned: boolean;
}) {
    return (
        <div className="text-[#ffb000] mt-1 text-xs">
            💰 {price}₢
            <span
                className={`ml-4 ${
                    soldOut || noWB || alreadyOwned
                        ? "text-[#ff0040]"
                        : "text-[#00ff41]"
                }`}
            >
                {soldOut
                    ? "ПРОДАНО"
                    : noWB
                      ? "НУЖНА ПАЛУБА"
                      : alreadyOwned
                        ? "УЖЕ ЕСТЬ"
                        : `В наличии: ${stockLeft}`}
            </span>
        </div>
    );
}

function ItemDescription({ item }: { item: ShopItem }) {
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
                    ★ Уровень: {moduleLevel}
                </div>
            )}
            {/* Module size */}
            {item.type === "module" && item.width && item.height && (
                <div className="text-[#888] mb-1">
                    📐 Размер: {item.width}x{item.height}
                </div>
            )}
            {/* Module purpose descriptions */}
            {item.type === "module" && item.moduleType === "cockpit" && (
                <span className="text-[#888]">
                    🎯 Кабина пилота — управление кораблём
                </span>
            )}
            {item.type === "module" && item.moduleType === "reactor" && (
                <span>⚡ Реактор — генерация энергии для систем</span>
            )}
            {item.type === "module" &&
                item.moduleType === "fueltank" &&
                item.capacity && <span>⛽ Ёмкость: {item.capacity}</span>}
            {item.type === "module" && item.moduleType === "engine" && (
                <span className="text-[#888]">
                    🚀 Двигатель — перемещение между секторами
                </span>
            )}
            {item.type === "module" &&
                item.moduleType === "shield" &&
                item.defense && <span>🛡 Защита: {item.defense}</span>}
            {item.type === "module" &&
                item.moduleType === "cargo" &&
                item.capacity && <span>📦 Вместимость: {item.capacity}</span>}
            {item.type === "module" &&
                item.moduleType === "scanner" &&
                item.scanRange && <span>📡 Дальность: {item.scanRange}</span>}
            {item.type === "module" &&
                item.moduleType === "habitat" &&
                item.oxygen && <span>🏠 Кислород: {item.oxygen}</span>}
            {item.type === "module" && item.moduleType === "lifesupport" && (
                <span>💚 Жизнеобеспечение — поддержка экипажа</span>
            )}
            {item.type === "module" && item.moduleType === "medical" && (
                <span className="text-[#888]">
                    🏥 Медотсек — лечение экипажа
                </span>
            )}
            {item.type === "module" && item.moduleType === "drill" && (
                <span className="text-[#888]">
                    ⛏ Бур — добыча ресурсов из астероидов
                </span>
            )}
            {item.type === "module" && item.moduleType === "weaponbay" && (
                <span>⚔ Оружейная палуба — размещение оружия</span>
            )}
            {item.type === "weapon" && item.weaponType && (
                <span>
                    ⚔ {WEAPON_TYPES[item.weaponType].icon}{" "}
                    {WEAPON_TYPES[item.weaponType].damage}
                </span>
            )}
            {/* Fallback for upgrades */}
            {item.type === "upgrade" && item.targetType === "engine" && (
                <span>⛽ -10% расход топлива</span>
            )}
            {item.type === "upgrade" &&
                item.targetType === "fueltank" &&
                `⛽ +${item.effect?.capacity || 30} топлива`}
            {item.type === "upgrade" &&
                item.targetType !== "engine" &&
                item.targetType !== "fueltank" && <span>Улучшение</span>}
        </div>
    );
}

function BuyButton({
    disabled,
    soldOut,
    noWB,
    isUnique,
    onClick,
}: {
    disabled: boolean;
    soldOut: boolean;
    noWB: boolean;
    isUnique: boolean;
    onClick: () => void;
}) {
    return (
        <Button
            disabled={disabled}
            onClick={onClick}
            className={`bg-transparent border-2 text-xs uppercase ${
                isUnique
                    ? "border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810]"
                    : "border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810]"
            }`}
        >
            {soldOut ? "НЕТ" : noWB ? "--" : "КУПИТЬ"}
        </Button>
    );
}

// Upgrade dialog component
interface UpgradeDialogProps {
    item: ShopItem;
    ship: { modules: Module[] };
    credits: number;
    onClose: () => void;
    onUpgrade: () => void;
}

function UpgradeDialog({
    item,
    ship,
    credits,
    onClose,
    onUpgrade,
}: UpgradeDialogProps) {
    // Find current module stats
    const currentModule = ship.modules.find((m) => m.type === item.targetType);
    const currentLevel = currentModule?.level || 1;
    const nextLevel = currentLevel + 1;

    // Calculate upgrade stats
    const getUpgradeStats = () => {
        const multiplier = nextLevel / currentLevel;

        switch (item.targetType) {
            case "reactor":
                return (
                    <div className="text-xs">
                        <div>
                            ⚡ Энергия:{" "}
                            <span className="text-[#00ff41]">
                                {currentModule?.power || 10}
                            </span>{" "}
                            →{" "}
                            <span className="text-[#ffb000]">
                                {Math.floor(
                                    (currentModule?.power || 10) * multiplier,
                                )}
                            </span>
                        </div>
                    </div>
                );
            case "shield":
                return (
                    <div className="text-xs">
                        <div>
                            🛡 Защита:{" "}
                            <span className="text-[#00ff41]">
                                {currentModule?.defense || 20}
                            </span>{" "}
                            →{" "}
                            <span className="text-[#ffb000]">
                                {Math.floor(
                                    (currentModule?.defense || 20) * multiplier,
                                )}
                            </span>
                        </div>
                    </div>
                );
            case "cargo":
                return (
                    <div className="text-xs">
                        <div>
                            📦 Вместимость:{" "}
                            <span className="text-[#00ff41]">
                                {currentModule?.capacity || 40}т
                            </span>{" "}
                            →{" "}
                            <span className="text-[#ffb000]">
                                {Math.floor(
                                    (currentModule?.capacity || 40) *
                                        multiplier,
                                )}
                                т
                            </span>
                        </div>
                    </div>
                );
            case "scanner":
                return (
                    <div className="text-xs">
                        <div>
                            📡 Дальность:{" "}
                            <span className="text-[#00ff41]">
                                {currentModule?.scanRange || 3}
                            </span>{" "}
                            →{" "}
                            <span className="text-[#ffb000]">
                                {Math.floor(
                                    (currentModule?.scanRange || 3) *
                                        multiplier,
                                )}
                            </span>
                        </div>
                    </div>
                );
            case "lifesupport":
                return (
                    <div className="text-xs">
                        <div>
                            💚 Кислород:{" "}
                            <span className="text-[#00ff41]">
                                {currentModule?.oxygen || 5}
                            </span>{" "}
                            →{" "}
                            <span className="text-[#ffb000]">
                                {Math.floor(
                                    (currentModule?.oxygen || 5) * multiplier,
                                )}
                            </span>
                        </div>
                    </div>
                );
            case "engine":
                return (
                    <div className="text-xs">
                        <div>
                            ⛽ Эффективность:{" "}
                            <span className="text-[#00ff41]">
                                {currentModule?.fuelEfficiency || 10}
                            </span>{" "}
                            →{" "}
                            <span className="text-[#ffb000]">
                                {Math.max(
                                    1,
                                    Math.floor(
                                        (currentModule?.fuelEfficiency || 10) /
                                            multiplier,
                                    ),
                                )}
                            </span>
                        </div>
                    </div>
                );
            case "fueltank":
                return (
                    <div className="text-xs">
                        <div>
                            ⛽ Ёмкость:{" "}
                            <span className="text-[#00ff41]">
                                {currentModule?.capacity || 80}
                            </span>{" "}
                            →{" "}
                            <span className="text-[#ffb000]">
                                {Math.floor(
                                    (currentModule?.capacity || 80) *
                                        multiplier,
                                )}
                            </span>
                        </div>
                    </div>
                );
            case "drill":
                return (
                    <div className="text-xs">
                        <div>
                            ⛏ Уровень:{" "}
                            <span className="text-[#00ff41]">
                                {currentLevel}
                            </span>{" "}
                            →{" "}
                            <span className="text-[#ffb000]">{nextLevel}</span>
                        </div>
                        <div className="text-[#888]">
                            Доступны астероиды тира {nextLevel}
                        </div>
                    </div>
                );
            case "medical":
                return (
                    <div className="text-xs">
                        <div>
                            🏥 Лечение:{" "}
                            <span className="text-[#00ff41]">+8 HP</span> →{" "}
                            <span className="text-[#ffb000]">
                                +{8 + nextLevel * 2} HP
                            </span>
                        </div>
                    </div>
                );
            case "weaponbay":
                return (
                    <div className="text-xs">
                        <div>
                            ⚔ Слоты:{" "}
                            <span className="text-[#00ff41]">
                                {currentModule?.weapons?.length || 1}
                            </span>{" "}
                            →{" "}
                            <span className="text-[#ffb000]">{nextLevel}</span>
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="text-xs text-[#888]">
                        Улучшение характеристик модуля
                    </div>
                );
        }
    };

    const canAfford = credits >= item.price;

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent
                className="bg-[rgba(10,20,30,0.95)] border-2 border-[#ffb000] text-[#ffb000] max-w-md"
                aria-describedby="upgrade-dialog-description"
            >
                <DialogHeader>
                    <DialogTitle className="text-[#ffb000] font-['Orbitron']">
                        ⬆ {item.name}
                    </DialogTitle>
                    <div id="upgrade-dialog-description" className="sr-only">
                        Диалог улучшения модуля
                    </div>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="text-[#ffb000] font-bold mb-2">
                        Улучшение до МК-{nextLevel}
                    </div>
                    <div className="text-xs text-[#888] mb-2">
                        Текущие параметры → После улучшения
                    </div>
                    <div className="bg-[rgba(255,176,0,0.05)] border border-[#ffb000] p-3 text-xs">
                        {getUpgradeStats()}
                    </div>

                    <div className="flex gap-2">
                        <Button
                            disabled={!canAfford}
                            onClick={onUpgrade}
                            className={`bg-transparent border-2 text-xs uppercase flex-1 ${
                                canAfford
                                    ? "border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810]"
                                    : "border-[#444] text-[#444] cursor-not-allowed"
                            }`}
                        >
                            Улучшить ({item.price}₢)
                        </Button>
                        <Button
                            onClick={onClose}
                            className="bg-transparent border-2 border-[#888] text-[#888] hover:bg-[#888] hover:text-[#050810] text-xs uppercase"
                        >
                            Отмена
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
