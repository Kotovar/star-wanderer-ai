"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useGameStore } from "@/game/store";
import { useTranslation } from "@/lib/useTranslation";
import { getLocationName } from "@/lib/translationHelpers";
import {
    Location,
    LocationType,
    RaceId,
    StarType,
    StormType,
} from "@/game/types";
import { SHIP_LOCATION_TYPES } from "@/game/types/locations/locations";
import { PLANET_COLORS_IN_SECTOR } from "../constants";
import { getScannerRangeLabel } from "./DistressSignalPanel";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_SENSITIVITY = 0.001;
const DRAG_THRESHOLD = 5;
const NEEDS_SCANNER_LOCATIONS: LocationType[] = ["storm", "anomaly", "boss"];

/**
 * Возвращает цвет фона для сектора на основе типа звезды
 */
function getStarBackgroundColor(starType: StarType | undefined): string {
    switch (starType) {
        case "red_dwarf":
            return "#0a0810"; // Тёмный с красноватым оттенком
        case "yellow_dwarf":
            return "#0a0a08"; // Тёмный с желтоватым оттенком
        case "white_dwarf":
            return "#080a10"; // Тёмный с голубоватым оттенком
        case "blue_giant":
            return "#050818"; // Тёмный с синим оттенком
        case "red_supergiant":
            return "#0c0608"; // Тёмный с красно-оранжевым оттенком
        case "neutron_star":
            return "#080814"; // Тёмный с фиолетовым оттенком
        case "gas_giant":
            return "#050a08"; // Тёмный с зеленоватым оттенком
        case "double":
            return "#0a0908"; // Тёмный с оранжевым оттенком
        case "triple":
            return "#0c0808"; // Тёмный с красно-оранжевым оттенком
        case "blackhole":
            return "#0a0010"; // Тёмный с фиолетово-пурпурным оттенком
        default:
            return "#050810"; // Стандартный космический чёрный
    }
}

/**
 * Возвращает цвет свечения для фона на основе типа звезды
 */
function getStarGlowColor(starType: StarType | undefined): string {
    switch (starType) {
        case "red_dwarf":
            return "rgba(255, 100, 80, 0.03)";
        case "yellow_dwarf":
            return "rgba(255, 220, 150, 0.03)";
        case "white_dwarf":
            return "rgba(170, 220, 255, 0.03)";
        case "blue_giant":
            return "rgba(100, 150, 255, 0.04)";
        case "red_supergiant":
            return "rgba(255, 120, 80, 0.04)";
        case "neutron_star":
            return "rgba(150, 180, 255, 0.03)";
        case "gas_giant":
            return "rgba(0, 255, 120, 0.03)";
        case "double":
            return "rgba(255, 180, 100, 0.03)";
        case "triple":
            return "rgba(255, 150, 80, 0.04)";
        case "blackhole":
            return "rgba(200, 50, 200, 0.03)";
        default:
            return "transparent";
    }
}

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

// Helper to get translated planet type
function getPlanetTypeTranslation(
    planetType: string,
    t: (key: string) => string,
): string {
    const typeMap: Record<string, string> = {
        Пустынная: "desert",
        Ледяная: "ice",
        Лесная: "forest",
        Вулканическая: "volcanic",
        Океаническая: "oceanic",
        Тропическая: "tropical",
        Арктическая: "arctic",
        "Планета-кольцо": "ringed",
        Радиоактивная: "radioactive",
        "Разрушенная войной": "war_torn",
        Приливная: "tidal",
        Desert: "desert",
        Ice: "ice",
        Forest: "forest",
        Volcanic: "volcanic",
        Oceanic: "oceanic",
        Tropical: "tropical",
        Arctic: "arctic",
        "Ringed Planet": "ringed",
        Radioactive: "radioactive",
        "War-torn": "war_torn",
        Tidal: "tidal",
    };
    const key = typeMap[planetType];
    if (key) {
        const translated = t(`locations.planet_types.${key}`);
        if (translated !== `locations.planet_types.${key}`) {
            return translated;
        }
    }
    return planetType;
}

// Helper to get translated station type
function getStationTypeTranslation(
    stationType: string,
    t: (key: string) => string,
): string {
    const typeMap: Record<string, string> = {
        Торговая: "trade",
        Военная: "military",
        Добывающая: "mining",
        Исследовательская: "research",
        Медицинская: "medical",
        Промышленная: "industrial",
        Trade: "trade",
        Military: "military",
        Mining: "mining",
        Research: "research",
        Medical: "medical",
        Industrial: "industrial",
    };
    // First try direct key (e.g. "shipyard", "medical", "trade")
    const directTranslation = t(`locations.station_types.${stationType}`);
    if (directTranslation !== `locations.station_types.${stationType}`) {
        return directTranslation;
    }
    // Fall back to legacy name → key mapping
    const key = typeMap[stationType];
    if (key) {
        const translated = t(`locations.station_types.${key}`);
        if (translated !== `locations.station_types.${key}`) {
            return translated;
        }
    }
    return stationType;
}

// scanRange is the numeric value (3, 5, 8, 15+)
function getScannerInfo(
    loc: Location,
    scanRange: number,
    isRevealed: boolean = false,
    t: (key: string) => string,
): string[] {
    const info: string[] = [];
    const completed = loc.mined || loc.bossDefeated || loc.signalResolved;

    // Race name translations
    const raceNames: Record<RaceId, string> = {
        human: t("races.human.name"),
        synthetic: t("races.synthetic.name"),
        xenosymbiont: t("races.xenosymbiont.name"),
        krylorian: t("races.krylorian.name"),
        voidborn: t("races.voidborn.name"),
        crystalline: t("races.crystalline.name"),
    };

    // If location was revealed (e.g., approached without scanner), show full info
    if (isRevealed) {
        info.push(`📍 ${getLocationName(loc.name, t)}`);

        // Show type-specific info
        if (loc.type === "enemy") {
            info.push(`⚔️ ${t("locations.enemy_ship")}`);
            info.push(`${t("locations.threat")}: ${loc.threat ?? 1}`);
        } else if (loc.type === "friendly_ship") {
            info.push(`🤝 ${t("locations.friendly_ship")}`);
            if (loc.shipRace) {
                info.push(`🧬 ${raceNames[loc.shipRace] || loc.shipRace}`);
            }
        } else if (loc.type === "boss") {
            info.push(`⚠️ ${t("locations.ancient_ship")}`);
        } else if (loc.type === "storm") {
            info.push(`🌪️ ${t("locations.cosmic_storm")}`);
        } else if (loc.type === "anomaly") {
            if (scanRange >= 8) {
                const type =
                    loc.anomalyType === "good"
                        ? t("locations.anomaly_beneficial")
                        : t("locations.anomaly_dangerous");
                info.push(`🔮 ${type}`);
            } else {
                info.push(`🔮 ${t("locations.anomaly_unknown")}`);
            }
        } else if (loc.type === "planet") {
            info.push(`🪐 ${t("locations.planet")}`);
            info.push(
                `🏷️ ${loc.planetType ? getPlanetTypeTranslation(loc.planetType, t) : t("locations.unknown")}`,
            );
            if (loc.isEmpty) {
                info.push(`🏜️ ${t("locations.deserted")}`);
            } else if (loc.dominantRace) {
                const raceName =
                    raceNames[loc.dominantRace as RaceId] || loc.dominantRace;
                info.push(`🧬 ${raceName}`);
            }
        } else if (loc.type === "station") {
            if (loc.stationType) {
                info.push(
                    `🏷️ ${getStationTypeTranslation(loc.stationType, t)}`,
                );
            }
        } else if (loc.type === "asteroid_belt") {
            info.push(`⛏️ ${t("locations.asteroid_belt")}`);
            info.push(`🏷️ ${t("locations.tier")}: ${loc.asteroidTier || 1}`);
        } else if (loc.type === "gas_giant") {
            info.push(`🪸 ${t("locations.gas_giant")}`);
        } else if (loc.type === "wreck_field") {
            const tier = loc.wreckTier ?? 1;
            info.push(`💀 Поле обломков (тир ${tier})`);
            info.push(`☢ Радиационный фон`);
        }

        return info;
    }

    // Stations, planets, asteroid belts, and distress signals are always visible
    if (loc.type === "station") {
        info.push(`📍 ${getLocationName(loc.name, t)}`);
        // Show station type with scanRange >= 3
        if (scanRange >= 3 && loc.stationType) {
            info.push(`🏷️ ${getStationTypeTranslation(loc.stationType, t)}`);
        }
        return info;
    }

    // For other objects, check if scanner can detect them
    const locTier = loc.threat || loc.anomalyTier || 1;
    const canDetect = canDetectObject(loc.type, scanRange, locTier);

    if (!canDetect) {
        // No scanner detection - show as unknown
        // Ships (enemy, friendly, boss, derelict) show as "Unknown ship" because they use ship icon
        if (SHIP_LOCATION_TYPES.includes(loc.type)) {
            info.push(`❓ ${t("locations.unknown_ship")}`);
        } else if (loc.type === "planet") {
            info.push(`🌏 ${t("locations.planet")}`);
        } else if (loc.type === "asteroid_belt") {
            info.push(`🪨 ${t("locations.asteroid_belt")}`);
        } else if (loc.type === "gas_giant") {
            info.push(`🪸 ${t("locations.gas_giant")}`);
        } else if (loc.type === "wreck_field") {
            info.push(`💀 Поле обломков`);
        } else {
            info.push(`❓ ${t("locations.unknown_object")}`);
        }
        return info;
    }

    if (loc.type === "planet") {
        info.push(`📍 ${getLocationName(loc.name, t)}`);
        // Planet type requires scanRange >= 3 to detect
        if (scanRange >= 3 && loc.planetType) {
            info.push(`🏷️ ${getPlanetTypeTranslation(loc.planetType, t)}`);
        }
        // Planet details (empty or colonized) requires scanRange >= 5
        if (scanRange >= 5) {
            if (loc.isEmpty) {
                info.push(`🏜️ ${t("locations.deserted")}`);
            } else if (loc.dominantRace) {
                const raceName =
                    raceNames[loc.dominantRace] || loc.dominantRace;
                info.push(`🧬 ${raceName}`);
                // Population amount requires scanRange >= 8
                if (scanRange >= 8 && loc.population) {
                    info.push(
                        `👥 ${t("locations.population")}: ${loc.population}k`,
                    );
                }
            }
        }
        return info;
    }
    if (loc.type === "asteroid_belt") {
        info.push(`📍 ${getLocationName(loc.name, t)}`);
        // Always show asteroid tier with any scanner detection
        info.push(`🏷️ ${t("locations.tier")}: ${loc.asteroidTier || 1}`);
        if (scanRange >= 15 && loc.resources && !completed) {
            info.push(
                `📦 ${t("locations.minerals")}: ~${loc.resources.minerals}`,
            );
            if (loc.resources.rare > 0)
                info.push(`💎 ${t("locations.rare")}: ~${loc.resources.rare}`);
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
    if (loc.type === "derelict_ship") {
        info.push(`🛸 ${t("locations.derelict_ship")}`);
        if (loc.derelictExplored) {
            info.push(`✓ Исследовано`);
        } else {
            info.push(`📐 Возможен чертёж модуля`);
        }
        return info;
    }
    if (loc.type === "gas_giant") {
        info.push(`🪸 ${getLocationName(loc.name, t)}`);
        if (loc.gasGiantLastDiveAt !== undefined) {
            info.push(`✓ ${t("locations.gas_giant")}`);
        } else {
            info.push(`🔬 ${t("gas_giant.start_dive")}`);
        }
        return info;
    }
    if (loc.type === "wreck_field") {
        info.push(`💀 ${getLocationName(loc.name, t)}`);
        const tier = loc.wreckTier ?? 1;
        info.push(`🏷️ Тир: ${tier}`);
        if (loc.wreckExhausted) {
            info.push(`✓ Обыскано`);
        } else {
            const done = loc.wreckPassesDone ?? 0;
            const total = loc.wreckPassesTotal ?? 2;
            info.push(`🔩 Проходов: ${done}/${total}`);
            info.push(`☢ Радиационный фон`);
        }
        return info;
    }
    if (loc.type === "distress_signal") {
        info.push(`🆘 ${t("locations.distress_signal")}`);
        // Show specific type if revealed by scanner or after interaction
        if (loc.signalType && loc.signalRevealed) {
            if (loc.signalType === "pirate_ambush") {
                info.push(`⚔️ ${t("locations.pirate_ambush")}`);
            } else if (loc.signalType === "survivors") {
                info.push(`👥 ${t("locations.survivors")}`);
            } else if (loc.signalType === "abandoned_cargo") {
                info.push(`📦 ${t("locations.abandoned_cargo")}`);
            }
        } else if (scanRange >= 15 && !loc.signalResolved) {
            // Quantum scanner shows probabilities if type not yet revealed
            info.push(
                `⚡ ${t("locations.ambush_prob")} (35%) / ${t("locations.survivors_prob")} (30%) / ${t("locations.cargo_prob")} (35%)`,
            );
        }
        return info;
    }

    // Show name for scanned objects (except storms)
    if (loc.type !== "storm") {
        info.push(`📍 ${getLocationName(loc.name, t)}`);
    }

    // Storm info
    if (loc.type === "storm") {
        if (scanRange < 5) {
            info.push(`🌪️ ${t("locations.cosmic_storm")}`);
        } else {
            // scanRange >= 5: detailed storm info
            const stormNames: Record<StormType, string> = {
                radiation: t("locations.radiation_cloud"),
                ionic: t("locations.ionic_storm"),
                plasma: t("locations.plasma_storm"),
                gravitational: t("locations.gravitational_storm"),
                temporal: t("locations.temporal_storm"),
                nanite: t("locations.nanite_storm"),
            };
            const intensity = loc.stormIntensity || 1;
            info.push(
                `🌪️ ${loc.stormType ? stormNames[loc.stormType] : t("locations.cosmic_storm")}`,
            );
            info.push(`⚡ ${t("locations.intensity")}: ${intensity}`);

            // Show possible effects based on storm type
            switch (loc.stormType) {
                case "radiation":
                    info.push(
                        `☢️ ${t("locations.crew_damage")}: ~${25 * intensity}% HP`,
                    );
                    break;
                case "ionic":
                    info.push(`⚡ ${t("locations.shield_strip")}: 100%`);
                    break;
                case "plasma":
                    info.push(
                        `🔥 ${t("locations.shield_module_damage")}: ~${25 * intensity}%`,
                    );
                    break;
                case "gravitational":
                    info.push(
                        `🕳️ ${t("locations.module_damage")}: ~${20 * intensity}%`,
                    );
                    break;
                case "temporal":
                    info.push(
                        `⏳ ${t("locations.crew_damage")}: ~${15 * intensity}% + EXP reset`,
                    );
                    break;
                case "nanite":
                    info.push(`🦠 ${t("locations.modules_disabled")} + damage`);
                    break;
                default:
                    info.push(
                        `⚠️ ${t("locations.complex_damage")}: ~${20 * intensity}%`,
                    );
            }

            // Show loot multiplier
            const lootMult =
                loc.stormType === "radiation"
                    ? 2
                    : loc.stormType === "ionic" ||
                        loc.stormType === "gravitational" ||
                        loc.stormType === "temporal"
                      ? 2.5
                      : loc.stormType === "plasma"
                        ? 3
                        : 2;
            info.push(`💰 ${t("locations.loot")}: x${lootMult}`);
        }
        // Hidden rewards for storms
        if (scanRange >= 8 && !completed) {
            const detectionChance = Math.min(100, 50 + (scanRange - 8) * 5);
            if (Math.random() * 100 < detectionChance) {
                info.push(t("locations.rare_resources"));
            }
        }
    }

    // Enemy info
    if (loc.type === "enemy") {
        info.push(`⚔️ ${t("locations.threat")}: ${loc.threat || 1}`);
    }

    // Anomaly info
    if (loc.type === "anomaly") {
        if (scanRange >= 8) {
            const type =
                loc.anomalyType === "good"
                    ? t("locations.anomaly_beneficial")
                    : t("locations.anomaly_dangerous");
            info.push(`🔮 ${type}`);
        } else {
            info.push(`🔮 ${t("locations.anomaly_unknown")}`);
        }
        info.push(
            `${t("locations.scientist_required")}: LV${loc.requiresScientistLevel || 1}`,
        );
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
        case "derelict_ship":
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
    const hasTelepathy = useGameStore((s) =>
        s.crew.some((c) => c.traits?.some((t) => t.effect?.seeHostility)),
    );
    const animationsEnabled = useGameStore((s) => s.settings.animationsEnabled);
    const setAnimationsEnabled = useGameStore((s) => s.setAnimationsEnabled);
    const { t } = useTranslation();

    const [hoveredLocation, setHoveredLocation] = useState<{
        loc: Location;
        x: number;
        y: number;
    } | null>(null);

    const [starInfoOpen, setStarInfoOpen] = useState(false);

    // Zoom and pan state - use store for persistence
    const sectorZoom = useGameStore((s) => s.sectorZoom);
    const sectorOffset = useGameStore((s) => s.sectorOffset);
    const setZoomState = useGameStore((s) => s.setSectorZoom);
    const setOffsetState = useGameStore((s) => s.setSectorOffset);
    const [zoom, setZoom] = useState(sectorZoom);
    const [offset, setOffset] = useState(sectorOffset);
    const [targetZoom, setTargetZoom] = useState<number | null>(null);
    const zoomAnimationRef = useRef<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const isDraggingRef = useRef(false); // Ref for sync access in animation loop
    const dragStartRef = useRef({ x: 0, y: 0 });
    const offsetStartRef = useRef({ x: 0, y: 0 });
    const offsetRef = useRef({ x: 0, y: 0 }); // Ref for smooth dragging without re-renders
    const hasMovedRef = useRef(false);
    const animationFrameRef = useRef<number | null>(null);
    const dragStartTimeRef = useRef<number>(0); // Store animation time when drag starts

    // Cache stars to prevent flickering (stored in normalized 0-1 coordinates)
    const starsRef = useRef<Array<{
        nx: number; // normalized x (0-1)
        ny: number; // normalized y (0-1)
        size: number;
        brightness: number;
        twinkleSpeed: number;
        twinkleOffset: number;
    }> | null>(null);

    // Off-screen canvas for static background (stars)
    const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);

    // Store canvas size to detect actual resize
    const canvasSizeRef = useRef<{
        width: number;
        height: number;
        starType?: StarType;
    }>({ width: 0, height: 0 });

    // Animation state for space effects
    const animationStateRef = useRef<{
        meteors: Array<{
            x: number;
            y: number;
            vx: number;
            vy: number;
            length: number;
            brightness: number;
            active: boolean;
        }>;
        particles: Array<{
            nx: number; // normalized x (0-1)
            ny: number; // normalized y (0-1)
            size: number;
            vx: number;
            vy: number;
            brightness: number;
            color: string;
        }>;
        time: number;
    }>({
        meteors: [],
        particles: [],
        time: 0,
    });

    // Animation frame ID
    const animationFrameIdRef = useRef<number | null>(null);

    // Ref for animation canvas
    const animCanvasRef = useRef<HTMLCanvasElement | null>(null);

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

        // Apply transform for zoom and pan (use ref for sync access during drag)
        const currentOffset = isDraggingRef.current
            ? offsetRef.current
            : offset;
        ctx.save();
        ctx.translate(centerX + currentOffset.x, centerY + currentOffset.y);
        ctx.scale(zoom, zoom);
        ctx.translate(-centerX, -centerY);

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
                drawStation(ctx, x, y, loc, completed);
            } else if (loc.type === "planet") {
                drawPlanet(ctx, x, y, loc, completed);
            } else if (loc.type === "enemy") {
                // Without scanner AND not revealed - show as unknown (unless telepathy)
                if (!canScan && !isRevealed && !hasTelepathy) {
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
                // Without scanner AND not revealed - show as unknown (unless telepathy)
                if (!canScan && !isRevealed && !hasTelepathy) {
                    drawUnknownShip(ctx, x, y, completed);
                } else {
                    drawFriendlyShip(ctx, x, y, loc, completed);
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
                drawDistressSignal(
                    ctx,
                    x,
                    y,
                    loc,
                    completed,
                    animationStateRef.current.time,
                );
            } else if (loc.type === "derelict_ship") {
                if (!canScan && !isRevealed && !hasTelepathy) {
                    drawUnknownShip(ctx, x, y, completed);
                } else {
                    drawDerelictShip(ctx, x, y, loc, completed);
                }
            } else if (loc.type === "gas_giant") {
                drawGasGiant(ctx, x, y, loc, completed);
            } else if (loc.type === "wreck_field") {
                drawWreckField(ctx, x, y, loc, completed);
            } else if (loc.type === "boss") {
                if (canScan || isRevealed || hasTelepathy) {
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
                loc.type === "boss" &&
                !canScan &&
                !isRevealed &&
                !completed &&
                !hasTelepathy;

            const displayName = isUnknownBoss
                ? t("sector_map.unknown_ship")
                : needsScanner && !canScan && !isRevealed && !completed
                  ? t("sector_map.unknown_object")
                  : getLocationName(loc.name, t);

            // Also hide enemy/friendly/derelict ship names without scanner and not revealed (unless telepathy)
            const isUnknownShip =
                ["enemy", "friendly_ship", "derelict_ship"].includes(loc.type) &&
                !canScan &&
                !isRevealed &&
                !completed &&
                !hasTelepathy;

            // Check for fully explored empty planet
            const isExploredEmptyPlanet =
                loc.type === "planet" && loc.isEmpty && loc.explored;

            // Check for visited colonized planet (opened planet panel at least once)
            const isVisitedColonizedPlanet =
                loc.type === "planet" && !loc.isEmpty && loc.visited;

            // Check for visited station (opened station panel at least once)
            const isVisitedStation = loc.type === "station" && loc.visited;

            // Check for dived gas planet
            const isDivedGasPlanet =
                loc.type === "gas_giant" &&
                loc.gasGiantLastDiveAt !== undefined;

            const translatedName = getLocationName(loc.name, t);
            const finalDisplayName = isUnknownShip
                ? t("sector_map.unknown_ship")
                : isExploredEmptyPlanet
                  ? `${translatedName} ${t("sector_map.explored")}`
                  : isVisitedColonizedPlanet ||
                      isVisitedStation ||
                      isDivedGasPlanet
                    ? `${translatedName} ${t("sector_map.visited")}`
                    : displayName;

            ctx.font = "11px Share Tech Mono";
            ctx.textAlign = "center";
            ctx.fillStyle = completed
                ? "#888"
                : isExploredEmptyPlanet ||
                    isVisitedColonizedPlanet ||
                    isVisitedStation ||
                    isDivedGasPlanet
                  ? "#00ff41"
                  : loc.type === "planet" && !loc.isEmpty
                    ? "#ffb000"
                    : loc.type === "gas_giant"
                      ? "#cc88ff"
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
        canScanObject,
        completedLocations,
        currentSector,
        hasTelepathy,
        offset,
        t,
        zoom,
    ]);

    // Initialize canvas and background
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        const animCanvas = animCanvasRef.current;
        if (!canvas || !container || !animCanvas || !currentSector) return;

        const rect = container.getBoundingClientRect();
        const newWidth = Math.round(Math.max(rect.width, 500));
        // Mobile: use aspect ratio for compact display
        // Desktop: use square canvas to prevent circle distortion
        const isMobile = rect.width < 768;
        const newHeight = isMobile
            ? Math.round(Math.max(rect.width * 0.65, 350))
            : newWidth;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Setup animation canvas
        animCanvas.width = newWidth;
        animCanvas.height = newHeight;
        const animCtx = animCanvas.getContext("2d");
        if (!animCtx) return;

        // Regenerate background if canvas size changed OR star type changed
        const sizeChanged =
            canvasSizeRef.current.width !== newWidth ||
            canvasSizeRef.current.height !== newHeight;

        const starTypeChanged =
            canvasSizeRef.current.starType !== currentSector.star?.type;

        if (sizeChanged || starTypeChanged) {
            canvas.width = newWidth;
            canvas.height = newHeight;
            canvasSizeRef.current = {
                width: newWidth,
                height: newHeight,
                starType: currentSector.star?.type,
            };

            // Create off-screen background canvas
            const bgCanvas = document.createElement("canvas");
            bgCanvas.width = newWidth;
            bgCanvas.height = newHeight;
            const bgCtx = bgCanvas.getContext("2d");

            if (bgCtx) {
                // Clear with space background - color depends on star type
                const bgColor = getStarBackgroundColor(
                    currentSector.star?.type,
                );
                bgCtx.fillStyle = bgColor;
                bgCtx.fillRect(0, 0, newWidth, newHeight);

                // Add subtle glow from the star
                const glowColor = getStarGlowColor(currentSector.star?.type);
                if (glowColor !== "transparent") {
                    const centerX = newWidth / 2;
                    const centerY = newHeight / 2;
                    const maxRadius = Math.max(newWidth, newHeight) * 0.7;

                    const glowGradient = bgCtx.createRadialGradient(
                        centerX,
                        centerY,
                        0,
                        centerX,
                        centerY,
                        maxRadius,
                    );
                    glowGradient.addColorStop(0, glowColor);
                    glowGradient.addColorStop(
                        0.5,
                        glowColor
                            .replace("0.03", "0.015")
                            .replace("0.04", "0.02"),
                    );
                    glowGradient.addColorStop(1, "transparent");
                    bgCtx.fillStyle = glowGradient;
                    bgCtx.fillRect(0, 0, newWidth, newHeight);
                }

                // Generate stars once in normalized coordinates (0-1)
                // Only generate if not already cached
                if (!starsRef.current) {
                    const stars: Array<{
                        nx: number;
                        ny: number;
                        size: number;
                        brightness: number;
                        twinkleSpeed: number;
                        twinkleOffset: number;
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
                            twinkleSpeed: 0.5 + hash(i + 4000) * 2,
                            twinkleOffset: hash(i + 5000) * Math.PI * 2,
                        });
                    }
                    starsRef.current = stars;
                }

                // Initialize animation effects
                const animState = animationStateRef.current;
                animState.time = 0;

                // Initialize meteors
                if (animState.meteors.length === 0) {
                    animState.meteors = Array.from({ length: 3 }, () => ({
                        x: Math.random() * newWidth,
                        y: Math.random() * newHeight,
                        vx: (Math.random() - 0.3) * 3,
                        vy: (Math.random() - 0.3) * 3,
                        length: 20 + Math.random() * 40,
                        brightness: 0.3 + Math.random() * 0.5,
                        active: Math.random() > 0.5,
                    }));
                }

                // Initialize particles (cosmic dust)
                if (animState.particles.length === 0) {
                    const particleColors = [
                        "rgba(100, 150, 255, 0.4)",
                        "rgba(150, 100, 255, 0.3)",
                        "rgba(100, 255, 150, 0.3)",
                        "rgba(255, 150, 100, 0.3)",
                    ];
                    animState.particles = Array.from({ length: 20 }, () => ({
                        nx: Math.random(),
                        ny: Math.random(),
                        size: 0.5 + Math.random() * 1.5,
                        vx: (Math.random() - 0.5) * 0.0005,
                        vy: (Math.random() - 0.5) * 0.0005,
                        brightness: 0.3 + Math.random() * 0.5,
                        color: particleColors[
                            Math.floor(Math.random() * particleColors.length)
                        ],
                    }));
                }

                // Draw stars using normalized coordinates scaled to current canvas size
                // Only draw base stars (no twinkle on background - that's animated on main canvas)
                starsRef.current.forEach((star) => {
                    const x = star.nx * newWidth;
                    const y = star.ny * newHeight;
                    // Use reduced brightness for background (twinkle happens on main canvas)
                    bgCtx.fillStyle = `rgba(255, 255, 255, ${0.2 + star.brightness * 0.4})`;
                    bgCtx.beginPath();
                    bgCtx.arc(x, y, star.size, 0, Math.PI * 2);
                    bgCtx.fill();
                });
            }

            bgCanvasRef.current = bgCanvas;
        }

        // Initial draw
        drawCanvas();

        // Start animation loop
        const animate = () => {
            const animState = animationStateRef.current;
            animState.time += 16; // ~16ms per frame

            // Update and draw animations only if enabled
            if (animationsEnabled) {
                // Update meteors
                animState.meteors.forEach((meteor) => {
                    if (!meteor.active) {
                        // Randomly activate meteor
                        if (Math.random() < 0.005) {
                            meteor.active = true;
                            meteor.x =
                                Math.random() > 0.5 ? -50 : newWidth + 50;
                            meteor.y = Math.random() * newHeight;
                            meteor.vx =
                                (Math.random() > 0.5 ? 1 : -1) *
                                (2 + Math.random() * 3);
                            meteor.vy = (Math.random() - 0.3) * 2;
                        }
                    } else {
                        meteor.x += meteor.vx;
                        meteor.y += meteor.vy;

                        // Deactivate if off screen
                        if (
                            meteor.x < -100 ||
                            meteor.x > newWidth + 100 ||
                            meteor.y < -100 ||
                            meteor.y > newHeight + 100
                        ) {
                            meteor.active = false;
                        }
                    }
                });

                // Update particles
                animState.particles.forEach((particle) => {
                    particle.nx += particle.vx;
                    particle.ny += particle.vy;

                    // Wrap around
                    if (particle.nx < 0) particle.nx = 1;
                    if (particle.nx > 1) particle.nx = 0;
                    if (particle.ny < 0) particle.ny = 1;
                    if (particle.ny > 1) particle.ny = 0;
                });

                // Draw animations on separate canvas
                if (animCtx && starsRef.current) {
                    animCtx.clearRect(0, 0, newWidth, newHeight);
                    drawMeteors(animCtx, animState);
                    drawParticles(animCtx, animState, newWidth, newHeight);
                    // Skip twinkling stars during drag to prevent flickering
                    if (!isDraggingRef.current) {
                        drawTwinklingStars(
                            animCtx,
                            starsRef.current,
                            animState.time,
                            newWidth,
                            newHeight,
                        );
                    }
                }
            } else {
                // Clear animation canvas when animations are disabled
                if (animCtx) {
                    animCtx.clearRect(0, 0, newWidth, newHeight);
                }
            }

            // Draw main canvas
            drawCanvas();

            // Draw animated star on top (after bgCanvas is drawn)
            const mainCanvas = canvasRef.current;
            if (mainCanvas && currentSector) {
                const mainCtx = mainCanvas.getContext("2d");
                if (mainCtx) {
                    const width = mainCanvas.width;
                    const height = mainCanvas.height;
                    const centerX = width / 2;
                    const centerY = height / 2;

                    const star = currentSector.star;
                    const currentAnimState = animationStateRef.current;

                    // Save context state
                    mainCtx.save();
                    // Apply the same transforms as in drawCanvas
                    const currentOffset = isDraggingRef.current
                        ? offsetRef.current
                        : offset;
                    mainCtx.translate(
                        centerX + currentOffset.x,
                        centerY + currentOffset.y,
                    );
                    mainCtx.scale(zoom, zoom);
                    mainCtx.translate(-centerX, -centerY);

                    // During drag, freeze animation at the time when drag started
                    const time = isDraggingRef.current
                        ? dragStartTimeRef.current
                        : currentAnimState.time;

                    // Redraw star with current time (or frozen during drag)
                    drawStar(
                        mainCtx,
                        centerX,
                        centerY,
                        star,
                        currentSector.id,
                        time,
                    );

                    // Restore context state
                    mainCtx.restore();
                }
            }

            animationFrameIdRef.current = requestAnimationFrame(animate);
        };

        animationFrameIdRef.current = requestAnimationFrame(animate);

        // Cleanup
        return () => {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
        };
    }, [animationsEnabled, currentSector, drawCanvas, offset, zoom]);

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
            isDraggingRef.current = true;
            hasMovedRef.current = false;
            dragStartRef.current = { x: e.clientX, y: e.clientY };
            offsetStartRef.current = { ...offset };
            // Store current animation time to freeze star animation during drag
            dragStartTimeRef.current = animationStateRef.current.time;
        },
        [offset],
    );

    // Handle mouse move for dragging and tooltip
    const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            // Handle dragging with direct canvas rendering (no React state updates)
            if (isDraggingRef.current) {
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

                // Trigger a single frame render using the main animate function
                // The main loop will handle star rendering with frozen time
                animationFrameRef.current = requestAnimationFrame(() => {
                    const animState = animationStateRef.current;
                    animState.time += 16;

                    // Clear animation canvas
                    const animCanvas = animCanvasRef.current;
                    if (animCanvas) {
                        const animCtx = animCanvas.getContext("2d");
                        if (
                            animCtx &&
                            animationsEnabled &&
                            !isDraggingRef.current
                        ) {
                            animCtx.clearRect(
                                0,
                                0,
                                animCanvas.width,
                                animCanvas.height,
                            );
                            drawMeteors(animCtx, animState);
                            drawParticles(
                                animCtx,
                                animState,
                                animCanvas.width,
                                animCanvas.height,
                            );
                            if (starsRef.current) {
                                drawTwinklingStars(
                                    animCtx,
                                    starsRef.current,
                                    animState.time,
                                    animCanvas.width,
                                    animCanvas.height,
                                );
                            }
                        } else if (animCtx) {
                            animCtx.clearRect(
                                0,
                                0,
                                animCanvas.width,
                                animCanvas.height,
                            );
                        }
                    }

                    // Draw main canvas
                    drawCanvas();

                    // Draw the central star (frozen during drag)
                    const mainCanvas = canvasRef.current;
                    if (mainCanvas && currentSector) {
                        const mainCtx = mainCanvas.getContext("2d");
                        if (mainCtx) {
                            const width = mainCanvas.width;
                            const height = mainCanvas.height;
                            const centerX = width / 2;
                            const centerY = height / 2;
                            const star = currentSector.star;

                            // Save context state
                            mainCtx.save();
                            const currentOffset = offsetRef.current;
                            mainCtx.translate(
                                centerX + currentOffset.x,
                                centerY + currentOffset.y,
                            );
                            mainCtx.scale(zoom, zoom);
                            mainCtx.translate(-centerX, -centerY);

                            // Use frozen time during drag
                            const time = dragStartTimeRef.current;

                            drawStar(
                                mainCtx,
                                centerX,
                                centerY,
                                star,
                                currentSector.id,
                                time,
                            );

                            mainCtx.restore();
                        }
                    }

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
            const currentOffset = isDraggingRef.current
                ? offsetRef.current
                : offset;
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
        [animationsEnabled, currentSector, drawCanvas, offset, zoom],
    );

    // Handle mouse up to stop dragging
    const handleMouseUp = useCallback(() => {
        if (isDraggingRef.current) {
            // Sync offset ref with React state when drag ends
            const finalOffset = { ...offsetRef.current };
            setOffset(finalOffset);
            setOffsetState(finalOffset);
        }
        setIsDragging(false);
        isDraggingRef.current = false;
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    }, [setOffsetState]);

    // Handle mouse leave to stop dragging
    const handleMouseLeave = useCallback(() => {
        if (isDraggingRef.current) {
            const finalOffset = { ...offsetRef.current };
            setOffset(finalOffset);
            setOffsetState(finalOffset);
        }
        setIsDragging(false);
        isDraggingRef.current = false;
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    }, [setOffsetState]);

    // Touch handlers for mobile
    const handleTouchStart = useCallback(
        (e: React.TouchEvent<HTMLCanvasElement>) => {
            const touch = e.touches[0];
            setIsDragging(true);
            isDraggingRef.current = true;
            hasMovedRef.current = false;
            dragStartRef.current = { x: touch.clientX, y: touch.clientY };
            offsetStartRef.current = { ...offsetRef.current };
            dragStartTimeRef.current = animationStateRef.current.time;
        },
        [],
    );

    const handleTouchMove = useCallback(
        (e: React.TouchEvent<HTMLCanvasElement>) => {
            if (!isDraggingRef.current) return;

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
                const animState = animationStateRef.current;
                animState.time += 16;

                // Clear animation canvas
                const animCanvas = animCanvasRef.current;
                if (animCanvas) {
                    const animCtx = animCanvas.getContext("2d");
                    if (
                        animCtx &&
                        animationsEnabled &&
                        !isDraggingRef.current
                    ) {
                        animCtx.clearRect(
                            0,
                            0,
                            animCanvas.width,
                            animCanvas.height,
                        );
                        drawMeteors(animCtx, animState);
                        drawParticles(
                            animCtx,
                            animState,
                            animCanvas.width,
                            animCanvas.height,
                        );
                        if (starsRef.current) {
                            drawTwinklingStars(
                                animCtx,
                                starsRef.current,
                                animState.time,
                                animCanvas.width,
                                animCanvas.height,
                            );
                        }
                    } else if (animCtx) {
                        animCtx.clearRect(
                            0,
                            0,
                            animCanvas.width,
                            animCanvas.height,
                        );
                    }
                }

                // Draw main canvas
                drawCanvas();

                // Draw the central star (frozen during drag)
                const mainCanvas = canvasRef.current;
                if (mainCanvas && currentSector) {
                    const mainCtx = mainCanvas.getContext("2d");
                    if (mainCtx) {
                        const width = mainCanvas.width;
                        const height = mainCanvas.height;
                        const centerX = width / 2;
                        const centerY = height / 2;
                        const star = currentSector.star;

                        mainCtx.save();
                        const currentOffset = offsetRef.current;
                        mainCtx.translate(
                            centerX + currentOffset.x,
                            centerY + currentOffset.y,
                        );
                        mainCtx.scale(zoom, zoom);
                        mainCtx.translate(-centerX, -centerY);

                        const time = dragStartTimeRef.current;

                        drawStar(
                            mainCtx,
                            centerX,
                            centerY,
                            star,
                            currentSector.id,
                            time,
                        );

                        mainCtx.restore();
                    }
                }
            });
        },
        [animationsEnabled, drawCanvas, currentSector, zoom],
    );

    const handleTouchEnd = useCallback(() => {
        if (isDraggingRef.current) {
            const finalOffset = { ...offsetRef.current };
            setOffset(finalOffset);
            setOffsetState(finalOffset);
        }
        setIsDragging(false);
        isDraggingRef.current = false;
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    }, [setOffsetState]);

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
                    setZoomState(targetZoom);
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
    }, [targetZoom, setZoomState]);

    // Zoom in/out buttons
    const handleZoomIn = useCallback(() => {
        setTargetZoom((prev) => {
            const currentZoom = prev !== null ? prev : zoom;
            const newZoom = Math.min(MAX_ZOOM, currentZoom * 1.3);
            setZoomState(newZoom);
            return newZoom;
        });
    }, [zoom, setZoomState]);

    const handleZoomOut = useCallback(() => {
        setTargetZoom((prev) => {
            const currentZoom = prev !== null ? prev : zoom;
            const newZoom = Math.max(MIN_ZOOM, currentZoom / 1.3);
            setZoomState(newZoom);
            return newZoom;
        });
    }, [zoom, setZoomState]);

    // Reset zoom and pan
    const handleReset = useCallback(() => {
        setTargetZoom(1);
        setZoomState(1);
        const resetOffset = { x: 0, y: 0 };
        setOffset(resetOffset);
        setOffsetState(resetOffset);
    }, [setZoomState, setOffsetState]);

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
        const currentOffset = isDraggingRef.current
            ? offsetRef.current
            : offset;

        // Inverse transform: screen -> world
        const worldClickX =
            (clickX - centerX - currentOffset.x) / zoom + centerX;
        const worldClickY =
            (clickY - centerY - currentOffset.y) / zoom + centerY;

        // Check if clicked on central star
        const distFromCenter = Math.sqrt(
            (worldClickX - centerX) ** 2 + (worldClickY - centerY) ** 2,
        );
        const starHitRadius = 45 / zoom;

        if (distFromCenter < starHitRadius) {
            if (currentSector.star?.type === "blackhole") {
                travelThroughBlackHole();
            } else {
                setStarInfoOpen(true);
            }
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

    const [hintDismissed, setHintDismissed] = useState(() => {
        if (typeof window !== "undefined") {
            return !!localStorage.getItem("sw_map_hint_done");
        }
        return true;
    });

    const dismissHint = () => {
        if (typeof window !== "undefined") {
            localStorage.setItem("sw_map_hint_done", "1");
        }
        setHintDismissed(true);
    };

    return (
        <div ref={containerRef} className="w-full h-full relative">
            {/* First-visit navigation hint */}
            {!hintDismissed && (
                <div className="absolute top-2 left-2 right-2 bg-[rgba(0,212,255,0.08)] border border-[#00d4ff] px-3 py-2 text-xs text-[#00d4ff] z-20 flex items-center justify-between gap-2">
                    <span>💡 {t("sector_map_ui.hint")}</span>
                    <button
                        onClick={dismissHint}
                        className="text-[#00d4ff] hover:text-white cursor-pointer shrink-0 opacity-70 hover:opacity-100 transition-opacity"
                        title={t("effects.close")}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Current sector indicator */}
            <div
                className={`absolute left-2 bg-[rgba(255,176,0,0.15)] border-2 border-[#ffb000] px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm font-['Orbitron'] font-bold text-[#ffb000] z-20 shadow-[0_0_15px_rgba(255,176,0,0.3)] ${!hintDismissed ? "top-12" : "top-2"}`}
            >
                <span className="text-[10px] md:text-xs opacity-70 mr-1">
                    {t("game.sector")}:
                </span>
                <span className="text-[#00ff41]">
                    {currentSector?.name ?? "START"}
                </span>
            </div>

            {/* Scanner range indicator */}
            {scanRange >= 0 && (
                <div
                    className={`absolute right-2 bg-[rgba(0,255,65,0.1)] border border-[#00ff41] px-2 py-1 text-xs text-[#00ff41] z-10 ${!hintDismissed ? "top-12" : "top-2"}`}
                >
                    {t("galaxy.labels.scanner")}:{" "}
                    {getScannerRangeLabel(scanRange, t)}
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
                            ? t("sector_map_ui.animations_off")
                            : t("sector_map_ui.animations_on")
                    }
                >
                    {animationsEnabled ? "✨" : "⊘"}
                </button>
                <button
                    onClick={handleZoomIn}
                    className="w-10 h-10 bg-[#050810] border-2 border-[#00ff41] text-[#00ff41] text-xl font-bold hover:bg-[#0a1a20] transition-colors flex items-center justify-center cursor-pointer"
                    title={t("sector_map_ui.zoom_in")}
                >
                    +
                </button>
                <button
                    onClick={handleZoomOut}
                    className="w-10 h-10 bg-[#050810] border-2 border-[#00ff41] text-[#00ff41] text-xl font-bold hover:bg-[#0a1a20] transition-colors flex items-center justify-center cursor-pointer"
                    title={t("sector_map_ui.zoom_out")}
                >
                    −
                </button>
                <button
                    onClick={handleReset}
                    className="w-10 h-10 bg-[#050810] border-2 border-[#00ff41] text-[#00ff41] text-xs font-bold hover:bg-[#0a1a20] transition-colors flex items-center justify-center cursor-pointer"
                    title={t("sector_map_ui.reset_view")}
                >
                    RST
                </button>
            </div>

            {/* Zoom level indicator */}
            <div className="absolute bottom-4 left-4 bg-[rgba(0,255,65,0.1)] border border-[#00ff41] px-3 py-1 text-xs text-[#00ff41] select-none pointer-events-none">
                🔍 {(zoom * 100).toFixed(0)}%
            </div>

            {/* Star info panel */}
            {starInfoOpen && currentSector?.star && (
                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                    <div className="pointer-events-auto bg-[#080d18] border-2 border-[#00d4ff] max-w-sm w-full mx-4 font-['Share_Tech_Mono'] shadow-[0_0_40px_rgba(0,212,255,0.2)]">
                        {/* Header */}
                        <div className="flex justify-between items-center px-4 py-3 border-b border-[#00d4ff] bg-[rgba(0,212,255,0.04)]">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">
                                    {(t(
                                        `star_info.${currentSector.star.type}.icon`,
                                    ) as string) || "★"}
                                </span>
                                <div>
                                    <div className="font-['Orbitron'] text-sm font-bold text-[#00d4ff]">
                                        {t(
                                            `star_types.${currentSector.star.type}`,
                                        )}
                                    </div>
                                    <div className="text-[#445] text-xs">
                                        {currentSector.name}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setStarInfoOpen(false)}
                                className="text-[#00d4ff] hover:text-white cursor-pointer opacity-70 hover:opacity-100 transition-opacity px-1"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Stats */}
                        <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs border-b border-[#111a22]">
                            {[
                                {
                                    label: t("star_info.class"),
                                    val: t(
                                        `star_info.${currentSector.star.type}.class`,
                                    ),
                                },
                                {
                                    label: t("star_info.temperature"),
                                    val: t(
                                        `star_info.${currentSector.star.type}.temp`,
                                    ),
                                },
                                {
                                    label: t("star_info.mass"),
                                    val: t(
                                        `star_info.${currentSector.star.type}.mass`,
                                    ),
                                },
                                {
                                    label: t("star_info.hazard"),
                                    val: t(
                                        `star_info.${currentSector.star.type}.hazard`,
                                    ),
                                },
                            ].map(({ label, val }) => (
                                <div key={label}>
                                    <span className="text-[#445]">
                                        {label}:{" "}
                                    </span>
                                    <span className="text-[#00ff41]">
                                        {val}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Description */}
                        <div className="px-4 py-3 text-xs text-[#99a] leading-relaxed border-b border-[#111a22]">
                            {t(`star_info.${currentSector.star.type}.desc`)}
                        </div>
                    </div>
                </div>
            )}

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
                        t,
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

// Draw star at center with animations
function drawStar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    star: { type: StarType; name: string } | undefined,
    sectorId?: number,
    time?: number,
) {
    if (!star) return;

    const currentTime = time || 0;

    if (star.type === "blackhole") {
        // Black hole with rotating accretion disk
        const rotation = currentTime * 0.0005;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 50);
        gradient.addColorStop(0, "#000");
        gradient.addColorStop(0.5, "#1a0a2e");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 50, 0, Math.PI * 2);
        ctx.fill();

        // Event horizon (pulsing)
        const pulse = Math.sin(currentTime * 0.002) * 2;
        ctx.strokeStyle = "#ff00ff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 20 + pulse, 0, Math.PI * 2);
        ctx.stroke();

        // Rotating accretion disk
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.strokeStyle = "rgba(255, 100, 255, 0.5)";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.ellipse(0, 0, 40, 15, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    } else if (star.type === "triple") {
        // Three stars orbiting around center
        const orbitSpeed = 0.0003;
        const orbitRadius = 20;
        const rotation = currentTime * orbitSpeed;

        const colorSets = [
            { c1: "#ffdd44", c2: "#ffaa00", c3: "#ff6600" },
            { c1: "#ffdd44", c2: "#ffdd44", c3: "#ffaa00" },
            { c1: "#ffaa00", c2: "#ff6644", c3: "#ffdd44" },
            { c1: "#ffdd44", c2: "#ffee88", c3: "#ffcc00" },
        ];
        const index =
            sectorId !== undefined ? Math.abs(sectorId) % colorSets.length : 0;
        const colorSet = colorSets[index];
        const colors = [colorSet.c1, colorSet.c2, colorSet.c3];

        for (let i = 0; i < 3; i++) {
            const angle = rotation + i * ((Math.PI * 2) / 3);
            const sx = x + Math.cos(angle) * orbitRadius;
            const sy = y + Math.sin(angle) * orbitRadius;

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
        // Binary stars orbiting each other
        const orbitSpeed = 0.0005;
        const orbitRadius = 15;
        const rotation = currentTime * orbitSpeed;

        const colorSets = [
            { c1: "#ffdd44", c2: "#ffaa00" },
            { c1: "#ffaa00", c2: "#ff6644" },
            { c1: "#ffdd44", c2: "#ffee88" },
            { c1: "#ff6644", c2: "#ffdd44" },
            { c1: "#ffcc00", c2: "#ff9900" },
        ];
        const index =
            sectorId !== undefined ? Math.abs(sectorId) % colorSets.length : 0;
        const colorSet = colorSets[index];
        const colors = [colorSet.c1, colorSet.c2];

        for (let i = 0; i < 2; i++) {
            const angle = rotation + i * Math.PI;
            const sx = x + Math.cos(angle) * orbitRadius;
            const sy = y + Math.sin(angle) * orbitRadius;

            // Glow
            const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, 25);
            gradient.addColorStop(0, "#fff");
            gradient.addColorStop(0.3, colors[i]);
            gradient.addColorStop(1, "transparent");
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(sx, sy, 25, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (star.type === "red_dwarf") {
        // Red dwarf with pulsing effect
        const pulse = Math.sin(currentTime * 0.001) * 2;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 25 + pulse);
        gradient.addColorStop(0, "#ff6644");
        gradient.addColorStop(0.6, "#cc3311");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 25 + pulse, 0, Math.PI * 2);
        ctx.fill();
    } else if (star.type === "yellow_dwarf") {
        // Yellow dwarf (Sun-like) with pulsing
        const pulse = Math.sin(currentTime * 0.0015) * 2;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 35 + pulse);
        gradient.addColorStop(0, "#fff");
        gradient.addColorStop(0.2, "#ffff88");
        gradient.addColorStop(0.5, "#ffdd44");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 35 + pulse, 0, Math.PI * 2);
        ctx.fill();
    } else if (star.type === "white_dwarf") {
        // White dwarf with fast pulsing
        const pulse = Math.sin(currentTime * 0.002) * 1.5;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 20 + pulse);
        gradient.addColorStop(0, "#ffffff");
        gradient.addColorStop(0.4, "#aaddff");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 20 + pulse, 0, Math.PI * 2);
        ctx.fill();
    } else if (star.type === "blue_giant") {
        // Blue giant with slow majestic pulsing
        const pulse = Math.sin(currentTime * 0.0008) * 3;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 45 + pulse);
        gradient.addColorStop(0, "#ffffff");
        gradient.addColorStop(0.3, "#66aaff");
        gradient.addColorStop(0.7, "#2266aa");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 45 + pulse, 0, Math.PI * 2);
        ctx.fill();
    } else if (star.type === "red_supergiant") {
        // Red supergiant with slow rotation and pulsing
        const pulse = Math.sin(currentTime * 0.001) * 3;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 55 + pulse);
        gradient.addColorStop(0, "#ff8866");
        gradient.addColorStop(0.4, "#ff4422");
        gradient.addColorStop(0.8, "#aa1100");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 55 + pulse, 0, Math.PI * 2);
        ctx.fill();
    } else if (star.type === "neutron_star") {
        // Neutron star with fast pulsing
        const pulse = Math.sin(currentTime * 0.003) * 2;

        // Outer glow
        const outerGradient = ctx.createRadialGradient(x, y, 0, x, y, 30);
        outerGradient.addColorStop(0, "rgba(100, 100, 255, 0.4)");
        outerGradient.addColorStop(1, "transparent");
        ctx.fillStyle = outerGradient;
        ctx.beginPath();
        ctx.arc(x, y, 30 + pulse, 0, Math.PI * 2);
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
    } else if (star.type === "gas_giant") {
        // Gas giant - green color like on galaxy map
        const pulse = Math.sin(currentTime * 0.001) * 2;

        // Outer green glow
        const outerGlow = ctx.createRadialGradient(x, y, 0, x, y, 60 + pulse);
        outerGlow.addColorStop(0, "rgba(0, 255, 100, 0.4)");
        outerGlow.addColorStop(0.5, "rgba(0, 200, 50, 0.2)");
        outerGlow.addColorStop(1, "transparent");
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(x, y, 60 + pulse, 0, Math.PI * 2);
        ctx.fill();

        // Main green sphere
        const bodyGradient = ctx.createRadialGradient(x, y, 0, x, y, 40);
        bodyGradient.addColorStop(0, "#00ff66");
        bodyGradient.addColorStop(0.5, "#00cc55");
        bodyGradient.addColorStop(0.8, "#009933");
        bodyGradient.addColorStop(1, "transparent");
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.arc(x, y, 40, 0, Math.PI * 2);
        ctx.fill();

        // Atmospheric bands (horizontal green ribbons)
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, 38, 0, Math.PI * 2);
        ctx.clip();

        // Band 1 - light
        ctx.fillStyle = "rgba(100, 255, 150, 0.5)";
        ctx.fillRect(x - 45, y - 15, 90, 5);

        // Band 2 - dark
        ctx.fillStyle = "rgba(0, 150, 50, 0.6)";
        ctx.fillRect(x - 45, y - 3, 90, 6);

        // Band 3 - light
        ctx.fillStyle = "rgba(50, 255, 100, 0.4)";
        ctx.fillRect(x - 45, y + 10, 90, 5);

        // Band 4 - dark
        ctx.fillStyle = "rgba(0, 120, 40, 0.5)";
        ctx.fillRect(x - 45, y + 20, 90, 4);

        ctx.restore();
    } else if (star.type === "variable_star") {
        // Variable star - slowly changes brightness
        const brightness = 0.5 + Math.sin(currentTime * 0.0005) * 0.3;
        const size = 32 + Math.sin(currentTime * 0.0005) * 8;
        // Outer glow (pulsing)
        const outerGlow = ctx.createRadialGradient(x, y, 0, x, y, size * 1.5);
        outerGlow.addColorStop(0, `rgba(255, 200, 100, ${brightness * 0.6})`);
        outerGlow.addColorStop(0.5, `rgba(255, 150, 50, ${brightness * 0.3})`);
        outerGlow.addColorStop(1, "transparent");
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(x, y, size * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Core (pulsing)
        const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        coreGradient.addColorStop(0, `rgba(255, 255, 200, ${brightness})`);
        coreGradient.addColorStop(
            0.4,
            `rgba(255, 200, 100, ${brightness * 0.8})`,
        );
        coreGradient.addColorStop(1, "transparent");
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    } else if (star.type === "stellar_remnant") {
        // Stellar remnant - dim, fading star with particles
        const pulse = Math.sin(currentTime * 0.0008) * 3;

        // Faint outer glow
        const outerGlow = ctx.createRadialGradient(x, y, 0, x, y, 50 + pulse);
        outerGlow.addColorStop(0, "rgba(150, 150, 150, 0.3)");
        outerGlow.addColorStop(0.5, "rgba(100, 100, 100, 0.15)");
        outerGlow.addColorStop(1, "transparent");
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(x, y, 50 + pulse, 0, Math.PI * 2);
        ctx.fill();

        // Dim core
        const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, 25);
        coreGradient.addColorStop(0, "rgba(200, 200, 200, 0.6)");
        coreGradient.addColorStop(0.5, "rgba(150, 150, 150, 0.4)");
        coreGradient.addColorStop(1, "transparent");
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.fill();

        // Faint particles around
        ctx.fillStyle = "rgba(180, 180, 180, 0.4)";
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 + currentTime * 0.0002;
            const dist = 35 + Math.sin(currentTime * 0.001 + i) * 5;
            const px = x + Math.cos(angle) * dist;
            const py = y + Math.sin(angle) * dist;
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        // Default star
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 30);
        gradient.addColorStop(0, "#fff");
        gradient.addColorStop(0.5, "#ffdd44");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 30, 0, Math.PI * 2);
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
    const radius = 12;
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

    if (loc.planetType === "Пустынная") {
        // Desert dunes pattern
        ctx.fillStyle = "#e6a85c";
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
        // Sand ripples
        ctx.strokeStyle = "#8b5a2b";
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 3; i++) {
            const yOff = (i - 1) * 4;
            ctx.beginPath();
            ctx.moveTo(x - radius * 0.6, y + yOff);
            ctx.quadraticCurveTo(x - radius * 0.3, y + yOff - 2, x, y + yOff);
            ctx.quadraticCurveTo(
                x + radius * 0.3,
                y + yOff + 2,
                x + radius * 0.6,
                y + yOff,
            );
            ctx.stroke();
        }
    }

    if (loc.planetType === "Лесная") {
        // Forest patches
        ctx.fillStyle = "#2d5a2d";
        for (let i = 0; i < 5; i++) {
            const angle = seededRandom(loc, i) * Math.PI * 2;
            const dist = seededRandom(loc, i + 10) * radius * 0.6;
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
        // Tree clusters (small dots)
        ctx.fillStyle = "#1a4a2a";
        for (let i = 0; i < 8; i++) {
            const angle = seededRandom(loc, i + 20) * Math.PI * 2;
            const dist = seededRandom(loc, i + 30) * radius * 0.7;
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

    if (loc.planetType === "Океаническая") {
        // Ocean waves
        ctx.strokeStyle = "#4a8bc9";
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const angle = seededRandom(loc, i) * Math.PI * 2;
            const dist = seededRandom(loc, i + 10) * radius * 0.5;
            ctx.beginPath();
            ctx.arc(
                x + Math.cos(angle) * dist,
                y + Math.sin(angle) * dist,
                4,
                0,
                Math.PI * 2,
            );
            ctx.stroke();
        }
        // Islands
        ctx.fillStyle = "#8b7355";
        for (let i = 0; i < 3; i++) {
            const angle = seededRandom(loc, i + 20) * Math.PI * 2;
            const dist = seededRandom(loc, i + 30) * radius * 0.6;
            ctx.beginPath();
            ctx.ellipse(
                x + Math.cos(angle) * dist,
                y + Math.sin(angle) * dist,
                3,
                2,
                seededRandom(loc, i + 40) * Math.PI,
                0,
                Math.PI * 2,
            );
            ctx.fill();
        }
    }

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

    ctx.globalAlpha = 1;
}

// Draw space station
function drawStation(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    loc: Location,
    completed: boolean,
) {
    if (completed) {
        ctx.globalAlpha = 0.4;
    }

    const stationType = loc.stationType || "trade";

    const stationColors: Record<string, { primary: string; secondary: string; accent: string }> = {
        trade:      { primary: "#5ab8d4", secondary: "#2a5a6a", accent: "#00ff88" },
        military:   { primary: "#8a7aaa", secondary: "#3a2a4a", accent: "#ff4444" },
        mining:     { primary: "#c4a85a", secondary: "#6a5a2a", accent: "#ffaa00" },
        research:   { primary: "#8a6aca", secondary: "#4a2a6a", accent: "#00d4ff" },
        shipyard:   { primary: "#aa7a4a", secondary: "#4a3a1a", accent: "#ff8800" },
        medical:    { primary: "#4aaa7a", secondary: "#1a4a3a", accent: "#00ff88" },
        diplomatic: { primary: "#d4af37", secondary: "#5a4a10", accent: "#ffffff" },
    };

    const colors = stationColors[stationType] || stationColors.trade;

    switch (stationType) {
        case "trade": {
            // ТОРГОВАЯ: Гексагональное кольцо + 3 стыковочных рукава + огни доков
            const hexR = 12;
            // Hexagon fill
            ctx.fillStyle = colors.secondary + "66";
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (i * Math.PI) / 3 - Math.PI / 6;
                const hx = x + hexR * Math.cos(a);
                const hy = y + hexR * Math.sin(a);
                if (i === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.fill();
            // Hexagon stroke
            ctx.strokeStyle = colors.primary;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (i * Math.PI) / 3 - Math.PI / 6;
                const hx = x + hexR * Math.cos(a);
                const hy = y + hexR * Math.sin(a);
                if (i === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.stroke();
            // 3 docking arms at 90°, 210°, 330°
            for (let i = 0; i < 3; i++) {
                const a = (i * 2 * Math.PI) / 3 - Math.PI / 2;
                const sx = x + hexR * Math.cos(a);
                const sy = y + hexR * Math.sin(a);
                const ex = x + 21 * Math.cos(a);
                const ey = y + 21 * Math.sin(a);
                ctx.strokeStyle = colors.secondary;
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(ex, ey);
                ctx.stroke();
                // Docking port ring
                ctx.strokeStyle = colors.accent;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(ex, ey, 3, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = colors.accent + "88";
                ctx.beginPath();
                ctx.arc(ex, ey, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
            // Central hub
            ctx.fillStyle = colors.primary;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = colors.accent;
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
            break;
        }

        case "military": {
            // ВОЕННАЯ: Внешнее бронекольцо + 4 орудийные платформы + прицел
            // Outer armor ring
            ctx.strokeStyle = colors.primary + "55";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, y, 21, 0, Math.PI * 2);
            ctx.stroke();
            // Struts to platforms
            ctx.strokeStyle = colors.secondary;
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 4; i++) {
                const a = (i * Math.PI) / 2;
                ctx.beginPath();
                ctx.moveTo(x + 8 * Math.cos(a), y + 8 * Math.sin(a));
                ctx.lineTo(x + 15 * Math.cos(a), y + 15 * Math.sin(a));
                ctx.stroke();
            }
            // 4 weapon platforms at N/S/E/W
            for (let i = 0; i < 4; i++) {
                const a = (i * Math.PI) / 2;
                const px = x + 15 * Math.cos(a);
                const py = y + 15 * Math.sin(a);
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(a);
                // Platform body
                ctx.fillStyle = colors.secondary;
                ctx.beginPath();
                ctx.moveTo(-4, -4);
                ctx.lineTo(4, -4);
                ctx.lineTo(5, 0);
                ctx.lineTo(4, 4);
                ctx.lineTo(-4, 4);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = colors.primary;
                ctx.lineWidth = 1;
                ctx.stroke();
                // Twin gun barrels pointing outward
                ctx.strokeStyle = colors.primary;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(4, -2);
                ctx.lineTo(9, -2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(4, 2);
                ctx.lineTo(9, 2);
                ctx.stroke();
                // Warning light
                ctx.fillStyle = colors.accent;
                ctx.beginPath();
                ctx.arc(-3, 0, 1.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            // Central fortified hex command center
            ctx.fillStyle = colors.secondary;
            ctx.strokeStyle = colors.primary;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (i * Math.PI) / 3;
                const hx = x + 7 * Math.cos(a);
                const hy = y + 7 * Math.sin(a);
                if (i === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Targeting reticle
            ctx.strokeStyle = colors.accent;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, y, 3.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = colors.accent + "99";
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(x - 6, y); ctx.lineTo(x - 4, y);
            ctx.moveTo(x + 4, y); ctx.lineTo(x + 6, y);
            ctx.moveTo(x, y - 6); ctx.lineTo(x, y - 4);
            ctx.moveTo(x, y + 4); ctx.lineTo(x, y + 6);
            ctx.stroke();
            break;
        }

        case "mining":
            // Central hub
            ctx.fillStyle = colors.primary;
            ctx.strokeStyle = colors.secondary;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Mining station: industrial, drills, cargo containers
            ctx.fillStyle = colors.secondary;
            // Mining arms with drills (centered)
            ctx.fillRect(x - 20, y - 2, 12, 4); // Left arm
            ctx.fillRect(x + 8, y - 2, 12, 4); // Right arm
            ctx.fillRect(x - 2, y - 20, 4, 12); // Top arm
            ctx.fillRect(x - 2, y + 8, 4, 12); // Bottom arm
            // Drill heads (centered on arms)
            ctx.fillStyle = colors.accent;
            ctx.beginPath();
            ctx.arc(x - 20, y, 3, 0, Math.PI * 2); // Left drill
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + 20, y, 3, 0, Math.PI * 2); // Right drill
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x, y - 20, 3, 0, Math.PI * 2); // Top drill
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x, y + 20, 3, 0, Math.PI * 2); // Bottom drill
            ctx.fill();
            // Cargo containers around
            ctx.strokeStyle = colors.primary;
            ctx.lineWidth = 1;
            ctx.strokeRect(x - 10, y - 14, 6, 6);
            ctx.strokeRect(x + 4, y - 14, 6, 6);
            ctx.strokeRect(x - 10, y + 8, 6, 6);
            ctx.strokeRect(x + 4, y + 8, 6, 6);
            break;

        case "research": {
            // ИССЛЕДОВАТЕЛЬСКАЯ: Сенсорная мачта + 2 тарелки + атомные орбитальные кольца
            // Orbital rings (behind everything)
            ctx.strokeStyle = colors.accent + "44";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(x, y, 21, 9, Math.PI / 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(x, y, 21, 9, -Math.PI / 4, 0, Math.PI * 2);
            ctx.stroke();
            // Main sensor mast (spine)
            ctx.strokeStyle = colors.primary;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, y + 16);
            ctx.lineTo(x, y - 22);
            ctx.stroke();
            // Cross bars
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x - 9, y + 5); ctx.lineTo(x + 9, y + 5);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x - 6, y - 5); ctx.lineTo(x + 6, y - 5);
            ctx.stroke();
            // Upper satellite dish — bowl opens LEFT (at y-12 on mast)
            // arm from mast to dish center
            ctx.strokeStyle = colors.secondary;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y - 12);
            ctx.lineTo(x - 8, y - 12);
            ctx.stroke();
            // bowl arc: left semicircle
            ctx.strokeStyle = colors.primary;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(x - 8, y - 12, 6, Math.PI / 2, Math.PI * 1.5);
            ctx.stroke();
            // feed point light
            ctx.fillStyle = colors.accent;
            ctx.beginPath();
            ctx.arc(x - 14, y - 12, 1.5, 0, Math.PI * 2);
            ctx.fill();
            // Lower satellite dish — bowl opens RIGHT (at y+8 on mast)
            ctx.strokeStyle = colors.secondary;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y + 8);
            ctx.lineTo(x + 8, y + 8);
            ctx.stroke();
            ctx.strokeStyle = colors.primary;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(x + 8, y + 8, 6, Math.PI * 1.5, Math.PI / 2);
            ctx.stroke();
            ctx.fillStyle = colors.accent;
            ctx.beginPath();
            ctx.arc(x + 14, y + 8, 1.5, 0, Math.PI * 2);
            ctx.fill();
            // Central science module
            ctx.fillStyle = colors.secondary;
            ctx.fillRect(x - 4, y - 1, 8, 7);
            ctx.strokeStyle = colors.primary;
            ctx.lineWidth = 1;
            ctx.strokeRect(x - 4, y - 1, 8, 7);
            // Antenna tip light
            ctx.fillStyle = colors.accent;
            ctx.beginPath();
            ctx.arc(x, y - 22, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(x, y - 22, 1, 0, Math.PI * 2);
            ctx.fill();
            break;
        }

        case "shipyard":
            // Central hub
            ctx.fillStyle = colors.primary;
            ctx.strokeStyle = colors.secondary;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Shipyard: dry-dock C-clamps on sides + ship skeleton inside
            ctx.fillStyle = colors.secondary;
            ctx.lineWidth = 2;
            // Left dry-dock clamp (C-shape opening right)
            ctx.strokeStyle = colors.primary;
            ctx.beginPath();
            ctx.moveTo(x - 18, y - 10);
            ctx.lineTo(x - 10, y - 10);
            ctx.lineTo(x - 10, y - 6);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x - 18, y + 10);
            ctx.lineTo(x - 10, y + 10);
            ctx.lineTo(x - 10, y + 6);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x - 18, y - 10);
            ctx.lineTo(x - 18, y + 10);
            ctx.stroke();
            // Right dry-dock clamp (C-shape opening left)
            ctx.beginPath();
            ctx.moveTo(x + 18, y - 10);
            ctx.lineTo(x + 10, y - 10);
            ctx.lineTo(x + 10, y - 6);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 18, y + 10);
            ctx.lineTo(x + 10, y + 10);
            ctx.lineTo(x + 10, y + 6);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 18, y - 10);
            ctx.lineTo(x + 18, y + 10);
            ctx.stroke();
            // Ship skeleton outline in dock
            ctx.strokeStyle = colors.accent + "aa";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x - 8, y);
            ctx.lineTo(x - 4, y - 4);
            ctx.lineTo(x + 6, y - 4);
            ctx.lineTo(x + 8, y);
            ctx.lineTo(x + 6, y + 4);
            ctx.lineTo(x - 4, y + 4);
            ctx.closePath();
            ctx.stroke();
            // Orange accent lights on clamp tips
            ctx.fillStyle = colors.accent;
            ctx.beginPath();
            ctx.arc(x - 18, y - 10, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x - 18, y + 10, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + 18, y - 10, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + 18, y + 10, 1.5, 0, Math.PI * 2);
            ctx.fill();
            break;

        case "medical": {
            // МЕДИЦИНСКАЯ: Кольцо жизнеобеспечения + медицинский крест + яркое ядро
            // Outer life support ring
            ctx.strokeStyle = colors.primary + "88";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, y, 19, 0, Math.PI * 2);
            ctx.stroke();
            // 4 life support module pods on ring (at 45°, 135°, 225°, 315°)
            ctx.fillStyle = colors.secondary;
            ctx.strokeStyle = colors.primary;
            ctx.lineWidth = 1;
            for (let i = 0; i < 4; i++) {
                const a = (i * Math.PI) / 2 + Math.PI / 4;
                const mx = x + 19 * Math.cos(a);
                const my = y + 19 * Math.sin(a);
                ctx.save();
                ctx.translate(mx, my);
                ctx.rotate(a);
                ctx.fillRect(-3.5, -2.5, 7, 5);
                ctx.strokeRect(-3.5, -2.5, 7, 5);
                ctx.restore();
            }
            // Medical cross — vertical bar
            ctx.fillStyle = colors.secondary;
            ctx.fillRect(x - 4, y - 14, 8, 28);
            ctx.strokeStyle = colors.primary;
            ctx.lineWidth = 1.2;
            ctx.strokeRect(x - 4, y - 14, 8, 28);
            // Medical cross — horizontal bar
            ctx.fillStyle = colors.secondary;
            ctx.fillRect(x - 14, y - 4, 28, 8);
            ctx.strokeStyle = colors.primary;
            ctx.strokeRect(x - 14, y - 4, 28, 8);
            // Bright central core
            ctx.fillStyle = colors.accent;
            ctx.beginPath();
            ctx.arc(x, y, 5.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.fill();
            // Accent lights at cross tips
            ctx.fillStyle = colors.accent;
            const medLights: [number, number][] = [
                [x, y - 14], [x, y + 14], [x - 14, y], [x + 14, y],
            ];
            for (const [lx, ly] of medLights) {
                ctx.beginPath();
                ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        }

        case "diplomatic": {
            // ДИПЛОМАТИЧЕСКАЯ: Два кольца + звезда мира в центре
            // Outer glow
            const dipGlow = ctx.createRadialGradient(x, y, 0, x, y, 22);
            dipGlow.addColorStop(0, colors.primary + "44");
            dipGlow.addColorStop(1, "transparent");
            ctx.fillStyle = dipGlow;
            ctx.beginPath();
            ctx.arc(x, y, 22, 0, Math.PI * 2);
            ctx.fill();

            // Left ring
            ctx.strokeStyle = colors.primary;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x - 5, y, 7, 0, Math.PI * 2);
            ctx.stroke();

            // Right ring
            ctx.strokeStyle = colors.accent;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x + 5, y, 7, 0, Math.PI * 2);
            ctx.stroke();

            // Center overlap fill (golden)
            ctx.fillStyle = colors.primary + "cc";
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();

            // Star symbol
            ctx.fillStyle = colors.secondary;
            ctx.font = "bold 6px Arial";
            ctx.textAlign = "center";
            ctx.fillText("★", x, y + 2);
            break;
        }
    }

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

    const shipType = loc.enemyType || "pirate";

    // Danger glow (red)
    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 25);
    glowGradient.addColorStop(0, "rgba(255, 0, 64, 0.3)");
    glowGradient.addColorStop(1, "transparent");
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();

    // Ship type-specific designs
    switch (shipType) {
        case "pirate":
            // Pirate: jagged, scrap-metal look with multiple weapons
            ctx.fillStyle = "#8b0000";
            ctx.strokeStyle = "#ff4444";
            ctx.lineWidth = 2;

            // Jagged hull
            ctx.beginPath();
            ctx.moveTo(x, y - 15);
            ctx.lineTo(x - 10, y - 5);
            ctx.lineTo(x - 14, y + 8);
            ctx.lineTo(x - 6, y + 10);
            ctx.lineTo(x, y + 5);
            ctx.lineTo(x + 6, y + 10);
            ctx.lineTo(x + 14, y + 8);
            ctx.lineTo(x + 10, y - 5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Multiple weapon ports (scattered)
            ctx.fillStyle = "#ff6600";
            ctx.beginPath();
            ctx.arc(x - 8, y - 2, 2, 0, Math.PI * 2);
            ctx.arc(x + 8, y - 2, 2, 0, Math.PI * 2);
            ctx.arc(x - 10, y + 6, 2, 0, Math.PI * 2);
            ctx.arc(x + 10, y + 6, 2, 0, Math.PI * 2);
            ctx.fill();

            // Skull-like cockpit
            ctx.fillStyle = "#ff4444";
            ctx.beginPath();
            ctx.arc(x, y - 8, 3, 0, Math.PI * 2);
            ctx.fill();

            // Engine
            ctx.fillStyle = "#ff4400";
            ctx.beginPath();
            ctx.moveTo(x - 4, y + 8);
            ctx.lineTo(x, y + 15);
            ctx.lineTo(x + 4, y + 8);
            ctx.closePath();
            ctx.fill();
            break;

        case "raider":
            // Raider: sleek, fast, aggressive design
            ctx.fillStyle = "#a02020";
            ctx.strokeStyle = "#ff5555";
            ctx.lineWidth = 2;

            // Sleek pointed hull
            ctx.beginPath();
            ctx.moveTo(x, y - 18);
            ctx.lineTo(x - 8, y + 2);
            ctx.lineTo(x - 12, y + 10);
            ctx.lineTo(x - 4, y + 8);
            ctx.lineTo(x, y + 5);
            ctx.lineTo(x + 4, y + 8);
            ctx.lineTo(x + 12, y + 10);
            ctx.lineTo(x + 8, y + 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Forward cannons
            ctx.fillStyle = "#ff6600";
            ctx.fillRect(x - 3, y - 12, 2, 8);
            ctx.fillRect(x + 1, y - 12, 2, 8);

            // Cockpit slit
            ctx.fillStyle = "#ff4444";
            ctx.fillRect(x - 4, y - 6, 8, 3);

            // Twin engines
            ctx.fillStyle = "#ff4400";
            ctx.beginPath();
            ctx.arc(x - 6, y + 10, 3, 0, Math.PI * 2);
            ctx.arc(x + 6, y + 10, 3, 0, Math.PI * 2);
            ctx.fill();
            break;

        case "mercenary":
            // Mercenary: professional, military-grade, angular
            ctx.fillStyle = "#6a3a3a";
            ctx.strokeStyle = "#ff6666";
            ctx.lineWidth = 2;

            // Angular military hull
            ctx.beginPath();
            ctx.moveTo(x, y - 14);
            ctx.lineTo(x - 12, y + 2);
            ctx.lineTo(x - 8, y + 6);
            ctx.lineTo(x - 12, y + 10);
            ctx.lineTo(x - 4, y + 10);
            ctx.lineTo(x, y + 6);
            ctx.lineTo(x + 4, y + 10);
            ctx.lineTo(x + 12, y + 10);
            ctx.lineTo(x + 8, y + 6);
            ctx.lineTo(x + 12, y + 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Weapon mounts (symmetrical)
            ctx.fillStyle = "#ff6600";
            ctx.beginPath();
            ctx.arc(x - 10, y, 2.5, 0, Math.PI * 2);
            ctx.arc(x + 10, y, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Military cockpit
            ctx.fillStyle = "#ff5555";
            ctx.beginPath();
            ctx.moveTo(x, y - 10);
            ctx.lineTo(x - 4, y - 4);
            ctx.lineTo(x + 4, y - 4);
            ctx.closePath();
            ctx.fill();

            // Engine cluster
            ctx.fillStyle = "#ff4400";
            ctx.beginPath();
            ctx.arc(x, y + 12, 4, 0, Math.PI * 2);
            ctx.fill();
            break;

        case "marauder":
            // Marauder: scavenged, mismatched, opportunistic
            ctx.fillStyle = "#7a2a2a";
            ctx.strokeStyle = "#ff5555";
            ctx.lineWidth = 2;

            // Asymmetric hull (scavenged look)
            ctx.beginPath();
            ctx.moveTo(x - 2, y - 14);
            ctx.lineTo(x - 10, y - 2);
            ctx.lineTo(x - 14, y + 6);
            ctx.lineTo(x - 8, y + 10);
            ctx.lineTo(x, y + 6);
            ctx.lineTo(x + 10, y + 8);
            ctx.lineTo(x + 12, y + 2);
            ctx.lineTo(x + 8, y - 6);
            ctx.lineTo(x + 4, y - 12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Mismatched weapons
            ctx.fillStyle = "#ff6600";
            ctx.beginPath();
            ctx.arc(x - 8, y - 4, 2, 0, Math.PI * 2);
            ctx.arc(x + 6, y + 4, 2.5, 0, Math.PI * 2);
            ctx.arc(x - 6, y + 8, 2, 0, Math.PI * 2);
            ctx.fill();

            // Patched cockpit
            ctx.fillStyle = "#ff5555";
            ctx.beginPath();
            ctx.arc(x + 2, y - 6, 3, 0, Math.PI * 2);
            ctx.fill();

            // Uneven engines
            ctx.fillStyle = "#ff4400";
            ctx.beginPath();
            ctx.arc(x - 4, y + 10, 2.5, 0, Math.PI * 2);
            ctx.arc(x + 6, y + 10, 3, 0, Math.PI * 2);
            ctx.fill();
            break;

        default:
            // Generic enemy ship
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
            break;
    }

    ctx.globalAlpha = 1;
}

// Draw anomaly — shape varies by tier
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
    const tier = loc.anomalyTier ?? 1;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    if (tier === 1) {
        // Tier 1: simple pulsing circle + "?"
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = completed ? 0.1 : 0.15;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = completed ? 0.3 : 1;

        ctx.font = "bold 13px Share Tech Mono";
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.fillText("?", x, y + 5);
    } else if (tier === 2) {
        // Tier 2: diamond (rotated square)
        const r = 11;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y - r);
        ctx.lineTo(x + r, y);
        ctx.lineTo(x, y + r);
        ctx.lineTo(x - r, y);
        ctx.closePath();
        ctx.stroke();

        ctx.globalAlpha = completed ? 0.1 : 0.18;
        ctx.beginPath();
        ctx.moveTo(x, y - r);
        ctx.lineTo(x + r, y);
        ctx.lineTo(x, y + r);
        ctx.lineTo(x - r, y);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = completed ? 0.3 : 1;

        // inner dot
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
    } else if (tier === 3) {
        // Tier 3: 6-pointed star
        const outerR = 13;
        const innerR = 6;
        const points = 6;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const angle = (i * Math.PI) / points - Math.PI / 2;
            const r = i % 2 === 0 ? outerR : innerR;
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.globalAlpha = completed ? 0.1 : 0.2;
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const angle = (i * Math.PI) / points - Math.PI / 2;
            const r = i % 2 === 0 ? outerR : innerR;
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = completed ? 0.3 : 1;

        // center glow
        const grad3 = ctx.createRadialGradient(x, y, 0, x, y, 5);
        grad3.addColorStop(0, "#fff");
        grad3.addColorStop(1, color);
        ctx.fillStyle = grad3;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Tier 4: 4-pointed star + two orbital rings
        const outerR = 14;
        const innerR = 5;
        const points = 4;
        ctx.lineWidth = 2;

        // Outer orbital ring
        ctx.globalAlpha = completed ? 0.15 : 0.4;
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.stroke();

        // Inner orbital ring
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = completed ? 0.3 : 1;

        // 4-pointed star
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const angle = (i * Math.PI) / points - Math.PI / 4;
            const r = i % 2 === 0 ? outerR : innerR;
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.globalAlpha = completed ? 0.1 : 0.25;
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const angle = (i * Math.PI) / points - Math.PI / 4;
            const r = i % 2 === 0 ? outerR : innerR;
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = completed ? 0.3 : 1;

        // Bright core
        const grad4 = ctx.createRadialGradient(x, y, 0, x, y, 6);
        grad4.addColorStop(0, "#fff");
        grad4.addColorStop(0.5, color);
        grad4.addColorStop(1, "transparent");
        ctx.fillStyle = grad4;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalAlpha = 1;
}

// Draw friendly ship (always visible - scanner check done before calling)
function drawFriendlyShip(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    loc: Location,
    completed: boolean,
) {
    if (completed) {
        ctx.globalAlpha = 0.4;
    }

    const shipRace = loc.shipRace || "human";
    const shipName = loc.name || "";

    // Determine ship type from name
    const getShipType = (name: string): string => {
        if (name.includes("Торговец") || name.includes("Trader"))
            return "trader";
        if (name.includes("Наём") || name.includes("Mercenary"))
            return "mercenary";
        if (
            name.includes("Курьер") ||
            name.includes("Courier") ||
            name.includes("Фрегат")
        )
            return "courier";
        if (name.includes("Баржа") || name.includes("Barge")) return "barge";
        if (name.includes("Зонд") || name.includes("Probe")) return "probe";
        if (name.includes("Исслед") || name.includes("Explorer"))
            return "explorer";
        return "default";
    };

    const shipType = getShipType(shipName);

    // Race colors
    const raceColors: Record<
        string,
        { primary: string; secondary: string; accent: string }
    > = {
        human: { primary: "#2a6a8a", secondary: "#4a9aba", accent: "#7fc8dc" },
        synthetic: {
            primary: "#6a6a7a",
            secondary: "#8a8a9a",
            accent: "#00ffff",
        },
        xenosymbiont: {
            primary: "#4a8a4a",
            secondary: "#6aaa6a",
            accent: "#88ff88",
        },
        krylorian: {
            primary: "#8a6a4a",
            secondary: "#aa8a6a",
            accent: "#ffcc88",
        },
        voidborn: {
            primary: "#4a3a5a",
            secondary: "#6a5a7a",
            accent: "#aa88ff",
        },
        crystalline: {
            primary: "#5a7a9a",
            secondary: "#7a9aba",
            accent: "#aaddff",
        },
    };

    const colors = raceColors[shipRace] || raceColors.human;

    // Friendly glow (blue/cyan)
    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 25);
    glowGradient.addColorStop(0, "rgba(0, 180, 255, 0.3)");
    glowGradient.addColorStop(1, "transparent");
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();

    // Ship type-specific designs
    switch (shipType) {
        case "trader":
            // Trader: bulky cargo holds
            ctx.fillStyle = colors.primary;
            ctx.strokeStyle = colors.secondary;
            ctx.lineWidth = 2;

            // Main hull
            ctx.beginPath();
            ctx.ellipse(x, y, 14, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Cargo containers on sides
            ctx.fillStyle = colors.secondary;
            ctx.fillRect(x - 18, y - 6, 6, 12);
            ctx.fillRect(x + 12, y - 6, 6, 12);

            // Cockpit
            ctx.fillStyle = colors.accent;
            ctx.beginPath();
            ctx.arc(x, y - 2, 4, 0, Math.PI * 2);
            ctx.fill();
            break;

        case "mercenary":
            // Mercenary: angular, weapon mounts
            ctx.fillStyle = colors.primary;
            ctx.strokeStyle = colors.secondary;
            ctx.lineWidth = 2;

            // Angular hull
            ctx.beginPath();
            ctx.moveTo(x, y - 14);
            ctx.lineTo(x - 12, y + 6);
            ctx.lineTo(x - 6, y + 6);
            ctx.lineTo(x, y + 2);
            ctx.lineTo(x + 6, y + 6);
            ctx.lineTo(x + 12, y + 6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Weapon mounts
            ctx.fillStyle = colors.accent;
            ctx.beginPath();
            ctx.arc(x - 10, y - 4, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + 10, y - 4, 2, 0, Math.PI * 2);
            ctx.fill();

            // Cockpit slit
            ctx.fillStyle = colors.secondary;
            ctx.fillRect(x - 4, y - 6, 8, 3);
            break;

        case "courier":
            // Courier: sleek, fast design
            ctx.fillStyle = colors.primary;
            ctx.strokeStyle = colors.secondary;
            ctx.lineWidth = 2;

            // Sleek pointed hull
            ctx.beginPath();
            ctx.moveTo(x, y - 16);
            ctx.lineTo(x - 8, y + 4);
            ctx.lineTo(x, y + 2);
            ctx.lineTo(x + 8, y + 4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Engine boost
            ctx.fillStyle = colors.accent;
            ctx.beginPath();
            ctx.arc(x, y + 8, 3, 0, Math.PI * 2);
            ctx.fill();

            // Wings
            ctx.strokeStyle = colors.secondary;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x - 6, y - 4);
            ctx.lineTo(x - 14, y + 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 6, y - 4);
            ctx.lineTo(x + 14, y + 2);
            ctx.stroke();
            break;

        case "barge":
            // Barge: massive, blocky
            ctx.fillStyle = colors.primary;
            ctx.strokeStyle = colors.secondary;
            ctx.lineWidth = 2;

            // Large rectangular hull
            ctx.fillRect(x - 16, y - 10, 32, 20);
            ctx.strokeRect(x - 16, y - 10, 32, 20);

            // Bridge tower
            ctx.fillStyle = colors.secondary;
            ctx.fillRect(x - 6, y - 14, 12, 8);

            // Engine cluster
            ctx.fillStyle = colors.accent;
            ctx.beginPath();
            ctx.arc(x - 8, y + 12, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + 8, y + 12, 3, 0, Math.PI * 2);
            ctx.fill();
            break;

        case "probe":
            // Probe: small, automated
            ctx.fillStyle = colors.primary;
            ctx.strokeStyle = colors.secondary;
            ctx.lineWidth = 1.5;

            // Central sphere
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Solar panels (cross shape)
            ctx.fillStyle = colors.secondary;
            ctx.fillRect(x - 14, y - 2, 8, 4);
            ctx.fillRect(x + 6, y - 2, 8, 4);
            ctx.fillRect(x - 2, y - 14, 4, 8);
            ctx.fillRect(x - 2, y + 6, 4, 8);

            // Antenna
            ctx.strokeStyle = colors.accent;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y - 8);
            ctx.lineTo(x, y - 16);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x, y - 17, 2, 0, Math.PI * 2);
            ctx.stroke();
            break;

        case "explorer":
            // Explorer: scientific equipment, sensors
            ctx.fillStyle = colors.primary;
            ctx.strokeStyle = colors.secondary;
            ctx.lineWidth = 2;

            // Main hull (teardrop shape)
            ctx.beginPath();
            ctx.moveTo(x, y - 14);
            ctx.quadraticCurveTo(x - 10, y, x - 8, y + 10);
            ctx.lineTo(x + 8, y + 10);
            ctx.quadraticCurveTo(x + 10, y, x, y - 14);
            ctx.fill();
            ctx.stroke();

            // Sensor dishes
            ctx.strokeStyle = colors.accent;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(x - 12, y - 6, 4, 0, Math.PI, false);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x + 12, y - 6, 4, 0, Math.PI, false);
            ctx.stroke();

            // Lab module
            ctx.fillStyle = colors.accent;
            ctx.beginPath();
            ctx.arc(x, y + 4, 3, 0, Math.PI * 2);
            ctx.fill();
            break;

        default:
            // Generic ship
            ctx.fillStyle = colors.primary;
            ctx.strokeStyle = colors.secondary;
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
            ctx.fillStyle = colors.accent;
            ctx.beginPath();
            ctx.arc(x, y - 4, 3, 0, Math.PI * 2);
            ctx.fill();

            // Engine
            ctx.fillStyle = colors.secondary;
            ctx.beginPath();
            ctx.arc(x, y + 6, 2, 0, Math.PI * 2);
            ctx.fill();
            break;
    }

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
            icon = "✦";
            break;
        case "gravitational":
            color = "#9d00ff";
            icon = "🕳";
            break;
        case "temporal":
            color = "#ff00ff";
            icon = "⏳";
            break;
        case "nanite":
            color = "#ffaa00";
            icon = "⬡";
            break;
        default:
            color = "#00ff00";
            icon = "?";
    }

    // Storm cloud base
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 20);
    gradient.addColorStop(0, color + "60");
    gradient.addColorStop(0.5, color + "30");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();

    // Unique visual effects for each storm type
    switch (stormType) {
        case "radiation":
            // Radiation: pulsing waves emanating from center
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                const radius = 6 + i * 5;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.stroke();
            }
            // Radiation symbols around
            ctx.font = "10px Share Tech Mono";
            for (let i = 0; i < 3; i++) {
                const angle = (i * Math.PI * 2) / 3;
                const rx = x + Math.cos(angle) * 14;
                const ry = y + Math.sin(angle) * 14;
                ctx.fillText("☢", rx, ry);
            }
            break;

        case "ionic":
            // Ionic: lightning bolts striking outward
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            for (let i = 0; i < 5; i++) {
                const angle = (i * Math.PI * 2) / 5;
                const startX = x + Math.cos(angle) * 8;
                const startY = y + Math.sin(angle) * 8;
                const endX = x + Math.cos(angle) * 18;
                const endY = y + Math.sin(angle) * 18;
                // Zigzag lightning
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 6;
                const midY = (startY + endY) / 2 + (Math.random() - 0.5) * 6;
                ctx.lineTo(midX, midY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
            break;

        case "plasma":
            // Plasma: simple fiery blobs without animation
            ctx.fillStyle = color + "60";
            for (let i = 0; i < 4; i++) {
                const angle = (i * Math.PI * 2) / 4;
                const dist = 10;
                const px = x + Math.cos(angle) * dist;
                const py = y + Math.sin(angle) * dist;
                const blobSize = 4;
                ctx.beginPath();
                ctx.arc(px, py, blobSize, 0, Math.PI * 2);
                ctx.fill();
            }
            // Simple center glow
            const plasmaGradient = ctx.createRadialGradient(x, y, 0, x, y, 12);
            plasmaGradient.addColorStop(0, color + "80");
            plasmaGradient.addColorStop(1, "transparent");
            ctx.fillStyle = plasmaGradient;
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, Math.PI * 2);
            ctx.fill();
            break;

        case "gravitational":
            // Gravitational: spiral arms pulling inward
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            for (let arm = 0; arm < 3; arm++) {
                const baseAngle = (arm * Math.PI * 2) / 3;
                ctx.beginPath();
                for (let t = 0; t <= 1; t += 0.1) {
                    const spiralAngle = baseAngle + t * Math.PI;
                    const radius = 18 - t * 14;
                    const sx = x + Math.cos(spiralAngle) * radius;
                    const sy = y + Math.sin(spiralAngle) * radius;
                    if (t === 0) {
                        ctx.moveTo(sx, sy);
                    } else {
                        ctx.lineTo(sx, sy);
                    }
                }
                ctx.stroke();
            }
            // Dark core
            const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, 8);
            coreGradient.addColorStop(0, "#000");
            coreGradient.addColorStop(0.5, color + "40");
            coreGradient.addColorStop(1, "transparent");
            ctx.fillStyle = coreGradient;
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();
            break;

        case "temporal":
            // Temporal: concentric rings with gaps (time distortion)
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                const radius = 5 + i * 4;
                const startAngle = i * 0.3;
                const endAngle = Math.PI * 2 - i * 0.3;
                ctx.beginPath();
                ctx.arc(x, y, radius, startAngle, endAngle);
                ctx.stroke();
            }
            // Pulsing dots on rings
            ctx.fillStyle = color;
            for (let i = 0; i < 3; i++) {
                const angle = (i * Math.PI * 2) / 3 + Date.now() * 0.001;
                const radius = 8 + i * 3;
                const dx = x + Math.cos(angle) * radius;
                const dy = y + Math.sin(angle) * radius;
                ctx.beginPath();
                ctx.arc(dx, dy, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            break;

        case "nanite":
            // Nanite: swarm of small particles
            ctx.fillStyle = color;
            const particleCount = 20;
            for (let i = 0; i < particleCount; i++) {
                const angle = (i / particleCount) * Math.PI * 2;
                const dist = 6 + (i % 5) * 3;
                const px = x + Math.cos(angle + i * 0.3) * dist;
                const py = y + Math.sin(angle + i * 0.3) * dist;
                ctx.beginPath();
                ctx.rect(px - 1.5, py - 1.5, 3, 3); // Small squares
                ctx.fill();
            }
            // Hexagonal boundary
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let i = 0; i <= 6; i++) {
                const angle = (i * Math.PI * 2) / 6;
                const hx = x + Math.cos(angle) * 18;
                const hy = y + Math.sin(angle) * 18;
                if (i === 0) {
                    ctx.moveTo(hx, hy);
                } else {
                    ctx.lineTo(hx, hy);
                }
            }
            ctx.closePath();
            ctx.stroke();
            break;
    }

    // Storm icon in center
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
    time: number = 0,
) {
    const isResolved = completed || loc.signalResolved;
    const baseAlpha = isResolved ? 0.35 : 1;
    const t = time / 1000; // секунды

    // Цвет зависит от раскрытого типа сигнала
    let color = "#ffaa00"; // неизвестно
    if (loc.signalRevealed && loc.signalType) {
        if (loc.signalType === "pirate_ambush") color = "#ff0040";
        else if (loc.signalType === "survivors") color = "#00ff41";
        else if (loc.signalType === "abandoned_cargo") color = "#00d4ff";
    }
    if (isResolved) color = "#666666";

    // Разбиваем hex-цвет на RGB для rgba()
    const hexToRgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `${r}, ${g}, ${b}`;
    };
    const rgb = hexToRgb(color);

    // ── Одно медленное кольцо ─────────────────────────────────────────
    if (!isResolved) {
        const phase = (t * 0.18) % 1; // очень медленное расширение
        const ringRadius = 10 + phase * 14;
        const ringAlpha = (1 - phase) * 0.18;
        ctx.globalAlpha = ringAlpha;
        ctx.strokeStyle = `rgba(${rgb}, 1)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
    }

    // ── Фоновое свечение ──────────────────────────────────────────────
    const glowPulse = isResolved
        ? 0.12
        : 0.18 + 0.05 * Math.sin(t * Math.PI * 0.6); // очень медленная пульсация
    ctx.globalAlpha = baseAlpha;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 16);
    gradient.addColorStop(0, `rgba(${rgb}, ${glowPulse})`);
    gradient.addColorStop(0.6, `rgba(${rgb}, ${glowPulse * 0.3})`);
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();

    // ── Ромбовидный корпус маяка ──────────────────────────────────────
    const corePulse = isResolved ? 1 : 1 + 0.03 * Math.sin(t * Math.PI * 0.6); // едва заметная пульсация
    const s = 7 * corePulse;
    ctx.globalAlpha = baseAlpha;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4); // 45° → ромб
    ctx.fillStyle = isResolved ? "#111" : "#100500";
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.rect(-s, -s, s * 2, s * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // ── Текст SOS ─────────────────────────────────────────────────────
    const textBlink = isResolved
        ? 0.6
        : 0.88 + 0.12 * Math.sin(t * Math.PI * 0.6); // синхронно с glow
    ctx.globalAlpha = baseAlpha * textBlink;
    ctx.font = "bold 8px 'Share Tech Mono', monospace";
    ctx.fillStyle = isResolved ? "#666" : color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SOS", x, y);

    // Сброс
    ctx.globalAlpha = 1;
    ctx.textBaseline = "alphabetic";
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

    const bossType = loc.bossType || "default";

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

    // Boss-specific icons
    switch (bossType) {
        case "sentinel":
            // ⚙️ Страж Врат - Gear/Watchman
            ctx.fillStyle = "#ffaa00";
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, Math.PI * 2);
            ctx.fill();
            // Gear teeth
            ctx.strokeStyle = "#ffcc00";
            ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(x + Math.cos(angle) * 12, y + Math.sin(angle) * 12);
                ctx.lineTo(x + Math.cos(angle) * 16, y + Math.sin(angle) * 16);
                ctx.stroke();
            }
            // Central eye
            ctx.fillStyle = "#00ffff";
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
            break;

        case "stalker":
            // 🔥 Ловец Нов - Nova Stalker (flame collector)
            ctx.fillStyle = "#ff4400";
            ctx.beginPath();
            ctx.moveTo(x, y - 14);
            ctx.lineTo(x - 8, y + 6);
            ctx.lineTo(x - 4, y + 6);
            ctx.lineTo(x, y - 4);
            ctx.lineTo(x + 4, y + 6);
            ctx.lineTo(x + 8, y + 6);
            ctx.closePath();
            ctx.fill();
            // Solar flare accents
            ctx.fillStyle = "#ffaa00";
            ctx.beginPath();
            ctx.arc(x - 6, y - 8, 3, 0, Math.PI * 2);
            ctx.arc(x + 6, y - 8, 3, 0, Math.PI * 2);
            ctx.fill();
            break;

        case "leech":
            // 🩸 Пустотный Паразит - Void Leech (tentacles)
            ctx.fillStyle = "#aa00ff";
            ctx.beginPath();
            ctx.arc(x, y - 4, 8, 0, Math.PI * 2);
            ctx.fill();
            // Tentacles
            ctx.strokeStyle = "#cc44ff";
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                const angle = Math.PI + (i / 3) * Math.PI;
                ctx.beginPath();
                ctx.moveTo(x, y + 4);
                ctx.quadraticCurveTo(
                    x + Math.sin(angle) * 10,
                    y + 8,
                    x + Math.sin(angle) * 14,
                    y + 14,
                );
                ctx.stroke();
            }
            break;

        case "harvester":
            // 🌀 Жнец Прайм - Harvester (spiral collector)
            ctx.strokeStyle = "#00ff88";
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < 3; i++) {
                const angle = (i / 3) * Math.PI * 2;
                ctx.beginPath();
                ctx.arc(x, y, 8 + i * 3, angle, angle + Math.PI);
                ctx.stroke();
            }
            // Central core
            ctx.fillStyle = "#00ff88";
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
            break;

        case "hunter":
            // ⚡ Фазовый Охотник - Phase Hunter (lightning bolt)
            ctx.fillStyle = "#00d4ff";
            ctx.beginPath();
            ctx.moveTo(x + 4, y - 14);
            ctx.lineTo(x - 6, y - 4);
            ctx.lineTo(x, y - 4);
            ctx.lineTo(x - 4, y + 14);
            ctx.lineTo(x + 6, y + 4);
            ctx.lineTo(x, y + 4);
            ctx.closePath();
            ctx.fill();
            // Phase rings
            ctx.strokeStyle = "#00d4ff";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, Math.PI * 2);
            ctx.stroke();
            break;

        case "reaver":
            // ❄️ Ледяной Разоритель - Cryo Reaver (snowflake)
            ctx.strokeStyle = "#88ffff";
            ctx.lineWidth = 2;
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + Math.cos(angle) * 12, y + Math.sin(angle) * 12);
                ctx.stroke();
            }
            // Ice crystals
            ctx.fillStyle = "#88ffff";
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
            break;

        case "oracle":
            // 👁️ Оракул Пустоты - Void Oracle (all-seeing eye)
            ctx.fillStyle = "#ff00ff";
            ctx.beginPath();
            ctx.ellipse(x, y, 10, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            // Eye pupil
            ctx.fillStyle = "#00ffff";
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
            // Eyelids
            ctx.strokeStyle = "#ff00ff";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 10, Math.PI * 0.2, Math.PI * 0.8);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x, y, 10, Math.PI * 1.2, Math.PI * 1.8);
            ctx.stroke();
            break;

        case "destroyer":
            // 💀 Разрушитель Связи - Nexus Destroyer (skull/crossbones)
            ctx.fillStyle = "#ff4444";
            ctx.beginPath();
            ctx.arc(x, y - 4, 8, 0, Math.PI * 2);
            ctx.fill();
            // Eye sockets
            ctx.fillStyle = "#000";
            ctx.beginPath();
            ctx.arc(x - 3, y - 6, 2, 0, Math.PI * 2);
            ctx.arc(x + 3, y - 6, 2, 0, Math.PI * 2);
            ctx.fill();
            // Cross bones
            ctx.strokeStyle = "#ff4444";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - 8, y + 4);
            ctx.lineTo(x + 8, y + 12);
            ctx.moveTo(x + 8, y + 4);
            ctx.lineTo(x - 8, y + 12);
            ctx.stroke();
            break;

        case "warden":
            // ⏳ Хранитель Времени - Chronos Warden (hourglass)
            ctx.strokeStyle = "#ffaa00";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - 8, y - 10);
            ctx.lineTo(x + 8, y - 10);
            ctx.lineTo(x + 4, y);
            ctx.lineTo(x + 8, y + 10);
            ctx.lineTo(x - 8, y + 10);
            ctx.lineTo(x - 4, y);
            ctx.closePath();
            ctx.stroke();
            // Sand
            ctx.fillStyle = "#ffaa00";
            ctx.beginPath();
            ctx.arc(x, y - 5, 3, 0, Math.PI * 2);
            ctx.fill();
            break;

        case "eternal":
            // ♾️ Вечный - The Eternal (infinity symbol)
            ctx.strokeStyle = "#aa00ff";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.bezierCurveTo(x - 8, y - 8, x - 14, y, x - 8, y + 8);
            ctx.bezierCurveTo(x - 4, y + 4, x, y, x, y);
            ctx.bezierCurveTo(x + 4, y - 4, x + 8, y + 8, x + 8, y + 8);
            ctx.bezierCurveTo(x + 14, y, x + 8, y - 8, x, y);
            ctx.stroke();
            // Center glow
            ctx.fillStyle = "#cc44ff";
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
            break;

        default:
            // Generic ancient boss
            ctx.fillStyle = "#ff00ff";
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, Math.PI * 2);
            ctx.fill();
            // Tech symbol
            ctx.font = "bold 14px Share Tech Mono";
            ctx.fillStyle = "#fff";
            ctx.textAlign = "center";
            ctx.fillText("⚙", x, y + 5);
            break;
    }

    ctx.globalAlpha = 1;
}

// Draw meteors - shooting stars flying across the sector
function drawMeteors(
    ctx: CanvasRenderingContext2D,
    animState: {
        meteors: Array<{
            x: number;
            y: number;
            vx: number;
            vy: number;
            length: number;
            brightness: number;
            active: boolean;
        }>;
        time: number;
    },
) {
    animState.meteors.forEach((meteor) => {
        if (!meteor.active) return;

        const angle = Math.atan2(meteor.vy, meteor.vx);
        const tailX = meteor.x - Math.cos(angle) * meteor.length;
        const tailY = meteor.y - Math.sin(angle) * meteor.length;

        // Meteor gradient tail
        const gradient = ctx.createLinearGradient(
            meteor.x,
            meteor.y,
            tailX,
            tailY,
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${meteor.brightness})`);
        gradient.addColorStop(
            0.3,
            `rgba(200, 200, 255, ${meteor.brightness * 0.6})`,
        );
        gradient.addColorStop(1, "transparent");

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(meteor.x, meteor.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        // Bright head
        ctx.fillStyle = `rgba(255, 255, 255, ${meteor.brightness})`;
        ctx.beginPath();
        ctx.arc(meteor.x, meteor.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Draw cosmic dust particles - floating space debris
function drawParticles(
    ctx: CanvasRenderingContext2D,
    animState: {
        particles: Array<{
            nx: number;
            ny: number;
            size: number;
            vx: number;
            vy: number;
            brightness: number;
            color: string;
        }>;
        time: number;
    },
    width: number,
    height: number,
) {
    animState.particles.forEach((particle) => {
        const x = particle.nx * width;
        const y = particle.ny * height;

        // Twinkle effect
        const twinkle =
            Math.sin(animState.time * 0.003 + particle.brightness * Math.PI) *
                0.3 +
            0.7;

        ctx.fillStyle = particle.color.replace(
            /[\d.]+\)$/g,
            `${particle.brightness * twinkle * 0.5})`,
        );
        ctx.beginPath();
        ctx.arc(x, y, particle.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Draw twinkling stars on main canvas (overlay for animation)
function drawTwinklingStars(
    ctx: CanvasRenderingContext2D,
    stars: Array<{
        nx: number;
        ny: number;
        size: number;
        brightness: number;
        twinkleSpeed: number;
        twinkleOffset: number;
    }>,
    time: number,
    width: number,
    height: number,
) {
    stars.forEach((star) => {
        const x = star.nx * width;
        const y = star.ny * height;
        const twinkle =
            Math.sin(time * 0.002 * star.twinkleSpeed + star.twinkleOffset) *
                0.3 +
            0.7;
        const alpha = (0.3 + star.brightness * 0.7) * twinkle;

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Draw derelict ship
function drawDerelictShip(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    loc: Location,
    completed: boolean,
) {
    const isExplored = completed || loc.derelictExplored;
    ctx.globalAlpha = isExplored ? 0.3 : 1;

    // Dim residual heat glow (no power)
    const dimGlow = ctx.createRadialGradient(x, y, 0, x, y, 18);
    dimGlow.addColorStop(0, "rgba(50, 65, 85, 0.3)");
    dimGlow.addColorStop(1, "transparent");
    ctx.fillStyle = dimGlow;
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();

    // Floating debris pieces
    ctx.fillStyle = "#3a4a5a";
    const debrisPieces: [number, number, number, number][] = [
        [14, -10, 2, 2],
        [-13, 9, 2, 2],
        [8, 13, 1, 2],
        [-16, -4, 2, 1],
    ];
    for (const [dx, dy, w, h] of debrisPieces) {
        ctx.fillRect(x + dx, y + dy, w, h);
    }

    // Draw ship hull tilted ~22° (listing/drifting)
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(0.38);

    // Main hull body
    ctx.fillStyle = "#1e2d3d";
    ctx.strokeStyle = "#4a5f72";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -14);   // nose
    ctx.lineTo(-11, 7);   // left wing tip
    ctx.lineTo(-4, 3);    // left engine notch
    ctx.lineTo(0, 9);     // center rear
    ctx.lineTo(4, 3);     // right engine notch
    ctx.lineTo(9, 7);     // right wing tip (shorter — damaged)
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Dark cockpit (no power)
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(-3, 1);
    ctx.lineTo(3, 1);
    ctx.closePath();
    ctx.fill();

    // Hull damage crack
    ctx.strokeStyle = "#cc4400";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-1, -5);
    ctx.lineTo(3, 0);
    ctx.lineTo(1, 4);
    ctx.stroke();

    // Dead engine nozzles (no glow)
    ctx.fillStyle = "#252535";
    ctx.strokeStyle = "#3a3a50";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(-3, 6, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(3, 6, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Broken right wing structural fragment
    ctx.strokeStyle = "#4a5f72";
    ctx.lineWidth = 1;
    ctx.setLineDash([1, 2]);
    ctx.beginPath();
    ctx.moveTo(8, 6);
    ctx.lineTo(13, 4);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();

    // Emergency distress beacon (amber) — only if not yet explored
    if (!isExplored) {
        const bx = x + 12;
        const by = y - 12;
        const beaconGlow = ctx.createRadialGradient(bx, by, 0, bx, by, 6);
        beaconGlow.addColorStop(0, "rgba(255, 140, 0, 0.45)");
        beaconGlow.addColorStop(1, "transparent");
        ctx.fillStyle = beaconGlow;
        ctx.beginPath();
        ctx.arc(bx, by, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ff8800";
        ctx.beginPath();
        ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalAlpha = 1;
}

function drawGasGiant(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    loc: Location,
    completed: boolean,
) {
    const isDived = !!loc.gasGiantLastDiveAt;
    ctx.globalAlpha = completed || isDived ? 0.45 : 1;

    const r = 18;
    const atmosphere = loc.gasGiantAtmosphere ?? "hydrogen";

    const coreColor =
        atmosphere === "hydrogen"
            ? "#cc88ff"
            : atmosphere === "methane"
              ? "#88ddbb"
              : atmosphere === "ammonia"
                ? "#ffdd88"
                : "#aaddff";
    const bandColor =
        atmosphere === "hydrogen"
            ? "#7b4fff"
            : atmosphere === "methane"
              ? "#228855"
              : atmosphere === "ammonia"
                ? "#cc8800"
                : "#3399cc";

    // Sphere gradient
    const grad = ctx.createRadialGradient(
        x - r * 0.3,
        y - r * 0.3,
        r * 0.1,
        x,
        y,
        r,
    );
    grad.addColorStop(0, coreColor);
    grad.addColorStop(0.5, bandColor);
    grad.addColorStop(1, "rgba(5,8,16,0.9)");

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Cloud bands clipped to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = `${bandColor}55`;
    ctx.fillRect(x - r, y - r * 0.55, r * 2, r * 0.28);
    ctx.fillRect(x - r, y + r * 0.12, r * 2, r * 0.22);
    ctx.restore();

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = coreColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = (completed || isDived ? 0.45 : 1) * 0.6;
    ctx.stroke();

    // Accent dot if not yet dived
    if (!isDived && !completed) {
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(x + r - 4, y - r + 4, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalAlpha = 1;
}

function drawWreckField(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    loc: Location,
    completed: boolean,
) {
    const exhausted = loc.wreckExhausted ?? false;
    const tier = (loc.wreckTier ?? 1) as 1 | 2 | 3;
    ctx.globalAlpha = completed || exhausted ? 0.4 : 1;

    const color = tier === 3 ? "#c8832a" : tier === 2 ? "#a0785a" : "#8b7355";

    // Radiation glow
    const glow = ctx.createRadialGradient(x, y, 2, x, y, 22);
    glow.addColorStop(0, `${color}33`);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    // Scattered debris fragments — deterministic positions per tier
    type Frag = { dx: number; dy: number; w: number; h: number; rot: number };
    const frags: Frag[][] = [
        [
            { dx: -6, dy: -4, w: 9, h: 3, rot: -22 },
            { dx:  5, dy: -6, w: 6, h: 2, rot:  40 },
            { dx: -2, dy:  5, w: 7, h: 2, rot:  15 },
            { dx:  6, dy:  4, w: 5, h: 2, rot: -55 },
            { dx: -7, dy:  3, w: 5, h: 2, rot:  30 },
        ],
        [
            { dx: -7, dy: -5, w: 11, h: 3, rot: -18 },
            { dx:  6, dy: -7, w:  8, h: 2, rot:  45 },
            { dx: -2, dy:  6, w:  9, h: 3, rot:  12 },
            { dx:  7, dy:  3, w:  6, h: 2, rot: -60 },
            { dx: -8, dy:  4, w:  7, h: 2, rot:  28 },
            { dx:  3, dy:  8, w:  5, h: 2, rot: -35 },
            { dx: -4, dy: -9, w:  5, h: 2, rot:  55 },
            { dx:  9, dy:  6, w:  4, h: 2, rot:  20 },
        ],
        [
            { dx: -8, dy: -6, w: 13, h: 4, rot: -15 },
            { dx:  7, dy: -8, w: 10, h: 3, rot:  42 },
            { dx: -3, dy:  7, w: 11, h: 3, rot:  10 },
            { dx:  8, dy:  3, w:  8, h: 3, rot: -58 },
            { dx: -9, dy:  5, w:  8, h: 2, rot:  25 },
            { dx:  4, dy:  9, w:  7, h: 2, rot: -32 },
            { dx: -5, dy:-10, w:  6, h: 2, rot:  52 },
            { dx: 10, dy:  7, w:  5, h: 2, rot:  18 },
            { dx: -1, dy:  0, w:  4, h: 2, rot: -70 },
            { dx:  5, dy: -2, w:  5, h: 2, rot:  35 },
            { dx: -7, dy:  9, w:  4, h: 2, rot: -10 },
        ],
    ];

    ctx.fillStyle = color;
    for (const f of frags[tier - 1]) {
        ctx.save();
        ctx.translate(x + f.dx, y + f.dy);
        ctx.rotate((f.rot * Math.PI) / 180);
        ctx.fillRect(-f.w / 2, -f.h / 2, f.w, f.h);
        ctx.restore();
    }

    // Radiation ring for tier 3
    if (tier === 3 && !exhausted) {
        ctx.beginPath();
        ctx.arc(x, y, 17, 0, Math.PI * 2);
        ctx.strokeStyle = "#ff6600";
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.35;
        ctx.setLineDash([3, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    ctx.globalAlpha = 1;
}
