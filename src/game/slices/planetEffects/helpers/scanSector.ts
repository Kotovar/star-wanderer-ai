import { PLANET_SPECIALIZATIONS } from "@/game/constants";
import type { GameStore, SetState } from "@/game/types";
import { playSound } from "@/sounds";

/**
 * Сканирует сектор и открывает все локации (эффект архивов синтетиков)
 * Также добавляет в лог подсказки о ближайших боссах и аномалиях с артефактами
 *
 * @param set - Функция обновления состояния
 * @param get - Функция получения текущего состояния
 * @returns true если сканирование успешно, false иначе
 */
export const scanSector = (set: SetState, get: () => GameStore): boolean => {
    const state = get();
    const cost = PLANET_SPECIALIZATIONS.synthetic.cost;

    if (state.credits < cost) {
        get().addLog("Недостаточно кредитов для сканирования!", "error");
        return false;
    }

    // Открываем все локации в текущем секторе и сохраняем в galaxy.sectors
    set((s) => ({
        credits: s.credits - cost,
        currentSector: s.currentSector
            ? {
                  ...s.currentSector,
                  locations: s.currentSector.locations.map((loc) => ({
                      ...loc,
                      signalRevealed: true,
                  })),
              }
            : null,
        galaxy: s.currentSector
            ? {
                  ...s.galaxy,
                  sectors: s.galaxy.sectors.map((sec) =>
                      sec.id === s.currentSector?.id
                          ? {
                                ...sec,
                                locations: sec.locations.map((loc) => ({
                                    ...loc,
                                    signalRevealed: true,
                                })),
                            }
                          : sec,
                  ),
              }
            : s.galaxy,
    }));

    get().addLog(
        `📚 Архивы синтетиков: все локации в секторе отсканированы!`,
        "info",
    );

    // Ищем секторы с боссами (гарантированные артефакты) и аномалиями
    const allSectors = state.galaxy.sectors;

    // Ближайший сектор с боссом (не побеждённым)
    const bossHint = allSectors
        .filter((sec) =>
            sec.locations.some((l) => l.type === "boss" && !l.bossDefeated),
        )
        .sort((a, b) => a.danger - b.danger)[0];

    // Ближайший сектор с аномалиями
    const anomalyHint = allSectors
        .filter((sec) => sec.locations.some((l) => l.type === "anomaly"))
        .filter((sec) => sec.id !== state.currentSector?.id)
        .sort((a, b) => a.danger - b.danger)[0];

    if (bossHint) {
        const bossLoc = bossHint.locations.find(
            (l) => l.type === "boss" && !l.bossDefeated,
        );
        get().addLog(
            `🔍 Разведданные: в секторе "${bossHint.name}" обнаружен мощный сигнал (${bossLoc?.name ?? "неизвестный объект"}) — возможно наличие ценных артефактов`,
            "warning",
        );
    }

    if (anomalyHint) {
        get().addLog(
            `🔍 Разведданные: в секторе "${anomalyHint.name}" зафиксированы аномальные сигналы — рекомендуется исследование`,
            "warning",
        );
    }

    if (!bossHint && !anomalyHint) {
        get().addLog(
            `🔍 Разведданные: необычных сигналов в близлежащих секторах не обнаружено`,
            "info",
        );
    }

    playSound("success");
    return true;
};
