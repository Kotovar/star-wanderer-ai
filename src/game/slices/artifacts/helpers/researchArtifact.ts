import { store as i18nStore } from "@/lib/useTranslation";
import type { GameStore, CrewMember, SetState } from "@/game/types";
import { playSound } from "@/sounds";
import { ARTIFACT_RESEARCH_EXP_MULTIPLIER } from "@/game/constants";
import { getTechBonusSum } from "@/game/research";
import { DEFAULT_ARTIFACT_SLOTS } from "../constants";

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
        get().addLog( i18nStore.t("game_logs.researchArtifact_1"), "error");
        return;
    }

    if (!artifact.discovered) {
        get().addLog( i18nStore.t("game_logs.researchArtifact_2"), "error");
        return;
    }

    if (artifact.researched) {
        get().addLog( i18nStore.t("game_logs.researchArtifact_3"), "warning");
        return;
    }

    const scientists = state.crew.filter((c) => c.profession === "scientist");
    const maxScientistLevel =
        scientists.length > 0
            ? Math.max(...scientists.map((s) => s.level || 1))
            : 0;

    if (maxScientistLevel < artifact.requiresScientistLevel) {
        const msg = `Требуется учёный уровня ${artifact.requiresScientistLevel}!`;
        // Попап показывает сам addLog для типа "error"
        get().addLog(msg, "error");
        playSound("error");
        return;
    }

    // Активируем только при наличии свободного слота — изучение не должно
    // обходить лимит активных артефактов (см. toggleArtifact)
    const maxSlots =
        DEFAULT_ARTIFACT_SLOTS +
        getTechBonusSum(state.research, "artifact_slots");
    const currentActive = state.artifacts.filter(
        (a) => a.effect.active,
    ).length;
    const canActivate = currentActive < maxSlots;

    // Исследуем артефакт
    set((s) => ({
        artifacts: s.artifacts.map((a) =>
            a.id === artifactId
                ? {
                      ...a,
                      researched: true,
                      effect: { ...a.effect, active: canActivate },
                  }
                : a,
        ),
    }));

    playSound("success");
    if (canActivate) {
        get().addLog( i18nStore.t("game_logs.researchArtifact_4", { artifact_name: artifact.name }), "info");
    } else {
        get().addLog( i18nStore.t("game_logs.researchArtifact_5", { artifact_name: artifact.name, currentActive, maxSlots }),
            "warning",
        );
    }
    get().addLog( i18nStore.t("game_logs.researchArtifact_6", { description: artifact.description }), "info");

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
