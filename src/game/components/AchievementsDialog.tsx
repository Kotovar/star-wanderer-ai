"use client";

import { useTranslation } from "@/lib/useTranslation";
import { AchievementsPanel } from "./AchievementsPanel";

interface AchievementsDialogProps {
  onClose: () => void;
}

export function AchievementsDialog({ onClose }: AchievementsDialogProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.9)] z-50 flex items-center justify-center p-4">
      <div className="bg-[#0a0f1a] border-2 border-[#00ff41] max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-[#00ff41] shrink-0">
          <h2 className="font-['Orbitron'] text-xl font-bold text-[#00ff41]">
            🏆 {t("achievements.panel_title")}
          </h2>
          <button
            onClick={onClose}
            className="text-[#ff0040] hover:text-white text-2xl font-bold cursor-pointer px-2"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto p-4 flex-1">
          <AchievementsPanel />
        </div>
      </div>
    </div>
  );
}
