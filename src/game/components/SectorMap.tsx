"use client";

import { useRef, useEffect, useState } from "react";
import { useGameStore } from "../store";
import { Location } from "../types";

// Planet colors based on type (inspired by solar system)
const PLANET_COLORS: Record<
    string,
    { base: string; atmosphere: string; rings?: string }
> = {
    Пустынная: { base: "#d4a574", atmosphere: "#e8c89e" }, // Mars-like
    Ледяная: { base: "#a8d4e6", atmosphere: "#d4e8f2" }, // Europa-like
    Лесная: { base: "#4a7c59", atmosphere: "#6b9b7a" }, // Earth-like green
    Вулканическая: { base: "#8b4513", atmosphere: "#ff4500" }, // Io-like
    Океаническая: { base: "#1e90ff", atmosphere: "#87ceeb" }, // Earth-like blue
    "Газовый гигант": { base: "#9933ff", atmosphere: "#cc66ff" }, // Purple gas giant
};

// Scanner info levels - scanLevel is now 1-4 (scanner level)
// scanRange is the numeric value (3, 5, 8, 15+)
function getScannerInfo(
    loc: Location,
    scanLevel: number,
    scanRange: number,
): string[] {
    const info: string[] = [];
    const completed = loc.mined || loc.bossDefeated || loc.signalResolved;

    if (scanLevel <= 0) {
        // No scanner - show basic info for certain objects
        if (loc.type === "station") {
            info.push(`🛰️ Станция`);
            return info;
        } else if (loc.type === "planet") {
            info.push(`🪐 Планета`);
            info.push(`🏷️ ${loc.planetType}`);
            return info;
        } else if (loc.type === "asteroid_belt") {
            info.push(`⛏️ Пояс астероидов`);
            info.push(`🏷️ ${loc.name}`);
            return info;
        } else if (loc.type === "distress_signal") {
            info.push(`🆘 Сигнал бедствия`);
            info.push(`🏷️ ${loc.name}`);
            return info;
        } else {
            // For other objects, show as unknown
            info.push(`❓ Неизвестный объект`);
            return info;
        }
    }

    // Get location tier to compare with scanner level
    const locTier = loc.threat || loc.anomalyTier || loc.stormIntensity || 1;
    const canScanFully = scanLevel >= locTier;

    // Show name only if scanner level is sufficient
    // Exception: don't show name for storms (name is shown in storm details)
    if (canScanFully || loc.type === "distress_signal") {
        if (loc.type !== "storm") {
            info.push(`📍 ${loc.name}`);
        }
    } else {
        info.push(`❓ Неизвестный объект`);
        return info;
    }

    // Storm info
    if (loc.type === "storm") {
        if (scanLevel < locTier) {
            info.push(`🌪️ Космический шторм`);
        } else {
            // Level 2+ scanner: detailed storm info
            const stormNames: Record<string, string> = {
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
    }

    // Asteroid info
    if (loc.type === "asteroid_belt") {
        const tier = loc.asteroidTier || 1;
        info.push(`⛏️ Уровень: ${tier}`);
        if (scanLevel >= 5 && loc.resources && !completed) {
            info.push(`📦 Минералы: ~${loc.resources.minerals}`);
            if (loc.resources.rare > 0)
                info.push(`💎 Редкие: ~${loc.resources.rare}`);
            info.push(`₢ ~${loc.resources.credits}₢`);
        }
    }

    // Enemy info
    if (loc.type === "enemy") {
        info.push(`⚔️ Угроза: ${loc.threat || 1}`);
    }

    // Anomaly info
    if (loc.type === "anomaly") {
        if (scanLevel >= 5) {
            const type =
                loc.anomalyType === "good" ? "✓ Благоприятная" : "⚠ Опасная";
            info.push(`🔮 ${type}`);
        }
        info.push(`🔬 Учёный: LV${loc.requiresScientistLevel || 1}`);
    }

    // Planet info
    if (loc.type === "planet") {
        if (loc.isEmpty) {
            info.push(`🏜️ Безлюдная`);
        } else {
            // With scanner level 1+, show race info
            if (scanLevel >= 1) {
                if (loc.dominantRace) {
                    // Convert race ID to readable name
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
                if (scanLevel >= 5) {
                    info.push(`👥 Население: ${loc.population || 0}k`);
                }
            }
        }
    }

    // Hidden rewards detection - chance based on scanRange
    // Base requirement: scanRange >= 8 for hidden rewards
    // Each point above 8 adds +5% detection chance
    if (scanRange >= 8) {
        const detectionChance = Math.min(100, 50 + (scanRange - 8) * 5);
        const detected = Math.random() * 100 < detectionChance;

        if (detected) {
            if (loc.type === "asteroid_belt" && loc.resources && !completed) {
                const tier = loc.asteroidTier || 1;
                if (tier === 4) info.push(`★ Древние артефакты!`);
            }
            if (loc.type === "storm" && !completed) {
                info.push(`★ Редкие ресурсы!`);
            }
            if (loc.type === "ancient_boss" && !loc.bossDefeated) {
                info.push(`★ Древний артефакт!`);
            }
        }
    }

    // Quantum scanner (scanRange 15+) - shows distress signal probabilities
    if (scanRange >= 15) {
        if (loc.type === "distress_signal" && !loc.signalResolved) {
            info.push(`⚡ Засада (40%) / Выжившие (30%) / Груз (30%)`);
        }
    }

    return info;
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
    const getScanLevel = useGameStore((s) => s.getScanLevel);
    const getScanRange = useGameStore((s) => s.getScanRange);

    const [hoveredLocation, setHoveredLocation] = useState<{
        loc: Location;
        x: number;
        y: number;
    } | null>(null);
    const scanLevel = getScanLevel();
    const scanRange = getScanRange();

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container || !currentSector) return;

        const rect = container.getBoundingClientRect();
        canvas.width = Math.max(rect.width, 500);
        canvas.height = Math.max(rect.width * 0.65, 350);

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(width, height) * 0.45;

        // Clear with space background
        ctx.fillStyle = "#050810";
        ctx.fillRect(0, 0, width, height);

        // Draw distant stars
        for (let i = 0; i < 150; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 1.5;
            const brightness = Math.random();
            ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + brightness * 0.7})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw central star
        const star = currentSector.star;
        drawStar(ctx, centerX, centerY, star);

        // Draw locations at grid-based positions
        const locations = currentSector.locations;

        locations.forEach((loc) => {
            // Use pre-computed distanceRatio and angle from location data
            const distanceRatio = loc.distanceRatio ?? 0.5;
            const distance = maxRadius * distanceRatio;
            const angle = loc.angle ?? 0;

            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            loc.x = x;
            loc.y = y;

            const completed = completedLocations.includes(loc.id);
            const hasScanner = scanLevel > 0;
            const isRevealed = loc.signalRevealed; // Location was approached and revealed

            if (loc.type === "station") {
                drawStation(ctx, x, y, completed);
            } else if (loc.type === "planet") {
                drawPlanet(ctx, x, y, loc, completed);
            } else if (loc.type === "enemy") {
                // Without scanner AND not revealed - show as unknown
                if (!hasScanner && !isRevealed) {
                    drawUnknownShip(ctx, x, y, completed);
                } else {
                    drawEnemy(ctx, x, y, loc, completed);
                }
            } else if (loc.type === "anomaly") {
                if (hasScanner || isRevealed) {
                    drawAnomaly(ctx, x, y, loc, completed);
                } else {
                    drawUnknown(ctx, x, y, completed);
                }
            } else if (loc.type === "friendly_ship") {
                // Without scanner AND not revealed - show as unknown
                if (!hasScanner && !isRevealed) {
                    drawUnknownShip(ctx, x, y, completed);
                } else {
                    drawFriendlyShip(ctx, x, y, completed);
                }
            } else if (loc.type === "asteroid_belt") {
                drawAsteroidBelt(ctx, x, y, loc, completed);
            } else if (loc.type === "storm") {
                if (hasScanner || isRevealed) {
                    drawStorm(ctx, x, y, loc, completed);
                } else {
                    drawUnknown(ctx, x, y, completed);
                }
            } else if (loc.type === "distress_signal") {
                // Distress signals are always visible (SOS beacon)
                drawDistressSignal(ctx, x, y, loc, completed);
            } else if (loc.type === "ancient_boss") {
                if (hasScanner || isRevealed) {
                    drawAncientBoss(ctx, x, y, loc, completed);
                } else {
                    drawUnknownShip(ctx, x, y, completed);
                }
            }

            // Draw label below the location
            // Without scanner, certain locations show as "Unknown object"
            // Distress signals are always visible (SOS beacon broadcasts location)
            const needsScanner = ["storm", "anomaly", "ancient_boss"].includes(
                loc.type,
            );
            const displayName =
                needsScanner && !hasScanner && !isRevealed && !completed
                    ? "❓ Неизвестный объект"
                    : loc.name;

            // Also hide enemy/friendly ship names without scanner and not revealed
            const isUnknownShip =
                ["enemy", "friendly_ship"].includes(loc.type) &&
                !hasScanner &&
                !isRevealed &&
                !completed;

            // Check for fully explored empty planet
            const isExploredEmptyPlanet =
                loc.type === "planet" && loc.isEmpty && loc.explored;

            const finalDisplayName = isUnknownShip
                ? "❓ Неизвестный корабль"
                : isExploredEmptyPlanet
                  ? `${loc.name} (✓)`
                  : displayName;

            ctx.font = "11px Share Tech Mono";
            ctx.textAlign = "center";
            ctx.fillStyle = completed
                ? "#888"
                : isExploredEmptyPlanet
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
    }, [currentSector, completedLocations, scanLevel]);

    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || !currentSector) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        // Check if clicked on central star (black hole)
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const distFromCenter = Math.sqrt(
            (clickX - centerX) ** 2 + (clickY - centerY) ** 2,
        );

        if (currentSector.star?.type === "blackhole" && distFromCenter < 40) {
            travelThroughBlackHole();
            return;
        }

        currentSector.locations.forEach((loc, idx) => {
            if (loc.x === undefined || loc.y === undefined) return;
            const dist = Math.sqrt(
                (clickX - loc.x) ** 2 + (clickY - loc.y) ** 2,
            );
            if (dist < 25) {
                selectLocation(idx);
            }
        });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || !currentSector) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        let found = false;
        currentSector.locations.forEach((loc) => {
            if (loc.x === undefined || loc.y === undefined) return;
            const dist = Math.sqrt(
                (mouseX - loc.x) ** 2 + (mouseY - loc.y) ** 2,
            );
            if (dist < 25) {
                // Convert canvas coordinates to screen coordinates for tooltip
                const screenX = e.clientX - rect.left;
                const screenY = e.clientY - rect.top;
                setHoveredLocation({ loc, x: screenX, y: screenY });
                found = true;
            }
        });

        if (!found) {
            setHoveredLocation(null);
        }
    };

    return (
        <div ref={containerRef} className="w-full relative">
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

            {/* Scanner level indicator */}
            {scanLevel > 0 && (
                <div className="absolute top-2 right-2 bg-[rgba(0,255,65,0.1)] border border-[#00ff41] px-2 py-1 text-xs text-[#00ff41] z-10">
                    📡 Сканер: LV
                    {scanLevel <= 3
                        ? 1
                        : scanLevel <= 8
                          ? 2
                          : scanLevel <= 15
                            ? 3
                            : 4}
                </div>
            )}

            <canvas
                ref={canvasRef}
                className="border-2 border-[#00ff41] bg-[#050810] cursor-pointer w-full h-auto"
                onClick={handleClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredLocation(null)}
            />

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
                        scanLevel,
                        scanRange,
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
    star: { type: string; name: string } | undefined,
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
        ctx.arc(x, y, 50, 0, Math.PI * 2);
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
        // Three stars
        for (let i = 0; i < 3; i++) {
            const angle = i * ((Math.PI * 2) / 3);
            const sx = x + Math.cos(angle) * 20;
            const sy = y + Math.sin(angle) * 20;

            // Glow
            const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, 20);
            gradient.addColorStop(0, "#fff");
            gradient.addColorStop(0.3, "#ffdd44");
            gradient.addColorStop(1, "transparent");
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(sx, sy, 20, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (star.type === "double") {
        // Binary stars
        for (const offset of [-15, 15]) {
            const gradient = ctx.createRadialGradient(
                x + offset,
                y,
                0,
                x + offset,
                y,
                25,
            );
            gradient.addColorStop(0, "#fff");
            gradient.addColorStop(0.3, offset < 0 ? "#ffaa00" : "#ff6600");
            gradient.addColorStop(1, "transparent");
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x + offset, y, 25, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        // Single yellow star (Sun-like)
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 35);
        gradient.addColorStop(0, "#fff");
        gradient.addColorStop(0.2, "#ffee88");
        gradient.addColorStop(0.5, "#ffcc00");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 35, 0, Math.PI * 2);
        ctx.fill();
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
    const colors = PLANET_COLORS[loc.planetType || ""] || {
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

    // Add rings for some planets (like Saturn)
    if (loc.planetType === "Ледяная" && !loc.isEmpty) {
        ctx.strokeStyle = colors.atmosphere + "80";
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
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius * 0.6;
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

    // Draw multiple small asteroids
    ctx.fillStyle = color;
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const dist = 6 + Math.random() * 4;
        const ax = x + Math.cos(angle) * dist;
        const ay = y + Math.sin(angle) * dist;
        const size = 2 + Math.random() * 2;

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
