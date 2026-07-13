import { SPACE_MONSTERS } from "@/game/constants/spaceMonsters";
import { grantTimedEffect } from "@/game/effects/timedEffects";
import type { GameStore, SetState } from "@/game/types";
import { store as i18nStore } from "@/lib/useTranslation";

export const resonateWithSpaceMonster = (
    set: SetState,
    get: () => GameStore,
): void => {
    const location = get().currentLocation;
    if (
        !location ||
        location.type !== "space_monster" ||
        location.spaceMonsterResolved === "hunted" ||
        !location.spaceMonsterType
    ) {
        return;
    }

    const state = get();
    const monster = SPACE_MONSTERS[location.spaceMonsterType];
    if (state.activeEffects.some((effect) => effect.definitionId === monster.resonanceEffect)) {
        get().addLog(
            i18nStore.t("space_monsters.logs.resonance_active"),
            "info",
        );
        return;
    }

    if (state.probes < 1) {
        get().addLog(
            i18nStore.t("space_monsters.logs.insufficient_probes"),
            "warning",
        );
        return;
    }

    set({ probes: state.probes - 1, gameMode: "sector_map" });

    get().addLog(
        i18nStore.t("space_monsters.logs.resonance", {
            name: i18nStore.t(monster.nameKey),
        }),
        "info",
    );
    grantTimedEffect(monster.resonanceEffect, set, get);
};
