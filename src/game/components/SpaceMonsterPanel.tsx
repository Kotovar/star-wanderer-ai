"use client";

import { ArrowLeft, Radio, ShieldAlert, Sparkles, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RESEARCH_RESOURCES } from "@/game/constants/research/resources";
import {
  getSpaceMonsterHuntReward,
  SPACE_MONSTERS,
} from "@/game/constants/spaceMonsters";
import { useGameStore } from "@/game/store";
import { useTranslation } from "@/lib/useTranslation";

export function SpaceMonsterPanel() {
  const currentLocation = useGameStore((s) => s.currentLocation);
  const probes = useGameStore((s) => s.probes);
  const activeEffects = useGameStore((s) => s.activeEffects);
  const startCombat = useGameStore((s) => s.startCombat);
  const resonateWithSpaceMonster = useGameStore(
    (s) => s.resonateWithSpaceMonster,
  );
  const showSectorMap = useGameStore((s) => s.showSectorMap);
  const { t } = useTranslation();

  if (
    !currentLocation ||
    currentLocation.type !== "space_monster" ||
    !currentLocation.spaceMonsterType
  ) {
    return null;
  }

  const monster = SPACE_MONSTERS[currentLocation.spaceMonsterType];
  const threat = currentLocation.threat ?? 1;
  const huntReward = getSpaceMonsterHuntReward(monster, threat);
  const resource = RESEARCH_RESOURCES[monster.huntReward];
  const resonanceActive = activeEffects.some(
    (effect) => effect.definitionId === monster.resonanceEffect,
  );
  const canResonate = probes > 0 && !resonanceActive;
  const firstContactDescription = "value" in monster.firstContact
    ? t(monster.firstContact.descriptionKey, {
        value: monster.firstContact.value,
      })
    : t(monster.firstContact.descriptionKey);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-start gap-3">
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-full border text-3xl shadow-[0_0_24px_currentColor]"
          style={{ borderColor: monster.color, color: monster.color }}
        >
          {monster.icon}
        </div>
        <div>
          <div className="font-['Orbitron'] text-lg font-bold text-ring">
            ▸ {t("space_monsters.title")}
          </div>
          <div className="font-['Orbitron'] text-sm font-bold" style={{ color: monster.color }}>
            {t(monster.nameKey)}
          </div>
        </div>
      </div>

      <div
        className="relative overflow-hidden border p-4"
        style={{ borderColor: `${monster.color}66`, backgroundColor: `${monster.color}0d` }}
      >
        <div
          className="pointer-events-none absolute -right-5 -top-7 size-28 rounded-full opacity-30 blur-2xl"
          style={{ backgroundColor: monster.color }}
        />
        <p className="relative text-sm leading-relaxed text-[#c4c7d1]">
          {t(monster.descriptionKey)}
        </p>
        <p className="relative mt-3 border-l-2 pl-3 text-xs leading-relaxed text-[#8b92a5]" style={{ borderColor: monster.color }}>
          {t(monster.behaviorKey)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="border border-[#ffb00044] bg-[rgba(255,176,0,0.05)] p-3">
          <div className="text-[#888]">{t("space_monsters.threat")}</div>
          <div className="mt-1 font-['Orbitron'] text-base font-bold text-accent">
            ⚠ {threat}
          </div>
        </div>
        <div className="border border-[#00ff4144] bg-[rgba(0,255,65,0.05)] p-3">
          <div className="text-[#888]">{t("space_monsters.hunt_reward")}</div>
          <div className="mt-1 flex items-center gap-1 font-bold text-[#00ff41]">
            <span>{resource.icon}</span>
            <span>×{huntReward}</span>
            <span className="truncate">{resource.name}</span>
          </div>
        </div>
      </div>

      <div
        className="border p-3 text-xs"
        style={{
          borderColor: `${monster.color}66`,
          backgroundColor: `${monster.color}0d`,
        }}
      >
        <div className="flex items-center gap-2 font-['Orbitron'] text-[11px] font-bold" style={{ color: monster.color }}>
          <Sparkles size={14} /> {t("space_monsters.first_contact")}
        </div>
        <p className="mt-2 leading-relaxed text-[#c4c7d1]">
          {currentLocation.spaceMonsterInsightUsed
            ? t("space_monsters.first_contact_used")
            : firstContactDescription}
        </p>
      </div>

      <div className="space-y-2 border border-[#202c3a] bg-[#050810] p-3">
        <Button
          onClick={() =>
            startCombat({ ...currentLocation, name: t(monster.nameKey) })
          }
          className="w-full border-2 border-[#ff5c5c] bg-transparent text-[#ff7b7b] uppercase tracking-wider hover:bg-[#ff5c5c] hover:text-[#050810]"
        >
          <Swords size={15} /> {t("space_monsters.hunt")}
        </Button>
        <div className="px-1 text-[11px] leading-relaxed text-[#8b92a5]">
          <ShieldAlert className="mr-1 inline size-3 text-[#ff7b7b]" />
          {t("space_monsters.hunt_hint")}
        </div>
      </div>

      <div className="space-y-2 border border-[#202c3a] bg-[#050810] p-3">
        <Button
          disabled={!canResonate}
          onClick={resonateWithSpaceMonster}
          className="h-auto min-h-9 w-full gap-1.5 whitespace-normal border-2 border-[var(--btn-color)] bg-transparent px-2 py-2 text-[11px] uppercase leading-tight tracking-wide text-[var(--btn-color)] hover:bg-[var(--btn-color)] hover:text-[#050810] disabled:opacity-45 sm:text-sm sm:tracking-wider"
          style={{ "--btn-color": monster.color } as React.CSSProperties}
        >
          <Radio size={15} />
          <span className="min-w-0 break-words text-center">
            {t("space_monsters.resonate")} · 1× 🔬
          </span>
        </Button>
        <div className="px-1 text-[11px] leading-relaxed text-[#8b92a5]">
          {resonanceActive ? (
            t("space_monsters.resonance_active_hint")
          ) : canResonate ? (
            t("space_monsters.resonate_hint")
          ) : (
            <span className="text-[#ff7b7b]">{t("space_monsters.not_enough_probes")}</span>
          )}
        </div>
      </div>

      <Button
        onClick={showSectorMap}
        className="w-fit border-2 border-accent bg-transparent uppercase tracking-wider text-accent hover:bg-accent hover:text-[#050810]"
      >
        <ArrowLeft size={14} /> {t("space_monsters.withdraw")}
      </Button>
    </div>
  );
}
