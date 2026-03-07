"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useGameStore } from "@/game/store";
import { Location, LocationType, StarType, StormType } from "@/game/types";
import { PLANET_COLORS_IN_SECTOR } from "../constants";
import { getScannerRangeLabel } from "./DistressSignalPanel";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_SENSITIVITY = 0.001;
const DRAG_THRESHOLD = 5;
const NEEDS_SCANNER_LOCATIONS: LocationType[] = ["storm", "anomaly", "boss"];

// Seeded random helper - returns deterministic value based on location ID
const seededRandom = (loc: Location, seed: number = 0): number => {
    const str = loc.id || "unknown";
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash = hash & hash;
    }
    const x = Math.sin(hash + seed) * 10000;
    return x - Math.floor(x);
};

// scanRange is the numeric value (3, 5, 8, 15+)
function getScannerInfo(
    loc: Location,
    scanRange: number,
    isRevealed: boolean = false,
): string[] {
    const info: string[] = [];
    const completed = loc.mined || loc.bossDefeated || loc.signalResolved;

    // If location was revealed (e.g., approached without scanner), show full info
    if (isRevealed) {
        info.push(`📍 ${loc.name}`);

        // Show type-specific info
        if (loc.type === "enemy") {
            info.push(`⚔️ Вражеский корабль`);
            info.push(`Угроза: ${loc.threat || 1}`);
        } else if (loc.type === "friendly_ship") {
            info.push(`🤝 Дружеский корабль`);
            if (loc.shipRace) {
                const raceNames: Record<string, string> = {
                    human: "Люди",
                    synthetic: "Синтетики",
                    xenosymbiont: "Ксеноморфы-симбионты",
                    krylorian: "Крилорианцы",
                    voidborn: "Порождённые Пустотой",
                    crystalline: "Кристаллоиды",
                };
                info.push(`🧬 ${raceNames[loc.shipRace] || loc.shipRace}`);
            }
        } else if (loc.type === "boss") {
            info.push(`⚠️ Древний корабль`);
        } else if (loc.type === "storm") {
            info.push(`🌪️ Космический шторм`);
        } else if (loc.type === "anomaly") {
            const type =
                loc.anomalyType === "good" ? "✓ Благоприятная" : "⚠ Опасная";
            info.push(`🔮 ${type}`);
        } else if (loc.type === "planet") {
            info.push(`🪐 Планета`);
            info.push(`🏷️ ${loc.planetType || "Неизвестно"}`);
            if (loc.isEmpty) {
                info.push(`🏜️ Безлюдная`);
            } else if (loc.dominantRace) {
                const raceNames: Record<string, string> = {
                    human: "Люди",
                    synthetic: "Синтетики",
                    xenosymbiont: "Ксеноморфы-симбионты",
                    krylorian: "Крилорианцы",
                    voidborn: "Порождённые Пустотой",
                    crystalline: "Кристаллоиды",
                };
                const raceName =
                    raceNames[loc.dominantRace] || loc.dominantRace;
                info.push(`🧬 ${raceName}`);
            }
        } else if (loc.type === "station") {
            info.push(`🛰️ Станция`);
            if (loc.stationType) {
                info.push(`🏷️ ${loc.stationType}`);
            }
        } else if (loc.type === "asteroid_belt") {
            info.push(`⛏️ Пояс астероидов`);
            info.push(`🏷️ Уровень: ${loc.asteroidTier || 1}`);
        }

        return info;
    }

    // Stations, planets, asteroid belts, and distress signals are always visible
    if (loc.type === "station") {
        info.push(`📍 ${loc.name}`);
        // Show station type with scanRange >= 5
        if (scanRange >= 5 && loc.stationType) {
            info.push(`🏷️ ${loc.stationType}`);
        }
        return info;
    }

    // For other objects, check if scanner can detect them
    const locTier = loc.threat || loc.anomalyTier || 1;
    const canDetect = canDetectObject(loc.type, scanRange, locTier);

    if (!canDetect) {
        // No scanner detection - show as unknown
        // Ships (enemy, friendly, boss) show as "Unknown ship" because they use ship icon
        if (
            loc.type === "boss" ||
            loc.type === "enemy" ||
            loc.type === "friendly_ship"
        ) {
            info.push(`❓ Неизвестный корабль`);
        } else if (loc.type === "planet") {
            info.push(`🌏 Планета`);
        } else if (loc.type === "asteroid_belt") {
            info.push(`🪨 Пояс астероидов`);
        } else {
            info.push(`❓ Неизвестный объект`);
        }
        return info;
    }

    if (loc.type === "planet") {
        info.push(`📍 ${loc.name}`);
        info.push(`🏷️ ${loc.planetType || "Неизвестно"}`);
        // Planet details
        if (loc.isEmpty) {
            info.push(`🏜️ Безлюдная`);
        } else {
            if (loc.dominantRace) {
                const raceNames: Record<string, string> = {
                    human: "Люди",
                    synthetic: "Синтетики",
                    xenosymbiont: "Ксеноморфы-симбионты",
                    krylorian: "Крилорианцы",
                    voidborn: "Порождённые Пустотой",
                    crystalline: "Кристаллоиды",
                };
                const raceName =
                    raceNames[loc.dominantRace] || loc.dominantRace;
                info.push(`🧬 ${raceName}`);
                if (scanRange >= 15) {
                    info.push(`👥 Население: ${loc.population || 0}k`);
                }
            }
        }
        return info;
    }
    if (loc.type === "asteroid_belt") {
        info.push(`📍 ${loc.name}`);
        // Always show asteroid tier with any scanner detection
        info.push(`🏷️ Уровень: ${loc.asteroidTier || 1}`);
        if (scanRange >= 15 && loc.resources && !completed) {
            info.push(`📦 Минералы: ~${loc.resources.minerals}`);
            if (loc.resources.rare > 0)
                info.push(`💎 Редкие: ~${loc.resources.rare}`);
            info.push(`₢ ~${loc.resources.credits}₢`);
        }
        // Hidden rewards for ancient asteroid belts
        if (scanRange >= 8 && loc.asteroidTier === 4 && !completed) {
            const detectionChance = Math.min(100, 50 + (scanRange - 8) * 5);
            if (Math.random() * 100 < detectionChance) {
                info.push(`★ Древние артефакты!`);
            }
        }
        return info;
    }
    if (loc.type === "distress_signal") {
        info.push(`🆘 Сигнал бедствия`);
        // Quantum scanner shows probabilities
        if (scanRange >= 15 && !loc.signalResolved) {
            info.push(`⚡ Засада (40%) / Выжившие (30%) / Груз (30%)`);
        }
        return info;
    }

    // Show name for scanned objects (except storms)
    if (loc.type !== "storm") {
        info.push(`📍 ${loc.name}`);
    }

    // Storm info
    if (loc.type === "storm") {
        if (scanRange < 5) {
            info.push(`🌪️ Космический шторм`);
        } else {
            // scanRange >= 5: detailed storm info
            const stormNames: Record<StormType, string> = {
                radiation: "Радиационное облако",
                ionic: "Ионный шторм",
                plasma: "Плазменный шторм",
            };
            const intensity = loc.stormIntensity || 1;
            info.push(
                `🌪️ ${loc.stormType ? stormNames[loc.stormType] : "Шторм"}`,
            );
            info.push(`⚡ Интенсивность: ${intensity}`);

            // Show possible effects
            if (loc.stormType === "radiation") {
                info.push(`☢️ Урон экипажу: ~${15 * intensity}%`);
            } else if (loc.stormType === "ionic") {
                info.push(`⚡ Урон щитам: ~${30 * intensity}%`);
            } else {
                info.push(`🔥 Комплексный урон: ~${20 * intensity}%`);
            }

            info.push(
                `💰 Добыча: x${loc.stormType === "radiation" ? 2 : loc.stormType === "ionic" ? 2.5 : 3}`,
            );
        }
        // Hidden rewards for storms
        if (scanRange >= 8 && !completed) {
            const detectionChance = Math.min(100, 50 + (scanRange - 8) * 5);
            if (Math.random() * 100 < detectionChance) {
                info.push(`★ Редкие ресурсы!`);
            }
        }
    }

    // Enemy info
    if (loc.type === "enemy") {
        info.push(`⚔️ Угроза: ${loc.threat || 1}`);
    }

    // Anomaly info
    if (loc.type === "anomaly") {
        if (scanRange >= 15) {
            const type =
                loc.anomalyType === "good" ? "✓ Благоприятная" : "⚠ Опасная";
            info.push(`🔮 ${type}`);
        }
        info.push(`🔬 Учёный: LV${loc.requiresScientistLevel || 1}`);
    }

    // Hidden rewards for ancient bosses
    if (loc.type === "boss" && !loc.bossDefeated && scanRange >= 8) {
        const detectionChance = Math.min(100, 50 + (scanRange - 8) * 5);
        if (Math.random() * 100 < detectionChance) {
            info.push(`★ Древний артефакт!`);
        }
    }

    return info;
}

/**
 * Проверяет, может ли сканер обнаружить объект на основе scanRange
 * Пороги scanRange для обнаружения:
 * - friendly_ship: scanRange >= 3
 * - enemy/anomaly tier 1: scanRange >= 3
 * - enemy/anomaly tier 2: scanRange >= 5
 * - enemy/anomaly tier 3, boss: scanRange >= 8
 * - anomaly tier 4: scanRange >= 15
 * - storm: scanRange >= 5
 */
function canDetectObject(
    objectType: LocationType,
    scanRange: number,
    tier: number = 1,
): boolean {
    switch (objectType) {
        case "friendly_ship":
            return scanRange >= 3;
        case "enemy":
            if (tier === 1) return scanRange >= 3;
            if (tier === 2) return scanRange >= 5;
            return scanRange >= 8; // tier 3+
        case "boss":
            return scanRange >= 8;
        case "anomaly":
            if (tier === 1) return scanRange >= 3;
            if (tier === 2) return scanRange >= 5;
            if (tier === 3) return scanRange >= 8;
            return scanRange >= 15; // tier 4
        case "storm":
            return scanRange >= 5;
        default:
            return true; // Always visible
    }
}

export function SectorMap() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const currentSector = useGameStore((s) => s.currentSector);
    const selectLocation = useGameStore((s) => s.selectLocation);
    const travelThroughBlackHole = useGameStore(
        (s) => s.travelThroughBlackHole,
    );
    const completedLocations = useGameStore((s) => s.completedLocations);
    const getEffectiveScanRange = useGameStore((s) => s.getEffectiveScanRange);
    const canScanObject = useGameStore((s) => s.canScanObject);

    const [hoveredLocation, setHoveredLocation] = useState<{
        loc: Location;
        x: number;
        y: number;
    } | null>(null);

    // Zoom and pan state
    const [zoom, setZoom] = useState(1);
    const [targetZoom, setTargetZoom] = useState<number | null>(null);
    const zoomAnimationRef = useRef<number | null>(null);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const offsetStartRef = useRef({ x: 0, y: 0 });
    const offsetRef = useRef({ x: 0, y: 0 }); // Ref for smooth dragging without re-renders
    const hasMovedRef = useRef(false);
    const animationFrameRef = useRef<number | null>(null);

    // Cache stars to prevent flickering (stored in normalized 0-1 coordinates)
    const starsRef = useRef<Array<{
        nx: number; // normalized x (0-1)
        ny: number; // normalized y (0-1)
        size: number;
        brightness: number;
    }> | null>(null);

    // Off-screen canvas for static background (stars)
    const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);

    // Store canvas size to detect actual resize
    const canvasSizeRef = useRef({ width: 0, height: 0 });

    const scanRange = getEffectiveScanRange();

    // Draw the canvas content
    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container || !currentSector) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const baseMaxRadius = Math.min(width, height) * 0.45;

        // Draw cached background (stars) - no transform
        if (bgCanvasRef.current) {
            ctx.drawImage(bgCanvasRef.current, 0, 0);
        }

        // Apply transform for zoom and pan (use ref during drag, state otherwise)
        const currentOffset = isDragging ? offsetRef.current : offset;
        ctx.save();
        ctx.translate(centerX + currentOffset.x, centerY + currentOffset.y);
        ctx.scale(zoom, zoom);
        ctx.translate(-centerX, -centerY);

        // Draw central star
        const star = currentSector.star;
        drawStar(ctx, centerX, centerY, star, currentSector.id);

        // Draw locations at grid-based positions
        const locations = currentSector.locations;

        // Helper function to compute location position
        const computeLocationPosition = (loc: (typeof locations)[0]) => {
            const distanceRatio = loc.distanceRatio ?? 0.5;
            const distance = baseMaxRadius * distanceRatio;
            const angle = loc.angle ?? 0;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            return { x, y };
        };

        locations.forEach((loc) => {
            const { x, y } = computeLocationPosition(loc);

            const completed = completedLocations.includes(loc.id);
            const isRevealed = loc.signalRevealed; // Location was approached and revealed

            // Check if scanner can detect this object type
            const canScan = canScanObject(
                loc.type,
                loc.threat || loc.anomalyTier,
            );

            if (loc.type === "station") {
                drawStation(ctx, x, y, completed);
            } else if (loc.type === "planet") {
                drawPlanet(ctx, x, y, loc, completed);
            } else if (loc.type === "enemy") {
                // Without scanner AND not revealed - show as unknown
                if (!canScan && !isRevealed) {
                    drawUnknownShip(ctx, x, y, completed);
                } else {
                    drawEnemy(ctx, x, y, loc, completed);
                }
            } else if (loc.type === "anomaly") {
                if (canScan || isRevealed) {
                    drawAnomaly(ctx, x, y, loc, completed);
                } else {
                    drawUnknown(ctx, x, y, completed);
                }
            } else if (loc.type === "friendly_ship") {
                // Without scanner AND not revealed - show as unknown
                if (!canScan && !isRevealed) {
                    drawUnknownShip(ctx, x, y, completed);
                } else {
                    drawFriendlyShip(ctx, x, y, completed);
                }
            } else if (loc.type === "asteroid_belt") {
                drawAsteroidBelt(ctx, x, y, loc, completed);
            } else if (loc.type === "storm") {
                if (canScan || isRevealed) {
                    drawStorm(ctx, x, y, loc, completed);
                } else {
                    drawUnknown(ctx, x, y, completed);
                }
            } else if (loc.type === "distress_signal") {
                // Distress signals are always visible (SOS beacon)
                drawDistressSignal(ctx, x, y, loc, completed);
            } else if (loc.type === "boss") {
                if (canScan || isRevealed) {
                    drawAncientBoss(ctx, x, y, loc, completed);
                } else {
                    drawUnknownShip(ctx, x, y, completed);
                }
            }

            // Draw label below the location
            // Without scanner, certain locations show as "Unknown object"
            // Distress signals are always visible (SOS beacon broadcasts location)

            const needsScanner = NEEDS_SCANNER_LOCATIONS.includes(loc.type);

            // Boss shows as "Unknown ship" (not "Unknown object") because it uses ship icon
            const isUnknownBoss =
                loc.type === "boss" && !canScan && !isRevealed && !completed;

            const displayName = isUnknownBoss
                ? "❓ Неизвестный корабль"
                : needsScanner && !canScan && !isRevealed && !completed
                  ? "❓ Неизвестный объект"
                  : loc.name;

            // Also hide enemy/friendly ship names without scanner and not revealed
            const isUnknownShip =
                ["enemy", "friendly_ship"].includes(loc.type) &&
                !canScan &&
                !isRevealed &&
                !completed;

            // Check for fully explored empty planet
            const isExploredEmptyPlanet =
                loc.type === "planet" && loc.isEmpty && loc.explored;

            // Check for visited colonized planet (opened planet panel at least once)
            const isVisitedColonizedPlanet =
                loc.type === "planet" && !loc.isEmpty && loc.visited;

            // Check for visited station (opened station panel at least once)
            const isVisitedStation = loc.type === "station" && loc.visited;

            const finalDisplayName = isUnknownShip
                ? "❓ Неизвестный корабль"
                : isExploredEmptyPlanet
                  ? `${loc.name} (исследовано)`
                  : isVisitedColonizedPlanet || isVisitedStation
                    ? `${loc.name} (посещено)`
                    : displayName;

            ctx.font = "11px Share Tech Mono";
            ctx.textAlign = "center";
            ctx.fillStyle = completed
                ? "#888"
                : isExploredEmptyPlanet ||
                    isVisitedColonizedPlanet ||
                    isVisitedStation
                  ? "#00ff41"
                  : loc.type === "planet" && !loc.isEmpty
                    ? "#ffb000"
                    : "#00ff41";
            ctx.fillText(finalDisplayName, x, y + 28);

            if (completed) {
                ctx.font = "9px Share Tech Mono";
                ctx.fillStyle = "#666";
                ctx.fillText("(✓)", x, y + 40);
            }
        });

        ctx.restore();
    }, [
        currentSector,
        completedLocations,
        canScanObject,
        zoom,
        offset,
        isDragging,
    ]);

    // Initialize canvas and background
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container || !currentSector) return;

        const rect = container.getBoundingClientRect();
        const newWidth = Math.round(Math.max(rect.width, 500));
        const newHeight = Math.round(Math.max(rect.width * 0.65, 350));

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Regenerate background only if canvas size actually changed (not fractional)
        const sizeChanged =
            canvasSizeRef.current.width !== newWidth ||
            canvasSizeRef.current.height !== newHeight;

        if (sizeChanged) {
            canvas.width = newWidth;
            canvas.height = newHeight;
            canvasSizeRef.current = { width: newWidth, height: newHeight };

            // Create off-screen background canvas
            const bgCanvas = document.createElement("canvas");
            bgCanvas.width = newWidth;
            bgCanvas.height = newHeight;
            const bgCtx = bgCanvas.getContext("2d");

            if (bgCtx) {
                // Clear with space background
                bgCtx.fillStyle = "#050810";
                bgCtx.fillRect(0, 0, newWidth, newHeight);

                // Generate stars once in normalized coordinates (0-1)
                // Only generate if not already cached
                if (!starsRef.current) {
                    const stars: Array<{
                        nx: number;
                        ny: number;
                        size: number;
                        brightness: number;
                    }> = [];

                    // Simple hash function for pseudo-random but consistent values
                    const hash = (n: number): number => {
                        const h = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
                        return h - Math.floor(h);
                    };

                    for (let i = 0; i < 150; i++) {
                        stars.push({
                            nx: hash(i),
                            ny: hash(i + 1000),
                            size: 0.5 + hash(i + 2000) * 1.5,
                            brightness: hash(i + 3000),
                        });
                    }
                    starsRef.current = stars;
                }

                // Draw stars using normalized coordinates scaled to current canvas size
                starsRef.current.forEach((star) => {
                    const x = star.nx * newWidth;
                    const y = star.ny * newHeight;
                    bgCtx.fillStyle = `rgba(255, 255, 255, ${0.3 + star.brightness * 0.7})`;
                    bgCtx.beginPath();
                    bgCtx.arc(x, y, star.size, 0, Math.PI * 2);
                    bgCtx.fill();
                });
            }

            bgCanvasRef.current = bgCanvas;
        }

        // Initial draw
        drawCanvas();
    }, [currentSector, drawCanvas]);

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

    // Handle mouse move for dragging and tooltip
    const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            // Handle dragging with direct canvas rendering (no React state updates)
            if (isDragging) {
                const dx = e.clientX - dragStartRef.current.x;
                const dy = e.clientY - dragStartRef.current.y;

                // Check if moved enough to be considered a drag
                if (
                    !hasMovedRef.current &&
                    Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD
                ) {
                    hasMovedRef.current = true;
                }

                const newOffset = {
                    x: offsetStartRef.current.x + dx,
                    y: offsetStartRef.current.y + dy,
                };
                offsetRef.current = newOffset;

                // Cancel previous animation frame
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                }

                // Direct canvas rendering without React state
                animationFrameRef.current = requestAnimationFrame(() => {
                    const canvas = canvasRef.current;
                    const container = containerRef.current;
                    if (!canvas || !container || !currentSector) return;

                    const ctx = canvas.getContext("2d");
                    if (!ctx) return;

                    const width = canvas.width;
                    const height = canvas.height;
                    const centerX = width / 2;
                    const centerY = height / 2;
                    const baseMaxRadius = Math.min(width, height) * 0.45;

                    // Draw cached background
                    if (bgCanvasRef.current) {
                        ctx.drawImage(bgCanvasRef.current, 0, 0);
                    }

                    // Apply transform using ref offset (no React state)
                    ctx.save();
                    ctx.translate(centerX + newOffset.x, centerY + newOffset.y);
                    ctx.scale(zoom, zoom);
                    ctx.translate(-centerX, -centerY);

                    // Draw central star
                    const star = currentSector.star;
                    drawStar(ctx, centerX, centerY, star, currentSector.id);

                    // Helper function to compute location position
                    const computeLocationPosition = (
                        loc: (typeof currentSector.locations)[0],
                    ) => {
                        const distanceRatio = loc.distanceRatio ?? 0.5;
                        const distance = baseMaxRadius * distanceRatio;
                        const angle = loc.angle ?? 0;
                        const x = centerX + Math.cos(angle) * distance;
                        const y = centerY + Math.sin(angle) * distance;
                        return { x, y };
                    };

                    // Draw locations
                    currentSector.locations.forEach((loc) => {
                        const { x, y } = computeLocationPosition(loc);

                        const completed = completedLocations.includes(loc.id);
                        const canScan = canScanObject(
                            loc.type,
                            loc.threat || loc.anomalyTier,
                        );
                        const isRevealed = loc.signalRevealed;

                        if (loc.type === "station") {
                            drawStation(ctx, x, y, completed);
                        } else if (loc.type === "planet") {
                            drawPlanet(ctx, x, y, loc, completed);
                        } else if (loc.type === "enemy") {
                            if (!canScan && !isRevealed) {
                                drawUnknownShip(ctx, x, y, completed);
                            } else {
                                drawEnemy(ctx, x, y, loc, completed);
                            }
                        } else if (loc.type === "anomaly") {
                            if (canScan || isRevealed) {
                                drawAnomaly(ctx, x, y, loc, completed);
                            } else {
                                drawUnknown(ctx, x, y, completed);
                            }
                        } else if (loc.type === "friendly_ship") {
                            if (!canScan && !isRevealed) {
                                drawUnknownShip(ctx, x, y, completed);
                            } else {
                                drawFriendlyShip(ctx, x, y, completed);
                            }
                        } else if (loc.type === "asteroid_belt") {
                            drawAsteroidBelt(ctx, x, y, loc, completed);
                        } else if (loc.type === "storm") {
                            if (canScan || isRevealed) {
                                drawStorm(ctx, x, y, loc, completed);
                            } else {
                                drawUnknown(ctx, x, y, completed);
                            }
                        } else if (loc.type === "distress_signal") {
                            drawDistressSignal(ctx, x, y, loc, completed);
                        } else if (loc.type === "boss") {
                            if (canScan || isRevealed) {
                                drawAncientBoss(ctx, x, y, loc, completed);
                            } else {
                                drawUnknownShip(ctx, x, y, completed);
                            }
                        }

                        // Draw labels
                        const needsScanner = NEEDS_SCANNER_LOCATIONS.includes(
                            loc.type,
                        );
                        const displayName =
                            needsScanner &&
                            !canScan &&
                            !isRevealed &&
                            !completed
                                ? "❓ Неизвестный объект"
                                : loc.name;

                        const isUnknownShip =
                            ["enemy", "friendly_ship"].includes(loc.type) &&
                            !canScan &&
                            !isRevealed &&
                            !completed;

                        const isExploredEmptyPlanet =
                            loc.type === "planet" &&
                            loc.isEmpty &&
                            loc.explored;
                        const isVisitedColonizedPlanet =
                            loc.type === "planet" &&
                            !loc.isEmpty &&
                            loc.visited;
                        const isVisitedStation =
                            loc.type === "station" && loc.visited;

                        const finalDisplayName = isUnknownShip
                            ? "❓ Неизвестный корабль"
                            : isExploredEmptyPlanet
                              ? `${loc.name} (исследовано)`
                              : isVisitedColonizedPlanet || isVisitedStation
                                ? `${loc.name} (посещено)`
                                : displayName;

                        ctx.font = "11px Share Tech Mono";
                        ctx.textAlign = "center";
                        ctx.fillStyle = completed
                            ? "#888"
                            : isExploredEmptyPlanet ||
                                isVisitedColonizedPlanet ||
                                isVisitedStation
                              ? "#00ff41"
                              : loc.type === "planet" && !loc.isEmpty
                                ? "#ffb000"
                                : "#00ff41";
                        ctx.fillText(finalDisplayName, x, y + 28);

                        if (completed) {
                            ctx.font = "9px Share Tech Mono";
                            ctx.fillStyle = "#666";
                            ctx.fillText("(✓)", x, y + 40);
                        }
                    });

                    ctx.restore();
                    animationFrameRef.current = null;
                });
            }

            // Handle tooltip
            const canvas = canvasRef.current;
            if (!canvas || !currentSector) return;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY = (e.clientY - rect.top) * scaleY;

            // Account for zoom and pan
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const currentOffset = isDragging ? offsetRef.current : offset;
            const worldMouseX =
                (mouseX - centerX - currentOffset.x) / zoom + centerX;
            const worldMouseY =
                (mouseY - centerY - currentOffset.y) / zoom + centerY;

            // Helper function to compute location position
            const computeLocationPosition = (
                loc: (typeof currentSector.locations)[0],
            ) => {
                const distanceRatio = loc.distanceRatio ?? 0.5;
                const baseMaxRadius =
                    Math.min(canvas.width, canvas.height) * 0.45;
                const distance = baseMaxRadius * distanceRatio;
                const angle = loc.angle ?? 0;
                const x = centerX + Math.cos(angle) * distance;
                const y = centerY + Math.sin(angle) * distance;
                return { x, y };
            };

            let found = false;
            currentSector.locations.forEach((loc) => {
                const { x, y } = computeLocationPosition(loc);
                const dist = Math.sqrt(
                    (worldMouseX - x) ** 2 + (worldMouseY - y) ** 2,
                );
                const hitboxSize = 25 / zoom;
                if (dist < hitboxSize) {
                    const screenX = e.clientX - rect.left;
                    const screenY = e.clientY - rect.top;
                    setHoveredLocation({ loc, x: screenX, y: screenY });
                    found = true;
                }
            });

            if (!found) {
                setHoveredLocation(null);
            }
        },
        [
            isDragging,
            zoom,
            offset,
            currentSector,
            completedLocations,
            canScanObject,
        ],
    );

    // Handle mouse up to stop dragging
    const handleMouseUp = useCallback(() => {
        if (isDragging) {
            // Sync offset ref with React state when drag ends
            setOffset({ ...offsetRef.current });
        }
        setIsDragging(false);
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    }, [isDragging]);

    // Handle mouse leave to stop dragging
    const handleMouseLeave = useCallback(() => {
        if (isDragging) {
            setOffset({ ...offsetRef.current });
        }
        setIsDragging(false);
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    }, [isDragging]);

    // Touch handlers for mobile
    const handleTouchStart = useCallback(
        (e: React.TouchEvent<HTMLCanvasElement>) => {
            const touch = e.touches[0];
            setIsDragging(true);
            hasMovedRef.current = false;
            dragStartRef.current = { x: touch.clientX, y: touch.clientY };
            offsetStartRef.current = { ...offsetRef.current };
        },
        [],
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

            const newOffset = {
                x: offsetStartRef.current.x + dx,
                y: offsetStartRef.current.y + dy,
            };
            offsetRef.current = newOffset;

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }

            animationFrameRef.current = requestAnimationFrame(() => {
                drawCanvas();
            });
        },
        [isDragging, drawCanvas],
    );

    const handleTouchEnd = useCallback(() => {
        if (isDragging) {
            setOffset({ ...offsetRef.current });
        }
        setIsDragging(false);
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    }, [isDragging]);

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

    // Redraw canvas when zoom or offset changes
    useEffect(() => {
        drawCanvas();
    }, [drawCanvas, zoom, offset]);

    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        // Don't click if we were dragging (moved mouse)
        if (hasMovedRef.current) return;

        const canvas = canvasRef.current;
        if (!canvas || !currentSector) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        // Account for zoom and pan - transform click coordinates to world coordinates
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Use ref offset during drag, state otherwise
        const currentOffset = isDragging ? offsetRef.current : offset;

        // Inverse transform: screen -> world
        const worldClickX =
            (clickX - centerX - currentOffset.x) / zoom + centerX;
        const worldClickY =
            (clickY - centerY - currentOffset.y) / zoom + centerY;

        // Check if clicked on central star (black hole)
        const distFromCenter = Math.sqrt(
            (worldClickX - centerX) ** 2 + (worldClickY - centerY) ** 2,
        );

        if (currentSector.star?.type === "blackhole" && distFromCenter < 40) {
            travelThroughBlackHole();
            return;
        }

        // Helper function to compute location position
        const baseMaxRadius = Math.min(canvas.width, canvas.height) * 0.45;
        const computeLocationPosition = (
            loc: (typeof currentSector.locations)[0],
        ) => {
            const distanceRatio = loc.distanceRatio ?? 0.5;
            const distance = baseMaxRadius * distanceRatio;
            const angle = loc.angle ?? 0;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            return { x, y };
        };

        currentSector.locations.forEach((loc, idx) => {
            const { x, y } = computeLocationPosition(loc);
            const dist = Math.sqrt(
                (worldClickX - x) ** 2 + (worldClickY - y) ** 2,
            );
            // Hitbox size scales with zoom for consistent feel
            const hitboxSize = 25 / zoom;
            if (dist < hitboxSize) {
                selectLocation(idx);
            }
        });
    };

    return (
        <div ref={containerRef} className="w-full h-full relative">
            {currentSector?.star?.type === "blackhole" && (
                <div className="bg-[rgba(255,0,255,0.1)] border border-[#ff00ff] p-2 mb-2 text-center text-sm">
                    <span className="text-[#ff00ff] font-bold">
                        🕳️ ЧЁРНАЯ ДЫРА
                    </span>
                    <span className="text-[#ffb000] ml-2">
                        - Нажмите на центр, чтобы телепортироваться
                    </span>
                </div>
            )}

            {/* Scanner range indicator */}
            {scanRange >= 0 && (
                <div className="absolute top-2 right-2 bg-[rgba(0,255,65,0.1)] border border-[#00ff41] px-2 py-1 text-xs text-[#00ff41] z-10">
                    📡 Сканер: {getScannerRangeLabel(scanRange)}
                </div>
            )}

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
                onMouseLeave={() => {
                    handleMouseLeave();
                    setHoveredLocation(null);
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
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

            {/* Tooltip */}
            {hoveredLocation && (
                <div
                    className="absolute pointer-events-none bg-[rgba(0,0,0,0.9)] border border-[#00ff41] p-2 text-xs z-20 max-w-50"
                    style={{
                        left: `${hoveredLocation.x + 15}px`,
                        top: `${hoveredLocation.y + 20}px`,
                    }}
                >
                    {getScannerInfo(
                        hoveredLocation.loc,
                        scanRange,
                        hoveredLocation.loc.signalRevealed ||
                            hoveredLocation.loc.visited ||
                            false,
                    ).map((line, i) => (
                        <div
                            key={i}
                            className={
                                line.startsWith("★")
                                    ? "text-[#ffb000]"
                                    : "text-[#00ff41]"
                            }
                        >
                            {line}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Draw star at center
function drawStar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    star: { type: StarType; name: string } | undefined,
    sectorId?: number,
) {
    if (!star) return;

    if (star.type === "blackhole") {
        // Black hole with accretion disk
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 50);
        gradient.addColorStop(0, "#000");
        gradient.addColorStop(0.5, "#1a0a2e");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 50, 50, Math.PI * 2);
        ctx.fill();

        // Event horizon
        ctx.strokeStyle = "#ff00ff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.stroke();

        // Accretion disk
        ctx.strokeStyle = "rgba(255, 100, 255, 0.5)";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.ellipse(x, y, 40, 15, Math.PI / 6, 0, Math.PI * 2);
        ctx.stroke();
    } else if (star.type === "triple") {
        // Three stars with varied color combinations based on sector ID
        const colorSets = [
            { c1: "#ffdd44", c2: "#ffaa00", c3: "#ff6600" }, // Yellow-Orange-Red
            { c1: "#ffdd44", c2: "#ffdd44", c3: "#ffaa00" }, // All yellow-orange
            { c1: "#ffaa00", c2: "#ff6644", c3: "#ffdd44" }, // Orange-Red-Yellow
            { c1: "#ffdd44", c2: "#ffee88", c3: "#ffcc00" }, // Light yellow variations
        ];
        // Use sector ID to deterministically select color set
        const index =
            sectorId !== undefined ? Math.abs(sectorId) % colorSets.length : 0;
        const colorSet = colorSets[index];

        for (let i = 0; i < 3; i++) {
            const angle = i * ((Math.PI * 2) / 3);
            const sx = x + Math.cos(angle) * 20;
            const sy = y + Math.sin(angle) * 20;
            const colors = [colorSet.c1, colorSet.c2, colorSet.c3];

            // Glow
            const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, 20);
            gradient.addColorStop(0, "#fff");
            gradient.addColorStop(0.3, colors[i]);
            gradient.addColorStop(1, "transparent");
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(sx, sy, 20, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (star.type === "double") {
        // Binary stars with varied color combinations based on sector ID
        const colorSets = [
            { c1: "#ffdd44", c2: "#ffaa00" }, // Yellow-Orange
            { c1: "#ffaa00", c2: "#ff6644" }, // Orange-Red
            { c1: "#ffdd44", c2: "#ffee88" }, // Light yellow - Yellow
            { c1: "#ff6644", c2: "#ffdd44" }, // Red-Yellow
            { c1: "#ffcc00", c2: "#ff9900" }, // Gold-Orange
        ];
        // Use sector ID to deterministically select color set
        const index =
            sectorId !== undefined ? Math.abs(sectorId) % colorSets.length : 0;
        const colorSet = colorSets[index];

        for (const [i, offset] of [-15, 15].entries()) {
            const colors = [colorSet.c1, colorSet.c2];
            const gradient = ctx.createRadialGradient(
                x + offset,
                y,
                0,
                x + offset,
                y,
                25,
            );
            gradient.addColorStop(0, "#fff");
            gradient.addColorStop(0.3, colors[i]);
            gradient.addColorStop(1, "transparent");
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x + offset, y, 25, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (star.type === "red_dwarf") {
        // Red dwarf - small, dim, red
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 25);
        gradient.addColorStop(0, "#ff6644");
        gradient.addColorStop(0.6, "#cc3311");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.fill();
    } else if (star.type === "yellow_dwarf") {
        // Yellow dwarf - Sun-like, medium size
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 35);
        gradient.addColorStop(0, "#fff");
        gradient.addColorStop(0.2, "#ffff88");
        gradient.addColorStop(0.5, "#ffdd44");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 35, 0, Math.PI * 2);
        ctx.fill();
    } else if (star.type === "white_dwarf") {
        // White dwarf - small, bright, white-blue
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 20);
        gradient.addColorStop(0, "#ffffff");
        gradient.addColorStop(0.4, "#aaddff");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
    } else if (star.type === "blue_giant") {
        // Blue giant - large, bright, blue-white
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 45);
        gradient.addColorStop(0, "#ffffff");
        gradient.addColorStop(0.3, "#66aaff");
        gradient.addColorStop(0.7, "#2266aa");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 45, 0, Math.PI * 2);
        ctx.fill();
    } else if (star.type === "red_supergiant") {
        // Red supergiant - huge, dim, deep red
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 55);
        gradient.addColorStop(0, "#ff8866");
        gradient.addColorStop(0.4, "#ff4422");
        gradient.addColorStop(0.8, "#aa1100");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 55, 0, Math.PI * 2);
        ctx.fill();
    } else if (star.type === "neutron_star") {
        // Neutron star - tiny, bright, with pulsing effect
        // Outer glow
        const outerGradient = ctx.createRadialGradient(x, y, 0, x, y, 30);
        outerGradient.addColorStop(0, "rgba(100, 100, 255, 0.4)");
        outerGradient.addColorStop(1, "transparent");
        ctx.fillStyle = outerGradient;
        ctx.beginPath();
        ctx.arc(x, y, 30, 0, Math.PI * 2);
        ctx.fill();

        // Core
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 12);
        gradient.addColorStop(0, "#ffffff");
        gradient.addColorStop(0.5, "#6688ff");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing ring
        ctx.strokeStyle = "rgba(100, 150, 255, 0.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// Draw planet (inspired by solar system planets)
function drawPlanet(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    loc: Location,
    completed: boolean,
) {
    const radius = loc.isEmpty ? 8 : 12;
    const planetType = loc.planetType;
    const colors = planetType
        ? PLANET_COLORS_IN_SECTOR[planetType]
        : {
              base: "#888888",
              atmosphere: "#aaaaaa",
          };

    if (completed) {
        ctx.globalAlpha = 0.4;
    }

    // Atmosphere glow
    const glowGradient = ctx.createRadialGradient(
        x,
        y,
        radius * 0.8,
        x,
        y,
        radius * 1.5,
    );
    glowGradient.addColorStop(0, "transparent");
    glowGradient.addColorStop(0.5, colors.atmosphere + "40");
    glowGradient.addColorStop(1, "transparent");
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Planet body with gradient
    const planetGradient = ctx.createRadialGradient(
        x - radius * 0.3,
        y - radius * 0.3,
        0,
        x,
        y,
        radius,
    );
    planetGradient.addColorStop(0, colors.atmosphere);
    planetGradient.addColorStop(0.7, colors.base);
    planetGradient.addColorStop(1, colors.base + "aa");
    ctx.fillStyle = planetGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Add rings for ringed planets
    if (
        (loc.planetType === "Планета-кольцо" || loc.planetType === "Ледяная") &&
        !loc.isEmpty
    ) {
        const ringColor = colors.rings || colors.atmosphere;
        ctx.strokeStyle = ringColor + "80";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(
            x,
            y,
            radius * 1.8,
            radius * 0.4,
            Math.PI / 6,
            0,
            Math.PI * 2,
        );
        ctx.stroke();
    }

    // Surface details
    ctx.strokeStyle = colors.base + "60";
    ctx.lineWidth = 1;

    if (loc.planetType === "Вулканическая") {
        // Lava spots
        ctx.fillStyle = "#ff4400";
        for (let i = 0; i < 3; i++) {
            const angle = seededRandom(loc, i) * Math.PI * 2;
            const dist = seededRandom(loc, i + 10) * radius * 0.6;
            ctx.beginPath();
            ctx.arc(
                x + Math.cos(angle) * dist,
                y + Math.sin(angle) * dist,
                2,
                0,
                Math.PI * 2,
            );
            ctx.fill();
        }
    }

    if (loc.planetType === "Радиоактивная") {
        // Radioactive glow spots
        ctx.fillStyle = "#7fff00";
        for (let i = 0; i < 5; i++) {
            const angle = seededRandom(loc, i) * Math.PI * 2;
            const dist = seededRandom(loc, i + 10) * radius * 0.7;
            ctx.beginPath();
            ctx.arc(
                x + Math.cos(angle) * dist,
                y + Math.sin(angle) * dist,
                1.5,
                0,
                Math.PI * 2,
            );
            ctx.fill();
        }
    }

    if (loc.planetType === "Тропическая") {
        // Jungle patterns
        ctx.fillStyle = "#006400";
        for (let i = 0; i < 4; i++) {
            const angle = seededRandom(loc, i) * Math.PI * 2;
            const dist = seededRandom(loc, i + 10) * radius * 0.5;
            ctx.beginPath();
            ctx.arc(
                x + Math.cos(angle) * dist,
                y + Math.sin(angle) * dist,
                3,
                0,
                Math.PI * 2,
            );
            ctx.fill();
        }
    }

    if (loc.planetType === "Арктическая") {
        // Ice cracks
        ctx.strokeStyle = "#87ceeb";
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const angle = seededRandom(loc, i) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(
                x + Math.cos(angle) * radius * 0.8,
                y + Math.sin(angle) * radius * 0.8,
            );
            ctx.stroke();
        }
    }

    if (loc.planetType === "Разрушенная войной") {
        // Crater scars
        ctx.fillStyle = "#2a2a2a";
        for (let i = 0; i < 4; i++) {
            const angle = seededRandom(loc, i) * Math.PI * 2;
            const dist = seededRandom(loc, i + 10) * radius * 0.6;
            ctx.beginPath();
            ctx.arc(
                x + Math.cos(angle) * dist,
                y + Math.sin(angle) * dist,
                2,
                0,
                Math.PI * 2,
            );
            ctx.fill();
        }
    }

    if (loc.planetType === "Приливная") {
        // Tidal volcanic vents
        ctx.fillStyle = "#ff4500";
        for (let i = 0; i < 4; i++) {
            const angle = seededRandom(loc, i) * Math.PI * 2;
            const dist = seededRandom(loc, i + 10) * radius * 0.5;
            ctx.beginPath();
            ctx.arc(
                x + Math.cos(angle) * dist,
                y + Math.sin(angle) * dist,
                2.5,
                0,
                Math.PI * 2,
            );
            ctx.fill();
        }
    }

    // Empty planet marker
    if (loc.isEmpty) {
        ctx.strokeStyle = "#666";
        ctx.lineWidth = 1;
        // Cross pattern
        ctx.beginPath();
        ctx.moveTo(x - 4, y - 4);
        ctx.lineTo(x + 4, y + 4);
        ctx.moveTo(x + 4, y - 4);
        ctx.lineTo(x - 4, y + 4);
        ctx.stroke();
    }

    ctx.globalAlpha = 1;
}

// Draw space station
function drawStation(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    completed: boolean,
) {
    if (completed) {
        ctx.globalAlpha = 0.4;
    }

    // Main body
    ctx.fillStyle = "#4a90a4";
    ctx.strokeStyle = "#7fc8dc";
    ctx.lineWidth = 2;

    // Central hub
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Solar panels
    ctx.fillStyle = "#2a5a6a";
    ctx.fillRect(x - 18, y - 3, 10, 6);
    ctx.fillRect(x + 8, y - 3, 10, 6);

    // Panel grid lines
    ctx.strokeStyle = "#4a90a4";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x - 18 + i * 3.5, y - 3);
        ctx.lineTo(x - 18 + i * 3.5, y + 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 8 + i * 3.5, y - 3);
        ctx.lineTo(x + 8 + i * 3.5, y + 3);
        ctx.stroke();
    }

    // Antenna
    ctx.strokeStyle = "#7fc8dc";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y - 6);
    ctx.lineTo(x, y - 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y - 13, 2, 0, Math.PI * 2);
    ctx.stroke();

    // Blinking light
    ctx.fillStyle = "#00ff88";
    ctx.beginPath();
    ctx.arc(x, y - 13, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
}

// Draw unknown object (when no scanner) - for anomalies, storms, etc.
// Hexagonal shape to distinguish from ship (which is arrow-shaped)
function drawUnknown(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    completed: boolean,
) {
    if (completed) {
        ctx.globalAlpha = 0.4;
    }

    // Mystery glow (purple tint for objects)
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 22);
    gradient.addColorStop(0, "rgba(80, 60, 100, 0.4)");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    // Hexagonal frame (mysterious object shape)
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
        const px = x + Math.cos(angle) * 14;
        const py = y + Math.sin(angle) * 14;
        if (i === 0) {
            ctx.moveTo(px, py);
        } else {
            ctx.lineTo(px, py);
        }
    }
    ctx.closePath();
    ctx.stroke();

    // Inner fill (dark)
    ctx.fillStyle = "#1a1a1a";
    ctx.fill();

    // Question mark in center
    ctx.font = "bold 14px Share Tech Mono";
    ctx.fillStyle = "#888";
    ctx.textAlign = "center";
    ctx.fillText("?", x, y + 5);

    ctx.globalAlpha = 1;
}

// Draw unknown ship (gray, ship-like shape) - for enemy/friendly without scanner
// Distinctly different from unknown object (which is a circle with ?)
function drawUnknownShip(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    completed: boolean,
) {
    if (completed) {
        ctx.globalAlpha = 0.4;
    }

    // Gray glow
    const grayGlow = ctx.createRadialGradient(x, y, 0, x, y, 25);
    grayGlow.addColorStop(0, "rgba(100, 100, 100, 0.3)");
    grayGlow.addColorStop(1, "transparent");
    ctx.fillStyle = grayGlow;
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();

    // Ship silhouette - distinct arrow/triangle shape pointing up
    ctx.fillStyle = "#444";
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 2;

    // Main hull - arrow shape
    ctx.beginPath();
    ctx.moveTo(x, y - 16); // Nose (top point)
    ctx.lineTo(x - 12, y + 8); // Left wing
    ctx.lineTo(x - 4, y + 4); // Left engine notch
    ctx.lineTo(x, y + 10); // Center rear
    ctx.lineTo(x + 4, y + 4); // Right engine notch
    ctx.lineTo(x + 12, y + 8); // Right wing
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cockpit window (dark)
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.moveTo(x, y - 8);
    ctx.lineTo(x - 4, y + 2);
    ctx.lineTo(x + 4, y + 2);
    ctx.closePath();
    ctx.fill();

    // Engine glow indicators (gray)
    ctx.fillStyle = "#666";
    ctx.beginPath();
    ctx.arc(x - 3, y + 7, 2, 0, Math.PI * 2);
    ctx.arc(x + 3, y + 7, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
}

// Draw enemy ship (always visible - scanner check done before calling)
function drawEnemy(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    loc: Location,
    completed: boolean,
) {
    if (completed) {
        ctx.globalAlpha = 0.3;
    }

    // Danger glow (red)
    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 25);
    glowGradient.addColorStop(0, "rgba(255, 0, 64, 0.3)");
    glowGradient.addColorStop(1, "transparent");
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();

    // Ship body (aggressive shape)
    ctx.fillStyle = "#8b0000";
    ctx.strokeStyle = "#ff4444";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(x, y - 15);
    ctx.lineTo(x - 12, y + 10);
    ctx.lineTo(x, y + 5);
    ctx.lineTo(x + 12, y + 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Weapon ports
    ctx.fillStyle = "#ff6600";
    ctx.beginPath();
    ctx.arc(x - 6, y + 3, 2, 0, Math.PI * 2);
    ctx.arc(x + 6, y + 3, 2, 0, Math.PI * 2);
    ctx.fill();

    // Engine glow
    ctx.fillStyle = "#ff4400";
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 10);
    ctx.lineTo(x, y + 16);
    ctx.lineTo(x + 5, y + 10);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 1;
}

// Draw anomaly
function drawAnomaly(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    loc: Location,
    completed: boolean,
) {
    if (completed) {
        ctx.globalAlpha = 0.3;
    }

    const color = loc.anomalyColor || "#00ff41";

    // Energy swirl
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x, y, 8 + i * 4, 0, Math.PI * 1.5);
        ctx.stroke();
    }

    // Central energy
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 10);
    gradient.addColorStop(0, "#fff");
    gradient.addColorStop(0.3, color);
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();

    // Question mark for mystery
    ctx.font = "bold 12px Share Tech Mono";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText("?", x, y + 5);

    ctx.globalAlpha = 1;
}

// Draw friendly ship (always visible - scanner check done before calling)
function drawFriendlyShip(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    completed: boolean,
) {
    if (completed) {
        ctx.globalAlpha = 0.4;
    }

    // Friendly glow (blue)
    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 25);
    glowGradient.addColorStop(0, "rgba(0, 180, 255, 0.3)");
    glowGradient.addColorStop(1, "transparent");
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();

    // Ship body
    ctx.fillStyle = "#2a6a8a";
    ctx.strokeStyle = "#4a9aba";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(x, y - 12);
    ctx.lineTo(x - 10, y + 8);
    ctx.lineTo(x, y + 4);
    ctx.lineTo(x + 10, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cockpit
    ctx.fillStyle = "#7fc8dc";
    ctx.beginPath();
    ctx.arc(x, y - 4, 3, 0, Math.PI * 2);
    ctx.fill();

    // Engine
    ctx.fillStyle = "#4a9aba";
    ctx.beginPath();
    ctx.arc(x, y + 6, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
}

// Draw asteroid belt
function drawAsteroidBelt(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    loc: Location,
    completed: boolean,
) {
    if (completed || loc.mined) {
        ctx.globalAlpha = 0.4;
    }

    const tier = loc.asteroidTier || 1;
    const color =
        tier === 1
            ? "#8b7355"
            : tier === 2
              ? "#a0522d"
              : tier === 3
                ? "#cd853f"
                : "#ffb000"; // tier 4 = gold
    const isAncient = tier === 4;

    // Ancient glow
    if (isAncient) {
        const ancientGlow = ctx.createRadialGradient(x, y, 0, x, y, 25);
        ancientGlow.addColorStop(0, "rgba(255, 170, 0, 0.3)");
        ancientGlow.addColorStop(1, "transparent");
        ctx.fillStyle = ancientGlow;
        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.fill();
    }

    // Dust cloud
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 18);
    gradient.addColorStop(0, color + "40");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();

    // Hash function for deterministic pseudo-random values
    const hash = (n: number): number => {
        const h = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
        return h - Math.floor(h);
    };

    // Use location ID to seed the hash for consistent asteroid positions
    const locId = loc.id || "unknown";
    let locHash = 0;
    for (let i = 0; i < locId.length; i++) {
        locHash = (locHash << 5) - locHash + locId.charCodeAt(i);
        locHash = locHash & locHash;
    }
    locHash = Math.abs(locHash);

    // Draw multiple small asteroids (deterministic positions and sizes)
    ctx.fillStyle = color;
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const dist = 6 + hash(locHash + i) * 4;
        const ax = x + Math.cos(angle) * dist;
        const ay = y + Math.sin(angle) * dist;
        const size = 2 + hash(locHash + i + 100) * 2;

        ctx.beginPath();
        ctx.moveTo(ax + size, ay);
        ctx.lineTo(ax, ay + size);
        ctx.lineTo(ax - size, ay);
        ctx.lineTo(ax, ay - size);
        ctx.closePath();
        ctx.fill();
    }

    // Center asteroid (larger)
    ctx.fillStyle = "#cd853f";
    ctx.beginPath();
    ctx.moveTo(x + 4, y);
    ctx.lineTo(x, y + 3);
    ctx.lineTo(x - 4, y);
    ctx.lineTo(x, y - 3);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 1;
}

// Draw storm
function drawStorm(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    loc: Location,
    completed: boolean,
) {
    if (completed) {
        ctx.globalAlpha = 0.4;
    }

    const stormType = loc.stormType || "radiation";

    let color: string;
    let icon: string;

    switch (stormType) {
        case "radiation":
            color = "#00ff00";
            icon = "☢";
            break;
        case "ionic":
            color = "#00d4ff";
            icon = "⚡";
            break;
        case "plasma":
            color = "#ff4400";
            icon = "🔥";
            break;
        default:
            color = "#00ff00";
            icon = "?";
    }

    // Storm cloud
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 20);
    gradient.addColorStop(0, color + "60");
    gradient.addColorStop(0.5, color + "30");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();

    // Swirl effect
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
        const radius = 8 + i * 4;
        ctx.beginPath();
        ctx.arc(x, y, radius, i * 0.5, Math.PI * 1.5 + i * 0.3);
        ctx.stroke();
    }

    // Storm icon
    ctx.font = "bold 14px Share Tech Mono";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText(icon, x, y + 5);

    ctx.globalAlpha = 1;
}

// Draw distress signal
function drawDistressSignal(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    loc: Location,
    completed: boolean,
) {
    if (completed || loc.signalResolved) {
        ctx.globalAlpha = 0.4;
    }

    // Pulsing beacon glow
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 25);
    gradient.addColorStop(0, "rgba(255, 170, 0, 0.5)");
    gradient.addColorStop(0.5, "rgba(255, 170, 0, 0.2)");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();

    // Signal waves
    ctx.strokeStyle = "#ffaa00";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
        const radius = 6 + i * 6;
        ctx.beginPath();
        ctx.arc(x, y, radius, -Math.PI * 0.3, Math.PI * 0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, radius, Math.PI * 0.7, Math.PI * 1.3);
        ctx.stroke();
    }

    // SOS text
    ctx.font = "bold 10px Share Tech Mono";
    ctx.fillStyle = "#ffaa00";
    ctx.textAlign = "center";
    ctx.fillText("SOS", x, y + 4);

    ctx.globalAlpha = 1;
}

// Draw Ancient Boss - Relict of lost civilization
function drawAncientBoss(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    loc: Location,
    completed: boolean,
) {
    if (completed || loc.bossDefeated) {
        ctx.globalAlpha = 0.4;
    }

    // Danger aura (purple for ancient)
    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 35);
    glowGradient.addColorStop(0, "rgba(255, 0, 255, 0.4)");
    glowGradient.addColorStop(0.5, "rgba(255, 0, 255, 0.2)");
    glowGradient.addColorStop(1, "transparent");
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(x, y, 35, 0, Math.PI * 2);
    ctx.fill();

    // Hexagonal frame (ancient tech)
    ctx.strokeStyle = "#ff00ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
        const px = x + Math.cos(angle) * 18;
        const py = y + Math.sin(angle) * 18;
        if (i === 0) {
            ctx.moveTo(px, py);
        } else {
            ctx.lineTo(px, py);
        }
    }
    ctx.closePath();
    ctx.stroke();

    // Central core
    const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, 12);
    coreGradient.addColorStop(0, "#fff");
    coreGradient.addColorStop(0.3, "#ff00ff");
    coreGradient.addColorStop(1, "#8800aa");
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();

    // Inner energy ring
    ctx.strokeStyle = "#ff88ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.stroke();

    // Boss skull/tech icon
    ctx.font = "bold 14px Share Tech Mono";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText("⚙", x, y + 5);

    ctx.globalAlpha = 1;
}
