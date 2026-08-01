"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DRONE_MAX_STACKS, WEAPON_TYPES } from "@/game/constants";
import { playSound } from "@/sounds";
import { setupHiDPICanvas } from "@/game/components/canvas-utils";
import {
  COMBAT_CINEMATIC_MISS_LABEL_START_PROGRESS,
  formatCombatCinematicAmount,
  getCombatCinematicModuleAnchor,
  getHullDamageStage,
  getCombatCinematicSceneMetrics,
  getMissLabelPoint,
  getProjectilePathPoint,
  getShieldImpactPoint,
} from "./combatCinematicGeometry";
import {
  getCombatCinematicEnemyWeaponIcon,
  getCombatCinematicEnemyWeaponKey,
  getCombatCinematicProjectileReadout,
  getCombatCinematicProjectileVisual,
} from "./combatCinematicPresentation";
import { getCombatCinematicEventSounds } from "./combatCinematicSound";
import {
  applyCombatCinematicEvent,
  getCombatCinematicStaggerMs,
  COMBAT_CINEMATIC_VOLLEY_STAGGER_MS,
  getCombatCinematicEventDuration,
  getCombatCinematicProjectileContactProgress,
  getCombatCinematicSnapshotAtProgress,
} from "@/game/slices/combat/helpers/combatCinematicPlayback";
import type { BossIntent, BossIntentStatus } from "@/game/slices/combat/helpers/bossIntent";
import type {
  CombatCinematicEvent,
  CombatCinematicSide,
  CombatCinematicSnapshot,
  CombatProjectileEvent,
  CombatTurnTimeline,
} from "@/game/types/combatCinematics";
import { useTranslation } from "@/lib/useTranslation";

type Point = { x: number; y: number };
/** Событие, идущее прямо сейчас: их может быть несколько, залп летит внахлёст. */
interface ActiveCinematicEvent {
  event: CombatCinematicEvent;
  progress: number;
}
type Translate = (key: string, params?: Record<string, string | number>) => string;

const PLAYER_COLOR = "#00ff9d";
const ENEMY_COLOR = "#ff4d6d";
const SHIELD_COLOR = "#5bd6ff";

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function easeOut(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

const TAU = Math.PI * 2;

// ponytail: frame-local clock read by shipCenter/drawModuleLights so idle drift
// moves hulls, module lights, shields and impact points as one body without
// threading `elapsed` through every draw call. One canvas, one rAF, no reentry.
let sceneElapsed = 0;

function pseudoRandom(seed: number): number {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function withAlpha(color: string, alpha: number): string {
  if (!color.startsWith("#") || color.length !== 7) return color;
  const byte = Math.round(clamp(alpha) * 255).toString(16).padStart(2, "0");
  return `${color}${byte}`;
}

function fillRadialGlow(
  ctx: CanvasRenderingContext2D,
  point: Point,
  radius: number,
  stops: readonly (readonly [number, string])[],
): void {
  const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
  for (const [offset, color] of stops) glow.addColorStop(offset, color);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, TAU);
  ctx.fill();
}

function getHullRatio(vessel: CombatCinematicSnapshot["player"]): number {
  const hull = vessel.modules.reduce((total, item) => total + item.health, 0);
  const maxHull = vessel.modules.reduce((total, item) => total + item.maxHealth, 0);
  return maxHull > 0 ? clamp(hull / maxHull) : 0;
}

function readableFontSize(
  baseSize: number,
  sceneScale: number,
  minimumSize: number,
): number {
  return Math.max(minimumSize, baseSize * sceneScale) / sceneScale;
}

function shipCenter(side: CombatCinematicSide, width: number, height: number): Point {
  const phase = side === "player" ? 0 : 2.1;
  return {
    x: width * (side === "player" ? 0.25 : 0.75) + Math.sin(sceneElapsed / 2600 + phase) * 4,
    y: height * 0.52 + Math.sin(sceneElapsed / 1500 + phase) * 6,
  };
}

function shipDirection(side: CombatCinematicSide): -1 | 1 {
  return side === "player" ? 1 : -1;
}

function getModulePoint(
  vessel: CombatCinematicSnapshot["player"],
  side: CombatCinematicSide,
  moduleId: number | undefined,
  width: number,
  height: number,
): Point {
  const center = shipCenter(side, width, height);
  const index = Math.max(0, vessel.modules.findIndex((currentModule) => currentModule.id === moduleId));
  return getCombatCinematicModuleAnchor(
    vessel.modules.length,
    index,
    center,
    shipDirection(side),
  );
}

function getWeaponColor(weapon: CombatProjectileEvent["weapon"]): string {
  return weapon === "enemy" ? ENEMY_COLOR : WEAPON_TYPES[weapon].color;
}

/** Незнакомое орудие падает в цвет корабля — данные можно расширять без правок здесь. */
const ENEMY_GUN_COLORS: Record<string, string> = {
  plasma_cannon: "#ff8a3d",
  radiation_core: "#c6ff4d",
  flare_launcher: "#ffb000",
  nano_swarm: "#7dffb2",
  energy_drain: "#ff4dff",
  shield_drain: "#5bd6ff",
  ice_beam: "#8be9fd",
  absolute_zero: "#c9f6ff",
  disintegrate_beam: "#ff5470",
  annihilation_beam: "#ff2d55",
  link_breaker: "#ffd166",
  entropy_cannon: "#b980ff",
  void_cannon: "#9d7bff",
  void_anchor: "#7a5cff",
  void_embrace: "#8f6bff",
  reality_tear: "#ff4dff",
  temporal_cannon: "#4dd8ff",
  paradox_engine: "#6affe0",
  grapple_arm: "#d8b26a",
  prophecy_lance: "#ffe066",
  severance_array: "#ff7ad9",
  chronofracture_battery: "#57e8ff",
  oblivion_spire: "#a86bff",
};

function getProjectileColor(
  event: CombatProjectileEvent,
  snapshot: CombatCinematicSnapshot,
): string {
  if (event.weapon !== "enemy") return getWeaponColor(event.weapon);
  // Враг стреляет залпом из нескольких орудий — если все выстрелы одного цвета,
  // читается один поток вместо трёх стволов.
  const gunColor = event.enemyWeapon
    ? ENEMY_GUN_COLORS[event.enemyWeapon]
    : undefined;
  if (gunColor) return gunColor;
  if (snapshot[event.from].kind === "boss") return "#ff4dff";
  if (snapshot[event.from].kind === "creature") return "#c084fc";
  return ENEMY_COLOR;
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsed: number,
): void {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#02060f");
  gradient.addColorStop(0.5, "#06162a");
  gradient.addColorStop(1, "#110616");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const nebulas = [
    { x: 0.24, y: 0.36, radius: 0.62, rgb: "0, 255, 157", alpha: 0.1, drift: 9200 },
    { x: 0.76, y: 0.64, radius: 0.58, rgb: "255, 77, 109", alpha: 0.1, drift: 11700 },
    { x: 0.52, y: 0.2, radius: 0.74, rgb: "91, 214, 255", alpha: 0.06, drift: 15400 },
  ];
  for (const nebula of nebulas) {
    const sway = Math.sin(elapsed / nebula.drift) * width * 0.035;
    fillRadialGlow(
      ctx,
      { x: width * nebula.x + sway, y: height * nebula.y - sway * 0.4 },
      Math.max(width, height) * nebula.radius,
      [
        [0, `rgba(${nebula.rgb}, ${nebula.alpha})`],
        [0.55, `rgba(${nebula.rgb}, ${nebula.alpha * 0.32})`],
        [1, `rgba(${nebula.rgb}, 0)`],
      ],
    );
  }
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let index = 0; index < 140; index += 1) {
    const layer = index % 3;
    const span = width + 12;
    const drift = (elapsed / (24 + layer * 46)) % span;
    const x = ((pseudoRandom(index * 1.7) * span - drift) + span) % span - 6;
    const y = pseudoRandom(index * 3.1 + 11) * height;
    const twinkle = clamp(0.3 + Math.sin(elapsed / 480 + index * 1.7) * 0.34 + (2 - layer) * 0.12);
    const size = layer === 0 ? 1.9 : layer === 1 ? 1.2 : 0.8;
    ctx.fillStyle = `rgba(${190 - layer * 24}, ${226 - layer * 12}, 255, ${twinkle * (0.85 - layer * 0.2)})`;
    ctx.fillRect(x, y, size, size);
    if (layer === 0 && index % 9 === 0) {
      fillRadialGlow(ctx, { x: x + 1, y: y + 1 }, 7, [
        [0, `rgba(200, 236, 255, ${twinkle * 0.4})`],
        [1, "rgba(200, 236, 255, 0)"],
      ]);
    }
  }
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const horizon = ctx.createLinearGradient(0, 0, width, 0);
  horizon.addColorStop(0, "rgba(0, 255, 157, 0)");
  horizon.addColorStop(0.28, "rgba(0, 255, 157, 0.16)");
  horizon.addColorStop(0.5, "rgba(91, 214, 255, 0.2)");
  horizon.addColorStop(0.72, "rgba(255, 77, 109, 0.16)");
  horizon.addColorStop(1, "rgba(255, 77, 109, 0)");
  ctx.fillStyle = horizon;
  ctx.fillRect(width * 0.06, height * 0.52 - 1, width * 0.88, 2);
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = horizon;
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 9]);
  ctx.lineDashOffset = -elapsed / 60;
  ctx.beginPath();
  ctx.moveTo(width * 0.08, height * 0.52);
  ctx.lineTo(width * 0.92, height * 0.52);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawVignette(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const vignette = ctx.createRadialGradient(
    width / 2,
    height * 0.52,
    Math.min(width, height) * 0.28,
    width / 2,
    height * 0.52,
    Math.max(width, height) * 0.78,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.62)");
  ctx.save();
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawModuleLights(
  ctx: CanvasRenderingContext2D,
  vessel: CombatCinematicSnapshot["player"],
  side: CombatCinematicSide,
  width: number,
  height: number,
): void {
  for (const currentModule of vessel.modules) {
    const point = getModulePoint(vessel, side, currentModule.id, width, height);
    const intact = currentModule.health > 0;
    const healthRatio = currentModule.maxHealth > 0
      ? clamp(currentModule.health / currentModule.maxHealth)
      : 0;
    const color = side === "player" ? PLAYER_COLOR : ENEMY_COLOR;

    // Уничтоженный модуль теперь показывает drawHullDamage: пробоина с огнём
    // заменяет тусклую точку, и она остаётся до конца боя.
    if (!intact) continue;

    const pulse = healthRatio > 0.45
      ? 1
      : 0.55 + Math.abs(Math.sin(sceneElapsed / 240 + currentModule.id)) * 0.45;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = (0.4 + healthRatio * 0.6) * pulse;
    fillRadialGlow(ctx, point, 11, [
      [0, withAlpha(color, 0.95)],
      [0.4, withAlpha(color, 0.35)],
      [1, withAlpha(color, 0)],
    ]);
    ctx.fillStyle = healthRatio > 0.35 ? "#f4ffff" : "#ffd7a1";
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Пробоина на месте уничтоженного модуля: обугленное пятно, рваная дыра, огонь
 * по кромке и столб дыма. Держится до конца боя — по корпусу видно накопленный
 * урон, а не только текущий кадр.
 */
function drawHullBreach(ctx: CanvasRenderingContext2D, point: Point, seed: number): void {
  ctx.save();
  fillRadialGlow(ctx, point, 24, [
    [0, "rgba(5, 7, 11, 0.95)"],
    [0.5, "rgba(9, 12, 17, 0.62)"],
    [1, "rgba(9, 12, 17, 0)"],
  ]);
  ctx.fillStyle = "#04060a";
  ctx.strokeStyle = "rgba(126, 100, 74, 0.55)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let corner = 0; corner < 9; corner += 1) {
    const angle = (TAU * corner) / 9;
    const radius = 5.5 + pseudoRandom(seed * 3.7 + corner) * 4.5;
    const x = point.x + Math.cos(angle) * radius;
    const y = point.y + Math.sin(angle) * radius * 0.82;
    if (corner === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  const flicker = clamp(
    0.5 +
      Math.sin(sceneElapsed / 92 + seed * 3) * 0.26 +
      Math.sin(sceneElapsed / 39 + seed) * 0.2,
  );
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = flicker;
  fillRadialGlow(ctx, point, 15, [
    [0, "rgba(255, 228, 156, 0.95)"],
    [0.4, "rgba(255, 132, 32, 0.55)"],
    [1, "rgba(255, 88, 0, 0)"],
  ]);
  ctx.restore();

  ctx.save();
  for (let puff = 0; puff < 4; puff += 1) {
    const life = ((sceneElapsed / 1900) + pseudoRandom(seed * 5.3 + puff)) % 1;
    ctx.globalAlpha = (1 - life) * life * 2.4 * 0.55;
    fillRadialGlow(
      ctx,
      {
        x: point.x + (pseudoRandom(seed + puff * 2.7) - 0.5) * 16 + life * 7,
        y: point.y - 4 - life * 56,
      },
      5 + life * 19,
      [
        [0, "rgba(88, 94, 106, 0.6)"],
        [1, "rgba(38, 42, 50, 0)"],
      ],
    );
  }
  ctx.restore();
}

/** Подпалина у изувеченного, но живого модуля — предупреждение до пробоины. */
function drawHullScorch(ctx: CanvasRenderingContext2D, point: Point, seed: number): void {
  ctx.save();
  fillRadialGlow(ctx, point, 15, [
    [0, "rgba(12, 10, 9, 0.62)"],
    [1, "rgba(12, 10, 9, 0)"],
  ]);
  const ember = Math.sin(sceneElapsed / 130 + seed * 2.1);
  if (ember > 0.72) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = (ember - 0.72) * 3;
    fillRadialGlow(ctx, point, 10, [
      [0, "rgba(255, 190, 96, 0.9)"],
      [1, "rgba(255, 120, 0, 0)"],
    ]);
  }
  ctx.restore();
}

/** Отметины на корпусе по всем модулям — рисуются поверх силуэта. */
function drawHullDamage(
  ctx: CanvasRenderingContext2D,
  vessel: CombatCinematicSnapshot["player"],
  side: CombatCinematicSide,
  width: number,
  height: number,
): void {
  for (const currentModule of vessel.modules) {
    const stage = getHullDamageStage(currentModule.health, currentModule.maxHealth);
    if (stage === "intact") continue;
    const point = getModulePoint(vessel, side, currentModule.id, width, height);
    const seed = currentModule.id + (side === "player" ? 0 : 41);
    if (stage === "breached") drawHullBreach(ctx, point, seed);
    else drawHullScorch(ctx, point, seed);
  }
}

function drawHullSmoke(
  ctx: CanvasRenderingContext2D,
  center: Point,
  hullRatio: number,
  seed: number,
): void {
  if (hullRatio >= 0.6) return;
  const intensity = 1 - hullRatio / 0.6;
  const count = Math.round(2 + intensity * 3);
  ctx.save();
  for (let index = 0; index < count; index += 1) {
    const life = ((sceneElapsed / 1600) + pseudoRandom(index * 4.3 + seed)) % 1;
    const point = {
      x: center.x + (pseudoRandom(index * 2.3 + seed) - 0.5) * 110,
      y: center.y - 8 - life * 74 + (pseudoRandom(index * 5.1 + seed) - 0.5) * 24,
    };
    ctx.globalAlpha = (1 - life) * life * 1.6 * intensity;
    fillRadialGlow(ctx, point, 8 + life * 26, [
      [0, "rgba(96, 104, 118, 0.55)"],
      [1, "rgba(40, 44, 52, 0)"],
    ]);
    if (life < 0.28 && intensity > 0.5) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = (0.28 - life) * 3 * intensity;
      fillRadialGlow(ctx, point, 9, [
        [0, "rgba(255, 190, 90, 0.9)"],
        [1, "rgba(255, 120, 0, 0)"],
      ]);
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawEngineFlare(
  ctx: CanvasRenderingContext2D,
  originX: number,
  length: number,
  spread: number,
  color: string,
  seed: number,
): void {
  const flicker = 0.74 +
    Math.sin(sceneElapsed / 68 + seed) * 0.15 +
    Math.sin(sceneElapsed / 27 + seed * 3) * 0.11;
  const reach = length * flicker;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const plume = ctx.createLinearGradient(originX, 0, originX - reach, 0);
  plume.addColorStop(0, withAlpha(color, 0.85));
  plume.addColorStop(0.32, withAlpha(color, 0.34));
  plume.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = plume;
  ctx.beginPath();
  ctx.moveTo(originX, -spread);
  ctx.lineTo(originX - reach, -spread * 0.28);
  ctx.lineTo(originX - reach, spread * 0.28);
  ctx.lineTo(originX, spread);
  ctx.closePath();
  ctx.fill();
  fillRadialGlow(ctx, { x: originX - 3, y: 0 }, spread * 2.4, [
    [0, "rgba(240, 255, 255, 0.75)"],
    [0.4, withAlpha(color, 0.4)],
    [1, withAlpha(color, 0)],
  ]);
  ctx.restore();
}

function drawSelectedModuleTargets(
  ctx: CanvasRenderingContext2D,
  vessel: CombatCinematicSnapshot["enemy"],
  moduleIds: readonly number[],
  active: readonly ActiveCinematicEvent[],
  width: number,
  height: number,
): void {
  const lockedModuleIds = new Set<number>();
  for (const { event } of active) {
    if (
      event.kind === "projectile"
      && event.to === "enemy"
      && event.targetModuleId !== undefined
    ) lockedModuleIds.add(event.targetModuleId);
  }

  for (const moduleId of new Set([...moduleIds, ...lockedModuleIds])) {
    if (!vessel.modules.some((currentModule) => currentModule.id === moduleId)) continue;
    const point = getModulePoint(vessel, "enemy", moduleId, width, height);
    const isLocked = lockedModuleIds.has(moduleId);
    const color = isLocked ? "#dffcff" : "#ffcb57";
    const pulse = 0.5 + Math.sin(sceneElapsed / (isLocked ? 160 : 320)) * 0.5;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = isLocked ? 1.6 : 1.2;
    ctx.shadowColor = color;
    ctx.shadowBlur = (isLocked ? 10 : 8) + pulse * (isLocked ? 8 : 6);
    ctx.globalAlpha = (isLocked ? 0.8 : 0.65) + pulse * (isLocked ? 0.2 : 0.35);
    ctx.save();
    if (!isLocked) {
      ctx.rotate(sceneElapsed / 1400);
      ctx.setLineDash([5, 6]);
    }
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, TAU);
    ctx.stroke();
    ctx.restore();
    const bracket = 9 + pulse * 2;
    for (const [signX, signY] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      ctx.beginPath();
      ctx.moveTo(signX * bracket, signY * (bracket - 4));
      ctx.lineTo(signX * bracket, signY * bracket);
      ctx.lineTo(signX * (bracket - 4), signY * bracket);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawPlayerShip(ctx: CanvasRenderingContext2D, center: Point): void {
  ctx.save();
  ctx.translate(center.x, center.y);
  drawEngineFlare(ctx, -104, 92, 15, PLAYER_COLOR, 0);
  const hull = ctx.createLinearGradient(-105, -55, 140, 55);
  hull.addColorStop(0, "#063941");
  hull.addColorStop(0.55, "#0f7c73");
  hull.addColorStop(1, "#b5ffd8");
  ctx.fillStyle = hull;
  ctx.strokeStyle = PLAYER_COLOR;
  ctx.lineWidth = 2;
  ctx.shadowColor = PLAYER_COLOR;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(-110, -42);
  ctx.lineTo(30, -58);
  ctx.lineTo(142, 0);
  ctx.lineTo(30, 58);
  ctx.lineTo(-110, 42);
  ctx.lineTo(-65, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#ffcb57";
  ctx.beginPath();
  ctx.moveTo(12, -24);
  ctx.lineTo(75, 0);
  ctx.lineTo(12, 24);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#001825";
  ctx.fillRect(-76, -8, 80, 16);

  ctx.globalCompositeOperation = "lighter";
  const rim = ctx.createLinearGradient(-110, -50, 140, 50);
  rim.addColorStop(0, "rgba(0, 255, 157, 0)");
  rim.addColorStop(0.78, "rgba(0, 255, 157, 0.18)");
  rim.addColorStop(1, "rgba(210, 255, 240, 0.5)");
  ctx.strokeStyle = rim;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(30, -58);
  ctx.lineTo(142, 0);
  ctx.lineTo(30, 58);
  ctx.stroke();
  for (const beacon of [{ x: 24, y: -50 }, { x: 24, y: 50 }]) {
    ctx.globalAlpha = 0.35 + Math.abs(Math.sin(sceneElapsed / 420)) * 0.65;
    fillRadialGlow(ctx, beacon, 9, [
      [0, "rgba(255, 255, 255, 0.9)"],
      [1, "rgba(0, 255, 157, 0)"],
    ]);
  }
  ctx.restore();
}

type HullProfile = {
  points: readonly Point[];
  body: string;
  edge: string;
  detail: string;
  engine: Point;
  core: Point;
  engineSize: number;
  enginePower: number;
};

type BossHullProfile = HullProfile & {
  ornament:
    | "rings"
    | "petals"
    | "claws"
    | "scythes"
    | "phase"
    | "ice"
    | "eye"
    | "fracture"
    | "clock"
    | "infinity";
};

const ENEMY_HULL_PROFILES: Partial<
  Record<NonNullable<CombatCinematicSnapshot["enemy"]["enemyType"]>, HullProfile>
> = {
  pirate: {
    points: [{ x: -108, y: -32 }, { x: -20, y: -54 }, { x: 116, y: -14 }, { x: 42, y: 4 }, { x: 122, y: 34 }, { x: -16, y: 52 }, { x: -82, y: 22 }],
    body: "#3b2112", edge: "#ff9f43", detail: "#ffd28a", engine: { x: -98, y: 16 }, core: { x: 54, y: 8 }, engineSize: 12, enginePower: 1.4,
  },
  raider: {
    points: [{ x: -104, y: -24 }, { x: 38, y: -40 }, { x: 138, y: 0 }, { x: 38, y: 40 }, { x: -104, y: 24 }, { x: -44, y: 0 }],
    body: "#3a0d22", edge: "#ff4566", detail: "#ffb1c0", engine: { x: -94, y: 0 }, core: { x: 86, y: 0 }, engineSize: 12, enginePower: 1.9,
  },
  mercenary: {
    points: [{ x: -94, y: -48 }, { x: 54, y: -48 }, { x: 116, y: -18 }, { x: 116, y: 18 }, { x: 54, y: 48 }, { x: -94, y: 48 }, { x: -54, y: 0 }],
    body: "#102b41", edge: "#5bd6ff", detail: "#d8f5ff", engine: { x: -90, y: 0 }, core: { x: 62, y: 0 }, engineSize: 13, enginePower: 1.45,
  },
  marauder: {
    points: [{ x: -116, y: -42 }, { x: -18, y: -58 }, { x: 82, y: -42 }, { x: 132, y: -12 }, { x: 72, y: 0 }, { x: 132, y: 18 }, { x: 82, y: 46 }, { x: -18, y: 58 }, { x: -116, y: 42 }, { x: -64, y: 0 }],
    body: "#382314", edge: "#ff8c42", detail: "#ffd166", engine: { x: -106, y: 0 }, core: { x: 78, y: 0 }, engineSize: 14, enginePower: 1.5,
  },
  human_guard: {
    points: [{ x: -102, y: -38 }, { x: 36, y: -52 }, { x: 126, y: 0 }, { x: 36, y: 52 }, { x: -102, y: 38 }, { x: -66, y: 0 }],
    body: "#18334a", edge: "#45e6a6", detail: "#d6fff1", engine: { x: -94, y: 0 }, core: { x: 64, y: 0 }, engineSize: 12, enginePower: 1.3,
  },
  synthetic_guard: {
    points: [{ x: -110, y: -54 }, { x: 82, y: -54 }, { x: 122, y: -20 }, { x: 122, y: 20 }, { x: 82, y: 54 }, { x: -110, y: 54 }, { x: -80, y: 0 }],
    body: "#1a2842", edge: "#67e8f9", detail: "#e0fbff", engine: { x: -102, y: 0 }, core: { x: 72, y: 0 }, engineSize: 14, enginePower: 1.15,
  },
  xenosymbiont_guard: {
    points: [{ x: -96, y: -26 }, { x: -18, y: -58 }, { x: 86, y: -44 }, { x: 130, y: 0 }, { x: 86, y: 44 }, { x: -18, y: 58 }, { x: -96, y: 26 }, { x: -48, y: 0 }],
    body: "#342047", edge: "#d8b4fe", detail: "#f5d0fe", engine: { x: -88, y: 0 }, core: { x: 44, y: 0 }, engineSize: 12, enginePower: 1.25,
  },
  krylorian_guard: {
    points: [{ x: -112, y: -24 }, { x: -8, y: -62 }, { x: 112, y: -28 }, { x: 144, y: 0 }, { x: 112, y: 28 }, { x: -8, y: 62 }, { x: -112, y: 24 }, { x: -54, y: 0 }],
    body: "#402513", edge: "#facc15", detail: "#fff7b3", engine: { x: -104, y: 0 }, core: { x: 86, y: 0 }, engineSize: 13, enginePower: 1.8,
  },
  voidborn_guard: {
    points: [{ x: -114, y: -38 }, { x: 12, y: -60 }, { x: 104, y: -34 }, { x: 62, y: 0 }, { x: 104, y: 34 }, { x: 12, y: 60 }, { x: -114, y: 38 }, { x: -76, y: 0 }],
    body: "#171535", edge: "#8b5cf6", detail: "#c4b5fd", engine: { x: -106, y: 0 }, core: { x: 54, y: 0 }, engineSize: 13, enginePower: 1.45,
  },
  crystalline_guard: {
    points: [{ x: -100, y: -52 }, { x: 18, y: -64 }, { x: 116, y: -24 }, { x: 136, y: 0 }, { x: 116, y: 24 }, { x: 18, y: 64 }, { x: -100, y: 52 }, { x: -60, y: 0 }],
    body: "#173044", edge: "#a5f3fc", detail: "#ecfeff", engine: { x: -92, y: 0 }, core: { x: 58, y: 0 }, engineSize: 14, enginePower: 1.05,
  },
};

const BOSS_HULL_PROFILES: Record<string, BossHullProfile> = {
  guardian_sentinel: {
    points: [{ x: -136, y: -54 }, { x: -36, y: -78 }, { x: 72, y: -48 }, { x: 150, y: 0 }, { x: 72, y: 48 }, { x: -36, y: 78 }, { x: -136, y: 54 }, { x: -88, y: 0 }],
    body: "#342818", edge: "#ffcc55", detail: "#fff0b0", engine: { x: -126, y: 0 }, core: { x: 88, y: 0 }, engineSize: 19, enginePower: 2.8, ornament: "rings",
  },
  nova_stalker: {
    points: [{ x: -144, y: 0 }, { x: -24, y: -72 }, { x: 124, y: -26 }, { x: 154, y: 0 }, { x: 124, y: 26 }, { x: -24, y: 72 }],
    body: "#461713", edge: "#ff7a45", detail: "#ffe1a3", engine: { x: -126, y: 0 }, core: { x: 68, y: 0 }, engineSize: 18, enginePower: 3.1, ornament: "petals",
  },
  void_leech: {
    points: [{ x: -122, y: -62 }, { x: 12, y: -74 }, { x: 134, y: -24 }, { x: 82, y: 0 }, { x: 134, y: 24 }, { x: 12, y: 74 }, { x: -122, y: 62 }, { x: -72, y: 0 }],
    body: "#311242", edge: "#d946ef", detail: "#f5d0fe", engine: { x: -114, y: 0 }, core: { x: 48, y: 0 }, engineSize: 18, enginePower: 2.5, ornament: "claws",
  },
  harvester_prime: {
    points: [{ x: -150, y: -46 }, { x: -38, y: -74 }, { x: 30, y: -30 }, { x: 150, y: -62 }, { x: 116, y: 0 }, { x: 150, y: 62 }, { x: 30, y: 30 }, { x: -38, y: 74 }, { x: -150, y: 46 }, { x: -92, y: 0 }],
    body: "#1f3b2b", edge: "#a3e635", detail: "#ecfccb", engine: { x: -140, y: 0 }, core: { x: 46, y: 0 }, engineSize: 20, enginePower: 2.4, ornament: "scythes",
  },
  phase_hunter: {
    points: [{ x: -136, y: 0 }, { x: -20, y: -76 }, { x: 132, y: 0 }, { x: -20, y: 76 }],
    body: "#172c4b", edge: "#67e8f9", detail: "#cffafe", engine: { x: -124, y: 0 }, core: { x: 66, y: 0 }, engineSize: 19, enginePower: 3.2, ornament: "phase",
  },
  cryo_reaver: {
    points: [{ x: -128, y: -64 }, { x: 28, y: -80 }, { x: 150, y: 0 }, { x: 28, y: 80 }, { x: -128, y: 64 }, { x: -78, y: 0 }],
    body: "#183d58", edge: "#a5f3fc", detail: "#ecfeff", engine: { x: -118, y: 0 }, core: { x: 78, y: 0 }, engineSize: 20, enginePower: 1.9, ornament: "ice",
  },
  void_oracle: {
    points: [{ x: -108, y: -66 }, { x: 34, y: -82 }, { x: 136, y: -34 }, { x: 158, y: 0 }, { x: 136, y: 34 }, { x: 34, y: 82 }, { x: -108, y: 66 }, { x: -70, y: 0 }],
    body: "#281342", edge: "#c084fc", detail: "#f5d0fe", engine: { x: -98, y: 0 }, core: { x: 52, y: 0 }, engineSize: 20, enginePower: 2.7, ornament: "eye",
  },
  nexus_destroyer: {
    points: [{ x: -142, y: -48 }, { x: 32, y: -48 }, { x: 32, y: -78 }, { x: 130, y: -78 }, { x: 158, y: 0 }, { x: 130, y: 78 }, { x: 32, y: 78 }, { x: 32, y: 48 }, { x: -142, y: 48 }, { x: -92, y: 0 }],
    body: "#48152e", edge: "#fb7185", detail: "#fecdd3", engine: { x: -132, y: 0 }, core: { x: 86, y: 0 }, engineSize: 20, enginePower: 2.9, ornament: "fracture",
  },
  chronos_warden: {
    points: [{ x: -122, y: -70 }, { x: 8, y: -84 }, { x: 126, y: -46 }, { x: 158, y: 0 }, { x: 126, y: 46 }, { x: 8, y: 84 }, { x: -122, y: 70 }, { x: -84, y: 0 }],
    body: "#173c48", edge: "#67e8f9", detail: "#fef3c7", engine: { x: -112, y: 0 }, core: { x: 50, y: 0 }, engineSize: 21, enginePower: 2.2, ornament: "clock",
  },
  the_eternal: {
    points: [{ x: -150, y: -58 }, { x: -54, y: -82 }, { x: 14, y: -44 }, { x: 92, y: -74 }, { x: 164, y: 0 }, { x: 92, y: 74 }, { x: 14, y: 44 }, { x: -54, y: 82 }, { x: -150, y: 58 }, { x: -100, y: 0 }],
    body: "#250d3a", edge: "#f472b6", detail: "#f5d0fe", engine: { x: -140, y: 0 }, core: { x: 76, y: 0 }, engineSize: 22, enginePower: 3.5, ornament: "infinity",
  },
};

function drawHullPolygon(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
): void {
  const [firstPoint, ...rest] = points;
  if (!firstPoint) return;
  ctx.beginPath();
  ctx.moveTo(firstPoint.x, firstPoint.y);
  for (const point of rest) ctx.lineTo(point.x, point.y);
  ctx.closePath();
}

function drawProfileCore(
  ctx: CanvasRenderingContext2D,
  profile: HullProfile,
  pulse: number,
): void {
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = pulse;
  fillRadialGlow(ctx, profile.core, 15 + pulse * 9, [
    [0, withAlpha(profile.detail, 0.9)],
    [1, withAlpha(profile.edge, 0)],
  ]);
}

function drawDefaultEnemyShip(ctx: CanvasRenderingContext2D, center: Point): void {
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.scale(-1, 1);
  drawEngineFlare(ctx, -96, 78, 13, ENEMY_COLOR, 1.7);
  const hull = ctx.createLinearGradient(-100, -50, 135, 50);
  hull.addColorStop(0, "#2f0d24");
  hull.addColorStop(0.55, "#95284a");
  hull.addColorStop(1, "#ffc1ce");
  ctx.fillStyle = hull;
  ctx.strokeStyle = ENEMY_COLOR;
  ctx.lineWidth = 2;
  ctx.shadowColor = ENEMY_COLOR;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(-100, -37);
  ctx.lineTo(44, -53);
  ctx.lineTo(132, 0);
  ctx.lineTo(44, 53);
  ctx.lineTo(-100, 37);
  ctx.lineTo(-50, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#ffb4c1";
  ctx.beginPath();
  ctx.moveTo(-42, 0);
  ctx.lineTo(70, 0);
  ctx.stroke();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.4 + Math.abs(Math.sin(sceneElapsed / 560 + 1.2)) * 0.6;
  fillRadialGlow(ctx, { x: 86, y: 0 }, 14, [
    [0, "rgba(255, 220, 230, 0.85)"],
    [1, "rgba(255, 77, 109, 0)"],
  ]);
  ctx.restore();
}

function drawEnemyShip(
  ctx: CanvasRenderingContext2D,
  center: Point,
  enemyType?: CombatCinematicSnapshot["enemy"]["enemyType"],
): void {
  const profile = enemyType ? ENEMY_HULL_PROFILES[enemyType] : undefined;
  if (!profile) {
    drawDefaultEnemyShip(ctx, center);
    return;
  }

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.scale(-1, 1);
  drawEngineFlare(ctx, profile.engine.x, profile.engine.y, profile.engineSize, profile.edge, profile.enginePower);
  ctx.fillStyle = profile.body;
  ctx.strokeStyle = profile.edge;
  ctx.lineWidth = 2;
  ctx.shadowColor = profile.edge;
  ctx.shadowBlur = 13;
  drawHullPolygon(ctx, profile.points);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = profile.detail;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-36, 0);
  ctx.lineTo(profile.core.x + 12, profile.core.y);
  ctx.stroke();
  drawProfileCore(ctx, profile, 0.42 + Math.abs(Math.sin(sceneElapsed / 560 + 1.2)) * 0.58);
  ctx.restore();
}

function drawDefaultBossShip(ctx: CanvasRenderingContext2D, center: Point): void {
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.scale(-1, 1);
  drawEngineFlare(ctx, -126, 110, 20, "#ff4dff", 3.4);
  ctx.strokeStyle = "#ff4dff";
  ctx.fillStyle = "#2b0a42";
  ctx.lineWidth = 2.5;
  ctx.shadowColor = "#ff4dff";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(-130, -58);
  ctx.lineTo(-18, -73);
  ctx.lineTo(70, -48);
  ctx.lineTo(148, 0);
  ctx.lineTo(70, 48);
  ctx.lineTo(-18, 73);
  ctx.lineTo(-130, 58);
  ctx.lineTo(-88, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#ffb6ff";
  ctx.lineWidth = 1;
  for (const offset of [-34, 0, 34]) {
    ctx.beginPath();
    ctx.ellipse(10, offset, 54, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "#ffcc55";
  ctx.fillRect(72, -10, 34, 20);
  ctx.globalCompositeOperation = "lighter";
  const charge = 0.35 + Math.abs(Math.sin(sceneElapsed / 700)) * 0.65;
  ctx.globalAlpha = charge;
  fillRadialGlow(ctx, { x: 106, y: 0 }, 26 * charge, [
    [0, "rgba(255, 245, 210, 0.9)"],
    [0.45, "rgba(255, 77, 255, 0.4)"],
    [1, "rgba(255, 77, 255, 0)"],
  ]);
  ctx.restore();
}

function drawBossOrnament(
  ctx: CanvasRenderingContext2D,
  ornament: BossHullProfile["ornament"],
  color: string,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  switch (ornament) {
    case "rings":
      for (const offset of [-30, 0, 30]) ctx.ellipse(6, offset, 48, 10, 0, 0, TAU);
      break;
    case "petals":
      for (const angle of [-0.7, 0, 0.7]) {
        ctx.moveTo(-8, 0);
        ctx.lineTo(82 * Math.cos(angle), 62 * Math.sin(angle));
      }
      break;
    case "claws":
      for (const y of [-38, 0, 38]) {
        ctx.moveTo(8, y);
        ctx.bezierCurveTo(62, y - 26, 86, y + 26, 122, y);
      }
      break;
    case "scythes":
      ctx.arc(24, -34, 42, -0.8, 1.2);
      ctx.moveTo(24, 34);
      ctx.arc(24, 34, 42, -1.2, 0.8);
      break;
    case "phase":
      ctx.rect(-18, -28, 70, 56);
      ctx.moveTo(0, -48);
      ctx.lineTo(78, 0);
      ctx.lineTo(0, 48);
      break;
    case "ice":
      for (const y of [-34, 0, 34]) {
        ctx.moveTo(-28, y);
        ctx.lineTo(64, y - 18);
        ctx.lineTo(100, y);
      }
      break;
    case "eye":
      ctx.ellipse(36, 0, 48, 24, 0, 0, TAU);
      ctx.moveTo(36, -24);
      ctx.lineTo(36, 24);
      break;
    case "fracture":
      ctx.moveTo(-54, -36);
      ctx.lineTo(18, 0);
      ctx.lineTo(-16, 42);
      ctx.moveTo(18, 0);
      ctx.lineTo(104, -38);
      break;
    case "clock":
      ctx.arc(26, 0, 38, 0, TAU);
      for (let index = 0; index < 6; index += 1) {
        const angle = (index / 6) * TAU;
        ctx.moveTo(26, 0);
        ctx.lineTo(26 + Math.cos(angle) * 48, Math.sin(angle) * 48);
      }
      break;
    case "infinity":
      ctx.ellipse(8, 0, 34, 20, 0, 0, TAU);
      ctx.moveTo(8, 0);
      ctx.ellipse(64, 0, 34, 20, 0, 0, TAU);
      break;
  }
  ctx.stroke();
}

function drawBossShip(
  ctx: CanvasRenderingContext2D,
  center: Point,
  bossId?: CombatCinematicSnapshot["enemy"]["bossId"],
): void {
  const profile = bossId ? BOSS_HULL_PROFILES[bossId] : undefined;
  if (!profile) {
    drawDefaultBossShip(ctx, center);
    return;
  }

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.scale(-1, 1);
  drawEngineFlare(ctx, profile.engine.x, profile.engine.y, profile.engineSize, profile.edge, profile.enginePower);
  ctx.fillStyle = profile.body;
  ctx.strokeStyle = profile.edge;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = profile.edge;
  ctx.shadowBlur = 18;
  drawHullPolygon(ctx, profile.points);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.beginPath();
  drawBossOrnament(ctx, profile.ornament, profile.detail);
  drawProfileCore(ctx, profile, 0.4 + Math.abs(Math.sin(sceneElapsed / 700)) * 0.6);
  ctx.restore();
}

function drawDefaultCreature(ctx: CanvasRenderingContext2D, center: Point, elapsed: number): void {
  const breath = 1 + Math.sin(elapsed / 620) * 0.045;
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  fillRadialGlow(ctx, { x: 0, y: 0 }, 130 * breath, [
    [0, "rgba(192, 132, 252, 0.28)"],
    [0.5, "rgba(192, 132, 252, 0.1)"],
    [1, "rgba(192, 132, 252, 0)"],
  ]);
  ctx.restore();
  ctx.save();
  ctx.scale(breath, 2 - breath);
  ctx.fillStyle = "#29134a";
  ctx.strokeStyle = "#c084fc";
  ctx.lineWidth = 2;
  ctx.shadowColor = "#c084fc";
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.ellipse(0, 0, 82, 58, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = "#67e8f9";
  ctx.lineWidth = 3;
  for (let index = 0; index < 5; index += 1) {
    const y = -42 + index * 21;
    const wave = Math.sin(elapsed / 300 + index) * 12;
    ctx.beginPath();
    ctx.moveTo(35, y);
    ctx.bezierCurveTo(86, y - 28, 104, y + 28, 135, y + wave);
    ctx.stroke();
  }
  ctx.fillStyle = "#efffbb";
  for (const point of [{ x: 18, y: -16 }, { x: 36, y: 8 }, { x: 3, y: 21 }]) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawVoidRay(ctx: CanvasRenderingContext2D, center: Point, elapsed: number): void {
  const drift = Math.sin(elapsed / 520) * 8;
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.globalCompositeOperation = "lighter";
  fillRadialGlow(ctx, { x: -8, y: 0 }, 138, [
    [0, "rgba(91, 33, 182, 0.36)"],
    [1, "rgba(91, 33, 182, 0)"],
  ]);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#1e1748";
  ctx.strokeStyle = "#a78bfa";
  ctx.lineWidth = 2.5;
  ctx.shadowColor = "#a78bfa";
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.moveTo(-96, 0);
  ctx.quadraticCurveTo(-22, -72, 80, -46);
  ctx.quadraticCurveTo(126, 0, 80, 46);
  ctx.quadraticCurveTo(-22, 72, -96, 0);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#67e8f9";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-28, 0);
  ctx.bezierCurveTo(58, -20, 74, 34, 148, drift);
  ctx.stroke();
  for (const point of [{ x: 20, y: -16 }, { x: 20, y: 16 }]) {
    fillRadialGlow(ctx, point, 9, [[0, "rgba(240, 249, 255, 0.95)"], [1, "rgba(103, 232, 249, 0)"]]);
  }
  ctx.restore();
}

function drawNebulaManta(ctx: CanvasRenderingContext2D, center: Point, elapsed: number): void {
  const breath = 1 + Math.sin(elapsed / 680) * 0.06;
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.scale(breath, 2 - breath);
  ctx.globalCompositeOperation = "lighter";
  fillRadialGlow(ctx, { x: 0, y: 0 }, 150, [
    [0, "rgba(45, 212, 191, 0.25)"],
    [0.55, "rgba(167, 139, 250, 0.16)"],
    [1, "rgba(45, 212, 191, 0)"],
  ]);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#173447";
  ctx.strokeStyle = "#5eead4";
  ctx.lineWidth = 2.5;
  ctx.shadowColor = "#5eead4";
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.moveTo(-114, 0);
  ctx.quadraticCurveTo(-52, -78, 8, -38);
  ctx.quadraticCurveTo(66, -80, 128, -12);
  ctx.quadraticCurveTo(66, 80, 8, 38);
  ctx.quadraticCurveTo(-52, 78, -114, 0);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#d8b4fe";
  for (const point of [{ x: -30, y: -26 }, { x: 18, y: 0 }, { x: -30, y: 26 }]) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 7, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlasmaLeviathan(ctx: CanvasRenderingContext2D, center: Point, elapsed: number): void {
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.globalCompositeOperation = "lighter";
  fillRadialGlow(ctx, { x: 0, y: 0 }, 150, [
    [0, "rgba(251, 146, 60, 0.3)"],
    [1, "rgba(251, 146, 60, 0)"],
  ]);
  ctx.globalCompositeOperation = "source-over";
  for (let index = 0; index < 6; index += 1) {
    const x = -92 + index * 38;
    const y = Math.sin(elapsed / 360 + index * 0.78) * 20;
    const radius = 30 - index * 2;
    ctx.fillStyle = index === 0 ? "#7c2d12" : "#9a3412";
    ctx.strokeStyle = "#fb923c";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#fb923c";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * 0.64, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fef3c7";
  for (const y of [-10, 10]) {
    ctx.beginPath();
    ctx.arc(-78, y, 4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawCrystalHydra(ctx: CanvasRenderingContext2D, center: Point, elapsed: number): void {
  const sway = Math.sin(elapsed / 430) * 12;
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.globalCompositeOperation = "lighter";
  fillRadialGlow(ctx, { x: 0, y: 0 }, 145, [
    [0, "rgba(103, 232, 249, 0.32)"],
    [1, "rgba(103, 232, 249, 0)"],
  ]);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#164e63";
  ctx.strokeStyle = "#67e8f9";
  ctx.lineWidth = 2.5;
  ctx.shadowColor = "#67e8f9";
  ctx.shadowBlur = 15;
  drawHullPolygon(ctx, [
    { x: -94, y: 0 }, { x: -28, y: -58 }, { x: 58, y: -46 }, { x: 108, y: 0 },
    { x: 58, y: 46 }, { x: -28, y: 58 },
  ]);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#cffafe";
  for (const y of [-34, 0, 34]) {
    ctx.beginPath();
    ctx.moveTo(26, 0);
    ctx.bezierCurveTo(70, y, 84, y + sway, 132, y);
    ctx.stroke();
    ctx.fillStyle = "#ecfeff";
    ctx.beginPath();
    ctx.arc(132, y, 8, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawEmberWisp(ctx: CanvasRenderingContext2D, center: Point, elapsed: number): void {
  const pulse = 0.55 + Math.abs(Math.sin(elapsed / 310)) * 0.45;
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.globalCompositeOperation = "lighter";
  fillRadialGlow(ctx, { x: 0, y: 0 }, 132 * pulse, [
    [0, "rgba(255, 204, 85, 0.52)"],
    [0.42, "rgba(251, 146, 60, 0.25)"],
    [1, "rgba(251, 146, 60, 0)"],
  ]);
  ctx.fillStyle = "#fb923c";
  ctx.shadowColor = "#fef3c7";
  ctx.shadowBlur = 20;
  for (let index = 0; index < 5; index += 1) {
    const angle = elapsed / 720 + (index / 5) * TAU;
    const point = { x: Math.cos(angle) * 42, y: Math.sin(angle) * 30 };
    ctx.beginPath();
    ctx.arc(point.x, point.y, 8 + (index % 2) * 3, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = "#fff7b3";
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawBinaryWyrm(ctx: CanvasRenderingContext2D, center: Point, elapsed: number): void {
  const wave = Math.sin(elapsed / 460) * 12;
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.globalCompositeOperation = "lighter";
  fillRadialGlow(ctx, { x: 0, y: 0 }, 145, [
    [0, "rgba(108, 92, 231, 0.3)"],
    [1, "rgba(108, 92, 231, 0)"],
  ]);
  ctx.strokeStyle = "#a78bfa";
  ctx.lineWidth = 11;
  ctx.lineCap = "round";
  ctx.shadowColor = "#a78bfa";
  ctx.shadowBlur = 16;
  for (const offset of [-22, 22]) {
    ctx.beginPath();
    ctx.moveTo(-112, offset);
    ctx.bezierCurveTo(-44, offset - 52, 12, offset + 52 + wave, 108, offset + wave);
    ctx.stroke();
    ctx.fillStyle = "#ede9fe";
    ctx.beginPath();
    ctx.arc(108, offset + wave, 10, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawCreature(
  ctx: CanvasRenderingContext2D,
  center: Point,
  elapsed: number,
  spaceMonsterType?: CombatCinematicSnapshot["enemy"]["spaceMonsterType"],
): void {
  switch (spaceMonsterType) {
    case "void_ray":
      drawVoidRay(ctx, center, elapsed);
      return;
    case "nebula_manta":
      drawNebulaManta(ctx, center, elapsed);
      return;
    case "plasma_leviathan":
      drawPlasmaLeviathan(ctx, center, elapsed);
      return;
    case "crystal_hydra":
      drawCrystalHydra(ctx, center, elapsed);
      return;
    case "ember_wisp":
      drawEmberWisp(ctx, center, elapsed);
      return;
    case "binary_wyrm":
      drawBinaryWyrm(ctx, center, elapsed);
      return;
    default:
      drawDefaultCreature(ctx, center, elapsed);
  }
}

function drawShip(
  ctx: CanvasRenderingContext2D,
  vessel: CombatCinematicSnapshot["player"],
  side: CombatCinematicSide,
  width: number,
  height: number,
  elapsed: number,
): void {
  const center = shipCenter(side, width, height);
  const roll = Math.sin(elapsed / 1900 + (side === "player" ? 0 : 1.4)) * 0.022;
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(roll);
  ctx.translate(-center.x, -center.y);
  if (vessel.kind === "boss") drawBossShip(ctx, center, vessel.bossId);
  else if (vessel.kind === "creature") drawCreature(ctx, center, elapsed, vessel.spaceMonsterType);
  else if (side === "player") drawPlayerShip(ctx, center);
  else drawEnemyShip(ctx, center, vessel.enemyType);
  ctx.restore();
  drawHullDamage(ctx, vessel, side, width, height);
  drawModuleLights(ctx, vessel, side, width, height);
  drawHullSmoke(ctx, center, getHullRatio(vessel), side === "player" ? 0 : 17);
}

function drawShipBars(
  ctx: CanvasRenderingContext2D,
  vessel: CombatCinematicSnapshot["player"],
  side: CombatCinematicSide,
  width: number,
  height: number,
): void {
  const center = shipCenter(side, width, height);
  const hull = vessel.modules.reduce((total, currentModule) => total + currentModule.health, 0);
  const maxHull = vessel.modules.reduce((total, currentModule) => total + currentModule.maxHealth, 0);
  const x = center.x - 74;
  const y = center.y + 95;
  const drawBar = (value: number, max: number, color: string, offset: number) => {
    const ratio = max > 0 ? clamp(value / max) : 0;
    const critical = ratio > 0 && ratio < 0.3;
    const pulse = critical ? 0.55 + Math.abs(Math.sin(sceneElapsed / 300)) * 0.45 : 1;
    ctx.save();
    ctx.fillStyle = "rgba(4, 10, 19, 0.88)";
    ctx.fillRect(x - 1, y + offset - 1, 150, 7);
    ctx.strokeStyle = "rgba(126, 176, 208, 0.32)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 0.5, y + offset - 0.5, 149, 6);
    if (ratio > 0) {
      const fill = ctx.createLinearGradient(x, 0, x + 148, 0);
      fill.addColorStop(0, withAlpha(color, 0.5));
      fill.addColorStop(0.7, color);
      fill.addColorStop(1, "#ffffff");
      ctx.globalAlpha = pulse;
      ctx.fillStyle = fill;
      ctx.shadowColor = color;
      ctx.shadowBlur = critical ? 12 : 7;
      ctx.fillRect(x, y + offset, 148 * ratio, 5);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(4, 10, 19, 0.6)";
    for (let index = 1; index < 8; index += 1) {
      ctx.fillRect(x + (148 / 8) * index, y + offset, 1, 5);
    }
    ctx.restore();
  };
  drawBar(vessel.shields, vessel.maxShields, SHIELD_COLOR, 0);
  drawBar(hull, maxHull, side === "player" ? PLAYER_COLOR : ENEMY_COLOR, 11);
}

function drawShield(
  ctx: CanvasRenderingContext2D,
  center: Point,
  progress: number,
  isBoss: boolean,
  sceneWidth: number,
): void {
  const pulse = Math.sin(clamp(progress) * Math.PI);
  const scale = 0.86 + pulse * 0.17;
  const radii = getShieldRadii(isBoss, sceneWidth);
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.scale(scale, scale);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.25 + pulse * 0.65;

  const wash = ctx.createRadialGradient(0, 0, radii.y * 0.55, 0, 0, radii.x);
  wash.addColorStop(0, "rgba(91, 214, 255, 0)");
  wash.addColorStop(0.82, `rgba(91, 214, 255, ${0.05 + pulse * 0.14})`);
  wash.addColorStop(1, "rgba(91, 214, 255, 0)");
  ctx.fillStyle = wash;
  ctx.beginPath();
  ctx.ellipse(0, 0, radii.x, radii.y, 0, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = SHIELD_COLOR;
  ctx.lineWidth = isBoss ? 4 : 3;
  ctx.shadowColor = SHIELD_COLOR;
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.ellipse(0, 0, radii.x, radii.y, 0, 0, TAU);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.globalAlpha *= 0.75;
  ctx.strokeStyle = "#dff6ff";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, radii.x * 0.93, radii.y * 0.93, 0, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  const sweep = sceneElapsed / 340;
  ctx.ellipse(0, 0, radii.x, radii.y, 0, sweep, sweep + 0.7);
  ctx.stroke();
  ctx.restore();
}

/** Пульсация щита в пике раздувает эллипс — запас берётся по ней. */
const SHIELD_PULSE_PEAK_SCALE = 1.03;

/**
 * Радиусы щита. Ширина сцены всегда около 640, а корабли стоят на 0.25/0.75 —
 * то есть от центра до края всего ~160. Щит босса (166) вылезал за кадр и в
 * пике пульсации срезался прямым краем канваса, на любом экране.
 */
function getShieldRadii(isBoss: boolean, sceneWidth: number): Point {
  const base = isBoss ? { x: 166, y: 100 } : { x: 148, y: 86 };
  const roomToEdge = sceneWidth * 0.25 - 6;
  return { x: Math.min(base.x, roomToEdge / SHIELD_PULSE_PEAK_SCALE), y: base.y };
}

function drawLaser(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  color: string,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

function drawOrb(
  ctx: CanvasRenderingContext2D,
  point: Point,
  color: string,
  radius: number,
): void {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  fillRadialGlow(ctx, point, radius * 3.4, [
    [0, withAlpha(color, 0.95)],
    [0.32, withAlpha(color, 0.42)],
    [1, withAlpha(color, 0)],
  ]);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius * 0.45, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawProjectileTrail(
  ctx: CanvasRenderingContext2D,
  event: CombatProjectileEvent,
  source: Point,
  shieldImpact: Point,
  destination: Point,
  travel: number,
  color: string,
): void {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let step = 1; step <= 7; step += 1) {
    const behind = travel - step * 0.035;
    if (behind <= 0) break;
    const point = getProjectilePathPoint(
      source,
      shieldImpact,
      destination,
      event.outcome,
      behind,
    );
    ctx.globalAlpha = (1 - step / 8) * 0.4;
    fillRadialGlow(ctx, point, 11 - step, [
      [0, withAlpha(color, 0.8)],
      [1, withAlpha(color, 0)],
    ]);
  }
  ctx.restore();
}

function drawMuzzleFlash(
  ctx: CanvasRenderingContext2D,
  source: Point,
  direction: number,
  color: string,
  progress: number,
): void {
  const flash = 1 - clamp(progress / 0.16);
  if (flash <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = flash;
  fillRadialGlow(ctx, source, 12 + flash * 30, [
    [0, "rgba(255, 255, 255, 0.9)"],
    [0.3, withAlpha(color, 0.55)],
    [1, withAlpha(color, 0)],
  ]);
  ctx.translate(source.x, source.y);
  ctx.scale(direction, 1);
  ctx.fillStyle = withAlpha(color, 0.7 * flash);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(34 * flash, -9 * flash);
  ctx.lineTo(46 * flash, 0);
  ctx.lineTo(34 * flash, 9 * flash);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** The defender's counter-missile meets the incoming shot at this point of the event. */
const INTERCEPT_PROGRESS = 0.48;
/** How far along its path the incoming shot gets before it is killed. */
const INTERCEPT_TRAVEL = 0.52;
const INTERCEPT_COLOR = "#ffb000";

function drawInterceptor(
  ctx: CanvasRenderingContext2D,
  launchPoint: Point,
  meetPoint: Point,
  flight: number,
): void {
  if (flight >= 1) return;
  const eased = flight * flight * (3 - 2 * flight);
  const point = {
    x: lerp(launchPoint.x, meetPoint.x, eased),
    y: lerp(launchPoint.y, meetPoint.y, eased) - Math.sin(eased * Math.PI) * 26,
  };

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let step = 1; step <= 6; step += 1) {
    const behind = eased - step * 0.05;
    if (behind <= 0) break;
    ctx.globalAlpha = (1 - step / 7) * 0.45;
    fillRadialGlow(
      ctx,
      {
        x: lerp(launchPoint.x, meetPoint.x, behind),
        y: lerp(launchPoint.y, meetPoint.y, behind) - Math.sin(behind * Math.PI) * 26,
      },
      10 - step,
      [
        [0, "rgba(255, 214, 150, 0.85)"],
        [1, "rgba(255, 176, 0, 0)"],
      ],
    );
  }
  ctx.restore();

  drawRocket(ctx, launchPoint, point, INTERCEPT_COLOR, flight);
  drawMuzzleFlash(
    ctx,
    launchPoint,
    meetPoint.x >= launchPoint.x ? 1 : -1,
    INTERCEPT_COLOR,
    flight * 1.4,
  );
}

function drawCombatLaser(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  color: string,
  progress: number,
): void {
  const flicker = 1 + Math.sin(sceneElapsed / 24) * 0.12;
  const muzzleCharge = 2 + Math.sin(progress * Math.PI) * 3;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.globalAlpha = (0.18 + progress * 0.24) * flicker;
  ctx.strokeStyle = color;
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.globalAlpha = (0.42 + progress * 0.4) * flicker;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.globalAlpha = 0.95;
  ctx.strokeStyle = "#f6ffff";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
  drawOrb(ctx, to, color, 3 + Math.sin(progress * Math.PI) * 2);
  drawOrb(ctx, from, color, muzzleCharge);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.68;
  ctx.strokeStyle = "#f6ffff";
  ctx.lineWidth = 1;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(from.x, from.y, muzzleCharge + 2, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawKineticTracer(
  ctx: CanvasRenderingContext2D,
  from: Point,
  point: Point,
  color: string,
): void {
  const angle = Math.atan2(point.y - from.y, point.x - from.x);
  const mechanicalBurst = 2 + Math.sin(sceneElapsed / 12) * 0.7;
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(angle);
  const trail = ctx.createLinearGradient(-24, 0, 5, 0);
  trail.addColorStop(0, "rgba(255, 211, 128, 0)");
  trail.addColorStop(0.7, color);
  trail.addColorStop(1, "#fff7df");
  ctx.strokeStyle = trail;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 9;
  ctx.beginPath();
  ctx.moveTo(-24, 0);
  ctx.lineTo(5, 0);
  ctx.stroke();
  ctx.fillStyle = "#fff7df";
  ctx.fillRect(-1, -2, 8, 4);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = "#fff7df";
  ctx.fillRect(-7, -mechanicalBurst / 2, 3, mechanicalBurst);
  ctx.restore();
  ctx.restore();
}

function drawRocket(
  ctx: CanvasRenderingContext2D,
  from: Point,
  point: Point,
  color: string,
  travel: number,
): void {
  const angle = Math.atan2(point.y - from.y, point.x - from.x);
  const smokeAlpha = Math.max(0, 0.34 - travel * 0.14);
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(angle);
  ctx.strokeStyle = "rgba(255, 222, 170, 0.72)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-26, 0);
  ctx.lineTo(-6, 0);
  ctx.stroke();
  ctx.fillStyle = "#fff1d2";
  ctx.beginPath();
  ctx.moveTo(9, 0);
  ctx.lineTo(-7, -5);
  ctx.lineTo(-7, 5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(-8, -3, 9, 6);
  ctx.fillStyle = `rgba(255, 170, 66, ${0.45 + Math.sin(travel * 18) * 0.25})`;
  ctx.beginPath();
  ctx.moveTo(-8, -3);
  ctx.lineTo(-17, 0);
  ctx.lineTo(-8, 3);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.globalAlpha = smokeAlpha;
  ctx.fillStyle = "#9e9a91";
  for (const offset of [20, 28, 36]) {
    ctx.beginPath();
    ctx.arc(-offset, Math.sin(travel * 18 + offset) * 2, 2.5, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

function drawPlasmaBolt(
  ctx: CanvasRenderingContext2D,
  point: Point,
  color: string,
  progress: number,
): void {
  const pulse = 6 + Math.sin(progress * 18) * 1.5;
  const coronaRotation = progress * 9;
  drawOrb(ctx, point, color, pulse);
  ctx.save();
  ctx.strokeStyle = "#ffe3b0";
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 1.4;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  for (const rotation of [coronaRotation, -coronaRotation]) {
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(rotation);
    ctx.beginPath();
    ctx.arc(0, 0, pulse + 5, 0, Math.PI * 1.55);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Рой дронов растёт вместе со стаком: каждый стак — это реальный бонус к урону,
 * который раньше копился молча, и игрок видел один и тот же рой из трёх машин.
 */
function drawDroneSwarm(
  ctx: CanvasRenderingContext2D,
  point: Point,
  color: string,
  progress: number,
  stacks: number,
): void {
  const growth = clamp(stacks / DRONE_MAX_STACKS);
  const droneCount = Math.max(2, Math.min(7, stacks + 2));
  const radiusX = 10 + growth * 9;
  const radiusY = 7 + growth * 6;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.4 + growth * 0.3;
  ctx.beginPath();
  ctx.ellipse(point.x, point.y, radiusX + 2, radiusY + 2, 0, 0, TAU);
  ctx.stroke();
  ctx.restore();

  for (let index = 0; index < droneCount; index += 1) {
    const angle = progress * 12 + index * (TAU / droneCount);
    const drone = {
      x: point.x + Math.cos(angle) * radiusX,
      y: point.y + Math.sin(angle) * radiusY,
    };
    drawOrb(ctx, drone, color, 2.6 + growth * 1.4);
    ctx.save();
    ctx.strokeStyle = "#d8ffe8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(drone.x - 4, drone.y);
    ctx.lineTo(drone.x + 4, drone.y);
    ctx.stroke();
    ctx.restore();
  }

  if (stacks > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.35 + growth * 0.45;
    fillRadialGlow(ctx, point, radiusX * 2.2, [
      [0, withAlpha(color, 0.5)],
      [1, withAlpha(color, 0)],
    ]);
    ctx.restore();
  }
}

function drawAntimatterOrb(
  ctx: CanvasRenderingContext2D,
  point: Point,
  color: string,
  progress: number,
): void {
  const distortionRadius = 16 + Math.sin(progress * Math.PI) * 5;
  drawOrb(ctx, point, color, 5);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.38;
  ctx.strokeStyle = "#f8d8ff";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.arc(point.x, point.y, distortionRadius, 0, TAU);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.strokeStyle = "#f8d8ff";
  ctx.lineWidth = 1.4;
  ctx.shadowColor = color;
  ctx.shadowBlur = 11;
  for (const rotation of [progress * 8, -progress * 6]) {
    ctx.save();
    ctx.rotate(rotation);
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawPhaseTorpedo(
  ctx: CanvasRenderingContext2D,
  point: Point,
  color: string,
  direction: number,
  progress: number,
): void {
  const phaseOffset = Math.floor(progress * 9) % 2 === 0 ? -4 : 4;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  for (let index = 2; index >= 0; index -= 1) {
    const size = 11 - index * 2;
    ctx.save();
    ctx.translate(
      point.x - direction * index * 14,
      point.y + (index === 0 ? 0 : phaseOffset * (index % 2 === 0 ? 1 : -1)),
    );
    ctx.rotate(progress * 7 + index * 0.28);
    ctx.globalAlpha = 1 - index * 0.28;
    ctx.fillStyle = index === 0 ? "#e5feff" : color;
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.strokeRect(-size / 2, -size / 2, size, size);
    ctx.restore();
  }
  ctx.restore();
}

function drawIonArc(
  ctx: CanvasRenderingContext2D,
  source: Point,
  shieldImpact: Point,
  destination: Point,
  outcome: CombatProjectileEvent["outcome"],
  travel: number,
  color: string,
): void {
  const forkOffset = Math.sin((travel + 0.31) * 23) * 11;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(source.x, source.y);
  for (let step = 1; step <= 6; step += 1) {
    const ratio = (travel * step) / 6;
    const point = getProjectilePathPoint(
      source,
      shieldImpact,
      destination,
      outcome,
      ratio,
    );
    const jitter = step === 6
      ? 0
      : Math.sin((ratio + step) * 17) * (7 - step * 0.55);
    ctx.lineTo(point.x, point.y + jitter);
  }
  ctx.stroke();
  ctx.restore();

  if (travel > 0.6) {
    const forkStart = getProjectilePathPoint(
      source,
      shieldImpact,
      destination,
      outcome,
      travel * 0.78,
    );
    const forkEnd = getProjectilePathPoint(
      source,
      shieldImpact,
      destination,
      outcome,
      travel,
    );
    ctx.save();
    ctx.globalAlpha = 0.38;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.1;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(forkStart.x, forkStart.y);
    ctx.lineTo(forkEnd.x, forkEnd.y + forkOffset);
    ctx.stroke();
    ctx.restore();
  }
}

function drawEnemyBolt(
  ctx: CanvasRenderingContext2D,
  point: Point,
  color: string,
  progress: number,
): void {
  drawOrb(ctx, point, color, 4.5);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 9 + Math.sin(progress * 15) * 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawShieldRipple(
  ctx: CanvasRenderingContext2D,
  point: Point,
  progress: number,
  isBoss: boolean,
): void {
  const radius = (isBoss ? 17 : 13) + easeOut(progress) * (isBoss ? 28 : 22);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.86 - progress * 0.48;
  fillRadialGlow(ctx, point, radius * 1.8, [
    [0, `rgba(220, 248, 255, ${0.7 * (1 - progress)})`],
    [0.35, `rgba(91, 214, 255, ${0.45 * (1 - progress)})`],
    [1, "rgba(91, 214, 255, 0)"],
  ]);
  ctx.strokeStyle = SHIELD_COLOR;
  ctx.lineWidth = isBoss ? 2.5 : 2;
  ctx.shadowColor = SHIELD_COLOR;
  ctx.shadowBlur = 15;
  for (let index = 0; index < 3; index += 1) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius + index * 8, progress * 2.8, progress * 2.8 + Math.PI * 1.45);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.globalAlpha = (1 - progress) ** 2 * 0.8;
  ctx.strokeStyle = "#dff6ff";
  ctx.lineWidth = 1;
  for (const [cellX, cellY] of [[0, 0], [1, 0.6], [-1, 0.6], [0.5, -0.9], [-0.5, -0.9]] as const) {
    const facet = 9 + progress * 5;
    ctx.beginPath();
    for (let corner = 0; corner < 6; corner += 1) {
      const angle = (TAU * corner) / 6;
      const x = point.x + cellX * facet * 1.7 + Math.cos(angle) * facet;
      const y = point.y + cellY * facet * 1.7 + Math.sin(angle) * facet;
      if (corner === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

function drawHullImpact(
  ctx: CanvasRenderingContext2D,
  point: Point,
  progress: number,
  color: string,
  incomingDirection: number,
): void {
  drawExplosion(ctx, point, progress, color);
  const radius = 11 + easeOut(progress) * 25;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.92 - progress * 0.55;
  ctx.strokeStyle = "#fff0c7";
  ctx.lineWidth = 1.6;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  for (let index = 0; index < 6; index += 1) {
    const spread = (index - 2.5) * 0.28;
    const startX = point.x + incomingDirection * radius * 0.18;
    const startY = point.y + Math.sin(spread) * 4;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(
      point.x + incomingDirection * radius * (0.6 + index * 0.08),
      point.y + Math.sin(spread) * radius * 0.9,
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawProjectile(
  ctx: CanvasRenderingContext2D,
  event: CombatProjectileEvent,
  progress: number,
  snapshot: CombatCinematicSnapshot,
  width: number,
  height: number,
): Point {
  const source = event.sourceModuleId === undefined
    ? shipCenter(event.from, width, height)
    : getModulePoint(
      snapshot[event.from],
      event.from,
      event.sourceModuleId,
      width,
      height,
    );
  const targetCenter = shipCenter(event.to, width, height);
  const target = getModulePoint(
    snapshot[event.to],
    event.to,
    event.targetModuleId,
    width,
    height,
  );
  const missOffset = event.outcome === "miss" ? (event.from === "player" ? 96 : -96) : 0;
  const destination = { x: target.x, y: target.y + missOffset };
  const shieldRadii = getShieldRadii(snapshot[event.to].kind === "boss", width);
  const shieldImpact = getShieldImpactPoint(
    source,
    destination,
    targetCenter,
    shieldRadii.x,
    shieldRadii.y,
  );
  const color = getProjectileColor(event, snapshot);
  const visual = getCombatCinematicProjectileVisual(event.weapon, event.enemyWeapon);
  const isIntercepted = event.outcome === "intercepted";
  const interceptFlight = isIntercepted ? clamp(progress / INTERCEPT_PROGRESS) : 0;
  const travel = isIntercepted ? interceptFlight * INTERCEPT_TRAVEL : progress;
  const arcEnd = event.outcome === "shield_and_hull"
    ? 0.68
    : event.outcome === "miss" || isIntercepted
      ? 1
      : 0.62;
  const pathPoint = (at: number): Point => {
    const base = getProjectilePathPoint(source, shieldImpact, destination, event.outcome, at);
    if (visual !== "rocket") return base;
    return {
      x: base.x,
      y: base.y + Math.sin(clamp(at / arcEnd) * Math.PI) * (event.from === "player" ? -34 : 34),
    };
  };
  const renderPoint = pathPoint(travel);

  if (isIntercepted) {
    const meetPoint = pathPoint(INTERCEPT_TRAVEL);
    drawInterceptor(ctx, targetCenter, meetPoint, interceptFlight);
    // Both missiles are gone the moment they meet — the blast takes over.
    if (interceptFlight >= 1) return meetPoint;
  }

  if (visual !== "beam" && visual !== "arc" && visual !== "rocket") {
    drawProjectileTrail(ctx, event, source, shieldImpact, destination, travel, color);
  }
  drawMuzzleFlash(ctx, source, shipDirection(event.from), color, progress);

  if (visual === "beam") {
    drawCombatLaser(ctx, source, renderPoint, color, progress);
  } else if (visual === "tracer") {
    drawKineticTracer(ctx, source, renderPoint, color);
  } else if (visual === "rocket") {
    drawRocket(ctx, source, renderPoint, color, travel);
  } else if (visual === "plasma") {
    drawPlasmaBolt(ctx, renderPoint, color, progress);
  } else if (visual === "swarm") {
    drawDroneSwarm(ctx, renderPoint, color, progress, event.droneStacks ?? 0);
  } else if (visual === "orbit") {
    drawAntimatterOrb(ctx, renderPoint, color, progress);
  } else if (visual === "phase") {
    drawPhaseTorpedo(ctx, renderPoint, color, shipDirection(event.from), progress);
  } else if (visual === "arc") {
    drawIonArc(
      ctx,
      source,
      shieldImpact,
      destination,
      event.outcome,
      travel,
      color,
    );
  } else {
    drawEnemyBolt(ctx, renderPoint, color, progress);
  }

  return renderPoint;
}

function drawExplosion(
  ctx: CanvasRenderingContext2D,
  point: Point,
  progress: number,
  color: string,
): void {
  const eased = easeOut(progress);
  const radius = 12 + eased * 34;
  const fade = 1 - progress;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  ctx.globalAlpha = fade;
  fillRadialGlow(ctx, point, radius * 1.5, [
    [0, `rgba(255, 255, 255, ${0.85 * fade})`],
    [0.28, withAlpha(color, 0.7 * fade)],
    [1, withAlpha(color, 0)],
  ]);

  ctx.globalAlpha = (1 - progress) ** 2;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.4 * fade;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 6 + eased * 62, 0, TAU);
  ctx.stroke();

  ctx.globalAlpha = 1 - progress * 0.72;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, TAU);
  ctx.stroke();

  ctx.lineCap = "round";
  for (let index = 0; index < 14; index += 1) {
    const angle = pseudoRandom(index * 2.7) * TAU + progress * 0.6;
    const speed = 0.55 + pseudoRandom(index * 5.3 + 3) * 1.05;
    const distance = eased * radius * 1.9 * speed;
    const spark = 5 + pseudoRandom(index * 7.1 + 9) * 8;
    ctx.globalAlpha = fade * (0.4 + pseudoRandom(index * 3.9) * 0.6);
    ctx.strokeStyle = index % 3 === 0 ? "#fff4d6" : color;
    ctx.lineWidth = 1.8 * fade + 0.4;
    ctx.beginPath();
    ctx.moveTo(point.x + Math.cos(angle) * distance, point.y + Math.sin(angle) * distance);
    ctx.lineTo(
      point.x + Math.cos(angle) * (distance + spark),
      point.y + Math.sin(angle) * (distance + spark),
    );
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = fade * 0.5;
  for (let index = 0; index < 5; index += 1) {
    const angle = pseudoRandom(index * 11.3 + 21) * TAU;
    const distance = eased * radius * (0.8 + pseudoRandom(index * 6.1) * 0.8);
    const smoke = { x: point.x + Math.cos(angle) * distance, y: point.y + Math.sin(angle) * distance };
    fillRadialGlow(ctx, smoke, 8 + eased * 20, [
      [0, "rgba(78, 84, 96, 0.55)"],
      [1, "rgba(40, 44, 52, 0)"],
    ]);
  }
  ctx.restore();
}

function drawMiss(
  ctx: CanvasRenderingContext2D,
  point: Point,
  progress: number,
  sceneScale: number,
): void {
  const labelProgress = clamp(
    (progress - COMBAT_CINEMATIC_MISS_LABEL_START_PROGRESS) /
      (1 - COMBAT_CINEMATIC_MISS_LABEL_START_PROGRESS),
  );
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.globalAlpha = 0.98 - labelProgress * 0.24;
  ctx.fillStyle = "#dce8f5";
  ctx.shadowColor = "#8ba0b5";
  ctx.shadowBlur = 10;
  ctx.font = `700 ${readableFontSize(16, sceneScale, 12)}px Orbitron, monospace`;
  ctx.textAlign = "center";
  ctx.fillText("MISS", 0, 0);
  ctx.restore();
}

function drawOutcomeLabel(
  ctx: CanvasRenderingContext2D,
  point: Point,
  label: string,
  color: string,
  progress: number,
  sceneScale: number,
): void {
  ctx.save();
  const pop = 0.82 + easeOut(progress) * 0.3;
  ctx.translate(
    point.x,
    Math.max(40 / sceneScale, point.y - 48 - progress * 28),
  );
  ctx.scale(pop, pop);
  ctx.globalAlpha = 0.98 - progress * 0.28;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.font = `800 ${readableFontSize(14, sceneScale, 10)}px Orbitron, monospace`;
  ctx.textAlign = "center";
  ctx.fillText(label, 0, 0);
  ctx.restore();
}

function drawDamageNumber(
  ctx: CanvasRenderingContext2D,
  point: Point,
  damage: number,
  color: string,
  progress: number,
  isCrit: boolean,
  prefix = "−",
  sceneScale = 1,
): void {
  if (damage <= 0) return;
  ctx.save();
  const floatProgress = Math.min(progress / 0.45, 1);
  const pop = 0.75 + easeOut(floatProgress) * (isCrit ? 0.8 : 0.35);
  ctx.translate(
    point.x,
    Math.max(48 / sceneScale, point.y - 104 - floatProgress * 64),
  );
  ctx.scale(pop, pop);
  ctx.globalAlpha = 1 - floatProgress * 0.28;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = isCrit ? 16 : 8;
  ctx.font = `${isCrit ? 800 : 700} ${readableFontSize(
    isCrit ? 22 : 17,
    sceneScale,
    isCrit ? 14 : 12,
  )}px Orbitron, monospace`;
  ctx.textAlign = "center";
  ctx.fillText(`${prefix}${formatCombatCinematicAmount(damage)}${isCrit ? "!" : ""}`, 0, 0);
  ctx.restore();
}

function getProjectileTelemetryColor(
  status: ReturnType<typeof getCombatCinematicProjectileReadout>["status"],
  projectileColor: string,
): string {
  if (status === "shield" || status === "absorbed") return SHIELD_COLOR;
  if (status === "mixed" || status === "piercing") return "#ffcb57";
  if (status === "miss" || status === "blocked") return "#d8e3ed";
  if (status === "intercepted") return "#ffb000";
  return projectileColor;
}

function getProjectileTelemetryAmount(
  readout: ReturnType<typeof getCombatCinematicProjectileReadout>,
): string {
  const values = [readout.shieldDamage, readout.hullDamage]
    .filter((damage) => damage > 0)
    .map((damage) => `−${formatCombatCinematicAmount(damage)}`);
  return values.join(" / ");
}

function drawProjectileTelemetry(
  ctx: CanvasRenderingContext2D,
  event: CombatProjectileEvent,
  progress: number,
  snapshot: CombatCinematicSnapshot,
  width: number,
  height: number,
  t: Translate,
  sceneScale: number,
): void {
  const readout = getCombatCinematicProjectileReadout(
    event.outcome,
    event.shieldDamage,
    event.hullDamage,
  );
  const enemyWeaponKey = getCombatCinematicEnemyWeaponKey(event.enemyWeapon);
  const weaponIcon = event.weapon === "enemy"
    ? getCombatCinematicEnemyWeaponIcon(event.enemyWeapon)
    : WEAPON_TYPES[event.weapon].icon;
  const weaponLabel = event.weapon !== "enemy"
    ? t(`combat_cinematics.weapons.${event.weapon}`)
    : enemyWeaponKey === "enemy"
      ? t("combat_cinematics.weapons.enemy")
      : t(`combat_cinematics.enemy_weapons.${enemyWeaponKey}`);
  const statusLabel = t(`combat_cinematics.statuses.${readout.status}`);
  const amount = getProjectileTelemetryAmount(readout);
  const projectileColor = getProjectileColor(event, snapshot);
  const statusColor = getProjectileTelemetryColor(readout.status, projectileColor);
  const alpha = 0.55 + clamp(progress / 0.16) * 0.45;
  const y = height * 0.25;
  const fontSize = readableFontSize(11, sceneScale, 9);

  ctx.save();
  ctx.font = `700 ${fontSize}px Orbitron, monospace`;
  const prefix = `${weaponIcon} ${weaponLabel}`;
  const separator = "  ·  ";
  const suffix = amount ? `  ${amount}` : "";
  const prefixWidth = ctx.measureText(prefix).width;
  const separatorWidth = ctx.measureText(separator).width;
  const statusWidth = ctx.measureText(statusLabel).width;
  const suffixWidth = ctx.measureText(suffix).width;
  const panelWidth = Math.min(
    width * 0.72,
    prefixWidth + separatorWidth + statusWidth + suffixWidth + 26,
  );
  const x = width / 2 - panelWidth / 2;

  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(3, 12, 23, 0.9)";
  ctx.fillRect(x, y - 17, panelWidth, 26);
  ctx.strokeStyle = `${statusColor}99`;
  ctx.lineWidth = 1;
  ctx.shadowColor = statusColor;
  ctx.shadowBlur = 10;
  ctx.strokeRect(x + 0.5, y - 16.5, panelWidth - 1, 25);
  ctx.shadowBlur = 0;

  let cursor = x + 13;
  ctx.textAlign = "left";
  ctx.fillStyle = projectileColor;
  ctx.fillText(prefix, cursor, y);
  cursor += prefixWidth;
  ctx.fillStyle = "rgba(192, 221, 234, 0.72)";
  ctx.fillText(separator, cursor, y);
  cursor += separatorWidth;
  ctx.fillStyle = statusColor;
  ctx.fillText(statusLabel, cursor, y);
  cursor += statusWidth;
  if (suffix) {
    ctx.fillStyle = "#f6fbff";
    ctx.fillText(suffix, cursor, y);
  }
  ctx.restore();
}

function drawAbilityDamage(
  ctx: CanvasRenderingContext2D,
  event: Extract<CombatCinematicEvent, { kind: "damage" }>,
  progress: number,
  snapshot: CombatCinematicSnapshot,
  width: number,
  height: number,
  sceneScale: number,
): void {
  const impactProgress = clamp((progress - 0.56) / 0.44);
  if (impactProgress <= 0) return;

  const center = shipCenter(event.side, width, height);
  const target = event.moduleId === undefined
    ? center
    : getModulePoint(snapshot[event.side], event.side, event.moduleId, width, height);
  const color = event.side === "player" ? ENEMY_COLOR : PLAYER_COLOR;

  if (event.shieldDamage > 0) {
    drawShield(ctx, center, impactProgress, snapshot[event.side].kind === "boss", width);
    drawDamageNumber(
      ctx,
      center,
      event.shieldDamage,
      color,
      impactProgress,
      false,
      "−",
      sceneScale,
    );
  }
  if (event.hullDamage > 0) {
    drawExplosion(ctx, target, impactProgress, color);
    drawDamageNumber(
      ctx,
      target,
      event.hullDamage,
      color,
      impactProgress,
      false,
      "−",
      sceneScale,
    );
  }
}

/**
 * Отражение — три такта, а не два: удар долетел, щит его развернул, он вернулся
 * и попал. Раньше на попадание оставалось 20% события, и весь такт пролетал
 * незаметно.
 */
const REFLECTION_OUTBOUND_END = 0.34;
const REFLECTION_RETURN_END = 0.68;

function drawReflection(
  ctx: CanvasRenderingContext2D,
  event: Extract<CombatCinematicEvent, { kind: "reflection" }>,
  progress: number,
  snapshot: CombatCinematicSnapshot,
  width: number,
  height: number,
  sceneScale: number,
  t: Translate,
): void {
  const attacker = shipCenter(event.attacker, width, height);
  const defender = shipCenter(event.defender, width, height);
  const returnTarget = getModulePoint(
    snapshot[event.attacker],
    event.attacker,
    event.targetModuleId,
    width,
    height,
  );
  const firstLeg = progress < REFLECTION_OUTBOUND_END;
  const legProgress = firstLeg
    ? progress / REFLECTION_OUTBOUND_END
    : clamp(
      (progress - REFLECTION_OUTBOUND_END) /
        (REFLECTION_RETURN_END - REFLECTION_OUTBOUND_END),
    );
  const from = firstLeg ? attacker : defender;
  const to = firstLeg ? defender : returnTarget;
  const point = { x: lerp(from.x, to.x, legProgress), y: lerp(from.y, to.y, legProgress) };
  drawOrb(
    ctx,
    point,
    firstLeg ? (event.attacker === "player" ? PLAYER_COLOR : ENEMY_COLOR) : "#f8f4ff",
    6,
  );
  if (!firstLeg) {
    drawShield(
      ctx,
      defender,
      clamp((progress - REFLECTION_OUTBOUND_END * 0.7) / 0.34),
      snapshot[event.defender].kind === "boss",
      width,
    );
    drawOutcomeLabel(
      ctx,
      defender,
      t("combat_cinematics.reflected"),
      "#f8f4ff",
      legProgress,
      sceneScale,
    );
  }
  if (progress > REFLECTION_RETURN_END) {
    const impactProgress = clamp(
      (progress - REFLECTION_RETURN_END) / (1 - REFLECTION_RETURN_END),
    );
    if (event.shieldDamage > 0) {
      drawShield(ctx, shipCenter(event.attacker, width, height), impactProgress, snapshot[event.attacker].kind === "boss", width);
    }
    if (event.hullDamage > 0) {
      drawExplosion(ctx, returnTarget, impactProgress, "#f8f4ff");
      drawDamageNumber(
        ctx,
        returnTarget,
        event.hullDamage,
        "#f8f4ff",
        impactProgress,
        false,
        "−",
        sceneScale,
      );
    }
  }
}

function drawBossAbility(
  ctx: CanvasRenderingContext2D,
  event: Extract<CombatCinematicEvent, { kind: "boss_ability" }>,
  progress: number,
  snapshot: CombatCinematicSnapshot,
  width: number,
  height: number,
  sceneScale: number,
): void {
  const bossCenter = shipCenter("enemy", width, height);
  const playerCenter = shipCenter("player", width, height);
  const repairEffects = new Set(["emergency_repair", "heal_all", "self_heal", "lifesteal"]);

  if (event.effect === "aoe_damage") {
    drawExplosion(ctx, playerCenter, progress, "#ff5a5f");
  } else if (event.effect === "shield_regen" || event.effect === "shield_restore") {
    drawShield(ctx, bossCenter, progress, snapshot.enemy.kind === "boss", width);
  } else if (event.effect === "evasion_boost") {
    ctx.save();
    ctx.strokeStyle = "#8be9fd";
    ctx.lineWidth = 2;
    ctx.globalAlpha = 1 - progress * 0.35;
    for (let index = 0; index < 3; index += 1) {
      ctx.beginPath();
      ctx.arc(bossCenter.x, bossCenter.y, 54 + index * 16 + progress * 24, 0, Math.PI * 1.55);
      ctx.stroke();
    }
    ctx.restore();
  } else if (event.effect === "resurrect_chance") {
    drawExplosion(ctx, bossCenter, progress, "#ffd35a");
  } else if (event.effect === "module_disable") {
    drawLaser(ctx, bossCenter, playerCenter, "#ffb000");
  } else if (repairEffects.has(event.effect)) {
    drawOrb(ctx, { x: bossCenter.x, y: bossCenter.y - progress * 44 }, "#7dffb2", 7);
    drawDamageNumber(ctx, bossCenter, 1, "#7dffb2", progress, false, "+", sceneScale);
  } else {
    drawExplosion(ctx, bossCenter, progress, "#ff4dff");
  }

  ctx.save();
  ctx.fillStyle = "#ffb8ff";
  ctx.font = `700 ${readableFontSize(13, sceneScale, 10)}px Orbitron, monospace`;
  ctx.textAlign = "center";
  ctx.globalAlpha = 1 - progress * 0.35;
  ctx.fillText(event.name.toUpperCase(), bossCenter.x, bossCenter.y - 116);
  ctx.restore();
}

function drawActiveEvent(
  ctx: CanvasRenderingContext2D,
  event: CombatCinematicEvent | undefined,
  progress: number,
  snapshot: CombatCinematicSnapshot,
  width: number,
  height: number,
  elapsed: number,
  t: Translate,
  sceneScale: number,
  showTelemetry: boolean,
): void {
  if (!event) return;

  if (event.kind === "projectile") {
    if (showTelemetry) {
      drawProjectileTelemetry(ctx, event, progress, snapshot, width, height, t, sceneScale);
    }
    const point = drawProjectile(ctx, event, progress, snapshot, width, height);
    if (event.outcome === "intercepted" && progress > INTERCEPT_PROGRESS) {
      const outcomeProgress = clamp(
        (progress - INTERCEPT_PROGRESS) / (1 - INTERCEPT_PROGRESS),
      );
      drawExplosion(ctx, point, outcomeProgress, INTERCEPT_COLOR);
      drawExplosion(ctx, point, clamp(outcomeProgress * 1.6), "#fff0c2");
      drawOutcomeLabel(
        ctx,
        point,
        t("combat_cinematics.intercepted"),
        INTERCEPT_COLOR,
        outcomeProgress,
        sceneScale,
      );
      return;
    }
    if (event.outcome === "miss" && progress >= COMBAT_CINEMATIC_MISS_LABEL_START_PROGRESS) {
      drawMiss(
        ctx,
        getMissLabelPoint(shipCenter(event.to, width, height), progress),
        progress,
        sceneScale,
      );
      return;
    }
    if (event.outcome === "blocked" && progress >= 0.62) {
      const impactProgress = clamp((progress - 0.62) / 0.38);
      drawExplosion(ctx, point, impactProgress, "#94a3b8");
      drawOutcomeLabel(
        ctx,
        point,
        t("combat_cinematics.blocked"),
        "#d8e3ed",
        impactProgress,
        sceneScale,
      );
      return;
    }
    const isAbsorbed = event.outcome === "absorbed";
    const hasShieldImpact =
      event.outcome === "shield" ||
      event.outcome === "shield_and_hull" ||
      event.outcome === "piercing" ||
      isAbsorbed;
    const hasHullImpact =
      event.outcome === "hull" ||
      event.outcome === "shield_and_hull" ||
      event.outcome === "piercing";
    const { shield: shieldContactProgress, hull: hullContactProgress } =
      getCombatCinematicProjectileContactProgress(event);
    if (isAbsorbed && progress >= shieldContactProgress) {
      const impactProgress = clamp(
        (progress - shieldContactProgress) / (1 - shieldContactProgress),
      );
      const targetCenter = shipCenter(event.to, width, height);
      const targetPoint = getModulePoint(
        snapshot[event.to],
        event.to,
        event.targetModuleId,
        width,
        height,
      );
      const shieldRadii = getShieldRadii(snapshot[event.to].kind === "boss", width);
      const shieldImpactPoint = getShieldImpactPoint(
        shipCenter(event.from, width, height),
        targetPoint,
        targetCenter,
        shieldRadii.x,
        shieldRadii.y,
      );
      drawShield(
        ctx,
        targetCenter,
        impactProgress,
        snapshot[event.to].kind === "boss",
          width,
      );
      drawShieldRipple(
        ctx,
        shieldImpactPoint,
        impactProgress,
        snapshot[event.to].kind === "boss",
      );
      drawOutcomeLabel(
        ctx,
        shieldImpactPoint,
        t("combat_cinematics.absorbed"),
        SHIELD_COLOR,
        impactProgress,
        sceneScale,
      );
      return;
    }
    if (
      event.outcome !== "intercepted" &&
      progress >= Math.min(
        hasShieldImpact ? shieldContactProgress : 1,
        hasHullImpact ? hullContactProgress : 1,
      )
    ) {
      const shieldImpactProgress = hasShieldImpact
        ? clamp((progress - shieldContactProgress) / (1 - shieldContactProgress))
        : 0;
      const hullImpactProgress = hasHullImpact
        ? clamp((progress - hullContactProgress) / (1 - hullContactProgress))
        : 0;
      const targetCenter = shipCenter(event.to, width, height);
      const targetPoint = getModulePoint(
        snapshot[event.to],
        event.to,
        event.targetModuleId,
        width,
        height,
      );
      const shieldRadii = getShieldRadii(snapshot[event.to].kind === "boss", width);
      const shieldImpactPoint = getShieldImpactPoint(
        shipCenter(event.from, width, height),
        targetPoint,
        targetCenter,
        shieldRadii.x,
        shieldRadii.y,
      );
      if (hasShieldImpact) {
        drawShield(
          ctx,
          targetCenter,
          shieldImpactProgress,
          snapshot[event.to].kind === "boss",
          width,
        );
        drawShieldRipple(
          ctx,
          shieldImpactPoint,
          shieldImpactProgress,
          snapshot[event.to].kind === "boss",
        );
      }
      if (hasHullImpact) {
        drawHullImpact(
          ctx,
          targetPoint,
          hullImpactProgress,
          getProjectileColor(event, snapshot),
          shipDirection(event.from),
        );
      }
      if (event.outcome === "shield_and_hull" || event.outcome === "piercing") {
        drawDamageNumber(
          ctx,
          shieldImpactPoint,
          event.shieldDamage,
          getProjectileColor(event, snapshot),
          shieldImpactProgress,
          false,
          "−",
          sceneScale,
        );
        if (hullImpactProgress > 0) {
          drawDamageNumber(
            ctx,
            targetPoint,
            event.hullDamage,
            getProjectileColor(event, snapshot),
            hullImpactProgress,
            event.isCrit,
            "−",
            sceneScale,
          );
        }
        if (event.outcome === "piercing") {
          drawOutcomeLabel(
            ctx,
            shieldImpactPoint,
            t("combat_cinematics.pierced"),
            "#ffb000",
            shieldImpactProgress,
            sceneScale,
          );
        }
      } else {
        drawDamageNumber(
          ctx,
          hasShieldImpact ? shieldImpactPoint : targetPoint,
          event.shieldDamage + event.hullDamage,
          getProjectileColor(event, snapshot),
          hasShieldImpact ? shieldImpactProgress : hullImpactProgress,
          event.isCrit,
          "−",
          sceneScale,
        );
      }
    }
    return;
  }

  if (event.kind === "reflection") {
    drawReflection(ctx, event, progress, snapshot, width, height, sceneScale, t);
    return;
  }

  if (event.kind === "damage") {
    drawAbilityDamage(ctx, event, progress, snapshot, width, height, sceneScale);
    return;
  }

  if (event.kind === "heal") {
    for (const moduleId of event.moduleIds) {
      const point = getModulePoint(snapshot[event.side], event.side, moduleId, width, height);
      drawDamageNumber(ctx, point, event.amount, PLAYER_COLOR, progress, false, "+", sceneScale);
      drawOrb(ctx, { x: point.x, y: point.y - progress * 26 }, PLAYER_COLOR, 3);
    }
    return;
  }

  if (event.kind === "shield_restore") {
    const center = shipCenter(event.side, width, height);
    drawShield(ctx, center, progress, snapshot[event.side].kind === "boss", width);
    drawDamageNumber(ctx, center, event.amount, SHIELD_COLOR, progress, false, "+", sceneScale);
    return;
  }

  if (event.kind === "module_destroyed") {
    const point = getModulePoint(snapshot[event.side], event.side, event.moduleId, width, height);
    drawExplosion(ctx, point, progress, "#ffb000");
    return;
  }

  if (event.kind === "vessel_destroyed") {
    drawExplosion(ctx, shipCenter(event.side, width, height), progress, "#ffb000");
    return;
  }

  if (event.kind === "boss_ability") {
    drawBossAbility(ctx, event, progress, snapshot, width, height, sceneScale);
    return;
  }

  ctx.save();
  ctx.fillStyle = "#ffb000";
  ctx.font = `700 ${readableFontSize(15, sceneScale, 11)}px Orbitron, monospace`;
  ctx.textAlign = "center";
  ctx.fillText(t("combat_cinematics.turn_skipped"), width / 2, height * 0.2 + Math.sin(elapsed / 90) * 3);
  ctx.restore();
}

/** Момент события, на котором звучит попадание — ровно там, где его видно. */
const BOSS_INTENT_COLORS: Record<BossIntentStatus, string> = {
  imminent: "#ff4d6d",
  pending: "#8be9fd",
  reactive: "#ffb000",
  armed: "#5bd6ff",
  spent: "#7a8798",
};

/**
 * Телеграф способности босса: игрок видит, что его ждёт, ДО того как жмёт
 * «Атака», а не читает лог постфактум.
 */
function drawBossIntent(
  ctx: CanvasRenderingContext2D,
  intent: BossIntent,
  width: number,
  height: number,
  t: Translate,
  sceneScale: number,
): void {
  const color = BOSS_INTENT_COLORS[intent.status];
  const label = intent.status === "pending"
    ? t("combat_cinematics.boss_intent.pending", { turns: intent.turnsUntil ?? 1 })
    : t(`combat_cinematics.boss_intent.${intent.status}`);
  const title = `${intent.name.toUpperCase()}`;
  const x = width * 0.75;
  const y = height * 0.2;
  const pulse = intent.status === "imminent"
    ? 0.62 + Math.abs(Math.sin(sceneElapsed / 420)) * 0.38
    : 0.85;

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = `800 ${readableFontSize(10, sceneScale, 8)}px Orbitron, monospace`;
  const labelWidth = ctx.measureText(label).width;
  ctx.font = `700 ${readableFontSize(12, sceneScale, 9)}px Orbitron, monospace`;
  const titleWidth = ctx.measureText(title).width;
  const panelWidth = Math.min(width * 0.46, Math.max(labelWidth, titleWidth) + 30);

  ctx.globalAlpha = pulse;
  ctx.fillStyle = "rgba(5, 12, 22, 0.86)";
  ctx.fillRect(x - panelWidth / 2, y - 20, panelWidth, 34);
  ctx.strokeStyle = withAlpha(color, 0.8);
  ctx.lineWidth = 1;
  ctx.shadowColor = color;
  ctx.shadowBlur = intent.status === "imminent" ? 14 : 7;
  ctx.strokeRect(x - panelWidth / 2 + 0.5, y - 19.5, panelWidth - 1, 33);
  ctx.shadowBlur = 0;

  ctx.fillStyle = color;
  ctx.font = `800 ${readableFontSize(10, sceneScale, 8)}px Orbitron, monospace`;
  ctx.fillText(label, x, y - 8);
  ctx.fillStyle = "rgba(232, 244, 253, 0.94)";
  ctx.font = `700 ${readableFontSize(12, sceneScale, 9)}px Orbitron, monospace`;
  ctx.fillText(title, x, y + 8);
  ctx.restore();
}

function getImpactProgress(event: CombatCinematicEvent): number {
  if (event.kind !== "projectile") return 0.5;
  if (event.outcome === "intercepted") return INTERCEPT_PROGRESS;
  if (event.outcome === "miss") return COMBAT_CINEMATIC_MISS_LABEL_START_PROGRESS;
  const contact = getCombatCinematicProjectileContactProgress(event);
  return Math.min(contact.shield, contact.hull);
}

function getCameraShake(
  event: CombatCinematicEvent | undefined,
  progress: number,
  elapsed: number,
): number {
  if (!event) return 0;
  const jolt = (startProgress: number, power: number) => {
    if (progress < startProgress) return 0;
    const decay = 1 - clamp((progress - startProgress) / (1 - startProgress));
    return Math.sin(elapsed / 11) * power * decay;
  };

  if (event.kind === "vessel_destroyed") return Math.sin(elapsed / 9) * 10 * (1 - progress);
  if (event.kind === "module_destroyed") return jolt(0, 4.5);
  if (event.kind === "damage") return jolt(0.56, 2.6);
  if (event.kind === "boss_ability") {
    return event.effect === "aoe_damage" ? jolt(0, 5) : 0;
  }
  if (event.kind === "projectile") {
    if (event.outcome === "miss" || event.outcome === "intercepted") return 0;
    if (event.hullDamage <= 0) return jolt(0.66, 1.5);
    return jolt(0.62, event.isCrit ? 6.5 : 3);
  }
  return 0;
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  snapshot: CombatCinematicSnapshot,
  active: readonly ActiveCinematicEvent[],
  elapsed: number,
  t: Translate,
  sceneScale: number,
  selectedModuleIds: readonly number[],
  bossIntent: BossIntent | null,
): void {
  sceneElapsed = elapsed;
  drawBackground(ctx, width, height, elapsed);
  // Тряска от самого сильного из идущих событий, а не сумма — иначе залп
  // внахлёст трясёт экран непрерывно.
  const shake = active.reduce((strongest, item) => {
    const value = getCameraShake(item.event, item.progress, elapsed);
    return Math.abs(value) > Math.abs(strongest) ? value : strongest;
  }, 0);
  ctx.save();
  ctx.translate(shake, -shake * 0.45);
  drawShip(ctx, snapshot.player, "player", width, height, elapsed);
  drawShip(ctx, snapshot.enemy, "enemy", width, height, elapsed);
  drawSelectedModuleTargets(ctx, snapshot.enemy, selectedModuleIds, active, width, height);
  drawShipBars(ctx, snapshot.player, "player", width, height);
  drawShipBars(ctx, snapshot.enemy, "enemy", width, height);
  // Телеметрия — одна на кадр, по последнему выстрелу: панели наложенных
  // снарядов рисуются в одном месте и превратились бы в кашу.
  const telemetryIndex = active.reduce(
    (latest, item, index) => (item.event.kind === "projectile" ? index : latest),
    -1,
  );
  active.forEach((item, index) => {
    drawActiveEvent(
      ctx,
      item.event,
      item.progress,
      snapshot,
      width,
      height,
      elapsed,
      t,
      sceneScale,
      index === telemetryIndex,
    );
  });
  ctx.restore();

  drawVignette(ctx, width, height);

  if (bossIntent && active.length === 0) {
    drawBossIntent(ctx, bossIntent, width, height, t, sceneScale);
  }

  for (const side of ["player", "enemy"] as const) {
    const color = side === "player" ? PLAYER_COLOR : ENEMY_COLOR;
    const x = width * (side === "player" ? 0.25 : 0.75);
    const y = height * 0.13;
    const label = side === "player"
      ? t("combat.your_ship").toUpperCase()
      : snapshot.enemy.name.toUpperCase();
    ctx.save();
    ctx.font = `700 ${readableFontSize(11, sceneScale, 9)}px Orbitron, monospace`;
    ctx.textAlign = "center";
    const labelWidth = ctx.measureText(label).width;
    ctx.fillStyle = "rgba(4, 11, 21, 0.66)";
    ctx.fillRect(x - labelWidth / 2 - 12, y - 12, labelWidth + 24, 18);
    ctx.fillStyle = withAlpha(color, 0.55);
    ctx.fillRect(x - labelWidth / 2 - 12, y + 5, labelWidth + 24, 1);
    ctx.fillStyle = "rgba(226, 242, 252, 0.9)";
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillText(label, x, y);
    ctx.restore();
  }
}

function drawCanvasFrame(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  stage: HTMLElement,
  snapshot: CombatCinematicSnapshot,
  active: readonly ActiveCinematicEvent[],
  elapsed: number,
  t: Translate,
  selectedModuleIds: readonly number[],
  bossIntent: BossIntent | null,
): void {
  const rect = stage.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  setupHiDPICanvas(canvas, ctx, width, height);
  const scene = getCombatCinematicSceneMetrics(width, height);

  ctx.save();
  ctx.scale(scene.scale, scene.scale);
  drawScene(
    ctx,
    scene.width,
    scene.height,
    snapshot,
    active,
    elapsed,
    t,
    scene.scale,
    selectedModuleIds,
    bossIntent,
  );
  ctx.restore();
}

export interface CombatCinematicStageProps {
  idleSnapshot: CombatCinematicSnapshot | null;
  timeline: CombatTurnTimeline | null;
  selectedModuleIds: readonly number[];
  bossIntent: BossIntent | null;
  onPlaybackComplete: () => void;
}

export function CombatCinematicStage({
  idleSnapshot,
  timeline,
  selectedModuleIds,
  bossIntent,
  onPlaybackComplete,
}: CombatCinematicStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const tRef = useRef<Translate>(t);
  const onPlaybackCompleteRef = useRef(onPlaybackComplete);
  const selectedModuleIdsRef = useRef(selectedModuleIds);
  const bossIntentRef = useRef(bossIntent);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    onPlaybackCompleteRef.current = onPlaybackComplete;
  }, [onPlaybackComplete]);

  useEffect(() => {
    selectedModuleIdsRef.current = selectedModuleIds;
  }, [selectedModuleIds]);

  useEffect(() => {
    bossIntentRef.current = bossIntent;
  }, [bossIntent]);

  useLayoutEffect(() => {
    if (timeline || !idleSnapshot || !canvas) return;
    const stage = stageRef.current ?? canvas.parentElement ?? canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderIdle = (timestamp = performance.now()) => {
      drawCanvasFrame(
        canvas,
        ctx,
        stage,
        idleSnapshot,
        [],
        timestamp,
        tRef.current,
        selectedModuleIds,
        bossIntentRef.current,
      );
    };

    // ponytail: the idle scene animates too — drift, engines, smoke and the
    // target reticle are what make waiting for the player's order feel alive.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      renderIdle();
      const resizeObserver = new ResizeObserver(() => renderIdle());
      resizeObserver.observe(stage);
      return () => resizeObserver.disconnect();
    }

    let frameId = 0;
    const loop = (timestamp: number) => {
      renderIdle(timestamp);
      frameId = requestAnimationFrame(loop);
    };
    loop(performance.now());
    return () => cancelAnimationFrame(frameId);
  }, [bossIntent, canvas, idleSnapshot, selectedModuleIds, timeline]);

  useLayoutEffect(() => {
    if (!timeline || !canvas) return;
    const stage = stageRef.current ?? canvas.parentElement ?? canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId = 0;
    /** Индекс следующего события, которое ещё не запущено. */
    let nextIndex = 0;
    const running: { event: CombatCinematicEvent; index: number; startedAt: number }[] = [];
    let visualSnapshot = timeline.initial;
    let finished = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const durationOf = (event: CombatCinematicEvent) => {
      const full = getCombatCinematicEventDuration(event);
      return reducedMotion ? Math.min(180, full) : full;
    };

    // Звук идёт по кадрам, а не по резолву: выстрел на старте события, попадание
    // в момент контакта. Каждый — ровно один раз за событие.
    const launched = new Set<number>();
    const impacted = new Set<number>();
    const playEventSounds = (
      event: CombatCinematicEvent,
      index: number,
      progress: number,
    ): void => {
      if (!launched.has(index)) {
        launched.add(index);
        const { launch } = getCombatCinematicEventSounds(event);
        if (launch) playSound(launch);
      }
      if (impacted.has(index) || progress < getImpactProgress(event)) return;
      impacted.add(index);
      const { impact, accent } = getCombatCinematicEventSounds(event);
      if (impact) playSound(impact);
      if (accent) playSound(accent);
    };

    const render = (timestamp: number) => {
      // Событие фиксируется в снапшоте строго по очереди: следующее может
      // догореть раньше, но применять его раньше предыдущего нельзя.
      while (running.length > 0) {
        const head = running[0];
        if (timestamp - head.startedAt < durationOf(head.event)) break;
        visualSnapshot = applyCombatCinematicEvent(visualSnapshot, head.event);
        running.shift();
      }

      // Снаряды одной палубы уходят очередью; перед залпом следующей палубы
      // сцена держит паузу. Всё, что не снаряд, играет соло.
      while (nextIndex < timeline.events.length) {
        const next = timeline.events[nextIndex];
        const last = running[running.length - 1];
        if (last) {
          const stagger = getCombatCinematicStaggerMs(last.event, next);
          if (stagger === null) break;
          const wait = reducedMotion
            ? Math.min(60, COMBAT_CINEMATIC_VOLLEY_STAGGER_MS)
            : stagger;
          if (timestamp - last.startedAt < wait) break;
        }
        running.push({ event: next, index: nextIndex, startedAt: timestamp });
        nextIndex += 1;
      }

      const active: ActiveCinematicEvent[] = running.map((item) => ({
        event: item.event,
        progress: clamp((timestamp - item.startedAt) / durationOf(item.event)),
      }));

      running.forEach((item, index) => {
        playEventSounds(item.event, item.index, active[index].progress);
      });

      const sceneSnapshot = active.reduce(
        (snapshot, item) =>
          getCombatCinematicSnapshotAtProgress(snapshot, item.event, item.progress),
        visualSnapshot,
      );

      drawCanvasFrame(
        canvas,
        ctx,
        stage,
        sceneSnapshot,
        active,
        timestamp,
        tRef.current,
        selectedModuleIdsRef.current,
        null,
      );

      if (running.length === 0 && nextIndex >= timeline.events.length) {
        if (!finished) {
          finished = true;
          onPlaybackCompleteRef.current();
        }
        return;
      }
      frameId = requestAnimationFrame(render);
    };

    render(performance.now());
    return () => cancelAnimationFrame(frameId);
  }, [canvas, timeline]);

  if (!timeline && !idleSnapshot) return null;

  return (
    <div
      ref={stageRef}
      className="relative w-full aspect-[4/3] min-h-[min(13rem,44dvh)] overflow-hidden border border-[#1b4965] bg-[#030914] shadow-[0_0_28px_rgba(0,212,255,0.14)] sm:aspect-[16/9] sm:min-h-[min(26.25rem,56dvh)]"
    >
      <canvas
        ref={setCanvas}
        className="absolute inset-0 block size-full"
        role="img"
        aria-label={t("combat_cinematics.canvas_label")}
      />
    </div>
  );
}
