"use client";

import { useState } from "react";
import { useGameStore } from "../store";
import { WEAPON_TYPES } from "../constants";
import type { Module, Weapon } from "../types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";

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
        habitat_module: t("module_names.medical_corps"),
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
        habitat_module: "module_descriptions.medical_corps",
        deep_survey_array: "module_descriptions.deep_survey_array",
    };

    return descriptionMap[moduleType] || "";
}

export function ModuleList() {
    const modules = useGameStore((s) => s.ship.modules);
    const [selectedModule, setSelectedModule] = useState<Module | null>(null);

    return (
        <>
            <div className="grid grid-cols-2 gap-1.5">
                {modules.map((module) => (
                    <ModuleCard
                        key={module.id}
                        module={module}
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
}

function CompactModuleStat({ module }: { module: Module }) {
    const { t } = useTranslation();
    const cons = module.consumption && module.consumption > 0
        ? <span className="text-[#888]"> ⚡-{module.consumption}</span>
        : null;

    if (module.type === "reactor" && module.power)
        return <><span>⚡ +{module.power}</span></>;
    if (module.type === "shield" && module.shields)
        return <><span>🛡 {module.shields}</span>{cons}</>;
    if (module.type === "fueltank" && module.capacity)
        return <><span>⛽ {module.capacity}</span></>;
    if (module.type === "cargo" && module.capacity)
        return <><span>📦 {module.capacity}т</span>{cons}</>;
    if (module.type === "engine")
        return <><span>⛽ {module.fuelEfficiency}</span>{cons}</>;
    if (module.type === "drill")
        return <><span>⛏ LV{module.level || 1}</span>{cons}</>;
    if (module.type === "scanner" && module.scanRange)
        return <><span>📡 {module.scanRange}</span>{cons}</>;
    if (module.type === "medical" && module.healing)
        return <><span>🏥 +{module.healing}</span>{cons}</>;
    if (module.type === "lab" && module.researchOutput)
        return <><span>🔬 {module.researchOutput}</span>{cons}</>;
    if (module.type === "weaponbay" && module.weapons) {
        const activeWeapons = module.weapons.filter((w) => w !== null).length;
        return <><span>⚔ {activeWeapons}/{module.weapons.length}</span>{cons}</>;
    }
    if (module.type === "lifesupport" && module.oxygen)
        return <><span>🫁 {module.oxygen}</span>{cons}</>;
    if (module.type === "quarters" && module.capacity)
        return <><span>👥 +{module.capacity}</span>{cons}</>;
    if (module.type === "bio_research_lab")
        return <>
            {module.researchOutput ? <span>🔬 {module.researchOutput}</span> : null}
            {module.healing ? <span> 🏥+{module.healing}</span> : null}
            {cons}
        </>;
    if (module.type === "deep_survey_array")
        return <>
            {module.scanRange ? <span>📡 {module.scanRange}</span> : null}
            {module.researchOutput ? <span> 🔬{module.researchOutput}</span> : null}
            {cons}
        </>;
    if (module.type === "pulse_drive")
        return <>
            {module.power ? <span>⚡ +{module.power}</span> : null}
            {module.fuelEfficiency ? <span> ⛽{module.fuelEfficiency}</span> : null}
            {cons}
        </>;
    if (module.type === "habitat_module")
        return <>
            {module.capacity ? <span>👥 +{module.capacity}</span> : null}
            {module.healing ? <span> 🏥+{module.healing}</span> : null}
            {cons}
        </>;
    if (module.consumption && module.consumption > 0)
        return <span>⚡ -{module.consumption}</span>;
    return <span className="text-[#555]">{t("module_list.condition")} —</span>;
}

function ModuleCard({ module, onClick }: ModuleCardProps) {
    const { t } = useTranslation();

    const getModuleTier = () => {
        if (module.type === "scanner") {
            const scanRange = module.scanRange || 0;
            if (scanRange >= 15) return t("module_list.quantum");
            if (scanRange >= 8) return t("module_list.mk_3");
            if (scanRange >= 5) return t("module_list.mk_2");
            if (scanRange >= 3) return t("module_list.mk_1");
            return "";
        }
        if (!module.level) return "";
        const displayLevel = Math.min(module.level, 4);
        if (displayLevel >= 4) return t("module_list.ancient");
        return `МК-${displayLevel}`;
    };

    const tier = getModuleTier();
    const healthPct = Math.min(
        100,
        Math.round((module.health / (module.maxHealth || 100)) * 100),
    );
    const hpColor =
        healthPct < 30
            ? "bg-[#ff0040]"
            : healthPct < 60
              ? "bg-[#ffb000]"
              : "bg-[#00ff41]";
    const isOff = module.disabled || module.manualDisabled;
    const isBroken = module.health <= 0;
    const borderClass =
        isOff || isBroken ? "border-[#ff0040]" : "border-[#00ff41]";

    return (
        <div
            className={`bg-[rgba(0,255,65,0.05)] border ${borderClass} p-1.5 text-xs cursor-pointer transition-all hover:bg-[rgba(0,255,65,0.1)] hover:shadow-[0_0_8px_rgba(0,255,65,0.4)] flex flex-col gap-1 ${isOff ? "opacity-50" : ""}`}
            onClick={onClick}
        >
            {/* Name + tier */}
            <div className="text-[#00d4ff] font-bold text-[10px] truncate leading-tight">
                {getTranslatedModuleName(module.type, t)}
                {tier && (
                    <span className="text-[#555] font-normal"> {tier}</span>
                )}
            </div>

            {/* Key stat */}
            <div className="text-[#00ff41] text-[10px] leading-tight">
                <CompactModuleStat module={module} />
                {isOff && <span className="text-[#ff0040] ml-1">OFF</span>}
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
    const shipModules = useGameStore((s) => s.ship.modules);
    const mergeBonus = getMergeEffectsBonus(crew, shipModules);
    const toggleModule = useGameStore((s) => s.toggleModule);

    if (!module) return null;

    // Check if level is valid (not NaN)
    const isValidLevel = module.level && !isNaN(module.level);

    return (
        <Dialog open={!!module} onOpenChange={onClose}>
            <DialogContent className="bg-[rgba(10,20,30,0.95)] border-2 border-[#00ff41] text-[#00ff41] max-w-md w-[calc(100%-2rem)] md:w-auto">
                <DialogHeader>
                    <DialogTitle className="text-[#ffb000] font-['Orbitron']">
                        {getTranslatedModuleName(module.type, t)}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {t("module_list.info_title")}
                    </DialogDescription>
                    {/* Module level and size */}
                    <div className="flex gap-4 text-xs mt-2">
                        {isValidLevel && (
                            <span className="text-[#ffb000]">
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
                    <ModuleDetailedStats module={module} />

                    {module.type === "scanner" && (
                        <ScannerDescription scanRange={module.scanRange} />
                    )}

                    {module.type === "medical" &&
                        module.healing &&
                        module.healing > 0 && (
                            <div>
                                🏥 +{module.healing} HP
                                {mergeBonus.healing &&
                                    mergeBonus.healing > 0 && (
                                        <span className="text-[#00d4ff]">
                                            {" "}
                                            (+{mergeBonus.healing}%)
                                        </span>
                                    )}
                            </div>
                        )}

                    {module.type === "weaponbay" && module.weapons && (
                        <WeaponsDetail weapons={module.weapons} />
                    )}

                    {/* Only show status and controls for owned modules */}
                    {!isStationItem && (
                        <>
                            <div>
                                <span className="text-[#ffb000]">
                                    {t("module_list.status")}:{" "}
                                </span>
                                <span
                                    className={
                                        module.disabled || module.manualDisabled
                                            ? "text-[#ff0040]"
                                            : module.health <= 0
                                              ? "text-[#ff0040]"
                                              : "text-[#00ff41]"
                                    }
                                >
                                    {module.disabled || module.manualDisabled
                                        ? t("module_list.disabled")
                                        : module.health <= 0
                                          ? t("module_list.damaged")
                                          : t("module_list.active")}
                                </span>
                            </div>

                            {module.health <= 0 && (
                                <div className="text-[11px] text-[#ff0040]">
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
            </DialogContent>
        </Dialog>
    );
}

interface ModuleDetailedStatsProps {
    module: Module;
}

function ModuleDetailedStats({ module }: ModuleDetailedStatsProps) {
    const { t } = useTranslation();
    const descriptionKey = getModuleDescription(module);
    const artifactArmor = useGameStore((s) => {
        const artifact = s.artifacts.find(
            (a) => a.effect.type === "module_armor" && a.effect.active,
        );
        if (!artifact) return 0;
        return artifact.effect.value || 0;
    });

    return (
        <div className="space-y-2">
            {/* Module purpose description */}
            {descriptionKey && (
                <div className="text-[#888] text-xs">{t(descriptionKey)}</div>
            )}

            {module.type === "reactor" && module.power && module.power > 0 && (
                <div>
                    <span className="text-[#ffb000]">
                        {t("module_list.generation")}:
                    </span>{" "}
                    +{module.power}
                </div>
            )}
            {module.type !== "reactor" &&
                module.type !== "fueltank" &&
                module.consumption &&
                module.consumption > 0 && (
                    <div>
                        <span className="text-[#ffb000]">
                            {t("module_list.consumption")}:
                        </span>{" "}
                        -{module.consumption}
                    </div>
                )}
            {module.type === "fueltank" && module.capacity && (
                <div>
                    <span className="text-[#ffb000]">
                        {t("module_list.fuel")}:
                    </span>{" "}
                    ⛽ {module.capacity}
                </div>
            )}
            {module.type === "cargo" &&
                module.capacity &&
                module.capacity > 0 && (
                    <div>
                        <span className="text-[#ffb000]">
                            {t("module_list.capacity")}:
                        </span>{" "}
                        {module.capacity}т
                    </div>
                )}
            {module.type === "engine" && module.fuelEfficiency && (
                <div>
                    <span className="text-[#ffb000]">
                        {t("module_list.efficiency")}:
                    </span>{" "}
                    {module.fuelEfficiency} {t("module_list.efficiency_note")}
                </div>
            )}
            {module.type === "drill" && (
                <div>
                    <span className="text-[#ffb000]">
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
                            <span className="text-[#ffb000]">
                                ★ {t("module_list.level")}:
                            </span>{" "}
                            {module.scanRange >= 15
                                ? t("module_list.scanner_quantum")
                                : module.scanRange >= 8
                                  ? t("module_list.scanner_mk3")
                                  : module.scanRange >= 5
                                    ? t("module_list.scanner_mk2")
                                    : t("module_list.scanner_mk1")}
                        </div>
                        <div>
                            <span className="text-[#ffb000]">
                                {t("module_list.scan_range")}:
                            </span>{" "}
                            {module.scanRange}
                        </div>
                    </>
                )}
            {module.type === "lab" && (
                <div>
                    <span className="text-[#ffb000]">
                        {t("module_list.research")}:
                    </span>{" "}
                    {module.researchOutput || 5}{" "}
                    {t("module_list.search_per_turn")}
                </div>
            )}
            {module.type === "shield" &&
                module.shields &&
                module.shields > 0 && (
                    <div>
                        <span className="text-[#ffb000]">
                            {t("module_list.shields")}:
                        </span>{" "}
                        {module.shields}
                    </div>
                )}
            {module.type === "lifesupport" &&
                module.oxygen &&
                module.oxygen > 0 && (
                    <div>
                        <span className="text-[#ffb000]">
                            {t("module_list.oxygen")}:
                        </span>{" "}
                        {module.oxygen} {t("module_list.creatures")}
                    </div>
                )}
            {module.type === "quarters" &&
                module.capacity !== undefined &&
                module.capacity > 0 && (
                    <div>
                        <span className="text-[#ffb000]">
                            👥 {t("module_list.crew_slots")}:
                        </span>{" "}
                        +{module.capacity}
                    </div>
                )}
            {module.type === "repair_bay" &&
                module.repairAmount !== undefined &&
                module.repairAmount > 0 && (
                    <div>
                        <span className="text-[#ffb000]">
                            {t("module_list.repair_per_turn")}:
                        </span>{" "}
                        {module.repairAmount} HP × {module.repairTargets ?? 1}{" "}
                        {t("module_list.modules")}
                    </div>
                )}
            {module.type === "weaponbay" && (
                <div>
                    <span className="text-[#ffb000]">
                        {t("module_list.damage_bonus")}:
                    </span>{" "}
                    +{((module.level ?? 1) - 1) * 10}%
                </div>
            )}
            {module.type === "habitat_module" && module.capacity !== undefined && module.capacity > 0 && (
                <div>
                    <span className="text-[#ffb000]">
                        👥 {t("module_list.crew_slots")}:
                    </span>{" "}
                    +{module.capacity}
                </div>
            )}
            {module.type === "habitat_module" && module.healing && module.healing > 0 && (
                <div>🏥 +{module.healing} HP</div>
            )}
            {(module.type === "bio_research_lab" || module.type === "deep_survey_array") && module.researchOutput && module.researchOutput > 0 && (
                <div>
                    <span className="text-[#ffb000]">
                        {t("module_list.research")}:
                    </span>{" "}
                    {module.researchOutput} {t("module_list.search_per_turn")}
                </div>
            )}
            {module.type === "deep_survey_array" && module.scanRange && module.scanRange > 0 && (
                <div>
                    <span className="text-[#ffb000]">
                        {t("module_list.scan_range")}:
                    </span>{" "}
                    {module.scanRange}
                </div>
            )}
            {module.type === "pulse_drive" && module.power && module.power > 0 && (
                <div>
                    <span className="text-[#ffb000]">
                        {t("module_list.generation")}:
                    </span>{" "}
                    +{module.power}
                </div>
            )}
            {module.type === "pulse_drive" && module.fuelEfficiency && (
                <div>
                    <span className="text-[#ffb000]">
                        {t("module_list.efficiency")}:
                    </span>{" "}
                    {module.fuelEfficiency} {t("module_list.efficiency_note")}
                </div>
            )}
            {/* Defense/Armor for all modules - for shields use level */}
            {module.defense !== undefined && module.defense > 0 && (
                <div>
                    <span className="text-[#ffb000]">
                        {t("module_list.armor")}:
                    </span>{" "}
                    {module.defense}
                    {artifactArmor > 0 && (
                        <span className="text-[#00d4ff]">
                            {" "}
                            (+{artifactArmor})
                        </span>
                    )}
                </div>
            )}
            <div>
                <span className="text-[#ffb000]">
                    {t("module_list.condition")}:
                </span>{" "}
                {Math.min(
                    100,
                    Math.round(
                        (module.health / (module.maxHealth || 100)) * 100,
                    ),
                )}
                %
            </div>
        </div>
    );
}

function ScannerDescription({ scanRange }: { scanRange?: number }) {
    const { t } = useTranslation();

    // Determine scanner level based on scanRange
    const getScannerLevel = () => {
        const range = scanRange || 0;
        if (range >= 15) return t("module_list.scanner_quantum");
        if (range >= 8) return t("module_list.scanner_mk3");
        if (range >= 5) return t("module_list.scanner_mk2");
        if (range >= 3) return t("module_list.scanner_mk1");
        return t("module_list.scanner_default");
    };

    return (
        <div className="mt-2 p-2 bg-[rgba(0,255,65,0.05)] border border-[#00ff41] text-xs">
            <div className="text-[#00d4ff] mb-1 font-bold">
                {getScannerLevel()}
            </div>
            <div className="text-[#00d4ff] mb-1">
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

function WeaponsDetail({ weapons }: { weapons: (Weapon | null)[] }) {
    const { t } = useTranslation();

    return (
        <div className="pt-4 border-t border-[#00ff41]">
            <div className="text-[#ffb000] mb-2">
                {t("module_list.weapon_slots")}:
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
                        {WEAPON_TYPES[weapon.type].icon}{" "}
                        {t(`weapon_types.${weapon.type}`)}{" "}
                        <span className="text-[#ff0040]">
                            ({WEAPON_TYPES[weapon.type].damage})
                        </span>
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
