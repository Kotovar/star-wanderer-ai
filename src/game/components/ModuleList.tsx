"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useGameStore } from "../store";
import { WEAPON_TYPES } from "../constants";
import type { Module, Weapon } from "../types";
import {
    Dialog,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { GameDialogContent } from "./GameDialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";
import { getMergedCrewMember } from "@/game/slices/crew/helpers";
import { getArtifactEffectValue } from "@/game/artifacts";
import { XENOSYMBIONT_MERGE_EFFECTS } from "@/game/constants/races";
import {
    getStandaloneMergeEffectEntries,
    computeMergePercentDelta,
    type MergeEffectKey,
} from "@/game/races/mergeEffectLabels";
import { StatIcon, type StatIconType } from "./StatIcon";
import { formatPointDefenseChances } from "@/game/slices/combat/helpers/pointDefense";
import { getModuleImageUrl } from "./moduleArt";
import { GameImage } from "./GameImage";
import {
    getFuelEfficiencyTechBonus,
    MAX_FUEL_EFFICIENCY_BONUS,
} from "@/game/research";
import {
    getModuleHealthTechDelta,
    getModuleTechBonuses,
    type ModuleTechBonus,
} from "@/game/modules/techBonuses";
import { getCrewDisplayName } from "@/game/crew/crewNames";

// Helper to get translated module name
function getTranslatedModuleName(
    moduleType: string,
    t: (key: string) => string,
): string {
    const nameMap: Record<string, string> = {
        reactor: t("module_names.reactor"),
        cockpit: t("module_names.cockpit"),
        lifesupport: t("module_names.lifesupport"),
        cargo: t("module_names.cargo"),
        weaponbay: t("module_names.weaponbay"),
        point_defense: t("module_names.point_defense"),
        shield: t("module_names.shield"),
        medical: t("module_names.medical"),
        scanner: t("module_names.scanner"),
        engine: t("module_names.engine"),
        fueltank: t("module_names.fueltank"),
        drill: t("module_names.drill"),
        ai_core: t("module_names.ai_core"),
        lab: t("module_names.lab"),
        quarters: t("module_names.quarters"),
        repair_bay: t("module_names.repair_bay"),
        bio_research_lab: t("module_names.bio_research_lab"),
        pulse_drive: t("module_names.pulse_drive"),
        habitat_module: t("module_names.habitat_module"),
        deep_survey_array: t("module_names.deep_survey_array"),
    };
    return nameMap[moduleType] || moduleType;
}

// Helper to get translated module description
function getModuleDescription(module: Module): string {
    const moduleType = module.type;

    // Use translation-based descriptions
    const descriptionMap: Record<string, string> = {
        reactor: "module_descriptions.reactor",
        cockpit: "module_descriptions.cockpit",
        lifesupport: "module_descriptions.lifesupport",
        cargo: "module_descriptions.cargo",
        weaponbay: "module_descriptions.weaponbay",
        point_defense: "module_descriptions.point_defense",
        shield: "module_descriptions.shield",
        medical: "module_descriptions.medical",
        scanner: "module_descriptions.scanner",
        engine: "module_descriptions.engine",
        fueltank: "module_descriptions.fueltank",
        drill: "module_descriptions.drill",
        ai_core: "module_descriptions.ai_core",
        lab: "module_descriptions.lab",
        quarters: "module_descriptions.quarters",
        repair_bay: "module_descriptions.repair_bay",
        bio_research_lab: "module_descriptions.bio_research_lab",
        pulse_drive: "module_descriptions.pulse_drive",
        habitat_module: "module_descriptions.habitat_module",
        deep_survey_array: "module_descriptions.deep_survey_array",
    };

    return descriptionMap[moduleType] || "";
}

/** Индекс уровня сканера по дальности: 0 (базовый) .. 4 (квантовый). Общий порог для всех мест, где показывается тир сканера. */
export function getScannerTierIndex(scanRange: number): number {
    if (scanRange >= 15) return 4;
    if (scanRange >= 8) return 3;
    if (scanRange >= 5) return 2;
    if (scanRange >= 3) return 1;
    return 0;
}

/** Процент прочности модуля (0-100), с защитой от деления на ноль. */
function getConditionPercent(module: Module): number {
    return Math.min(
        100,
        Math.round((module.health / (module.maxHealth || 100)) * 100),
    );
}

export function ModuleList() {
    const { t } = useTranslation();
    const modules = useGameStore((s) => s.ship.modules);
    const crew = useGameStore((s) => s.crew);
    const enableAllModules = useGameStore((s) => s.enableAllModules);
    const [selectedModule, setSelectedModule] = useState<Module | null>(null);

    const hasManuallyDisabled = modules.some((m) => m.manualDisabled);

    return (
        <>
            {hasManuallyDisabled && (
                <div className="flex justify-end mb-1.5">
                    <Button
                        onClick={enableAllModules}
                        className="bg-transparent border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] h-auto py-1 px-2 text-[10px]"
                    >
                        {t("module_list.enable_all")}
                    </Button>
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {modules.map((module) => (
                    <ModuleCard
                        key={module.id}
                        module={module}
                        isMerged={!!getMergedCrewMember(crew, module.id)}
                        onClick={() => setSelectedModule(module)}
                    />
                ))}
            </div>

            <ModuleDetailDialog
                module={selectedModule}
                onClose={() => setSelectedModule(null)}
            />
        </>
    );
}

interface ModuleCardProps {
    module: Module;
    onClick: () => void;
    isMerged?: boolean;
}

type StatFn = (icon: StatIconType, value: ReactNode) => ReactNode;

/** Простые модули с одним ключевым статом (реактор, щит, движок и т.д.). */
function renderPrimaryCompactStat(
    module: Module,
    stat: StatFn,
    cons: ReactNode,
): ReactNode | null {
    if (module.type === "reactor" && module.power)
        return <>{stat("power_generation", <>+{module.power}</>)}</>;
    if (module.type === "shield" && module.shields)
        return <>{stat("shields", module.shields)}{cons}</>;
    if (module.type === "fueltank" && module.capacity)
        return <>{stat("capacity", module.capacity)}</>;
    if (module.type === "cargo" && module.capacity)
        return <>{stat("cargo", `${module.capacity}т`)}{cons}</>;
    if (module.type === "engine")
        return <>{stat("fuel_efficiency", module.fuelEfficiency)}{cons}</>;
    if (module.type === "drill")
        return <><span>⛏ LV{module.level || 1}</span>{cons}</>;
    if (module.type === "scanner" && module.scanRange)
        return <>{stat("scan_range", module.scanRange)}{cons}</>;
    if (module.type === "medical" && module.healing)
        return <>{stat("health", <>+{module.healing}</>)}{cons}</>;
    if (module.type === "lab" && module.researchOutput)
        return <>{stat("research", module.researchOutput)}{cons}</>;
    if (module.type === "weaponbay" && module.weapons) {
        const activeWeapons = module.weapons.filter((w) => w !== null).length;
        return <>{stat("damage_bonus", `${activeWeapons}/${module.weapons.length}`)}{cons}</>;
    }
    if (module.type === "lifesupport" && module.oxygen)
        return <>{stat("oxygen", module.oxygen)}{cons}</>;
    if (module.type === "quarters" && module.capacity)
        return <>{stat("crew", <>+{module.capacity}</>)}{cons}</>;
    return null;
}

/** Гибридные модули с несколькими независимыми статами. */
function renderHybridCompactStat(
    module: Module,
    stat: StatFn,
    cons: ReactNode,
): ReactNode | null {
    if (module.type === "bio_research_lab")
        return <>
            {module.researchOutput ? stat("research", module.researchOutput) : null}
            {module.healing ? <span className="ml-1">{stat("health", <>+{module.healing}</>)}</span> : null}
            {cons}
        </>;
    if (module.type === "deep_survey_array")
        return <>
            {module.scanRange ? stat("scan_range", module.scanRange) : null}
            {module.researchOutput ? <span className="ml-1">{stat("research", module.researchOutput)}</span> : null}
            {cons}
        </>;
    if (module.type === "pulse_drive")
        return <>
            {module.power ? stat("power_generation", <>+{module.power}</>) : null}
            {module.fuelEfficiency ? <span className="ml-1">{stat("fuel_efficiency", module.fuelEfficiency)}</span> : null}
            {cons}
        </>;
    if (module.type === "habitat_module")
        return <>
            {module.capacity ? stat("crew", <>+{module.capacity}</>) : null}
            {module.healing ? <span className="ml-1">{stat("health", <>+{module.healing}</>)}</span> : null}
            {cons}
        </>;
    return null;
}

function CompactModuleStat({ module }: { module: Module }) {
    const { t } = useTranslation();
    const cons = module.consumption && module.consumption > 0
        ? <span className="text-[#888] inline-flex items-center gap-0.5 ml-1"><StatIcon type="power_consumption" size={24} />-{module.consumption}</span>
        : null;

    const stat: StatFn = (icon, value) => (
        <span className="inline-flex items-center gap-0.5">
            <StatIcon type={icon} size={24} />
            {value}
        </span>
    );

    return (
        renderPrimaryCompactStat(module, stat, cons) ??
        renderHybridCompactStat(module, stat, cons) ??
        (module.consumption && module.consumption > 0
            ? <span className="inline-flex items-center gap-0.5"><StatIcon type="power_consumption" size={24} />-{module.consumption}</span>
            : <span className="text-[#555]">{t("module_list.condition")} —</span>)
    );
}

function ModuleCard({ module, onClick, isMerged }: ModuleCardProps) {
    const { t } = useTranslation();

    const getModuleTier = () => {
        if (module.type === "scanner") {
            const scannerTierLabels = [
                "",
                t("module_list.mk_1"),
                t("module_list.mk_2"),
                t("module_list.mk_3"),
                t("module_list.quantum"),
            ];
            return scannerTierLabels[getScannerTierIndex(module.scanRange || 0)];
        }
        if (!module.level) return "";
        const displayLevel = Math.min(module.level, 4);
        if (displayLevel >= 4) return t("module_list.ancient");
        return `МК-${displayLevel}`;
    };

    const tier = getModuleTier();
    const healthPct = getConditionPercent(module);
    const hpColor =
        healthPct < 30
            ? "bg-[#ff0040]"
            : healthPct < 60
              ? "bg-[#ffb000]"
              : "bg-[#00ff41]";
    const isOff = module.disabled || module.manualDisabled;
    const isBroken = module.health <= 0;
    const borderClass =
        isOff || isBroken
            ? "border-[#ff0040]"
            : isMerged
              ? "border-[#aa55ff]"
              : "border-[#00ff41]";

    const artUrl = getModuleImageUrl(
        module.type,
        module.width || 1,
        module.height || 1,
    );

    return (
        <div
            className={`${isMerged ? "bg-[rgba(170,85,255,0.08)]" : "bg-[rgba(0,255,65,0.05)]"} border ${borderClass} p-1.5 text-xs cursor-pointer transition-all hover:bg-[rgba(0,255,65,0.1)] hover:shadow-[0_0_8px_rgba(0,255,65,0.4)] flex gap-2.5 ${isOff ? "opacity-50" : ""}`}
            onClick={onClick}
        >
            {/* Thumbnail */}
            {artUrl && (
                <div className="shrink-0 w-12 h-12 flex items-center justify-center bg-[rgba(0,0,0,0.3)] border border-[#00ff4122] rounded-sm overflow-hidden">
                    <GameImage
                        src={artUrl}
                        alt={getTranslatedModuleName(module.type, t)}
                        className="max-w-full max-h-full object-contain"
                    />
                </div>
            )}

            <div className="flex-1 min-w-0 flex flex-col gap-1">
                {/* Name + tier */}
                <div className="text-ring font-bold text-[10px] leading-tight">
                    {getTranslatedModuleName(module.type, t)}
                    {tier && (
                        <span className="text-[#555] font-normal"> {tier}</span>
                    )}
                    {isMerged && (
                        <span
                            className="ml-1 text-[#aa55ff]"
                            title={t("module_list.xenosymbiont_merged")}
                        >
                            🧬
                        </span>
                    )}
                </div>

                {/* Key stat */}
                <div className="text-[#00ff41] text-[10px] leading-tight">
                    <CompactModuleStat module={module} />
                    {module.disabled && (
                        <span
                            className="text-destructive ml-1"
                            title={t("module_list.power_shortage_hint")}
                        >
                            ⚡{t("module_list.off")}
                        </span>
                    )}
                    {!module.disabled && module.manualDisabled && (
                        <span className="text-[#888] ml-1">
                            {t("module_list.off")}
                        </span>
                    )}
                </div>

                {/* Condition bar */}
                <div className="flex items-center gap-1">
                    <div className="flex-1 h-1 bg-[rgba(0,0,0,0.6)] rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${hpColor}`}
                            style={{ width: `${healthPct}%` }}
                        />
                    </div>
                    <span className="text-[#555] text-[9px] shrink-0 tabular-nums">
                        {healthPct}%
                    </span>
                </div>
            </div>
        </div>
    );
}

interface ModuleDetailDialogProps {
    module: Module | null;
    onClose: () => void;
    isStationItem?: boolean; // True if viewing a module in shop (not owned yet)
}

export function ModuleDetailDialog({
    module,
    onClose,
    isStationItem = false,
}: ModuleDetailDialogProps) {
    const { t } = useTranslation();
    const crew = useGameStore((s) => s.crew);
    const research = useGameStore((s) => s.research);
    const toggleModule = useGameStore((s) => s.toggleModule);

    if (!module) return null;

    const mergedCrewMember = isStationItem
        ? undefined
        : getMergedCrewMember(crew, module.id);
    const mergeEffects = mergedCrewMember
        ? XENOSYMBIONT_MERGE_EFFECTS[module.type].effects
        : undefined;
    const hasMergeEffect = !!mergeEffects && Object.keys(mergeEffects).length > 0;
    const mergeEntries = mergeEffects
        ? getStandaloneMergeEffectEntries(module.type, mergeEffects)
        : [];

    // Check if level is valid (not NaN)
    const isValidLevel = module.level && !isNaN(module.level);
    const techBonuses = isStationItem
        ? []
        : getModuleTechBonuses(module, research).map((bonus) =>
              bonus.type === "fuel_efficiency"
                  ? { ...bonus, value: getFuelEfficiencyTechBonus(research) }
                  : bonus,
          );
    const healthTechDelta = isStationItem
        ? null
        : getModuleHealthTechDelta(module, research);

    return (
        <Dialog open={!!module} onOpenChange={onClose}>
            <GameDialogContent
                variant={mergedCrewMember ? "merge" : "default"}
                className="max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto"
            >
                <DialogHeader>
                    <DialogTitle className="text-accent font-['Orbitron']">
                        {getTranslatedModuleName(module.type, t)}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {t("module_list.info_title")}
                    </DialogDescription>
                    {/* Module level and size */}
                    <div className="flex gap-4 text-xs mt-2">
                        {isValidLevel && (
                            <span className="text-accent">
                                ★ {t("module_list.level")}: {module.level}
                            </span>
                        )}
                        {(module.width || 0) > 1 || (module.height || 0) > 1 ? (
                            <span className="text-[#888]">
                                {t("module_list.size")}: {module.width}x
                                {module.height}
                            </span>
                        ) : (
                            <span className="text-[#888]">
                                {t("module_list.size")}: 1x1
                            </span>
                        )}
                    </div>
                </DialogHeader>

                <div className="space-y-4">
                    {(() => {
                        const artUrl = getModuleImageUrl(
                            module.type,
                            module.width || 1,
                            module.height || 1,
                        );
                        if (!artUrl) return null;
                        return (
                            <div className="flex justify-center">
                                <GameImage
                                    src={artUrl}
                                    alt={getTranslatedModuleName(module.type, t)}
                                    className="max-h-32 object-contain rounded border border-[#00ff4133] bg-[rgba(0,0,0,0.3)]"
                                />
                            </div>
                        );
                    })()}
                    <ModuleDetailedStats
                        module={module}
                        mergeEffects={mergeEffects}
                        techBonuses={techBonuses}
                        healthTechDelta={healthTechDelta}
                    />

                    {mergedCrewMember && (
                        <div className="border border-[#aa55ff66] bg-[rgba(170,85,255,0.08)] p-2 space-y-1.5">
                            <div className="text-[#aa55ff] font-bold text-[11px] flex items-center gap-1.5">
                                🧬 {t("module_list.xenosymbiont_merged")}
                                <span className="text-[#c9a0ff] font-normal">
                                    ({getCrewDisplayName(mergedCrewMember)})
                                </span>
                            </div>
                            {mergeEntries.length > 0 && (
                                <div className="space-y-0.5">
                                    {mergeEntries.map((entry) => (
                                        <div
                                            key={entry.key}
                                            className="flex justify-between text-[11px] text-[#dcc4ff]"
                                        >
                                            <span>{entry.label}</span>
                                            <span className="font-bold">
                                                {entry.valueText}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {!hasMergeEffect && (
                                <div className="text-[11px] text-[#c9a0ff]">
                                    {t("module_list.xenosymbiont_no_effect")}
                                </div>
                            )}
                        </div>
                    )}

                    {module.type === "scanner" && (
                        <ScannerDescription scanRange={module.scanRange} />
                    )}

                    {module.type === "medical" &&
                        module.healing &&
                        module.healing > 0 && (
                            <div className="inline-flex items-center gap-1.5">
                                <StatIcon type="health" size={32} /> +{module.healing} HP
                                <MergeDelta delta={computeMergePercentDelta(module.healing, mergeEffects?.healing)} />
                            </div>
                        )}

                    {module.type === "weaponbay" && module.weapons && (
                        <WeaponsDetail
                            weapons={module.weapons}
                            level={module.level}
                            techDamageBonus={techBonuses.find((bonus) => bonus.type === "weapon_damage")?.value ?? 0}
                            techSlots={techBonuses.find((bonus) => bonus.type === "weapon_slots")?.value ?? 0}
                        />
                    )}

                    {/* Only show status and controls for owned modules */}
                    {!isStationItem && (
                        <>
                            <div>
                                <span className="text-accent">
                                    {t("module_list.status")}:{" "}
                                </span>
                                <span
                                    className={
                                        module.disabled || module.manualDisabled
                                            ? "text-destructive"
                                            : module.health <= 0
                                              ? "text-destructive"
                                              : "text-[#00ff41]"
                                    }
                                >
                                    {module.disabled
                                        ? t("module_list.disabled_power")
                                        : module.manualDisabled
                                          ? t("module_list.disabled")
                                          : module.health <= 0
                                            ? t("module_list.damaged")
                                            : t("module_list.active")}
                                </span>
                            </div>

                            {module.health <= 0 && (
                                <div className="text-[11px] text-destructive">
                                    {t("module_list.module_damaged_warning")}
                                </div>
                            )}

                            <div className="text-[11px] text-[#888]">
                                {t("module_list.disable_saves_energy")}
                            </div>

                            <div className="flex gap-2 justify-center">
                                <Button
                                    onClick={() => {
                                        toggleModule(module.id);
                                        onClose();
                                    }}
                                    className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810]"
                                >
                                    {module.disabled || module.manualDisabled
                                        ? t("module_list.enable")
                                        : t("module_list.disable")}
                                </Button>
                            </div>
                        </>
                    )}
                    {isStationItem && (
                        <div className="text-[11px] text-[#888] text-center">
                            {t("module_list.buy_prompt")}
                        </div>
                    )}
                </div>
            </GameDialogContent>
        </Dialog>
    );
}

interface ModuleDetailedStatsProps {
    module: Module;
    /** Эффекты сращённого с этим модулем ксеноморфа (если есть) */
    mergeEffects?: Partial<Record<MergeEffectKey, number>>;
    techBonuses: ModuleTechBonus[];
    healthTechDelta: number | null;
}

function DetailedStatLabel({
    icon,
    children,
}: {
    icon: StatIconType;
    children: ReactNode;
}) {
    return (
        <span className="text-accent inline-flex items-center gap-1.5">
            <StatIcon type={icon} size={32} />
            <span>{children}</span>
        </span>
    );
}

/** Прибавка от технологии рядом с базовым значением стата, бирюзовым. */
function TechDelta({
    delta,
    negative = false,
}: {
    delta: number | null;
    negative?: boolean;
}) {
    if (!delta) return null;
    return (
        <span className="text-[#00d4ff] font-bold">
            {" "}({negative ? "-" : "+"}{delta})
        </span>
    );
}

/** Прибавка от сращивания ксеноморфа рядом с базовым значением стата, фиолетовым */
function MergeDelta({
    delta,
    negative = false,
    unit = "",
}: {
    delta: number | null;
    negative?: boolean;
    unit?: string;
}) {
    if (!delta) return null;
    return (
        <span className="text-[#aa55ff] font-bold">
            {" "}
            ({negative ? "-" : delta > 0 ? "+" : ""}
            {delta}
            {unit})
        </span>
    );
}

function DetailedStatRow({
    icon,
    label,
    children,
}: {
    icon: StatIconType;
    label: ReactNode;
    children: ReactNode;
}) {
    return (
        <div className="flex items-center gap-2">
            <DetailedStatLabel icon={icon}>{label}</DetailedStatLabel>
            <span>{children}</span>
        </div>
    );
}

type PercentDeltaFn = (
    key: MergeEffectKey,
    base: number,
    negative?: boolean,
    minimum?: number,
) => number | null;
type FlatDeltaFn = (key: MergeEffectKey) => number | null;

/** Статы, специфичные для конкретного типа модуля (энергия, груз, сканер и т.д.). */
function renderModuleTypeDetailStats(
    module: Module,
    percentDelta: PercentDeltaFn,
    flatDelta: FlatDeltaFn,
    t: (key: string, params?: Record<string, string | number>) => string,
    techBonuses: ModuleTechBonus[],
): ReactNode {
    const techValue = (type: ModuleTechBonus["type"]) =>
        techBonuses.find((bonus) => bonus.type === type)?.value ?? 0;
    const techPercentDelta = (type: ModuleTechBonus["type"], base: number) =>
        computeMergePercentDelta(base, techValue(type) * 100);
    const valueWithTech = (type: ModuleTechBonus["type"], base: number) =>
        base + (techPercentDelta(type, base) ?? 0);
    const fuelValueWithTech = (base: number) =>
        base - (techPercentDelta("fuel_efficiency", base) ?? 0);
    return (
        <>
            {module.type === "reactor" && module.power && module.power > 0 && (
                <DetailedStatRow icon="power_generation" label={`${t("module_list.generation")}:`}>
                    +{module.power}
                    <TechDelta delta={techPercentDelta("module_power", module.power)} />
                    <MergeDelta delta={percentDelta("powerOutput", valueWithTech("module_power", module.power))} />
                </DetailedStatRow>
            )}
            {module.type !== "reactor" &&
                module.type !== "fueltank" &&
                module.consumption &&
                module.consumption > 0 && (
                    <DetailedStatRow icon="power_consumption" label={`${t("module_list.consumption")}:`}>
                        -{module.consumption}
                    </DetailedStatRow>
                )}
            {module.type === "fueltank" && module.capacity && (
                <DetailedStatRow icon="capacity" label={`${t("module_list.fuel")}:`}>
                    {module.capacity}
                    <MergeDelta delta={percentDelta("fuelCapacity", module.capacity)} />
                </DetailedStatRow>
            )}
            {module.type === "cargo" &&
                module.capacity &&
                module.capacity > 0 && (
                    <DetailedStatRow icon="cargo" label={`${t("module_list.capacity")}:`}>
                        {module.capacity}т
                        <TechDelta delta={techPercentDelta("cargo_capacity", module.capacity)} />
                        <MergeDelta delta={percentDelta("cargoCapacity", valueWithTech("cargo_capacity", module.capacity))} />
                    </DetailedStatRow>
                )}
            {module.type === "engine" && module.fuelEfficiency && (
                <DetailedStatRow icon="fuel_efficiency" label={`${t("module_list.efficiency")}:`}>
                    {module.fuelEfficiency} {t("module_list.efficiency_note")}
                    <TechDelta delta={techPercentDelta("fuel_efficiency", module.fuelEfficiency)} negative />
                    <MergeDelta delta={percentDelta("fuelEfficiency", fuelValueWithTech(module.fuelEfficiency), true, module.fuelEfficiency * (1 - MAX_FUEL_EFFICIENCY_BONUS))} negative />
                </DetailedStatRow>
            )}
            {module.type === "drill" && (
                <div>
                    <span className="text-accent">
                        {t("module_list.drill_level")}:
                    </span>{" "}
                    {module.level || 1} (
                    {t("module_list.asteroid_tier", {
                        tier: module.level ?? 1,
                    })}
                    )
                </div>
            )}
            {module.type === "scanner" &&
                module.scanRange &&
                module.scanRange > 0 && (
                    <>
                        <div>
                            <span className="text-accent">
                                ★ {t("module_list.level")}:
                            </span>{" "}
                            {[
                                t("module_list.scanner_mk1"),
                                t("module_list.scanner_mk1"),
                                t("module_list.scanner_mk2"),
                                t("module_list.scanner_mk3"),
                                t("module_list.scanner_quantum"),
                            ][getScannerTierIndex(module.scanRange)]}
                        </div>
                        <DetailedStatRow icon="scan_range" label={`${t("module_list.scan_range")}:`}>
                            {module.scanRange}
                            <TechDelta delta={techValue("scan_range")} />
                            <MergeDelta delta={flatDelta("scanRange")} />
                        </DetailedStatRow>
                    </>
                )}
            {module.type === "lab" && (
                <DetailedStatRow icon="research" label={`${t("module_list.research")}:`}>
                    {module.researchOutput || 5}
                    <TechDelta delta={techPercentDelta("research_speed", module.researchOutput || 5)} />
                    <MergeDelta delta={percentDelta("researchSpeed", valueWithTech("research_speed", module.researchOutput || 5))} />{" "}
                    {t("module_list.search_per_turn")}
                </DetailedStatRow>
            )}
            {module.type === "shield" &&
                module.shields &&
                module.shields > 0 && (
                    <DetailedStatRow icon="shields" label={`${t("module_list.shields")}:`}>
                        {module.shields}
                        <TechDelta delta={techPercentDelta("shield_strength", module.shields)} />
                        <MergeDelta delta={percentDelta("shieldCapacity", valueWithTech("shield_strength", module.shields))} />
                    </DetailedStatRow>
                )}
            {module.type === "shield" && module.shieldRegen && (
                <DetailedStatRow icon="shield_regen" label={`${t("module_list.tech_shield_regen")}:`}>
                    {module.shieldRegen}
                    <TechDelta delta={techPercentDelta("shield_regen", module.shieldRegen)} />
                    <MergeDelta delta={percentDelta("shieldRegenBonus", valueWithTech("shield_regen", module.shieldRegen))} />
                </DetailedStatRow>
            )}
            {module.type === "point_defense" && (
                <DetailedStatRow icon="shields" label={`${t("module_list.point_defense_intercept_chance")}:`}>
                    {formatPointDefenseChances({ level: module.level })}%
                    <MergeDelta delta={flatDelta("pointDefense")} />
                </DetailedStatRow>
            )}
            {module.type === "lifesupport" &&
                module.oxygen &&
                module.oxygen > 0 && (
                    <DetailedStatRow icon="oxygen" label={`${t("module_list.oxygen")}:`}>
                        {module.oxygen}
                        <MergeDelta delta={percentDelta("oxygenEfficiency", module.oxygen)} />{" "}
                        {t("module_list.creatures")}
                    </DetailedStatRow>
                )}
            {module.type === "quarters" &&
                module.capacity !== undefined &&
                module.capacity > 0 && (
                    <DetailedStatRow icon="crew" label={`${t("module_list.crew_slots")}:`}>
                        +{module.capacity}
                    </DetailedStatRow>
                )}
            {module.type === "repair_bay" &&
                module.repairAmount !== undefined &&
                module.repairAmount > 0 && (
                    <DetailedStatRow icon="repair" label={`${t("module_list.repair_per_turn")}:`}>
                        {module.repairAmount}
                        <MergeDelta delta={percentDelta("repairBonus", module.repairAmount)} /> HP
                        × {module.repairTargets ?? 1} {t("module_list.modules")}
                    </DetailedStatRow>
                )}
            {module.type === "weaponbay" && (
                <DetailedStatRow icon="damage_bonus" label={`${t("module_list.damage_bonus")}:`}>
                    +{((module.level ?? 1) - 1) * 10}%
                    <MergeDelta delta={flatDelta("weaponDamage")} unit="%" />
                </DetailedStatRow>
            )}
            {module.type === "habitat_module" && module.capacity !== undefined && module.capacity > 0 && (
                <DetailedStatRow icon="crew" label={`${t("module_list.crew_slots")}:`}>
                    +{module.capacity}
                </DetailedStatRow>
            )}
            {module.type === "habitat_module" && module.healing && module.healing > 0 && (
                <div className="inline-flex items-center gap-1.5">
                    <StatIcon type="health" size={32} /> +{module.healing} HP
                    <MergeDelta delta={percentDelta("healing", module.healing)} />
                </div>
            )}
            {(module.type === "bio_research_lab" || module.type === "deep_survey_array") && module.researchOutput && module.researchOutput > 0 && (
                <DetailedStatRow icon="research" label={`${t("module_list.research")}:`}>
                    {module.researchOutput}
                    <TechDelta delta={techPercentDelta("research_speed", module.researchOutput)} />
                    <MergeDelta delta={percentDelta("researchSpeed", valueWithTech("research_speed", module.researchOutput))} />{" "}
                    {t("module_list.search_per_turn")}
                </DetailedStatRow>
            )}
            {module.type === "deep_survey_array" && module.scanRange && module.scanRange > 0 && (
                <DetailedStatRow icon="scan_range" label={`${t("module_list.scan_range")}:`}>
                    {module.scanRange}
                    <MergeDelta delta={flatDelta("scanRange")} />
                </DetailedStatRow>
            )}
            {module.type === "pulse_drive" && module.power && module.power > 0 && (
                <DetailedStatRow icon="power_generation" label={`${t("module_list.generation")}:`}>
                    +{module.power}
                    <TechDelta delta={techPercentDelta("module_power", module.power)} />
                </DetailedStatRow>
            )}
            {module.type === "pulse_drive" && module.fuelEfficiency && (
                <DetailedStatRow icon="fuel_efficiency" label={`${t("module_list.efficiency")}:`}>
                    {module.fuelEfficiency} {t("module_list.efficiency_note")}
                    <TechDelta delta={techPercentDelta("fuel_efficiency", module.fuelEfficiency)} negative />
                    <MergeDelta delta={percentDelta("fuelEfficiency", fuelValueWithTech(module.fuelEfficiency), true, module.fuelEfficiency * (1 - MAX_FUEL_EFFICIENCY_BONUS))} negative />
                </DetailedStatRow>
            )}
        </>
    );
}

function ModuleDetailedStats({
    module,
    mergeEffects,
    techBonuses,
    healthTechDelta,
}: ModuleDetailedStatsProps) {
    const { t } = useTranslation();
    const descriptionKey = getModuleDescription(module);
    const percentDelta: PercentDeltaFn = (key, base, negative, minimum) => {
        const percent = mergeEffects?.[key];
        if (!negative) return computeMergePercentDelta(base, percent);
        if (!percent) return null;
        const value = Math.max(
            minimum ?? 0,
            Math.floor(base * (1 - percent / 100)),
        );
        const delta = base - value;
        return delta > 0 ? delta : null;
    };
    const flatDelta: FlatDeltaFn = (key) => mergeEffects?.[key] || null;
    const artifactArmor = useGameStore((s) => {
        const artifact = s.artifacts.find(
            (a) => a.effect.type === "module_armor" && a.effect.active,
        );
        if (!artifact) return 0;
        return getArtifactEffectValue(artifact, s);
    });

    return (
        <div className="space-y-2">
            {/* Module purpose description */}
            {descriptionKey && (
                <div className="text-[#888] text-xs">{t(descriptionKey)}</div>
            )}

            {renderModuleTypeDetailStats(
                module,
                percentDelta,
                flatDelta,
                t,
                techBonuses,
            )}

            {healthTechDelta && (
                <DetailedStatRow icon="health" label={`${t("module_list.tech_module_health")}:`}>
                    {module.maxHealth - healthTechDelta}
                    <TechDelta delta={healthTechDelta} />
                </DetailedStatRow>
            )}

            {/* Defense/Armor for all modules - for shields use level */}
            {module.defense !== undefined && module.defense > 0 && (
                <DetailedStatRow icon="armor" label={`${t("module_list.armor")}:`}>
                    {module.defense}
                    {artifactArmor > 0 && (
                        <span className="text-ring">
                            {" "}
                            (+{artifactArmor})
                        </span>
                    )}
                </DetailedStatRow>
            )}
            <div>
                <span className="text-accent">
                    {t("module_list.condition")}:
                </span>{" "}
                {getConditionPercent(module)}%
            </div>
        </div>
    );
}

function ScannerDescription({ scanRange }: { scanRange?: number }) {
    const { t } = useTranslation();

    // Determine scanner level based on scanRange
    const getScannerLevel = () => {
        const scannerTierLabels = [
            t("module_list.scanner_default"),
            t("module_list.scanner_mk1"),
            t("module_list.scanner_mk2"),
            t("module_list.scanner_mk3"),
            t("module_list.scanner_quantum"),
        ];
        return scannerTierLabels[getScannerTierIndex(scanRange || 0)];
    };

    return (
        <div className="mt-2 p-2 bg-[rgba(0,255,65,0.05)] border border-[#00ff41] text-xs">
            <div className="text-ring mb-1 font-bold">
                {getScannerLevel()}
            </div>
            <div className="text-ring mb-1">
                {t("module_list.scanner_title")}:
            </div>
            <ul className="text-[#888] space-y-1">
                <li>{t("module_list.scanner_info_1")}</li>
                <li>{t("module_list.scanner_info_2")}</li>
                {(scanRange || 0) >= 3 && (
                    <li>{t("module_list.scanner_info_3")}</li>
                )}
                {(scanRange || 0) >= 5 && (
                    <li>{t("module_list.scanner_info_4")}</li>
                )}
                {(scanRange || 0) >= 8 && (
                    <li>{t("module_list.scanner_info_5")}</li>
                )}
                {(scanRange || 0) >= 15 && (
                    <li>{t("module_list.scanner_info_6")}</li>
                )}
            </ul>
        </div>
    );
}

function WeaponsDetail({
    weapons,
    level,
    techDamageBonus,
    techSlots,
}: {
    weapons: (Weapon | null)[];
    level?: number;
    techDamageBonus: number;
    techSlots: number;
}) {
    const { t } = useTranslation();

    return (
        <div className="pt-4 border-t border-[#00ff41]">
            <div className="text-accent mb-2">
                {t("module_list.weapon_slots")}: {weapons.length - techSlots}
                <TechDelta delta={techSlots || null} />
            </div>
            {weapons.map((weapon, i) =>
                weapon ? (
                    <div
                        key={i}
                        className="p-2 my-2 bg-[rgba(0,255,65,0.05)] border"
                        style={{
                            borderColor: WEAPON_TYPES[weapon.type].color,
                        }}
                    >
                        <div
                            className="flex items-center gap-2"
                            style={{ color: WEAPON_TYPES[weapon.type].color }}
                        >
                            <span>
                                {WEAPON_TYPES[weapon.type].icon}{" "}
                                {t(`weapon_types.${weapon.type}`)}
                            </span>
                            <span className="text-destructive">
                                ({Math.floor(WEAPON_TYPES[weapon.type].damage * (1 + ((level ?? 1) - 1) * 0.1))}
                                <TechDelta
                                    delta={computeMergePercentDelta(
                                        Math.floor(WEAPON_TYPES[weapon.type].damage * (1 + ((level ?? 1) - 1) * 0.1)),
                                        techDamageBonus * 100,
                                    )}
                                />
                                )
                            </span>
                        </div>
                        <div className="text-[10px] text-[#888] mt-1">
                            {t(`weapon_info.${weapon.type}_feature`)}
                        </div>
                    </div>
                ) : (
                    <div
                        key={i}
                        className="p-2 my-2 bg-[rgba(100,100,100,0.05)] border border-[#444] text-[#888]"
                    >
                        {t("module_list.empty_slot", { number: i + 1 })}
                    </div>
                ),
            )}
        </div>
    );
}
