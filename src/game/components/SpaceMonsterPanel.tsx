"use client";

import { useState } from "react";
import { ArrowLeft, BookOpen, Radio, ShieldAlert, Sparkles, Swords, Wand2 } from "lucide-react";
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
  const activeContracts = useGameStore((s) => s.activeContracts);
  const artifacts = useGameStore((s) => s.artifacts);
  const startCombat = useGameStore((s) => s.startCombat);
  const resonateWithSpaceMonster = useGameStore(
    (s) => s.resonateWithSpaceMonster,
  );
  const cleanseCursedArtifact = useGameStore((s) => s.cleanseCursedArtifact);
  const showSectorMap = useGameStore((s) => s.showSectorMap);
  const { t } = useTranslation();
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(
    null,
  );

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
  const firstContactDescription = t(monster.firstContact.descriptionKey);

  const cleanseContract = activeContracts.find(
    (c) =>
      c.type === "cleanse_curse" && c.targetLocationId === currentLocation.id,
  );
  const cursedArtifacts = artifacts.filter((a) => a.discovered && a.cursed);
  const activeSelectedArtifactId =
    selectedArtifactId && cursedArtifacts.some((a) => a.id === selectedArtifactId)
      ? selectedArtifactId
      : (cursedArtifacts[0]?.id ?? null);

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

      <div className="border border-[#33405544] bg-[rgba(0,0,0,0.22)] p-3">
        <div className="flex items-center gap-2 font-['Orbitron'] text-[10px] font-bold uppercase tracking-[0.1em] text-[#8b92a5]">
          <BookOpen size={13} /> {t("space_monsters.lore_title")}
        </div>
        <p className="relative mt-2 text-xs italic leading-relaxed text-[#9aa3b2]">
          {t(monster.loreKey)}
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
          className="h-auto min-h-9 w-full gap-1.5 whitespace-normal border-2 border-(--btn-color) bg-transparent px-2 py-2 text-[11px] uppercase leading-tight tracking-wide text-(--btn-color) hover:bg-(--btn-color) hover:text-[#050810] disabled:opacity-45 sm:text-sm sm:tracking-wider"
          style={{ "--btn-color": monster.color } as React.CSSProperties}
        >
          <Radio size={15} />
          <span className="min-w-0 wrap-break-word text-center">
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

      {cleanseContract && (
        <div className="space-y-2 border border-[#202c3a] bg-[#050810] p-3">
          <div className="flex items-center gap-2 font-['Orbitron'] text-[11px] font-bold text-[#c084fc]">
            <Wand2 size={14} /> {t("space_monsters.cleanse_title")}
          </div>
          {cursedArtifacts.length === 0 ? (
            <p className="px-1 text-[11px] leading-relaxed text-[#8b92a5]">
              {t("space_monsters.cleanse_none")}
            </p>
          ) : (
            <>
              {cursedArtifacts.length > 1 ? (
                <select
                  value={activeSelectedArtifactId ?? ""}
                  onChange={(e) => setSelectedArtifactId(e.target.value)}
                  className="w-full border border-[#c084fc44] bg-[#050810] p-2 text-xs text-[#e7d3ff]"
                >
                  {cursedArtifacts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="border border-[#c084fc44] bg-[#050810] p-2 text-xs text-[#e7d3ff]">
                  {cursedArtifacts[0].name}
                </div>
              )}
              <Button
                onClick={() =>
                  activeSelectedArtifactId &&
                  cleanseCursedArtifact(activeSelectedArtifactId)
                }
                disabled={!activeSelectedArtifactId}
                className="w-full border-2 border-[#c084fc] bg-transparent text-[#c084fc] uppercase tracking-wider hover:bg-[#c084fc] hover:text-[#050810]"
              >
                <Wand2 size={15} /> {t("space_monsters.cleanse_button")}
              </Button>
              <p className="px-1 text-[11px] leading-relaxed text-[#8b92a5]">
                {t("space_monsters.cleanse_hint")}
              </p>
            </>
          )}
        </div>
      )}

      <Button
        onClick={showSectorMap}
        className="w-fit border-2 border-accent bg-transparent uppercase tracking-wider text-accent hover:bg-accent hover:text-[#050810]"
      >
        <ArrowLeft size={14} /> {t("space_monsters.withdraw")}
      </Button>
    </div>
  );
}
