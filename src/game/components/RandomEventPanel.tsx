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
};

const EVENT_ICONS: Record<PendingRandomEvent["type"], string> = {
  storm: "ϟ",
  capsule: "◈",
  virus: "☣",
  fuel_leak: "◒",
  crew_dispute: "◐",
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
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-1">
      <div
        className="relative overflow-hidden border p-4"
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
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#a7b0a7]">
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
