"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/useTranslation";
import { Button } from "@/components/ui/button";

interface HelpPanelProps {
  onClose: () => void;
}

type TabId = "basics" | "ship" | "crew" | "gameplay" | "locations";

export function HelpPanel({ onClose }: HelpPanelProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>("basics");

  const tabs: { id: TabId; labelKey: string; color: string }[] = [
    { id: "basics", labelKey: "help.tab_basics", color: "#00d4ff" },
    { id: "ship", labelKey: "help.tab_ship", color: "#00ff41" },
    { id: "crew", labelKey: "help.tab_crew", color: "#ffb000" },
    { id: "gameplay", labelKey: "help.tab_gameplay", color: "#ff0040" },
    { id: "locations", labelKey: "help.tab_locations", color: "#9933ff" },
  ];

  const activeColor = tabs.find((tab) => tab.id === activeTab)?.color ?? "#00d4ff";

  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.9)] z-50 flex items-center justify-center p-4">
      <div className="bg-[#0a0f1a] border-2 border-[#00d4ff] max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[#00d4ff] shrink-0">
          <h2 className="font-['Orbitron'] text-xl font-bold text-[#00d4ff]">
            {t("help.title")}
          </h2>
          <button
            onClick={onClose}
            className="text-[#ff0040] hover:text-white text-2xl font-bold cursor-pointer px-2"
          >
            ✕
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex shrink-0 border-b border-[#00d4ff]">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 px-2 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                style={{
                  color: isActive ? tab.color : "#555",
                  borderBottom: isActive
                    ? `2px solid ${tab.color}`
                    : "2px solid transparent",
                  background: isActive
                    ? `rgba(${hexToRgb(tab.color)}, 0.08)`
                    : "transparent",
                }}
              >
                {t(tab.labelKey)}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 space-y-6 text-sm flex-1">
          {activeTab === "basics" && (
            <>
              <section>
                <h3 className="text-[#ffb000] font-bold text-lg mb-2">
                  {t("help.about_title")}
                </h3>
                <p className="text-[#aaa]">{t("help.about_text")}</p>
              </section>

              <section>
                <h3 className="text-[#00d4ff] font-bold text-lg mb-2">
                  {t("help.controls_title")}
                </h3>
                <p className="text-[#aaa] text-xs">
                  {t("help.controls_text")}
                </p>
              </section>

              <section>
                <h3 className="text-[#00ff41] font-bold text-lg mb-2">
                  {t("help.animations_title")}
                </h3>
                <p className="text-[#aaa] text-xs">
                  {t("help.animations_text")}
                </p>
              </section>

              <section>
                <h3 className="text-[#ffb000] font-bold text-lg mb-2">
                  {t("help.tips_title")}
                </h3>
                <ul className="text-[#888] text-xs space-y-1">
                  <li>{t("help.tip_1")}</li>
                  <li>{t("help.tip_2")}</li>
                  <li>{t("help.tip_3")}</li>
                  <li>{t("help.tip_4")}</li>
                  <li>{t("help.tip_5")}</li>
                  <li>{t("help.tip_6")}</li>
                  <li>{t("help.tip_7")}</li>
                </ul>
              </section>

              <section>
                <h3 className="text-[#ff0040] font-bold text-lg mb-2">
                  {t("help.victory_title")}
                </h3>
                <p className="text-[#888] text-xs">
                  {t("help.victory_text")}
                </p>
              </section>
            </>
          )}

          {activeTab === "ship" && (
            <>
              <section>
                <h3 className="text-[#00ff41] font-bold text-lg mb-2">
                  {t("help.modules_title")}
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-[rgba(0,255,65,0.1)] border border-[#00ff41]">
                    <span className="text-[#00ff41] font-bold">
                      {t("help.reactor")}
                    </span>
                    <p className="text-[#888]">{t("help.reactor_desc")}</p>
                  </div>
                  <div className="p-2 bg-[rgba(0,255,65,0.1)] border border-[#00ff41]">
                    <span className="text-[#00ff41] font-bold">
                      {t("help.cockpit")}
                    </span>
                    <p className="text-[#888]">{t("help.cockpit_desc")}</p>
                  </div>
                  <div className="p-2 bg-[rgba(0,255,65,0.1)] border border-[#00ff41]">
                    <span className="text-[#00ff41] font-bold">
                      {t("help.life_support")}
                    </span>
                    <p className="text-[#888]">{t("help.life_support_desc")}</p>
                  </div>
                  <div className="p-2 bg-[rgba(0,255,65,0.1)] border border-[#00ff41]">
                    <span className="text-[#00ff41] font-bold">
                      {t("help.cargo")}
                    </span>
                    <p className="text-[#888]">{t("help.cargo_desc")}</p>
                  </div>
                  <div className="p-2 bg-[rgba(0,255,65,0.1)] border border-[#00ff41]">
                    <span className="text-[#00ff41] font-bold">
                      {t("help.engine")}
                    </span>
                    <p className="text-[#888]">{t("help.engine_desc")}</p>
                  </div>
                  <div className="p-2 bg-[rgba(0,255,65,0.1)] border border-[#00ff41]">
                    <span className="text-[#00ff41] font-bold">
                      {t("help.fuel_tank")}
                    </span>
                    <p className="text-[#888]">{t("help.fuel_tank_desc")}</p>
                  </div>
                  <div className="p-2 bg-[rgba(255,0,64,0.1)] border border-[#ff0040]">
                    <span className="text-[#ff0040] font-bold">
                      {t("help.weapon_bay")}
                    </span>
                    <p className="text-[#888]">{t("help.weapon_bay_desc")}</p>
                  </div>
                  <div className="p-2 bg-[rgba(0,128,255,0.1)] border border-[#0080ff]">
                    <span className="text-[#0080ff] font-bold">
                      {t("help.shield")}
                    </span>
                    <p className="text-[#888]">{t("help.shield_desc")}</p>
                  </div>
                  <div className="p-2 bg-[rgba(0,212,255,0.1)] border border-[#00d4ff]">
                    <span className="text-[#00d4ff] font-bold">
                      {t("help.scanner")}
                    </span>
                    <p className="text-[#888] text-xs mt-1">
                      {t("help.scanner_detail_1")}
                    </p>
                    <p className="text-[#888] text-xs mt-1">
                      {t("help.scanner_detail_2")}
                    </p>
                    <ul className="text-[#888] text-xs mt-1 space-y-0.5 ml-2">
                      <li>{t("help.scanner_detail_3")}</li>
                      <li>{t("help.scanner_detail_4")}</li>
                      <li>{t("help.scanner_detail_5")}</li>
                    </ul>
                  </div>
                  <div className="p-2 bg-[rgba(255,170,0,0.1)] border border-[#ffaa00]">
                    <span className="text-[#ffaa00] font-bold">
                      {t("help.drill")}
                    </span>
                    <p className="text-[#888]">{t("help.drill_desc")}</p>
                  </div>
                  <div className="p-2 bg-[rgba(0,255,65,0.1)] border border-[#00ff41]">
                    <span className="text-[#00ff41] font-bold">
                      {t("help.lab")}
                    </span>
                    <p className="text-[#888]">{t("help.lab_desc")}</p>
                  </div>
                  <div className="p-2 bg-[rgba(255,0,64,0.1)] border border-[#ff0040]">
                    <span className="text-[#ff0040] font-bold">
                      {t("help.medical")}
                    </span>
                    <p className="text-[#888]">{t("help.medical_desc")}</p>
                  </div>
                  <div className="p-2 bg-[rgba(0,255,65,0.1)] border border-[#00ff41]">
                    <span className="text-[#00ff41] font-bold">
                      {t("help.quarters")}
                    </span>
                    <p className="text-[#888]">{t("help.quarters_desc")}</p>
                  </div>
                  <div className="p-2 bg-[rgba(0,212,255,0.1)] border border-[#00d4ff]">
                    <span className="text-[#00d4ff] font-bold">
                      {t("help.repair_bay")}
                    </span>
                    <p className="text-[#888]">{t("help.repair_bay_desc")}</p>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-[rgba(255,176,0,0.1)] border border-[#ffb000] text-xs">
                  <div className="text-[#ffb000] font-bold mb-1">
                    {t("help.module_movement_title")}
                  </div>
                  <p className="text-[#aaa]">
                    {t("help.module_movement_text")}
                  </p>
                </div>
              </section>

              <section>
                <h3 className="text-[#00d4ff] font-bold text-lg mb-2">
                  {t("help.hybrid_modules_title")}
                </h3>
                <p className="text-[#aaa] text-xs mb-2">
                  {t("help.hybrid_modules_text")}
                </p>
                <ul className="text-[#888] text-xs space-y-1">
                  <li>{t("help.hybrid_module_bio_lab")}</li>
                  <li>{t("help.hybrid_module_pulse_drive")}</li>
                  <li>{t("help.hybrid_module_medical_corps")}</li>
                  <li>{t("help.hybrid_module_deep_survey")}</li>
                </ul>
              </section>
            </>
          )}

          {activeTab === "crew" && (
            <>
              <section>
                <h3 className="text-[#ffb000] font-bold text-lg mb-2">
                  {t("help.crew_title")}
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="p-2 bg-[rgba(255,170,0,0.1)] border border-[#ffaa00]">
                    <span className="text-[#ffaa00] font-bold">
                      {t("professions.pilot")}
                    </span>
                    <span className="text-[#888] ml-2">
                      {t("help.pilot_desc")}
                    </span>
                  </div>
                  <div className="p-2 bg-[rgba(0,255,65,0.1)] border border-[#00ff41]">
                    <span className="text-[#00ff41] font-bold">
                      {t("professions.engineer")}
                    </span>
                    <span className="text-[#888] ml-2">
                      {t("help.engineer_desc")}
                    </span>
                  </div>
                  <div className="p-2 bg-[rgba(255,0,64,0.1)] border border-[#ff0040]">
                    <span className="text-[#ff0040] font-bold">
                      {t("professions.medic")}
                    </span>
                    <span className="text-[#888] ml-2">
                      {t("help.medic_desc")}
                    </span>
                  </div>
                  <div className="p-2 bg-[rgba(0,212,255,0.1)] border border-[#00d4ff]">
                    <span className="text-[#00d4ff] font-bold">
                      {t("professions.scientist")}
                    </span>
                    <span className="text-[#888] ml-2">
                      {t("help.scientist_desc")}
                    </span>
                  </div>
                  <div className="p-2 bg-[rgba(0,128,255,0.1)] border border-[#0080ff]">
                    <span className="text-[#0080ff] font-bold">
                      {t("professions.scout")}
                    </span>
                    <span className="text-[#888] ml-2">
                      {t("help.scout_desc")}
                    </span>
                  </div>
                  <div className="p-2 bg-[rgba(255,0,64,0.1)] border border-[#ff0040]">
                    <span className="text-[#ff0040] font-bold">
                      {t("professions.gunner")}
                    </span>
                    <span className="text-[#888] ml-2">
                      {t("help.gunner_desc")}
                    </span>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-[#9933ff] font-bold text-lg mb-2">
                  {t("help.races_title")}
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="p-2 bg-[rgba(74,144,217,0.1)] border border-[#4a90d9]">
                    <span className="text-[#4a90d9] font-bold">
                      {t("races.human.name")}
                    </span>
                    <span className="text-[#888] ml-2">
                      {t("help.human_desc")}
                    </span>
                  </div>
                  <div className="p-2 bg-[rgba(0,212,255,0.1)] border border-[#00d4ff]">
                    <span className="text-[#00d4ff] font-bold">
                      {t("races.synthetic.name")}
                    </span>
                    <span className="text-[#888] ml-2">
                      {t("help.synthetic_desc")}
                    </span>
                  </div>
                  <div className="p-2 bg-[rgba(170,85,255,0.1)] border border-[#aa55ff]">
                    <span className="text-[#aa55ff] font-bold">
                      {t("races.xenosymbiont.name")}
                    </span>
                    <span className="text-[#888] ml-2">
                      {t("help.xenosymbiont_desc")}
                    </span>
                  </div>
                  <div className="p-2 bg-[rgba(255,102,0,0.1)] border border-[#ff6600]">
                    <span className="text-[#ff6600] font-bold">
                      {t("races.krylorian.name")}
                    </span>
                    <span className="text-[#888] ml-2">
                      {t("help.krylorian_desc")}
                    </span>
                  </div>
                  <div className="p-2 bg-[rgba(153,51,255,0.1)] border border-[#9933ff]">
                    <span className="text-[#9933ff] font-bold">
                      {t("races.voidborn.name")}
                    </span>
                    <span className="text-[#888] ml-2">
                      {t("help.voidborn_desc")}
                    </span>
                  </div>
                  <div className="p-2 bg-[rgba(0,255,170,0.1)] border border-[#00ffaa]">
                    <span className="text-[#00ffaa] font-bold">
                      {t("races.crystalline.name")}
                    </span>
                    <span className="text-[#888] ml-2">
                      {t("help.crystalline_desc")}
                    </span>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-[#9933ff] font-bold text-lg mb-2">
                  {t("help.augmentations_title")}
                </h3>
                <p className="text-[#aaa] text-xs mb-2">
                  {t("help.augmentations_text")}
                </p>
                <ul className="text-[#888] text-xs space-y-1">
                  <li>{t("help.augmentation_neural_reflex")}</li>
                  <li>{t("help.augmentation_nano_hands")}</li>
                  <li>{t("help.augmentation_accelerated_regen")}</li>
                  <li>{t("help.augmentation_optical_implant")}</li>
                  <li>{t("help.augmentation_memory_core")}</li>
                  <li>{t("help.augmentation_targeting_eye")}</li>
                  <li>{t("help.augmentation_overclock_core")}</li>
                  <li>{t("help.augmentation_symbiotic_armor")}</li>
                  <li>{t("help.augmentation_phase_step")}</li>
                  <li>{t("help.augmentation_prismatic_lens")}</li>
                </ul>
              </section>

              <section>
                <h3 className="text-[#9933ff] font-bold text-lg mb-2">
                  {t("help.reputation_title")}
                </h3>
                <p className="text-[#aaa] text-xs mb-2">
                  {t("help.reputation_text")}
                </p>
                <div className="mb-2 p-2 bg-[rgba(153,51,255,0.05)] border border-[#9933ff] text-xs">
                  <div className="text-[#9933ff] font-bold mb-1">
                    {t("help.reputation_levels")}
                  </div>
                  <ul className="text-[#888] space-y-0.5">
                    <li>{t("help.reputation_hostile")}</li>
                    <li>{t("help.reputation_unfriendly")}</li>
                    <li>{t("help.reputation_neutral")}</li>
                    <li>{t("help.reputation_friendly")}</li>
                    <li>{t("help.reputation_allied")}</li>
                  </ul>
                </div>
                <div className="p-2 bg-[rgba(153,51,255,0.05)] border border-[#9933ff] text-xs">
                  <div className="text-[#9933ff] font-bold mb-1">
                    {t("help.reputation_change")}
                  </div>
                  <ul className="text-[#888] space-y-0.5">
                    <li>{t("help.reputation_trade")}</li>
                    <li>{t("help.reputation_diplomacy")}</li>
                    <li>{t("help.reputation_combat")}</li>
                    <li>{t("help.reputation_relations")}</li>
                  </ul>
                </div>
              </section>
            </>
          )}

          {activeTab === "gameplay" && (
            <>
              <section>
                <h3 className="text-[#ff0040] font-bold text-lg mb-2">
                  {t("help.combat_title")}
                </h3>
                <ul className="text-[#888] text-xs space-y-1">
                  <li>{t("help.combat_text_1")}</li>
                  <li>{t("help.combat_text_2")}</li>
                  <li>{t("help.combat_text_3")}</li>
                  <li>{t("help.combat_text_4")}</li>
                  <li>{t("help.combat_text_5")}</li>
                </ul>
              </section>

              <section>
                <h3 className="text-[#9933ff] font-bold text-lg mb-2">
                  {t("help.science_title")}
                </h3>
                <p className="text-[#aaa] text-xs mb-2">
                  {t("help.science_text")}
                </p>
                <ul className="text-[#888] text-xs space-y-1">
                  <li>{t("help.science_detail_1")}</li>
                  <li>{t("help.science_detail_2")}</li>
                  <li>{t("help.science_detail_3")}</li>
                  <li>{t("help.science_detail_4")}</li>
                </ul>
              </section>

              <section>
                <h3 className="text-[#9933ff] font-bold text-lg mb-2">
                  {t("help.research_tree_title")}
                </h3>
                <p className="text-[#aaa] text-xs mb-2">
                  {t("help.research_tree_text")}
                </p>
                <ul className="text-[#888] text-xs space-y-1">
                  <li>{t("help.research_tree_detail_1")}</li>
                  <li>{t("help.research_tree_detail_2")}</li>
                  <li>{t("help.research_tree_detail_3")}</li>
                  <li>{t("help.research_tree_detail_4")}</li>
                </ul>
              </section>

              <section>
                <h3 className="text-[#ff6600] font-bold text-lg mb-2">
                  {t("help.crafting_title")}
                </h3>
                <p className="text-[#aaa] text-xs">
                  {t("help.crafting_text")}
                </p>
              </section>

              <section>
                <h3 className="text-[#ffd700] font-bold text-lg mb-2">
                  {t("help.artifacts_title")}
                </h3>
                <p className="text-[#aaa] text-xs mb-2">
                  {t("help.artifacts_text")}
                </p>
                <ul className="text-[#888] text-xs space-y-1">
                  <li>{t("help.artifacts_detail_1")}</li>
                  <li>{t("help.artifacts_detail_2")}</li>
                  <li>{t("help.artifacts_detail_3")}</li>
                  <li>{t("help.artifacts_detail_4")}</li>
                </ul>
              </section>
            </>
          )}

          {activeTab === "locations" && (
            <>
              <section>
                <h3 className="text-[#00ff41] font-bold text-lg mb-2">
                  {t("locations.gas_giant")}
                </h3>
                <p className="text-[#aaa] text-xs mb-2">
                  {t("gas_giant.description")}
                </p>
                <div className="mb-2 p-2 bg-[rgba(0,255,65,0.05)] border border-[#00ff41] text-xs">
                  <div className="text-[#00ff41] font-bold mb-1">
                    {t("help.gas_giant_dive_title")}
                  </div>
                  <ul className="text-[#888] space-y-0.5">
                    <li>{t("help.gas_giant_dive_1")}</li>
                    <li>{t("help.gas_giant_dive_2")}</li>
                    <li>{t("help.gas_giant_dive_3")}</li>
                    <li>{t("help.gas_giant_dive_4")}</li>
                  </ul>
                </div>
                <ul className="text-[#888] text-xs space-y-1">
                  <li>{t("help.gas_giant_depths")}</li>
                  <li>{t("help.gas_giant_events")}</li>
                  <li>{t("help.gas_giant_cooldown")}</li>
                </ul>
              </section>

              <section>
                <h3 className="text-[#00d4ff] font-bold text-lg mb-2">
                  {t("help.derelict_title")}
                </h3>
                <p className="text-[#aaa] text-xs mb-2">
                  {t("help.derelict_text")}
                </p>
                <ul className="text-[#888] text-xs space-y-1">
                  <li>{t("help.derelict_detail_1")}</li>
                  <li>{t("help.derelict_detail_2")}</li>
                  <li>{t("help.derelict_detail_3")}</li>
                </ul>
              </section>

              <section>
                <h3 className="text-[#00d4ff] font-bold text-lg mb-2">
                  {t("help.expedition_title")}
                </h3>
                <p className="text-[#aaa] text-xs mb-2">
                  {t("help.expedition_help_text")}
                </p>
                <div className="mb-2 p-2 bg-[rgba(0,212,255,0.05)] border border-[#00d4ff] text-xs">
                  <div className="text-[#00d4ff] font-bold mb-1">
                    {t("help.expedition_help_ap_title")}
                  </div>
                  <ul className="text-[#888] space-y-0.5">
                    <li>{t("help.expedition_help_ap_1")}</li>
                    <li>{t("help.expedition_help_ap_2")}</li>
                    <li>{t("help.expedition_help_ap_3")}</li>
                  </ul>
                </div>
                <ul className="text-[#888] text-xs space-y-1">
                  <li>{t("help.expedition_help_tiles")}</li>
                  <li>{t("help.expedition_help_fatigue")}</li>
                </ul>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t shrink-0" style={{ borderColor: activeColor }}>
          <Button
            onClick={onClose}
            className="cursor-pointer w-full bg-transparent border-2 uppercase tracking-wider"
            style={{
              borderColor: activeColor,
              color: activeColor,
            }}
          >
            {t("effects.close")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0,0,0";
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}
