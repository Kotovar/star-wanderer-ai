"use client";

import { useState } from "react";
import { useGameStore } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/lib/useTranslation";
import { RESEARCH_RESOURCES } from "@/game/constants";
import type { DiveDepth } from "@/game/types/exploration";
import { GAS_GIANT_DIVE_COOLDOWN } from "@/game/slices/locations/helpers/gasGiant/constants";

const DEPTH_COLORS: Record<DiveDepth, string> = {
  1: "#00d4ff",
  2: "#00ff41",
  3: "#ffb000",
  4: "#ff0040",
};

const DEPTH_ICONS: Record<DiveDepth, string> = {
  1: "🌤️",
  2: "☁️",
  3: "🌑",
  4: "🌀",
};

const ATMOSPHERE_COLORS: Record<
  string,
  { band1: string; band2: string; band3: string; glow: string }
> = {
  hydrogen: {
    band1: "#3a8fd4",
    band2: "#2255a0",
    band3: "#4fb3f0",
    glow: "#00d4ff",
  },
  methane: {
    band1: "#7ed494",
    band2: "#2a6e42",
    band3: "#a8e8bc",
    glow: "#00ff41",
  },
  ammonia: {
    band1: "#c49a2a",
    band2: "#7a5a10",
    band3: "#e8c86a",
    glow: "#ffb000",
  },
  nitrogen: {
    band1: "#9080d8",
    band2: "#503a9a",
    band3: "#c0b8f8",
    glow: "#9933ff",
  },
};

// Tailwind-safe hover classes per depth (must be full strings so PurgeCSS keeps them)
const DEPTH_BTN_CLASSES: Record<DiveDepth, string> = {
  1: "border-[#00d4ff] text-[#00d4ff] hover:bg-[#00d4ff] hover:text-[#050810]",
  2: "border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810]",
  3: "border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810]",
  4: "border-[#ff0040] text-[#ff0040] hover:bg-[#ff0040] hover:text-[#050810]",
};

// Zone boundary radii (separators between depth 1→2, 2→3, 3→4)
const ZONE_BOUNDS = [52, 37, 22] as const;

// Midpoint radius of each depth zone — probe sits here
const ZONE_MID_R: Record<DiveDepth, number> = { 1: 61, 2: 44, 3: 29, 4: 11 };

// Stroke width for the annular zone glow (covers the zone thickness)
const ZONE_GLOW_W: Record<DiveDepth, number> = { 1: 16, 2: 14, 3: 14, 4: 20 };

// Probe sits at 315° (top-right), moving inward per depth
const C45 = Math.SQRT2 / 2; // cos(-45°) = sin(45°) ≈ 0.7071

// Per-atmosphere atmospheric band configs: y, height, color key (1/2/3), opacity, duration, direction, offset
const ATMO_BANDS: Record<
  string,
  Array<{
    y: number;
    h: number;
    c: 1 | 2 | 3;
    op: number;
    dur: number;
    d: 1 | -1;
    off: number;
  }>
> = {
  // Hydrogen: Jupiter-style, wide evenly-spaced bands, right-side storm
  hydrogen: [
    { y: 76, h: 7, c: 3, op: 0.55, dur: 12, d: 1, off: 8 },
    { y: 87, h: 5, c: 2, op: 0.4, dur: 16, d: -1, off: 5 },
    { y: 96, h: 9, c: 1, op: 0.45, dur: 10, d: 1, off: 12 },
    { y: 109, h: 5, c: 3, op: 0.35, dur: 14, d: -1, off: 9 },
    { y: 118, h: 7, c: 2, op: 0.3, dur: 18, d: 1, off: 6 },
  ],
  // Methane: thick organic bands, left-side storm
  methane: [
    { y: 68, h: 10, c: 1, op: 0.5, dur: 9, d: -1, off: 14 },
    { y: 82, h: 8, c: 3, op: 0.45, dur: 13, d: 1, off: 8 },
    { y: 94, h: 14, c: 2, op: 0.55, dur: 8, d: -1, off: 16 },
    { y: 112, h: 9, c: 1, op: 0.4, dur: 11, d: 1, off: 10 },
    { y: 125, h: 7, c: 3, op: 0.35, dur: 15, d: -1, off: 7 },
  ],
  // Ammonia: fast narrow bands, large bottom storm
  ammonia: [
    { y: 72, h: 6, c: 3, op: 0.6, dur: 7, d: 1, off: 18 },
    { y: 82, h: 9, c: 2, op: 0.5, dur: 10, d: -1, off: 12 },
    { y: 94, h: 7, c: 1, op: 0.55, dur: 8, d: 1, off: 15 },
    { y: 105, h: 11, c: 3, op: 0.4, dur: 14, d: -1, off: 9 },
    { y: 120, h: 6, c: 2, op: 0.35, dur: 11, d: 1, off: 13 },
  ],
  // Nitrogen: slow subtle banding, multiple tiny vortices
  nitrogen: [
    { y: 74, h: 4, c: 1, op: 0.25, dur: 22, d: 1, off: 6 },
    { y: 83, h: 6, c: 3, op: 0.3, dur: 28, d: -1, off: 4 },
    { y: 93, h: 8, c: 2, op: 0.35, dur: 18, d: 1, off: 8 },
    { y: 105, h: 5, c: 1, op: 0.3, dur: 24, d: -1, off: 5 },
    { y: 114, h: 4, c: 3, op: 0.25, dur: 30, d: 1, off: 3 },
  ],
};

// Per-atmosphere storm eyes
const ATMO_STORMS: Record<
  string,
  Array<{
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    dur: number;
    off: number;
  }>
> = {
  hydrogen: [{ cx: 130, cy: 100, rx: 11, ry: 7, dur: 10, off: 5 }],
  methane: [{ cx: 72, cy: 93, rx: 9, ry: 6, dur: 11, off: -6 }],
  ammonia: [{ cx: 115, cy: 113, rx: 16, ry: 10, dur: 9, off: 7 }],
  nitrogen: [
    { cx: 80, cy: 85, rx: 5, ry: 3, dur: 14, off: 4 },
    { cx: 118, cy: 115, rx: 4, ry: 2.5, dur: 19, off: -5 },
    { cx: 95, cy: 105, rx: 6, ry: 4, dur: 11, off: 3 },
  ],
};

function GasGiantVisual({
  atmosphere,
  depth,
}: {
  atmosphere: string;
  depth?: DiveDepth;
}) {
  const colors = ATMOSPHERE_COLORS[atmosphere] ?? ATMOSPHERE_COLORS.hydrogen;
  const depthColor = depth ? DEPTH_COLORS[depth] : colors.glow;
  const bands = ATMO_BANDS[atmosphere] ?? ATMO_BANDS.hydrogen;
  const storms = ATMO_STORMS[atmosphere] ?? ATMO_STORMS.hydrogen;

  const cb = (c: 1 | 2 | 3) =>
    c === 1 ? colors.band1 : c === 2 ? colors.band2 : colors.band3;

  // Probe position at the midpoint of the active zone ring (315° = top-right)
  const pR = depth !== undefined ? ZONE_MID_R[depth] : null;
  const probeCx = pR !== null ? 100 + pR * C45 : null;
  const probeCy = pR !== null ? 100 - pR * C45 : null;

  return (
    <div className="relative flex justify-center items-center py-2 shrink-0">
      <svg role="img"
        width="200"
        height="200"
        viewBox="0 0 200 200"
        style={{ overflow: "visible" }}
      >
        <defs>
          <radialGradient id="gg-glow" cx="50%" cy="50%" r="50%">
            <stop
              offset="0%"
              stopColor={depthColor}
              stopOpacity="0.18"
            />
            <stop
              offset="100%"
              stopColor={depthColor}
              stopOpacity="0"
            />
          </radialGradient>
          <clipPath id="gg-clip">
            <circle cx="100" cy="100" r="70" />
          </clipPath>
          <radialGradient id="gg-surface" cx="38%" cy="35%" r="65%">
            <stop
              offset="0%"
              stopColor={colors.band3}
              stopOpacity="1"
            />
            <stop
              offset="45%"
              stopColor={colors.band1}
              stopOpacity="1"
            />
            <stop
              offset="100%"
              stopColor={colors.band2}
              stopOpacity="1"
            />
          </radialGradient>
          <radialGradient id="gg-shadow" cx="65%" cy="62%" r="55%">
            <stop offset="0%" stopColor="#000" stopOpacity="0" />
            <stop offset="65%" stopColor="#000" stopOpacity="0.2" />
            <stop
              offset="100%"
              stopColor="#000"
              stopOpacity="0.58"
            />
          </radialGradient>
        </defs>

        {/* Outer glow halo */}
        <circle cx="100" cy="100" r="90" fill="url(#gg-glow)" />

        {/* Planet body */}
        <circle cx="100" cy="100" r="70" fill="url(#gg-surface)" />

        {/* All dynamic content clipped to planet circle */}
        <g clipPath="url(#gg-clip)">
          {/* Atmospheric bands — per-atmosphere layout */}
          {bands.map((b, i) => (
            <rect
              key={i}
              x="30"
              y={b.y}
              width="140"
              height={b.h}
              rx="3"
              fill={cb(b.c)}
              opacity={b.op}
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                from="0,0"
                to={`${b.d * b.off},0`}
                dur={`${b.dur}s`}
                repeatCount="indefinite"
                additive="sum"
              />
            </rect>
          ))}

          {/* Storm eyes — per-atmosphere position & size */}
          {storms.map((s, i) => (
            <g key={i}>
              <ellipse
                cx={s.cx}
                cy={s.cy}
                rx={s.rx}
                ry={s.ry}
                fill={colors.band2}
                opacity="0.75"
              >
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  from="0,0"
                  to={`${s.off},0`}
                  dur={`${s.dur}s`}
                  repeatCount="indefinite"
                  additive="sum"
                />
              </ellipse>
              <ellipse
                cx={s.cx}
                cy={s.cy}
                rx={s.rx * 0.54}
                ry={s.ry * 0.57}
                fill={colors.band1}
                opacity="0.5"
              >
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  from="0,0"
                  to={`${s.off},0`}
                  dur={`${s.dur}s`}
                  repeatCount="indefinite"
                  additive="sum"
                />
              </ellipse>
            </g>
          ))}

          {/* Zone separator rings — dashed circles at depth transition radii */}
          {ZONE_BOUNDS.map((r, i) => (
            <circle
              key={r}
              cx="100"
              cy="100"
              r={r}
              fill="none"
              stroke={DEPTH_COLORS[(i + 2) as DiveDepth]}
              strokeWidth="0.6"
              strokeDasharray="3,5"
              opacity="0.3"
            />
          ))}

          {/* Active zone glow — thick annular ring at current depth midpoint */}
          {depth !== undefined && pR !== null && (
            <circle
              cx="100"
              cy="100"
              r={pR}
              fill="none"
              stroke={depthColor}
              strokeWidth={ZONE_GLOW_W[depth]}
              opacity="0.2"
            >
              <animate
                attributeName="opacity"
                values="0.2;0.06;0.2"
                dur="2.5s"
                repeatCount="indefinite"
              />
            </circle>
          )}

          {/* Probe: dashed radial line + pulsing dot + expanding ring */}
          {depth !== null && probeCx !== null && probeCy !== null && (
            <>
              <line
                x1="100"
                y1="100"
                x2={probeCx}
                y2={probeCy}
                stroke={depthColor}
                strokeWidth="0.5"
                opacity="0.4"
                strokeDasharray="2,3"
              />
              <circle
                cx={probeCx}
                cy={probeCy}
                r="4"
                fill={depthColor}
                opacity="0.9"
              >
                <animate
                  attributeName="r"
                  values="3;5.5;3"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.9;0.35;0.9"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle
                cx={probeCx}
                cy={probeCy}
                r="7"
                fill="none"
                stroke={depthColor}
                strokeWidth="1"
                opacity="0.5"
              >
                <animate
                  attributeName="r"
                  values="6;11;6"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.5;0;0.5"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
              </circle>
            </>
          )}
        </g>

        {/* Lit rim */}
        <circle
          cx="100"
          cy="100"
          r="70"
          fill="none"
          stroke={colors.band3}
          strokeWidth="1.5"
          opacity="0.5"
        />

        {/* Night-side shadow overlay */}
        <circle cx="100" cy="100" r="70" fill="url(#gg-shadow)" />

        {/* Ring — ellipse for perspective, centered on planet */}
        <ellipse
          cx="100"
          cy="100"
          rx="92"
          ry="11"
          fill="none"
          stroke={colors.band1}
          strokeWidth="5"
          opacity="0.22"
        />
        <ellipse
          cx="100"
          cy="100"
          rx="92"
          ry="11"
          fill="none"
          stroke={colors.band3}
          strokeWidth="1.5"
          opacity="0.28"
        />
      </svg>
    </div>
  );
}

function DepthMeter({ currentDepth }: { currentDepth: DiveDepth }) {
  return (
    <div className="flex items-stretch gap-1 shrink-0">
      {([1, 2, 3, 4] as DiveDepth[]).map((d) => {
        const active = d === currentDepth;
        const passed = d < currentDepth;
        const color = DEPTH_COLORS[d];
        return (
          <div
            key={d}
            className="flex-1 flex flex-col items-center gap-1"
          >
            <div
              className="text-sm leading-none"
              style={{ opacity: passed || active ? 1 : 0.25 }}
            >
              {DEPTH_ICONS[d]}
            </div>
            <div
              className="h-1.5 w-full rounded-full transition-all"
              style={{
                backgroundColor:
                  passed || active ? color : "#1a1a2e",
                boxShadow: active ? `0 0 8px ${color}` : "none",
              }}
            />
            <div
              className="text-[9px] text-center leading-tight"
              style={{
                color: active
                  ? color
                  : passed
                    ? "#444"
                    : "#333",
              }}
            ></div>
          </div>
        );
      })}
    </div>
  );
}

export function GasGiantPanel() {
  const currentLocation = useGameStore((s) => s.currentLocation);
  const activeDive = useGameStore((s) => s.activeDive);
  const turn = useGameStore((s) => s.turn);
  const startDive = useGameStore((s) => s.startDive);
  const resolveDiveEvent = useGameStore((s) => s.resolveDiveEvent);
  const diveDeeper = useGameStore((s) => s.diveDeeper);
  const surfaceDive = useGameStore((s) => s.surfaceDive);
  const abandonDive = useGameStore((s) => s.abandonDive);
  const probes = useGameStore((s) => s.probes);
  const showSectorMap = useGameStore((s) => s.showSectorMap);
  const { t } = useTranslation();

  const [showAbandonWarning, setShowAbandonWarning] = useState(false);

  if (!currentLocation || currentLocation.type !== "gas_giant") return null;

  const atmosphere = currentLocation.gasGiantAtmosphere ?? "hydrogen";
  const lastDiveAt = currentLocation.gasGiantLastDiveAt;
  const cooldownRemaining =
    lastDiveAt !== undefined
      ? Math.max(0, GAS_GIANT_DIVE_COOLDOWN - (turn - lastDiveAt))
      : 0;
  const canDive = cooldownRemaining === 0 && !activeDive && probes > 0;

  // Mirror the bonus logic from surfaceDive.ts so the panel shows final amounts
  const ATMOSPHERE_BONUS_KEY: Record<
    string,
    "alien_biology" | "rare_minerals" | "void_membrane"
  > = {
    hydrogen: "alien_biology",
    methane: "rare_minerals",
    ammonia: "void_membrane",
  };

  function getBoostedQty(
    key: "alien_biology" | "rare_minerals" | "void_membrane",
    raw: number,
  ): number {
    if (raw === 0) return 0;
    if (atmosphere === "nitrogen") return Math.ceil(raw * 1.25);
    if (ATMOSPHERE_BONUS_KEY[atmosphere] === key)
      return Math.ceil(raw * 1.5);
    return raw;
  }

  // Bonus label shown next to the section header
  const atmosphereBonusLabel = (() => {
    if (!activeDive) return null;
    if (atmosphere === "nitrogen") return "× все ресурсы +25%";
    const bonusKey = ATMOSPHERE_BONUS_KEY[atmosphere];
    if (!bonusKey) return null;
    const rd = RESEARCH_RESOURCES[bonusKey];
    return `${rd?.icon} ${rd?.name} +50%`;
  })();

  const rewardEntries = activeDive
    ? (["alien_biology", "rare_minerals", "void_membrane"] as const)
      .filter((k) => activeDive.rewards[k] > 0)
      .map((k) => {
        const raw = activeDive.rewards[k];
        const boosted = getBoostedQty(k, raw);
        return {
          key: k,
          qty: raw,
          boosted,
          isBoosted: boosted !== raw,
          rd: RESEARCH_RESOURCES[k],
        };
      })
    : [];

  const depthColor = activeDive
    ? DEPTH_COLORS[activeDive.currentDepth]
    : "#7b4fff";

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="font-['Orbitron'] font-bold text-[#7b4fff] uppercase tracking-wider text-sm">
          🪸 {t(`gas_giant.atmosphere_${atmosphere}`)}
        </div>
        <button
          onClick={() => activeDive ? setShowAbandonWarning(true) : showSectorMap()}
          className="text-[#ff0040] hover:text-white text-lg font-bold cursor-pointer px-1"
        >
          ✕
        </button>
      </div>

      {/* Gas Giant Visual */}
      <GasGiantVisual
        atmosphere={atmosphere}
        depth={activeDive?.currentDepth}
      />

      {/* Description (only when not diving) */}
      {!activeDive && (
        <div className="text-xs text-[#888] leading-relaxed border border-[#1a1a2e] p-3 bg-[rgba(123,79,255,0.04)]">
          {t("gas_giant.description")}
        </div>
      )}

      {/* Active dive state */}
      {activeDive && (
        <>
          {/* Depth indicator */}
          <div
            className="border p-2 shrink-0"
            style={{
              borderColor: depthColor,
              background: `rgba(0,0,0,0.4)`,
            }}
          >
            <div
              className="text-[10px] uppercase tracking-wider mb-2 text-center font-['Orbitron']"
              style={{ color: depthColor }}
            >
              {DEPTH_ICONS[activeDive.currentDepth]}{" "}
              {t(`gas_giant.depth_${activeDive.currentDepth}`)}
            </div>
            <DepthMeter currentDepth={activeDive.currentDepth} />
          </div>

          {/* Accumulated rewards */}
          {rewardEntries.length > 0 && (
            <div className="border border-[#1a1a2e] p-2 bg-[rgba(0,0,0,0.3)] shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] text-[#888] uppercase tracking-wider">
                  {t("gas_giant.collected")}
                </div>
                {atmosphereBonusLabel && (
                  <div className="text-[10px] text-[#ffb000] opacity-80">
                    ✦ {atmosphereBonusLabel}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {rewardEntries.map(
                  ({ key, boosted, isBoosted, rd }) => (
                    <span
                      key={key}
                      className="text-xs flex items-center gap-1"
                      style={{
                        color: rd?.color ?? "#fff",
                      }}
                    >
                      <span>{rd?.icon}</span>
                      <span>{rd?.name}</span>
                      <span className="font-bold">
                        ×{boosted}
                      </span>
                      {isBoosted && (
                        <span className="text-[#ffb000] text-[10px]">
                          ✦
                        </span>
                      )}
                    </span>
                  ),
                )}
              </div>
            </div>
          )}

          {/* Dive deeper / Surface buttons */}
          {!activeDive.currentEvent && (
            <div className="flex flex-col gap-2 shrink-0">
              {activeDive.currentDepth < 4 &&
                !activeDive.finished && (
                  <Button
                    onClick={diveDeeper}
                    className={`w-full bg-transparent border-2 text-xs cursor-pointer uppercase tracking-wider transition-colors ${DEPTH_BTN_CLASSES[(activeDive.currentDepth + 1) as DiveDepth]}`}
                  >
                    🔽 {t("gas_giant.dive_deeper")}
                    <span className="ml-2 text-[10px] opacity-60">
                      →{" "}
                      {t(
                        `gas_giant.depth_${(activeDive.currentDepth + 1) as DiveDepth}`,
                      )}
                    </span>
                  </Button>
                )}
              {activeDive.finished &&
                rewardEntries.length === 0 ? (
                <Button
                  onClick={surfaceDive}
                  className="w-full bg-transparent border-2 border-[#ff0040] text-[#ff0040] hover:bg-[#ff0040] hover:text-[#050810] uppercase tracking-wider text-xs cursor-pointer"
                >
                  💥 {t("gas_giant.leave_probe_lost")}
                </Button>
              ) : (
                <Button
                  onClick={surfaceDive}
                  className="w-full bg-transparent border-2 border-[#00d4ff] text-[#00d4ff] hover:bg-[#00d4ff] hover:text-[#050810] uppercase tracking-wider text-xs cursor-pointer"
                >
                  🔼 {t("gas_giant.surface")}
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {/* Initial dive button */}
      {!activeDive && (
        <div className="flex flex-col gap-2 shrink-0">
          <div className="text-xs text-[#888] text-center">
            🔬 {t("gas_giant.probes_available", { count: probes })}
          </div>
          {probes <= 0 && (
            <div className="text-xs text-[#ff0040] text-center">
              {t("gas_giant.no_probes")}
            </div>
          )}
          {cooldownRemaining > 0 && (
            <div className="text-xs text-[#888] text-center">
              {t("gas_giant.cooldown", {
                turns: cooldownRemaining,
              })}
            </div>
          )}
          <Button
            onClick={() => startDive(currentLocation.id)}
            disabled={!canDive}
            className="w-full bg-transparent border-2 border-[#7b4fff] text-[#7b4fff] hover:bg-[#7b4fff] hover:text-[#050810] uppercase tracking-wider cursor-pointer disabled:opacity-40 disabled:cursor-default"
          >
            🪸 {t("gas_giant.start_dive")}
          </Button>
          <Button
            onClick={showSectorMap}
            className="w-full bg-transparent border border-[#333] text-[#888] hover:bg-[#1a1a2e] text-xs cursor-pointer"
          >
            {t("gas_giant.leave")}
          </Button>
        </div>
      )}

      {/* Abandon dive warning */}
      <Dialog open={showAbandonWarning}>
        <DialogContent
          className="max-w-sm p-0"
          style={{ background: "#050810", border: "2px solid #ff0040" }}
          onInteractOutside={(e) => e.preventDefault()}
          showCloseButton={false}
        >
          <div className="flex flex-col gap-4 p-4">
            <DialogTitle className="font-bold text-sm font-['Orbitron'] uppercase tracking-wider text-[#ff0040]">
              ⚠ Прервать погружение?
            </DialogTitle>
            <p className="text-xs text-[#aaa] leading-relaxed border-l-2 border-[#ff004066] pl-3">
              Если покинуть планету сейчас — зонд будет утерян и собранные ресурсы не будут получены.
              Вернувшись позже, можно начать новое погружение (при наличии свободного зонда).
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowAbandonWarning(false)}
                className="flex-1 bg-transparent border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] text-xs cursor-pointer uppercase tracking-wider"
              >
                Остаться
              </Button>
              <Button
                onClick={() => {
                  setShowAbandonWarning(false);
                  abandonDive();
                  showSectorMap();
                }}
                className="flex-1 bg-transparent border border-[#ff0040] text-[#ff0040] hover:bg-[#ff0040] hover:text-[#050810] text-xs cursor-pointer uppercase tracking-wider"
              >
                Бросить зонд
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dive event modal */}
      <Dialog open={!!activeDive?.currentEvent}>
        <DialogContent
          className="max-w-sm p-0"
          style={{
            background: "#050810",
            border: `2px solid ${activeDive ? DEPTH_COLORS[activeDive.currentDepth] : "#7b4fff"}`,
          }}
          onInteractOutside={(e) => e.preventDefault()}
          showCloseButton={false}
        >
          <div className="flex flex-col gap-3 p-4">
            {/* Depth badge */}
            {activeDive && (
              <div
                className="text-[10px] uppercase tracking-widest font-['Orbitron'] flex items-center gap-1.5"
                style={{
                  color: DEPTH_COLORS[
                    activeDive.currentDepth
                  ],
                }}
              >
                <span>
                  {DEPTH_ICONS[activeDive.currentDepth]}
                </span>
                <span>
                  {t(
                    `gas_giant.depth_${activeDive.currentDepth}`,
                  )}
                </span>
              </div>
            )}
            <DialogTitle
              className="font-bold text-sm font-['Orbitron'] uppercase tracking-wider"
              style={{
                color: activeDive
                  ? DEPTH_COLORS[activeDive.currentDepth]
                  : "#7b4fff",
              }}
            >
              {activeDive?.currentEvent
                ? t(activeDive.currentEvent.titleKey)
                : ""}
            </DialogTitle>
            <div
              className="text-xs text-[#aaa] leading-relaxed border-l-2 pl-3"
              style={{
                borderColor: activeDive
                  ? DEPTH_COLORS[activeDive.currentDepth] +
                  "66"
                  : "#333",
              }}
            >
              {activeDive?.currentEvent
                ? t(activeDive.currentEvent.descKey)
                : ""}
            </div>
            <div className="flex flex-col gap-1.5">
              {activeDive?.currentEvent?.choices.map(
                (choice, idx) => {
                  const hasDamage =
                    choice.damageChance &&
                    choice.damageChance > 0;
                  const hasLoss =
                    choice.probeLossChance &&
                    choice.probeLossChance > 0;
                  const depthClass = activeDive
                    ? DEPTH_BTN_CLASSES[
                    activeDive.currentDepth
                    ]
                    : DEPTH_BTN_CLASSES[1];
                  return (
                    <Button
                      key={idx}
                      onClick={() =>
                        resolveDiveEvent(idx)
                      }
                      className={`bg-transparent border text-xs py-1.5 cursor-pointer text-left justify-start flex-col items-start h-auto transition-colors ${depthClass}`}
                    >
                      <span>{t(choice.labelKey)}</span>
                      <span className="text-[10px] opacity-60 font-normal flex items-center gap-2 flex-wrap">
                        {choice.rewards
                          .map((r) => {
                            const rd =
                              RESEARCH_RESOURCES[
                              r.type
                              ];
                            return `${rd?.icon} ×${r.quantity}`;
                          })
                          .join("  ")}
                        {hasDamage && (
                          <span className="text-[#ff6666]">
                            ⚠️ {choice.damageChance}
                            %
                          </span>
                        )}
                        {hasLoss && (
                          <span className="text-[#ff9900]">
                            {t(
                              "gas_giant.probe_loss_chance",
                              {
                                chance:
                                  choice.probeLossChance ??
                                  0,
                              },
                            )}
                          </span>
                        )}
                      </span>
                    </Button>
                  );
                },
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
