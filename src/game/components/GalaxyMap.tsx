"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useGameStore } from "../store";
import { useTranslation } from "@/lib/useTranslation";
import {
    drawStaticLegend,
    drawSector,
    drawTierRings,
    canSeeTier4,
    getSectorRadius,
} from "@/game/galaxy/galaxy-map-utils";

// Animation constants
const TWINKLING_STARS_COUNT = 40;
const COSMIC_PARTICLES_COUNT = 10;

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

// Generate twinkling stars with animation properties
function generateTwinklingStars(width: number, height: number) {
    const stars: Array<{
        x: number;
        y: number;
        size: number;
        brightness: number;
        twinkleSpeed: number;
        twinkleOffset: number;
    }> = [];

    for (let i = 0; i < TWINKLING_STARS_COUNT; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: 0.5 + Math.random() * 1.5,
            brightness: Math.random(),
            twinkleSpeed: 0.5 + Math.random() * 2,
            twinkleOffset: Math.random() * Math.PI * 2,
        });
    }

    return stars;
}

// Generate cosmic dust particles
function generateCosmicParticles() {
    const particles: Array<{
        nx: number;
        ny: number;
        size: number;
        vx: number;
        vy: number;
        brightness: number;
        color: string;
    }> = [];

    const colors = [
        "rgba(100, 150, 255, 0.4)",
        "rgba(150, 100, 255, 0.3)",
        "rgba(100, 255, 150, 0.3)",
        "rgba(255, 150, 100, 0.3)",
    ];

    for (let i = 0; i < COSMIC_PARTICLES_COUNT; i++) {
        particles.push({
            nx: Math.random(),
            ny: Math.random(),
            size: 0.5 + Math.random() * 1.5,
            vx: (Math.random() - 0.5) * 0.0003,
            vy: (Math.random() - 0.5) * 0.0003,
            brightness: 0.3 + Math.random() * 0.5,
            color: colors[Math.floor(Math.random() * colors.length)],
        });
    }

    return particles;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_SENSITIVITY = 0.001;
const DRAG_THRESHOLD = 5; // Minimum pixels to move before considering it a drag

export function GalaxyMap() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { t, currentLanguage } = useTranslation();
    const starsRef = useRef<Array<{
        x: number;
        y: number;
        radius: number;
        brightness: number;
    }> | null>(null);
    const twinklingStarsRef = useRef<Array<{
        x: number;
        y: number;
        size: number;
        brightness: number;
        twinkleSpeed: number;
        twinkleOffset: number;
    }> | null>(null);
    const particlesRef = useRef<Array<{
        nx: number;
        ny: number;
        size: number;
        vx: number;
        vy: number;
        brightness: number;
        color: string;
    }> | null>(null);
    const animationStateRef = useRef<{ time: number }>({ time: 0 });
    const initializedRef = useRef(false);
    const canvasSizeRef = useRef({ width: 0, height: 0 });
    const hasMovedRef = useRef(false);

    // Animation canvas ref
    const animCanvasRef = useRef<HTMLCanvasElement | null>(null);

    // Zoom and pan state
    const [zoom, setZoom] = useState(1);
    const [targetZoom, setTargetZoom] = useState<number | null>(null);
    const zoomAnimationRef = useRef<number | null>(null);
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
    const animationsEnabled = useGameStore((s) => s.settings.animationsEnabled);
    const setAnimationsEnabled = useGameStore((s) => s.setAnimationsEnabled);

    // Get set function from store to update sector positions
    const updateSectorPosition = useCallback(
        (sectorId: number, x: number, y: number) => {
            useGameStore.setState((state) => {
                const sector = state.galaxy.sectors.find(
                    (s) => s.id === sectorId,
                );
                if (sector) {
                    sector.mapX = x;
                    sector.mapY = y;
                }
            });
        },
        [],
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

    // Zoom animation effect
    useEffect(() => {
        if (targetZoom === null) return;

        const animateZoom = () => {
            setZoom((prevZoom) => {
                const diff = targetZoom - prevZoom;
                const step = diff * 0.15; // Smooth easing

                if (Math.abs(diff) < 0.001) {
                    setZoom(targetZoom);
                    setTargetZoom(null);
                    return targetZoom;
                }

                return prevZoom + step;
            });
            zoomAnimationRef.current = requestAnimationFrame(animateZoom);
        };

        zoomAnimationRef.current = requestAnimationFrame(animateZoom);

        return () => {
            if (zoomAnimationRef.current) {
                cancelAnimationFrame(zoomAnimationRef.current);
            }
        };
    }, [targetZoom]);

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
        drawStaticLegend(ctx, modules, captainLevel, fuel, t);

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
            updateSectorPosition,
        );

        ctx.restore();
    }, [
        areEnginesFunctional,
        areFuelTanksFunctional,
        artifacts,
        calculateFuelCost,
        captainLevel,
        currentLanguage,
        currentSector,
        fuel,
        modules,
        offset.x,
        offset.y,
        sectors,
        t,
        updateSectorPosition,
        zoom,
    ]);

    // Animation effect for twinkling stars and cosmic particles
    useEffect(() => {
        const animCanvas = animCanvasRef.current;
        const container = containerRef.current;
        if (!animCanvas || !container) return;

        const rect = container.getBoundingClientRect();
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);

        animCanvas.width = width;
        animCanvas.height = height;
        const animCtx = animCanvas.getContext("2d");
        if (!animCtx) return;

        // Initialize twinkling stars and particles
        if (!twinklingStarsRef.current) {
            twinklingStarsRef.current = generateTwinklingStars(width, height);
        }
        if (!particlesRef.current) {
            particlesRef.current = generateCosmicParticles();
        }

        // Animation loop
        let animationFrameId: number;
        const animate = () => {
            animationStateRef.current.time += 16;

            if (animationsEnabled) {
                animCtx.clearRect(0, 0, width, height);

                // Draw twinkling stars
                if (twinklingStarsRef.current) {
                    const time = animationStateRef.current.time;
                    twinklingStarsRef.current.forEach((star) => {
                        const twinkle =
                            Math.sin(
                                time * 0.002 * star.twinkleSpeed +
                                    star.twinkleOffset,
                            ) *
                                0.3 +
                            0.7;
                        const alpha = (0.3 + star.brightness * 0.7) * twinkle;

                        animCtx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                        animCtx.beginPath();
                        animCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                        animCtx.fill();
                    });
                }

                // Draw cosmic particles
                if (particlesRef.current) {
                    const time = animationStateRef.current.time;
                    particlesRef.current.forEach((particle) => {
                        particle.nx += particle.vx;
                        particle.ny += particle.vy;

                        // Wrap around
                        if (particle.nx < 0) particle.nx = 1;
                        if (particle.nx > 1) particle.nx = 0;
                        if (particle.ny < 0) particle.ny = 1;
                        if (particle.ny > 1) particle.ny = 0;

                        const x = particle.nx * width;
                        const y = particle.ny * height;

                        // Twinkle effect
                        const twinkle =
                            Math.sin(
                                time * 0.003 + particle.brightness * Math.PI,
                            ) *
                                0.3 +
                            0.7;

                        animCtx.fillStyle = particle.color.replace(
                            /[\d.]+\)$/g,
                            `${particle.brightness * twinkle * 0.5})`,
                        );
                        animCtx.beginPath();
                        animCtx.arc(x, y, particle.size, 0, Math.PI * 2);
                        animCtx.fill();
                    });
                }
            } else {
                animCtx.clearRect(0, 0, width, height);
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [animationsEnabled]);

    // Handle wheel zoom
    const handleWheel = useCallback(
        (e: React.WheelEvent<HTMLCanvasElement>) => {
            e.stopPropagation();
            const delta = -e.deltaY * ZOOM_SENSITIVITY;
            const newZoom = Math.min(
                MAX_ZOOM,
                Math.max(MIN_ZOOM, zoom * (1 + delta)),
            );

            setTargetZoom(newZoom);
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

    // Touch handlers for mobile
    const handleTouchStart = useCallback(
        (e: React.TouchEvent<HTMLCanvasElement>) => {
            const touch = e.touches[0];
            setIsDragging(true);
            hasMovedRef.current = false;
            dragStartRef.current = { x: touch.clientX, y: touch.clientY };
            offsetStartRef.current = { ...offset };
        },
        [offset],
    );

    const handleTouchMove = useCallback(
        (e: React.TouchEvent<HTMLCanvasElement>) => {
            if (!isDragging) return;

            const touch = e.touches[0];
            const dx = touch.clientX - dragStartRef.current.x;
            const dy = touch.clientY - dragStartRef.current.y;

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

    const handleTouchEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Zoom in/out buttons
    const handleZoomIn = useCallback(() => {
        setTargetZoom((prev) => {
            const currentZoom = prev !== null ? prev : zoom;
            return Math.min(MAX_ZOOM, currentZoom * 1.3);
        });
    }, [zoom]);

    const handleZoomOut = useCallback(() => {
        setTargetZoom((prev) => {
            const currentZoom = prev !== null ? prev : zoom;
            return Math.max(MIN_ZOOM, currentZoom / 1.3);
        });
    }, [zoom]);

    // Reset zoom and pan
    const handleReset = useCallback(() => {
        setTargetZoom(1);
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
        <div ref={containerRef} className="w-full h-full relative">
            <canvas
                ref={canvasRef}
                className="border-2 border-[#00ff41] bg-[#050810] cursor-grab w-full h-full touch-none"
                style={{
                    cursor: isDragging ? "grabbing" : "grab",
                    touchAction: "none",
                }}
                onClick={handleClick}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            />

            {/* Animation overlay canvas */}
            <canvas
                ref={animCanvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{
                    zIndex: 1,
                }}
            />

            {/* Zoom controls */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                <button
                    onClick={() => setAnimationsEnabled(!animationsEnabled)}
                    className="w-10 h-10 bg-[#050810] border-2 border-[#00ff41] text-[#00ff41] text-xs font-bold hover:bg-[#0a1a20] transition-colors flex items-center justify-center cursor-pointer"
                    title={
                        animationsEnabled
                            ? "Выключить анимации"
                            : "Включить анимации"
                    }
                >
                    {animationsEnabled ? "✨" : "⊘"}
                </button>
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
    updateSectorPosition: (sectorId: number, x: number, y: number) => void,
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
            updateSectorPosition,
        );
    });
}
