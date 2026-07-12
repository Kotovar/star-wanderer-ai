"use client";

import { useState } from "react";
import { useGameStore } from "@/game/store";
import { getAllSlotMeta, deleteSlot } from "@/game/saves/utils";
import type { SaveSlotMeta, SaveSlotId, ManualSlotId } from "@/game/saves/utils";
import { useTranslation } from "@/lib/useTranslation";
import { SHIP_TEMPLATES } from "@/game/constants/shipTemplates";

interface Props {
  onClose: () => void;
  onGuide: () => void;
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
  onSave?: () => void;
  onLoad: () => void;
  onDelete?: () => void;
  confirmOverwrite: SaveSlotId | null;
  setConfirmOverwrite: (id: SaveSlotId | null) => void;
}

function SlotCard({
  label,
  slotId,
  meta,
  isManual,
  onSave,
  onLoad,
  onDelete,
  confirmOverwrite,
  setConfirmOverwrite,
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
            {label}
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

      {/* Save info */}
      {isEmpty ? (
        <div className="text-xs text-[#333] italic">{t("save_load.empty")}</div>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
          <span className="text-[#ffb000]">{t("save_load.turn_label")} {meta.turn}</span>
          <span className="text-[#00ff41]">{meta.credits}₢</span>
          <span className="text-[#888]">📍 {meta.sectorName}</span>
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
        {/* Save button — only for manual slots */}
        {isManual && onSave && (
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

        {/* Load button */}
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
      </div>
    </div>
  );
}

export function SettingsPanel({ onClose, onGuide, onTutorial, onRestart }: Props) {
  const saveToSlot = useGameStore((s) => s.saveToSlot);
  const loadFromSlot = useGameStore((s) => s.loadFromSlot);
  const animationsEnabled = useGameStore((s) => s.settings.animationsEnabled);
  const soundEnabled = useGameStore((s) => s.settings.soundEnabled);
  const setAnimationsEnabled = useGameStore((s) => s.setAnimationsEnabled);
  const setSoundEnabled = useGameStore((s) => s.setSoundEnabled);
  const { t, currentLanguage, changeLanguage } = useTranslation();

  const [slots, setSlots] = useState<Record<SaveSlotId, SaveSlotMeta | null>>(
    () => getAllSlotMeta(),
  );
  const [confirmOverwrite, setConfirmOverwrite] = useState<SaveSlotId | null>(null);
  const [loadConfirm, setLoadConfirm] = useState<SaveSlotId | null>(null);

  const refreshMeta = () => setSlots(getAllSlotMeta());

  const handleSave = (slotId: ManualSlotId) => {
    saveToSlot(slotId);
    setConfirmOverwrite(null);
    setTimeout(refreshMeta, 50);
  };

  const handleDelete = (slotId: ManualSlotId) => {
    deleteSlot(slotId);
    setTimeout(refreshMeta, 50);
  };

  const handleLoad = (slotId: SaveSlotId) => {
    loadFromSlot(slotId);
    setLoadConfirm(null);
    onClose();
  };

  const MANUAL_SLOTS: { id: ManualSlotId; label: string }[] = [
    { id: "manual1", label: t("save_load.slot_label", { n: "1" }) },
    { id: "manual2", label: t("save_load.slot_label", { n: "2" }) },
    { id: "manual3", label: t("save_load.slot_label", { n: "3" }) },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-sm flex-col border-2 border-[#00d4ff] bg-[rgba(5,8,16,0.98)] font-['Share_Tech_Mono']"
        style={{ boxShadow: "0 0 40px rgba(0,212,255,0.15)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#00d4ff33] bg-[rgba(0,212,255,0.04)]">
          <h2 className="font-['Orbitron'] text-sm font-bold text-[#00d4ff] tracking-widest uppercase">
            ☰ {t("save_load.menu_title")}
          </h2>
          <button
            onClick={onClose}
            className="text-[#ff0040] hover:text-white text-lg font-bold cursor-pointer leading-none"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto p-4">
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
          </div>

          <div className="border-t border-[#00d4ff33] pt-3 text-[9px] uppercase tracking-widest text-[#555]">
            {t("save_load.title")}
          </div>

          {/* Auto-save slot */}
          <div>
            <div className="text-[9px] text-[#555] uppercase tracking-widest mb-1.5">
              {t("save_load.autosave")}
            </div>
            <SlotCard
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
                    label={label}
                    slotId={id}
                    meta={slots[id]}
                    isManual={true}
                    onSave={() => handleSave(id)}
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
          </div>
        </div>
      </div>
    </div>
  );
}
