"use client";

import { useCallback, useEffect, useState } from "react";
import { useGameStore } from "@/game/store";
import { getAllSlotMeta, deleteSlot } from "@/game/saves/utils";
import type { SaveSlotMeta, SaveSlotId, ManualSlotId } from "@/game/saves/utils";
import { useTranslation } from "@/lib/useTranslation";
import { SHIP_TEMPLATES } from "@/game/constants/shipTemplates";
import { playUi, unlockAudio, type AudioVolumeCategory } from "@/sounds";
import { getSectorName } from "@/lib/translationHelpers";

interface Props {
  onClose: () => void;
  onGuide: () => void;
  onAchievements: () => void;
  onTutorial: () => void;
  onRestart: () => void;
}

function formatDate(timestamp: number, lang: string): string {
  if (!timestamp) return "—";
  const locale = lang === "ru" ? "ru-RU" : "en-GB";
  return new Date(timestamp).toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface SlotCardProps {
  label: string;
  slotId: SaveSlotId;
  meta: SaveSlotMeta | null;
  isManual: boolean;
  mode: "save" | "load";
  onSave?: () => void;
  onLoad?: () => void;
  onDelete?: () => void;
  confirmOverwrite: SaveSlotId | null;
  setConfirmOverwrite: (id: SaveSlotId | null) => void;
  name?: string;
  onNameChange?: (value: string) => void;
}

function SlotCard({
  label,
  slotId,
  meta,
  isManual,
  mode,
  onSave,
  onLoad,
  onDelete,
  confirmOverwrite,
  setConfirmOverwrite,
  name,
  onNameChange,
}: SlotCardProps) {
  const { t, currentLanguage } = useTranslation();
  const isEmpty = !meta;
  const isConfirming = confirmOverwrite === slotId;

  return (
    <div
      className="border p-3 flex flex-col gap-2"
      style={{
        borderColor: isEmpty ? "#1a2030" : isManual ? "#00d4ff44" : "#9933ff44",
        background: isEmpty ? "rgba(5,8,16,0.5)" : "rgba(0,0,0,0.4)",
      }}
    >
      {/* Slot header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-['Orbitron'] uppercase tracking-widest font-bold"
            style={{ color: isManual ? "#00d4ff" : "#9933ff" }}
          >
            {!isEmpty && meta.name ? meta.name : label}
          </span>
          {!isManual && (
            <span className="text-[9px] text-[#555] uppercase tracking-wider">
              auto
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isEmpty && (
            <span className="text-[10px] text-[#444]">
              {formatDate(meta.timestamp, currentLanguage)}
            </span>
          )}
          {isManual && onDelete && !isEmpty && (
            <button
              onClick={onDelete}
              className="text-[#333] hover:text-[#ff0040] text-[12px] leading-none cursor-pointer transition-colors"
              title="Delete save"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      {!isEmpty && meta.name && (
        <div className="-mt-1.5 text-[9px] uppercase tracking-wide text-[#555]">
          {label}
        </div>
      )}

      {/* Custom name — save mode only, used on the next save */}
      {mode === "save" && isManual && onNameChange && (
        <input
          type="text"
          value={name ?? ""}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t("save_load.name_placeholder")}
          maxLength={40}
          className="w-full border border-[#1a3040] bg-transparent px-2 py-1 text-xs text-[#00d4ff] placeholder-[#333] focus:border-[#00d4ff] focus:outline-none"
        />
      )}

      {/* Save info */}
      {isEmpty ? (
        <div className="text-xs text-[#333] italic">{t("save_load.empty")}</div>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
          <span className="text-[#ffb000]">{t("save_load.turn_label")} {meta.turn}</span>
          <span className="text-[#00ff41]">{meta.credits}₢</span>
          <span className="text-[#888]">📍 {getSectorName(meta.sectorName, t)}</span>
          {meta.templateId ? (
            (() => {
              const tmpl = SHIP_TEMPLATES.find((template) => template.id === meta.templateId);
              return tmpl ? (
                <span className="text-[#666]" title={t(tmpl.nameKey)}>
                  {tmpl.icon} {t(tmpl.nameKey)}
                </span>
              ) : null;
            })()
          ) : null}
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2 mt-1">
        {mode === "save" && isManual && onSave && (
          isConfirming && !isEmpty ? (
            <div className="flex gap-1.5 flex-1">
              <button
                onClick={() => { setConfirmOverwrite(null); onSave(); }}
                className="flex-1 text-[10px] uppercase tracking-wider border border-[#ff6600] text-[#ff6600] hover:bg-[#ff6600] hover:text-[#050810] px-2 py-1 cursor-pointer transition-colors"
              >
                {t("save_load.btn_overwrite")}
              </button>
              <button
                onClick={() => setConfirmOverwrite(null)}
                className="text-[10px] uppercase tracking-wider border border-[#444] text-[#666] hover:bg-[#222] px-2 py-1 cursor-pointer transition-colors"
              >
                {t("save_load.btn_cancel")}
              </button>
            </div>
          ) : (
            <button
              onClick={() => isEmpty ? onSave() : setConfirmOverwrite(slotId)}
              className="flex-1 text-[10px] uppercase tracking-wider border border-[#00d4ff] text-[#00d4ff] hover:bg-[#00d4ff] hover:text-[#050810] px-2 py-1 cursor-pointer transition-colors"
            >
              {t("save_load.btn_save")}
            </button>
          )
        )}

        {mode === "load" && onLoad && (
          <button
            onClick={onLoad}
            disabled={isEmpty}
            className={`flex-1 text-[10px] uppercase tracking-wider px-2 py-1 transition-colors border ${isEmpty
                ? "border-[#1a2030] text-[#2a3040] cursor-not-allowed"
                : "border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] cursor-pointer"
              }`}
          >
            {t("save_load.btn_load")}
          </button>
        )}
      </div>
    </div>
  );
}

export function SettingsPanel({ onClose, onGuide, onAchievements, onTutorial, onRestart }: Props) {
  const saveToSlot = useGameStore((s) => s.saveToSlot);
  const loadFromSlot = useGameStore((s) => s.loadFromSlot);
  const resetProgress = useGameStore((s) => s.resetProgress);
  const animationsEnabled = useGameStore((s) => s.settings.animationsEnabled);
  const soundEnabled = useGameStore((s) => s.settings.soundEnabled);
  const audioVolumes = useGameStore((s) => s.settings);
  const setAnimationsEnabled = useGameStore((s) => s.setAnimationsEnabled);
  const setSoundEnabled = useGameStore((s) => s.setSoundEnabled);
  const setAudioVolume = useGameStore((s) => s.setAudioVolume);
  const { t, currentLanguage, changeLanguage } = useTranslation();

  const [view, setView] = useState<"menu" | "save" | "load">("menu");
  const [slots, setSlots] = useState<Record<SaveSlotId, SaveSlotMeta | null>>(
    () => getAllSlotMeta(),
  );
  const [names, setNames] = useState<Record<ManualSlotId, string>>(() => ({
    manual1: slots.manual1?.name ?? "",
    manual2: slots.manual2?.name ?? "",
    manual3: slots.manual3?.name ?? "",
    manual4: slots.manual4?.name ?? "",
    manual5: slots.manual5?.name ?? "",
  }));
  const [confirmOverwrite, setConfirmOverwrite] = useState<SaveSlotId | null>(null);
  const [loadConfirm, setLoadConfirm] = useState<SaveSlotId | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const closePanel = useCallback(() => {
    playUi("ui_dialog_close");
    onClose();
  }, [onClose]);

  useEffect(() => {
    playUi("ui_dialog_open");
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closePanel]);

  const refreshMeta = () => setSlots(getAllSlotMeta());

  const handleSave = (slotId: ManualSlotId) => {
    saveToSlot(slotId, names[slotId]);
    setConfirmOverwrite(null);
    setTimeout(refreshMeta, 50);
  };

  const handleDelete = (slotId: ManualSlotId) => {
    deleteSlot(slotId);
    setNames((prev) => ({ ...prev, [slotId]: "" }));
    setTimeout(refreshMeta, 50);
  };

  const handleLoad = (slotId: SaveSlotId) => {
    void unlockAudio();
    playUi("ui_confirm");
    loadFromSlot(slotId);
    setLoadConfirm(null);
    closePanel();
  };

  const handleResetProgress = () => {
    resetProgress();
    closePanel();
    window.dispatchEvent(new CustomEvent("sw:showTitleSetup"));
  };

  const MANUAL_SLOTS: { id: ManualSlotId; label: string }[] = [
    { id: "manual1", label: t("save_load.slot_label", { n: "1" }) },
    { id: "manual2", label: t("save_load.slot_label", { n: "2" }) },
    { id: "manual3", label: t("save_load.slot_label", { n: "3" }) },
    { id: "manual4", label: t("save_load.slot_label", { n: "4" }) },
    { id: "manual5", label: t("save_load.slot_label", { n: "5" }) },
  ];
  const audioSliders: { id: AudioVolumeCategory; label: string }[] = [
    { id: "master", label: t("start_menu.audio_master") },
    { id: "music", label: t("start_menu.audio_music") },
    { id: "sfx", label: t("start_menu.audio_sfx") },
    { id: "ui", label: t("start_menu.audio_ui") },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={closePanel}
    >
      <div
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-sm flex-col border-2 border-[#00d4ff] bg-[rgba(5,8,16,0.98)] font-['Share_Tech_Mono']"
        style={{ boxShadow: "0 0 40px rgba(0,212,255,0.15)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#00d4ff33] bg-[rgba(0,212,255,0.04)]">
          <div className="flex items-center gap-2">
            {view !== "menu" && (
              <button
                onClick={() => {
                  playUi("ui_tab");
                  setView("menu");
                }}
                className="text-[#00d4ff] hover:text-white cursor-pointer text-sm leading-none"
                title={t("save_load.btn_back")}
              >
                ←
              </button>
            )}
            <h2 className="font-['Orbitron'] text-sm font-bold text-[#00d4ff] tracking-widest uppercase">
              {view === "menu" && <>☰ {t("save_load.menu_title")}</>}
              {view === "save" && <>💾 {t("save_load.section_save")}</>}
              {view === "load" && <>📂 {t("save_load.section_load")}</>}
            </h2>
          </div>
          <button
            onClick={closePanel}
            className="text-[#ff0040] hover:text-white text-lg font-bold cursor-pointer leading-none"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto p-4">
          {view === "menu" && (
            <>
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3 border border-[#1a3040] p-3">
                  <span className="text-xs text-[#00d4ff]">{t("start_menu.language")}</span>
                  <div className="grid grid-cols-2 border border-[#33454d]">
                    {(["ru", "en"] as const).map((language) => (
                      <button
                        key={language}
                        type="button"
                        aria-pressed={currentLanguage === language}
                        onClick={() => changeLanguage(language)}
                        className={`px-3 py-1.5 text-[10px] font-bold ${currentLanguage === language ? "bg-[#00d4ff] text-[#050810]" : "text-[#71818a]"}`}
                      >
                        {language.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border border-[#1a3040] p-3">
                  <span className="text-xs text-[#00d4ff]">{t("start_menu.animations")}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={animationsEnabled}
                    onClick={() => setAnimationsEnabled(!animationsEnabled)}
                    className={`relative h-7 w-13 shrink-0 border ${animationsEnabled ? "border-[#00ff41] bg-[rgba(0,255,65,0.18)]" : "border-[#445] bg-[#111820]"}`}
                  >
                    <span className={`absolute top-1 h-4 w-4 ${animationsEnabled ? "left-7 bg-[#00ff41]" : "left-1 bg-[#556]"}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 border border-[#1a3040] p-3">
                  <span className="text-xs text-[#00d4ff]">{t("start_menu.sound")}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={soundEnabled}
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`relative h-7 w-13 shrink-0 border ${soundEnabled ? "border-[#00ff41] bg-[rgba(0,255,65,0.18)]" : "border-[#445] bg-[#111820]"}`}
                  >
                    <span className={`absolute top-1 h-4 w-4 ${soundEnabled ? "left-7 bg-[#00ff41]" : "left-1 bg-[#556]"}`} />
                  </button>
                </div>

                <div className="border border-[#1a3040] p-3">
                  <div className="mb-2 text-xs text-[#00d4ff]">{t("start_menu.audio_levels")}</div>
                  <div className="grid gap-2">
                    {audioSliders.map(({ id, label }) => (
                      <label key={id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-[10px] text-[#91a0a8]">
                        <span>{label}</span>
                        <span className="text-[#00d4ff]">{Math.round(audioVolumes[id] * 100)}%</span>
                        <input
                          className="col-span-2 h-1 w-full accent-[#00d4ff]"
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={audioVolumes[id]}
                          onChange={(event) => setAudioVolume(id, Number(event.currentTarget.value))}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-[#00d4ff33] pt-3 text-[9px] uppercase tracking-widest text-[#555]">
                {t("save_load.title")}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playUi("ui_tab");
                    setView("save");
                  }}
                  className="cursor-pointer border border-[#00d4ff] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#00d4ff] hover:bg-[rgba(0,212,255,0.15)]"
                >
                  💾 {t("save_load.section_save")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playUi("ui_tab");
                    setView("load");
                  }}
                  className="cursor-pointer border border-[#00ff41] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#00ff41] hover:bg-[rgba(0,255,65,0.15)]"
                >
                  📂 {t("save_load.section_load")}
                </button>
              </div>

              {/* Hint */}
              <div className="text-[10px] text-[#333] border-t border-[#0d1520] pt-2 leading-relaxed">
                {t("save_load.hint")}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onGuide}
                  className="col-span-2 cursor-pointer border border-[#00d4ff] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#00d4ff] hover:bg-[rgba(0,212,255,0.15)]"
                >
                  📖 {t("game.logbook")}
                </button>
                <button
                  type="button"
                  onClick={onAchievements}
                  className="col-span-2 cursor-pointer border border-[#00ff41] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#00ff41] hover:bg-[rgba(0,255,65,0.15)]"
                >
                  🏆 {t("achievements.panel_title")}
                </button>
                <button
                  type="button"
                  onClick={onTutorial}
                  className="cursor-pointer border border-[#00d4ff] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#00d4ff] hover:bg-[rgba(0,212,255,0.15)]"
                >
                  ❓ {t("game.tutorial")}
                </button>
                <button
                  type="button"
                  onClick={onRestart}
                  className="cursor-pointer border border-[#ff4444] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#ff4444] hover:bg-[rgba(255,68,68,0.15)]"
                >
                  🔄 {t("game.restart")}
                </button>
                {confirmReset ? (
                  <div className="col-span-2 border border-[#ff4444] bg-[rgba(255,68,68,0.08)] p-3">
                    <p className="text-xs leading-relaxed text-[#ffb0b0]">
                      {t("save_load.reset_progress_warning")}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={handleResetProgress}
                        className="flex-1 cursor-pointer border border-[#ff4444] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#ff4444] hover:bg-[#ff4444] hover:text-[#050810]"
                      >
                        {t("save_load.reset_progress_confirm")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmReset(false)}
                        className="cursor-pointer border border-[#445] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#889] hover:bg-[#1a2030]"
                      >
                        {t("save_load.btn_cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="col-span-2 cursor-pointer border border-[#ff4444] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#ff4444] hover:bg-[rgba(255,68,68,0.15)]"
                  >
                    ⚠️ {t("save_load.reset_progress")}
                  </button>
                )}
              </div>
            </>
          )}

          {view === "save" && (
            <div className="flex flex-col gap-2">
              {MANUAL_SLOTS.map(({ id, label }) => (
                <SlotCard
                  key={id}
                  mode="save"
                  label={label}
                  slotId={id}
                  meta={slots[id]}
                  isManual={true}
                  name={names[id]}
                  onNameChange={(value) =>
                    setNames((prev) => ({ ...prev, [id]: value }))
                  }
                  onSave={() => handleSave(id)}
                  onDelete={() => handleDelete(id)}
                  confirmOverwrite={confirmOverwrite}
                  setConfirmOverwrite={setConfirmOverwrite}
                />
              ))}
            </div>
          )}

          {view === "load" && (
            <div className="flex flex-col gap-3">
              {/* Auto-save slot */}
              <div>
                <div className="text-[9px] text-[#555] uppercase tracking-widest mb-1.5">
                  {t("save_load.autosave")}
                </div>
                <SlotCard
                  mode="load"
                  label={t("save_load.autosave_label")}
                  slotId="auto"
                  meta={slots.auto}
                  isManual={false}
                  onLoad={() =>
                    loadConfirm === "auto"
                      ? handleLoad("auto")
                      : setLoadConfirm("auto")
                  }
                  confirmOverwrite={confirmOverwrite}
                  setConfirmOverwrite={setConfirmOverwrite}
                />
                {loadConfirm === "auto" && (
                  <div className="mt-1.5 flex gap-1.5">
                    <button
                      onClick={() => handleLoad("auto")}
                      className="flex-1 text-[10px] uppercase tracking-wider border border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] px-2 py-1 cursor-pointer transition-colors"
                    >
                      {t("save_load.btn_confirm_load")}
                    </button>
                    <button
                      onClick={() => setLoadConfirm(null)}
                      className="text-[10px] uppercase tracking-wider border border-[#444] text-[#666] hover:bg-[#222] px-2 py-1 cursor-pointer transition-colors"
                    >
                      {t("save_load.btn_cancel")}
                    </button>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-[#0d1520]" />

              {/* Manual slots */}
              <div>
                <div className="text-[9px] text-[#555] uppercase tracking-widest mb-1.5">
                  {t("save_load.manual_slots")}
                </div>
                <div className="flex flex-col gap-2">
                  {MANUAL_SLOTS.map(({ id, label }) => (
                    <div key={id}>
                      <SlotCard
                        mode="load"
                        label={label}
                        slotId={id}
                        meta={slots[id]}
                        isManual={true}
                        onLoad={() =>
                          loadConfirm === id
                            ? handleLoad(id)
                            : setLoadConfirm(id)
                        }
                        onDelete={() => handleDelete(id)}
                        confirmOverwrite={confirmOverwrite}
                        setConfirmOverwrite={setConfirmOverwrite}
                      />
                      {loadConfirm === id && (
                        <div className="mt-1.5 flex gap-1.5">
                          <button
                            onClick={() => handleLoad(id)}
                            className="flex-1 text-[10px] uppercase tracking-wider border border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] px-2 py-1 cursor-pointer transition-colors"
                          >
                            {t("save_load.btn_confirm_load")}
                          </button>
                          <button
                            onClick={() => setLoadConfirm(null)}
                            className="text-[10px] uppercase tracking-wider border border-[#444] text-[#666] hover:bg-[#222] px-2 py-1 cursor-pointer transition-colors"
                          >
                            {t("save_load.btn_cancel")}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
