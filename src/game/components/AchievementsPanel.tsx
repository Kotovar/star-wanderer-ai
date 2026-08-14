"use client";

import { useTranslation } from "@/lib/useTranslation";
import { useMetaProgress } from "@/game/metaProgress/useMetaProgress";
import {
  ACHIEVEMENTS,
  isAchievementVisible,
} from "@/game/metaProgress/achievements";
import {
  ALWAYS_UNLOCKED_SHIP_IDS,
  SHIP_UNLOCK_RULES,
} from "@/game/metaProgress/shipUnlocks";
import { SHIP_TEMPLATES } from "@/game/constants/shipTemplates";
import { LAUNCH_MODIFIERS } from "@/game/constants/launchModifiers";

const DOCTRINE_IDS = new Set(
  LAUNCH_MODIFIERS.filter((mod) => mod.group === "doctrine").map(
    (mod) => mod.id,
  ),
);

function ProgressBar({
  value,
  max,
  color = "#ffb000",
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 border border-[#1a3320] bg-[#050810]">
      <div
        className="h-full transition-all"
        style={{
          width: `${pct}%`,
          backgroundColor: color,
          boxShadow: `0 0 8px ${color}66`,
        }}
      />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-[#00ff4133] bg-[rgba(0,255,65,0.02)] p-3">
      <div className="mb-3 flex items-center gap-2">
        <div className="font-['Orbitron'] text-xs font-bold uppercase tracking-[0.18em] text-accent">
          {title}
        </div>
        <div className="h-px flex-1 bg-[#ffb00022]" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function AchievementCard({
  name,
  description,
  unlocked,
  progress,
}: {
  name: string;
  description: string;
  unlocked: boolean;
  progress?: { current: number; target: number };
}) {
  return (
    <div
      className={`min-w-0 border p-2.5 ${
        unlocked
          ? "border-[#00ff4166] bg-[rgba(0,255,65,0.05)]"
          : "border-[#1a3320] bg-[rgba(0,0,0,0.2)]"
      }`}
    >
      <div className="flex items-start gap-2">
        <span className={unlocked ? "text-[#00ff41]" : "text-[#444]"}>
          {unlocked ? "✓" : "🔒"}
        </span>
        <div className="min-w-0 flex-1">
          <div
            className={`text-xs font-bold ${unlocked ? "text-[#b6ffc7]" : "text-[#777]"}`}
          >
            {name}
          </div>
          <div
            className={`mt-0.5 text-[10px] leading-snug ${unlocked ? "text-[#8fdba0]" : "text-[#555]"}`}
          >
            {description}
          </div>
          {!unlocked && progress && (
            <div className="mt-1.5">
              <ProgressBar value={progress.current} max={progress.target} />
              <div className="mt-0.5 text-[9px] text-[#666]">
                {progress.current}/{progress.target}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AchievementsPanel() {
  const { t } = useTranslation();
  const meta = useMetaProgress();
  const visibleAchievements = ACHIEVEMENTS.filter((achievement) =>
    isAchievementVisible(achievement, meta.unlockedAchievementIds),
  );

  const doctrineAchievements = visibleAchievements.filter((a) =>
    DOCTRINE_IDS.has(a.id),
  );
  const modifierAchievements = visibleAchievements.filter(
    (a) => !DOCTRINE_IDS.has(a.id),
  );
  const unlockedAchievementCount = visibleAchievements.filter((a) =>
    meta.unlockedAchievementIds.includes(a.id),
  ).length;

  const progressionShips = SHIP_TEMPLATES.filter(
    (tmpl) =>
      ALWAYS_UNLOCKED_SHIP_IDS.includes(tmpl.id) || tmpl.id in SHIP_UNLOCK_RULES,
  );
  const unlockedShipCount = progressionShips.filter(
    (tmpl) =>
      ALWAYS_UNLOCKED_SHIP_IDS.includes(tmpl.id) ||
      meta.unlockedShipIds.includes(tmpl.id),
  ).length;

  return (
    <div className="space-y-3 text-[#00ff41]">
      <div>
        <div className="text-xs leading-relaxed text-muted-foreground">
          {t("achievements.panel_summary", {
            unlocked: unlockedAchievementCount,
            total: visibleAchievements.length,
            ships: unlockedShipCount,
            shipsTotal: progressionShips.length,
          })}
        </div>
      </div>

      <Section title={t("achievements.ships_section")}>
        {progressionShips.map((tmpl) => {
          const unlocked =
            ALWAYS_UNLOCKED_SHIP_IDS.includes(tmpl.id) ||
            meta.unlockedShipIds.includes(tmpl.id);
          const rule = SHIP_UNLOCK_RULES[tmpl.id];
          return (
            <AchievementCard
              key={tmpl.id}
              name={t(tmpl.nameKey)}
              description={
                unlocked ? t(tmpl.descriptionKey) : rule ? t(rule.hintKey) : ""
              }
              unlocked={unlocked}
              progress={!unlocked ? rule?.getProgress(meta) : undefined}
            />
          );
        })}
      </Section>

      <Section title={t("achievements.doctrines_section")}>
        {doctrineAchievements.map((achievement) => {
          const unlocked = meta.unlockedAchievementIds.includes(
            achievement.id,
          );
          return (
            <AchievementCard
              key={achievement.id}
              name={t(achievement.nameKey)}
              description={t(achievement.descriptionKey)}
              unlocked={unlocked}
              progress={!unlocked ? achievement.getProgress?.(meta) : undefined}
            />
          );
        })}
      </Section>

      <Section title={t("achievements.modifiers_section")}>
        {modifierAchievements.map((achievement) => {
          const unlocked = meta.unlockedAchievementIds.includes(
            achievement.id,
          );
          return (
            <AchievementCard
              key={achievement.id}
              name={t(achievement.nameKey)}
              description={t(achievement.descriptionKey)}
              unlocked={unlocked}
              progress={!unlocked ? achievement.getProgress?.(meta) : undefined}
            />
          );
        })}
      </Section>
    </div>
  );
}
