"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useGameStore } from "@/game/store";
import { useTranslation } from "@/lib/useTranslation";
import { getLocationName } from "@/lib/translationHelpers";
import { RACES } from "@/game/constants/races";
import { getScannerRangeLabel } from "./DistressSignalPanel";
import { STAR_SPRITE_SHEET } from "@/game/assets/starSprites";
import type { Location, LocationType, StarType } from "@/game/types";
import {
  getScannerInfo,
  getStarBackgroundColor,
  getStarGlowColor,
} from "./sectorMap/helpers";
import { LegendIcon } from "./sectorMap/LegendIcon";
import { setupHiDPICanvas } from "./canvas-utils";
import {
  drawAncientBoss,
  drawAnomaly,
  drawAsteroidBelt,
  drawDerelictShip,
  drawDistressSignal,
  drawEnemy,
  drawFriendlyShip,
  drawGasGiant,
  drawMeteors,
  drawParticles,
  drawPlanet,
  drawStar,
  drawStation,
  drawStorm,
  drawTwinklingStars,
  drawUnknown,
  drawUnknownShip,
  drawWreckField,
} from "./sectorMap/drawers";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_SENSITIVITY = 0.001;
const DRAG_THRESHOLD = 5;
const NEEDS_SCANNER_LOCATIONS: LocationType[] = ["storm", "anomaly", "boss"];
const PLANET_SPRITE_SHEET = "/assets/plantes/planets.png";
const GAS_PLANET_SPRITE_SHEET = "/assets/plantes/gas-planets.png";
const STATION_SPRITE_SHEET = "/assets/stations.png";

const getSectorMapRadius = (width: number, height: number) =>
  Math.min(width, height) * (width < 768 ? 0.7 : 0.45);

type SectorSpriteImages = {
  planets?: HTMLImageElement;
  gasPlanets?: HTMLImageElement;
  stations?: HTMLImageElement;
  stars?: HTMLImageElement;
};

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
  const offsetRef = useRef(sectorOffset); // Ref for smooth dragging — initialized from store
  const hasMovedRef = useRef(false);
  // Pinch-to-zoom state
  const pinchStartDist = useRef(0);
  const pinchStartZoom = useRef(1);
  const isPinching = useRef(false);
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
  const spriteImagesRef = useRef<SectorSpriteImages>({});
  const [, setSpriteImagesReady] = useState(0);

  const scanRange = getEffectiveScanRange();

  // Draw the canvas content
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !currentSector) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvasSizeRef.current;
    const centerX = width / 2;
    const centerY = height / 2;
    const baseMaxRadius = getSectorMapRadius(width, height);

    // Draw cached background (stars) - no transform
    if (bgCanvasRef.current) {
      ctx.drawImage(bgCanvasRef.current, 0, 0, width, height);
    }

    // Apply transform for zoom and pan (use ref for sync access during drag)
    const currentOffset = isDraggingRef.current
      ? offsetRef.current
      : offset;
    ctx.save();
    ctx.translate(centerX + currentOffset.x, centerY + currentOffset.y);
    ctx.scale(zoom, zoom);
    ctx.translate(-centerX, -centerY);

    drawStar(
      ctx,
      centerX,
      centerY,
      currentSector.star,
      currentSector.id,
      animationStateRef.current.time,
      spriteImagesRef.current.stars,
    );

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
        drawStation(
          ctx,
          x,
          y,
          loc,
          completed,
          spriteImagesRef.current.stations,
        );
      } else if (loc.type === "planet") {
        drawPlanet(
          ctx,
          x,
          y,
          loc,
          completed,
          spriteImagesRef.current.planets,
        );
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
        drawGasGiant(
          ctx,
          x,
          y,
          loc,
          completed,
          spriteImagesRef.current.gasPlanets,
        );
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

      // Strip race adjective from friendly ship labels (e.g. "Человеческий Торговец" → "Торговец")
      let baseName = displayName;
      if (loc.type === "friendly_ship" && loc.shipRace) {
        const raceInfo = RACES[loc.shipRace];
        const prefix = raceInfo?.adjective || raceInfo?.name;
        if (prefix && baseName.startsWith(prefix + " ")) {
          baseName = baseName.slice(prefix.length + 1);
        }
      }
      const finalDisplayName = isUnknownShip
        ? t("sector_map.unknown_ship")
        : isExploredEmptyPlanet
          ? `${baseName} ${t("sector_map.explored")}`
          : isVisitedColonizedPlanet ||
            isVisitedStation ||
            isDivedGasPlanet
            ? `${baseName} ${t("sector_map.visited")}`
            : baseName;

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

  useEffect(() => {
    let cancelled = false;

    const loadImage = (
      key: keyof SectorSpriteImages,
      src: string,
    ) => {
      const image = new Image();
      image.decoding = "async";
      image.src = src;
      image.onload = () => {
        if (cancelled) return;
        spriteImagesRef.current = {
          ...spriteImagesRef.current,
          [key]: image,
        };
        setSpriteImagesReady((value) => value + 1);
        requestAnimationFrame(drawCanvas);
      };
    };

    loadImage("planets", PLANET_SPRITE_SHEET);
    loadImage("gasPlanets", GAS_PLANET_SPRITE_SHEET);
    loadImage("stations", STATION_SPRITE_SHEET);
    loadImage("stars", STAR_SPRITE_SHEET);

    return () => {
      cancelled = true;
    };
  }, [drawCanvas]);

  // Initialize canvas and background
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const animCanvas = animCanvasRef.current;
    if (!canvas || !container || !animCanvas || !currentSector) return;

    const rect = container.getBoundingClientRect();
    const newWidth = Math.round(rect.width);
    const newHeight = Math.round(rect.height);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Setup animation canvas
    const animCtx = animCanvas.getContext("2d");
    if (!animCtx) return;
    setupHiDPICanvas(animCanvas, animCtx, newWidth, newHeight);

    // Regenerate background if canvas size changed OR star type changed
    const sizeChanged =
      canvasSizeRef.current.width !== newWidth ||
      canvasSizeRef.current.height !== newHeight;

    const starTypeChanged =
      canvasSizeRef.current.starType !== currentSector.star?.type;

    if (sizeChanged || starTypeChanged) {
      setupHiDPICanvas(canvas, ctx, newWidth, newHeight);
      canvasSizeRef.current = {
        width: newWidth,
        height: newHeight,
        starType: currentSector.star?.type,
      };

      // Create off-screen background canvas
      const bgCanvas = document.createElement("canvas");
      const bgCtx = bgCanvas.getContext("2d");
      if (bgCtx) setupHiDPICanvas(bgCanvas, bgCtx, newWidth, newHeight);

      if (bgCtx) {
        // Clear with space background - color depends on star type
        const bgColor = getStarBackgroundColor(
          currentSector.star?.type,
        );
        bgCtx.fillStyle = bgColor;
        bgCtx.fillRect(0, 0, newWidth, newHeight);

        // Add subtle glow from the star — smooth radial fade with no visible edge
        const glowColor = getStarGlowColor(currentSector.star?.type);
        if (glowColor !== "transparent") {
          const centerX = newWidth / 2;
          const centerY = newHeight / 2;
          // Gradient extends beyond canvas so the fade never cuts off visibly
          const maxRadius = Math.max(newWidth, newHeight) * 1.3;

          // Fade the inner color to half-opacity at ~30% then to transparent
          const fadeColor = glowColor.replace(
            /(\d\.\d+)/,
            (_, alpha) => String(Number(alpha) * 0.4),
          );

          const glowGradient = bgCtx.createRadialGradient(
            centerX,
            centerY,
            0,
            centerX,
            centerY,
            maxRadius,
          );
          glowGradient.addColorStop(0, glowColor);
          glowGradient.addColorStop(0.35, fadeColor);
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
      e.preventDefault();
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
                canvasSizeRef.current.width,
                canvasSizeRef.current.height,
              );
              drawMeteors(animCtx, animState);
              drawParticles(
                animCtx,
                animState,
                canvasSizeRef.current.width,
                canvasSizeRef.current.height,
              );
              if (starsRef.current) {
                drawTwinklingStars(
                  animCtx,
                  starsRef.current,
                  animState.time,
                  canvasSizeRef.current.width,
                  canvasSizeRef.current.height,
                );
              }
            } else if (animCtx) {
              animCtx.clearRect(
                0,
                0,
                canvasSizeRef.current.width,
                canvasSizeRef.current.height,
              );
            }
          }

          // Draw main canvas
          drawCanvas();

          animationFrameRef.current = null;
        });
      }

      // Handle tooltip
      const canvas = canvasRef.current;
      if (!canvas || !currentSector) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvasSizeRef.current.width / rect.width;
      const scaleY = canvasSizeRef.current.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      // Account for zoom and pan
      const centerX = canvasSizeRef.current.width / 2;
      const centerY = canvasSizeRef.current.height / 2;
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
        const baseMaxRadius = getSectorMapRadius(
          canvasSizeRef.current.width,
          canvasSizeRef.current.height,
        );
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

  // Touch handlers for mobile (pan + pinch-to-zoom)
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchStartDist.current = Math.hypot(dx, dy);
        pinchStartZoom.current = zoom;
        isPinching.current = true;
        hasMovedRef.current = true;
        setIsDragging(false);
        isDraggingRef.current = false;
        return;
      }
      if (isPinching.current) return;
      const touch = e.touches[0];
      setIsDragging(true);
      isDraggingRef.current = true;
      hasMovedRef.current = false;
      dragStartRef.current = { x: touch.clientX, y: touch.clientY };
      offsetStartRef.current = { ...offsetRef.current };
      dragStartTimeRef.current = animationStateRef.current.time;
    },
    [zoom],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      // Pinch-to-zoom: два пальца
      if (isPinching.current && e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (pinchStartDist.current > 0) {
          const ratio = dist / pinchStartDist.current;
          const newZoom = Math.min(
            MAX_ZOOM,
            Math.max(MIN_ZOOM, pinchStartZoom.current * ratio),
          );
          setZoom(newZoom);
          setTargetZoom(null);
          setZoomState(newZoom);
        }
        return;
      }

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
              canvasSizeRef.current.width,
              canvasSizeRef.current.height,
            );
            drawMeteors(animCtx, animState);
            drawParticles(
              animCtx,
              animState,
              canvasSizeRef.current.width,
              canvasSizeRef.current.height,
            );
            if (starsRef.current) {
              drawTwinklingStars(
                animCtx,
                starsRef.current,
                animState.time,
                canvasSizeRef.current.width,
                canvasSizeRef.current.height,
              );
            }
          } else if (animCtx) {
            animCtx.clearRect(
              0,
              0,
              canvasSizeRef.current.width,
              canvasSizeRef.current.height,
            );
          }
        }

        // Draw main canvas
        drawCanvas();
      });
    },
    [animationsEnabled, drawCanvas, setZoomState],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (isPinching.current) {
        isPinching.current = false;
        if (e.touches.length === 1) {
          const touch = e.touches[0];
          setIsDragging(true);
          isDraggingRef.current = true;
          hasMovedRef.current = true;
          dragStartRef.current = { x: touch.clientX, y: touch.clientY };
          offsetStartRef.current = { ...offsetRef.current };
          dragStartTimeRef.current = animationStateRef.current.time;
        }
        return;
      }
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

      // TAP-to-inspect: показать тултип сканера для локации под пальцем
      if (!hasMovedRef.current) {
        const touch = e.changedTouches[0];
        if (touch) {
          const canvas = canvasRef.current;
          if (canvas && currentSector) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvasSizeRef.current.width / rect.width;
            const scaleY = canvasSizeRef.current.height / rect.height;
            const mx = (touch.clientX - rect.left) * scaleX;
            const my = (touch.clientY - rect.top) * scaleY;
            const centerX = canvasSizeRef.current.width / 2;
            const centerY = canvasSizeRef.current.height / 2;
            const cur = offsetRef.current;
            const worldX = (mx - centerX - cur.x) / zoom + centerX;
            const worldY = (my - centerY - cur.y) / zoom + centerY;
            const baseMaxRadius = getSectorMapRadius(
              canvasSizeRef.current.width,
              canvasSizeRef.current.height,
            );
            let foundLoc: typeof currentSector.locations[0] | null = null;
            for (const loc of currentSector.locations) {
              const distance = baseMaxRadius * (loc.distanceRatio ?? 0.5);
              const angle = loc.angle ?? 0;
              const lx = centerX + Math.cos(angle) * distance;
              const ly = centerY + Math.sin(angle) * distance;
              if (Math.hypot(worldX - lx, worldY - ly) < 25 / zoom) {
                foundLoc = loc;
                break;
              }
            }
            setHoveredLocation(
              foundLoc
                ? { loc: foundLoc, x: touch.clientX - rect.left, y: touch.clientY - rect.top }
                : null,
            );
          }
        }
      }
    },
    [setOffsetState, currentSector, zoom],
  );

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

  // Keep offsetRef in sync with offset state so drag always starts from the correct position
  useEffect(() => {
    if (!isDraggingRef.current) {
      offsetRef.current = offset;
    }
  }, [offset]);

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
    const scaleX = canvasSizeRef.current.width / rect.width;
    const scaleY = canvasSizeRef.current.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Account for zoom and pan - transform click coordinates to world coordinates
    const centerX = canvasSizeRef.current.width / 2;
    const centerY = canvasSizeRef.current.height / 2;

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
    const baseMaxRadius = getSectorMapRadius(
      canvasSizeRef.current.width,
      canvasSizeRef.current.height,
    );
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

  const [legendOpen, setLegendOpen] = useState(false);

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
    <div
      ref={containerRef}
      className="radar-viewport w-full h-full relative"
      data-animations={animationsEnabled ? "on" : "off"}
    >
      {/* First-visit navigation hint */}
      {!hintDismissed && (
        <div className="absolute top-2 left-2 right-2 bg-[rgba(0,212,255,0.08)] border border-ring px-3 py-2 text-xs text-ring z-20 flex items-center justify-between gap-2">
          <span>💡 {t("sector_map_ui.hint")}</span>
          <button
            onClick={dismissHint}
            className="text-ring hover:text-white cursor-pointer shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            title={t("effects.close")}
          >
            ✕
          </button>
        </div>
      )}

      {/* Current sector indicator */}
      <div
        className={`absolute left-2 bg-[rgba(255,176,0,0.15)] border-2 border-accent px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm font-['Orbitron'] font-bold text-accent z-20 shadow-[0_0_15px_rgba(255,176,0,0.3)] ${!hintDismissed ? "top-12" : "top-2"}`}
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
        className="radar-canvas cursor-grab w-full h-full touch-none"
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
      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={() => setAnimationsEnabled(!animationsEnabled)}
          className="radar-control w-10 h-10 border text-xs font-bold transition-colors flex items-center justify-center cursor-pointer"
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
          className="radar-control w-10 h-10 border text-xl font-bold transition-colors flex items-center justify-center cursor-pointer"
          title={t("sector_map_ui.zoom_in")}
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="radar-control w-10 h-10 border text-xl font-bold transition-colors flex items-center justify-center cursor-pointer"
          title={t("sector_map_ui.zoom_out")}
        >
          −
        </button>
        <button
          onClick={handleReset}
          className="radar-control w-10 h-10 border text-xs font-bold transition-colors flex items-center justify-center cursor-pointer"
          title={t("sector_map_ui.reset_view")}
        >
          RST
        </button>
      </div>

      {/* Legend + Zoom level indicator */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2 items-start z-20">
        <div className="bg-[rgba(5,8,16,0.75)] border border-[#00ff41] text-[#00ff41] text-xs select-none backdrop-blur-sm flex flex-col max-w-[calc(100vw-2rem)]">
          {legendOpen && (
            <div className="border-b border-[#00ff4133] px-2 py-2 max-h-[40vh] md:max-h-[55vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] text-[#aaa]">
                {[
                  { key: "planet", label: t("location_types.planet") },
                  { key: "gas_giant", label: t("location_types.gas_giant") },
                  { key: "station", label: t("location_types.station") },
                  { key: "unknown_ship", label: t("locations.unknown_ship") },
                  { key: "enemy_ship", label: t("location_types.enemy_ship") },
                  { key: "friendly_ship", label: t("location_types.friendly_ship") },
                  { key: "unknown_object", label: t("locations.unknown_object") },
                  { key: "boss", label: t("location_types.boss") },
                  { key: "anomaly", label: t("location_types.anomaly") },
                  { key: "cosmic_storm", label: t("location_types.cosmic_storm") },
                  { key: "distress_signal", label: t("location_types.distress_signal") },
                  { key: "derelict_ship", label: t("location_types.derelict_ship") },
                  { key: "wreck_field", label: t("location_types.wreck_field") },
                  { key: "asteroid_belt", label: t("location_types.asteroid_belt") },
                ].map(({ key, label }) => (
                  <span key={key} className="flex items-center gap-1 min-w-0">
                    <LegendIcon type={key} />
                    <span className="truncate">{label}</span>
                  </span>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-[#00ff411f] text-[10px] leading-snug text-[#7fbf8f]">
                <div>{t("sector_map_ui.unknown_markers_hint_line_1")}</div>
                <div>{t("sector_map_ui.unknown_markers_hint_line_2")}</div>
              </div>
            </div>
          )}
          <button
            onClick={() => setLegendOpen(!legendOpen)}
            className="w-full px-3 py-1 flex items-center gap-3 cursor-pointer hover:bg-[rgba(0,255,65,0.07)] transition-colors"
          >
            <span className="font-['Orbitron'] tracking-wider">{t("sector_map_ui.legend")}</span>
            <span className="ml-auto opacity-60">{legendOpen ? "▼" : "▲"}</span>
          </button>
        </div>
        <div className="bg-[rgba(0,255,65,0.1)] border border-[#00ff41] px-3 py-1 text-xs text-[#00ff41] select-none pointer-events-none">
          🔍 {(zoom * 100).toFixed(0)}%
        </div>
      </div>

      {/* Star info panel */}
      {starInfoOpen && currentSector?.star && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="pointer-events-auto bg-[#080d18] border-2 border-ring max-w-sm w-full mx-4 font-['Share_Tech_Mono'] shadow-[0_0_40px_rgba(0,212,255,0.2)]">
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-ring bg-[rgba(0,212,255,0.04)]">
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {(t(
                    `star_info.${currentSector.star.type}.icon`,
                  ) as string) || "★"}
                </span>
                <div>
                  <div className="font-['Orbitron'] text-sm font-bold text-ring">
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
                className="text-ring hover:text-white cursor-pointer opacity-70 hover:opacity-100 transition-opacity px-1"
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
                  ? "text-accent"
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
