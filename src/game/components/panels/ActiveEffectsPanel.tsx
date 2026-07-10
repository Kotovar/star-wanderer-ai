"use client";

import { Button } from "@/components/ui/button";
import { getEffectDescription } from "@/game/artifacts";
import { RACES } from "@/game/constants/races";
import { useGameStore } from "@/game/store";
import { useTranslation } from "@/lib/useTranslation";

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

export function ActiveEffectsPanel() {
  const activeEffects = useGameStore((state) => state.activeEffects);
  const showSectorMap = useGameStore((state) => state.showSectorMap);
  const { t } = useTranslation();

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

      {activeEffects.length === 0 ? (
        <div className="grid min-h-52 place-items-center border border-dashed border-[#9933ff55] bg-[rgba(153,51,255,0.025)] p-6 text-center">
          <div>
            <div className="text-3xl text-[#9933ff]" aria-hidden="true">
              ◇
            </div>
            <div className="mt-3 font-['Orbitron'] text-sm uppercase tracking-wider text-[#b46cff]">
              {t("effects.no_effects")}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {activeEffects.map((effect) => {
            const race = RACES[effect.raceId];
            const effectKey = getPlanetEffectKey(effect.raceId);
            const isExpiring = effect.turnsRemaining <= 2;

            return (
              <article
                key={effect.id}
                className="relative overflow-hidden border border-[#9933ff66] bg-[linear-gradient(145deg,rgba(153,51,255,0.08),rgba(3,9,14,0.82))] p-3"
              >
                <div
                  className="absolute inset-y-0 left-0 w-px"
                  style={{ backgroundColor: race.color }}
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{race.icon}</span>
                    <div>
                      <div className="font-bold text-sm" style={{ color: race.color }}>
                        {t(`planet_effects.${effectKey}.name`)}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-[#788278]">
                        {t(`race_names.${effect.raceId}`)}
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
                    ⏱ {effect.turnsRemaining} {t("effects.turns")}
                  </div>
                </div>

                <div className="mt-3 text-xs leading-relaxed text-[#8d998d]">
                  {t(`planet_effects.${effectKey}.description`)}
                </div>

                <div className="mt-3 space-y-1 border-t border-[#ffffff12] pt-2">
                  {effect.effects.map((item, index) => (
                    <div key={index} className="text-[11px] text-[#00ff41]">
                      ✓ {getEffectDescription(item, effect)}
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
