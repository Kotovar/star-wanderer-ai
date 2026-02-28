"use client";

import { useRef, useEffect } from "react";
import type { CombatState } from "../types";

interface EnemyModuleGridProps {
    currentCombat: CombatState;
    isBoss: boolean;
    onModuleClick: (moduleId: number) => void;
    hasGunner: boolean;
}

export function EnemyModuleGrid({
    currentCombat,
    isBoss,
    onModuleClick,
    hasGunner,
}: EnemyModuleGridProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const cellSize = 60;
        const padding = 10;
        ctx.fillStyle = "#050810";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const enemyModules = currentCombat.enemy.modules;
        const cols = Math.ceil(Math.sqrt(enemyModules.length));

        enemyModules.forEach((mod, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const x = padding + col * (cellSize + 5);
            const y = padding + row * (cellSize + 5);

            const isSelected = currentCombat.enemy.selectedModule === mod.id;
            const isDestroyed = mod.health <= 0;

            const baseColor = isBoss ? "#ff00ff33" : "#ff004033";
            const borderColor = isBoss ? "#ff00ff" : "#ff0040";

            ctx.fillStyle = isDestroyed ? "#333333" : baseColor;
            ctx.fillRect(x, y, cellSize, cellSize);
            ctx.strokeStyle = isSelected ? "#ffb000" : borderColor;
            ctx.lineWidth = isSelected ? 3 : 2;
            ctx.strokeRect(x, y, cellSize, cellSize);

            ctx.fillStyle = isDestroyed ? "#666666" : borderColor;
            ctx.font = "bold 9px Share Tech Mono";
            ctx.textAlign = "center";
            const shortName =
                mod.name.length > 10
                    ? mod.name.substring(0, 8) + ".."
                    : mod.name;
            ctx.fillText(shortName, x + cellSize / 2, y + 15);

            const healthPercent = mod.health / (mod.maxHealth || 100);
            ctx.fillStyle = "#333";
            ctx.fillRect(x + 5, y + cellSize - 12, cellSize - 10, 6);
            ctx.fillStyle = isDestroyed ? "#666" : "#00ff41";
            ctx.fillRect(
                x + 5,
                y + cellSize - 12,
                (cellSize - 10) * healthPercent,
                6,
            );

            ctx.fillStyle = "#fff";
            ctx.font = "8px Share Tech Mono";
            ctx.fillText(`${mod.health}`, x + cellSize / 2, y + cellSize - 4);

            if (isDestroyed) {
                ctx.fillStyle = "rgba(255,0,64,0.5)";
                ctx.fillRect(x, y, cellSize, cellSize);
                ctx.fillStyle = "#ff0040";
                ctx.font = "bold 16px Share Tech Mono";
                ctx.fillText("💀", x + cellSize / 2, y + cellSize / 2);
            }
        });
    }, [currentCombat, isBoss]);

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!hasGunner) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const cellSize = 60;
        const padding = 10;
        const enemyModules = currentCombat.enemy.modules;
        const cols = Math.ceil(Math.sqrt(enemyModules.length));

        enemyModules.forEach((mod, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const modX = padding + col * (cellSize + 5);
            const modY = padding + row * (cellSize + 5);

            if (
                x >= modX &&
                x <= modX + cellSize &&
                y >= modY &&
                y <= modY + cellSize
            ) {
                if (mod.health > 0) {
                    onModuleClick(mod.id);
                }
            }
        });
    };

    return (
        <canvas
            ref={canvasRef}
            width={250}
            height={150}
            className={`block max-w-full ${hasGunner ? "cursor-pointer" : "cursor-not-allowed"}`}
            onClick={handleCanvasClick}
        />
    );
}

interface ShipStatusCardProps {
    title: string;
    shields: number;
    maxShields: number;
    armor: number;
    maxArmor?: number;
    damage: number;
    hasGunner?: boolean;
    isEnemy?: boolean;
    isBoss?: boolean;
    children?: React.ReactNode;
}

export function ShipStatusCard({
    title,
    shields,
    maxShields,
    armor,
    maxArmor,
    damage,
    hasGunner,
    isEnemy,
    isBoss,
    children,
}: ShipStatusCardProps) {
    const borderColor = isEnemy ? (isBoss ? "#ff00ff" : "#ff0040") : "#00ff41";
    const bgColor = isEnemy
        ? isBoss
            ? "rgba(255,0,255,0.05)"
            : "rgba(255,0,64,0.05)"
        : "rgba(0,255,65,0.05)";
    const titleColor = isEnemy ? (isBoss ? "#ff00ff" : "#ff0040") : "#00d4ff";
    const shieldBarColor = isEnemy
        ? isBoss
            ? "bg-[#ff00ff]"
            : "bg-[#ff0040]"
        : "bg-[#0080ff]";
    const armorColor =
        armor < 50 ? "[&>div]:bg-[#ff0040]" : "[&>div]:bg-[#00ff41]";
    const maxArmorValue = maxArmor || armor || 1;
    const showArmorBar = !isEnemy; // Only show armor bar for player ship

    return (
        <div className={`${bgColor} border border-${borderColor} p-4`}>
            <div className={`text-base font-bold mb-2 ${titleColor}`}>
                {title}
            </div>
            ⚔ Урон: {damage}{" "}
            <div className="my-2">
                Щиты: {Math.max(0, shields)}/{Math.max(1, maxShields)}
                <div className="h-2 rounded-full mt-1 bg-[rgba(0,0,0,0.5)] relative">
                    <div
                        className={`absolute rounded-full top-0 left-0 h-full ${shieldBarColor}`}
                        style={{
                            width: `${Math.min(100, Math.max(0, (shields / Math.max(1, maxShields)) * 100))}%`,
                        }}
                    />
                </div>
            </div>
            {armor !== undefined && !isEnemy && (
                <div className="my-2">
                    Броня: {armor} ед.
                    {showArmorBar && (
                        <div
                            className={`h-2 mt-1 bg-[rgba(0,0,0,0.5)] relative ${armorColor}`}
                        >
                            <div
                                className={`absolute rounded-full top-0 left-0 h-full ${armorColor.includes("#ff0040") ? "bg-[#ff0040]" : "bg-[#00ff41]"}`}
                                style={{
                                    width: `${Math.min(100, (armor / Math.max(1, maxArmorValue)) * 100)}%`,
                                }}
                            />
                        </div>
                    )}
                </div>
            )}
            <div className={hasGunner ? "text-[#00ff41]" : "text-[#ffaa00]"}>
                {!hasGunner && hasGunner !== undefined && "(-50%)"}
            </div>
            {children}
        </div>
    );
}
