"use client";

import { useMemo } from "react";
import { useGameStore } from "@/game/store";
import { RESEARCH_TREE } from "@/game/constants";
import { canSeeTier4 } from "@/game/galaxy/galaxy-map-utils";
import { useTranslation } from "@/lib/useTranslation";

type Tone = "good" | "warning" | "danger" | "neutral";

const toneClass: Record<Tone, string> = {
  good: "text-[#00ff41]",
  warning: "text-[#ffb000]",
  danger: "text-[#ff4444]",
  neutral: "text-[#888]",
};

function ProgressBar({
  value,
  max,
  color = "#00ff41",
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  return (
    <div className="h-2 border border-[#1a3320] bg-[#050810]">
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

function MetricCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <div className="border border-[#1a3320] bg-[rgba(0,0,0,0.25)] p-2">
      <div className="text-[9px] uppercase tracking-[0.16em] text-[#667766]">
        {label}
      </div>
      <div className={`mt-1 font-['Orbitron'] text-sm font-bold ${toneClass[tone]}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-[10px] leading-snug text-[#666]">{hint}</div>}
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
        <div className="font-['Orbitron'] text-xs font-bold uppercase tracking-[0.18em] text-[#ffb000]">
          {title}
        </div>
        <div className="h-px flex-1 bg-[#ffb00022]" />
      </div>
      {children}
    </section>
  );
}

function Milestone({
  label,
  done,
  detail,
}: {
  label: string;
  done: boolean;
  detail?: string;
}) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className={done ? "text-[#00ff41]" : "text-[#444]"}>{done ? "✓" : "□"}</span>
      <div className="min-w-0">
        <div className={done ? "text-[#b6ffc7]" : "text-[#777]"}>{label}</div>
        {detail && <div className="text-[10px] text-[#555]">{detail}</div>}
      </div>
    </div>
  );
}

function isLocationCountedAsVisited(
  loc: {
    id: string;
    visited?: boolean;
    defeated?: boolean;
    bossDefeated?: boolean;
    mined?: boolean;
    signalResolved?: boolean;
    derelictExplored?: boolean;
    scoutedTimes?: number;
    planetaryDrilled?: boolean;
    atmosphereAnalyzed?: boolean;
    expeditionCompleted?: boolean;
    wreckPassesDone?: number;
    gasGiantLastDiveAt?: number;
  },
  completedLocations: string[],
) {
  return (
    loc.visited ||
    completedLocations.includes(loc.id) ||
    loc.defeated ||
    loc.bossDefeated ||
    loc.mined ||
    loc.signalResolved ||
    loc.derelictExplored ||
    (loc.scoutedTimes ?? 0) > 0 ||
    loc.planetaryDrilled ||
    loc.atmosphereAnalyzed ||
    loc.expeditionCompleted ||
    (loc.wreckPassesDone ?? 0) > 0 ||
    loc.gasGiantLastDiveAt !== undefined
  );
}

const REGION_NAMES: Record<number, string> = {
  1: "Внутренние миры",
  2: "Срединный пояс",
  3: "Внешние рубежи",
  4: "Дальний рубеж",
};

export function CampaignProgressPanel() {
  const { t } = useTranslation();
  const sectors = useGameStore((s) => s.galaxy.sectors);
  const currentSector = useGameStore((s) => s.currentSector);
  const shipModules = useGameStore((s) => s.ship.modules);
  const research = useGameStore((s) => s.research);
  const artifacts = useGameStore((s) => s.artifacts);
  const activeContracts = useGameStore((s) => s.activeContracts);
  const completedContractIds = useGameStore((s) => s.completedContractIds);
  const completedLocations = useGameStore((s) => s.completedLocations);
  const gameVictory = useGameStore((s) => s.gameVictory);
  const victoryTriggered = useGameStore((s) => s.victoryTriggered);
  const getEffectiveScanRange = useGameStore((s) => s.getEffectiveScanRange);

  const scanRange = getEffectiveScanRange();
  const currentTier = currentSector?.tier ?? 1;
  const victoryDone = gameVictory || victoryTriggered;
  const canSeeHiddenRim =
    victoryDone ||
    currentTier === 4 ||
    canSeeTier4(shipModules, artifacts, scanRange);

  const stats = useMemo(() => {
    const visibleSectors = canSeeHiddenRim
      ? sectors
      : sectors.filter((sector) => sector.tier < 4);

    const tiers = [1, 2, 3, ...(canSeeHiddenRim ? [4] : [])].map((tier) => {
      const tierSectors = sectors.filter((sector) => sector.tier === tier);
      const visited = tierSectors.filter((sector) => sector.visited).length;
      return {
        tier,
        total: tierSectors.length,
        visited,
      };
    });

    const allLocations = visibleSectors.flatMap((sector) => sector.locations);
    const bossLocations = allLocations.filter((loc) => loc.type === "boss");
    const defeatedBosses = bossLocations.filter(
      (loc) => loc.bossDefeated || completedLocations.includes(loc.id),
    ).length;
    const visitedLocations = allLocations.filter((loc) =>
      isLocationCountedAsVisited(loc, completedLocations),
    ).length;

    const discoveredArtifacts = artifacts.filter((artifact) => artifact.discovered).length;
    const researchedArtifacts = artifacts.filter((artifact) => artifact.researched).length;
    const activeArtifacts = artifacts.filter((artifact) => artifact.effect.active).length;

    return {
      tiers,
      totalSectors: visibleSectors.length,
      visitedSectors: visibleSectors.filter((sector) => sector.visited).length,
      bossTotal: bossLocations.length,
      defeatedBosses,
      visitedLocations,
      totalLocations: allLocations.length,
      discoveredArtifacts,
      researchedArtifacts,
      activeArtifacts,
    };
  }, [artifacts, canSeeHiddenRim, completedLocations, sectors]);

  const techTotal = Object.keys(RESEARCH_TREE).length;
  const techDone = research.researchedTechs.length;

  return (
    <div className="space-y-3 text-[#00ff41]">
      <div>
        <div className="font-['Orbitron'] text-base font-bold uppercase tracking-[0.18em] text-[#ffb000]">
          {t("ship.progress")}
        </div>
        <div className="mt-1 text-xs leading-relaxed text-[#667766]">
          Сводка текущей кампании: насколько далеко открыт маршрут, какие системы уже закрыты,
          и что ещё остаётся до финального прорыва.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          label="Текущая область"
          value={REGION_NAMES[currentTier] ?? "Неизвестный сектор"}
          hint={currentSector?.name ?? "—"}
          tone={currentTier >= 3 ? "warning" : "good"}
        />
        <MetricCard
          label="Секторы"
          value={`${stats.visitedSectors}/${stats.totalSectors}`}
          hint="посещено"
          tone="good"
        />
        <MetricCard
          label="Технологии"
          value={`${techDone}/${techTotal}`}
          hint="исследовано"
          tone={techDone > 0 ? "good" : "neutral"}
        />
        <MetricCard
          label="Боссы"
          value={`${stats.defeatedBosses}/${stats.bossTotal}`}
          hint="побеждено"
          tone={stats.defeatedBosses > 0 ? "warning" : "neutral"}
        />
      </div>

      <Section title="Маршрут по галактике">
        <div className="space-y-3">
          {stats.tiers.map((tier) => (
            <div key={tier.tier}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className={currentTier === tier.tier ? "text-[#ffb000]" : "text-[#888]"}>
                  {REGION_NAMES[tier.tier] ?? `Область ${tier.tier}`}
                </span>
                <span className="text-[#667766]">
                  {tier.visited}/{tier.total}
                </span>
              </div>
              <ProgressBar
                value={tier.visited}
                max={tier.total}
                color={currentTier === tier.tier ? "#ffb000" : "#00ff41"}
              />
            </div>
          ))}
          {!canSeeHiddenRim && (
            <div className="border border-[#333] bg-[rgba(255,255,255,0.02)] p-2 text-xs">
              <div className="font-['Orbitron'] text-[10px] uppercase tracking-[0.16em] text-[#666]">
                Неразмеченный рубеж
              </div>
              <div className="mt-1 leading-relaxed text-[#555]">
                Дальние сектора скрыты от навигационной карты. Они появятся после глубокого
                сканирования: сканер IV, эффективная дальность 25+ или артефакт всевидения.
              </div>
              <div className="mt-1 text-[#444]">
                Текущая дальность сканера: {scanRange}
              </div>
            </div>
          )}
        </div>
      </Section>

      <Section title="Ключевые этапы">
        <div className="grid gap-2">
          <Milestone label="Закрепиться в центральных секторах" done={stats.tiers[0]?.visited > 0} />
          <Milestone label="Покинуть внутренние миры" done={stats.tiers.some((tier) => tier.tier >= 2 && tier.visited > 0)} />
          <Milestone label="Достичь внешних рубежей" done={stats.tiers.some((tier) => tier.tier >= 3 && tier.visited > 0)} />
          <Milestone
            label="Победить древнего босса"
            done={stats.defeatedBosses > 0}
            detail={`${stats.defeatedBosses}/${stats.bossTotal}`}
          />
          <Milestone
            label="Открыть неразмеченный рубеж"
            done={canSeeHiddenRim}
            detail="глубокое сканирование или артефакт всевидения"
          />
          {canSeeHiddenRim && (
            <Milestone label="Финальный прорыв" done={victoryDone} detail="достигнуть дальнего рубежа" />
          )}
        </div>
      </Section>

      <Section title="Системы прогресса">
        <div className="grid gap-2">
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-[#888]">Исследования</span>
              <span className="text-[#667766]">{techDone}/{techTotal}</span>
            </div>
            <ProgressBar value={techDone} max={techTotal} color="#9933ff" />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-[#888]">Артефакты</span>
              <span className="text-[#667766]">
                {stats.discoveredArtifacts}/{artifacts.length}
              </span>
            </div>
            <ProgressBar value={stats.discoveredArtifacts} max={artifacts.length} color="#ff00ff" />
            <div className="mt-1 text-[10px] text-[#555]">
              изучено: {stats.researchedArtifacts}, активно: {stats.activeArtifacts}
            </div>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-[#888]">Локации</span>
              <span className="text-[#667766]">
                {stats.visitedLocations}/{stats.totalLocations}
              </span>
            </div>
            <ProgressBar value={stats.visitedLocations} max={stats.totalLocations} color="#00d4ff" />
            <div className="mt-1 text-[10px] text-[#555]">
              засчитываются открытые, посещённые и завершённые локации
            </div>
          </div>
        </div>
      </Section>

      <Section title="Задания">
        <div className="grid grid-cols-2 gap-2">
          <MetricCard
            label="Активные задания"
            value={String(activeContracts.length)}
            tone={activeContracts.length > 0 ? "warning" : "neutral"}
          />
          <MetricCard
            label="Завершённые"
            value={String(completedContractIds.length)}
            tone={completedContractIds.length > 0 ? "good" : "neutral"}
          />
        </div>
      </Section>
    </div>
  );
}
