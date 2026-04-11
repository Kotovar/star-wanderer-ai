"use client";

import { useEffect, useRef, useState } from "react";
import type { ExploreTile, ExploreTileType } from "@/game/types/exploration";

interface Props {
    grid: ExploreTile[];
    apRemaining: number;
    apTotal: number;
    canReveal: boolean;
    onTileClick: (index: number) => void;
}

const TILE_COLORS: Record<
    ExploreTileType,
    { border: string; bg: string; glow: string }
> = {
    market: {
        border: "#00ff41",
        bg: "rgba(0,255,65,0.15)",
        glow: "rgba(0,255,65,0.4)",
    },
    lab: {
        border: "#4488ff",
        bg: "rgba(68,136,255,0.15)",
        glow: "rgba(68,136,255,0.4)",
    },
    ruins: {
        border: "#ffb000",
        bg: "rgba(255,176,0,0.15)",
        glow: "rgba(255,176,0,0.4)",
    },
    incident: {
        border: "#ff0040",
        bg: "rgba(255,0,64,0.15)",
        glow: "rgba(255,0,64,0.4)",
    },
    artifact: {
        border: "#9933ff",
        bg: "rgba(153,51,255,0.15)",
        glow: "rgba(153,51,255,0.4)",
    },
};

// Drawing functions for each tile type
function drawMarketIcon(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    size: number,
) {
    const scale = size / 50;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);

    // Market stall base
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(-12, 8, 24, 10);

    // Stall poles
    ctx.fillStyle = "#654321";
    ctx.fillRect(-14, -5, 4, 13);
    ctx.fillRect(10, -5, 4, 13);

    // Striped awning
    ctx.fillStyle = "#ff4444";
    ctx.beginPath();
    ctx.moveTo(-16, -8);
    ctx.lineTo(-10, -18);
    ctx.lineTo(10, -18);
    ctx.lineTo(16, -8);
    ctx.lineTo(14, -5);
    ctx.lineTo(-14, -5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffcc00";
    ctx.beginPath();
    ctx.moveTo(-10, -18);
    ctx.lineTo(-6, -12);
    ctx.lineTo(-2, -18);
    ctx.lineTo(2, -12);
    ctx.lineTo(6, -18);
    ctx.lineTo(10, -12);
    ctx.lineTo(14, -18);
    ctx.lineTo(16, -8);
    ctx.lineTo(-16, -8);
    ctx.closePath();
    ctx.fill();

    // Goods on display
    ctx.fillStyle = "#44aa44";
    ctx.beginPath();
    ctx.arc(-6, 5, 3, 0, Math.PI * 2);
    ctx.arc(0, 6, 2.5, 0, Math.PI * 2);
    ctx.arc(6, 5, 3, 0, Math.PI * 2);
    ctx.fill();

    // Coins
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(-8, 12, 2, 0, Math.PI * 2);
    ctx.arc(8, 13, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawLabIcon(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    size: number,
) {
    const scale = size / 50;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);

    // Building base
    ctx.fillStyle = "#5566aa";
    ctx.fillRect(-15, -8, 30, 26);

    // Roof
    ctx.fillStyle = "#445599";
    ctx.beginPath();
    ctx.moveTo(-18, -8);
    ctx.lineTo(0, -20);
    ctx.lineTo(18, -8);
    ctx.closePath();
    ctx.fill();

    // Windows with light
    ctx.fillStyle = "#88ccff";
    ctx.fillRect(-10, -3, 7, 7);
    ctx.fillRect(3, -3, 7, 7);
    ctx.fillRect(-10, 8, 7, 7);
    ctx.fillRect(3, 8, 7, 7);

    // Window glow
    ctx.fillStyle = "rgba(136, 204, 255, 0.4)";
    ctx.beginPath();
    ctx.arc(-6.5, 0.5, 5, 0, Math.PI * 2);
    ctx.arc(6.5, 0.5, 5, 0, Math.PI * 2);
    ctx.fill();

    // Door
    ctx.fillStyle = "#334477";
    ctx.fillRect(-4, 6, 8, 12);

    // Science symbol on building
    ctx.strokeStyle = "#aaddff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -28, 6, 0, Math.PI * 2);
    ctx.stroke();

    // Atom electrons
    ctx.strokeStyle = "#aaddff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, -28, 10, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -28, 10, 4, Math.PI / 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -28, 10, 4, -Math.PI / 3, 0, Math.PI * 2);
    ctx.stroke();

    // Nucleus
    ctx.fillStyle = "#ff6666";
    ctx.beginPath();
    ctx.arc(0, -28, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawRuinsIcon(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    size: number,
) {
    const scale = size / 50;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);

    // Ancient stone texture color
    ctx.fillStyle = "#8B7355";

    // Left broken wall section
    ctx.fillRect(-18, -5, 10, 23);
    ctx.beginPath();
    ctx.moveTo(-18, -5);
    ctx.lineTo(-13, -15);
    ctx.lineTo(-8, -5);
    ctx.fill();

    // Cracks
    ctx.strokeStyle = "#5a4a3a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-15, -2);
    ctx.lineTo(-12, 8);
    ctx.moveTo(-13, -10);
    ctx.lineTo(-10, -3);
    ctx.stroke();

    // Center broken pillar
    ctx.fillStyle = "#998877";
    ctx.fillRect(-4, 5, 8, 13);
    ctx.beginPath();
    ctx.moveTo(-4, 5);
    ctx.lineTo(0, -8);
    ctx.lineTo(4, 5);
    ctx.fill();

    // Pillar rings
    ctx.strokeStyle = "#6a5a4a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-4, 8);
    ctx.lineTo(4, 8);
    ctx.moveTo(-3, 12);
    ctx.lineTo(5, 12);
    ctx.stroke();

    // Right wall section
    ctx.fillStyle = "#7a6855";
    ctx.fillRect(10, -10, 8, 28);
    ctx.beginPath();
    ctx.moveTo(10, -10);
    ctx.lineTo(14, -18);
    ctx.lineTo(18, -10);
    ctx.fill();

    // Cracks
    ctx.strokeStyle = "#4a3a2a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(14, -5);
    ctx.lineTo(16, 10);
    ctx.moveTo(12, -15);
    ctx.lineTo(15, -8);
    ctx.stroke();

    // Rubble and debris
    ctx.fillStyle = "#6a5845";
    ctx.beginPath();
    ctx.arc(-10, 18, 4, 0, Math.PI * 2);
    ctx.arc(-3, 20, 5, 0, Math.PI * 2);
    ctx.arc(5, 19, 3, 0, Math.PI * 2);
    ctx.arc(14, 18, 4, 0, Math.PI * 2);
    ctx.fill();

    // Small stones
    ctx.fillStyle = "#5a4835";
    ctx.beginPath();
    ctx.arc(-15, 20, 2, 0, Math.PI * 2);
    ctx.arc(0, 22, 2, 0, Math.PI * 2);
    ctx.arc(10, 21, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawIncidentIcon(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    size: number,
) {
    const scale = size / 50;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);

    // Outer warning triangle border
    ctx.fillStyle = "#ff2222";
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(18, 12);
    ctx.lineTo(-18, 12);
    ctx.closePath();
    ctx.fill();

    // Inner triangle (darker)
    ctx.fillStyle = "#660000";
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(13, 8);
    ctx.lineTo(-13, 8);
    ctx.closePath();
    ctx.fill();

    // Exclamation mark - bold
    ctx.fillStyle = "#ffffff";

    // Exclamation body
    ctx.fillRect(-3, -12, 6, 14);

    // Exclamation dot
    ctx.beginPath();
    ctx.arc(0, 8, 4, 0, Math.PI * 2);
    ctx.fill();

    // Danger radiating lines
    ctx.strokeStyle = "#ff4444";
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const innerR = 20;
        const outerR = 24;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR - 2);
        ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR - 2);
        ctx.stroke();
    }

    ctx.restore();
}

function drawArtifactIcon(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    size: number,
) {
    const scale = size / 50;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);

    // Outer glow aura
    const auraGradient = ctx.createRadialGradient(0, 0, 5, 0, 0, 25);
    auraGradient.addColorStop(0, "rgba(180, 100, 255, 0.4)");
    auraGradient.addColorStop(0.5, "rgba(120, 50, 200, 0.2)");
    auraGradient.addColorStop(1, "rgba(80, 20, 150, 0)");
    ctx.fillStyle = auraGradient;
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.fill();

    // Main crystal body with gradient
    const crystalGradient = ctx.createLinearGradient(-12, -20, 12, 20);
    crystalGradient.addColorStop(0, "#e0aaff");
    crystalGradient.addColorStop(0.4, "#9933ff");
    crystalGradient.addColorStop(0.7, "#6600cc");
    crystalGradient.addColorStop(1, "#440088");

    ctx.fillStyle = crystalGradient;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(6, -10);
    ctx.lineTo(14, 0);
    ctx.lineTo(8, 12);
    ctx.lineTo(12, 20);
    ctx.lineTo(0, 16);
    ctx.lineTo(-10, 22);
    ctx.lineTo(-6, 10);
    ctx.lineTo(-14, 2);
    ctx.lineTo(-8, -8);
    ctx.lineTo(-4, -18);
    ctx.closePath();
    ctx.fill();

    // Crystal facets (highlights)
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(3, -8);
    ctx.lineTo(-2, -10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.moveTo(6, -6);
    ctx.lineTo(14, 0);
    ctx.lineTo(8, 4);
    ctx.closePath();
    ctx.fill();

    // Sparkles around artifact
    ctx.fillStyle = "#ffffff";
    const sparklePositions = [
        { x: -15, y: -15, size: 2 },
        { x: 16, y: -12, size: 1.5 },
        { x: -18, y: 8, size: 1.5 },
        { x: 18, y: 10, size: 2 },
        { x: 0, y: -28, size: 1.5 },
        { x: -8, y: 25, size: 1 },
        { x: 10, y: 24, size: 1.5 },
    ];

    sparklePositions.forEach((pos) => {
        // Four-pointed star
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y - pos.size);
        ctx.lineTo(pos.x + pos.size * 0.5, pos.y);
        ctx.lineTo(pos.x, pos.y + pos.size);
        ctx.lineTo(pos.x - pos.size * 0.5, pos.y);
        ctx.closePath();
        ctx.fill();
    });

    // Energy rings
    ctx.strokeStyle = "rgba(200, 100, 255, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 8, Math.PI / 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
}

function drawTileIcon(
    ctx: CanvasRenderingContext2D,
    type: ExploreTileType,
    centerX: number,
    centerY: number,
    size: number,
) {
    switch (type) {
        case "market":
            drawMarketIcon(ctx, centerX, centerY, size);
            break;
        case "lab":
            drawLabIcon(ctx, centerX, centerY, size);
            break;
        case "ruins":
            drawRuinsIcon(ctx, centerX, centerY, size);
            break;
        case "incident":
            drawIncidentIcon(ctx, centerX, centerY, size);
            break;
        case "artifact":
            drawArtifactIcon(ctx, centerX, centerY, size);
            break;
    }
}

export function ExpeditionMapCanvas({
    grid,
    apRemaining,
    apTotal,
    canReveal,
    onTileClick,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hoveredTile, setHoveredTile] = useState<number | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const size = canvas.width;
        const gridSize = 5;
        const cellSize = size / gridSize;

        // Clear canvas
        ctx.clearRect(0, 0, size, size);

        // Draw subtle background
        ctx.fillStyle = "rgba(10, 15, 10, 0.5)";
        ctx.fillRect(0, 0, size, size);

        // Draw grid cells
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const index = row * gridSize + col;
                const tile = grid[index];

                const x = col * cellSize;
                const y = row * cellSize;
                const padding = 3;
                const tileWidth = cellSize - padding * 2;

                const isHovered = hoveredTile === index;

                if (!tile.revealed) {
                    // Draw hidden tile with terrain texture
                    const hiddenGradient = ctx.createRadialGradient(
                        x + cellSize / 2,
                        y + cellSize / 2,
                        0,
                        x + cellSize / 2,
                        y + cellSize / 2,
                        cellSize / 2,
                    );
                    hiddenGradient.addColorStop(0, "rgba(50, 60, 50, 0.7)");
                    hiddenGradient.addColorStop(1, "rgba(25, 35, 25, 0.9)");

                    ctx.beginPath();
                    ctx.roundRect(
                        x + padding,
                        y + padding,
                        tileWidth,
                        tileWidth,
                        4,
                    );
                    ctx.fillStyle = hiddenGradient;
                    ctx.fill();

                    // Hover effect for unrevealed tiles
                    if (isHovered && canReveal) {
                        ctx.strokeStyle = "rgba(0, 212, 255, 0.8)";
                        ctx.lineWidth = 2;
                        ctx.shadowColor = "rgba(0, 212, 255, 0.6)";
                        ctx.shadowBlur = 8;
                        ctx.stroke();
                        ctx.shadowBlur = 0;
                    } else {
                        ctx.strokeStyle = "rgba(80, 100, 80, 0.6)";
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                    }

                    // Add subtle question mark - no silhouettes to avoid hints
                    ctx.fillStyle = "rgba(120, 150, 120, 0.6)";
                    ctx.font = "bold 20px sans-serif";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText("?", x + cellSize / 2, y + cellSize / 2);
                } else {
                    // Draw revealed tile
                    const style = TILE_COLORS[tile.type];

                    // Glow effect for revealed tiles
                    ctx.shadowColor = style.glow;
                    ctx.shadowBlur = 10;

                    const tileGradient = ctx.createLinearGradient(
                        x + padding,
                        y + padding,
                        x + padding,
                        y + padding + tileWidth,
                    );
                    tileGradient.addColorStop(0, style.bg);
                    tileGradient.addColorStop(1, "rgba(0,0,0,0.4)");

                    ctx.beginPath();
                    ctx.roundRect(
                        x + padding,
                        y + padding,
                        tileWidth,
                        tileWidth,
                        4,
                    );
                    ctx.fillStyle = tileGradient;
                    ctx.fill();
                    ctx.strokeStyle = style.border;
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    // Reset shadow
                    ctx.shadowBlur = 0;

                    // Draw custom icon for tile type
                    drawTileIcon(
                        ctx,
                        tile.type,
                        x + cellSize / 2,
                        y + cellSize / 2,
                        cellSize * 0.7,
                    );
                }
            }
        }
    }, [grid, hoveredTile, canReveal]);

    // Handle click on tiles
    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canReveal) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const gridSize = 5;
        const cellSize = rect.width / gridSize;

        const col = Math.floor(clickX / cellSize);
        const row = Math.floor(clickY / cellSize);

        if (col >= 0 && col < gridSize && row >= 0 && row < gridSize) {
            const index = row * gridSize + col;
            if (!grid[index].revealed) {
                onTileClick(index);
            }
        }
    };

    // Handle mouse move for hover effect
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canReveal) {
            setHoveredTile(null);
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const gridSize = 5;
        const cellSize = rect.width / gridSize;

        const col = Math.floor(clickX / cellSize);
        const row = Math.floor(clickY / cellSize);

        if (col >= 0 && col < gridSize && row >= 0 && row < gridSize) {
            const index = row * gridSize + col;
            if (!grid[index].revealed) {
                setHoveredTile(index);
                return;
            }
        }
        setHoveredTile(null);
    };

    const handleMouseLeave = () => {
        setHoveredTile(null);
    };

    return (
        <div className="relative">
            <canvas
                ref={canvasRef}
                width={500}
                height={500}
                className={`w-full max-w-125 h-auto cursor-${canReveal ? "pointer" : "not-allowed"}`}
                onClick={handleClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            />
            {/* AP indicators */}
            <div className="flex justify-center gap-1 mt-2">
                {Array.from({ length: apTotal }).map((_, i) => (
                    <div
                        key={i}
                        className={`w-2 h-2 rounded-full border transition-all ${
                            i < apRemaining
                                ? "bg-[#00d4ff] border-[#00d4ff] shadow-[0_0_6px_#00d4ff]"
                                : "bg-transparent border-[#333]"
                        }`}
                    />
                ))}
            </div>
        </div>
    );
}
