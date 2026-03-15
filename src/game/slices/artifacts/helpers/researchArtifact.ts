import type { GameStore, CrewMember, SetState } from "@/game/types";
import { playSound } from "@/sounds";
import { ARTIFACT_RESEARCH_EXP_MULTIPLIER } from "@/game/constants";

/**
 * Исследует артефакт и активирует его эффект
 *
 * @param artifactId - ID артефакта для исследования
 * @param state - Текущее состояние игры
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 * @returns void
 */
export const researchArtifact = (
    artifactId: string,
    state: GameStore,
    set: SetState,
    get: () => GameStore,
): void => {
    const artifact = state.artifacts.find((a) => a.id === artifactId);

    if (!artifact) {
        get().addLog("Артефакт не найден!", "error");
        return;
    }

    if (!artifact.discovered) {
        get().addLog("Артефакт ещё не обнаружен!", "error");
        return;
    }

    if (artifact.researched) {
        get().addLog("Артефакт уже изучен!", "warning");
        return;
    }

    const scientists = state.crew.filter((c) => c.profession === "scientist");
    const maxScientistLevel =
        scientists.length > 0
            ? Math.max(...scientists.map((s) => s.level || 1))
            : 0;

    if (maxScientistLevel < artifact.requiresScientistLevel) {
        get().addLog(
            `Требуется учёный уровня ${artifact.requiresScientistLevel}!`,
            "error",
        );
        return;
    }

    // Исследуем артефакт
    set((s) => ({
        artifacts: s.artifacts.map((a) =>
            a.id === artifactId
                ? {
                      ...a,
                      researched: true,
                      effect: { ...a.effect, active: true },
                  }
                : a,
        ),
    }));

    playSound("success");
    get().addLog(`★ ${artifact.name} изучен и активирован!`, "info");
    get().addLog(`Эффект: ${artifact.description}`, "info");

    // Начисляем опыт учёным
    giveExperienceToScientists(
        scientists,
        artifact.requiresScientistLevel,
        get,
    );
};

/**
 * Начисляет опыт учёным за исследование артефакта
 *
 * @param scientists - Список учёных для начисления опыта
 * @param requiredLevel - Требуемый уровень артефакта
 * @param get - Функция получения состояния
 */
const giveExperienceToScientists = (
    scientists: CrewMember[],
    requiredLevel: number,
    get: () => GameStore,
): void => {
    const expAmount = requiredLevel * ARTIFACT_RESEARCH_EXP_MULTIPLIER;
    scientists.forEach((s) => get().gainExp(s, expAmount));
};
