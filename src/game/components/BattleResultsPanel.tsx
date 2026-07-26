"use client";

import { useGameStore } from "../store";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";
import { RESEARCH_RESOURCES } from "@/game/constants/research";
import { SectionPanel } from "./SectionPanel";

export function BattleResultsPanel() {
  const battleResult = useGameStore((s) => s.battleResult);
  const showSectorMap = useGameStore((s) => s.showSectorMap);
  const shipModules = useGameStore((s) => s.ship.modules);
  const researchedTechs = useGameStore((s) => s.research.researchedTechs);
  const recoverModuleWithNanites = useGameStore(
    (s) => s.recoverModuleWithNanites,
  );
  const { t } = useTranslation();

  if (!battleResult) {
    return null;
  }

  const destroyedModules = shipModules.filter((module) => module.health <= 0);
  const canRecoverWithNanites =
    battleResult.victory &&
    researchedTechs.includes("nanite_hull") &&
    !battleResult.naniteRecoveryUsed &&
    destroyedModules.length > 0;

  const handleContinue = () => {
    // Clear battle result and go back to sector map
    useGameStore.setState({ battleResult: null });
    showSectorMap();
  };

  return (
    <div className="bg-[rgba(0,255,65,0.1)] border-2 border-[#00ff41] p-6 max-w-lg mx-auto">
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">🏆</div>
        <h2 className="text-2xl font-bold font-['Orbitron'] text-[#00ff41]">
          {t("battle.victory")}
        </h2>
        <div className="text-[#ffb000] mt-1">
          {battleResult.enemyName}{" "}
          {t("battle.defeated").toLowerCase()}
        </div>
      </div>

      <div className="space-y-4">
        {/* Rewards */}
        <SectionPanel>
          <div className="text-[#ffb000] font-bold mb-2">
            {t("battle_results.rewards_title")}
          </div>
          <div className="text-[#00ff41] text-lg">
            +{battleResult.creditsEarned}₢ {t("battle.credits")}
          </div>
          {battleResult.artifactFound && (
            <div className="text-[#ff00ff] mt-2">
              ★ {t("battle.artifact")}:{" "}
              {battleResult.artifactFound}
            </div>
          )}
          {battleResult.researchResources &&
            battleResult.researchResources.length > 0 && (
              <div className="text-[#00d4ff] mt-2 space-y-1">
                {battleResult.researchResources.map(
                  (res, idx) => {
                    const resData =
                      RESEARCH_RESOURCES[
                      res.type as keyof typeof RESEARCH_RESOURCES
                      ];
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2"
                      >
                        <span>
                          {resData?.icon || "🔧"}
                        </span>
                        <span>
                          {resData?.name || res.type}
                        </span>
                        <span className="text-[#ffb000]">
                          +{res.quantity}
                        </span>
                      </div>
                    );
                  },
                )}
              </div>
            )}
        </SectionPanel>

        {/* Module damage */}
        {(battleResult.modulesDamaged.length > 0 ||
          battleResult.modulesDestroyed.length > 0) && (
            <div className="bg-[rgba(255,0,64,0.1)] border border-[#ff0040] p-4">
              <div className="text-[#ff0040] font-bold mb-2">
                {t("battle_results.module_damage_title")}
              </div>
              {battleResult.modulesDestroyed.length > 0 && (
                <div className="text-[#ff0040] mb-2">
                  💀 {t("battle.destroyed")}:{" "}
                  {battleResult.modulesDestroyed.join(", ")}
                </div>
              )}
              {battleResult.modulesDamaged.filter(
                (m) =>
                  !battleResult.modulesDestroyed.includes(m.name),
              ).length > 0 && (
                  <div className="text-[#ffaa00]">
                    {battleResult.modulesDamaged
                      .filter(
                        (m) =>
                          !battleResult.modulesDestroyed.includes(
                            m.name,
                          ),
                      )
                      .map((m) => `${m.name}: -${m.damage}%`)
                      .join(" | ")}
                  </div>
                )}
            </div>
          )}

        {(canRecoverWithNanites || battleResult.naniteRecoveredModule) && (
          <SectionPanel>
            <div className="text-[#00d4ff] font-bold mb-1">
              {t("battle_results.nanite_recovery_title")}
            </div>
            {battleResult.naniteRecoveredModule ? (
              <div className="text-sm text-[#00ff41]">
                {t("battle_results.nanite_recovered", {
                  module: battleResult.naniteRecoveredModule,
                })}
              </div>
            ) : (
              <>
                <div className="text-sm text-[#888] mb-3">
                  {t("battle_results.nanite_recovery_desc")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {destroyedModules.map((module) => (
                    <Button
                      key={module.id}
                      onClick={() => recoverModuleWithNanites(module.id)}
                      className="bg-transparent border border-[#00d4ff] text-[#00d4ff] hover:bg-[#00d4ff] hover:text-[#050810] text-xs cursor-pointer"
                    >
                      {t("battle_results.nanite_recovery_button")}: {module.name}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </SectionPanel>
        )}

        {/* Crew damage */}
        {(battleResult.crewWounded.length > 0 ||
          battleResult.crewKilled.length > 0) && (
            <div className="bg-[rgba(255,100,100,0.1)] border border-[#ff6464] p-4">
              <div className="text-[#ff6464] font-bold mb-2">
                {t("battle_results.crew_losses_title")}
              </div>
              {battleResult.crewKilled.length > 0 && (
                <div className="text-[#ff0040] mb-2">
                  ☠️ {t("battle.killed")}:{" "}
                  {battleResult.crewKilled.join(", ")}
                </div>
              )}
              {battleResult.crewWounded.length > 0 && (
                <div className="text-[#ffaa00]">
                  {t("battle.wounded")}:{" "}
                  {battleResult.crewWounded
                    .map((c) => `${c.name} (-${c.damage}❤)`)
                    .join(" | ")}
                </div>
              )}
            </div>
          )}

        {/* No damage */}
        {battleResult.modulesDamaged.length === 0 &&
          battleResult.modulesDestroyed.length === 0 &&
          battleResult.crewWounded.length === 0 && (
            <div className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-4 text-center">
              <div className="text-[#00ff41]">
                {t("battle_results.battle_clean")}
              </div>
            </div>
          )}
      </div>

      <div className="mt-6 flex justify-center">
        <Button
          onClick={handleContinue}
          className="cursor-pointer bg-[#00ff41] text-[#050810] hover:bg-[#00cc33] font-bold px-8"
        >
          {t("battle.continue")}
        </Button>
      </div>
    </div>
  );
}
