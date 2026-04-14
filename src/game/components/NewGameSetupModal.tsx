"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGameStore } from "../store";
import { SHIP_TEMPLATES, DEFAULT_TEMPLATE_ID } from "../constants/shipTemplates";
import { LAUNCH_MODIFIERS } from "../constants/launchModifiers";
import { useTranslation } from "@/lib/useTranslation";

interface NewGameSetupModalProps {
  open: boolean;
  onClose: () => void;
  /** Если true — нельзя закрыть без нажатия "Начать" (первый старт) */
  required?: boolean;
}

const DIFFICULTY_COLORS = {
  easy: { text: "#00ff41", border: "#00ff41", bg: "rgba(0,255,65,0.1)" },
  normal: { text: "#ffb000", border: "#ffb000", bg: "rgba(255,176,0,0.1)" },
  hard: { text: "#ff4444", border: "#ff4444", bg: "rgba(255,68,68,0.1)" },
};

const MODIFIER_TYPE_COLORS = {
  bonus: { text: "#00ff41" },
  challenge: { text: "#ff4444" },
  mixed: { text: "#ff00ff" },
};

export function NewGameSetupModal({ open, onClose, required }: NewGameSetupModalProps) {
  const { t } = useTranslation();
  const restartGame = useGameStore((s) => s.restartGame);

  const [selectedTemplateId, setSelectedTemplateId] = useState(DEFAULT_TEMPLATE_ID);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);

  const selectedTemplate = SHIP_TEMPLATES.find((tmpl) => tmpl.id === selectedTemplateId);
  if (!selectedTemplate) return null;

  const totalCredits =
    selectedTemplate.credits +
    selectedModifiers.reduce((sum, id) => {
      const mod = LAUNCH_MODIFIERS.find((m) => m.id === id);
      return sum + (mod?.creditDelta ?? 0);
    }, 0);

  const toggleModifier = (id: string) => {
    setSelectedModifiers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const handleStart = () => {
    restartGame(selectedTemplateId, selectedModifiers);
    onClose();
    window.location.href = "/";
  };

  const handleOpenChange = (v: boolean) => {
    if (!v && required) return; // первый старт — нельзя закрыть без выбора
    if (!v) onClose();
  };

  const diffColors = DIFFICULTY_COLORS[selectedTemplate.difficulty];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="bg-[rgba(5,8,16,0.98)] border-2 border-[#00ff41] text-[#00ff41] w-[calc(100%-1rem)] max-w-2xl max-h-[92vh] overflow-y-auto p-0"
        // Скрываем дефолтную крестовину закрытия при required
        style={required ? { "--close-btn-display": "none" } as React.CSSProperties : undefined}
      >
        {/* Прячем кнопку × через CSS когда required */}
        {required && (
          <style>{`[data-radix-dialog-close] { display: none !important; }`}</style>
        )}

        <DialogHeader className="px-4 pt-4 pb-3 sm:px-5 sm:pt-5 border-b border-[rgba(0,255,65,0.2)]">
          <DialogTitle className="text-[#00ff41] font-['Orbitron'] text-base sm:text-xl">
            {t("new_game_setup.title")}
          </DialogTitle>
          <DialogDescription className="text-[#888] text-xs sm:text-sm mt-0.5">
            {t("new_game_setup.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="px-3 py-4 sm:p-5 space-y-5">

          {/* ── Шаблон корабля ──────────────────────────────────────── */}
          <section>
            <div className="text-xs text-[#ffb000] font-bold uppercase tracking-widest mb-2">
              🚀 {t("new_game_setup.template_section")}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SHIP_TEMPLATES.map((tmpl) => {
                const isSelected = tmpl.id === selectedTemplateId;
                const dc = DIFFICULTY_COLORS[tmpl.difficulty];
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => setSelectedTemplateId(tmpl.id)}
                    className="text-left p-2.5 sm:p-3 border transition-all cursor-pointer rounded-sm"
                    style={{
                      borderColor: isSelected ? dc.border : "rgba(0,255,65,0.2)",
                      backgroundColor: isSelected ? dc.bg : "transparent",
                    }}
                  >
                    {/* Верхняя строка */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg sm:text-xl">{tmpl.icon}</span>
                        <span
                          className="font-bold text-xs sm:text-sm"
                          style={{ color: isSelected ? dc.text : "#00ff41" }}
                        >
                          {t(tmpl.nameKey)}
                        </span>
                      </div>
                      <span
                        className="text-[10px] sm:text-xs px-1.5 py-0.5 border font-bold shrink-0 ml-1"
                        style={{ color: dc.text, borderColor: dc.border }}
                      >
                        {t(`new_game_setup.difficulty_${tmpl.difficulty}`)}
                      </span>
                    </div>

                    {/* Описание */}
                    <div className="text-[11px] sm:text-xs text-[#888] mb-2 leading-snug">
                      {t(tmpl.descriptionKey)}
                    </div>

                    {/* Модули + кредиты */}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-0.5 sm:gap-1 flex-wrap">
                        {tmpl.moduleIcons.map((icon, i) => (
                          <span key={i} className="text-xs sm:text-sm">{icon}</span>
                        ))}
                      </div>
                      <div className="text-xs text-[#ffb000] shrink-0 ml-1">
                        ₢{tmpl.credits}
                        {tmpl.researchResources && (
                          <span className="ml-1 text-[#9933ff]">+🔬</span>
                        )}
                        {tmpl.probes > 0 && (
                          <span className="ml-1 text-[#00d4ff]" title={t("new_game_setup.probes_hint")}>
                            ×{tmpl.probes}🔭
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Модификаторы ─────────────────────────────────────────── */}
          <section>
            <div className="text-xs text-[#ffb000] font-bold uppercase tracking-widest mb-2">
              ⚙️ {t("new_game_setup.modifiers_section")}
              <span className="text-[#888] normal-case font-normal ml-2">
                {t("new_game_setup.modifiers_hint")}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {LAUNCH_MODIFIERS.map((mod) => {
                const isActive = selectedModifiers.includes(mod.id);
                const tc = MODIFIER_TYPE_COLORS[mod.type];
                return (
                  <button
                    key={mod.id}
                    onClick={() => toggleModifier(mod.id)}
                    className="text-left p-2.5 sm:p-3 border transition-all cursor-pointer rounded-sm"
                    style={{
                      borderColor: isActive ? tc.text : "rgba(0,255,65,0.15)",
                      backgroundColor: isActive
                        ? `rgba(${mod.type === "bonus" ? "0,255,65" : mod.type === "challenge" ? "255,68,68" : "255,0,255"},0.07)`
                        : "transparent",
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="shrink-0">{mod.icon}</span>
                        <span
                          className="font-bold text-xs sm:text-sm truncate"
                          style={{ color: isActive ? tc.text : "#00ff41" }}
                        >
                          {t(mod.nameKey)}
                        </span>
                      </div>
                      <span
                        className="text-xs font-bold tabular-nums shrink-0 ml-1"
                        style={{ color: mod.creditDelta > 0 ? "#00ff41" : "#ff4444" }}
                      >
                        {mod.creditDelta > 0 ? `+${mod.creditDelta}` : mod.creditDelta}₢
                      </span>
                    </div>
                    <div className="text-[11px] sm:text-xs text-[#888] leading-snug">
                      {t(mod.descriptionKey)}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Итог + кнопка старта ─────────────────────────────────── */}
          <section className="border-t border-[rgba(0,255,65,0.2)] pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Итоговая сводка */}
            <div className="space-y-1 text-xs sm:text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[#888]">{t("new_game_setup.ship_label")}:</span>
                <span className="text-[#00ff41] font-bold">
                  {selectedTemplate.icon} {t(selectedTemplate.nameKey)}
                </span>
                <span
                  className="text-[10px] sm:text-xs px-1.5 py-0.5 border"
                  style={{ color: diffColors.text, borderColor: diffColors.border }}
                >
                  {t(`new_game_setup.difficulty_${selectedTemplate.difficulty}`)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#888]">{t("new_game_setup.start_credits")}:</span>
                <span
                  className="font-bold tabular-nums"
                  style={{ color: totalCredits < 0 ? "#ff4444" : "#ffb000" }}
                >
                  ₢{Math.max(0, totalCredits)}
                </span>
              </div>

              <div className="text-[#888]">
                {t("new_game_setup.modifiers_active")}: {selectedModifiers.length}
              </div>

            </div>

            {/* Кнопка старта */}
            <Button
              onClick={handleStart}
              className="cursor-pointer w-full sm:w-auto shrink-0 bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider px-4 sm:px-6 py-4 sm:py-5 font-bold text-sm sm:text-base"
            >
              🚀 {t("new_game_setup.start_button")}
            </Button>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
