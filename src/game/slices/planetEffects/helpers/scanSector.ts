import { PLANET_SPECIALIZATIONS } from "@/game/constants";
import type { GameStore, SetState } from "@/game/types";
import { playSound } from "@/sounds";

/**
 * Сканирует сектор и открывает все локации (эффект архивов синтетиков)
 * Также находит 3 подсказки о артефактах
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

    // Открываем все локации в текущем секторе
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
    }));

    get().addLog(
        `📚 Архивы синтетиков: все локации в секторе отсканированы!`,
        "info",
    );

    // Находим 3 случайных артефакта и показываем их общее местоположение
    // TODO: реализовать
    const undiscoveredArtifacts = state.artifacts.filter(
        (a) => !a.discovered && a.id !== "ai_core",
    );

    if (undiscoveredArtifacts.length > 0) {
        const hintsCount = Math.min(3, undiscoveredArtifacts.length);
        const hints: string[] = [];

        for (let i = 0; i < hintsCount; i++) {
            const artifact = undiscoveredArtifacts[i];
            hints.push(`${artifact.name}`);

            // Отмечаем как "подсказано" (не открыто, но игрок знает о нём)
            set((s) => ({
                artifacts: s.artifacts.map((a) =>
                    a.id === artifact.id ? { ...a, hinted: true } : a,
                ),
            }));
        }

        get().addLog(`💡 Подсказки об артефактах: ${hints.join(", ")}`, "info");
    }

    playSound("success");
    return true;
};
