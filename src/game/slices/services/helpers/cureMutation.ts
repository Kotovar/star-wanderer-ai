import { store as i18nStore } from "@/lib/useTranslation";
import { getCrewDisplayName } from "@/game/crew/crewNames";
import type { GameStore, SetState } from "@/game/types";
import { MUTATION_CURE_PRICE } from "../constants";

/**
 * Лечит одну мутацию у члена экипажа на медицинской станции.
 * Требует технологию "Ксенобиология" и достаточно кредитов.
 *
 * @param crewId - ID члена экипажа
 * @param traitId - ID мутации для лечения
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const cureMutation = (
    crewId: number,
    traitId: string,
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();

    // Гейт продублирован из UI: лечение мутаций требует "Ксенобиологию"
    if (!state.research.researchedTechs.includes("xenobiology")) {
        get().addLog( i18nStore.t("game_logs.cureMutation_1"),
            "error",
        );
        return;
    }

    if (state.credits < MUTATION_CURE_PRICE) {
        get().addLog( i18nStore.t("game_logs.cureMutation_2"), "error");
        return;
    }

    const crewMember = state.crew.find((c) => c.id === crewId);
    if (!crewMember) return;

    const mutation = crewMember.traits.find((t) => t.id === traitId && t.type === "mutation");
    if (!mutation) return;

    set((s) => ({
        credits: s.credits - MUTATION_CURE_PRICE,
        crew: s.crew.map((c) => {
            if (c.id !== crewId) return c;
            const updated = {
                ...c,
                traits: c.traits.filter((t) => t.id !== traitId),
            };
            // Возвращаем максимум здоровья, срезанный мутацией.
            // ponytail: ceil, а не round — срезали через floor, поэтому деление
            // обратно даёт число не больше исходного; ceil никогда не завысит
            // максимум и теряет меньше, чем round. Точное восстановление
            // потребовало бы хранить снятые HP в самом трейте — сейчас
            // максимум растёт ещё и от тренировок на планетах, так что
            // пересчитать его из расы/уровня/трейтов нельзя.
            const penalty = mutation.effect?.healthPenalty;
            if (penalty && penalty < 1) {
                updated.maxHealth = Math.ceil(
                    updated.maxHealth / (1 - penalty),
                );
            }
            return updated;
        }),
    }));

    get().addLog( i18nStore.t("game_logs.cureMutation_3", { mutation_name: mutation.name, crewMember_name: getCrewDisplayName(crewMember), MUTATION_CURE_PRICE }),
        "info",
    );
};
