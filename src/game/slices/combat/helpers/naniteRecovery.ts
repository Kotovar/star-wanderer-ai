import { store as i18nStore } from "@/lib/useTranslation";
import type { GameState, GameStore } from "@/game/types";
import { playSound } from "@/sounds";

const NANITE_RECOVERY_HEALTH_RATIO = 0.2;
type CombatSetState = (fn: (state: GameState) => void) => void;

export const recoverModuleWithNanites = (
    moduleId: number,
    set: CombatSetState,
    get: () => GameStore,
): void => {
    const state = get();

    if (!state.research.researchedTechs.includes("nanite_hull")) {
        get().addLog(i18nStore.t("game_logs.naniteRecovery_1"), "error");
        return;
    }
    if (!state.battleResult?.victory || state.battleResult.naniteRecoveryUsed) {
        get().addLog(i18nStore.t("game_logs.naniteRecovery_2"), "error");
        return;
    }

    const destroyedModule = state.ship.modules.find(
        (candidate) => candidate.id === moduleId && candidate.health <= 0,
    );
    if (!destroyedModule) {
        get().addLog(i18nStore.t("game_logs.naniteRecovery_3"), "error");
        return;
    }

    const restoredHealth = Math.max(
        1,
        Math.ceil(destroyedModule.maxHealth * NANITE_RECOVERY_HEALTH_RATIO),
    );
    set((draft) => {
        const target = draft.ship.modules.find(
            (candidate) => candidate.id === moduleId,
        );
        if (!target || target.health > 0 || !draft.battleResult) return;

        target.health = restoredHealth;
        target.disabled = false;
        target.manualDisabled = false;
        draft.battleResult.naniteRecoveryUsed = true;
        draft.battleResult.naniteRecoveredModule = target.name;
    });

    get().updateShipStats();
    get().addLog(
        i18nStore.t("game_logs.naniteRecovery_4", {
            module_name: destroyedModule.name,
            health: restoredHealth,
        }),
        "info",
    );
    playSound("world_repair");
};
