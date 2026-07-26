"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getBossCombatModules } from "@/game/bosses";
import { CombatShipVisual } from "@/game/components/CombatShipVisual";
import { GameDialogContent } from "@/game/components/GameDialog";
import { ANCIENT_BOSSES } from "@/game/constants/bosses";
import { AUGMENTATIONS } from "@/game/constants/augmentations";
import {
  ANCIENT_BOSS_CODEX_ENTRY,
  ENEMY_CODEX_SHIP_ENTRIES,
  getBossCodexId,
} from "@/game/constants/enemyCodex";
import {
  SPACE_MONSTERS,
  type SpaceMonsterDefinition,
} from "@/game/constants/spaceMonsters";
import { STATION_CONFIG } from "@/game/galaxy/config";
import { STATION_TYPES } from "@/game/galaxy/consts";
import {
  calculateShieldsFromModules,
  ENEMY_TYPE_MODIFIERS,
  generateEnemyModules,
} from "@/game/slices/combat/helpers/combatSetup";
import { useGameStore } from "@/game/store";
import type { AugmentationRarity } from "@/game/types/augmentations";
import type {
  AncientBoss,
  EnemyModule,
  EnemyShip,
  EnemyStats,
  SpaceMonsterType,
  StationName,
} from "@/game/types";
import { useTranslation } from "@/lib/useTranslation";
import {
  getStationRateValue,
  getStationRates,
  getStationServiceKeys,
  STATION_DISCOVERY_ICONS,
} from "@/game/stations/discovery";

const CODEX_PREVIEW_THREAT = 2;
const EMPTY_CREW: [] = [];

type CombatPreview = {
  id: string;
  icon: string;
  name: string;
  profileTitle: string;
  profileHint: string;
  modules: EnemyModule[];
  shields: number;
  isBoss?: boolean;
  specialAbility?: { name: string; description: string };
};

type CatalogSection = "ships" | "stations" | "augmentations";

const AUGMENTATION_CODEX_STYLES: Record<AugmentationRarity, string> = {
  common: "border-[#94a3b866] bg-[rgba(148,163,184,0.06)]",
  uncommon: "border-[#00ff4166] bg-[rgba(0,255,65,0.05)]",
  rare: "border-[#00d4ff66] bg-[rgba(0,212,255,0.06)]",
  legendary: "border-[#ffb00077] bg-[rgba(255,176,0,0.07)]",
};

function getBossDisplay(name: string) {
  const [icon, ...nameParts] = name.split(/\s+/);
  return nameParts.length > 0
    ? { icon, name: nameParts.join(" ") }
    : { icon: "⚙️", name };
}

/** Переводит пассивный boss-module эффект существа в читаемую способность для карточки боя. */
function getModuleEffectAbility(
  moduleEffect: SpaceMonsterDefinition["moduleEffect"],
  t: (key: string, params?: Record<string, string | number>) => string,
): { name: string; description: string } {
  return {
    name: t(`enemy_codex.module_effects.${moduleEffect.type}.name`),
    description: t(`enemy_codex.module_effects.${moduleEffect.type}.description`, {
      value: moduleEffect.value,
    }),
  };
}

type CodexCardProps = {
  known: boolean;
  icon: string;
  name: string;
  description: string;
  details?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  actionLabel?: string;
};

function CodexCard({
  known,
  icon,
  name,
  description,
  details,
  selected = false,
  onClick,
  actionLabel,
}: CodexCardProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!onClick || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    onClick();
  };

  return (
    <article
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-haspopup={onClick ? "dialog" : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      title={onClick ? actionLabel : undefined}
      className={`border p-3 ${
        known
          ? selected
            ? "border-ring bg-[rgba(0,212,255,0.1)]"
            : "border-[#00d4ff55] bg-[rgba(0,212,255,0.04)]"
          : "border-[#303840] bg-[rgba(0,0,0,0.18)]"
      } ${
        onClick
          ? "cursor-pointer transition-colors hover:border-ring hover:bg-[rgba(0,212,255,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`grid h-10 w-10 shrink-0 place-items-center border text-xl ${
            known
              ? "border-[#00d4ff66] bg-[rgba(0,212,255,0.08)]"
              : "border-[#444] bg-[#0a0e13] text-[#667]"
          }`}
        >
          {known ? icon : "?"}
        </div>
        <div className="min-w-0">
          <div
            className={`font-['Orbitron'] text-sm font-bold ${
              known ? "text-[#d7f8ff]" : "text-[#75808a]"
            }`}
          >
            {name}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[#8fa0aa]">
            {description}
          </p>
        </div>
      </div>
      {onClick && actionLabel && (
        <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-ring">
          ▸ {actionLabel}
        </div>
      )}
      {known && details && <div className="mt-3">{details}</div>}
    </article>
  );
}

function StationCodexCard({ stationType }: { stationType: StationName }) {
  const { t } = useTranslation();
  const config = STATION_CONFIG[stationType];
  const rates = getStationRates(config);
  const guaranteedRows = [
    {
      label: t("station_catalog.crew"),
      values:
        config.guaranteedProfessions?.map((profession) =>
          t(`professions.${profession}`),
        ) ?? [],
    },
    {
      label: t("station_catalog.modules"),
      values: config.guaranteedModules.map((module) =>
        t(`module_names.${module}`),
      ),
    },
    {
      label: t("station_catalog.weapons"),
      values: config.guaranteedWeapons.map((weapon) =>
        t(`weapon_types.${weapon}`),
      ),
    },
  ];
  const services = getStationServiceKeys(stationType, config).map((service) =>
    t(`station_discovery.service_${service}`),
  );

  return (
    <article className="border border-[#00d4ff55] bg-[rgba(0,212,255,0.04)] p-3">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center border border-[#00d4ff66] bg-[rgba(0,212,255,0.08)] text-xl">
          {STATION_DISCOVERY_ICONS[stationType]}
        </div>
        <div>
          <h2 className="font-['Orbitron'] text-sm font-bold text-[#d7f8ff]">
            {t(`locations.station_types.${stationType}`)}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[#8fa0aa]">
            {t(`station_catalog.summary.${stationType}`)}
          </p>
        </div>
      </div>

      {rates.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-px border border-[#00d4ff33] bg-[#00d4ff33]">
          {rates.map((rate) => (
            <div key={rate.key} className="bg-[#071019] px-2 py-1.5">
              <div
                className={`font-['Orbitron'] text-sm font-bold ${
                  rate.kind === "discount" ? "text-[#00ff41]" : "text-[#ffb000]"
                }`}
              >
                {getStationRateValue(rate)}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-[#8fa3aa]">
                {t(`station_discovery.rate_${rate.key}`)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 border-y border-[#00ff4133] py-2">
        {guaranteedRows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[5.25rem_1fr] gap-2 py-1 text-xs"
          >
            <div className="text-[10px] font-bold uppercase tracking-wide text-[#8fa3aa]">
              {row.label}
            </div>
            <div className="text-[#b8dfc2]">
              {row.values.length > 0
                ? row.values.join(" · ")
                : t("station_catalog.no_guarantees")}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {services.map((service) => (
          <span
            key={service}
            className="border border-[#ffb00055] bg-[rgba(255,176,0,0.07)] px-1.5 py-0.5 text-[10px] text-[#ffd27a]"
          >
            {service}
          </span>
        ))}
      </div>
    </article>
  );
}

function EnemyCombatCard({
  preview,
  onClose,
}: {
  preview: CombatPreview;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const totalHull = preview.modules.reduce(
    (sum, module) => sum + module.health,
    0,
  );
  const totalDamage = preview.modules.reduce(
    (sum, module) => sum + (module.damage ?? 0),
    0,
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <GameDialogContent
        variant="danger"
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto p-3"
      >
        <DialogHeader className="gap-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="font-['Orbitron'] text-sm font-bold uppercase tracking-[0.14em] text-[#ff8da2]">
                {preview.profileTitle}
              </DialogTitle>
              <div className="mt-1 text-sm font-bold text-[#ffd6de]">
                {preview.icon} {preview.name}
              </div>
              <DialogDescription className="mt-1 text-[11px] leading-relaxed text-[#c48d98]">
                {preview.profileHint}
              </DialogDescription>
            </div>
            <Button
              onClick={onClose}
              className="cursor-pointer border border-[#ff668055] bg-transparent text-[#ff9aae] hover:bg-[#ff6680] hover:text-[#050810]"
            >
              × {t("enemy_codex.close_combat_card")}
            </Button>
          </div>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="space-y-2">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(5.5rem,1fr))] gap-2 text-xs">
              {([
                ["enemy_codex.combat_stats.modules", preview.modules.length],
                ["enemy_codex.combat_stats.hull", totalHull],
                ["enemy_codex.combat_stats.damage", totalDamage],
                ["enemy_codex.combat_stats.shields", preview.shields],
              ] as [string, number][]).map(([label, value]) => (
                <div
                  key={label}
                  className="border border-[#ff668044] bg-[rgba(0,0,0,0.2)] p-2"
                >
                  <div className="text-[10px] uppercase tracking-[0.1em] text-[#bb7584]">
                    {t(label)}
                  </div>
                  <div className="mt-1 font-['Orbitron'] text-base font-bold text-[#ffd6de]">
                    {value}
                  </div>
                </div>
              ))}
            </div>
            {preview.specialAbility && (
              <div className="border border-[#ff668044] bg-[rgba(0,0,0,0.2)] p-2 text-xs">
                <div className="text-[10px] uppercase tracking-[0.1em] text-[#bb7584]">
                  {t("enemy_codex.boss_ability")}
                </div>
                <div className="mt-1 font-bold text-[#ffd6de]">
                  {preview.specialAbility.name}
                </div>
                <p className="mt-1 leading-relaxed text-[#c48d98]">
                  {preview.specialAbility.description}
                </p>
              </div>
            )}
          </div>
          <CombatShipVisual
            modules={preview.modules}
            crew={EMPTY_CREW}
            isEnemy={true}
            isBoss={preview.isBoss}
            title=""
            shields={preview.shields}
          />
        </div>
      </GameDialogContent>
    </Dialog>
  );
}

export function EnemyCodexPanel() {
  const discoveredIds = useGameStore((s) => s.discoveredEnemyCodexIds);
  const discoveredStationTypes = useGameStore(
    (s) => s.discoveredStationTypes ?? [],
  );
  const discoveredAugmentationIds = useGameStore(
    (s) => s.discoveredAugmentationIds ?? [],
  );
  const showSectorMap = useGameStore((s) => s.showSectorMap);
  const { t } = useTranslation();
  const [combatPreview, setCombatPreview] = useState<CombatPreview | null>(
    null,
  );
  const [catalogSection, setCatalogSection] =
    useState<CatalogSection>("ships");
  const knownIds = new Set(discoveredIds);
  const knownStationTypes = STATION_TYPES.filter((stationType) =>
    discoveredStationTypes.includes(stationType),
  );
  const knownAugmentations = Object.values(AUGMENTATIONS).filter(
    (augmentation) => discoveredAugmentationIds.includes(augmentation.id),
  );
  const creatureEntries = Object.entries(SPACE_MONSTERS) as [
    SpaceMonsterType,
    SpaceMonsterDefinition,
  ][];
  const ancientBossKnown = knownIds.has(ANCIENT_BOSS_CODEX_ENTRY.id);
  const legacyBoss = ANCIENT_BOSSES[0];
  const totalEntries =
    ENEMY_CODEX_SHIP_ENTRIES.length +
    creatureEntries.length +
    ANCIENT_BOSSES.length +
    (ancientBossKnown && legacyBoss ? 1 : 0);
  const foundEntries = [
    ...ENEMY_CODEX_SHIP_ENTRIES.map((entry) => entry.id),
    ...creatureEntries.map(([type]) => `space_monster:${type}`),
    ...ANCIENT_BOSSES.map((boss) => getBossCodexId(boss.id)),
    ...(ancientBossKnown && legacyBoss ? [ANCIENT_BOSS_CODEX_ENTRY.id] : []),
  ].filter((id) => knownIds.has(id)).length;
  const unknownName = t("enemy_codex.unknown_name");
  const unknownDescription = t("enemy_codex.unknown_description");
  const statSummary = (stats: EnemyStats) => [
    t("enemy_codex.stats.health", {
      value: Math.round(stats.healthMod * 100),
    }),
    t("enemy_codex.stats.damage", {
      value: Math.round(stats.damageMod * 100),
    }),
    t("enemy_codex.stats.loot", { value: Math.round(stats.lootMod * 100) }),
    ...(stats.shieldMod > 0
      ? [t("enemy_codex.stats.shields", { value: stats.shieldMod })]
      : []),
    ...(stats.weaponCountMod !== 0
      ? [
          t("enemy_codex.stats.weapons", {
            value: stats.weaponCountMod,
          }),
        ]
      : []),
  ];
  const toggleCombatPreview = (preview: CombatPreview) => {
    setCombatPreview((current) =>
      current?.id === preview.id ? null : preview,
    );
  };
  const handleCatalogSectionChange = (section: string) => {
    if (
      section !== "ships" &&
      section !== "stations" &&
      section !== "augmentations"
    )
      return;
    setCatalogSection(section);
    setCombatPreview(null);
  };
  const showGeneratedCombatPreview = (
    id: string,
    icon: string,
    nameKey: string,
    enemyType: EnemyShip,
    moduleEffect?: SpaceMonsterDefinition["moduleEffect"],
  ) => {
    const modules = generateEnemyModules(
      CODEX_PREVIEW_THREAT,
      enemyType,
      moduleEffect,
    );
    toggleCombatPreview({
      id,
      icon,
      name: t(nameKey),
      profileTitle: t("enemy_codex.combat_profile", {
        threat: CODEX_PREVIEW_THREAT,
      }),
      profileHint: t("enemy_codex.combat_profile_hint"),
      modules,
      shields: calculateShieldsFromModules(modules).maxShields,
      specialAbility: moduleEffect
        ? getModuleEffectAbility(moduleEffect, t)
        : undefined,
    });
  };
  const createBossPreview = (
    boss: AncientBoss,
    id: string = getBossCodexId(boss.id),
    profileTitle = t("enemy_codex.boss_profile", { tier: boss.tier }),
    profileHint = boss.description,
    display = getBossDisplay(boss.name),
  ): CombatPreview => {
    const modules = getBossCombatModules(boss);
    const { maxShields } = calculateShieldsFromModules(modules);

    return {
      id,
      ...display,
      profileTitle,
      profileHint,
      modules,
      shields: maxShields > 0 ? maxShields : boss.shields,
      isBoss: true,
      specialAbility: boss.specialAbility,
    };
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-2 text-[#d7ffe0]">
      <div className="flex items-start justify-between gap-3 border-b border-[#00d4ff44] pb-3">
        <div>
          <div className="font-['Orbitron'] text-lg font-bold uppercase tracking-[0.14em] text-ring">
            {t("enemy_codex.title")}
          </div>
          <div className="mt-1 text-xs text-[#888]">
            {catalogSection === "ships"
              ? t("enemy_codex.ships_subtitle")
              : catalogSection === "stations"
                ? t("station_catalog.subtitle")
                : t("enemy_codex.augmentations_subtitle")}
          </div>
        </div>
        <Button
          onClick={showSectorMap}
          className="cursor-pointer border border-[#00ff41] bg-transparent text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810]"
        >
          {t("common.back_to_map")}
        </Button>
      </div>

      <Tabs
        value={catalogSection}
        onValueChange={handleCatalogSectionChange}
        className="min-h-0"
      >
        <TabsList className="w-full border border-[#00d4ff44] bg-[rgba(0,212,255,0.04)]">
          <TabsTrigger
            value="ships"
            className="flex-1 cursor-pointer text-xs text-[#8fa0aa] data-[state=active]:bg-[#00d4ff] data-[state=active]:text-[#050810]"
          >
            {t("enemy_codex.tabs.ships")}
          </TabsTrigger>
          <TabsTrigger
            value="stations"
            className="flex-1 cursor-pointer text-xs text-[#8fa0aa] data-[state=active]:bg-[#00d4ff] data-[state=active]:text-[#050810]"
          >
            {t("enemy_codex.tabs.stations")}
          </TabsTrigger>
          <TabsTrigger
            value="augmentations"
            className="flex-1 cursor-pointer text-xs text-[#8fa0aa] data-[state=active]:bg-[#00d4ff] data-[state=active]:text-[#050810]"
          >
            {t("enemy_codex.tabs.augmentations")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ships" className="mt-4 space-y-4">
          <div className="border border-[#00d4ff44] bg-[rgba(0,212,255,0.04)] px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#a8eaff]">
        {t("enemy_codex.progress", {
          found: foundEntries,
          total: totalEntries,
        })}
          </div>

      <section>
        <h2 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#65cce5]">
          {t("enemy_codex.sections.ships")}
        </h2>
        <div className="grid gap-2 lg:grid-cols-2">
          {ENEMY_CODEX_SHIP_ENTRIES.map((entry) => {
            const known = knownIds.has(entry.id);
            return (
              <CodexCard
                key={entry.id}
                known={known}
                icon={entry.icon}
                name={known ? t(entry.nameKey) : unknownName}
                description={
                  known ? t(entry.descriptionKey) : unknownDescription
                }
                selected={combatPreview?.id === entry.id}
                onClick={
                  known
                    ? () =>
                        showGeneratedCombatPreview(
                          entry.id,
                          entry.icon,
                          entry.nameKey,
                          entry.id,
                        )
                    : undefined
                }
                actionLabel={known ? t("enemy_codex.details") : undefined}
                details={
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap gap-1">
                      {statSummary(ENEMY_TYPE_MODIFIERS[entry.id]).map((stat) => (
                        <span
                          key={stat}
                          className="border border-[#00d4ff33] bg-[rgba(0,0,0,0.2)] px-1.5 py-0.5 text-[10px] text-[#9edfeb]"
                        >
                          {stat}
                        </span>
                      ))}
                    </div>
                    <div className="text-[11px] italic leading-relaxed text-[#748092]">
                      {t(entry.loreKey)}
                    </div>
                  </div>
                }
              />
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#65cce5]">
          {t("enemy_codex.sections.creatures")}
        </h2>
        <div className="grid gap-2 lg:grid-cols-2">
          {creatureEntries.map(([type, creature]) => {
            const id = `space_monster:${type}`;
            const known = knownIds.has(id);
            return (
              <CodexCard
                key={type}
                known={known}
                icon={creature.icon}
                name={known ? t(creature.nameKey) : unknownName}
                description={
                  known ? t(creature.descriptionKey) : unknownDescription
                }
                selected={combatPreview?.id === id}
                onClick={
                  known
                    ? () =>
                        showGeneratedCombatPreview(
                          id,
                          creature.icon,
                          creature.nameKey,
                          "space_monster",
                          creature.moduleEffect,
                        )
                    : undefined
                }
                actionLabel={known ? t("enemy_codex.details") : undefined}
                details={
                  <div className="space-y-1.5">
                    <div className="border-l-2 border-[#00d4ff66] pl-2 text-[11px] leading-relaxed text-[#8fa0aa]">
                      {t(creature.behaviorKey)}
                    </div>
                    <div className="border-l-2 border-[#33405577] pl-2 text-[11px] italic leading-relaxed text-[#748092]">
                      {t(creature.loreKey)}
                    </div>
                  </div>
                }
              />
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#65cce5]">
          {t("enemy_codex.sections.ancients")}
        </h2>
        <div className="grid gap-2 lg:grid-cols-2">
          {ancientBossKnown && legacyBoss && (
            <CodexCard
              known={true}
              icon={ANCIENT_BOSS_CODEX_ENTRY.icon}
              name={t(ANCIENT_BOSS_CODEX_ENTRY.nameKey)}
              description={t(ANCIENT_BOSS_CODEX_ENTRY.descriptionKey)}
              selected={combatPreview?.id === ANCIENT_BOSS_CODEX_ENTRY.id}
              onClick={() =>
                toggleCombatPreview(
                  createBossPreview(
                    legacyBoss,
                    ANCIENT_BOSS_CODEX_ENTRY.id,
                    t("enemy_codex.legacy_boss_profile"),
                    t("enemy_codex.legacy_boss_profile_hint"),
                    {
                      icon: ANCIENT_BOSS_CODEX_ENTRY.icon,
                      name: t(ANCIENT_BOSS_CODEX_ENTRY.nameKey),
                    },
                  ),
                )
              }
              actionLabel={t("enemy_codex.details")}
            />
          )}
          {ANCIENT_BOSSES.map((boss) => {
            const id = getBossCodexId(boss.id);
            const known = knownIds.has(id);
            const display = getBossDisplay(boss.name);
            return (
              <CodexCard
                key={boss.id}
                known={known}
                icon={display.icon}
                name={known ? display.name : unknownName}
                description={known ? boss.description : unknownDescription}
                selected={combatPreview?.id === id}
                onClick={
                  known
                    ? () => toggleCombatPreview(createBossPreview(boss))
                    : undefined
                }
                actionLabel={known ? t("enemy_codex.details") : undefined}
                details={
                  known ? (
                    <div className="border-l-2 border-[#00d4ff66] pl-2 text-[11px] italic leading-relaxed text-[#8fa0aa]">
                      {boss.lore}
                    </div>
                  ) : undefined
                }
              />
            );
          })}
        </div>
      </section>

      {combatPreview && (
        <EnemyCombatCard
          preview={combatPreview}
          onClose={() => setCombatPreview(null)}
        />
      )}
        </TabsContent>

        <TabsContent value="stations" className="mt-4 space-y-3">
          <div className="border border-[#00d4ff44] bg-[rgba(0,212,255,0.04)] px-3 py-2 text-xs text-[#a8eaff]">
            {t("station_catalog.hint")}
          </div>
          {knownStationTypes.length > 0 ? (
            <div className="grid gap-2 lg:grid-cols-2">
              {knownStationTypes.map((stationType) => (
                <StationCodexCard
                  key={stationType}
                  stationType={stationType}
                />
              ))}
            </div>
          ) : (
            <div className="border border-[#303840] bg-[rgba(0,0,0,0.18)] px-3 py-5 text-center text-sm text-[#8fa0aa]">
              {t("station_catalog.empty")}
            </div>
          )}
        </TabsContent>

        <TabsContent value="augmentations" className="mt-4 space-y-3">
          <div className="border border-[#00d4ff44] bg-[rgba(0,212,255,0.04)] px-3 py-2 text-xs text-[#a8eaff]">
            {t("enemy_codex.augmentation_progress", {
              found: knownAugmentations.length,
              total: Object.keys(AUGMENTATIONS).length,
            })}
          </div>
          {knownAugmentations.length > 0 ? (
            <div className="grid gap-2 lg:grid-cols-2">
              {knownAugmentations.map((augmentation) => (
                <article
                  key={augmentation.id}
                  className={`border p-3 ${AUGMENTATION_CODEX_STYLES[augmentation.rarity]}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center border border-[#00d4ff66] bg-[rgba(0,0,0,0.2)] text-xl">
                      {augmentation.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-[#d7ffe0]">
                        {t(`augmentations.${augmentation.id}.name`)}
                      </div>
                      <div className="mt-0.5 text-[10px] font-bold text-[#ffb000]">
                        {t(`augmentations.rarity.${augmentation.rarity}`)}
                      </div>
                      <div className="mt-1 text-xs text-[#8fa0aa]">
                        {t(`augmentations.${augmentation.id}.description`)}
                      </div>
                      <div className="mt-2 text-[10px] text-[#65cce5]">
                        {augmentation.forProfession
                          ? t(`professions.${augmentation.forProfession}`)
                          : t(`races.${augmentation.forRace}.name`)}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="border border-[#303840] bg-[rgba(0,0,0,0.18)] px-3 py-5 text-center text-sm text-[#8fa0aa]">
              {t("enemy_codex.augmentation_empty")}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
