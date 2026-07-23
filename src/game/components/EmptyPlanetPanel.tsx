"use client";

import { useState } from "react";
import Image from "next/image";
import { useGameStore } from "@/game/store";
import { PLANET_POINT_OF_INTERESTS } from "@/game/constants/planets";
import { RESEARCH_RESOURCES } from "@/game/constants";
import { getAugmentationBonus } from "@/game/constants/augmentations";
import { Button } from "@/components/ui/button";
import { PlanetExpeditionSetup } from "./PlanetExpeditionSetup";
import {
    getPlanetBackgroundClass,
    getPlanetFeatures,
    hashPlanetId,
    PLANET_FEATURES,
} from "@/game/planets";
import {
    getDrillMaxPasses,
    getDrillsDone,
    DRILL_COOLDOWN_TURNS,
    SCOUT_EVENTS,
} from "@/game/slices/locations/helpers";
import { useTranslation } from "@/lib/useTranslation";
import {
    getLocationName,
    getPlanetDescription,
    getPlanetTypeName,
} from "@/lib/translationHelpers";
import type { PlanetType, SurfaceLogEntry } from "@/game/types";

/** Фоновые сцены по типу пустой планеты. */
const EMPTY_PLANET_BACKGROUNDS: Record<PlanetType, string> = {
    Пустынная: "/assets/planet-types/desert.webp",
    Ледяная: "/assets/planet-types/ice.webp",
    Лесная: "/assets/planet-types/forest.webp",
    Вулканическая: "/assets/planet-types/volcanic.webp",
    Океаническая: "/assets/planet-types/ocean.webp",
    Кристаллическая: "/assets/planet-types/crystal.webp",
    Радиоактивная: "/assets/planet-types/radioactive.webp",
    Тропическая: "/assets/planet-types/tropical.webp",
    Арктическая: "/assets/planet-types/arctic.webp",
    "Разрушенная войной": "/assets/planet-types/war-torn.webp",
    "Планета-кольцо": "/assets/planet-types/ring.webp",
    Приливная: "/assets/planet-types/tidal.webp",
};

/** Диапазон температур и тип атмосферы для флейвор-телеметрии */
const PLANET_TELEMETRY: Record<
    PlanetType,
    { temp: [number, number]; atmo: string }
> = {
    Пустынная: { temp: [40, 90], atmo: "thin" },
    Ледяная: { temp: [-160, -90], atmo: "frozen" },
    Лесная: { temp: [5, 30], atmo: "dense" },
    Вулканическая: { temp: [300, 700], atmo: "toxic" },
    Океаническая: { temp: [0, 25], atmo: "humid" },
    Кристаллическая: { temp: [-60, 10], atmo: "thin" },
    Радиоактивная: { temp: [10, 60], atmo: "irradiated" },
    Тропическая: { temp: [25, 45], atmo: "humid" },
    Арктическая: { temp: [-120, -40], atmo: "frozen" },
    "Разрушенная войной": { temp: [-20, 40], atmo: "toxic" },
    "Планета-кольцо": { temp: [-180, -120], atmo: "none" },
    Приливная: { temp: [-100, 250], atmo: "corrosive" },
};

/** Карточка операции на поверхности */
function OpsCard({
    icon,
    title,
    accent,
    done,
    doneLabel,
    blockedLabel,
    buttonLabel,
    onAction,
    children,
}: {
    icon: string;
    title: string;
    accent: string;
    done: boolean;
    doneLabel: string;
    blockedLabel?: string; // задан, когда действие недоступно
    buttonLabel: string;
    onAction: () => void;
    children?: React.ReactNode;
}) {
    return (
        <div
            className="flex flex-col gap-2 border p-2.5 sm:p-3"
            style={{
                borderColor: done ? "#333" : `${accent}66`,
                backgroundColor: done ? "rgba(255,255,255,0.02)" : `${accent}0a`,
            }}
        >
            <div
                className="font-['Orbitron'] font-bold text-xs sm:text-sm flex items-center gap-1.5"
                style={{ color: done ? "#666" : accent }}
            >
                <span>{icon}</span>
                {title}
            </div>
            {children}
            <div className="mt-auto">
                {done ? (
                    <span className="text-[#555] text-xs">✓ {doneLabel}</span>
                ) : blockedLabel ? (
                    <span className="text-destructive text-xs">
                        {blockedLabel}
                    </span>
                ) : (
                    <Button
                        onClick={onAction}
                        className="cursor-pointer bg-transparent border-2 uppercase tracking-wider text-xs px-3 py-1 h-auto"
                        style={{ borderColor: accent, color: accent }}
                    >
                        {buttonLabel}
                    </Button>
                )}
            </div>
        </div>
    );
}

/** Одна запись журнала находок */
function SurfaceLogRow({
    entry,
    t,
}: {
    entry: SurfaceLogEntry;
    t: (key: string, params?: Record<string, string | number>) => string;
}) {
    const parts: { text: string; color: string }[] = [];
    if (entry.credits) {
        parts.push({
            text: t("planet_panel.found_resources", { value: entry.credits }),
            color: "#00ff41",
        });
    }
    if (entry.tradeGood) {
        parts.push({
            text: t("planet_panel.found_goods", {
                name: entry.tradeGood.name,
                quantity: entry.tradeGood.quantity,
            }),
            color: "#00ff41",
        });
    }
    if (entry.researchResources?.length) {
        parts.push({
            text: entry.researchResources
                .map((res) => {
                    const rd = RESEARCH_RESOURCES[res.type];
                    return `🔬 ${rd?.icon ?? ""} ${rd?.name ?? res.type} x${res.quantity}`;
                })
                .join(", "),
            color: "#4488ff",
        });
    }
    if (entry.mutationName) {
        parts.push({
            text: t("planet_panel.scout_mutation", {
                name: entry.mutationName,
            }),
            color: "#cc44ff",
        });
    }
    if (entry.enemyThreat) {
        parts.push({
            text: t("planet_panel.found_enemy", { threat: entry.enemyThreat }),
            color: "#ff4444",
        });
    }
    if (parts.length === 0) {
        parts.push({
            text: t("planet_panel.found_nothing"),
            color: "#888",
        });
    }

    return (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs border-b border-[#ffffff0d] pb-1.5 last:border-b-0 last:pb-0">
            <span className="text-[#888] shrink-0">
                {t(`planet_panel.log_${entry.source}`)}:
            </span>
            {parts.map((p, i) => (
                <span key={i} style={{ color: p.color }}>
                    {p.text}
                </span>
            ))}
        </div>
    );
}

/** Экран пустой (ненаселённой) планеты */
export function EmptyPlanetPanel() {
    const { t } = useTranslation();
    const currentLocation = useGameStore((s) => s.currentLocation);
    const crew = useGameStore((s) => s.crew);
    const ship = useGameStore((s) => s.ship);
    const researchedTechs = useGameStore((s) => s.research.researchedTechs);
    const sendScoutingMission = useGameStore((s) => s.sendScoutingMission);
    const planetaryDrill = useGameStore((s) => s.planetaryDrill);
    const atmosphericAnalysis = useGameStore((s) => s.atmosphericAnalysis);
    const orbitalScan = useGameStore((s) => s.orbitalScan);
    const resolveScoutEvent = useGameStore((s) => s.resolveScoutEvent);
    const pendingScoutEvent = useGameStore((s) => s.pendingScoutEvent);
    const turn = useGameStore((s) => s.turn);
    const showSectorMap = useGameStore((s) => s.showSectorMap);

    const [showExpeditionSetup, setShowExpeditionSetup] = useState(false);

    if (!currentLocation) return null;
    const planetId = currentLocation.id;
    const planetType = currentLocation.planetType;

    // Разведка
    const hasScout = crew.some((c) => c.profession === "scout");
    const scoutedTimes = currentLocation.scoutedTimes || 0;
    const bestScout = crew
        .filter((c) => c.profession === "scout")
        .sort((a, b) => (b.level ?? 1) - (a.level ?? 1))[0];
    const scoutHasOptical =
        getAugmentationBonus(bestScout, "extraScoutAttempts") > 0;
    const maxScoutAttempts = 3 + (scoutHasOptical ? 1 : 0);
    const canScout = scoutedTimes < maxScoutAttempts;

    // Бурение (многопроходное, с кулдауном)
    const hasDrillTech = researchedTechs.includes("planetary_drill");
    const hasDrillModule = ship.modules.some(
        (m) =>
            m.type === "drill" &&
            m.health > 0 &&
            !m.disabled &&
            !m.manualDisabled,
    );
    const drillsDone = getDrillsDone(currentLocation);
    const drillMaxPasses = getDrillMaxPasses(planetId);
    const drillExhausted = drillsDone >= drillMaxPasses;
    const drillCooldownLeft =
        currentLocation.lastDrillTurn !== undefined
            ? Math.max(
                  0,
                  DRILL_COOLDOWN_TURNS - (turn - currentLocation.lastDrillTurn),
              )
            : 0;

    // Особенности планеты и орбитальное сканирование
    const features = getPlanetFeatures(planetId);
    const ionosphereBlocked = features.includes("dense_ionosphere");
    const featuresRevealed =
        !!currentLocation.explored ||
        (!!currentLocation.orbitalScanned && !ionosphereBlocked);
    const hasWorkingScanner = ship.modules.some(
        (m) =>
            m.type === "scanner" &&
            m.health > 0 &&
            !m.disabled &&
            !m.manualDisabled,
    );
    const canOrbitalScan =
        !currentLocation.orbitalScanned && !currentLocation.explored;
    const poiRevealed = featuresRevealed;

    // Ожидающее событие разведки этой планеты
    const activeScoutEvent =
        pendingScoutEvent?.planetId === planetId
            ? SCOUT_EVENTS.find((e) => e.id === pendingScoutEvent.eventId)
            : undefined;

    // Анализ атмосферы
    const hasAtmoTech = researchedTechs.includes("atmospheric_analysis");
    const hasScientist = crew.some((c) => c.profession === "scientist");

    // Точка интереса / экспедиция
    const pointOfInterest = planetType
        ? currentLocation.pointOfInterest ??
          PLANET_POINT_OF_INTERESTS[planetType]
        : undefined;
    const hasExpeditionKits = researchedTechs.includes("expedition_kits");

    // Телеметрия (детерминирована по id планеты)
    const telemetry = planetType ? PLANET_TELEMETRY[planetType] : undefined;
    const hash = hashPlanetId(planetId);
    const gravity = (0.3 + ((hash % 150) / 100)).toFixed(2);
    const temp = telemetry
        ? telemetry.temp[0] +
          ((hash >> 4) % (telemetry.temp[1] - telemetry.temp[0] + 1))
        : 0;

    // Журнал находок; для старых сейвов собираем из последних результатов
    const legacyLog: SurfaceLogEntry[] = [];
    if (!currentLocation.surfaceLog) {
        const { lastScoutResult, lastDrillResult, lastAtmosphericResult } =
            currentLocation;
        if (lastScoutResult) {
            legacyLog.push({
                source: "scout",
                credits: lastScoutResult.value,
                tradeGood: lastScoutResult.itemName
                    ? {
                          name: lastScoutResult.itemName,
                          quantity: lastScoutResult.quantity ?? 1,
                      }
                    : undefined,
                researchResources: lastScoutResult.researchResources,
                mutationName: lastScoutResult.mutationName,
                enemyThreat: lastScoutResult.enemyThreat,
            });
        }
        if (lastDrillResult) {
            legacyLog.push({
                source: "drill",
                tradeGood: lastDrillResult.tradeGood,
                researchResources: lastDrillResult.researchResources,
            });
        }
        if (lastAtmosphericResult) {
            legacyLog.push({
                source: "analysis",
                researchResources: lastAtmosphericResult.researchResources,
            });
        }
    }
    const surfaceLog = currentLocation.surfaceLog ?? legacyLog;

    const background = planetType
        ? EMPTY_PLANET_BACKGROUNDS[planetType]
        : undefined;
    const planetBgClass = getPlanetBackgroundClass(planetType);

    return (
        <div
            className={`flex flex-col gap-3 p-2 sm:p-3 rounded-lg border border-[#333] ${planetBgClass}`}
        >
            <div className="relative z-10 min-h-0 overflow-hidden rounded border border-[#333] bg-[rgba(5,8,16,0.9)]">
                {/* Полноширинная сцена планеты */}
                <section className="relative overflow-hidden border-b border-[#333]">
                    {background && (
                        <Image
                            src={background}
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 50vw, 100vw"
                            unoptimized
                            className="object-cover"
                        />
                    )}
                    <div
                        className="absolute inset-0"
                        style={{
                            background:
                                "linear-gradient(90deg, rgba(5,8,16,0.96) 0%, rgba(5,8,16,0.78) 52%, rgba(5,8,16,0.32) 100%)",
                        }}
                    />
                    <div
                        className="absolute inset-x-0 bottom-0 h-2/3"
                        style={{
                            background:
                                "linear-gradient(0deg, rgba(5,8,16,0.92) 0%, rgba(5,8,16,0) 100%)",
                        }}
                    />
                    <div className="relative z-10 flex min-h-0 sm:min-h-52 flex-col justify-between gap-2 sm:gap-4 p-3 sm:p-5">
                        <div className="flex items-start justify-between gap-2">
                            <div className="max-w-2xl">
                                <div className="font-['Orbitron'] font-bold text-base sm:text-xl text-accent">
                                    ▸ {getLocationName(currentLocation.name, t)}
                                    {planetType
                                        ? ` - ${getPlanetTypeName(planetType, t)}`
                                        : ""}
                                </div>
                                <div className="mt-1 text-xs sm:text-sm italic leading-relaxed text-[#b5c1c6]">
                                    {planetType
                                        ? getPlanetDescription(planetType, t) ||
                                          t("planet_panel.empty_description")
                                        : t("planet_panel.empty_description")}
                                </div>
                                <div className="mt-1 text-xs text-[#888]">
                                    {t("planet_panel.empty_planet")}
                                </div>
                            </div>
                            <Button
                                onClick={showSectorMap}
                                className="h-auto shrink-0 cursor-pointer border-2 border-accent bg-transparent px-2 py-1 text-[10px] uppercase tracking-wider text-accent hover:bg-accent hover:text-[#050810] sm:px-4 sm:py-2 sm:text-sm"
                            >
                                {t("planet_panel.leave_planet")}
                            </Button>
                        </div>

                        <div className="space-y-1.5">
                            {/* Телеметрия */}
                            {telemetry && (
                                <div className="flex flex-wrap gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                                    <span className="border border-[#00d4ff44] bg-[rgba(0,212,255,0.08)] px-2 py-0.5 text-[#00d4ff] backdrop-blur-sm">
                                        ⊕ {t("planet_panel.telemetry_gravity")}
                                        : {gravity}g
                                    </span>
                                    <span className="border border-[#00d4ff44] bg-[rgba(0,212,255,0.08)] px-2 py-0.5 text-[#00d4ff] backdrop-blur-sm">
                                        🌡 {t("planet_panel.telemetry_temp")}:{" "}
                                        {temp}
                                        °C
                                    </span>
                                    <span className="border border-[#00d4ff44] bg-[rgba(0,212,255,0.08)] px-2 py-0.5 text-[#00d4ff] backdrop-blur-sm">
                                        ☁ {t("planet_panel.telemetry_atmo")}:{" "}
                                        {t(
                                            `planet_panel.atmo.${telemetry.atmo}`,
                                        )}
                                    </span>
                                </div>
                            )}

                            {/* Особенности планеты */}
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                                {featuresRevealed ? (
                                    features.map((f) => (
                                        <span
                                            key={f}
                                            className="border border-[#ffb00055] bg-[rgba(255,176,0,0.08)] px-2 py-0.5 text-[#ffb000] backdrop-blur-sm cursor-help"
                                            title={t(
                                                `planet_features.${f}.desc`,
                                            )}
                                        >
                                            {PLANET_FEATURES[f].icon}{" "}
                                            {t(`planet_features.${f}.name`)}
                                        </span>
                                    ))
                                ) : currentLocation.orbitalScanned &&
                                  ionosphereBlocked ? (
                                    <span className="border border-[#ffb00055] bg-[rgba(255,176,0,0.08)] px-2 py-0.5 text-[#ffb000] backdrop-blur-sm">
                                        {t("planet_panel.orbital_scan_blocked")}
                                    </span>
                                ) : (
                                    <span className="border border-[#ffffff22] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 text-[#888] backdrop-blur-sm">
                                        {t("planet_panel.features_hidden")}
                                    </span>
                                )}

                                {/* Орбитальное сканирование */}
                                {canOrbitalScan && (
                                    <Button
                                        onClick={() => orbitalScan(planetId)}
                                        disabled={!hasWorkingScanner}
                                        title={
                                            hasWorkingScanner
                                                ? undefined
                                                : t(
                                                      "planet_panel.orbital_scan_requires_scanner",
                                                  )
                                        }
                                        className="h-auto cursor-pointer border border-ring bg-transparent px-2 py-0.5 text-[10px] sm:text-xs uppercase tracking-wider text-ring hover:bg-ring hover:text-[#050810] disabled:opacity-40"
                                    >
                                        {t("planet_panel.orbital_scan")}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <div className="p-2.5 sm:p-4 space-y-3">
                    {/* Консоль операций на поверхности */}
                    <div>
                        <div className="font-['Orbitron'] font-bold text-sm text-accent mb-2">
                            ⚙ {t("planet_panel.surface_ops")}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            <OpsCard
                                icon="🔭"
                                title={t("planet.scout_surface")}
                                accent="#00ff41"
                                done={!canScout}
                                doneLabel={t("planet_panel.fully_explored")}
                                blockedLabel={
                                    hasScout
                                        ? undefined
                                        : t("planet.scout_requires_scout")
                                }
                                buttonLabel={t("planet.scout_surface")}
                                onAction={() => sendScoutingMission(planetId)}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1.5">
                                        {Array.from({
                                            length: maxScoutAttempts,
                                        }).map((_, i) => (
                                            <div
                                                key={i}
                                                className={`w-2.5 h-2.5 rounded-full border ${
                                                    i < scoutedTimes
                                                        ? "bg-[#00ff41] border-[#00ff41]"
                                                        : "bg-transparent border-[#444]"
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-xs text-[#888]">
                                        {scoutedTimes}/{maxScoutAttempts}
                                    </span>
                                </div>
                            </OpsCard>

                            {hasDrillTech && (
                                <OpsCard
                                    icon="⛏️"
                                    title={t("planet.drill_title")}
                                    accent="#ffb000"
                                    done={drillExhausted}
                                    doneLabel={t(
                                        "planet_panel.drill_exhausted",
                                    )}
                                    blockedLabel={
                                        !hasDrillModule
                                            ? t("planet.drill_requires_drill")
                                            : drillCooldownLeft > 0
                                              ? t(
                                                    "planet_panel.drill_cooldown",
                                                    {
                                                        turns: drillCooldownLeft,
                                                    },
                                                )
                                              : undefined
                                    }
                                    buttonLabel={t("planet.drill_button")}
                                    onAction={() => planetaryDrill(planetId)}
                                >
                                    <div className="text-xs text-[#888]">
                                        {t("planet_panel.drill_passes")}:{" "}
                                        {drillsDone}/{drillMaxPasses}
                                    </div>
                                </OpsCard>
                            )}

                            {hasAtmoTech && (
                                <OpsCard
                                    icon="🌫️"
                                    title={t("planet.analysis_title")}
                                    accent="#00d4ff"
                                    done={!!currentLocation.atmosphereAnalyzed}
                                    doneLabel={t("planet.analysis_done")}
                                    blockedLabel={
                                        hasScientist
                                            ? undefined
                                            : t(
                                                  "planet.drill_requires_scientist",
                                              )
                                    }
                                    buttonLabel={t("planet.analysis_button")}
                                    onAction={() =>
                                        atmosphericAnalysis(planetId)
                                    }
                                />
                            )}
                        </div>
                    </div>

                    {/* Точка интереса: скрыта до полной разведки */}
                    {currentLocation.explored ? (
                        <div className="border border-[#00d4ff66] bg-[rgba(0,212,255,0.04)] p-3">
                            <div className="text-ring font-bold text-sm font-['Orbitron']">
                                ◈ {t("planet_panel.point_of_interest_title")}
                            </div>
                            {pointOfInterest && (
                                <div className="text-[#aaa] text-xs mt-1">
                                    {t(
                                        `planet_panel.point_of_interest_types.${pointOfInterest}`,
                                    )}
                                </div>
                            )}
                            <div className="text-xs mt-2">
                                {currentLocation.expeditionCompleted ? (
                                    <span className="text-[#555]">
                                        {t("planet_panel.expedition_finished")}
                                    </span>
                                ) : hasExpeditionKits ? (
                                    <Button
                                        onClick={() =>
                                            setShowExpeditionSetup(true)
                                        }
                                        className="cursor-pointer bg-transparent border-2 border-ring text-ring hover:bg-ring hover:text-[#050810] uppercase tracking-wider text-xs px-3 py-1"
                                    >
                                        🗺️ {t("planet_panel.explore_planet")}
                                    </Button>
                                ) : (
                                    <span className="text-destructive">
                                        {t(
                                            "planet_panel.expedition_requires_kits",
                                        )}
                                    </span>
                                )}
                            </div>
                        </div>
                    ) : poiRevealed && pointOfInterest ? (
                        <div className="border border-[#00d4ff44] border-dashed bg-[rgba(0,212,255,0.03)] p-3">
                            <div className="text-ring font-bold text-sm font-['Orbitron']">
                                ◈ {t("planet_panel.point_of_interest_title")}
                            </div>
                            <div className="text-[#aaa] text-xs mt-1">
                                {t(
                                    `planet_panel.point_of_interest_types.${pointOfInterest}`,
                                )}
                            </div>
                            <div className="text-[#666] text-xs mt-2">
                                🔒 {t("planet_panel.poi_locked_hint")}
                            </div>
                        </div>
                    ) : (
                        <div className="border border-[#ffffff1a] border-dashed bg-[rgba(255,255,255,0.02)] p-3">
                            <div className="text-[#666] font-bold text-sm font-['Orbitron']">
                                ◈ ???
                            </div>
                            <div className="text-[#666] text-xs mt-1">
                                🔒 {t("planet_panel.poi_locked_hint")}
                            </div>
                        </div>
                    )}

                    {/* Журнал находок */}
                    {surfaceLog.length > 0 && (
                        <div className="border border-[#00ff4133] bg-[rgba(0,255,65,0.03)] p-3">
                            <div className="text-accent font-bold text-sm font-['Orbitron'] mb-2">
                                ☰ {t("planet_panel.surface_log")}
                            </div>
                            <div className="space-y-1.5">
                                {[...surfaceLog].reverse().map((entry, i) => (
                                    <SurfaceLogRow
                                        key={i}
                                        entry={entry}
                                        t={t}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Событие разведки */}
                {activeScoutEvent && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-[rgba(10,20,30,0.97)] border-2 border-[#ffb000] p-4 sm:p-6 max-w-md w-full max-h-[85dvh] overflow-y-auto">
                            <div className="font-['Orbitron'] font-bold text-base text-[#ffb000]">
                                🔦 {t(activeScoutEvent.titleKey)}
                            </div>
                            <div className="mt-2 text-sm leading-relaxed text-[#aaa]">
                                {t(activeScoutEvent.descKey)}
                            </div>
                            <div className="mt-4 flex flex-col gap-2">
                                {activeScoutEvent.choices.map((choice, i) => (
                                    <Button
                                        key={i}
                                        onClick={() => resolveScoutEvent(i)}
                                        className="cursor-pointer justify-start bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] tracking-wider text-xs h-auto py-2 whitespace-normal text-left"
                                    >
                                        {t(choice.labelKey)}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Настройка экспедиции */}
                {showExpeditionSetup && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div
                            className="bg-[rgba(10,20,30,0.95)] border-2 p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
                            style={{ borderColor: "#00d4ff" }}
                        >
                            <PlanetExpeditionSetup
                                planetId={planetId}
                                onClose={() => setShowExpeditionSetup(false)}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
