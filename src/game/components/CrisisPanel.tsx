"use client";

import { Button } from "@/components/ui/button";
import { GLOBAL_CRISES } from "@/game/constants/globalCrises";
import { CRISIS_RESPONSES } from "@/game/constants/crisisResponses";
import { useGameStore } from "@/game/store";
import { useTranslation } from "@/lib/useTranslation";

const formatChance = (chance: number) => `${Math.round(chance * 100)}%`;

export function CrisisPanel() {
  const state = useGameStore();
  const { t } = useTranslation();
  const activeCrisis = state.activeCrisis;
  const active = activeCrisis
    ? GLOBAL_CRISES.find((crisis) => crisis.id === activeCrisis.id)
    : null;
  const upcoming = state.nextCrisisId
    ? GLOBAL_CRISES.find((crisis) => crisis.id === state.nextCrisisId)
    : null;
  const turnsUntilCrisis = state.nextCrisisTurn - state.turn;
  const availableResponses = active
    ? CRISIS_RESPONSES.filter((response) =>
        active.allowedResponses.includes(response.id),
      )
    : [];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-['Orbitron'] text-lg font-bold uppercase tracking-[0.14em] text-[#ff4444]">
            Центр кризисов
          </div>
          <div className="mt-1 text-xs text-[#888]">
            Подавление кризиса требует подготовки. Провал тратит цену попытки.
          </div>
        </div>
        <Button
          onClick={state.showSectorMap}
          className="cursor-pointer border border-[#00ff41] bg-transparent text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810]"
        >
          К карте
        </Button>
      </div>

      <section className="border border-[#ff444466] bg-[rgba(255,68,68,0.05)] p-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#ff8da2]">
          Активный кризис
        </div>
        {active && activeCrisis ? (
          <>
            <div className="mt-2 text-base font-bold text-[#ffd6de]">
              {active.icon} {t(active.nameKey)}
            </div>
            <div className="mt-2 text-sm leading-relaxed text-[#ffb6c4]">
              {t(active.descriptionKey)}
            </div>
            <div className="mt-2 text-xs leading-relaxed text-[#ff8da2]">
              {t(active.effectsKey)}
            </div>
            <div className="mt-2 text-xs text-[#ffd6de]">
              Осталось ходов:{" "}
              <span className="font-bold text-[#ff4444]">
                {activeCrisis.turnsRemaining}
              </span>
            </div>
          </>
        ) : (
          <div className="mt-2 text-sm text-muted-foreground">
            Сейчас активного кризиса нет.
          </div>
        )}
      </section>

      {active && (
        <section className="grid gap-2 lg:grid-cols-2">
          {availableResponses.map((response) => {
            const canPay = response.canPay(state);
            const chance = response.getChance(state);
            const note = active.responseNotes?.[response.id];
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
                    {response.label}
                  </div>
                  <div className="text-xs font-bold text-accent">
                    {formatChance(chance)}
                  </div>
                </div>
                <div className="mt-2 text-[11px] leading-relaxed text-[#ffb6c4]">
                  {note ?? response.requirement}
                </div>
                <div className="mt-2 text-[11px] leading-relaxed text-[#ffb6c4]">
                  Требование: {response.requirement}
                </div>
                <div className="mt-1 text-[11px] leading-relaxed text-[#ff8da2]">
                  Цена: {response.cost}
                </div>
                {!canPay && (
                  <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#ff4444]">
                    условия не выполнены
                  </div>
                )}
              </button>
            );
          })}
        </section>
      )}

      <section className="border border-[#ffb00066] bg-[rgba(255,176,0,0.05)] p-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#ffd36b]">
          Следующий кризис
        </div>
        {upcoming ? (
          <>
            <div className="mt-2 text-sm font-bold text-[#ffe6a6]">
              {upcoming.icon} {t(upcoming.nameKey)}
            </div>
            <div className="mt-1 text-xs text-[#ffd36b]">
              До начала: {Math.max(0, turnsUntilCrisis)} ходов
            </div>
            <div className="mt-2 text-xs leading-relaxed text-[#ffe6a6]">
              {t(upcoming.warningKey)}
            </div>
          </>
        ) : (
          <div className="mt-2 text-sm text-muted-foreground">
            Следующий кризис ещё не определён.
          </div>
        )}
      </section>
    </div>
  );
}
