"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "@/game/store";
import { RACES } from "@/game/constants/races";
import type { Module, CrewMember, Weapon } from "@/game/types";
import { MODULE_TYPES } from "@/game/constants/modules";
import { useTranslation } from "@/lib/useTranslation";
import { getModuleTranslation } from "@/lib/moduleTranslations";
import { ProfessionSprite } from "./ProfessionSprite";
import {
    hasMergedXenosymbiont,
    SymbiosisModuleOverlay,
} from "./SymbiosisModuleOverlay";

const BASE_CELL_SIZE = 60;

type HitMarker = {
    eventId?: number;
    moduleId: number;
    amount: number;
    isCrit?: boolean;
    missed?: boolean;
};

type ShieldHitMarker = {
    eventId?: number;
    amount: number;
    isCrit?: boolean;
    missed?: boolean;
};

interface CombatShipGridProps {
    cropEmptySpace?: boolean;
    scale?: number;
}

export function CombatShipGrid({
    cropEmptySpace = true,
    scale = 1,
}: CombatShipGridProps) {
    const ship = useGameStore((s) => s.ship);
    const modules = useGameStore((s) => s.ship.modules);
    const crew = useGameStore((s) => s.crew);
    const currentCombat = useGameStore((s) => s.currentCombat);
    const lastPlayerHit = useGameStore((s) => s.currentCombat?.lastPlayerHit);
    const { currentLanguage } = useTranslation();

    const [flashType, setFlashType] = useState<"shield" | "hull" | null>(null);
    const [hitMarker, setHitMarker] = useState<HitMarker | null>(null);
    const [shieldHitMarker, setShieldHitMarker] =
        useState<ShieldHitMarker | null>(null);

    useEffect(() => {
        if (!lastPlayerHit) return;
        if (lastPlayerHit.missed) {
            return;
        }
        const type = lastPlayerHit.shieldDamage > 0 ? "shield" : "hull";
        const raf = requestAnimationFrame(() => setFlashType(type));
        const endTimer = setTimeout(() => setFlashType(null), 600);
        return () => {
            cancelAnimationFrame(raf);
            clearTimeout(endTimer);
        };
    }, [lastPlayerHit]);

    useEffect(() => {
        if (
            !lastPlayerHit ||
            (lastPlayerHit.hullDamage <= 0 && !lastPlayerHit.missed)
        )
            return;
        const raf = requestAnimationFrame(() =>
            setHitMarker({
                eventId: lastPlayerHit.eventId,
                moduleId: lastPlayerHit.moduleId,
                amount: lastPlayerHit.hullDamage,
                isCrit: lastPlayerHit.isCrit,
                missed: lastPlayerHit.missed,
            }),
        );
        const endTimer = setTimeout(() => setHitMarker(null), 850);
        return () => {
            cancelAnimationFrame(raf);
            clearTimeout(endTimer);
        };
    }, [lastPlayerHit]);

    useEffect(() => {
        if (!lastPlayerHit || lastPlayerHit.shieldDamage <= 0) return;
        const raf = requestAnimationFrame(() =>
            setShieldHitMarker({
                eventId: lastPlayerHit.eventId,
                amount: lastPlayerHit.shieldDamage,
                isCrit: lastPlayerHit.isCrit,
            }),
        );
        const endTimer = setTimeout(() => setShieldHitMarker(null), 850);
        return () => {
            cancelAnimationFrame(raf);
            clearTimeout(endTimer);
        };
    }, [lastPlayerHit]);

    const isCombatMode = !!currentCombat;
    const hasShields = ship.shields > 0;
    const shieldGlow = hasShields
        ? "0 0 18px 6px rgba(30,120,255,0.7), 0 0 40px 12px rgba(0,80,220,0.35)"
        : "none";

    // Calculate bounding box of all modules
    let minX = Infinity,
        minY = Infinity;
    let maxX = -Infinity,
        maxY = -Infinity;

    modules.forEach((mod) => {
        if (mod.type === "weaponShed") return;
        minX = Math.min(minX, mod.x);
        minY = Math.min(minY, mod.y);
        maxX = Math.max(maxX, mod.x + mod.width - 1);
        maxY = Math.max(maxY, mod.y + mod.height - 1);
    });

    // Default to full grid if no modules or crop disabled
    let startX = 0,
        startY = 0;
    let gridWidth = ship.gridSize;
    let gridHeight = ship.gridSize;

    if (cropEmptySpace && modules.length > 0 && minX !== Infinity) {
        startX = minX;
        startY = minY;
        gridWidth = maxX - minX + 1;
        gridHeight = maxY - minY + 1;
    }

    // Base SVG dimensions
    const baseSvgWidth = gridWidth * BASE_CELL_SIZE;
    const baseSvgHeight = gridHeight * BASE_CELL_SIZE;

    return (
        <div
            className="relative w-full max-w-[368px]"
            style={{ boxShadow: shieldGlow, transition: "box-shadow 0.4s ease" }}
        >
        {flashType && (
            <div
                className="absolute inset-0 pointer-events-none z-10"
                style={{
                    backgroundColor:
                        flashType === "shield"
                            ? "rgba(30,120,255,0.45)"
                            : "rgba(255,0,64,0.45)",
                    animation: "combatHitFlash 0.5s ease-out forwards",
                }}
            />
        )}
        {shieldHitMarker !== null && (
            <div
                key={shieldHitMarker.eventId}
                className={`combat-damage-number pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 font-['Orbitron'] text-[#66aaff] ${
                    shieldHitMarker.isCrit
                        ? "text-xl font-black"
                        : "text-sm font-bold"
                }`}
                style={{
                    textShadow: "0 0 8px #0080ff, 0 0 14px #0080ff",
                }}
            >
                -{shieldHitMarker.amount}
            </div>
        )}
        <div
            className={`select-none transition-colors overflow-hidden max-w-full w-full ${
                ship?.moduleMovedThisTurn
                    ? "bg-[#050810] border border-[#ffb000]"
                    : "bg-[#050810] border border-[#00ff41]"
            }`}
            style={{
                transform: `scale(${scale})`,
                transformOrigin: "top center",
            }}
        >
            <svg
                width={baseSvgWidth}
                height={baseSvgHeight}
                viewBox={`0 0 ${baseSvgWidth} ${baseSvgHeight}`}
                className={`w-full h-auto select-none ${
                    isCombatMode ? "cursor-not-allowed" : "cursor-default"
                }`}
                style={{ userSelect: "none", WebkitUserSelect: "none" }}
            >
                <Grid
                    gridSize={Math.max(gridWidth, gridHeight)}
                    cellSize={BASE_CELL_SIZE}
                    offsetX={cropEmptySpace ? startX : 0}
                    offsetY={cropEmptySpace ? startY : 0}
                />
                {modules.map((mod) => (
                    <g key={mod.id}>
                        <ModuleRenderer
                            module={mod}
                            cellSize={BASE_CELL_SIZE}
                            crew={crew}
                            currentLanguage={currentLanguage}
                            offsetX={cropEmptySpace ? startX : 0}
                            offsetY={cropEmptySpace ? startY : 0}
                            hitMarker={hitMarker?.moduleId === mod.id ? hitMarker : null}
                        />
                    </g>
                ))}
            </svg>
        </div>
        </div>
    );
}

function Grid({
    gridSize,
    cellSize,
    offsetX = 0,
    offsetY = 0,
}: {
    gridSize: number;
    cellSize: number;
    offsetX?: number;
    offsetY?: number;
}) {
    const lines: React.ReactElement[] = [];

    for (let i = 0; i <= gridSize; i++) {
        lines.push(
            <line
                key={`v${i}`}
                x1={i * cellSize - offsetX * cellSize}
                y1={0}
                x2={i * cellSize - offsetX * cellSize}
                y2={gridSize * cellSize}
                stroke="#00ff4133"
                strokeWidth={1}
            />,
        );
        lines.push(
            <line
                key={`h${i}`}
                x1={0}
                y1={i * cellSize - offsetY * cellSize}
                x2={gridSize * cellSize}
                y2={i * cellSize - offsetY * cellSize}
                stroke="#00ff4133"
                strokeWidth={1}
            />,
        );
    }

    return <g>{lines}</g>;
}

interface ModuleRendererProps {
    module: Module;
    cellSize: number;
    crew: CrewMember[];
    currentLanguage: "ru" | "en";
    offsetX?: number;
    offsetY?: number;
    hitMarker?: HitMarker | null;
}

function ModuleRenderer({
    module,
    cellSize,
    crew,
    currentLanguage,
    offsetX = 0,
    offsetY = 0,
    hitMarker,
}: ModuleRendererProps) {
    if (module.type === "weaponShed") {
        return;
    }

    const x = (module.x - offsetX) * cellSize;
    const y = (module.y - offsetY) * cellSize;
    const w = module.width * cellSize;
    const h = module.height * cellSize;
    const style = MODULE_TYPES[module.type] || {
        color: "#ffffff33",
        borderColor: "#ffffff",
    };
    const maxHealth = module.maxHealth || 100;
    const healthPct = maxHealth > 0 ? module.health / maxHealth : 0;

    const crewInModule = crew.filter((c) => c.moduleId === module.id);
    const hasSymbiosis = hasMergedXenosymbiont(crew, module.id);

    return (
        <g
            className="select-none"
            style={{ userSelect: "none", WebkitUserSelect: "none" }}
        >
            <rect
                x={x + 2}
                y={y + 2}
                width={w - 4}
                height={h - 4}
                fill={style.color}
                className="select-none"
            />
            <rect
                x={x + 2}
                y={y + 2}
                width={w - 4}
                height={h - 4}
                fill="none"
                stroke={style.borderColor}
                strokeWidth={2}
                className="select-none"
            />
            {hasSymbiosis && <SymbiosisModuleOverlay x={x} y={y} w={w} h={h} />}
            <text
                x={x + w / 2}
                y={y + 12}
                fill={style.borderColor}
                fontSize="6"
                fontFamily="Share Tech Mono"
                textAnchor="middle"
                className="select-none"
                style={{ userSelect: "none", WebkitUserSelect: "none" }}
            >
                {getModuleTranslation(module.type, currentLanguage, module.name).name}
            </text>

            {module.type === "weaponbay" && module.weapons && (
                <WeaponsRenderer
                    weapons={module.weapons}
                    x={x}
                    y={y}
                    w={w}
                    h={h}
                />
            )}

            <HealthBar module={module} x={x} y={y} w={w} h={h} />

            {(module.disabled || module.manualDisabled) && (
                <DisabledOverlay x={x} y={y} w={w} h={h} />
            )}
            {healthPct < 0.7 && (
                <DamageScars
                    x={x}
                    y={y}
                    w={w}
                    h={h}
                    severity={healthPct < 0.3 ? "critical" : "damaged"}
                />
            )}
            {hitMarker && (
                <HitPulse
                    key={hitMarker.eventId}
                    x={x}
                    y={y}
                    w={w}
                    h={h}
                    amount={hitMarker.amount}
                    isCrit={hitMarker.isCrit}
                    missed={hitMarker.missed}
                />
            )}

            {crewInModule.length > 0 && (
                <CrewIcons crew={crewInModule} x={x} y={y} w={w} h={h} />
            )}
        </g>
    );
}

function WeaponsRenderer({
    weapons,
    x,
    y,
    w,
    h,
}: {
    weapons: (Weapon | null)[];
    x: number;
    y: number;
    w: number;
    h: number;
}) {
    const iconY = y + h / 2 + 10;
    const spacing = w / ((weapons?.length ?? 0) + 1);

    return (
        <>
            {weapons.map((weapon, idx) =>
                weapon ? (
                    <text
                        key={idx}
                        x={x + spacing * (idx + 1)}
                        y={iconY}
                        fill={
                            weapon.type === "kinetic"
                                ? "#ff0040"
                                : weapon.type === "laser"
                                  ? "#ffb000"
                                  : "#00d4ff"
                        }
                        fontSize="18"
                        fontFamily="Share Tech Mono"
                        textAnchor="middle"
                        fontWeight="bold"
                    >
                        {weapon.type === "kinetic"
                            ? "●"
                            : weapon.type === "laser"
                              ? "◆"
                              : "▲"}
                    </text>
                ) : (
                    <text
                        key={idx}
                        x={x + spacing * (idx + 1)}
                        y={iconY}
                        fill="#444444"
                        fontSize="14"
                        fontFamily="Share Tech Mono"
                        textAnchor="middle"
                        fontWeight="bold"
                    >
                        ○
                    </text>
                ),
            )}
        </>
    );
}

function HealthBar({
    module,
    x,
    y,
    w,
    h,
}: {
    module: Module;
    x: number;
    y: number;
    w: number;
    h: number;
}) {
    const healthBarWidth = w - 20;
    const healthWidth =
        (module.health / (module.maxHealth || 100)) * healthBarWidth;

    return (
        <>
            <rect
                x={x + 10}
                y={y + h - 10}
                width={healthBarWidth}
                height={4}
                fill="#ff0040"
            />
            <rect
                x={x + 10}
                y={y + h - 10}
                width={healthWidth}
                height={4}
                fill={module.health > 50 ? "#00ff41" : "#ffb000"}
            />
        </>
    );
}

function DisabledOverlay({
    x,
    y,
    w,
    h,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
}) {
    return (
        <>
            <rect
                x={x + 2}
                y={y + 2}
                width={w - 4}
                height={h - 4}
                fill="rgba(255,0,64,0.3)"
            />
            <text
                x={x + w / 2}
                y={y + h / 2}
                fill="#ff0040"
                fontSize="22"
                fontFamily="Share Tech Mono"
                textAnchor="middle"
                fontWeight="bold"
            >
                ⚠
            </text>
        </>
    );
}

function DamageScars({
    x,
    y,
    w,
    h,
    severity,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    severity: "damaged" | "critical";
}) {
    const crackColor = severity === "critical" ? "#ff0040" : "#ffb000";
    const tint = severity === "critical" ? "rgba(255,0,64,0.26)" : "rgba(255,176,0,0.13)";

    return (
        <>
            <rect
                x={x + 2}
                y={y + 2}
                width={w - 4}
                height={h - 4}
                fill={tint}
            />
            <path
                d={`M ${x + w * 0.25} ${y + h * 0.25} L ${x + w * 0.38} ${y + h * 0.42} L ${x + w * 0.32} ${y + h * 0.58} L ${x + w * 0.48} ${y + h * 0.78}`}
                fill="none"
                stroke={crackColor}
                strokeWidth={severity === "critical" ? 2 : 1.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={severity === "critical" ? 0.9 : 0.65}
            />
            <path
                d={`M ${x + w * 0.68} ${y + h * 0.2} L ${x + w * 0.56} ${y + h * 0.38} L ${x + w * 0.72} ${y + h * 0.52}`}
                fill="none"
                stroke={crackColor}
                strokeWidth={severity === "critical" ? 1.8 : 1.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={severity === "critical" ? 0.75 : 0.5}
            />
        </>
    );
}

function HitPulse({
    x,
    y,
    w,
    h,
    amount,
    isCrit = false,
    missed = false,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    amount: number;
    isCrit?: boolean;
    missed?: boolean;
}) {
    return (
        <>
            {!missed && (
                <rect
                    x={x + 1}
                    y={y + 1}
                    width={w - 2}
                    height={h - 2}
                    fill="rgba(255,0,64,0.28)"
                    stroke="#ff0040"
                    strokeWidth={3}
                    className="combat-module-hit-pulse"
                />
            )}
            <text
                x={x + w / 2}
                y={y + h / 2}
                fill={missed ? "#889988" : "#ffccd5"}
                stroke="#050810"
                strokeWidth={2}
                paintOrder="stroke"
                fontSize={missed ? "9" : isCrit ? "18" : "14"}
                fontFamily="Share Tech Mono"
                textAnchor="middle"
                fontWeight={isCrit ? "900" : "bold"}
                className="combat-damage-number"
            >
                {missed ? "ПРОМАХ" : `-${amount}`}
            </text>
        </>
    );
}

function CrewIcons({
    crew,
    x,
    y,
    w,
    h,
}: {
    crew: CrewMember[];
    x: number;
    y: number;
    w: number;
    h: number;
}) {
    const iconSize = 14;
    const iconGap = 2;
    const iconPadding = 5;
    const iconsPerRow = Math.max(
        1,
        Math.floor((w - iconPadding * 2) / (iconSize + iconGap)),
    );
    const rowHeight = iconSize + iconGap;
    const rows = Math.ceil(crew.length / iconsPerRow);

    return (
        <>
            {crew.map((c, idx) => {
                const col = idx % iconsPerRow;
                const row = Math.floor(idx / iconsPerRow);
                const iconX = x + iconPadding + col * (iconSize + iconGap);
                const iconY = y + h - 14 - rowHeight * (rows - row);

                return (
                    <CrewIcon
                        key={c.id}
                        crewMember={c}
                        x={iconX}
                        y={iconY}
                        size={iconSize}
                    />
                );
            })}
        </>
    );
}

function CrewIcon({
    crewMember,
    x,
    y,
    size,
}: {
    crewMember: CrewMember;
    x: number;
    y: number;
    size: number;
}) {
    const race = RACES[crewMember.race];
    const raceColor = race?.color || "#00ff41";
    const badgeR = size * 0.19;
    const hasAssignment = !!(
        crewMember.combatAssignment || crewMember.assignment
    );

    return (
        <g
            className="select-none"
            style={{ userSelect: "none", WebkitUserSelect: "none" }}
        >
            <ProfessionSprite
                race={crewMember.race}
                profession={crewMember.profession}
                x={x}
                y={y}
                size={size}
                title={crewMember.name}
            />

            {hasAssignment && (
                <circle
                    cx={x + size * 0.22}
                    cy={y + size - size * 0.22}
                    r={size * 0.16}
                    fill="#ffb000"
                    className="select-none"
                />
            )}

            {crewMember.level > 1 && (
                <g className="select-none">
                    <circle
                        cx={x + size - badgeR}
                        cy={y + badgeR}
                        r={badgeR}
                        fill="#050810"
                    />
                    <circle
                        cx={x + size - badgeR}
                        cy={y + badgeR}
                        r={badgeR}
                        fill="none"
                        stroke={raceColor}
                        strokeWidth={0.7}
                    />
                    <text
                        x={x + size - badgeR}
                        y={y + badgeR}
                        fill={raceColor}
                        fontSize={size * 0.25}
                        fontFamily="Share Tech Mono"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontWeight="bold"
                        className="select-none"
                        style={{ userSelect: "none", WebkitUserSelect: "none" }}
                    >
                        {crewMember.level}
                    </text>
                </g>
            )}
        </g>
    );
}
