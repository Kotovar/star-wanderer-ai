import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGameStore } from "../store";
import { RACES } from "../constants/races";
import type { RaceId } from "../types";
import { useTranslation } from "@/lib/useTranslation";

/** Форматирует бонусы расы в список строк */
function formatCrewBonuses(
  bonuses: Record<string, number>,
  t: (key: string, params?: Record<string, string | number>) => string,
): string[] {
  return Object.entries(bonuses).map(([key, value]) => {
    const pct = Math.round(value * 100);
    switch (key) {
      case "happiness":
        return value > 0
          ? `+${value} ${t("race_discovery.bonus_happiness")}`
          : `${value} ${t("race_discovery.bonus_happiness")}`;
      case "healthRegen":
        return `+${value} ${t("race_discovery.bonus_health_regen")}`;
      case "repair":
        return `+${pct}% ${t("race_discovery.bonus_repair")}`;
      case "science":
        return `+${pct}% ${t("race_discovery.bonus_science")}`;
      case "combat":
        return `+${pct}% ${t("race_discovery.bonus_combat")}`;
      case "health":
        return `+${value} ${t("race_discovery.bonus_health")}`;
      case "fuelEfficiency":
        return `+${pct}% ${t("race_discovery.bonus_fuel")}`;
      case "heal":
        return `+${pct}% ${t("race_discovery.bonus_heal")}`;
      default:
        return `+${value} (${key})`;
    }
  });
}

export function RaceDiscoveryModal() {
  const { t } = useTranslation();
  const knownRaces = useGameStore((s) => s.knownRaces);
  const gameLoadedCount = useGameStore((s) => s.gameLoadedCount);

  const [open, setOpen] = useState(false);
  const [raceId, setRaceId] = useState<RaceId | null>(null);

  const prevLengthRef = useRef(knownRaces.length);

  useEffect(() => {
    prevLengthRef.current = knownRaces.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameLoadedCount]);

  useEffect(() => {
    const prevLength = prevLengthRef.current;
    if (knownRaces.length > prevLength) {
      const newRaceId = knownRaces[knownRaces.length - 1];
      queueMicrotask(() => {
        setRaceId(newRaceId);
        setOpen(true);
      });
    }
    prevLengthRef.current = knownRaces.length;
  }, [knownRaces]);

  if (!open || !raceId) return null;

  const race = RACES[raceId];
  if (!race) return null;

  const bonuses = formatCrewBonuses(race.crewBonuses ?? {}, t);

  // Свойства расы — что её отличает от органиков
  const properties: string[] = [];
  if (!race.requiresOxygen) properties.push(t("race_discovery.prop_no_oxygen"));
  if (!race.hasHappiness) properties.push(t("race_discovery.prop_no_happiness"));

  const hasTip = !!t(`races.${raceId}.special_tip`) && t(`races.${raceId}.special_tip`) !== `races.${raceId}.special_tip`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-[rgba(10,20,30,0.97)] border-2 border-[#ffb000] text-[#00ff41] max-w-lg w-[calc(100%-2rem)] md:w-auto">
        <DialogHeader>
          <DialogTitle className="text-[#ffb000] font-['Orbitron'] text-lg">
            {t("race_discovery.title")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("race_discovery.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-1">
          {/* Заголовок расы */}
          <div className="flex items-center gap-3 pb-2 border-b border-[rgba(255,176,0,0.3)]">
            <span className="text-4xl">{race.icon}</span>
            <div>
              <div className="font-bold text-2xl text-[#ffb000]">
                {t(`races.${raceId}.name`)}
              </div>
              <div className="text-xs text-[#888]">
                {t("race_discovery.homeworld_label")}: {t(`races.${raceId}.homeworld`)}
              </div>
            </div>
          </div>

          {/* Описание */}
          <div className="text-sm text-[#aaa]">
            {t(`races.${raceId}.description`)}
          </div>

          {/* Бонусы экипажа */}
          {bonuses.length > 0 && (
            <div>
              <div className="text-xs text-[#ffb000] font-bold uppercase mb-1">
                {t("race_discovery.bonuses_label")}
              </div>
              <div className="flex flex-wrap gap-2">
                {bonuses.map((b, i) => (
                  <span
                    key={i}
                    className="bg-[rgba(0,255,65,0.1)] border border-[rgba(0,255,65,0.3)] text-[#00ff41] text-xs px-2 py-0.5 rounded"
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Свойства расы */}
          {properties.length > 0 && (
            <div>
              <div className="text-xs text-[#ffb000] font-bold uppercase mb-1">
                {t("race_discovery.properties_label")}
              </div>
              <div className="flex flex-wrap gap-2">
                {properties.map((p, i) => (
                  <span
                    key={i}
                    className="bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.3)] text-[#00d4ff] text-xs px-2 py-0.5 rounded"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Трейты расы */}
          {race.specialTraits.length > 0 && (
            <div>
              <div className="text-xs text-[#ffb000] font-bold uppercase mb-1">
                {t("race_discovery.traits")}
              </div>
              <div className="space-y-1.5">
                {race.specialTraits.map((trait) => {
                  const isPositive = trait.type === "positive";
                  const isNegative = trait.type === "negative";
                  return (
                    <div
                      key={trait.id}
                      className="flex items-start gap-2 text-xs"
                    >
                      <span className="mt-0.5 shrink-0">
                        {isPositive ? "✦" : isNegative ? "✖" : "◆"}
                      </span>
                      <div>
                        <span
                          className={
                            isPositive
                              ? "text-[#00ff41] font-bold"
                              : isNegative
                                ? "text-[#ff4444] font-bold"
                                : "text-[#888] font-bold"
                          }
                        >
                          {t(`racial_traits.${trait.id}.name`)}
                        </span>
                        <span className="text-[#888] ml-1">
                          — {t(`racial_traits.${trait.id}.description`)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Особая подсказка (например, как сращиваться для ксеноморфов) */}
          {hasTip && (
            <div className="bg-[rgba(255,176,0,0.08)] border border-[rgba(255,176,0,0.4)] rounded p-3">
              <div className="text-xs text-[#ffb000] font-bold uppercase mb-1">
                💡 {t("race_discovery.tip_label")}
              </div>
              <div className="text-xs text-[#aaa]">
                {t(`races.${raceId}.special_tip`)}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
