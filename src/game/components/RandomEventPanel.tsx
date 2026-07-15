"use client";

import { Button } from "@/components/ui/button";
import { canUseRandomEventChoice } from "@/game/slices/gameLoop/processors/processRandomEvents";
import { useGameStore } from "@/game/store";
import type { PendingRandomEvent, RandomEventChoiceId } from "@/game/types";
import { getModuleTranslation } from "@/lib/moduleTranslations";
import { useTranslation } from "@/lib/useTranslation";
import { useShallow } from "zustand/react/shallow";

interface ChoiceView {
  id: RandomEventChoiceId;
  icon: string;
  label: string;
  description: string;
  outcome: string;
  available: boolean;
  requirement?: string;
}

type Translate = (
  key: string,
  params?: Record<string, string | number>,
) => string;

const EVENT_ACCENTS: Record<PendingRandomEvent["type"], string> = {
  storm: "#00d4ff",
  capsule: "#ffb000",
  virus: "#ff0040",
  fuel_leak: "#c040ff",
  crew_dispute: "#ff7a00",
  biohazard: "#00ff88",
  meteor_shower: "#ff4444",
  pirate_raid: "#ff8800",
  distress_signal: "#00aaff",
  trader: "#88ff00",
  derelict: "#aaaaff",
  ancient_signal: "#dd44ff",
  research_breakthrough: "#00ffaa",
  artifact_resonance: "#ff44dd",
  consequence: "#ffb000",
};

const EVENT_ICONS: Record<PendingRandomEvent["type"], string> = {
  storm: "ϟ",
  capsule: "◈",
  virus: "☣",
  fuel_leak: "◒",
  crew_dispute: "◐",
  biohazard: "☄",
  meteor_shower: "✦",
  pirate_raid: "☠",
  distress_signal: "SOS",
  trader: "⚖",
  derelict: "⌖",
  ancient_signal: "⟁",
  research_breakthrough: "⚛",
  artifact_resonance: "✶",
  consequence: "◆",
};

function buildEventView(
  event: PendingRandomEvent,
  state: Pick<ReturnType<typeof useGameStore.getState>, "crew" | "ship">,
  t: Translate,
  currentLanguage: "ru" | "en",
): { description: string; choices: ChoiceView[] } {
  const isAvailable = (choice: RandomEventChoiceId) =>
    canUseRandomEventChoice(state, event, choice);

  switch (event.type) {
    case "storm": {
      const targetModule = state.ship.modules.find(
        (module) => module.id === event.targetModuleId,
      );
      return {
        description: t("random_events.storm.description", {
          damage: event.damage,
          module: targetModule
            ? getModuleTranslation(targetModule.type, currentLanguage).name
            : t("random_events.unknown_module"),
        }),
        choices: [
          {
            id: "specialist",
            icon: "◢",
            label: t("random_events.storm.pilot.label"),
            description: t("random_events.storm.pilot.description"),
            outcome: t("random_events.storm.pilot.outcome", {
              damage: Math.max(1, Math.ceil(event.damage * 0.35)),
            }),
            available: isAvailable("specialist"),
            requirement: t("random_events.storm.pilot.requirement"),
          },
          {
            id: "systems",
            icon: "⬡",
            label: t("random_events.storm.shields.label"),
            description: t("random_events.storm.shields.description"),
            outcome: t("random_events.storm.shields.outcome", {
              absorbed: Math.min(state.ship.shields, event.damage),
              damage: Math.max(0, event.damage - state.ship.shields),
            }),
            available: isAvailable("systems"),
            requirement: t("random_events.storm.shields.requirement"),
          },
          {
            id: "standard",
            icon: "▦",
            label: t("random_events.storm.standard.label"),
            description: t("random_events.storm.standard.description"),
            outcome: t("random_events.storm.standard.outcome", {
              damage: event.damage,
            }),
            available: true,
          },
        ],
      };
    }
    case "capsule":
      return {
        description: t("random_events.capsule.description", {
          reward: event.reward,
        }),
        choices: [
          {
            id: "specialist",
            icon: "⌬",
            label: t("random_events.capsule.science.label"),
            description: t("random_events.capsule.science.description"),
            outcome: t("random_events.capsule.science.outcome"),
            available: isAvailable("specialist"),
            requirement: t("random_events.capsule.science.requirement"),
          },
          {
            id: "systems",
            icon: "⚙",
            label: t("random_events.capsule.salvage.label"),
            description: t("random_events.capsule.salvage.description"),
            outcome: t("random_events.capsule.salvage.outcome"),
            available: isAvailable("systems"),
            requirement: t("random_events.capsule.salvage.requirement"),
          },
          {
            id: "standard",
            icon: "₢",
            label: t("random_events.capsule.standard.label"),
            description: t("random_events.capsule.standard.description"),
            outcome: t("random_events.capsule.standard.outcome", {
              reward: event.reward,
            }),
            available: true,
          },
        ],
      };
    case "virus":
      return {
        description: t("random_events.virus.description", {
          penalty: event.happinessPenalty,
        }),
        choices: [
          {
            id: "specialist",
            icon: "✚",
            label: t("random_events.virus.medic.label"),
            description: t("random_events.virus.medic.description"),
            outcome: t("random_events.virus.medic.outcome"),
            available: isAvailable("specialist"),
            requirement: t("random_events.virus.medic.requirement"),
          },
          {
            id: "systems",
            icon: "◇",
            label: t("random_events.virus.purge.label"),
            description: t("random_events.virus.purge.description"),
            outcome: t("random_events.virus.purge.outcome"),
            available: isAvailable("systems"),
            requirement: t("random_events.virus.purge.requirement"),
          },
          {
            id: "standard",
            icon: "▣",
            label: t("random_events.virus.standard.label"),
            description: t("random_events.virus.standard.description"),
            outcome: t("random_events.virus.standard.outcome", {
              penalty: event.happinessPenalty,
            }),
            available: true,
          },
        ],
      };
    case "fuel_leak":
      return {
        description: t("random_events.fuel_leak.description", {
          loss: event.fuelLoss,
        }),
        choices: [
          {
            id: "specialist",
            icon: "⚒",
            label: t("random_events.fuel_leak.engineer.label"),
            description: t("random_events.fuel_leak.engineer.description"),
            outcome: t("random_events.fuel_leak.engineer.outcome", {
              loss: Math.max(1, Math.ceil(event.fuelLoss * 0.25)),
            }),
            available: isAvailable("specialist"),
            requirement: t("random_events.fuel_leak.engineer.requirement"),
          },
          {
            id: "systems",
            icon: "⌁",
            label: t("random_events.fuel_leak.drones.label"),
            description: t("random_events.fuel_leak.drones.description"),
            outcome: t("random_events.fuel_leak.drones.outcome"),
            available: isAvailable("systems"),
            requirement: t("random_events.fuel_leak.drones.requirement"),
          },
          {
            id: "standard",
            icon: "◫",
            label: t("random_events.fuel_leak.standard.label"),
            description: t("random_events.fuel_leak.standard.description"),
            outcome: t("random_events.fuel_leak.standard.outcome", {
              loss: event.fuelLoss,
            }),
            available: true,
          },
        ],
      };
    case "crew_dispute":
      return {
        description: t("random_events.crew_dispute.description", {
          penalty: event.happinessPenalty,
        }),
        choices: [
          {
            id: "specialist",
            icon: "★",
            label: t("random_events.crew_dispute.captain.label"),
            description: t("random_events.crew_dispute.captain.description"),
            outcome: t("random_events.crew_dispute.captain.outcome"),
            available: isAvailable("specialist"),
            requirement: t("random_events.crew_dispute.captain.requirement"),
          },
          {
            id: "systems",
            icon: "⌂",
            label: t("random_events.crew_dispute.quarters.label"),
            description: t("random_events.crew_dispute.quarters.description"),
            outcome: t("random_events.crew_dispute.quarters.outcome"),
            available: isAvailable("systems"),
            requirement: t("random_events.crew_dispute.quarters.requirement"),
          },
          {
            id: "standard",
            icon: "⚖",
            label: t("random_events.crew_dispute.standard.label"),
            description: t("random_events.crew_dispute.standard.description"),
            outcome: t("random_events.crew_dispute.standard.outcome", {
              penalty: event.happinessPenalty,
            }),
            available: true,
          },
        ],
      };
    case "biohazard":
      return {
        description: t("random_events.biohazard.description", {
          damage: event.crewDamage,
        }),
        choices: [
          {
            id: "specialist",
            icon: "✚",
            label: t("random_events.biohazard.medic.label"),
            description: t("random_events.biohazard.medic.description"),
            outcome: t("random_events.biohazard.medic.outcome", {
              damage: Math.ceil(event.crewDamage * 0.3),
            }),
            available: isAvailable("specialist"),
            requirement: t("random_events.biohazard.medic.requirement"),
          },
          {
            id: "systems",
            icon: "🌿",
            label: t("random_events.biohazard.filters.label"),
            description: t("random_events.biohazard.filters.description"),
            outcome: t("random_events.biohazard.filters.outcome"),
            available: isAvailable("systems"),
            requirement: t("random_events.biohazard.filters.requirement"),
          },
          {
            id: "standard",
            icon: "▣",
            label: t("random_events.biohazard.standard.label"),
            description: t("random_events.biohazard.standard.description"),
            outcome: t("random_events.biohazard.standard.outcome", {
              damage: event.crewDamage,
            }),
            available: true,
          },
        ],
      };
    case "meteor_shower": {
      const targetModule = state.ship.modules.find(
        (module) => module.id === event.targetModuleId,
      );
      return {
        description: t("random_events.meteor_shower.description", {
          damage: event.damage,
          module: targetModule
            ? getModuleTranslation(targetModule.type, currentLanguage).name
            : t("random_events.unknown_module"),
        }),
        choices: [
          {
            id: "specialist",
            icon: "⚒",
            label: t("random_events.meteor_shower.engineer.label"),
            description: t("random_events.meteor_shower.engineer.description"),
            outcome: t("random_events.meteor_shower.engineer.outcome", {
              damage: Math.max(1, Math.ceil(event.damage * 0.3)),
            }),
            available: isAvailable("specialist"),
            requirement: t("random_events.meteor_shower.engineer.requirement"),
          },
          {
            id: "systems",
            icon: "⬡",
            label: t("random_events.meteor_shower.shields.label"),
            description: t("random_events.meteor_shower.shields.description"),
            outcome: t("random_events.meteor_shower.shields.outcome", {
              absorbed: Math.min(state.ship.shields, event.damage),
              damage: Math.max(0, event.damage - state.ship.shields),
            }),
            available: isAvailable("systems"),
            requirement: t("random_events.meteor_shower.shields.requirement"),
          },
          {
            id: "standard",
            icon: "▦",
            label: t("random_events.meteor_shower.standard.label"),
            description: t("random_events.meteor_shower.standard.description"),
            outcome: t("random_events.meteor_shower.standard.outcome", {
              damage: event.damage,
            }),
            available: true,
          },
        ],
      };
    }
    case "pirate_raid":
      return {
        description: t("random_events.pirate_raid.description", {
          loss: event.creditLoss,
        }),
        choices: [
          {
            id: "specialist",
            icon: "⚔",
            label: t("random_events.pirate_raid.gunner.label"),
            description: t("random_events.pirate_raid.gunner.description"),
            outcome: t("random_events.pirate_raid.gunner.outcome", {
              loot: Math.floor(event.creditLoss * 0.5),
            }),
            available: isAvailable("specialist"),
            requirement: t("random_events.pirate_raid.gunner.requirement"),
          },
          {
            id: "systems",
            icon: "⌁",
            label: t("random_events.pirate_raid.weapons.label"),
            description: t("random_events.pirate_raid.weapons.description"),
            outcome: t("random_events.pirate_raid.weapons.outcome"),
            available: isAvailable("systems"),
            requirement: t("random_events.pirate_raid.weapons.requirement"),
          },
          {
            id: "standard",
            icon: "▣",
            label: t("random_events.pirate_raid.standard.label"),
            description: t("random_events.pirate_raid.standard.description"),
            outcome: t("random_events.pirate_raid.standard.outcome", {
              loss: event.creditLoss,
            }),
            available: true,
          },
        ],
      };
    case "distress_signal":
      return {
        description: t("random_events.distress_signal.description"),
        choices: [
          {
            id: "specialist",
            icon: "✚",
            label: t("random_events.distress_signal.medic.label"),
            description: t("random_events.distress_signal.medic.description"),
            outcome: t("random_events.distress_signal.medic.outcome"),
            available: isAvailable("specialist"),
            requirement: t("random_events.distress_signal.medic.requirement"),
          },
          {
            id: "systems",
            icon: "⚕",
            label: t("random_events.distress_signal.medical.label"),
            description: t("random_events.distress_signal.medical.description"),
            outcome: t("random_events.distress_signal.medical.outcome"),
            available: isAvailable("systems"),
            requirement: t("random_events.distress_signal.medical.requirement"),
          },
          {
            id: "standard",
            icon: "▭",
            label: t("random_events.distress_signal.standard.label"),
            description: t("random_events.distress_signal.standard.description"),
            outcome: t("random_events.distress_signal.standard.outcome"),
            available: true,
          },
        ],
      };
    case "trader":
      return {
        description: t("random_events.trader.description", {
          discount: event.discount,
        }),
        choices: [
          {
            id: "specialist",
            icon: "⌬",
            label: t("random_events.trader.scientist.label"),
            description: t("random_events.trader.scientist.description"),
            outcome: t("random_events.trader.scientist.outcome"),
            available: isAvailable("specialist"),
            requirement: t("random_events.trader.scientist.requirement"),
          },
          {
            id: "systems",
            icon: "▣",
            label: t("random_events.trader.cargo.label"),
            description: t("random_events.trader.cargo.description"),
            outcome: t("random_events.trader.cargo.outcome", {
              bonus: event.discount,
            }),
            available: isAvailable("systems"),
            requirement: t("random_events.trader.cargo.requirement"),
          },
          {
            id: "standard",
            icon: "⚖",
            label: t("random_events.trader.standard.label"),
            description: t("random_events.trader.standard.description"),
            outcome: t("random_events.trader.standard.outcome"),
            available: true,
          },
        ],
      };
    case "derelict":
      return {
        description: t("random_events.derelict.description", {
          reward: event.reward,
        }),
        choices: [
          {
            id: "specialist",
            icon: "⌬",
            label: t("random_events.derelict.scientist.label"),
            description: t("random_events.derelict.scientist.description"),
            outcome: t("random_events.derelict.scientist.outcome"),
            available: isAvailable("specialist"),
            requirement: t("random_events.derelict.scientist.requirement"),
          },
          {
            id: "systems",
            icon: "⌖",
            label: t("random_events.derelict.scanner.label"),
            description: t("random_events.derelict.scanner.description"),
            outcome: t("random_events.derelict.scanner.outcome", {
              reward: event.reward,
            }),
            available: isAvailable("systems"),
            requirement: t("random_events.derelict.scanner.requirement"),
          },
          {
            id: "standard",
            icon: "◇",
            label: t("random_events.derelict.standard.label"),
            description: t("random_events.derelict.standard.description"),
            outcome: t("random_events.derelict.standard.outcome", {
              reward: Math.floor(event.reward * 0.5),
            }),
            available: true,
          },
        ],
      };
    case "ancient_signal":
      return {
        description: t("random_events.ancient_signal.description"),
        choices: [
          {
            id: "specialist",
            icon: "⟁",
            label: t("random_events.ancient_signal.scientist.label"),
            description: t("random_events.ancient_signal.scientist.description"),
            outcome: t("random_events.ancient_signal.scientist.outcome"),
            available: isAvailable("specialist"),
            requirement: t("random_events.ancient_signal.scientist.requirement"),
          },
          {
            id: "systems",
            icon: "📡",
            label: t("random_events.ancient_signal.scanner.label"),
            description: t("random_events.ancient_signal.scanner.description"),
            outcome: t("random_events.ancient_signal.scanner.outcome"),
            available: isAvailable("systems"),
            requirement: t("random_events.ancient_signal.scanner.requirement"),
          },
          {
            id: "standard",
            icon: "▭",
            label: t("random_events.ancient_signal.standard.label"),
            description: t("random_events.ancient_signal.standard.description"),
            outcome: t("random_events.ancient_signal.standard.outcome"),
            available: true,
          },
        ],
      };
    case "research_breakthrough":
      return {
        description: t("random_events.research_breakthrough.description"),
        choices: [
          {
            id: "specialist",
            icon: "⚛",
            label: t("random_events.research_breakthrough.scientist.label"),
            description: t("random_events.research_breakthrough.scientist.description"),
            outcome: t("random_events.research_breakthrough.scientist.outcome"),
            available: isAvailable("specialist"),
            requirement: t("random_events.research_breakthrough.scientist.requirement"),
          },
          {
            id: "systems",
            icon: "📡",
            label: t("random_events.research_breakthrough.scanner.label"),
            description: t("random_events.research_breakthrough.scanner.description"),
            outcome: t("random_events.research_breakthrough.scanner.outcome"),
            available: isAvailable("systems"),
            requirement: t("random_events.research_breakthrough.scanner.requirement"),
          },
          {
            id: "standard",
            icon: "▭",
            label: t("random_events.research_breakthrough.standard.label"),
            description: t("random_events.research_breakthrough.standard.description"),
            outcome: t("random_events.research_breakthrough.standard.outcome"),
            available: true,
          },
        ],
      };
    case "artifact_resonance":
      return {
        description: t("random_events.artifact_resonance.description"),
        choices: [
          {
            id: "specialist",
            icon: "✶",
            label: t("random_events.artifact_resonance.scientist.label"),
            description: t("random_events.artifact_resonance.scientist.description"),
            outcome: t("random_events.artifact_resonance.scientist.outcome"),
            available: isAvailable("specialist"),
            requirement: t("random_events.artifact_resonance.scientist.requirement"),
          },
          {
            id: "systems",
            icon: "⚗",
            label: t("random_events.artifact_resonance.lab.label"),
            description: t("random_events.artifact_resonance.lab.description"),
            outcome: t("random_events.artifact_resonance.lab.outcome"),
            available: isAvailable("systems"),
            requirement: t("random_events.artifact_resonance.lab.requirement"),
          },
          {
            id: "standard",
            icon: "▭",
            label: t("random_events.artifact_resonance.standard.label"),
            description: t("random_events.artifact_resonance.standard.description"),
            outcome: t("random_events.artifact_resonance.standard.outcome"),
            available: true,
          },
        ],
      };
    case "consequence":
      return {
        description: t(
          `random_events.consequence.${event.eventType}.${event.choice}`,
        ),
        choices: [
          {
            id: "standard",
            icon: "✓",
            label: t("random_events.consequence.confirm"),
            description: t("random_events.consequence.description", {
              event: t(`random_events.${event.eventType}.title`),
            }),
            outcome: t("random_events.consequence.outcome"),
            available: true,
          },
        ],
      };
  }
}

export function RandomEventPanel() {
  const { event, resolveRandomEvent, crew, ship } = useGameStore(
    useShallow((state) => ({
      event: state.pendingRandomEvent,
      resolveRandomEvent: state.resolveRandomEvent,
      crew: state.crew,
      ship: state.ship,
    })),
  );
  const { t, currentLanguage } = useTranslation();

  if (!event) return null;

  const accent = EVENT_ACCENTS[event.type];
  const { description, choices } = buildEventView(
    event,
    { crew, ship },
    t,
    currentLanguage,
  );

  return (
    <div className="flex min-h-0 flex-col gap-3 p-1 pb-3 lg:h-full lg:overflow-y-auto">
      <div
        className="relative overflow-hidden border p-3 sm:p-4"
        style={{
          borderColor: `${accent}77`,
          background: `linear-gradient(135deg, ${accent}18, rgba(3, 8, 14, 0.96) 58%)`,
        }}
      >
        <div
          className="absolute -right-5 -top-9 font-['Orbitron'] text-8xl opacity-[0.07]"
          style={{ color: accent }}
          aria-hidden="true"
        >
          {EVENT_ICONS[event.type]}
        </div>
        <div className="text-[9px] uppercase tracking-[0.22em] text-[#687868]">
          {t("random_events.signal")}
        </div>
        <div className="mt-1 flex items-center gap-3">
          <span className="font-['Orbitron'] text-3xl" style={{ color: accent }}>
            {EVENT_ICONS[event.type]}
          </span>
          <div>
            <h2
              className="font-['Orbitron'] text-base font-bold uppercase tracking-wider"
              style={{ color: accent }}
            >
              {t(`random_events.${event.type}.title`)}
            </h2>
            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[#889988]">
              {t("random_events.captain_decision")}
            </div>
          </div>
        </div>
        <p className="mt-3 max-w-2xl break-words text-xs leading-relaxed text-[#a7b0a7] sm:text-sm">
          {description}
        </p>
      </div>

      <div className="grid gap-2 lg:grid-cols-3">
        {choices.map((choice) => (
          <div
            key={choice.id}
            className={`flex min-h-48 flex-col border p-3 ${
              choice.available
                ? "border-[#00ff4144] bg-[rgba(0,255,65,0.025)]"
                : "border-[#ffffff14] bg-[rgba(255,255,255,0.015)] opacity-55"
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="text-xl text-accent" aria-hidden="true">
                {choice.icon}
              </span>
              <div>
                <div className="font-['Orbitron'] text-[11px] font-bold uppercase tracking-wider text-accent">
                  {choice.label}
                </div>
                <div className="mt-1 text-xs leading-relaxed text-[#7f8b7f]">
                  {choice.description}
                </div>
              </div>
            </div>
            <div className="mt-3 border-l-2 border-[#00d4ff66] pl-2 text-xs text-ring">
              {choice.outcome}
            </div>
            {!choice.available && choice.requirement && (
              <div className="mt-2 text-[10px] text-destructive">
                {t("random_events.unavailable")}: {choice.requirement}
              </div>
            )}
            <Button
              onClick={() => resolveRandomEvent(choice.id)}
              disabled={!choice.available}
              className="mt-auto cursor-pointer border border-[#00ff41] bg-transparent text-[10px] uppercase tracking-wider text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] disabled:cursor-not-allowed disabled:border-[#445544] disabled:text-[#445544]"
            >
              {t("random_events.choose")}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
