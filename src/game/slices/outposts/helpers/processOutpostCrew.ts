import { store as i18nStore } from "@/lib/useTranslation";
import {
    OUTPOST_CREW_EXP,
    OUTPOST_ISOLATION_INTERVAL,
    OUTPOST_ISOLATION_MORALE,
    OUTPOST_ROLE,
} from "@/game/constants/outposts";
import { shiftHappiness } from "@/game/crew";
import type { GameStore, SetState } from "@/game/types";

/**
 * Ход приписанного экипажа: работа даёт опыт, одиночество бьёт по морали.
 *
 * Мораль трогаем через `shiftHappiness`, а не напрямую: она уже знает, что
 * синтетикам её не считают, а отшельник из «Одиночной ходки» к изоляции
 * невосприимчив — на аванпосте этот модификатор впервые становится плюсом,
 * а не только ограничением.
 */
export function processOutpostCrew(set: SetState, get: () => GameStore): void {
    const state = get();
    const stationed = state.crew.filter((member) => member.outpostId);
    if (stationed.length === 0) return;

    for (const member of stationed) {
        const outpost = state.outposts.find((o) => o.id === member.outpostId);
        // Под рейдерами человек не работает, а сидит: опыта за это нет.
        // Одиночество при этом никуда не девается — скорее наоборот
        if (!outpost || outpost.capturedAtTurn !== undefined) continue;
        const onRole = member.profession === OUTPOST_ROLE[outpost.kind];
        get().gainExp(member, onRole ? OUTPOST_CREW_EXP.onRole : OUTPOST_CREW_EXP.offRole);
    }

    if (state.turn % OUTPOST_ISOLATION_INTERVAL !== 0) return;

    const lonely: string[] = [];
    set((s) => ({
        crew: s.crew.map((member) => {
            if (!member.outpostId) return member;
            const shifted = shiftHappiness(member, -OUTPOST_ISOLATION_MORALE);
            if (shifted.happiness < member.happiness) lonely.push(member.name);
            return shifted;
        }),
    }));

    if (lonely.length > 0) {
        get().addLog(
            i18nStore.t("game_logs.outpost_isolation", {
                names: lonely.join(", "),
            }),
            "warning",
        );
    }
}
