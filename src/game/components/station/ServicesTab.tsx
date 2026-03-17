"use client";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";
import { MODULES_BY_LEVEL } from "@/game/components/station/station-data";
import { MODULES_FROM_BOSSES } from "@/game/constants/modules";
import type { ModuleType, Module, WeaponType } from "@/game/types";
import { WEAPON_TYPES } from "@/game/constants/weapons";

/**
 * Calculates scrap value for a module (70% of base price)
 * Uses price from corresponding tier based on module level
 */
const getScrapValue = (moduleType: ModuleType, moduleLevel: number): number => {
    // Tier 4 modules (from bosses)
    if (moduleLevel === 4) {
        const bossModule = MODULES_FROM_BOSSES.find(
            (m) => m.moduleType === moduleType && m.level === 4,
        );
        if (bossModule) {
            return Math.floor((bossModule.price || 1000) * 0.7);
        }
    }

    // Regular modules (levels 1-3) - use price from corresponding tier
    // Level 1-2 → tier 1, Level 3 → tier 2, Level 4+ → tier 3
    const tierIndex = Math.min(moduleLevel, 3);
    const tierModules =
        MODULES_BY_LEVEL[tierIndex] || MODULES_BY_LEVEL[1] || [];
    const shopItem = tierModules.find((m) => m.moduleType === moduleType);

    // Fallback to tier 1 if not found
    if (!shopItem) {
        const tier1Modules = MODULES_BY_LEVEL[1] || [];
        const fallbackItem = tier1Modules.find(
            (m) => m.moduleType === moduleType,
        );
        return Math.floor(Math.min(fallbackItem?.price || 300, 5000) * 0.7);
    }

    const price = shopItem?.price || 300;
    return Math.floor(Math.min(price, 5000) * 0.7);
};

interface ServicesTabProps {
    fuel: number;
    maxFuel: number;
    fuelPricePerUnit: number;
    fullRefuelPrice: number;
    refuel: (amount: number, price: number) => void;
    repairShip: () => void;
    healCrew: () => void;
    scrapModule: (moduleId: number) => void;
    installModuleFromCargo: (cargoIndex: number, x: number, y: number) => void;
    installCraftedWeapon: (cargoIndex: number, weaponBayId: number) => void;
    credits: number;
    ship: {
        modules: Module[];
        cargo: Array<{
            item: string;
            quantity: number;
            isModule?: boolean;
            isCraftedWeapon?: boolean;
            weaponType?: WeaponType;
            module?: {
                moduleType: string;
                level?: number;
                width?: number;
                height?: number;
            };
        }>;
        gridSize: number;
    };
    crew: Array<{
        id: number;
        name: string;
        moduleId: number;
    }>;
    // Dynamic service costs
    repairCost: number;
    healCost: number;
    canRepair: boolean;
    canHeal: boolean;
}

export function ServicesTab({
    fuel,
    maxFuel,
    fuelPricePerUnit,
    fullRefuelPrice,
    refuel,
    repairShip,
    healCrew,
    scrapModule,
    installModuleFromCargo,
    installCraftedWeapon,
    credits,
    ship,
    crew,
    repairCost,
    healCost,
    canRepair,
    canHeal,
}: ServicesTabProps) {
    const fuelNeeded = maxFuel - fuel;

    return (
        <div className="flex flex-col gap-4 max-h-[55vh] overflow-y-auto pr-2">
            <RefuelSection
                fuel={fuel}
                maxFuel={maxFuel}
                fuelNeeded={fuelNeeded}
                fuelPricePerUnit={fuelPricePerUnit}
                fullRefuelPrice={fullRefuelPrice}
                credits={credits}
                onRefuel={refuel}
            />

            <RepairSection
                credits={credits}
                repairCost={repairCost}
                canRepair={canRepair}
                onRepair={repairShip}
            />
            <HealSection
                credits={credits}
                healCost={healCost}
                canHeal={canHeal}
                onHeal={healCrew}
            />
            <ScrapModuleSection ship={ship} crew={crew} onScrap={scrapModule} />
            <InstallModuleSection
                ship={ship}
                onInstall={installModuleFromCargo}
            />
            <InstallWeaponSection
                ship={ship}
                onInstall={installCraftedWeapon}
            />
        </div>
    );
}

function RefuelSection({
    fuel,
    maxFuel,
    fuelNeeded,
    fuelPricePerUnit,
    fullRefuelPrice,
    credits,
    onRefuel,
}: {
    fuel: number;
    maxFuel: number;
    fuelNeeded: number;
    fuelPricePerUnit: number;
    fullRefuelPrice: number;
    credits: number;
    onRefuel: (amount: number, price: number) => void;
}) {
    const { t } = useTranslation();

    return (
        <div className="bg-[rgba(153,51,255,0.05)] border border-[#9933ff] p-4">
            <div className="text-[#9933ff] font-bold mb-2">
                {t("services.refuel_title")}
            </div>
            <div className="text-sm text-[#00ff41] mb-2">
                {t("services.refuel_fuel_label", { fuel, maxFuel })}
            </div>
            <div className="text-xs mb-3">
                <span className="text-[#ffb000]">
                    {t("services.refuel_price_label", {
                        price: fuelPricePerUnit,
                    })}
                </span>
            </div>
            <div className="flex flex-wrap gap-2">
                <RefuelButton
                    amount={10}
                    price={fuelPricePerUnit * 10}
                    disabled={
                        fuelNeeded <= 0 || credits < fuelPricePerUnit * 10
                    }
                    onRefuel={onRefuel}
                />
                <RefuelButton
                    amount={25}
                    price={fuelPricePerUnit * 25}
                    disabled={
                        fuelNeeded <= 0 || credits < fuelPricePerUnit * 25
                    }
                    onRefuel={onRefuel}
                />
                <RefuelButton
                    amount={fuelNeeded}
                    price={fullRefuelPrice}
                    label={t("services.refuel_full")}
                    disabled={fuelNeeded <= 0 || credits < fullRefuelPrice}
                    onRefuel={onRefuel}
                />
            </div>
        </div>
    );
}

function RefuelButton({
    amount,
    price,
    label,
    disabled,
    onRefuel,
}: {
    amount: number;
    price: number;
    label?: string;
    disabled: boolean;
    onRefuel: (amount: number, price: number) => void;
}) {
    return (
        <Button
            disabled={disabled}
            onClick={() => onRefuel(amount, price)}
            className="bg-transparent border-2 border-[#9933ff] text-[#9933ff] hover:bg-[#9933ff] hover:text-[#050810] uppercase text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {label || `+${amount} (${price}₢)`}
        </Button>
    );
}
function RepairSection({
    credits,
    repairCost,
    canRepair,
    onRepair,
}: {
    credits: number;
    repairCost: number;
    canRepair: boolean;
    onRepair: () => void;
}) {
    const { t } = useTranslation();

    return (
        <div className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-4">
            <div className="text-[#00d4ff] font-bold mb-2">
                {t("services.repair_title")}
            </div>
            <div className="text-sm text-[#00ff41] mb-3">
                {t("services.repair_desc")}
            </div>
            <div className="flex justify-between items-center">
                <span className="text-[#ffb000]">
                    💰{" "}
                    {canRepair
                        ? `${repairCost}₢`
                        : `✗ ${t("services.not_needed")}`}
                </span>
                <Button
                    disabled={!canRepair || credits < repairCost}
                    onClick={onRepair}
                    className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {t("services.repair_button")}
                </Button>
            </div>
        </div>
    );
}

function HealSection({
    credits,
    healCost,
    canHeal,
    onHeal,
}: {
    credits: number;
    healCost: number;
    canHeal: boolean;
    onHeal: () => void;
}) {
    const { t } = useTranslation();

    return (
        <div className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-4">
            <div className="text-[#00d4ff] font-bold mb-2">
                {t("services.heal_title")}
            </div>
            <div className="text-sm text-[#00ff41] mb-3">
                {t("services.heal_desc")}
            </div>
            <div className="flex justify-between items-center">
                <span className="text-[#ffb000]">
                    💰{" "}
                    {canHeal ? `${healCost}₢` : `✗ ${t("services.not_needed")}`}
                </span>
                <Button
                    disabled={!canHeal || credits < healCost}
                    onClick={onHeal}
                    className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {t("services.heal_button")}
                </Button>
            </div>
        </div>
    );
}

function ScrapModuleSection({
    ship,
    crew,
    onScrap,
}: {
    ship: ServicesTabProps["ship"];
    crew: ServicesTabProps["crew"];
    onScrap: (moduleId: number) => void;
}) {
    const { t } = useTranslation();
    // Essential modules that must have at least 1
    const essentialTypes: ModuleType[] = [
        "cockpit",
        "reactor",
        "fueltank",
        "engine",
        "lifesupport",
    ];

    // Count enabled modules by type
    const moduleCounts: Record<string, number> = {};
    ship.modules.forEach((m) => {
        if (!(m.disabled ?? false) && !(m.manualDisabled ?? false)) {
            moduleCounts[m.type] = (moduleCounts[m.type] || 0) + 1;
        }
    });

    // Get modules that can be scrapped (not the last essential one, and no crew)
    const scrappableModules = ship.modules.filter((m) => {
        if (m.disabled ?? false) return false;
        if (m.manualDisabled ?? false) return false;
        if (!essentialTypes.includes(m.type)) return true;
        if ((moduleCounts[m.type] || 0) <= 1) return false;
        // Check if any crew member is in this module
        const hasCrew = crew.some((c) => c.moduleId === m.id);
        if (hasCrew) return false;
        return true;
    });

    if (scrappableModules.length === 0) return null;

    return (
        <div className="bg-[rgba(255,0,64,0.05)] border border-[#ff0040] p-4">
            <div className="text-[#ff0040] font-bold mb-2">
                {t("services.scrap_title")}
            </div>
            <div className="text-sm text-[#888] mb-3">
                {t("services.scrap_desc")}
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
                {scrappableModules.map((mod) => (
                    <div
                        key={mod.id}
                        className="flex justify-between items-center bg-[rgba(0,0,0,0.3)] border border-[#ff0040] p-2"
                    >
                        <div className="text-xs">
                            <div className="text-[#00d4ff]">
                                {t(`module_names.${mod.type}`) !==
                                `module_names.${mod.type}`
                                    ? t(`module_names.${mod.type}`)
                                    : mod.name}{" "}
                                {mod.level ? `(МК-${mod.level})` : ""}
                            </div>
                            <div className="text-[#00ff41]">
                                ♻️ {getScrapValue(mod.type, mod.level ?? 1)}₢
                            </div>
                        </div>
                        <Button
                            onClick={() => onScrap(mod.id)}
                            className="cursor-pointer bg-transparent border-2 border-[#ff0040] text-[#ff0040] hover:bg-[#ff0040] hover:text-[#050810] uppercase text-xs"
                        >
                            {t("services.scrap_button")}
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function InstallModuleSection({
    ship,
    onInstall,
}: {
    ship: ServicesTabProps["ship"];
    onInstall: (cargoIndex: number, x: number, y: number) => void;
}) {
    const { t } = useTranslation();
    const moduleCargo = ship.cargo.filter((c) => c.isModule && c.module);

    // Find a valid position for a module on the ship grid
    const findValidPosition = (
        width: number,
        height: number,
    ): { x: number; y: number } | null => {
        const gridSize = ship.gridSize || 5;

        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                // Check if module fits within grid bounds
                if (x + width > gridSize || y + height > gridSize) continue;

                // Check if position is occupied by existing module
                const isOccupied = ship.modules.some((m) => {
                    if (m.disabled || m.manualDisabled) return false;
                    const mWidth = m.width || 2;
                    const mHeight = m.height || 2;
                    return (
                        x < m.x + mWidth &&
                        x + width > m.x &&
                        y < m.y + mHeight &&
                        y + height > m.y
                    );
                });

                if (!isOccupied) {
                    return { x, y };
                }
            }
        }

        return null;
    };

    return (
        <div className="bg-[rgba(255,0,255,0.05)] border border-[#ff00ff] p-4">
            <div className="text-[#ff00ff] font-bold mb-2">
                {t("services.install_title")}
            </div>
            <div className="text-sm text-[#888] mb-3">
                {t("services.install_desc")}
            </div>
            {moduleCargo.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                    {moduleCargo.map((item, idx) => {
                        const cargoIndex = ship.cargo.indexOf(item);
                        const validPosition = findValidPosition(2, 2);
                        const canInstall = validPosition !== null;

                        return (
                            <div
                                key={idx}
                                className={`flex justify-between items-center bg-[rgba(0,0,0,0.3)] border p-2 ${
                                    canInstall
                                        ? "border-[#00ff41]"
                                        : "border-[#888]"
                                }`}
                            >
                                <div className="text-xs">
                                    <div
                                        className={
                                            canInstall
                                                ? "text-[#00ff41]"
                                                : "text-[#888]"
                                        }
                                    >
                                        {item.item} (Ур.
                                        {item.module?.level || 4})
                                    </div>
                                    <div className="text-[#888]">
                                        {t("services.size_label")} 2x2 |{" "}
                                        {validPosition
                                            ? `${t("services.position_label")} (${validPosition.x}, ${validPosition.y})`
                                            : t("services.no_space")}
                                    </div>
                                </div>
                                <Button
                                    disabled={!canInstall}
                                    onClick={() =>
                                        validPosition &&
                                        onInstall(
                                            cargoIndex,
                                            validPosition.x,
                                            validPosition.y,
                                        )
                                    }
                                    className={`cursor-pointer bg-transparent border-2 uppercase text-xs ${
                                        canInstall
                                            ? "border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810]"
                                            : "border-[#888] text-[#888] cursor-not-allowed"
                                    }`}
                                >
                                    {t("services.install_button")}
                                </Button>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-sm text-[#888] italic">
                    {t("services.no_modules")}
                </div>
            )}
        </div>
    );
}

function InstallWeaponSection({
    ship,
    onInstall,
}: {
    ship: ServicesTabProps["ship"];
    onInstall: (cargoIndex: number, weaponBayId: number) => void;
}) {
    const { t } = useTranslation();

    const craftedWeapons = ship.cargo
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => item.isCraftedWeapon && item.weaponType);

    if (craftedWeapons.length === 0) return null;

    const weaponBays = ship.modules.filter(
        (m) => m.type === "weaponbay" && !m.disabled && !m.manualDisabled,
    );
    const baysWithSlots = weaponBays.filter((bay) =>
        bay.weapons?.some((w) => !w),
    );

    return (
        <div className="bg-[rgba(0,212,255,0.05)] border border-[#00d4ff] p-4">
            <div className="text-[#00d4ff] font-bold mb-2">
                ⚔️ {t("services.install_weapon_title")}
            </div>
            <div className="text-sm text-[#888] mb-3">
                {t("services.install_weapon_desc")}
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
                {craftedWeapons.map(({ item, idx }) => {
                    const weaponType = item.weaponType;
                    if (!weaponType) return;

                    const weapon = WEAPON_TYPES[weaponType];
                    return (
                        <div
                            key={idx}
                            className="bg-[rgba(0,0,0,0.3)] border p-2"
                            style={{ borderColor: weapon?.color ?? "#00d4ff" }}
                        >
                            <div className="flex items-center gap-2 mb-2 text-xs">
                                <span style={{ color: weapon?.color }}>
                                    {weapon?.icon}
                                </span>
                                <span
                                    className="font-bold"
                                    style={{ color: weapon?.color }}
                                >
                                    {t(`weapon_types.${weaponType}`)}
                                </span>
                                <span className="text-[#888]">
                                    {weapon?.damage}{" "}
                                    {t("services.damage_label")}
                                </span>
                            </div>
                            {baysWithSlots.length === 0 ? (
                                <div className="text-red-400 text-xs">
                                    {t("services.no_weapon_bays")}
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {baysWithSlots.map((bay) => (
                                        <Button
                                            key={bay.id}
                                            onClick={() =>
                                                onInstall(idx, bay.id)
                                            }
                                            className="bg-transparent border border-[#00d4ff] text-[#00d4ff] hover:bg-[#00d4ff] hover:text-[#050810] text-xs px-2 py-1 cursor-pointer"
                                        >
                                            {t("services.install_in_bay")} #
                                            {bay.id}
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
