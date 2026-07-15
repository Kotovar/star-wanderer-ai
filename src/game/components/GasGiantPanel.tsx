"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { RESEARCH_RESOURCES } from "@/game/constants";
import { GAS_GIANT_DIVE_COOLDOWN } from "@/game/slices/locations/helpers/gasGiant/constants";
import { useGameStore } from "@/game/store";
import type { DiveDepth } from "@/game/types/exploration";
import { getLocationName } from "@/lib/translationHelpers";
import { useTranslation } from "@/lib/useTranslation";

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

const GAS_GIANT_BACKGROUNDS = {
  hydrogen: "/assets/gas-giants/hydrogen-descent.webp",
  methane: "/assets/gas-giants/methane-descent.webp",
  ammonia: "/assets/gas-giants/ammonia-descent.webp",
  nitrogen: "/assets/gas-giants/nitrogen-descent.webp",
} as const;
const GAS_GIANT_PROBE_ART = "/assets/gas-giants/probe-descent.webp";

type GasGiantAtmosphere = keyof typeof GAS_GIANT_BACKGROUNDS;
type DiveRisk = "low" | "medium" | "high" | "critical";
type RewardTier = "common" | "rare" | "exotic" | "legendary";
type StormActivity = "low" | "moderate" | "high";

const GAS_GIANT_ASSET_URLS = [
  ...Object.values(GAS_GIANT_BACKGROUNDS),
  GAS_GIANT_PROBE_ART,
];

export function preloadGasGiantBackgrounds() {
  for (const assetUrl of GAS_GIANT_ASSET_URLS) {
    const image = new window.Image();
    image.src = assetUrl;
  }
}

const DIVE_LAYERS: ReadonlyArray<{
  depth: DiveDepth;
  pressure: string;
  risk: DiveRisk;
  reward: RewardTier;
}> = [
  { depth: 1, pressure: "1.2", risk: "low", reward: "common" },
  { depth: 2, pressure: "12", risk: "medium", reward: "rare" },
  { depth: 3, pressure: "81", risk: "high", reward: "exotic" },
  { depth: 4, pressure: "460", risk: "critical", reward: "legendary" },
];

const ATMOSPHERE_TELEMETRY: Record<
  GasGiantAtmosphere,
  { temperature: string; activity: StormActivity; accent: string }
> = {
  hydrogen: { temperature: "−128", activity: "moderate", accent: "#00d4ff" },
  methane: { temperature: "−182", activity: "low", accent: "#00ff41" },
  ammonia: { temperature: "−74", activity: "high", accent: "#ffb000" },
  nitrogen: { temperature: "−163", activity: "moderate", accent: "#9933ff" },
};

const PROBE_TOP: Record<DiveDepth, string> = {
  1: "15%",
  2: "39%",
  3: "63%",
  4: "85%",
};

function ProbeMarker({
  color,
  depth,
  lost,
}: {
  color: string;
  depth: DiveDepth;
  lost: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div
      className="absolute left-[58%] z-20 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-out motion-reduce:transition-none sm:left-[60%]"
      style={{ top: PROBE_TOP[depth] }}
    >
      <div className="relative flex h-12 w-10 items-center justify-center">
        <Image
          src={GAS_GIANT_PROBE_ART}
          alt=""
          width={256}
          height={384}
          unoptimized
          className="relative h-12 w-auto object-contain"
          style={{
            filter: lost
              ? "grayscale(1) opacity(0.4)"
              : `drop-shadow(0 0 8px ${color})`,
          }}
        />
        {!lost && (
          <span
            className="absolute -inset-2 rounded-full border opacity-60 animate-ping motion-reduce:animate-none"
            style={{ borderColor: color }}
          />
        )}
      </div>
      <div
        className="mt-1 whitespace-nowrap border bg-[#050810c9] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
        style={{ borderColor: `${color}88`, color }}
      >
        {lost ? t("gas_giant.layer_lost") : t("gas_giant.probe")}
      </div>
    </div>
  );
}

function DiveLayerRail({
  currentDepth,
  finished,
  probeLost,
}: {
  currentDepth?: DiveDepth;
  finished: boolean;
  probeLost: boolean;
}) {
  const { t } = useTranslation();

  return (
    <aside
      className="grid grid-cols-4 gap-1.5 border-t border-white/15 pt-3 lg:content-center lg:grid-cols-1 lg:gap-2 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0"
      aria-label={t("gas_giant.dive_progress")}
    >
      {DIVE_LAYERS.map(({ depth, risk, reward }) => {
        const color = DEPTH_COLORS[depth];
        const isCurrent = depth === currentDepth;
        const completed =
          currentDepth !== undefined &&
          (depth < currentDepth || (isCurrent && finished && !probeLost));
        const status = probeLost && isCurrent
          ? "lost"
          : completed
            ? "complete"
            : isCurrent
              ? "current"
              : "unexplored";
        const highlighted = completed || isCurrent;

        return (
          <div
            key={depth}
            className="relative min-w-0 rounded-sm border bg-[#050810b8] p-1.5 backdrop-blur-sm transition-colors lg:p-2.5"
            style={{
              borderColor: `${color}${highlighted ? "bb" : "45"}`,
              boxShadow: isCurrent ? `0 0 18px ${color}33` : "none",
            }}
          >
            <span
              className="absolute -left-[25px] top-1/2 hidden h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border bg-[#050810] text-[10px] font-bold lg:flex"
              style={{
                borderColor: color,
                color,
                boxShadow: isCurrent ? `0 0 12px ${color}` : "none",
              }}
            >
              {completed ? "✓" : depth}
            </span>
            <div className="flex items-start justify-between gap-1 lg:gap-2">
              <div className="min-w-0">
                <div
                  className="font-['Orbitron'] text-[8px] font-bold uppercase leading-tight tracking-wide lg:text-[10px] lg:tracking-wider"
                  style={{ color }}
                >
                  {DEPTH_ICONS[depth]}
                  <span className="ml-1 text-[7px] leading-tight sm:text-[8px] lg:ml-0 lg:text-[10px]">
                    {t(`gas_giant.depth_${depth}`)}
                  </span>
                </div>
                <div className="mt-1 hidden text-[10px] text-[#b9c6cc] lg:block">
                  {t(`gas_giant.reward_${reward}`)}
                </div>
              </div>
              <span
                className="text-[10px] font-bold lg:hidden"
                style={{ color: highlighted ? color : "#657178" }}
              >
                {completed ? "✓" : depth}
              </span>
              <span
                className="hidden shrink-0 text-[9px] uppercase tracking-wide lg:inline"
                style={{ color: highlighted ? color : "#657178" }}
              >
                {t(`gas_giant.layer_${status}`)}
              </span>
            </div>
            <div className="mt-2 hidden items-center gap-1 text-[9px] text-[#9daab0] lg:flex">
              <span>{t("gas_giant.risk")}:</span>
              <span style={{ color }}>{t(`gas_giant.risk_${risk}`)}</span>
            </div>
          </div>
        );
      })}
    </aside>
  );
}

function GasGiantDescentVisual({
  atmosphere,
  currentDepth,
  finished,
  probeLost,
  title,
  onClose,
}: {
  atmosphere: GasGiantAtmosphere;
  currentDepth?: DiveDepth;
  finished: boolean;
  probeLost: boolean;
  title: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const telemetry = ATMOSPHERE_TELEMETRY[atmosphere];
  const activeLayer = DIVE_LAYERS[(currentDepth ?? 1) - 1];
  const accent = probeLost
    ? DEPTH_COLORS[4]
    : currentDepth
      ? DEPTH_COLORS[currentDepth]
      : telemetry.accent;

  return (
    <section
      className="relative isolate flex min-h-0 flex-1 overflow-hidden border-b"
      style={{ borderColor: `${accent}88` }}
    >
      <Image
        src={GAS_GIANT_BACKGROUNDS[atmosphere]}
        alt=""
        fill
        sizes="(min-width: 1280px) 48vw, (min-width: 768px) 70vw, 100vw"
        preload
        unoptimized
        className="object-cover"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,8,16,0.96)_0%,rgba(5,8,16,0.72)_48%,rgba(5,8,16,0.36)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(0deg,rgba(5,8,16,0.98)_0%,rgba(5,8,16,0)_100%)]" />

      <div className="relative z-10 grid min-h-[385px] flex-1 gap-3 p-3 sm:min-h-[500px] sm:gap-5 sm:p-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:p-6">
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div
                className="font-['Orbitron'] text-base font-bold uppercase tracking-wider sm:text-xl"
                style={{ color: accent }}
              >
                {title}
              </div>
              <p className="mt-1 max-w-2xl text-[11px] leading-snug text-[#c3d0d5] sm:text-sm sm:leading-relaxed">
                {t("gas_giant.description")}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("gas_giant.leave")}
              className="shrink-0 cursor-pointer border border-[#ff004088] bg-[#050810a8] px-1.5 py-0.5 text-xs font-bold text-[#ff667f] transition-colors hover:bg-[#ff0040] hover:text-[#050810] sm:px-2 sm:py-1 sm:text-sm"
            >
              ✕
            </button>
          </div>

          <div className="relative mt-3 min-h-[220px] flex-1 overflow-hidden border border-white/10 bg-[#05081052] sm:mt-5 sm:min-h-[265px]">
            {currentDepth && (
              <ProbeMarker
                color={accent}
                depth={currentDepth}
                lost={probeLost}
              />
            )}

            <div className="absolute left-2 top-2 border border-white/10 bg-[#050810ce] p-2 backdrop-blur-sm sm:left-3 sm:top-3 sm:p-3">
              <div className="text-[8px] uppercase tracking-[0.16em] text-[#9caeb5] sm:text-[9px] sm:tracking-[0.18em]">
                {t("gas_giant.dive_progress")}
              </div>
              <div
                className="mt-0.5 font-['Orbitron'] text-xl font-bold sm:mt-1 sm:text-2xl"
                style={{ color: accent }}
              >
                {currentDepth ?? 0}
                <span className="text-xs text-[#9caeb5] sm:text-sm"> / 4</span>
              </div>
              <div className="mt-1.5 flex gap-1 sm:mt-2 sm:gap-1.5">
                {DIVE_LAYERS.map(({ depth }) => (
                  <span
                    key={depth}
                    className="h-2 w-2 rounded-full border sm:h-2.5 sm:w-2.5"
                    style={{
                      borderColor: DEPTH_COLORS[depth],
                      backgroundColor:
                        currentDepth !== undefined && depth <= currentDepth
                          ? DEPTH_COLORS[depth]
                          : "transparent",
                      boxShadow:
                        depth === currentDepth
                          ? `0 0 10px ${DEPTH_COLORS[depth]}`
                          : "none",
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="absolute bottom-2 left-2 grid grid-cols-3 gap-1 border border-white/10 bg-[#050810d9] p-2 text-[8px] backdrop-blur-sm sm:bottom-3 sm:left-3 sm:gap-2 sm:p-3 sm:text-[10px]">
              <div className="min-w-0">
                <div className="text-[7px] uppercase leading-tight tracking-wide text-[#87979e] sm:text-[10px]">
                  {t("gas_giant.pressure")}
                </div>
                <div className="mt-0.5 whitespace-nowrap text-[9px] font-bold text-[#e5eef1] sm:text-[10px]">
                  {activeLayer.pressure} atm
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[7px] uppercase leading-tight tracking-wide text-[#87979e] sm:text-[10px]">
                  {t("gas_giant.temperature")}
                </div>
                <div className="mt-0.5 whitespace-nowrap text-[9px] font-bold text-[#e5eef1] sm:text-[10px]">
                  {telemetry.temperature} °C
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[7px] uppercase leading-tight tracking-wide text-[#87979e] sm:text-[10px]">
                  {t("gas_giant.storm_activity")}
                </div>
                <div className="mt-0.5 text-[9px] font-bold sm:text-[10px]" style={{ color: accent }}>
                  {t(`gas_giant.activity_${telemetry.activity}`)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DiveLayerRail
          currentDepth={currentDepth}
          finished={finished}
          probeLost={probeLost}
        />
      </div>
    </section>
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
  const [showProbeLost, setShowProbeLost] = useState(false);
  const probeLost = Boolean(
    activeDive?.finished &&
      activeDive.rewards.alien_biology === 0 &&
      activeDive.rewards.rare_minerals === 0 &&
      activeDive.rewards.void_membrane === 0,
  );

  useEffect(() => {
    setShowProbeLost(probeLost);
  }, [probeLost]);

  if (!currentLocation || currentLocation.type !== "gas_giant") return null;

  const atmosphere: GasGiantAtmosphere =
    currentLocation.gasGiantAtmosphere ?? "hydrogen";
  const lastDiveAt = currentLocation.gasGiantLastDiveAt;
  const cooldownRemaining =
    lastDiveAt !== undefined
      ? Math.max(0, GAS_GIANT_DIVE_COOLDOWN - (turn - lastDiveAt))
      : 0;
  const canDive = cooldownRemaining === 0 && !activeDive && probes > 0;
  const atmosphereBonusKey: Partial<
    Record<GasGiantAtmosphere, "alien_biology" | "rare_minerals" | "void_membrane">
  > = {
    hydrogen: "alien_biology",
    methane: "rare_minerals",
    ammonia: "void_membrane",
  };

  const getBoostedQty = (
    key: "alien_biology" | "rare_minerals" | "void_membrane",
    raw: number,
  ) => {
    if (raw === 0) return 0;
    if (atmosphere === "nitrogen") return Math.ceil(raw * 1.25);
    return atmosphereBonusKey[atmosphere] === key ? Math.ceil(raw * 1.5) : raw;
  };

  const atmosphereBonusLabel = (() => {
    if (!activeDive) return null;
    if (atmosphere === "nitrogen") {
      return t("gas_giant.bonus_all_resources");
    }
    const bonusKey = atmosphereBonusKey[atmosphere];
    if (!bonusKey) return null;
    const resource = RESEARCH_RESOURCES[bonusKey];
    return t("gas_giant.bonus_resource", {
      resource: `${resource?.icon ?? ""} ${resource?.name ?? bonusKey}`.trim(),
    });
  })();

  const rewardEntries = activeDive
    ? (["alien_biology", "rare_minerals", "void_membrane"] as const)
        .filter((key) => activeDive.rewards[key] > 0)
        .map((key) => {
          const raw = activeDive.rewards[key];
          const boosted = getBoostedQty(key, raw);
          return {
            key,
            boosted,
            isBoosted: boosted !== raw,
            resource: RESEARCH_RESOURCES[key],
          };
        })
    : [];

  const title = `${t("location_types.gas_giant")} · ${getLocationName(
    currentLocation.name,
    t,
  )}`;
  const depthColor = activeDive
    ? DEPTH_COLORS[activeDive.currentDepth]
    : ATMOSPHERE_TELEMETRY[atmosphere].accent;

  const handleClose = () => {
    if (activeDive) {
      setShowAbandonWarning(true);
      return;
    }
    showSectorMap();
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-y-auto rounded-lg border bg-[#050810]"
      style={{ borderColor: `${depthColor}88` }}
    >
      <GasGiantDescentVisual
        atmosphere={atmosphere}
        currentDepth={activeDive?.currentDepth}
        finished={activeDive?.finished ?? false}
        probeLost={probeLost}
        title={title}
        onClose={handleClose}
      />

      <div className="grid min-h-44 grid-rows-[minmax(0,1fr)_auto] gap-2 p-2.5 sm:gap-3 sm:p-4 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.7fr)] lg:grid-rows-none">
        <div className="border border-white/10 bg-[rgba(0,0,0,0.32)] p-2.5 sm:p-3">
          <div className="mb-1.5 flex items-center justify-between gap-2 sm:mb-2 sm:gap-3">
            <div className="text-[9px] uppercase tracking-[0.12em] text-[#9caeb5] sm:text-[10px] sm:tracking-[0.16em]">
              {activeDive
                ? t("gas_giant.collected")
                : t("gas_giant.probes_available", { count: probes })}
            </div>
            {atmosphereBonusLabel && (
              <div className="text-[9px] text-[#ffb000] sm:text-[10px]">✦ {atmosphereBonusLabel}</div>
            )}
          </div>

          {rewardEntries.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {rewardEntries.map(({ key, boosted, isBoosted, resource }) => (
                <div
                  key={key}
                  className="border px-1.5 py-0.5 text-[10px] sm:px-2 sm:py-1 sm:text-xs"
                  style={{
                    borderColor: `${resource?.color ?? "#ffffff"}66`,
                    color: resource?.color ?? "#ffffff",
                  }}
                >
                  {resource?.icon} {resource?.name} ×{boosted}
                  {isBoosted && <span className="ml-1 text-[#ffb000]">✦</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] leading-snug text-[#b9c6cc] sm:text-xs sm:leading-relaxed">
              {activeDive?.currentEvent
                ? t("gas_giant.awaiting_decision")
                : t("gas_giant.description")}
            </p>
          )}

          {!activeDive && probes <= 0 && (
            <div className="mt-1.5 text-[11px] text-[#ff667f] sm:mt-2 sm:text-xs">{t("gas_giant.no_probes")}</div>
          )}
          {!activeDive && cooldownRemaining > 0 && (
            <div className="mt-1.5 text-[11px] text-[#b9c6cc] sm:mt-2 sm:text-xs">
              {t("gas_giant.cooldown", { turns: cooldownRemaining })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5 sm:gap-2">
          {!activeDive && (
            <>
              <Button
                onClick={() => startDive(currentLocation.id)}
                disabled={!canDive}
                className="min-h-9 cursor-pointer border-2 border-[#7b4fff] bg-transparent px-2 text-[9px] uppercase tracking-normal text-[#b894ff] hover:bg-[#7b4fff] hover:text-[#050810] disabled:cursor-default disabled:opacity-40 sm:min-h-11 sm:text-xs sm:tracking-wider"
              >
                🪸 {t("gas_giant.start_dive")}
              </Button>
              <Button
                onClick={showSectorMap}
                className="min-h-9 cursor-pointer border border-[#3c4b52] bg-transparent px-2 text-[10px] text-[#b9c6cc] hover:bg-[#17232a] sm:text-xs"
              >
                {t("gas_giant.leave")}
              </Button>
            </>
          )}

          {activeDive && !activeDive.currentEvent && (
            <>
              {activeDive.currentDepth < 4 && !activeDive.finished && (
                <Button
                  onClick={diveDeeper}
                  className="min-h-9 cursor-pointer border-2 bg-transparent px-2 text-[9px] uppercase tracking-normal sm:min-h-11 sm:text-xs sm:tracking-wider"
                  style={{
                    borderColor: DEPTH_COLORS[
                      (activeDive.currentDepth + 1) as DiveDepth
                    ],
                    color: DEPTH_COLORS[
                      (activeDive.currentDepth + 1) as DiveDepth
                    ],
                  }}
                >
                  🔽 {t("gas_giant.dive_deeper")} ·{" "}
                  {t(
                    `gas_giant.depth_${(activeDive.currentDepth + 1) as DiveDepth}`,
                  )}
                </Button>
              )}
              <Button
                onClick={surfaceDive}
                className={
                  probeLost
                    ? "min-h-9 cursor-pointer border-2 border-[#ff0040] bg-transparent px-2 text-[9px] uppercase tracking-normal text-[#ff667f] hover:bg-[#ff0040] hover:text-[#050810] sm:text-xs sm:tracking-wider"
                    : "min-h-9 cursor-pointer border-2 border-[#00d4ff] bg-transparent px-2 text-[9px] uppercase tracking-normal text-[#8cecff] hover:bg-[#00d4ff] hover:text-[#050810] sm:text-xs sm:tracking-wider"
                }
              >
                {probeLost
                  ? `💥 ${t("gas_giant.leave_probe_lost")}`
                  : `🔼 ${t("gas_giant.surface")}`}
              </Button>
            </>
          )}
        </div>
      </div>

      <Dialog open={showAbandonWarning}>
        <DialogContent
          className="max-w-sm p-0"
          style={{ background: "#050810", border: "2px solid #ff0040" }}
          onInteractOutside={(event) => event.preventDefault()}
          showCloseButton={false}
        >
          <div className="flex flex-col gap-4 p-4">
            <DialogTitle className="font-['Orbitron'] text-sm font-bold uppercase tracking-wider text-[#ff0040]">
              ⚠ Прервать погружение?
            </DialogTitle>
            <p className="border-l-2 border-[#ff004066] pl-3 text-xs leading-relaxed text-[#aaa]">
              Если покинуть планету сейчас — зонд будет утерян и собранные ресурсы не будут получены.
              Вернувшись позже, можно начать новое погружение при наличии свободного зонда.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowAbandonWarning(false)}
                className="flex-1 cursor-pointer border border-[#00ff41] bg-transparent text-xs uppercase tracking-wider text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810]"
              >
                Остаться
              </Button>
              <Button
                onClick={() => {
                  setShowAbandonWarning(false);
                  abandonDive();
                  showSectorMap();
                }}
                className="flex-1 cursor-pointer border border-[#ff0040] bg-transparent text-xs uppercase tracking-wider text-[#ff0040] hover:bg-[#ff0040] hover:text-[#050810]"
              >
                Бросить зонд
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showProbeLost}>
        <DialogContent
          className="max-w-sm p-0"
          style={{ background: "#050810", border: "2px solid #ff0040" }}
          onInteractOutside={(event) => event.preventDefault()}
          showCloseButton={false}
        >
          <div className="flex flex-col gap-4 p-4">
            <DialogTitle className="font-['Orbitron'] text-sm font-bold uppercase tracking-wider text-[#ff667f]">
              💥 {t("gas_giant.probe_lost_title")}
            </DialogTitle>
            <p className="border-l-2 border-[#ff004066] pl-3 text-xs leading-relaxed text-[#c3d0d5]">
              {t("gas_giant.probe_lost_description")}
            </p>
            <Button
              onClick={() => setShowProbeLost(false)}
              className="cursor-pointer border border-[#ff0040] bg-transparent text-xs uppercase tracking-wider text-[#ff667f] hover:bg-[#ff0040] hover:text-[#050810]"
            >
              {t("gas_giant.probe_lost_confirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!activeDive?.currentEvent}>
        <DialogContent
          className="max-w-sm p-0"
          style={{
            background: "#050810",
            border: `2px solid ${
              activeDive ? DEPTH_COLORS[activeDive.currentDepth] : "#7b4fff"
            }`,
          }}
          onInteractOutside={(event) => event.preventDefault()}
          showCloseButton={false}
        >
          <div className="flex flex-col gap-3 p-4">
            {activeDive && (
              <div
                className="flex items-center gap-1.5 font-['Orbitron'] text-[10px] uppercase tracking-widest"
                style={{ color: DEPTH_COLORS[activeDive.currentDepth] }}
              >
                <span>{DEPTH_ICONS[activeDive.currentDepth]}</span>
                <span>{t(`gas_giant.depth_${activeDive.currentDepth}`)}</span>
              </div>
            )}
            <DialogTitle
              className="font-['Orbitron'] text-sm font-bold uppercase tracking-wider"
              style={{
                color: activeDive
                  ? DEPTH_COLORS[activeDive.currentDepth]
                  : "#7b4fff",
              }}
            >
              {activeDive?.currentEvent ? t(activeDive.currentEvent.titleKey) : ""}
            </DialogTitle>
            <div
              className="border-l-2 pl-3 text-xs leading-relaxed text-[#aaa]"
              style={{
                borderColor: activeDive
                  ? `${DEPTH_COLORS[activeDive.currentDepth]}66`
                  : "#333",
              }}
            >
              {activeDive?.currentEvent ? t(activeDive.currentEvent.descKey) : ""}
            </div>
            <div className="flex flex-col gap-1.5">
              {activeDive?.currentEvent?.choices.map((choice, index) => {
                const depthStyle = activeDive
                  ? {
                      borderColor: DEPTH_COLORS[activeDive.currentDepth],
                      color: DEPTH_COLORS[activeDive.currentDepth],
                    }
                  : { borderColor: DEPTH_COLORS[1], color: DEPTH_COLORS[1] };

                return (
                  <Button
                    key={choice.labelKey}
                    onClick={() => resolveDiveEvent(index)}
                    className="h-auto cursor-pointer items-start justify-start border bg-transparent py-1.5 text-left text-xs transition-colors hover:bg-white/10"
                    style={depthStyle}
                  >
                    <span>{t(choice.labelKey)}</span>
                    <span className="flex flex-wrap items-center gap-2 text-[10px] font-normal opacity-70">
                      {choice.rewards
                        .map((reward) => {
                          const resource = RESEARCH_RESOURCES[reward.type];
                          return `${resource?.icon} ×${reward.quantity}`;
                        })
                        .join("  ")}
                      {choice.damageChance && choice.damageChance > 0 && (
                        <span className="text-[#ff667f]">⚠️ {choice.damageChance}%</span>
                      )}
                      {choice.probeLossChance && choice.probeLossChance > 0 && (
                        <span className="text-[#ffb000]">
                          {t("gas_giant.probe_loss_chance", {
                            chance: choice.probeLossChance,
                          })}
                        </span>
                      )}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
