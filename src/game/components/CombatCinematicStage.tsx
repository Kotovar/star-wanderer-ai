"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { WEAPON_TYPES } from "@/game/constants";
import { setupHiDPICanvas } from "@/game/components/canvas-utils";
import {
  COMBAT_CINEMATIC_MISS_LABEL_START_PROGRESS,
  formatCombatCinematicAmount,
  getCombatCinematicModuleAnchor,
  getCombatCinematicSceneMetrics,
  getMissLabelPoint,
  getProjectilePathPoint,
  getShieldImpactPoint,
} from "./combatCinematicGeometry";
import {
  getCombatCinematicProjectileReadout,
  getCombatCinematicProjectileVisual,
} from "./combatCinematicPresentation";
import {
  applyCombatCinematicEvent,
  getCombatCinematicEventDuration,
  getCombatCinematicProjectileContactProgress,
  getCombatCinematicSnapshotAtProgress,
} from "@/game/slices/combat/helpers/combatCinematicPlayback";
import type {
  CombatCinematicEvent,
  CombatCinematicSide,
  CombatCinematicSnapshot,
  CombatProjectileEvent,
  CombatTurnTimeline,
} from "@/game/types/combatCinematics";
import { useTranslation } from "@/lib/useTranslation";

type Point = { x: number; y: number };
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

function readableFontSize(
  baseSize: number,
  sceneScale: number,
  minimumSize: number,
): number {
  return Math.max(minimumSize, baseSize * sceneScale) / sceneScale;
}

function shipCenter(side: CombatCinematicSide, width: number, height: number): Point {
  return {
    x: width * (side === "player" ? 0.25 : 0.75),
    y: height * 0.52,
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

function getProjectileColor(
  event: CombatProjectileEvent,
  snapshot: CombatCinematicSnapshot,
): string {
  if (event.weapon !== "enemy") return getWeaponColor(event.weapon);
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
  gradient.addColorStop(0, "#030914");
  gradient.addColorStop(0.5, "#07182a");
  gradient.addColorStop(1, "#130713");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  for (let index = 0; index < 82; index += 1) {
    const x = ((index * 89) % 997) / 997 * width;
    const y = ((index * 151) % 701) / 701 * height;
    const glow = 0.18 + ((Math.sin(elapsed / 700 + index) + 1) * 0.12);
    ctx.fillStyle = `rgba(173, 224, 255, ${glow})`;
    ctx.fillRect(x, y, index % 7 === 0 ? 2 : 1, index % 7 === 0 ? 2 : 1);
  }

  const horizon = ctx.createLinearGradient(0, 0, width, 0);
  horizon.addColorStop(0, "rgba(0, 255, 157, 0)");
  horizon.addColorStop(0.5, "rgba(91, 214, 255, 0.2)");
  horizon.addColorStop(1, "rgba(255, 77, 109, 0)");
  ctx.strokeStyle = horizon;
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 9]);
  ctx.beginPath();
  ctx.moveTo(width * 0.08, height * 0.52);
  ctx.lineTo(width * 0.92, height * 0.52);
  ctx.stroke();
  ctx.setLineDash([]);
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
    ctx.save();
    ctx.globalAlpha = intact ? 0.35 + healthRatio * 0.65 : 0.18;
    ctx.fillStyle = intact ? (side === "player" ? PLAYER_COLOR : ENEMY_COLOR) : "#5f6570";
    ctx.beginPath();
    ctx.arc(point.x, point.y, intact ? 4 : 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawSelectedModuleTargets(
  ctx: CanvasRenderingContext2D,
  vessel: CombatCinematicSnapshot["enemy"],
  moduleIds: readonly number[],
  width: number,
  height: number,
): void {
  for (const moduleId of moduleIds) {
    if (!vessel.modules.some((currentModule) => currentModule.id === moduleId)) continue;
    const point = getModulePoint(vessel, "enemy", moduleId, width, height);
    ctx.save();
    ctx.strokeStyle = "#ffcb57";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#ffcb57";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawPlayerShip(ctx: CanvasRenderingContext2D, center: Point): void {
  ctx.save();
  ctx.translate(center.x, center.y);
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
  ctx.restore();
}

function drawEnemyShip(ctx: CanvasRenderingContext2D, center: Point): void {
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.scale(-1, 1);
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
  ctx.restore();
}

function drawBossShip(ctx: CanvasRenderingContext2D, center: Point): void {
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.scale(-1, 1);
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
  ctx.restore();
}

function drawCreature(ctx: CanvasRenderingContext2D, center: Point, elapsed: number): void {
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.fillStyle = "#29134a";
  ctx.strokeStyle = "#c084fc";
  ctx.lineWidth = 2;
  ctx.shadowColor = "#c084fc";
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.ellipse(0, 0, 82, 58, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

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

function drawShip(
  ctx: CanvasRenderingContext2D,
  vessel: CombatCinematicSnapshot["player"],
  side: CombatCinematicSide,
  width: number,
  height: number,
  elapsed: number,
): void {
  const center = shipCenter(side, width, height);
  if (vessel.kind === "boss") drawBossShip(ctx, center);
  else if (vessel.kind === "creature") drawCreature(ctx, center, elapsed);
  else if (side === "player") drawPlayerShip(ctx, center);
  else drawEnemyShip(ctx, center);
  drawModuleLights(ctx, vessel, side, width, height);
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
    ctx.fillStyle = "rgba(5, 11, 20, 0.82)";
    ctx.fillRect(x, y + offset, 148, 5);
    ctx.fillStyle = color;
    ctx.fillRect(x, y + offset, 148 * ratio, 5);
  };
  drawBar(vessel.shields, vessel.maxShields, SHIELD_COLOR, 0);
  drawBar(hull, maxHull, side === "player" ? PLAYER_COLOR : ENEMY_COLOR, 10);
}

function drawShield(
  ctx: CanvasRenderingContext2D,
  center: Point,
  progress: number,
  isBoss: boolean,
): void {
  const pulse = Math.sin(clamp(progress) * Math.PI);
  const scale = 0.86 + pulse * 0.17;
  const radii = getShieldRadii(isBoss);
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = 0.25 + pulse * 0.65;
  ctx.strokeStyle = SHIELD_COLOR;
  ctx.lineWidth = isBoss ? 4 : 3;
  ctx.shadowColor = SHIELD_COLOR;
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.ellipse(0, 0, radii.x, radii.y, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function getShieldRadii(isBoss: boolean): Point {
  return isBoss ? { x: 166, y: 100 } : { x: 148, y: 86 };
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
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCombatLaser(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  color: string,
  progress: number,
): void {
  ctx.save();
  ctx.globalAlpha = 0.32 + progress * 0.45;
  ctx.strokeStyle = color;
  ctx.lineWidth = 7;
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.globalAlpha = 0.95;
  ctx.strokeStyle = "#f6ffff";
  ctx.lineWidth = 1.4;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
  drawOrb(ctx, from, color, 2.5 + Math.sin(progress * Math.PI) * 1.5);
}

function drawKineticTracer(
  ctx: CanvasRenderingContext2D,
  from: Point,
  point: Point,
  color: string,
): void {
  const angle = Math.atan2(point.y - from.y, point.x - from.x);
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
  ctx.restore();
}

function drawPlasmaBolt(
  ctx: CanvasRenderingContext2D,
  point: Point,
  color: string,
  progress: number,
): void {
  const pulse = 6 + Math.sin(progress * 18) * 1.5;
  drawOrb(ctx, point, color, pulse);
  ctx.save();
  ctx.strokeStyle = "#ffe3b0";
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 1.4;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(point.x, point.y, pulse + 5, progress * 7, progress * 7 + Math.PI * 1.55);
  ctx.stroke();
  ctx.restore();
}

function drawDroneSwarm(
  ctx: CanvasRenderingContext2D,
  point: Point,
  color: string,
  progress: number,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.56;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  for (let index = 0; index < 3; index += 1) {
    const angle = progress * 12 + index * ((Math.PI * 2) / 3);
    const drone = {
      x: point.x + Math.cos(angle) * 10,
      y: point.y + Math.sin(angle) * 7,
    };
    drawOrb(ctx, drone, color, 3);
    ctx.save();
    ctx.strokeStyle = "#d8ffe8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(drone.x - 4, drone.y);
    ctx.lineTo(drone.x + 4, drone.y);
    ctx.stroke();
    ctx.restore();
  }
}

function drawAntimatterOrb(
  ctx: CanvasRenderingContext2D,
  point: Point,
  color: string,
  progress: number,
): void {
  drawOrb(ctx, point, color, 5);
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
  ctx.save();
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  for (let index = 2; index >= 0; index -= 1) {
    const size = 11 - index * 2;
    ctx.save();
    ctx.translate(point.x - direction * index * 14, point.y + (index % 2 === 0 ? -3 : 3));
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
  ctx.globalAlpha = 0.86 - progress * 0.48;
  ctx.strokeStyle = SHIELD_COLOR;
  ctx.lineWidth = isBoss ? 2.5 : 2;
  ctx.shadowColor = SHIELD_COLOR;
  ctx.shadowBlur = 15;
  for (let index = 0; index < 3; index += 1) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius + index * 8, progress * 2.8, progress * 2.8 + Math.PI * 1.45);
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
  const source = shipCenter(event.from, width, height);
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
  const shieldRadii = getShieldRadii(snapshot[event.to].kind === "boss");
  const shieldImpact = getShieldImpactPoint(
    source,
    destination,
    targetCenter,
    shieldRadii.x,
    shieldRadii.y,
  );
  const travel = event.outcome === "intercepted" ? progress * 0.62 : progress;
  const curvedPoint = getProjectilePathPoint(
    source,
    shieldImpact,
    destination,
    event.outcome,
    travel,
  );
  const color = getProjectileColor(event, snapshot);
  const visual = getCombatCinematicProjectileVisual(event.weapon);
  let renderPoint = curvedPoint;

  if (visual === "beam") {
    drawCombatLaser(ctx, source, renderPoint, color, progress);
  } else if (visual === "tracer") {
    drawKineticTracer(ctx, source, renderPoint, color);
  } else if (visual === "rocket") {
    const arcEnd = event.outcome === "shield_and_hull"
      ? 0.68
      : event.outcome === "miss" || event.outcome === "intercepted"
        ? 1
        : 0.62;
    renderPoint = {
      x: curvedPoint.x,
      y: curvedPoint.y + Math.sin(clamp(travel / arcEnd) * Math.PI) * (event.from === "player" ? -34 : 34),
    };
    drawRocket(ctx, source, renderPoint, color, travel);
  } else if (visual === "plasma") {
    drawPlasmaBolt(ctx, renderPoint, color, progress);
  } else if (visual === "swarm") {
    drawDroneSwarm(ctx, renderPoint, color, progress);
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
  const radius = 12 + easeOut(progress) * 34;
  ctx.save();
  ctx.globalAlpha = 1 - progress * 0.72;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8 + progress;
    ctx.beginPath();
    ctx.moveTo(point.x + Math.cos(angle) * radius * 0.35, point.y + Math.sin(angle) * radius * 0.35);
    ctx.lineTo(point.x + Math.cos(angle) * radius, point.y + Math.sin(angle) * radius);
    ctx.stroke();
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
  const weaponKey = event.weapon === "enemy" ? "enemy" : event.weapon;
  const weaponIcon = event.weapon === "enemy" ? "✦" : WEAPON_TYPES[event.weapon].icon;
  const weaponLabel = t(`combat_cinematics.weapons.${weaponKey}`);
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
    drawShield(ctx, center, impactProgress, snapshot[event.side].kind === "boss");
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
  const firstLeg = progress < 0.48;
  const legProgress = firstLeg ? progress / 0.48 : (progress - 0.48) / 0.52;
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
    drawShield(ctx, defender, clamp((progress - 0.35) / 0.4), snapshot[event.defender].kind === "boss");
    drawOutcomeLabel(
      ctx,
      defender,
      t("combat_cinematics.reflected"),
      "#f8f4ff",
      legProgress,
      sceneScale,
    );
  }
  if (progress > 0.8) {
    const impactProgress = clamp((progress - 0.8) / 0.2);
    if (event.shieldDamage > 0) {
      drawShield(ctx, shipCenter(event.attacker, width, height), impactProgress, snapshot[event.attacker].kind === "boss");
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
    drawShield(ctx, bossCenter, progress, snapshot.enemy.kind === "boss");
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
): void {
  if (!event) return;

  if (event.kind === "projectile") {
    drawProjectileTelemetry(ctx, event, progress, snapshot, width, height, t, sceneScale);
    const point = drawProjectile(ctx, event, progress, snapshot, width, height);
    if (event.outcome === "intercepted" && progress > 0.48) {
      const outcomeProgress = clamp((progress - 0.48) / 0.52);
      drawExplosion(ctx, point, outcomeProgress, "#ffb000");
      drawOutcomeLabel(
        ctx,
        point,
        t("combat_cinematics.intercepted"),
        "#ffb000",
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
      const shieldRadii = getShieldRadii(snapshot[event.to].kind === "boss");
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
      const shieldRadii = getShieldRadii(snapshot[event.to].kind === "boss");
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
    drawShield(ctx, center, progress, snapshot[event.side].kind === "boss");
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

function drawScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  snapshot: CombatCinematicSnapshot,
  event: CombatCinematicEvent | undefined,
  progress: number,
  elapsed: number,
  t: Translate,
  sceneScale: number,
  selectedModuleIds: readonly number[],
): void {
  drawBackground(ctx, width, height, elapsed);
  const shake = event?.kind === "projectile" && event.isCrit && progress > 0.76
    ? Math.sin(elapsed / 12) * 4 * (1 - progress)
    : 0;
  ctx.save();
  ctx.translate(shake, -shake * 0.45);
  drawShip(ctx, snapshot.player, "player", width, height, elapsed);
  drawShip(ctx, snapshot.enemy, "enemy", width, height, elapsed);
  drawSelectedModuleTargets(ctx, snapshot.enemy, selectedModuleIds, width, height);
  drawShipBars(ctx, snapshot.player, "player", width, height);
  drawShipBars(ctx, snapshot.enemy, "enemy", width, height);
  drawActiveEvent(ctx, event, progress, snapshot, width, height, elapsed, t, sceneScale);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "rgba(192, 221, 234, 0.78)";
  ctx.font = `700 ${readableFontSize(11, sceneScale, 9)}px Orbitron, monospace`;
  ctx.textAlign = "center";
  ctx.fillText(t("combat.your_ship").toUpperCase(), width * 0.25, height * 0.13);
  ctx.fillText(snapshot.enemy.name.toUpperCase(), width * 0.75, height * 0.13);
  ctx.restore();
}

function drawCanvasFrame(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  stage: HTMLElement,
  snapshot: CombatCinematicSnapshot,
  event: CombatCinematicEvent | undefined,
  progress: number,
  elapsed: number,
  t: Translate,
  selectedModuleIds: readonly number[],
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
    event,
    progress,
    elapsed,
    t,
    scene.scale,
    selectedModuleIds,
  );
  ctx.restore();
}

export interface CombatCinematicStageProps {
  idleSnapshot: CombatCinematicSnapshot | null;
  timeline: CombatTurnTimeline | null;
  selectedModuleIds: readonly number[];
  onPlaybackComplete: () => void;
}

export function CombatCinematicStage({
  idleSnapshot,
  timeline,
  selectedModuleIds,
  onPlaybackComplete,
}: CombatCinematicStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const tRef = useRef<Translate>(t);
  const onPlaybackCompleteRef = useRef(onPlaybackComplete);
  const selectedModuleIdsRef = useRef(selectedModuleIds);
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

  useLayoutEffect(() => {
    if (timeline || !idleSnapshot || !canvas) return;
    const stage = stageRef.current ?? canvas.parentElement ?? canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderIdle = () => {
      drawCanvasFrame(
        canvas,
        ctx,
        stage,
        idleSnapshot,
        undefined,
        1,
        performance.now(),
        tRef.current,
        selectedModuleIds,
      );
    };

    renderIdle();
    const resizeObserver = new ResizeObserver(renderIdle);
    resizeObserver.observe(stage);
    return () => resizeObserver.disconnect();
  }, [canvas, idleSnapshot, selectedModuleIds, timeline]);

  useLayoutEffect(() => {
    if (!timeline || !canvas) return;
    const stage = stageRef.current ?? canvas.parentElement ?? canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId = 0;
    let eventIndex = 0;
    let eventStartedAt = performance.now();
    let visualSnapshot = timeline.initial;
    let finished = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const render = (timestamp: number) => {
      let activeEvent = timeline.events[eventIndex];
      let progress = activeEvent
        ? clamp((timestamp - eventStartedAt) / (reducedMotion ? Math.min(180, getCombatCinematicEventDuration(activeEvent)) : getCombatCinematicEventDuration(activeEvent)))
        : 1;

      if (activeEvent && progress >= 1) {
        visualSnapshot = applyCombatCinematicEvent(visualSnapshot, activeEvent);
        eventIndex += 1;
        eventStartedAt = timestamp;
        activeEvent = timeline.events[eventIndex];
        progress = 0;
      }

      const sceneSnapshot = activeEvent
        ? getCombatCinematicSnapshotAtProgress(visualSnapshot, activeEvent, progress)
        : visualSnapshot;

      drawCanvasFrame(
        canvas,
        ctx,
        stage,
        sceneSnapshot,
        activeEvent,
        progress,
        timestamp,
        tRef.current,
        selectedModuleIdsRef.current,
      );

      if (!activeEvent) {
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
