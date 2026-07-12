"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getSlotMeta,
  type SaveSlotId,
  type SaveSlotMeta,
} from "@/game/saves/utils";
import { useTranslation } from "@/lib/useTranslation";

const SLOT_IDS: SaveSlotId[] = ["auto", "manual1", "manual2", "manual3"];

interface StartMenuProps {
  animationsEnabled: boolean;
  soundEnabled: boolean;
  onAnimationsChange: (enabled: boolean) => void;
  onSoundChange: (enabled: boolean) => void;
  onNewGame: () => void;
  onLoad: (slotId: SaveSlotId) => void;
}

export function StartMenu({
  animationsEnabled,
  soundEnabled,
  onAnimationsChange,
  onSoundChange,
  onNewGame,
  onLoad,
}: StartMenuProps) {
  const { t, currentLanguage, changeLanguage } = useTranslation();
  const [slots, setSlots] = useState<Array<SaveSlotMeta | null>>([]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setSlots(SLOT_IDS.map(getSlotMeta)));
    return () => cancelAnimationFrame(frame);
  }, []);

  const autoSave = slots[0];
  const formatDate = (timestamp: number) =>
    timestamp
      ? new Date(timestamp).toLocaleString(
          currentLanguage === "ru" ? "ru-RU" : "en-US",
          { dateStyle: "short", timeStyle: "short" },
        )
      : t("start_menu.legacy_save");

  return (
    <section className="fixed inset-x-2 bottom-2 z-20 mx-auto flex max-h-[58dvh] max-w-4xl flex-col overflow-hidden border border-[#00d4ff] bg-[rgba(3,8,14,0.96)] font-['Share_Tech_Mono'] shadow-[0_0_50px_rgba(0,212,255,0.18)] sm:inset-x-6 sm:bottom-6">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#00d4ff55] px-3 py-2 sm:px-4">
        <div>
          <div className="font-['Orbitron'] text-[10px] font-bold uppercase tracking-[0.22em] text-[#00d4ff]">
            {t("start_menu.console")}
          </div>
          <div className="mt-0.5 text-[10px] text-[#526b75]">
            {t("start_menu.status")}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[#00ff41]">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#00ff41]" />
          {t("start_menu.online")}
        </div>
      </header>

      <Tabs defaultValue="start" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="grid h-auto shrink-0 grid-cols-4 rounded-none border-b border-[#122a32] bg-transparent p-0">
          {(["start", "saves", "settings", "help"] as const).map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-none border-r border-[#122a32] px-1 py-2 font-['Orbitron'] text-[9px] uppercase tracking-wide text-[#667780] data-[state=active]:bg-[rgba(0,212,255,0.08)] data-[state=active]:text-[#00d4ff] sm:text-[10px]"
            >
              {t(`start_menu.tab_${tab}`)}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          <TabsContent value="start" className="m-0 grid gap-3 md:grid-cols-2">
            <LaunchCard
              icon="✦"
              title={t("start_menu.new_game")}
              description={t("start_menu.new_game_desc")}
              accent="#00ff41"
            >
              <Button
                onClick={onNewGame}
                className="w-full cursor-pointer rounded-none border border-[#00ff41] bg-[rgba(0,255,65,0.08)] font-['Orbitron'] text-xs font-bold uppercase tracking-widest text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810]"
              >
                {t("start_menu.configure_launch")} →
              </Button>
            </LaunchCard>

            <LaunchCard
              icon="▣"
              title={t("start_menu.continue")}
              description={
                autoSave
                  ? `${autoSave.sectorName} · ${t("start_menu.turn")} ${autoSave.turn} · ₢${autoSave.credits}`
                  : t("start_menu.no_save")
              }
              accent="#ffb000"
            >
              <Button
                onClick={() => onLoad("auto")}
                disabled={!autoSave}
                className="w-full cursor-pointer rounded-none border border-[#ffb000] bg-[rgba(255,176,0,0.08)] font-['Orbitron'] text-xs font-bold uppercase tracking-widest text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] disabled:cursor-not-allowed disabled:opacity-30"
              >
                {t("start_menu.resume")} ▶
              </Button>
            </LaunchCard>
          </TabsContent>

          <TabsContent value="saves" className="m-0 grid gap-2 sm:grid-cols-2">
            {SLOT_IDS.map((slotId, index) => {
              const meta = slots[index];
              return (
                <button
                  key={slotId}
                  type="button"
                  disabled={!meta}
                  onClick={() => onLoad(slotId)}
                  className="min-w-0 border border-[#1c3944] bg-[rgba(0,212,255,0.025)] p-3 text-left transition-colors hover:border-[#00d4ff] hover:bg-[rgba(0,212,255,0.07)] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-bold text-[#00d4ff]">
                    <span>{t(`start_menu.slot_${slotId}`)}</span>
                    <span className="text-[9px] text-[#526b75]">
                      {meta ? formatDate(meta.timestamp) : t("start_menu.empty")}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-[#91a0a8]">
                    {meta
                      ? `${meta.sectorName} · ${t("start_menu.turn")} ${meta.turn} · ₢${meta.credits}`
                      : t("start_menu.empty_desc")}
                  </div>
                </button>
              );
            })}
          </TabsContent>

          <TabsContent value="settings" className="m-0">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4 border border-[#1c3944] bg-[rgba(0,212,255,0.025)] p-4">
                <div>
                  <div className="font-['Orbitron'] text-xs font-bold uppercase tracking-wide text-[#00d4ff]">
                    {t("start_menu.language")}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#71818a]">
                    {t("start_menu.language_desc")}
                  </p>
                </div>
                <div className="grid shrink-0 grid-cols-2 border border-[#33454d]">
                  {(["ru", "en"] as const).map((language) => (
                    <button
                      key={language}
                      type="button"
                      aria-pressed={currentLanguage === language}
                      onClick={() => changeLanguage(language)}
                      className={`cursor-pointer px-3 py-2 font-['Orbitron'] text-[10px] font-bold transition-colors ${
                        currentLanguage === language
                          ? "bg-[#00d4ff] text-[#050810]"
                          : "text-[#71818a] hover:bg-[rgba(0,212,255,0.08)] hover:text-[#00d4ff]"
                      }`}
                    >
                      {language.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 border border-[#1c3944] bg-[rgba(0,212,255,0.025)] p-4">
                <div>
                  <div className="font-['Orbitron'] text-xs font-bold uppercase tracking-wide text-[#00d4ff]">
                    {t("start_menu.animations")}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#71818a]">
                    {t("start_menu.animations_desc")}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={animationsEnabled}
                  onClick={() => onAnimationsChange(!animationsEnabled)}
                  className={`relative h-7 w-13 shrink-0 cursor-pointer border transition-colors ${
                    animationsEnabled
                      ? "border-[#00ff41] bg-[rgba(0,255,65,0.18)]"
                      : "border-[#445] bg-[#111820]"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 transition-all ${
                      animationsEnabled
                        ? "left-7 bg-[#00ff41]"
                        : "left-1 bg-[#556]"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 border border-[#1c3944] bg-[rgba(0,212,255,0.025)] p-4">
                <div>
                  <div className="font-['Orbitron'] text-xs font-bold uppercase tracking-wide text-[#00d4ff]">
                    {t("start_menu.sound")}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#71818a]">
                    {t("start_menu.sound_desc")}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={soundEnabled}
                  onClick={() => onSoundChange(!soundEnabled)}
                  className={`relative h-7 w-13 shrink-0 cursor-pointer border transition-colors ${
                    soundEnabled
                      ? "border-[#00ff41] bg-[rgba(0,255,65,0.18)]"
                      : "border-[#445] bg-[#111820]"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 transition-all ${
                      soundEnabled
                        ? "left-7 bg-[#00ff41]"
                        : "left-1 bg-[#556]"
                    }`}
                  />
                </button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="help" className="m-0 grid gap-2 sm:grid-cols-2">
            {(["map", "turn", "crew", "survival"] as const).map((item) => (
              <div
                key={item}
                className="border-l-2 border-[#ffb000] bg-[rgba(255,176,0,0.035)] px-3 py-2"
              >
                <div className="font-['Orbitron'] text-[10px] font-bold uppercase tracking-wide text-[#ffb000]">
                  {t(`start_menu.help_${item}_title`)}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[#91a0a8]">
                  {t(`start_menu.help_${item}_desc`)}
                </p>
              </div>
            ))}
          </TabsContent>
        </div>
      </Tabs>
    </section>
  );
}

function LaunchCard({
  icon,
  title,
  description,
  accent,
  children,
}: {
  icon: string;
  title: string;
  description: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <article className="flex min-h-35 flex-col border border-[#1c3944] bg-[rgba(0,0,0,0.18)] p-3">
      <div className="flex items-start gap-3">
        <span className="text-xl" style={{ color: accent }}>
          {icon}
        </span>
        <div>
          <h2
            className="font-['Orbitron'] text-xs font-bold uppercase tracking-wider"
            style={{ color: accent }}
          >
            {title}
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-[#71818a]">
            {description}
          </p>
        </div>
      </div>
      <div className="mt-auto pt-3">{children}</div>
    </article>
  );
}
