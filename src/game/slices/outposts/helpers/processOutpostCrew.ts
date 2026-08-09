import { store as i18nStore } from "@/lib/useTranslation";
import { getCrewDisplayName } from "@/game/crew/crewNames";
import {
    OUTPOST_CREW_EXP,
    OUTPOST_ISOLATION_INTERVAL,
    OUTPOST_ISOLATION_MORALE,
    OUTPOST_ROLE,
} from "@/game/constants/outposts";
import {
    getPlanetHazard,
    PLANET_HAZARD_INTERVAL,
} from "@/game/constants/planetHazards";
import { shiftHappiness } from "@/game/crew";
import { hasBaseService } from "./baseServices";
import type { GameStore, SetState } from "@/game/types";

/**
 * Планета бьёт по гарнизону: радиация не разбирает, кто там дежурит.
 *
 * Медблок снимает урон целиком — не потому, что лечит быстрее, чем облучает,
 * а потому что это единственное место в системе, где тип планеты заставляет
 * потратить слот. Без гарнизона беда не наступает вовсе: страдать некому,
 * зато база работает на 0.7, и слот всё равно уходит — только на людей.
 */
function processHazardHarm(set: SetState, get: () => GameStore): void {
    const state = get();
    if (state.turn % PLANET_HAZARD_INTERVAL !== 0) return;

    const harmed = new Map<string, number>();
    for (const outpost of state.outposts ?? []) {
        const planetType = (state.galaxy?.sectors ?? [])
            .find((s) => s.id === outpost.sectorId)
            ?.locations.find((l) => l.id === outpost.locationId)?.planetType;
        const hazard = getPlanetHazard(planetType);
        if (!hazard?.crewDamage) continue;
        if (hasBaseService(outpost, hazard.answeredBy ?? "heal")) continue;
        harmed.set(outpost.id, hazard.crewDamage);
    }
    if (harmed.size === 0) return;

    const hurt: string[] = [];
    set((s) => ({
        crew: s.crew.map((member) => {
            const damage = member.outpostId
                ? harmed.get(member.outpostId)
                : undefined;
            if (!damage) return member;
            hurt.push(getCrewDisplayName(member));
            return { ...member, health: Math.max(1, member.health - damage) };
        }),
    }));

    if (hurt.length > 0) {
        get().addLog(
            i18nStore.t("game_logs.outpost_hazard_harm", {
                names: hurt.join(", "),
            }),
            "warning",
        );
    }
}

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

    processHazardHarm(set, get);

    if (state.turn % OUTPOST_ISOLATION_INTERVAL !== 0) return;

    // Медблок на базе — это жилые условия, а не только койка для раненых:
    // при нём человека можно оставить надолго, и «оставить отдыхать»
    // становится осмысленным решением, а не эвфемизмом для забыть
    const cared = new Set(
        state.outposts
            .filter((outpost) => hasBaseService(outpost, "heal"))
            .map((outpost) => outpost.id),
    );

    const lonely: string[] = [];
    set((s) => ({
        crew: s.crew.map((member) => {
            if (!member.outpostId) return member;
            if (cared.has(member.outpostId)) {
                // Не просто без штрафа: здесь человек восстанавливается
                return shiftHappiness(member, OUTPOST_ISOLATION_MORALE);
            }
            const shifted = shiftHappiness(member, -OUTPOST_ISOLATION_MORALE);
            if (shifted.happiness < member.happiness) lonely.push(getCrewDisplayName(member));
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
