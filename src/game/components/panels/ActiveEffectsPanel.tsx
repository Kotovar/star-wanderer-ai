"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getEffectDescription } from "@/game/artifacts";
import { RACES } from "@/game/constants/races";
import { useGameStore } from "@/game/store";
import type { ActiveEffect, EffectSource } from "@/game/types";
import { useTranslation } from "@/lib/useTranslation";

type EffectFilter = "all" | "positive" | "negative" | "expiring";

const FILTERS: EffectFilter[] = ["all", "positive", "negative", "expiring"];

const SOURCE_ICONS: Record<EffectSource, string> = {
  planet: "◉",
  crew: "♟",
  combat: "⚔",
  anomaly: "◈",
  event: "◆",
};

function getPlanetEffectKey(raceId: string): string {
  const keyMap: Record<string, string> = {
    human: "human_academy",
    synthetic: "synthetic_archives",
    xenosymbiont: "xenosymbiont_lab",
    krylorian: "krylorian_dojo",
    voidborn: "voidborn_ritual",
    crystalline: "crystalline_resonator",
  };
  return keyMap[raceId] || raceId;
}

const getSource = (effect: ActiveEffect): EffectSource =>
  effect.source ?? "planet";

export function ActiveEffectsPanel() {
  const [filter, setFilter] = useState<EffectFilter>("all");
  const activeEffects = useGameStore((state) => state.activeEffects);
  const showSectorMap = useGameStore((state) => state.showSectorMap);
  const { t } = useTranslation();
  const positiveCount = activeEffects.filter(
    (effect) => (effect.polarity ?? "positive") !== "negative",
  ).length;
  const negativeCount = activeEffects.filter(
    (effect) => effect.polarity === "negative",
  ).length;
  const expiringCount = activeEffects.filter(
    (effect) => !effect.permanent && effect.turnsRemaining <= 2,
  ).length;
  const filteredEffects = activeEffects.filter((effect) => {
    if (filter === "positive") return effect.polarity !== "negative";
    if (filter === "negative") return effect.polarity === "negative";
    if (filter === "expiring") {
      return !effect.permanent && effect.turnsRemaining <= 2;
    }
    return true;
  });

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-2 text-[#d7ffe0]">
      <div className="flex items-start justify-between gap-3 border-b border-[#9933ff44] pb-3">
        <div>
          <div className="font-['Orbitron'] text-lg font-bold uppercase tracking-[0.14em] text-[#b46cff]">
            {t("effects.title")}
          </div>
          <div className="mt-1 text-xs text-[#888]">
            {t("effects.description")}
          </div>
        </div>
        <Button
          onClick={showSectorMap}
          className="shrink-0 cursor-pointer border border-[#00ff41] bg-transparent text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810]"
        >
          {t("common.back_to_map")}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="border border-[#00ff4144] bg-[rgba(0,255,65,0.04)] p-2">
          <div className="text-[9px] uppercase tracking-[0.16em] text-[#65806b]">
            {t("effects.summary.positive")}
          </div>
          <div className="mt-1 font-['Orbitron'] text-lg text-[#00ff41]">
            {positiveCount}
          </div>
        </div>
        <div className="border border-[#ffb00044] bg-[rgba(255,176,0,0.04)] p-2">
          <div className="text-[9px] uppercase tracking-[0.16em] text-[#806f50]">
            {t("effects.summary.negative")}
          </div>
          <div className="mt-1 font-['Orbitron'] text-lg text-accent">
            {negativeCount}
          </div>
        </div>
        <div className="border border-[#ff668044] bg-[rgba(255,102,128,0.04)] p-2">
          <div className="text-[9px] uppercase tracking-[0.16em] text-[#80606a]">
            {t("effects.summary.expiring")}
          </div>
          <div className="mt-1 font-['Orbitron'] text-lg text-[#ff6680]">
            {expiringCount}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1" aria-label={t("effects.filters.label")}>
        {FILTERS.map((filterId) => (
          <button
            key={filterId}
            type="button"
            onClick={() => setFilter(filterId)}
            className={`cursor-pointer border px-2 py-1 text-[10px] uppercase tracking-wider transition-colors ${
              filter === filterId
                ? "border-[#b46cff] bg-[rgba(153,51,255,0.16)] text-[#d9b6ff]"
                : "border-[#49305f] text-[#78678a] hover:text-[#b46cff]"
            }`}
          >
            {t(`effects.filters.${filterId}`)}
          </button>
        ))}
      </div>

      {activeEffects.length === 0 ? (
        <div className="grid min-h-52 place-items-center border border-dashed border-[#9933ff55] bg-[rgba(153,51,255,0.025)] p-6 text-center">
          <div>
            <div className="text-3xl text-[#9933ff]" aria-hidden="true">
              ◇
            </div>
            <div className="mt-3 font-['Orbitron'] text-sm uppercase tracking-wider text-[#b46cff]">
              {t("effects.no_effects")}
            </div>
            <div className="mt-2 max-w-md text-xs leading-relaxed text-[#788278]">
              {t("effects.empty_hint")}
            </div>
          </div>
        </div>
      ) : filteredEffects.length === 0 ? (
        <div className="border border-dashed border-[#49305f] p-5 text-center text-xs text-[#78678a]">
          {t("effects.no_matches")}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filteredEffects.map((effect) => {
            const source = getSource(effect);
            const race = effect.raceId ? RACES[effect.raceId] : undefined;
            const effectKey = effect.raceId
              ? getPlanetEffectKey(effect.raceId)
              : null;
            const isExpiring =
              !effect.permanent && effect.turnsRemaining <= 2;
            const color = effect.color ?? race?.color ?? "#b46cff";
            const icon = effect.icon ?? race?.icon ?? SOURCE_ICONS[source];
            const name = effect.nameKey
              ? t(effect.nameKey)
              : effectKey
                ? t(`planet_effects.${effectKey}.name`)
                : effect.name;
            const description = effect.descriptionKey
              ? t(effect.descriptionKey)
              : effectKey
                ? t(`planet_effects.${effectKey}.description`)
                : effect.description;
            const progress = effect.totalTurns
              ? Math.max(0, Math.min(100, (effect.turnsRemaining / effect.totalTurns) * 100))
              : 100;

            return (
              <article
                key={effect.id}
                className="relative overflow-hidden border border-[#9933ff66] bg-[linear-gradient(145deg,rgba(153,51,255,0.08),rgba(3,9,14,0.82))] p-3"
              >
                <div
                  className="absolute inset-y-0 left-0 w-px"
                  style={{ backgroundColor: color }}
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{icon}</span>
                    <div>
                      <div className="font-bold text-sm" style={{ color }}>
                        {name}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-[#788278]">
                        {SOURCE_ICONS[source]} {t(`effects.sources.${source}`)}
                        {race && effect.raceId
                          ? ` · ${t(`race_names.${effect.raceId}`)}`
                          : ""}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`shrink-0 border px-2 py-1 text-xs font-bold ${
                      isExpiring
                        ? "border-[#ff004066] bg-[rgba(255,0,64,0.12)] text-[#ff6680]"
                        : "border-[#00ff4166] bg-[rgba(0,255,65,0.08)] text-[#00ff41]"
                    }`}
                  >
                    {effect.permanent ? (
                      <>∞ {t("effects.permanent")}</>
                    ) : (
                      <>⏱ {effect.turnsRemaining} {t("effects.turns")}</>
                    )}
                  </div>
                </div>

                <div className="mt-3 text-xs leading-relaxed text-[#8d998d]">
                  {description}
                </div>

                <div className="mt-3 space-y-1 border-t border-[#ffffff12] pt-2">
                  {effect.effects.map((item, index) => (
                    <div
                      key={index}
                      className={`text-[11px] ${
                        effect.polarity === "negative"
                          ? "text-accent"
                          : "text-[#00ff41]"
                      }`}
                    >
                      {effect.polarity === "negative" ? "⚠" : "✓"}{" "}
                      {getEffectDescription(item, effect)}
                    </div>
                  ))}
                </div>
                <div className="mt-3 h-0.5 bg-[#ffffff0d]">
                  <div
                    className="h-full transition-[width]"
                    style={{ width: `${progress}%`, backgroundColor: color }}
                  />
                </div>
                {effect.acquiredTurn !== undefined ? (
                  <div className="mt-1 text-[9px] uppercase tracking-wider text-[#596159]">
                    {t("effects.acquired_turn", { turn: effect.acquiredTurn })}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
