"use client";

import { useState } from "react";
import { useGameStore } from "../store";
import { TRADE_GOODS } from "../constants/goods";
import { DELIVERY_GOODS } from "../constants/contracts";
import { WEAPON_TYPES } from "../constants/weapons";
import { useTranslation } from "@/lib/useTranslation";
import { GoodInfoModal } from "./GoodInfoModal";
import { WeaponDetailDialog } from "./WeaponDetailDialog";
import { ModuleDetailDialog } from "./ModuleList";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { CargoItem, Contract, Goods, Module } from "../types";

type SectionKey = "weapons" | "modules" | "contracts" | "trade" | "probes";

function findFreeGridPosition(
    modules: Module[],
    gridSize: number,
    moduleWidth: number,
    moduleHeight: number,
): { x: number; y: number } | null {
    for (let y = 0; y <= gridSize - moduleHeight; y++) {
        for (let x = 0; x <= gridSize - moduleWidth; x++) {
            const occupied = modules.some(
                (m) =>
                    !m.disabled &&
                    m.health > 0 &&
                    x < m.x + (m.width || 2) &&
                    x + moduleWidth > m.x &&
                    y < m.y + (m.height || 2) &&
                    y + moduleHeight > m.y,
            );
            if (!occupied) return { x, y };
        }
    }
    return null;
}

function SectionHeader({
    label,
    count,
    color,
    collapsed,
    onToggle,
}: {
    label: string;
    count: number;
    color: string;
    collapsed: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="w-full flex items-center gap-1.5 text-[10px] py-1.5 mb-1 cursor-pointer group"
        >
            <span className="transition-transform group-hover:scale-110" style={{ color }}>
                {collapsed ? "▶" : "▼"}
            </span>
            <span className="font-bold tracking-wide" style={{ color }}>
                {label}
            </span>
            <span
                className="rounded-sm border px-1 text-[9px] tabular-nums"
                style={{ color, borderColor: `${color}55` }}
            >
                {count}
            </span>
            <span
                className="flex-1 ml-1 border-t border-dashed"
                style={{ borderColor: `${color}33` }}
            />
        </button>
    );
}

function CargoMetric({ label, value }: { label: string; value: number }) {
    return (
        <div className="min-w-0 border border-[#1a3320] bg-[rgba(0,0,0,0.22)] px-1.5 py-1">
            <div className="text-[#00ff41] font-bold tabular-nums">
                {value}
            </div>
            <div className="text-[#667] uppercase tracking-wide truncate">
                {label}
            </div>
        </div>
    );
}

function CargoInfoDialog({
    title,
    onClose,
    children,
}: {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    const { t } = useTranslation();
    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="bg-[rgba(10,20,30,0.95)] border-2 border-accent text-accent max-w-md w-[calc(100%-2rem)] md:w-auto">
                <DialogHeader>
                    <DialogTitle className="text-accent font-['Orbitron']">
                        {title}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {title}
                    </DialogDescription>
                </DialogHeader>
                <div className="text-xs leading-relaxed">{children}</div>
                <button
                    onClick={onClose}
                    className="mt-2 cursor-pointer border-2 border-[#00ff41] px-3 py-2 text-xs uppercase text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810]"
                >
                    {t("common.close")}
                </button>
            </DialogContent>
        </Dialog>
    );
}

function ContractCargoDialog({
    cargoItem,
    contracts,
    turn,
    onClose,
}: {
    cargoItem: CargoItem;
    contracts: Contract[];
    turn: number;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const contract = contracts.find(
        (c) =>
            (cargoItem.contractId && c.id === cargoItem.contractId) ||
            c.cargo === cargoItem.item,
    );
    const cargoName =
        t(`trade.goods.${cargoItem.item}`) !== `trade.goods.${cargoItem.item}`
            ? t(`trade.goods.${cargoItem.item}`)
            : DELIVERY_GOODS[cargoItem.item as keyof typeof DELIVERY_GOODS]
                  ?.name || cargoItem.item;

    const destination = contract
        ? [contract.targetLocationName, contract.targetSectorName]
              .filter(Boolean)
              .join(", ")
        : "";
    const turnsLeft =
        contract?.timeLimit !== undefined
            ? contract.timeLimit -
              (turn - (contract.startTurn ?? contract.acceptedAt ?? turn))
            : null;

    return (
        <CargoInfoDialog
            title={`📦 ${cargoName} x${cargoItem.quantity}т`}
            onClose={onClose}
        >
            {contract ? (
                <div className="space-y-1">
                    {destination && (
                        <div>
                            {t("cargo_info.destination")}:{" "}
                            <span className="text-[#00d4ff]">
                                {destination}
                            </span>
                        </div>
                    )}
                    <div>
                        {t("cargo_info.reward")}:{" "}
                        <span className="text-[#00ff41]">
                            {contract.reward}₢
                        </span>
                    </div>
                    {turnsLeft !== null && (
                        <div>
                            {t("cargo_info.time_left", { count: turnsLeft })}
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-[#888]">
                    {t("cargo_info.no_contract")}
                </div>
            )}
        </CargoInfoDialog>
    );
}

export function CargoDisplay() {
    const ship = useGameStore((s) => s.ship);
    const probes = useGameStore((s) => s.probes);
    const getCargoCapacity = useGameStore((s) => s.getCargoCapacity);
    const installCraftedWeapon = useGameStore((s) => s.installCraftedWeapon);
    const installModuleFromCargo = useGameStore(
        (s) => s.installModuleFromCargo,
    );
    const activeContracts = useGameStore((s) => s.activeContracts);
    const turn = useGameStore((s) => s.turn);
    const { t } = useTranslation();

    const [infoGood, setInfoGood] = useState<Goods | null>(null);
    const [weaponInfo, setWeaponInfo] = useState<string | null>(null);
    const [moduleInfo, setModuleInfo] = useState<CargoItem | null>(null);
    const [showProbeInfo, setShowProbeInfo] = useState(false);
    const [contractInfo, setContractInfo] = useState<CargoItem | null>(null);
    const [collapsed, setCollapsed] = useState<Record<SectionKey, boolean>>({
        weapons: false,
        modules: false,
        contracts: false,
        trade: false,
        probes: false,
    });
    const [expandedWeaponIdx, setExpandedWeaponIdx] = useState<number | null>(
        null,
    );

    const cargoModules = ship.modules.filter(
        (m) =>
            m.type === "cargo" &&
            !m.disabled &&
            !m.manualDisabled &&
            m.health > 0,
    );

    if (cargoModules.length === 0) {
        return (
            <div className="text-xs text-[#888]">{t("cargo.no_module")}</div>
        );
    }

    const totalCapacity = getCargoCapacity();
    const contractCargo = ship.cargo.reduce((sum, c) => sum + c.quantity, 0);
    const tradeCargo = ship.tradeGoods.reduce((sum, g) => sum + g.quantity, 0);
    const totalCargo = contractCargo + tradeCargo + probes;
    const isOverflow = totalCargo > totalCapacity;
    const fillPercent =
        totalCapacity > 0
            ? Math.min((totalCargo / totalCapacity) * 100, 100)
            : 0;
    const barColor = isOverflow
        ? "#ff0040"
        : fillPercent >= 90
          ? "#ff4040"
          : fillPercent >= 70
            ? "#ffb000"
            : "#00ff88";

    const craftedWeapons = ship.cargo
        .map((c, i) => ({ item: c, idx: i }))
        .filter(({ item }) => item.isCraftedWeapon && item.weaponType);

    const moduleItems = ship.cargo
        .map((c, i) => ({ item: c, idx: i }))
        .filter(({ item }) => item.isModule);

    const contractItems = ship.cargo
        .map((c, i) => ({ item: c, idx: i }))
        .filter(({ item }) => !item.isCraftedWeapon && !item.isModule);

    const weaponBaysWithSlots = ship.modules.filter(
        (m) =>
            m.type === "weaponbay" &&
            !m.disabled &&
            !m.manualDisabled &&
            m.weapons?.some((w) => !w),
    );

    const toggle = (key: SectionKey) =>
        setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

    return (
        <div className="space-y-3">
            {/* Capacity header + progress bar */}
            <div className="border border-[#00ff4144] bg-[rgba(0,255,65,0.035)] p-2.5">
                <div className="flex justify-between text-xs mb-2">
                    <span className="text-[#ffb000] font-bold uppercase tracking-wide">
                        {t("cargo.capacity_label")}
                    </span>
                    <span className="font-bold tabular-nums" style={{ color: barColor }} title={t("cargo.tons_title")}>
                        {totalCargo}/{totalCapacity}т
                        {isOverflow && (
                            <span className="ml-1 text-[10px] animate-pulse">
                                {t("cargo.overflow")}
                            </span>
                        )}
                    </span>
                </div>
                <div className="h-2 bg-[rgba(255,255,255,0.07)] rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                            width: `${fillPercent}%`,
                            backgroundColor: barColor,
                            boxShadow: `0 0 6px ${barColor}80`,
                        }}
                    />
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[10px]">
                    <CargoMetric label={t("cargo.section_contracts")} value={contractCargo} />
                    <CargoMetric label={t("cargo.section_trade")} value={tradeCargo} />
                    <CargoMetric label={t("cargo.section_modules")} value={moduleItems.length} />
                    <CargoMetric label={t("cargo.section_probes")} value={probes} />
                </div>
            </div>

            {totalCargo === 0 ? (
                <div className="text-[11px] text-[#888]">
                    {t("cargo.hold_empty")}
                </div>
            ) : (
                <div className="space-y-2">
                    {/* CRAFTED WEAPONS */}
                    {craftedWeapons.length > 0 && (
                        <div>
                            <SectionHeader
                                label={t("cargo.section_weapons")}
                                count={craftedWeapons.length}
                                color="#00d4ff"
                                collapsed={collapsed.weapons}
                                onToggle={() => toggle("weapons")}
                            />
                            {!collapsed.weapons &&
                                craftedWeapons.map(({ item: c, idx }) => {
                                    const weapon = c.weaponType
                                        ? WEAPON_TYPES[c.weaponType]
                                        : undefined;
                                    const isExpanded =
                                        expandedWeaponIdx === idx;
                                    return (
                                        <div
                                            key={idx}
                                            className="bg-[rgba(0,0,0,0.3)] border p-2 mb-1.5 text-xs"
                                            style={{
                                                borderColor:
                                                    weapon?.color ?? "#00d4ff",
                                            }}
                                        >
                                            <div className="flex items-center justify-between">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setWeaponInfo(
                                                            c.weaponType ??
                                                                null,
                                                        )
                                                    }
                                                    title={t(
                                                        "good_info.open_hint",
                                                    )}
                                                    className="cursor-pointer text-left underline decoration-dotted underline-offset-4"
                                                >
                                                    <span
                                                        style={{
                                                            color: weapon?.color,
                                                        }}
                                                    >
                                                        {weapon?.icon ?? "◆"}
                                                    </span>{" "}
                                                    <span
                                                        style={{
                                                            color: weapon?.color,
                                                        }}
                                                    >
                                                        {t(
                                                            `weapon_types.${c.weaponType}`,
                                                        )}
                                                    </span>{" "}
                                                    <span className="text-[#666]">
                                                        {t(
                                                            "cargo.crafted_label",
                                                        )}
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setExpandedWeaponIdx(
                                                            isExpanded
                                                                ? null
                                                                : idx,
                                                        )
                                                    }
                                                    className="text-[10px] border px-1.5 py-0.5 cursor-pointer hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                                                    style={{
                                                        color:
                                                            weapon?.color ??
                                                            "#00d4ff",
                                                        borderColor:
                                                            weapon?.color ??
                                                            "#00d4ff",
                                                    }}
                                                >
                                                    {t("cargo.install")}{" "}
                                                    {isExpanded ? "▲" : "▼"}
                                                </button>
                                            </div>
                                            {isExpanded && (
                                                <div className="mt-2 pt-2 border-t border-[rgba(255,255,255,0.08)]">
                                                    {weaponBaysWithSlots.length ===
                                                    0 ? (
                                                        <div className="text-[#ff4040] text-[10px]">
                                                            {t(
                                                                "cargo.no_free_bays",
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1">
                                                            {weaponBaysWithSlots.map(
                                                                (bay) => (
                                                                    <button
                                                                        key={
                                                                            bay.id
                                                                        }
                                                                        type="button"
                                                                        onClick={() => {
                                                                            installCraftedWeapon(
                                                                                idx,
                                                                                bay.id,
                                                                            );
                                                                            setExpandedWeaponIdx(
                                                                                null,
                                                                            );
                                                                        }}
                                                                        className="text-[10px] border border-[#00d4ff] text-[#00d4ff] px-2 py-0.5 cursor-pointer hover:bg-[rgba(0,212,255,0.15)] transition-colors"
                                                                    >
                                                                        {t(
                                                                            "cargo.install_in_bay",
                                                                        )}{" "}
                                                                        #{bay.id}
                                                                    </button>
                                                                ),
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    )}

                    {/* MODULES */}
                    {moduleItems.length > 0 && (
                        <div>
                            <SectionHeader
                                label={t("cargo.section_modules")}
                                count={moduleItems.length}
                                color="#00d4ff"
                                collapsed={collapsed.modules}
                                onToggle={() => toggle("modules")}
                            />
                            {!collapsed.modules &&
                                moduleItems.map(({ item: c, idx }) => {
                                    const mw = c.module?.width ?? 2;
                                    const mh = c.module?.height ?? 2;
                                    const freePos = findFreeGridPosition(
                                        ship.modules,
                                        ship.gridSize,
                                        mw,
                                        mh,
                                    );
                                    return (
                                        <div
                                            key={idx}
                                            className="bg-[rgba(0,0,0,0.3)] border border-[#00d4ff] p-2 mb-1.5 text-xs"
                                        >
                                            <div className="flex items-center justify-between">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setModuleInfo(c)
                                                    }
                                                    title={t(
                                                        "good_info.open_hint",
                                                    )}
                                                    className="cursor-pointer text-left underline decoration-dotted underline-offset-4"
                                                >
                                                    📦{" "}
                                                    <span>
                                                        {c.module?.name ??
                                                            c.item}
                                                    </span>{" "}
                                                    <span className="text-[#666]">
                                                        x{c.quantity}т
                                                    </span>{" "}
                                                    <span className="text-[#00d4ff]">
                                                        {t(
                                                            "cargo.module_label",
                                                        )}
                                                    </span>
                                                </button>
                                                {freePos ? (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            installModuleFromCargo(
                                                                idx,
                                                                freePos.x,
                                                                freePos.y,
                                                            )
                                                        }
                                                        className="text-[10px] border border-[#00d4ff] text-[#00d4ff] px-1.5 py-0.5 cursor-pointer hover:bg-[rgba(0,212,255,0.15)] transition-colors"
                                                    >
                                                        {t("cargo.install")}
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] text-[#ff4040]">
                                                        {t(
                                                            "cargo.no_free_slots",
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}

                    {/* PROBES */}
                    {probes > 0 && (
                        <div>
                            <SectionHeader
                                label={t("cargo.section_probes")}
                                count={probes}
                                color="#7b4fff"
                                collapsed={collapsed.probes}
                                onToggle={() => toggle("probes")}
                            />
                            {!collapsed.probes && (
                                <button
                                    type="button"
                                    onClick={() => setShowProbeInfo(true)}
                                    title={t("good_info.open_hint")}
                                    className="block w-full text-left cursor-pointer bg-[rgba(0,0,0,0.3)] border border-[#7b4fff] p-2 mb-1.5 text-xs hover:bg-[rgba(123,79,255,0.12)]"
                                >
                                    🔬 {t("cargo.section_probes")} x{probes}т
                                </button>
                            )}
                        </div>
                    )}

                    {/* CONTRACT CARGO */}
                    {contractItems.length > 0 && (
                        <div>
                            <SectionHeader
                                label={t("cargo.section_contracts")}
                                count={contractItems.length}
                                color="#ffb000"
                                collapsed={collapsed.contracts}
                                onToggle={() => toggle("contracts")}
                            />
                            {!collapsed.contracts &&
                                contractItems.map(({ item: c, idx }) => {
                                    const cargoKey =
                                        c.item as keyof typeof DELIVERY_GOODS;
                                    const cargoName =
                                        DELIVERY_GOODS[cargoKey]?.name ||
                                        TRADE_GOODS[
                                            c.item as keyof typeof TRADE_GOODS
                                        ]?.name ||
                                        c.item;
                                    const translatedName =
                                        t(`trade.goods.${c.item}`) !==
                                        `trade.goods.${c.item}`
                                            ? t(`trade.goods.${c.item}`)
                                            : cargoName;
                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setContractInfo(c)}
                                            title={t("good_info.open_hint")}
                                            className="block w-full text-left cursor-pointer bg-[rgba(0,0,0,0.3)] border border-[#ffb000] p-2 mb-1.5 text-xs hover:bg-[rgba(255,176,0,0.1)]"
                                        >
                                            📦 {translatedName} x{c.quantity}т{" "}
                                            <span className="text-[#00d4ff]">
                                                {t("cargo.contract_label")}
                                            </span>
                                        </button>
                                    );
                                })}
                        </div>
                    )}

                    {/* TRADE GOODS */}
                    {ship.tradeGoods.length > 0 && (
                        <div>
                            <SectionHeader
                                label={t("cargo.section_trade")}
                                count={ship.tradeGoods.length}
                                color="#00ff88"
                                collapsed={collapsed.trade}
                                onToggle={() => toggle("trade")}
                            />
                            {!collapsed.trade &&
                                ship.tradeGoods.map((g, i) => {
                                    const translatedName =
                                        t(`trade.goods.${g.item}`) !==
                                        `trade.goods.${g.item}`
                                            ? t(`trade.goods.${g.item}`)
                                            : TRADE_GOODS[g.item]?.name ||
                                              g.item;
                                    return (
                                        <button
                                            key={i}
                                            onClick={() =>
                                                setInfoGood(g.item)
                                            }
                                            title={t("good_info.open_hint")}
                                            className="block w-full text-left cursor-pointer bg-[rgba(0,0,0,0.3)] border border-[#00ff88] p-2 mb-1.5 text-xs hover:bg-[rgba(0,255,136,0.1)]"
                                        >
                                            💰 {translatedName} x{g.quantity}т
                                        </button>
                                    );
                                })}
                        </div>
                    )}
                </div>
            )}
            {infoGood && (
                <GoodInfoModal
                    goodId={infoGood}
                    onClose={() => setInfoGood(null)}
                />
            )}
            {weaponInfo && (
                <WeaponDetailDialog
                    weaponType={weaponInfo}
                    onClose={() => setWeaponInfo(null)}
                />
            )}
            {moduleInfo?.module && (
                <ModuleDetailDialog
                    isStationItem
                    module={{
                        id: -1,
                        type: moduleInfo.module.moduleType || "reactor",
                        name: moduleInfo.module.name,
                        health: 100,
                        maxHealth: 100,
                        power: moduleInfo.module.power || 0,
                        consumption: moduleInfo.module.consumption || 0,
                        defense: moduleInfo.module.defense || 0,
                        capacity: moduleInfo.module.capacity || 0,
                        oxygen: moduleInfo.module.oxygen || 0,
                        scanRange: moduleInfo.module.scanRange || 0,
                        fuelEfficiency: moduleInfo.module.fuelEfficiency || 0,
                        repairAmount: moduleInfo.module.repairAmount || 0,
                        repairTargets: moduleInfo.module.repairTargets || 1,
                        width: moduleInfo.module.width || 1,
                        height: moduleInfo.module.height || 1,
                        x: 0,
                        y: 0,
                        level: moduleInfo.module.level ?? 1,
                        weapons: [],
                        disabled: false,
                        movedThisTurn: false,
                    }}
                    onClose={() => setModuleInfo(null)}
                />
            )}
            {showProbeInfo && (
                <CargoInfoDialog
                    title={`🔬 ${t("cargo_info.probes_title")}`}
                    onClose={() => setShowProbeInfo(false)}
                >
                    <div>{t("cargo_info.probes_desc")}</div>
                    <div className="mt-2 space-y-1 text-[#888]">
                        <div>{t("cargo_info.probes_use_1")}</div>
                        <div>{t("cargo_info.probes_use_2")}</div>
                        <div>{t("cargo_info.probes_use_3")}</div>
                    </div>
                    <div className="mt-2 text-[#00ff41]">
                        {t("cargo_info.probes_buy_hint")}
                    </div>
                </CargoInfoDialog>
            )}
            {contractInfo && (
                <ContractCargoDialog
                    cargoItem={contractInfo}
                    contracts={activeContracts}
                    turn={turn}
                    onClose={() => setContractInfo(null)}
                />
            )}
        </div>
    );
}
