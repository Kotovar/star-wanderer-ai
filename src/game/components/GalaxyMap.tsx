"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useGameStore } from "../store";
import {
    drawStaticLegend,
    drawSector,
    drawTierRings,
    canSeeTier4,
    getSectorRadius,
} from "./galaxy-map-utils";

// Generate stars once and reuse them
function generateStars(
    width: number,
    height: number,
    centerX: number,
    centerY: number,
    maxRadius: number,
) {
    const stars: Array<{
        x: number;
        y: number;
        radius: number;
        brightness: number;
    }> = [];

    // Generate stars across the entire canvas for infinite space effect
    for (let i = 0; i < 400; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const distFromCenter = Math.sqrt(
            (x - centerX) ** 2 + (y - centerY) ** 2,
        );
        // Make stars less dense near the center (galaxy area)
        const densityFactor = distFromCenter > maxRadius * 0.8 ? 1 : 0.3;
        if (Math.random() < densityFactor) {
            stars.push({
                x,
                y,
                radius: Math.random() * 1.2,
                brightness: Math.random() * 0.5,
            });
        }
    }

    return stars;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_SENSITIVITY = 0.001;
const DRAG_THRESHOLD = 5; // Minimum pixels to move before considering it a drag

export function GalaxyMap() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const starsRef = useRef<Array<{
        x: number;
        y: number;
        radius: number;
        brightness: number;
    }> | null>(null);
    const initializedRef = useRef(false);
    const canvasSizeRef = useRef({ width: 0, height: 0 });
    const hasMovedRef = useRef(false); // Track if mouse moved during click

    // Zoom and pan state
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const offsetStartRef = useRef({ x: 0, y: 0 });

    const sectors = useGameStore((s) => s.galaxy.sectors);
    const currentSector = useGameStore((s) => s.currentSector);
    const selectSector = useGameStore((s) => s.selectSector);
    const modules = useGameStore((s) => s.ship.modules);
    const artifacts = useGameStore((s) => s.artifacts);
    const captainLevel = useGameStore(
        (s) => s.crew.find((c) => c.profession === "pilot")?.level ?? 1,
    );
    const fuel = useGameStore((s) => s.ship.fuel);
    const calculateFuelCost = useGameStore((s) => s.calculateFuelCost);
    const areEnginesFunctional = useGameStore((s) => s.areEnginesFunctional);
    const areFuelTanksFunctional = useGameStore(
        (s) => s.areFuelTanksFunctional,
    );

    // Initialize canvas size once
    useEffect(() => {
        const container = containerRef.current;
        if (!container || initializedRef.current) return;

        const rect = container.getBoundingClientRect();
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);

        canvasSizeRef.current = { width, height };
        initializedRef.current = true;
    }, []);

    // Reset zoom on new game only (when galaxy is regenerated)
    const prevGalaxySignatureRef = useRef<string>("");
    useEffect(() => {
        // Create a signature based on sector properties that ONLY change on galaxy regeneration
        // Using id + tier + star type which are static after generation
        // Note: mapAngle can be undefined initially, so we use a fallback
        const galaxySignature = sectors
            .map((s) => `${s.id}:${s.tier}:${s.star.type}:${s.mapAngle ?? 0}`)
            .join("|");

        // Only reset if we had a previous signature AND it changed
        if (prevGalaxySignatureRef.current) {
            if (prevGalaxySignatureRef.current !== galaxySignature) {
                // New game - reset zoom and offset
                queueMicrotask(() => {
                    setZoom(1);
                    setOffset({ x: 0, y: 0 });
                });
            }
        }
        prevGalaxySignatureRef.current = galaxySignature;
    }, [sectors]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container || !initializedRef.current) return;

        // Use cached canvas size to prevent drift
        const { width, height } = canvasSizeRef.current;

        // Set canvas size only if changed
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
            // Regenerate stars when canvas size changes
            starsRef.current = null;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const centerX = width / 2;
        const centerY = height / 2;
        const baseMaxRadius = Math.min(width, height) * 0.42;

        // Clear canvas FIRST (before any transform)
        ctx.fillStyle = "#050810";
        ctx.fillRect(0, 0, width, height);

        // Generate stars once when container size changes
        if (!starsRef.current || starsRef.current.length === 0) {
            starsRef.current = generateStars(
                width,
                height,
                centerX,
                centerY,
                baseMaxRadius,
            );
        }

        // Draw static background gradients (before transform)
        for (let i = 0; i < 3; i++) {
            const gradient = ctx.createRadialGradient(
                centerX,
                centerY,
                0,
                centerX,
                centerY,
                baseMaxRadius * 1.2,
            );
            gradient.addColorStop(0, "rgba(100, 50, 150, 0.03)");
            gradient.addColorStop(0.5, "rgba(50, 100, 150, 0.02)");
            gradient.addColorStop(1, "transparent");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
        }

        // Draw background stars BEFORE transform (so they don't move with pan/zoom)
        if (starsRef.current) {
            starsRef.current.forEach((star) => {
                ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + star.brightness}`;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // Draw static legend (fuel, engine, captain info) BEFORE transform
        drawStaticLegend(ctx, modules, captainLevel, fuel, artifacts);

        // Apply transform for zoom and pan
        ctx.save();
        ctx.translate(centerX + offset.x, centerY + offset.y);
        ctx.scale(zoom, zoom);
        ctx.translate(-centerX, -centerY);

        // Draw dynamic elements (with transform)
        drawTierRings(
            ctx,
            centerX,
            centerY,
            baseMaxRadius,
            modules,
            captainLevel,
            artifacts,
        );
        drawCenterMarker(ctx, centerX, centerY);
        drawSectors(
            ctx,
            sectors,
            centerX,
            centerY,
            baseMaxRadius,
            modules,
            captainLevel,
            fuel,
            calculateFuelCost,
            areEnginesFunctional,
            areFuelTanksFunctional,
            currentSector,
            artifacts,
        );

        ctx.restore();
    }, [
        sectors,
        currentSector,
        modules,
        artifacts,
        captainLevel,
        fuel,
        calculateFuelCost,
        areEnginesFunctional,
        areFuelTanksFunctional,
        zoom,
        offset,
    ]);

    // Handle wheel zoom
    const handleWheel = useCallback(
        (e: React.WheelEvent<HTMLCanvasElement>) => {
            // Note: preventDefault doesn't work in passive listeners, but we don't need it here
            // since we're only handling zoom, not preventing browser scroll

            const delta = -e.deltaY * ZOOM_SENSITIVITY;
            const newZoom = Math.min(
                MAX_ZOOM,
                Math.max(MIN_ZOOM, zoom * (1 + delta)),
            );

            setZoom(newZoom);
        },
        [zoom],
    );

    // Handle mouse down for dragging
    const handleMouseDown = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            setIsDragging(true);
            hasMovedRef.current = false;
            dragStartRef.current = { x: e.clientX, y: e.clientY };
            offsetStartRef.current = { ...offset };
        },
        [offset],
    );

    // Handle mouse move for dragging
    const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            if (!isDragging) return;

            const dx = e.clientX - dragStartRef.current.x;
            const dy = e.clientY - dragStartRef.current.y;

            // Check if moved enough to be considered a drag
            if (
                !hasMovedRef.current &&
                Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD
            ) {
                hasMovedRef.current = true;
            }

            setOffset({
                x: offsetStartRef.current.x + dx,
                y: offsetStartRef.current.y + dy,
            });
        },
        [isDragging],
    );

    // Handle mouse up to stop dragging
    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Handle mouse leave to stop dragging
    const handleMouseLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Zoom in/out buttons
    const handleZoomIn = useCallback(() => {
        setZoom((z) => Math.min(MAX_ZOOM, z * 1.3));
    }, []);

    const handleZoomOut = useCallback(() => {
        setZoom((z) => Math.max(MIN_ZOOM, z / 1.3));
    }, []);

    // Reset zoom and pan
    const handleReset = useCallback(() => {
        setZoom(1);
        setOffset({ x: 0, y: 0 });
    }, []);

    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        // Don't click if we were dragging (moved mouse)
        if (hasMovedRef.current) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        // Account for zoom and pan - transform click coordinates to world coordinates
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Inverse transform: screen -> world
        // screenX = (worldX - centerX) * zoom + centerX + offset.x
        // worldX = (screenX - centerX - offset.x) / zoom + centerX
        const worldClickX = (clickX - centerX - offset.x) / zoom + centerX;
        const worldClickY = (clickY - centerY - offset.y) / zoom + centerY;

        // Calculate sector positions using the same formula as drawSector
        const baseMaxRadius = Math.min(canvas.width, canvas.height) * 0.42;

        for (const sector of sectors) {
            if (sector.mapAngle === undefined) continue;

            // Same calculation as in drawSector
            const radius = getSectorRadius(baseMaxRadius, sector.tier);
            const sectorX = centerX + Math.cos(sector.mapAngle) * radius;
            const sectorY = centerY + 10 + Math.sin(sector.mapAngle) * radius;

            const dist = Math.sqrt(
                (worldClickX - sectorX) ** 2 + (worldClickY - sectorY) ** 2,
            );

            // Hitbox size should also scale with zoom for consistent feel
            const hitboxSize = 35 / zoom;
            if (dist < hitboxSize) {
                selectSector(sector.id);
                break;
            }
        }
    };

    return (
        <div ref={containerRef} className="w-full h-full flex-1 relative">
            <canvas
                ref={canvasRef}
                className="border-2 border-[#00ff41] bg-[#050810] cursor-grab w-full h-full"
                style={{ cursor: isDragging ? "grabbing" : "grab" }}
                onClick={handleClick}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
            />

            {/* Zoom controls */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                <button
                    onClick={handleZoomIn}
                    className="w-10 h-10 bg-[#050810] border-2 border-[#00ff41] text-[#00ff41] text-xl font-bold hover:bg-[#0a1a20] transition-colors flex items-center justify-center cursor-pointer"
                    title="Приблизить"
                >
                    +
                </button>
                <button
                    onClick={handleZoomOut}
                    className="w-10 h-10 bg-[#050810] border-2 border-[#00ff41] text-[#00ff41] text-xl font-bold hover:bg-[#0a1a20] transition-colors flex items-center justify-center cursor-pointer"
                    title="Отдалить"
                >
                    −
                </button>
                <button
                    onClick={handleReset}
                    className="w-10 h-10 bg-[#050810] border-2 border-[#00ff41] text-[#00ff41] text-xs font-bold hover:bg-[#0a1a20] transition-colors flex items-center justify-center cursor-pointer"
                    title="Сбросить вид"
                >
                    RST
                </button>
            </div>

            {/* Zoom level indicator */}
            <div className="absolute bottom-4 left-4 bg-[rgba(0,255,65,0.1)] border border-[#00ff41] px-3 py-1 text-xs text-[#00ff41] select-none pointer-events-none">
                🔍 {(zoom * 100).toFixed(0)}%
            </div>
        </div>
    );
}

function drawCenterMarker(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#00ff41";
    ctx.lineWidth = 1;
    ctx.stroke();
}

function drawSectors(
    ctx: CanvasRenderingContext2D,
    sectors: ReturnType<typeof useGameStore.getState>["galaxy"]["sectors"],
    centerX: number,
    centerY: number,
    maxRadius: number,
    modules: ReturnType<typeof useGameStore.getState>["ship"]["modules"],
    captainLevel: number,
    fuel: number,
    calculateFuelCost: (targetTier: number) => number,
    areEnginesFunctional: () => boolean,
    areFuelTanksFunctional: () => boolean,
    currentSector: ReturnType<typeof useGameStore.getState>["currentSector"],
    artifacts: ReturnType<typeof useGameStore.getState>["artifacts"],
) {
    const canSeeT4 = canSeeTier4(modules, artifacts);

    sectors.forEach((sector) => {
        // Hide tier 4 sectors until scanner level 4 or all-seeing artifact
        if (sector.tier === 4 && !canSeeT4) return;

        drawSector(
            ctx,
            sector,
            centerX,
            centerY,
            maxRadius,
            modules,
            captainLevel,
            fuel,
            calculateFuelCost,
            areEnginesFunctional,
            areFuelTanksFunctional,
            sector.id === currentSector?.id,
        );
    });
}
