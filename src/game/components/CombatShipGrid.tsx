"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "@/game/store";
import { RACES } from "@/game/constants/races";
import type { Module, CrewMember, Weapon } from "@/game/types";
import { MODULE_TYPES } from "@/game/constants/modules";
import { useTranslation } from "@/lib/useTranslation";
import { getModuleTranslation } from "@/lib/moduleTranslations";

const BASE_CELL_SIZE = 60;

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

    useEffect(() => {
        if (!lastPlayerHit) return;
        const type = lastPlayerHit.shieldDamage > 0 ? "shield" : "hull";
        const raf = requestAnimationFrame(() => setFlashType(type));
        const endTimer = setTimeout(() => setFlashType(null), 600);
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
            className="relative"
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
}

function ModuleRenderer({
    module,
    cellSize,
    crew,
    currentLanguage,
    offsetX = 0,
    offsetY = 0,
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

    const crewInModule = crew.filter((c) => c.moduleId === module.id);

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
            {module.health < 30 && <DamageOverlay x={x} y={y} w={w} h={h} />}

            {crewInModule.length > 0 && (
                <CrewIcons crew={crewInModule} x={x} y={y} h={h} />
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

function DamageOverlay({
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
                fill="rgba(255,0,0,0.4)"
            />
            <text
                x={x + w / 2}
                y={y + h / 2}
                fill="#ff0000"
                fontSize="18"
                fontFamily="Share Tech Mono"
                textAnchor="middle"
                fontWeight="bold"
            >
                💥
            </text>
        </>
    );
}

function CrewIcons({
    crew,
    x,
    y,
    h,
}: {
    crew: CrewMember[];
    x: number;
    y: number;
    h: number;
}) {
    const iconSize = 10;
    const startX = x + 10;
    const startY = y + h - iconSize - 18;

    return (
        <>
            {crew.map((c, idx) => (
                <CrewIcon
                    key={c.id}
                    crewMember={c}
                    x={startX + idx * (iconSize + 4)}
                    y={startY}
                    size={iconSize}
                />
            ))}
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
    const color = race?.color || "#00ff41";
    const cx = x + size / 2;
    const cy = y + size / 2;
    const s = size / 2;

    return (
        <g
            className="select-none"
            style={{ userSelect: "none", WebkitUserSelect: "none" }}
        >
            <path
                d={getProfessionPath(cx, cy, s, crewMember.profession)}
                fill={color}
                className="select-none"
            />
            {crewMember.assignment && (
                <circle
                    cx={cx}
                    cy={cy}
                    r={s}
                    fill="none"
                    stroke="#ffb000"
                    strokeWidth={2}
                    className="select-none"
                />
            )}
            <text
                x={cx}
                y={cy}
                fill="#050810"
                fontSize="4"
                fontFamily="Share Tech Mono"
                textAnchor="middle"
                fontWeight="bold"
                dominantBaseline="middle"
                className="select-none"
                style={{ userSelect: "none", WebkitUserSelect: "none" }}
            >
                {crewMember.name.charAt(0).toUpperCase()}
            </text>
        </g>
    );
}

function getProfessionPath(
    cx: number,
    cy: number,
    s: number,
    profession: string,
): string {
    switch (profession) {
        case "pilot":
            return `M ${cx} ${cy - s} L ${cx + s} ${cy + s * 0.7} L ${cx - s} ${cy + s * 0.7} Z`;
        case "engineer":
            return `M ${cx - s * 0.8} ${cy - s * 0.8} L ${cx + s * 0.8} ${cy - s * 0.8} L ${cx + s * 0.8} ${cy + s * 0.8} L ${cx - s * 0.8} ${cy + s * 0.8} Z`;
        case "medic":
            return `M ${cx} ${cy - s} L ${cx + s} ${cy} L ${cx} ${cy + s} L ${cx - s} ${cy} Z`;
        case "scout": {
            let path = "";
            for (let i = 0; i < 5; i++) {
                const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
                const px = cx + s * Math.cos(angle);
                const py = cy + s * Math.sin(angle);
                path += i === 0 ? `M ${px} ${py} ` : `L ${px} ${py} `;
            }
            return path + "Z";
        }
        case "scientist": {
            let path = "";
            for (let i = 0; i < 6; i++) {
                const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
                const px = cx + s * Math.cos(angle);
                const py = cy + s * Math.sin(angle);
                path += i === 0 ? `M ${px} ${py} ` : `L ${px} ${py} `;
            }
            return path + "Z";
        }
        default:
            return `M ${cx - s} ${cy} A ${s} ${s} 0 1 1 ${cx + s} ${cy} A ${s} ${s} 0 1 1 ${cx - s} ${cy}`;
    }
}
