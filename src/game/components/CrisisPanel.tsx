"use client";

import { Button } from "@/components/ui/button";
import { GLOBAL_CRISES } from "@/game/constants/globalCrises";
import { CRISIS_RESPONSES } from "@/game/constants/crisisResponses";
import { useGameStore } from "@/game/store";
import { useTranslation } from "@/lib/useTranslation";

const formatChance = (chance: number) => `${Math.round(chance * 100)}%`;
const pct = (value: number) => `${Math.round(value)}%`;

export function CrisisPanel() {
  const state = useGameStore();
  const { t } = useTranslation();
  const activeCrisis = state.activeCrisis;
  const active = activeCrisis
    ? GLOBAL_CRISES.find((crisis) => crisis.id === activeCrisis.id)
    : null;
  const availableResponses = active
    ? CRISIS_RESPONSES.filter((response) =>
        active.allowedResponses.includes(response.id),
      )
    : [];
  const moduleIntegrity =
    state.ship.modules.length > 0
      ? (state.ship.modules.reduce(
          (sum, module) => sum + module.health / module.maxHealth,
          0,
        ) /
          state.ship.modules.length) *
        100
      : 100;
  const crewCondition =
    state.crew.length > 0
      ? (state.crew.reduce(
          (sum, crew) =>
            sum +
            (crew.health / crew.maxHealth +
              crew.happiness / crew.maxHappiness) /
              2,
          0,
        ) /
          state.crew.length) *
        100
      : 100;
  const readinessItems = [
    {
      label: t("crisis_panel.readiness.hull.label"),
      value: pct(moduleIntegrity),
      ok: moduleIntegrity >= 70,
      hint: t("crisis_panel.readiness.hull.hint"),
    },
    {
      label: t("crisis_panel.readiness.crew.label"),
      value: pct(crewCondition),
      ok: crewCondition >= 70,
      hint: t("crisis_panel.readiness.crew.hint"),
    },
    {
      label: t("crisis_panel.readiness.fuel.label"),
      value: String(Math.floor(state.ship.fuel)),
      ok: state.ship.fuel >= 40,
      hint: t("crisis_panel.readiness.fuel.hint"),
    },
    {
      label: t("crisis_panel.readiness.reserve.label"),
      value: `₢${Math.floor(state.credits)}`,
      ok: state.credits >= 500,
      hint: t("crisis_panel.readiness.reserve.hint"),
    },
  ];
  const responseLabels = Object.fromEntries(
    CRISIS_RESPONSES.map((response) => [
      response.id,
      t(`crisis_panel.responses.${response.id}.label`),
    ]),
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-2 text-[#d7ffe0]">
      <div className="flex items-start justify-between gap-3 border-b border-[#ff444433] pb-3">
        <div>
          <div className="font-['Orbitron'] text-lg font-bold uppercase tracking-[0.14em] text-[#ff4444]">
            {t("crisis_panel.title")}
          </div>
          <div className="mt-1 text-xs text-[#888]">
            {t("crisis_panel.subtitle")}
          </div>
        </div>
        <Button
          onClick={state.showSectorMap}
          className="cursor-pointer border border-[#00ff41] bg-transparent text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810]"
        >
          {t("common.back_to_map")}
        </Button>
      </div>

      <section className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="border border-[#ff444466] bg-[rgba(255,68,68,0.06)] p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#ff8da2]">
            {t("crisis_panel.current_alert")}
          </div>
          {active && activeCrisis ? (
            <>
              <div className="mt-2 flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center border border-[#ff668055] bg-[rgba(255,68,68,0.12)] text-2xl">
                  {active.icon}
                </div>
                <div>
                  <div className="text-base font-bold text-[#ffd6de]">
                    {t(active.nameKey)}
                  </div>
                  <div className="text-xs text-[#ff8da2]">
                    {t("crisis_panel.turns_remaining")}{" "}
                    <span className="font-bold text-[#ff4444]">
                      {activeCrisis.turnsRemaining}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-sm leading-relaxed text-[#ffb6c4]">
                {t(active.descriptionKey)}
              </div>
              <div className="mt-2 border-l-2 border-[#ff6680] pl-3 text-xs leading-relaxed text-[#ff8da2]">
                {t(active.effectsKey)}
              </div>
            </>
          ) : (
            <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("crisis_panel.no_active")}
            </div>
          )}
        </div>

        <div className="border border-[#00d4ff55] bg-[rgba(0,212,255,0.04)] p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-ring">
            {t("crisis_panel.readiness.title")}
          </div>
          <div className="mt-3 grid gap-2">
            {readinessItems.map((item) => (
              <div
                key={item.label}
                className="border border-[#1a5260] bg-[rgba(0,0,0,0.22)] p-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#d7ffe0]">
                    {item.label}
                  </span>
                  <span
                    className={`text-xs font-bold ${item.ok ? "text-[#00ff41]" : "text-accent"}`}
                  >
                    {item.value}
                  </span>
                </div>
                <div className="mt-1 text-[10px] leading-snug text-[#789]">
                  {item.hint}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {active && (
        <section>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#ff8da2]">
            {t("crisis_panel.suppression")}
          </div>
          <div className="grid gap-2 lg:grid-cols-2">
            {availableResponses.map((response) => {
              const canPay = response.canPay(state);
              const chance = response.getChance(state);
              const note = t(
                `crisis_panel.response_notes.${active.id}.${response.id}`,
              );
              return (
                <button
                  key={response.id}
                  type="button"
                  disabled={!canPay}
                  onClick={() => state.resolveCrisis(response.id)}
                  className="cursor-pointer border border-[#ff668055] bg-[rgba(255,102,128,0.04)] p-3 text-left transition-colors hover:bg-[rgba(255,102,128,0.12)] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-['Orbitron'] text-sm font-bold text-[#ffd6de]">
                      {t(`crisis_panel.responses.${response.id}.label`)}
                    </div>
                    <div className="text-xs font-bold text-accent">
                      {formatChance(chance)}
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] leading-relaxed text-[#ffb6c4]">
                    {note ?? response.requirement}
                  </div>
                  <div className="mt-2 text-[11px] leading-relaxed text-[#ffb6c4]">
                    {t("crisis_panel.requirement")}{" "}
                    {t(`crisis_panel.responses.${response.id}.requirement`)}
                  </div>
                  <div className="mt-1 text-[11px] leading-relaxed text-[#ff8da2]">
                    {t("crisis_panel.cost")}{" "}
                    {t(`crisis_panel.responses.${response.id}.cost`)}
                  </div>
                  {!canPay && (
                    <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#ff4444]">
                      {t("crisis_panel.conditions_unmet")}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="border border-[#ffb00066] bg-[rgba(255,176,0,0.05)] p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#ffd36b]">
              {t("crisis_panel.threat_database")}
            </div>
            <div className="mt-1 text-xs text-[#887a4f]">
              {t("crisis_panel.threat_database_description")}
            </div>
          </div>
          <div className="border border-[#ffd36b55] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[#ffe6a6]">
            {t("crisis_panel.forecast_unavailable")}
          </div>
        </div>
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {GLOBAL_CRISES.map((crisis) => (
            <div
              key={crisis.id}
              className="border border-[#5c4618] bg-[rgba(0,0,0,0.2)] p-3"
            >
              <div className="font-bold text-[#ffe6a6]">
                {crisis.icon} {t(crisis.nameKey)}
              </div>
              <div className="mt-2 text-[11px] leading-relaxed text-[#c8b57a]">
                {t(crisis.descriptionKey)}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {crisis.allowedResponses.map((responseId) => (
                  <span
                    key={responseId}
                    className="border border-[#ffd36b33] px-1.5 py-0.5 text-[10px] text-[#ffe6a6]"
                  >
                    {responseLabels[responseId]}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
