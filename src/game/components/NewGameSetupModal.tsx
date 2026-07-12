"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGameStore } from "../store";
import {
  SHIP_TEMPLATES,
  DEFAULT_TEMPLATE_ID,
} from "../constants/shipTemplates";
import {
  LAUNCH_MODIFIERS,
  type LaunchModifier,
} from "../constants/launchModifiers";
import { useTranslation } from "@/lib/useTranslation";
import type { Module, ModuleType, ResearchResourceType } from "@/game/types";

interface NewGameSetupModalProps {
  open: boolean;
  onClose: () => void;
  /** Если true — нельзя закрыть без нажатия "Начать" (первый старт) */
  required?: boolean;
}

const DIFFICULTY_COLORS = {
  easy: { text: "#00ff41", border: "#00ff41", bg: "rgba(0,255,65,0.08)" },
  normal: { text: "#ffb000", border: "#ffb000", bg: "rgba(255,176,0,0.08)" },
  hard: { text: "#ff4444", border: "#ff4444", bg: "rgba(255,68,68,0.08)" },
};

const DIFFICULTY_SYMBOLS = {
  easy: "●",
  normal: "◆",
  hard: "▲",
};

const MODIFIER_TYPE_COLORS = {
  bonus: { text: "#00ff41", border: "#00ff41", bg: "rgba(0,255,65,0.07)" },
  challenge: { text: "#ff4444", border: "#ff4444", bg: "rgba(255,68,68,0.07)" },
  mixed: { text: "#ff00ff", border: "#ff00ff", bg: "rgba(255,0,255,0.06)" },
};

const DOCTRINE_MODIFIERS = LAUNCH_MODIFIERS.filter(
  (mod) => mod.group === "doctrine",
);
const REGULAR_MODIFIERS = LAUNCH_MODIFIERS.filter(
  (mod) => mod.group !== "doctrine",
);

const MODULE_NAME_KEYS: Partial<Record<ModuleType, string>> = {
  reactor: "new_game_setup.mod_reactor",
  cockpit: "new_game_setup.mod_cockpit",
  lifesupport: "new_game_setup.mod_lifesupport",
  cargo: "new_game_setup.mod_cargo",
  fueltank: "new_game_setup.mod_fueltank",
  lab: "new_game_setup.mod_lab",
  scanner: "new_game_setup.mod_scanner",
  weaponbay: "new_game_setup.mod_weapon",
  repair_bay: "new_game_setup.mod_repair",
  engine: "new_game_setup.mod_engine",
};

type TFn = (key: string) => string;

function countModules(modules: Module[]) {
  return modules.reduce<Partial<Record<ModuleType, number>>>((acc, module) => {
    acc[module.type] = (acc[module.type] ?? 0) + 1;
    return acc;
  }, {});
}

function getModuleLabel(type: ModuleType, t: TFn) {
  const key = MODULE_NAME_KEYS[type];
  if (!key) return type;
  const translated = t(key);
  return translated === key ? type : translated;
}

function getCrewSummary(crew: (typeof SHIP_TEMPLATES)[number]["crew"], t: TFn) {
  const professions = crew.reduce<Record<string, number>>((acc, member) => {
    const profession = member.profession ?? "unknown";
    acc[profession] = (acc[profession] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(professions)
    .map(([profession, count]) => {
      const label = t(`professions.${profession}`);
      return count > 1 ? `${label} x${count}` : label;
    })
    .join(", ");
}

function getCrewLevelSummary(
  crew: (typeof SHIP_TEMPLATES)[number]["crew"],
  overrideLevel: number | null,
  t: TFn,
) {
  if (crew.length === 0) return t("new_game_setup.none");
  if (overrideLevel !== null) return `LV${overrideLevel}`;

  const levels = [
    ...new Set(
      crew.map((member) => {
        const level = member.level ?? 1;
        return Array.isArray(level) ? `${level[0]}-${level[1]}` : String(level);
      }),
    ),
  ].sort();

  return levels.length === 1
    ? `LV${levels[0]}`
    : `${t("new_game_setup.levels_label")} ${levels.map((level) => `LV${level}`).join(", ")}`;
}

function joinLabels(labels: string[]) {
  return labels.join(", ");
}

function getResearchResourceSummary(
  resources: Partial<Record<ResearchResourceType, number>> | undefined,
  t: TFn,
) {
  if (!resources) return null;
  const entries = Object.entries(resources) as [ResearchResourceType, number][];
  if (entries.length === 0) return null;
  return entries
    .map(([type, value]) => `${t(`blueprints.resources.${type}`)} x${value}`)
    .join(", ");
}

function getModifierDetails(mod: LaunchModifier, t: TFn) {
  const details: string[] = [];

  if (mod.crewLevel)
    details.push(`${t("new_game_setup.effect_crew")} LV${mod.crewLevel}`);
  if (mod.crewLimit)
    details.push(`${t("new_game_setup.effect_crew")}: ${mod.crewLimit}`);
  if (mod.fuelDelta) {
    details.push(
      `${t("new_game_setup.effect_fuel")} ${mod.fuelDelta > 0 ? "+" : ""}${mod.fuelDelta}`,
    );
  }
  if (mod.maxFuelDelta) {
    details.push(
      `${t("new_game_setup.effect_tank")} ${mod.maxFuelDelta > 0 ? "+" : ""}${mod.maxFuelDelta}`,
    );
  }
  if (mod.reactorPowerPenalty) {
    details.push(
      `${t("new_game_setup.effect_reactor")} -${mod.reactorPowerPenalty}`,
    );
  }
  if (mod.moduleDamagePercent) {
    details.push(
      `${t("new_game_setup.effect_modules")} -${mod.moduleDamagePercent}% HP`,
    );
  }
  if (mod.targetedModuleDamagePercent) {
    details.push(
      `${t("new_game_setup.effect_key_module")} -${mod.targetedModuleDamagePercent}% HP`,
    );
  }
  if (mod.startWithCursedArtifact)
    details.push(t("new_game_setup.effect_cursed_artifact"));
  if (mod.startWithCrisis)
    details.push(t("new_game_setup.effect_starting_crisis"));
  if (mod.startWithRandomTech)
    details.push(t("new_game_setup.effect_random_tech"));
  if (mod.startRaceReputation)
    details.push(t("new_game_setup.effect_reputation"));
  if (mod.researchResources) {
    const summary = getResearchResourceSummary(mod.researchResources, t);
    if (summary) details.push(summary);
  }

  return details;
}

function getBlockingModifier(mod: LaunchModifier, selectedIds: string[]) {
  return (
    LAUNCH_MODIFIERS.find(
      (selected) =>
        selectedIds.includes(selected.id) &&
        selected.id !== mod.id &&
        (mod.conflictsWith?.includes(selected.id) ||
          selected.conflictsWith?.includes(mod.id)),
    ) ?? null
  );
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "good" | "warning" | "danger" | "neutral";
}) {
  const classes = {
    good: "border-[#00ff4144] bg-[rgba(0,255,65,0.08)] text-[#9dffae]",
    warning: "border-[#ffb00055] bg-[rgba(255,176,0,0.08)] text-[#ffd27a]",
    danger: "border-[#ff444455] bg-[rgba(255,68,68,0.08)] text-[#ff9a9a]",
    neutral: "border-[#1a3320] bg-[rgba(0,0,0,0.25)] text-[#888]",
  };

  return (
    <span
      className={`inline-flex min-w-0 max-w-full items-center wrap-break-word border px-1.5 py-0.5 text-[10px] ${classes[tone]}`}
    >
      {children}
    </span>
  );
}

export function NewGameSetupModal({
  open,
  onClose,
  required,
}: NewGameSetupModalProps) {
  const { t } = useTranslation();
  const restartGame = useGameStore((s) => s.restartGame);

  const [selectedTemplateId, setSelectedTemplateId] =
    useState(DEFAULT_TEMPLATE_ID);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);

  const selectedTemplate = SHIP_TEMPLATES.find(
    (tmpl) => tmpl.id === selectedTemplateId,
  );

  const selectedModifierItems = useMemo(
    () => LAUNCH_MODIFIERS.filter((mod) => selectedModifiers.includes(mod.id)),
    [selectedModifiers],
  );

  if (!selectedTemplate) return null;

  const moduleCounts = countModules(selectedTemplate.modules);

  const crewLimit = selectedModifierItems.reduce<number | null>((acc, mod) => {
    if (mod.crewLimit === undefined) return acc;
    return acc === null ? mod.crewLimit : Math.min(acc, mod.crewLimit);
  }, null);
  const crewLevel = selectedModifierItems.reduce<number | null>((acc, mod) => {
    if (mod.crewLevel === undefined) return acc;
    return acc === null ? mod.crewLevel : Math.max(acc, mod.crewLevel);
  }, null);
  const finalCrew =
    crewLimit !== null
      ? selectedTemplate.crew.slice(0, crewLimit)
      : selectedTemplate.crew;

  const finalResearchResources: Partial<Record<ResearchResourceType, number>> =
    {
      ...(selectedTemplate.researchResources ?? {}),
    };
  for (const mod of selectedModifierItems) {
    if (!mod.researchResources) continue;
    for (const [key, value] of Object.entries(mod.researchResources)) {
      const resource = key as ResearchResourceType;
      finalResearchResources[resource] =
        (finalResearchResources[resource] ?? 0) + value;
    }
  }

  const researchSummary = getResearchResourceSummary(finalResearchResources, t);

  const finalMaxFuel = Math.max(
    0,
    selectedTemplate.maxFuel +
      selectedModifierItems.reduce(
        (sum, mod) => sum + (mod.maxFuelDelta ?? 0),
        0,
      ),
  );
  const finalFuel = Math.max(
    0,
    Math.min(
      selectedTemplate.fuel +
        selectedModifierItems.reduce(
          (sum, mod) => sum + (mod.fuelDelta ?? 0),
          0,
        ),
      finalMaxFuel,
    ),
  );

  const totalCredits =
    selectedTemplate.credits +
    selectedModifierItems.reduce((sum, mod) => sum + mod.creditDelta, 0);

  const toggleModifier = (id: string) => {
    setSelectedModifiers((prev) => {
      if (prev.includes(id)) return prev.filter((m) => m !== id);

      const modifier = LAUNCH_MODIFIERS.find((mod) => mod.id === id);
      if (!modifier || getBlockingModifier(modifier, prev)) return prev;

      const next = modifier?.group
        ? prev.filter((selectedId) => {
            const selected = LAUNCH_MODIFIERS.find(
              (mod) => mod.id === selectedId,
            );
            return selected?.group !== modifier.group;
          })
        : prev;

      return [...next, id];
    });
  };

  const renderModifierButton = (mod: LaunchModifier) => {
    const isActive = selectedModifiers.includes(mod.id);
    const blockingModifier = getBlockingModifier(mod, selectedModifiers);
    const isBlocked = !isActive && blockingModifier !== null;
    const tc = MODIFIER_TYPE_COLORS[mod.type];
    const details = getModifierDetails(mod, t);

    return (
      <button
        key={mod.id}
        type="button"
        disabled={isBlocked}
        onClick={() => toggleModifier(mod.id)}
        className={`min-w-0 text-left border p-2.5 transition-all ${
          isBlocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        }`}
        style={{
          borderColor: isActive ? tc.border : "rgba(0,255,65,0.15)",
          backgroundColor: isActive ? tc.bg : "rgba(0,0,0,0.18)",
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div
              className="font-bold text-xs leading-snug"
              style={{ color: isActive ? tc.text : "#00ff41" }}
            >
              {mod.group === "doctrine" && (
                <span className="mr-1 text-[10px] uppercase tracking-[0.12em] text-accent">
                  {t("new_game_setup.doctrine_badge")}
                </span>
              )}
              {t(mod.nameKey)}
            </div>
            <div className="mt-1 text-[10px] leading-snug text-[#777]">
              {t(mod.descriptionKey)}
            </div>
          </div>
          <span
            className="shrink-0 text-xs font-bold tabular-nums"
            style={{
              color: mod.creditDelta >= 0 ? "#00ff41" : "#ff4444",
            }}
          >
            {mod.creditDelta > 0 ? `+${mod.creditDelta}` : mod.creditDelta}₢
          </span>
        </div>

        {details.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {details.slice(0, 3).map((detail) => (
              <Pill
                key={detail}
                tone={
                  mod.type === "bonus"
                    ? "good"
                    : mod.type === "challenge"
                      ? "danger"
                      : "warning"
                }
              >
                {detail}
              </Pill>
            ))}
          </div>
        )}
        {blockingModifier && (
          <div className="mt-2 text-[10px] text-[#ff9a9a]">
            {t("new_game_setup.conflicts_with")}: {t(blockingModifier.nameKey)}
          </div>
        )}
      </button>
    );
  };

  const handleStart = () => {
    restartGame(selectedTemplateId, selectedModifiers);
    onClose();
    window.location.href = "/";
  };

  const handleOpenChange = (v: boolean) => {
    if (!v && required) return;
    if (!v) onClose();
  };

  const diffColors = DIFFICULTY_COLORS[selectedTemplate.difficulty];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="bg-[rgba(5,8,16,0.98)] border-2 border-[#00ff41] text-[#00ff41] w-[calc(100vw-1rem)] min-[900px]:w-[calc(100vw-2rem)] min-[1280px]:w-[min(1280px,calc(100vw-2rem))] max-w-none! max-h-[calc(100dvh-1rem)] overflow-hidden p-0 gap-0 grid-rows-[auto_minmax(0,1fr)_auto]"
        showCloseButton={!required}
      >
        <DialogHeader className="min-w-0 px-4 pt-4 pb-3 sm:px-5 border-b border-[rgba(0,255,65,0.2)]">
          <div className="font-['Orbitron'] text-[9px] font-bold uppercase tracking-[0.28em] text-ring">
            {t("title_screen.title")}
          </div>
          <DialogTitle className="text-[#00ff41] font-['Orbitron'] text-base sm:text-xl">
            {t("new_game_setup.title")}
          </DialogTitle>
          <DialogDescription className="text-[#888] text-xs sm:text-sm mt-0.5">
            {t("new_game_setup.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto overflow-x-hidden px-2 py-3 sm:p-4">
          <div className="grid min-w-0 gap-3 min-[980px]:grid-cols-[minmax(260px,0.72fr)_minmax(0,1.55fr)]">
            <section className="min-w-0 border border-[#00ff4133] bg-[rgba(0,255,65,0.02)] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="font-['Orbitron'] text-xs font-bold uppercase tracking-[0.18em] text-accent">
                  {t("new_game_setup.template_section")}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {SHIP_TEMPLATES.length} {t("new_game_setup.options_label")}
                </div>
              </div>

              <div className="grid min-w-0 gap-2 sm:grid-cols-2 min-[980px]:grid-cols-1">
                {SHIP_TEMPLATES.map((tmpl) => {
                  const isSelected = tmpl.id === selectedTemplateId;
                  const dc = DIFFICULTY_COLORS[tmpl.difficulty];

                  return (
                    <button
                      key={tmpl.id}
                      onClick={() => setSelectedTemplateId(tmpl.id)}
                      className="min-w-0 text-left border p-2.5 transition-all cursor-pointer"
                      style={{
                        borderColor: isSelected
                          ? dc.border
                          : "rgba(0,255,65,0.18)",
                        backgroundColor: isSelected
                          ? dc.bg
                          : "rgba(0,0,0,0.18)",
                      }}
                    >
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                        <div className="min-w-0">
                          <div
                            className="max-w-full pr-1 font-bold text-xs leading-snug sm:text-sm"
                            style={{ color: isSelected ? dc.text : "#00ff41" }}
                          >
                            {t(tmpl.nameKey)}
                          </div>
                          <div className="mt-1 text-[10px] text-[#777] line-clamp-2">
                            {t(tmpl.descriptionKey)}
                          </div>
                        </div>
                        <span
                          className="grid h-5 w-5 shrink-0 place-items-center whitespace-nowrap border text-[10px] font-bold leading-none"
                          style={{ color: dc.text, borderColor: dc.border }}
                          title={t(
                            `new_game_setup.difficulty_${tmpl.difficulty}`,
                          )}
                          aria-label={t(
                            `new_game_setup.difficulty_${tmpl.difficulty}`,
                          )}
                        >
                          {DIFFICULTY_SYMBOLS[tmpl.difficulty]}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1">
                        <Pill>
                          {t("new_game_setup.crew_short")}: {tmpl.crew.length}
                        </Pill>
                        <Pill>
                          {t("new_game_setup.modules_short")}:{" "}
                          {tmpl.modules.length}
                        </Pill>
                        <Pill tone="warning">₢{tmpl.credits}</Pill>
                        {tmpl.probes > 0 && (
                          <Pill tone="good">
                            {t("new_game_setup.probes_short")}: {tmpl.probes}
                          </Pill>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="grid min-w-0 gap-3">
              <section className="min-w-0 border border-[#00ff4133] bg-[rgba(0,255,65,0.02)] p-3">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-['Orbitron'] text-sm font-bold uppercase tracking-[0.16em] text-accent">
                      {t("new_game_setup.final_preview")}
                    </div>
                    <div className="mt-1 max-w-2xl text-xs leading-relaxed text-[#888]">
                      <span className="font-bold text-[#00ff41]">
                        {t(selectedTemplate.nameKey)}
                      </span>
                      {" · "}
                      {t(selectedTemplate.descriptionKey)}
                    </div>
                  </div>
                  <span
                    className="border px-2 py-1 text-xs font-bold"
                    style={{
                      color: diffColors.text,
                      borderColor: diffColors.border,
                    }}
                  >
                    {t(
                      `new_game_setup.difficulty_${selectedTemplate.difficulty}`,
                    )}
                  </span>
                </div>

                <div className="grid min-w-0 gap-2 min-[560px]:grid-cols-2 min-[1180px]:grid-cols-4">
                  <InfoMetric
                    label={t("new_game_setup.start_credits")}
                    value={`₢${Math.max(0, totalCredits)}`}
                  />
                  <InfoMetric
                    label={t("new_game_setup.fuel_label")}
                    value={`${finalFuel}/${finalMaxFuel}`}
                  />
                  <InfoMetric
                    label={t("new_game_setup.crew_label")}
                    value={String(finalCrew.length)}
                  />
                  <InfoMetric
                    label={t("new_game_setup.probes_label")}
                    value={String(selectedTemplate.probes)}
                  />
                </div>

                <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
                  <div className="min-w-0">
                    <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      {t("new_game_setup.crew_composition")}
                    </div>
                    <div className="wrap-break-word text-xs text-ring">
                      {getCrewSummary(finalCrew, t)}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      {t("new_game_setup.crew_level")}
                    </div>
                    <div className="wrap-break-word text-xs text-[#00ff41]">
                      {getCrewLevelSummary(finalCrew, crewLevel, t)}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      {t("new_game_setup.research_resources")}
                    </div>
                    <div className="wrap-break-word text-xs text-[#a855f7]">
                      {researchSummary ?? t("new_game_setup.none")}
                    </div>
                  </div>
                </div>

                <div className="mt-3 min-h-14">
                  <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {t("new_game_setup.final_effects")}
                  </div>
                  {selectedModifierItems.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {selectedModifierItems.flatMap((mod) =>
                        getModifierDetails(mod, t).map((detail) => (
                          <Pill
                            key={`${mod.id}-${detail}`}
                            tone={
                              mod.type === "bonus"
                                ? "good"
                                : mod.type === "challenge"
                                  ? "danger"
                                  : "warning"
                            }
                          >
                            {detail}
                          </Pill>
                        )),
                      )}
                    </div>
                  ) : (
                    <div className="text-[10px] text-[#555]">
                      {t("new_game_setup.no_final_effects")}
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {t("new_game_setup.module_legend_label")}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(moduleCounts).map(([type, count]) => (
                      <Pill key={type}>
                        {getModuleLabel(type as ModuleType, t)} x{count}
                      </Pill>
                    ))}
                  </div>
                </div>
              </section>

              <section className="min-w-0 border border-[#00ff4133] bg-[rgba(0,255,65,0.02)] p-3">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-['Orbitron'] text-xs font-bold uppercase tracking-[0.18em] text-accent">
                      {t("new_game_setup.modifiers_section")}
                      <span className="ml-2 font-mono text-[10px] font-normal normal-case tracking-normal text-[#888]">
                        {t("new_game_setup.modifiers_hint")}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] text-[#666]">
                      {t("new_game_setup.modifiers_beginner_tip")}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {t("new_game_setup.modifiers_active")}:{" "}
                    {selectedModifiers.length}
                  </div>
                </div>

                <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {t("new_game_setup.doctrine_section")}
                </div>
                <div className="grid min-w-0 gap-2 min-[1180px]:grid-cols-2">
                  {DOCTRINE_MODIFIERS.map(renderModifierButton)}
                </div>

                <div className="mb-2 mt-4 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {t("new_game_setup.regular_modifiers_section")}
                </div>
                <div className="grid min-w-0 gap-2 min-[1180px]:grid-cols-2">
                  {REGULAR_MODIFIERS.map(renderModifierButton)}
                </div>
              </section>
            </div>
          </div>
        </div>

        <footer className="min-w-0 border-t border-[rgba(0,255,65,0.2)] bg-[rgba(5,8,16,0.98)] px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[#888]">
                  {t("new_game_setup.ship_label")}:
                </span>
                <span className="font-bold text-[#00ff41]">
                  {t(selectedTemplate.nameKey)}
                </span>
                <span className="text-[#444]">/</span>
                <span className="text-[#888]">
                  {t("new_game_setup.modifiers_active")}:
                </span>
                <span className="font-bold text-accent">
                  {selectedModifiers.length}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-[#888]">
                  {t("new_game_setup.start_credits")}:
                </span>
                <span
                  className="font-bold tabular-nums"
                  style={{ color: totalCredits < 0 ? "#ff4444" : "#ffb000" }}
                >
                  ₢{Math.max(0, totalCredits)}
                </span>
                {selectedModifierItems.length > 0 && (
                  <span className="min-w-0 wrap-break-word text-[#555]">
                    {joinLabels(
                      selectedModifierItems.map((mod) => t(mod.nameKey)),
                    )}
                  </span>
                )}
              </div>
            </div>

            <Button
              onClick={handleStart}
              className="cursor-pointer w-full sm:w-auto shrink-0 bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider px-6 py-5 font-bold text-sm"
            >
              {t("new_game_setup.start_button")}
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

function InfoMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#1a3320] bg-[rgba(0,0,0,0.25)] p-2">
      <div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-['Orbitron'] text-sm font-bold text-[#00ff41]">
        {value}
      </div>
    </div>
  );
}
