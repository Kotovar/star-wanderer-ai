"use client";

import { useState } from "react";
import { useGameStore } from "../store";
import { GalaxyMap } from "./GalaxyMap";
import { SectorMap } from "./SectorMap";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";
import { calculateFuelCostForUI } from "@/game/slices/travel/helpers";

import { CombatPanel } from "./CombatPanel";
import { AssignmentsPanel } from "./AssignmentsPanel";
import { StationPanel } from "./StationPanel";
import { PlanetPanel } from "./PlanetPanel";
import { AnomalyPanel } from "./AnomalyPanel";
import { FriendlyShipPanel } from "./FriendlyShipPanel";
import { AsteroidBeltPanel } from "./AsteroidBeltPanel";
import { StormPanel } from "./StormPanel";
import { DistressSignalPanel } from "./DistressSignalPanel";
import { ArtifactPanel } from "./ArtifactPanel";
import { UnknownShipPanel } from "./UnknownShipPanel";
import { BattleResultsPanel } from "./BattleResultsPanel";
import { StormResultsPanel } from "./StormResultsPanel";
import { ResearchPanel } from "./ResearchPanel";
import { ReputationPanel } from "./ReputationPanel";
import { DerelictShipPanel } from "./DerelictShipPanel";
import { GasGiantPanel } from "./GasGiantPanel";
import { WreckFieldPanel } from "./WreckFieldPanel";
import { SpaceMonsterPanel } from "./SpaceMonsterPanel";
import { HostileApproachWarningPanel } from "./HostileApproachWarningPanel";
import { CrisisPanel } from "./CrisisPanel";
import { ActiveEffectsPanel } from "./panels/ActiveEffectsPanel";
import { RandomEventPanel } from "./RandomEventPanel";
import { RiskRewardPreview } from "./RiskRewardPreview";
import type { TravelEventType } from "@/game/types";
import { getActiveModule } from "@/game/modules";
import { RESEARCH_TREE } from "@/game/constants";
import { getTechTranslation } from "@/lib/techTranslations";

type PreviewItem = {
  label: string;
  value: string;
  tone: "danger" | "warning" | "good" | "neutral";
};

type Tone = PreviewItem["tone"];

// Тексты событий лежат в локалях под travel_events.<type>.*,
// здесь только не переводимые метаданные (тоны, топливо, наличие особого варианта)
const TRAVEL_EVENT_META: Record<
  TravelEventType,
  {
    riskTones: [Tone, Tone];
    cautiousTones: [Tone, Tone];
    cautiousFuelCost?: number;
    hasSpecial?: boolean;
    /** Префикс ключей улучшенного осторожного варианта (пилот/сканер/щиты) */
    cautiousOverride?: string;
  }
> = {
  asteroids: {
    riskTones: ["warning", "good"],
    cautiousTones: ["good", "warning"],
    cautiousFuelCost: 5,
    hasSpecial: true,
    cautiousOverride: "pilot",
  },
  anomaly: {
    riskTones: ["danger", "good"],
    cautiousTones: ["warning", "warning"],
    cautiousFuelCost: 5,
    hasSpecial: true,
  },
  stress: {
    riskTones: ["warning", "good"],
    cautiousTones: ["good", "warning"],
  },
  signal: {
    riskTones: ["neutral", "good"],
    cautiousTones: ["good", "neutral"],
    cautiousOverride: "scanner",
  },
  emp: {
    riskTones: ["danger", "good"],
    cautiousTones: ["warning", "good"],
    cautiousOverride: "shields",
  },
  trader: {
    riskTones: ["neutral", "good"],
    cautiousTones: ["good", "neutral"],
  },
};

function buildTravelEventItems(
  t: (key: string) => string,
  eventType: TravelEventType,
  prefix: string,
  tones: [Tone, Tone],
): PreviewItem[] {
  return tones.map((tone, idx) => ({
    label: t(`travel_events.${eventType}.${prefix}${idx + 1}_label`),
    value: t(`travel_events.${eventType}.${prefix}${idx + 1}_value`),
    tone,
  }));
}

export function EventDisplay() {
  const gameMode = useGameStore((s) => s.gameMode);
  const pendingRandomEvent = useGameStore((s) => s.pendingRandomEvent);
  const traveling = useGameStore((s) => s.traveling);
  const pendingTravelEvent = useGameStore((s) => s.pendingTravelEvent);
  const shipFuel = useGameStore((s) => s.ship.fuel);
  const shipShields = useGameStore((s) => s.ship.shields);
  const shipModules = useGameStore((s) => s.ship.modules);
  const crew = useGameStore((s) => s.crew);
  const showGalaxyMap = useGameStore((s) => s.showGalaxyMap);
  const showSectorMap = useGameStore((s) => s.showSectorMap);
  const showAssignments = useGameStore((s) => s.showAssignments);
  const skipTurn = useGameStore((s) => s.skipTurn);
  const currentSector = useGameStore((s) => s.currentSector);
  const emergencyJump = useGameStore((s) => s.emergencyJump);
  const resolveTravelEvent = useGameStore((s) => s.resolveTravelEvent);
  const activeResearch = useGameStore((s) => s.research.activeResearch);
  const getEffectiveScanRange = useGameStore((s) => s.getEffectiveScanRange);
  const isStuckInBlackHole = useGameStore((s) => {
    if (s.currentSector?.star?.type !== "blackhole") return false;
    const nonBH = s.galaxy.sectors.filter(
      (sec) => sec.star?.type !== "blackhole" && sec.id !== s.currentSector?.id,
    );
    if (nonBH.length === 0) return true;
    const minCost = Math.min(
      ...nonBH.map((sec) => calculateFuelCostForUI(s, sec.id).fuelCost),
    );
    return s.ship.fuel < minCost;
  });
  const { t, currentLanguage } = useTranslation();

  const [isSkipping, setIsSkipping] = useState(false);

  const handleSkipTurn = () => {
    setIsSkipping(true);
    skipTurn();
    setTimeout(() => setIsSkipping(false), 600);
  };

  if (pendingRandomEvent) {
    return <RandomEventPanel />;
  }

  // Traveling state
  if (traveling) {
    if (pendingTravelEvent) {
      const eventType = pendingTravelEvent.type;
      const meta = TRAVEL_EVENT_META[eventType];
      const eventKey = `travel_events.${eventType}`;
      const pilot = crew.find((c) => c.profession === "pilot");
      const cockpit = getActiveModule(shipModules, "cockpit");
      const hasPilotInCockpit =
        !!pilot && !!cockpit && pilot.moduleId === cockpit.id;
      const scanRange = getEffectiveScanRange();
      const cautiousOverride =
        meta.cautiousOverride &&
        ((eventType === "asteroids" && hasPilotInCockpit) ||
          (eventType === "signal" && scanRange >= 3) ||
          (eventType === "emp" && shipShields > 0))
          ? meta.cautiousOverride
          : undefined;
      const overrideActive = cautiousOverride !== undefined;
      const cautiousItems = cautiousOverride
        ? buildTravelEventItems(t, eventType, cautiousOverride, [
            "good",
            "good",
          ])
        : buildTravelEventItems(t, eventType, "cautious", meta.cautiousTones);
      const cautiousButton = cautiousOverride
        ? t(`${eventKey}.${cautiousOverride}_button`)
        : t(`${eventKey}.cautious_button`);
      const specialAvailable =
        (eventType === "asteroids" &&
          getActiveModule(shipModules, "drill") !== undefined) ||
        (eventType === "anomaly" &&
          getActiveModule(shipModules, "lab") !== undefined);
      const lacksFuel =
        !overrideActive &&
        meta.cautiousFuelCost !== undefined &&
        shipFuel < meta.cautiousFuelCost;

      return (
        <div className="flex flex-col gap-4">
          <div className="font-['Orbitron'] font-bold text-lg text-accent">
            ▸ {t("travel_events.title")}
          </div>
          <div className="border border-[#ffb00066] bg-[rgba(255,176,0,0.05)] p-4">
            <div className="font-['Orbitron'] text-base font-bold text-accent">
              {t(`${eventKey}.title`)}
            </div>
            <div className="mt-2 text-sm leading-relaxed text-[#888]">
              {t(`${eventKey}.description`)}
            </div>
          </div>
          <RiskRewardPreview
            title={t("travel_events.decision")}
            riskTitle={t("travel_events.risk_option")}
            rewardTitle={t("travel_events.cautious_option")}
            risks={buildTravelEventItems(t, eventType, "risk", meta.riskTones)}
            rewards={
              lacksFuel
                ? [
                    ...cautiousItems,
                    {
                      label: t("travel_events.availability"),
                      value: t("travel_events.no_fuel"),
                      tone: "danger",
                    },
                  ]
                : cautiousItems
            }
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              onClick={() => resolveTravelEvent("risk")}
              className="cursor-pointer bg-transparent border-2 border-[#ff4444] text-[#ff4444] hover:bg-[#ff4444] hover:text-white uppercase tracking-wider"
            >
              {t(`${eventKey}.risk_button`)}
            </Button>
            <Button
              onClick={() => resolveTravelEvent("cautious")}
              disabled={lacksFuel}
              className="cursor-pointer bg-transparent border-2 border-ring text-ring hover:bg-ring hover:text-[#050810] uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {cautiousButton}
            </Button>
          </div>
          {specialAvailable && meta.hasSpecial && (
            <div className="flex flex-col gap-1">
              <Button
                onClick={() => resolveTravelEvent("special")}
                className="cursor-pointer bg-transparent border-2 border-accent text-accent hover:bg-accent hover:text-[#050810] uppercase tracking-wider"
              >
                {t(`${eventKey}.special_button`)}
              </Button>
              <div className="text-xs text-[#888]">
                {t(`${eventKey}.special_hint`)}
              </div>
            </div>
          )}
          {lacksFuel && (
            <div className="text-xs text-[#ff4444]">
              {t("travel_events.no_fuel_hint")}
            </div>
          )}
        </div>
      );
    }

    const researchTech = activeResearch
      ? RESEARCH_TREE[activeResearch.techId]
      : null;
    const researchPercent =
      activeResearch && researchTech
        ? Math.min(
            100,
            Math.round(
              (activeResearch.progress / researchTech.scienceCost) * 100,
            ),
          )
        : 0;
    const busyCrew = crew.filter((c) => c.assignment).length;
    const damagedModules = shipModules.filter((m) => m.health < 100).length;

    return (
      <div className="flex flex-col gap-4">
        <div className="font-['Orbitron'] font-bold text-lg text-accent mb-4">
          ▸ {t("travel.title")}
        </div>
        <div className="text-sm leading-relaxed">
          {t("travel.heading")}{" "}
          <span className="text-accent">{traveling.destination.name}</span>
          <br />
          <br />
          {t("travel.turns_left")}:{" "}
          <span className="text-ring">{traveling.turnsLeft}</span>
          <span className="ml-2 text-xs text-[#888]">
            {traveling.route === "detour"
              ? t("travel_onboard.route_detour")
              : t("travel_onboard.route_direct")}
          </span>
        </div>
        <div className="border border-[#00ff4133] bg-[rgba(0,255,65,0.03)] p-3 text-xs leading-relaxed text-[#9aa59a]">
          <div className="font-['Orbitron'] text-[10px] font-bold uppercase tracking-wider text-[#00ff41]">
            {t("travel_onboard.title")}
          </div>
          <div className="mt-1">
            {activeResearch && researchTech
              ? t("travel_onboard.research", {
                  name: getTechTranslation(
                    activeResearch.techId,
                    currentLanguage,
                  ).name,
                  percent: researchPercent,
                })
              : t("travel_onboard.research_idle")}
          </div>
          <div>
            {busyCrew > 0
              ? t("travel_onboard.crew_busy", { count: busyCrew })
              : t("travel_onboard.crew_rest")}
          </div>
          <div>
            {damagedModules > 0
              ? t("travel_onboard.modules_damaged", { count: damagedModules })
              : t("travel_onboard.modules_ok")}
          </div>
        </div>
        <div className="flex gap-2.5 flex-wrap mt-5">
          <Button
            onClick={handleSkipTurn}
            disabled={isSkipping}
            className={`bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] cursor-pointer select-none ${
              isSkipping ? "scale-95 bg-[#00ff41] text-[#050810]" : ""
            }`}
          >
            {isSkipping
              ? `⏱️ ${t("travel.skipping")}`
              : t("galaxy.buttons.next_turn")}
          </Button>
        </div>
      </div>
    );
  }

  switch (gameMode) {
    case "galaxy_map":
      return (
        <div className="flex flex-col h-full">
          <div className="grid grid-cols-3 gap-1 shrink-0 mb-1">
            <Button
              onClick={showSectorMap}
              className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-[9px] py-1 px-1 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer select-none"
            >
              {t("galaxy.buttons.sector_map")}
            </Button>
            <Button
              onClick={showAssignments}
              className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-[9px] py-1 px-1 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer select-none"
            >
              {t("galaxy.buttons.crew_tasks")}
            </Button>
            <Button
              onClick={handleSkipTurn}
              disabled={isSkipping}
              className={`bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-[9px] py-1 px-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] cursor-pointer select-none ${
                isSkipping ? "scale-95 bg-[#00ff41] text-[#050810]" : ""
              }`}
            >
              {isSkipping ? "⏱️ " : ""}
              {t("galaxy.buttons.skip_turn")}
            </Button>
          </div>
          <div className="flex-1 relative min-h-0">
            <GalaxyMap />
          </div>
          <div className="text-[11px] text-center text-[#00ff41] h-6 flex items-center justify-center shrink-0">
            {t("galaxy.labels.click_sector")}
          </div>
        </div>
      );

    case "sector_map":
      return (
        <div className="flex flex-col h-full">
          <div className="grid grid-cols-3 gap-1 shrink-0 mb-1">
            <Button
              onClick={showGalaxyMap}
              className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-[9px] py-1 px-1 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer select-none"
            >
              {t("galaxy.buttons.galaxy_map")}
            </Button>
            <Button
              onClick={showAssignments}
              className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-[9px] py-1 px-1 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer select-none"
            >
              {t("galaxy.buttons.crew_tasks")}
            </Button>
            <Button
              onClick={handleSkipTurn}
              disabled={isSkipping}
              className={`cursor-pointer bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-[9px] py-1 px-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed select-none ${
                isSkipping ? "scale-95 bg-[#00ff41] text-[#050810]" : ""
              }`}
            >
              {isSkipping ? "⏱️ " : ""}
              {t("galaxy.buttons.skip_turn")}
            </Button>
          </div>
          <div className="flex-1 relative min-h-0">
            <SectorMap />
          </div>
          {currentSector?.star?.type === "blackhole" ? (
            <div className="text-[11px] text-center h-6 flex items-center justify-center shrink-0">
              <span className="text-[#ff00ff] font-bold">
                {t("galaxy.black_hole.title")}
              </span>
              <span className="text-accent ml-1">
                — {t("galaxy.black_hole.hint")}
              </span>
              {isStuckInBlackHole && (
                <button
                  onClick={emergencyJump}
                  className="cursor-pointer bg-[rgba(255,50,50,0.2)] border border-[#ff3232] text-[#ff3232] px-3 text-xs font-bold hover:bg-[rgba(255,50,50,0.4)] transition-colors ml-2"
                >
                  {t("galaxy.black_hole.emergency_jump")}
                </button>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-center text-[#00ff41] h-6 flex items-center justify-center shrink-0">
              {t("galaxy.labels.click_object")}
            </div>
          )}
        </div>
      );

    case "station":
      return <StationPanel />;

    case "planet":
      return <PlanetPanel />;

    case "combat":
      return <CombatPanel />;

    case "anomaly":
      return <AnomalyPanel />;

    case "friendly_ship":
      return <FriendlyShipPanel />;

    case "asteroid_belt":
      return <AsteroidBeltPanel />;

    case "storm":
      return <StormPanel />;

    case "distress_signal":
      return <DistressSignalPanel />;

    case "derelict_ship":
      return <DerelictShipPanel />;

    case "gas_giant":
      return <GasGiantPanel />;

    case "wreck_field":
      return <WreckFieldPanel />;

    case "space_monster":
      return <SpaceMonsterPanel />;

    case "hostile_approach_warning":
      return <HostileApproachWarningPanel />;

    case "artifacts":
      return <ArtifactPanel />;

    case "effects":
      return <ActiveEffectsPanel />;

    case "unknown_ship":
      return <UnknownShipPanel />;

    case "battle_results":
      return <BattleResultsPanel />;

    case "storm_results":
      return <StormResultsPanel />;

    case "assignments":
      return <AssignmentsPanel />;

    case "research":
      return <ResearchPanel />;

    case "reputation":
      return <ReputationPanel />;

    case "crises":
      return <CrisisPanel />;

    default:
      return null;
  }
}
