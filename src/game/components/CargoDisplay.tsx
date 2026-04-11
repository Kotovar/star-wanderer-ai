"use client";

import { useState } from "react";
import { useGameStore } from "../store";
import { TRADE_GOODS } from "../constants/goods";
import { DELIVERY_GOODS } from "../constants/contracts";
import { WEAPON_TYPES } from "../constants/weapons";
import { useTranslation } from "@/lib/useTranslation";
import type { Module } from "../types";

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
            className="w-full flex items-center gap-1 text-[10px] py-1 mb-1 cursor-pointer"
        >
            <span style={{ color }}>{collapsed ? "▶" : "▼"}</span>
            <span className="font-bold tracking-wide" style={{ color }}>
                {label}
            </span>
            <span className="text-[#555]">({count})</span>
            <span
                className="flex-1 ml-1 border-t border-dashed"
                style={{ borderColor: `${color}33` }}
            />
        </button>
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
    const { t } = useTranslation();

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
        <div>
            {/* Capacity header + progress bar */}
            <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#888]">
                        {t("cargo.capacity_label")}
                    </span>
                    <span style={{ color: barColor }} title={t("cargo.tons_title")}>
                        {totalCargo}/{totalCapacity}т
                        {isOverflow && (
                            <span className="ml-1 text-[10px] animate-pulse">
                                {t("cargo.overflow")}
                            </span>
                        )}
                    </span>
                </div>
                <div className="h-1.5 bg-[rgba(255,255,255,0.07)] rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                            width: `${fillPercent}%`,
                            backgroundColor: barColor,
                            boxShadow: `0 0 6px ${barColor}80`,
                        }}
                    />
                </div>
            </div>

            {totalCargo === 0 ? (
                <div className="text-[11px] text-[#888]">
                    {t("cargo.hold_empty")}
                </div>
            ) : (
                <div>
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
                                                <div>
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
                                                </div>
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
                                                <div>
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
                                                </div>
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
                                <div className="bg-[rgba(0,0,0,0.3)] border border-[#7b4fff] p-2 mb-1.5 text-xs">
                                    🔬 {t("cargo.section_probes")} x{probes}т
                                </div>
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
                                        <div
                                            key={idx}
                                            className="bg-[rgba(0,0,0,0.3)] border border-[#ffb000] p-2 mb-1.5 text-xs"
                                        >
                                            📦 {translatedName} x{c.quantity}т{" "}
                                            <span className="text-[#00d4ff]">
                                                {t("cargo.contract_label")}
                                            </span>
                                        </div>
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
                                        <div
                                            key={i}
                                            className="bg-[rgba(0,0,0,0.3)] border border-[#00ff88] p-2 mb-1.5 text-xs"
                                        >
                                            💰 {translatedName} x{g.quantity}т
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
