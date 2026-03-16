import type { GameStore, SetState } from "@/game/types";
import { playSound } from "@/sounds";

/**
 * Сообщение о победе в игре
 * @param turn - Количество сделанных ходов
 * @param captainLevel - Уровень капитана
 * @param discoveredArtifacts - Количество найденных артефактов
 * @param sectorsExplored - Количество исследованных секторов
 * @returns Форматированное сообщение о победе
 */
const getVictoryMessage = (
    turn: number,
    captainLevel: number,
    discoveredArtifacts: number,
    sectorsExplored: number,
) => `🎉 Поздравляем! Вы достигли границы галактики!

📊 ИТОГИ ИГРЫ:
• Ходов сделано: ${turn}
• Уровень капитана: ${captainLevel}
• Найдено артефактов: ${discoveredArtifacts}
• Исследовано секторов: ${sectorsExplored}

Вы одни из первых, кто достиг Тир 4 - границы известной галактики.
Квантовый двигатель привёл вас сюда, к краю космоса.
Что ждёт за этой гранью? Это уже другая история...`;

/**
 * Активирует состояние победы в игре
 * @param set - Функция обновления состояния
 * @param get - Функция получения текущего состояния
 */
export const triggerVictory = (set: SetState, get: () => GameStore): void => {
    const state = get();

    if (state.gameVictory) {
        return;
    }

    const captainLevel =
        state.crew.find((c) => c.profession === "pilot")?.level ?? 1;
    const discoveredArtifacts = state.artifacts.filter(
        (a) => a.discovered,
    ).length;
    const sectorsExplored = state.galaxy.sectors.filter(
        (s) => s.visited,
    ).length;

    set({
        gameVictory: true,
        gameVictoryReason: getVictoryMessage(
            state.turn,
            captainLevel,
            discoveredArtifacts,
            sectorsExplored,
        ),
    });

    get().addLog("🎉 ПОБЕДА! Граница галактики достигнута!", "info");
    playSound("success");
};
