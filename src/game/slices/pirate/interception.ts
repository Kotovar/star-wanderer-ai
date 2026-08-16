import { store as i18nStore } from "@/lib/useTranslation";
import type { GameStore, SetState } from "@/game/types";
import { WANTED_PURSUIT_HEAT } from "./wanted";

/** Шанс перехвата на пороге розыска, при котором охотники вообще выходят */
const INTERCEPTION_CHANCE_AT_THRESHOLD = 0.2;

/** Насколько шанс дорастает к максимальному розыску (0.2 → 0.5) */
const INTERCEPTION_CHANCE_GROWTH = 0.3;

/**
 * Шанс наткнуться на охотников при прибытии в сектор.
 *
 * До порога погони охотники не выходят вовсе — розыск ниже 75 стоит только
 * досмотра на легальной станции. Выше порога шанс растёт линейно, и верхняя
 * четверть шкалы наконец что-то значит: раньше на 90 розыска можно было
 * сидеть бесконечно, просто не заходя к легальным станциям.
 */
export const getWantedInterceptionChance = (heat: number): number => {
    if (heat < WANTED_PURSUIT_HEAT) return 0;
    const progress = Math.min(
        1,
        (heat - WANTED_PURSUIT_HEAT) / (100 - WANTED_PURSUIT_HEAT),
    );
    return (
        INTERCEPTION_CHANCE_AT_THRESHOLD + progress * INTERCEPTION_CHANCE_GROWTH
    );
};

/**
 * Запускает бой с охотниками за головами. Общий путь для двух входов: игрок
 * сам идёт на прорыв через досмотр и его перехватывают на подлёте к сектору.
 * Флаг wantedPursuit обязателен — по нему playerVictory снижает розыск и не
 * помечает текущую локацию зачищенной, а completeBattleContracts не засчитывает
 * охотников ни одному контракту.
 */
export const startWantedPursuit = (
    set: SetState,
    get: () => GameStore,
    isAmbush = false,
): void => {
    const state = get();
    get().startCombat(
        {
            id: `wanted-hunters-${state.turn}`,
            type: "enemy",
            name: i18nStore.t("pirate.hunters_name"),
            enemyType: "mercenary",
            threat: Math.min(4, (state.currentSector?.tier ?? 1) + 1),
        },
        isAmbush,
    );
    set((s) => {
        if (s.currentCombat) s.currentCombat.wantedPursuit = true;
    });
};

/**
 * Перехват при прибытии в сектор. Вызывается на ВСЕХ путях прибытия — обычном
 * (processTravel) и мгновенных (тот же тир, варп в selectSector), как и
 * радиация нейтронной звезды рядом.
 *
 * Перехват — засада: охотники ждали, а не встретились случайно, поэтому первый
 * ход за ними и сбежать сразу нельзя. Этим он и отличается от прорыва через
 * досмотр, на который игрок идёт сам и подготовленным.
 */
export const rollWantedInterception = (
    set: SetState,
    get: () => GameStore,
    random: () => number = Math.random,
): boolean => {
    const state = get();
    // В бою и в перелёте перехвату взяться неоткуда: сюда приходят только с
    // карты сектора, но проверка дешевле, чем разбираться с гонкой состояний
    if (state.currentCombat || state.traveling) return false;
    if (random() >= getWantedInterceptionChance(state.wantedHeat ?? 0)) {
        return false;
    }

    get().addLog(i18nStore.t("pirate.hunters_intercept"), "error");
    startWantedPursuit(set, get, true);
    return true;
};
