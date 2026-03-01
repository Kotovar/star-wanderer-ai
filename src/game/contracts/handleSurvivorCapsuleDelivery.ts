import { CONTRACT_REWARDS } from "@/game/constants";
import { giveCrewExperience } from "@/game/crew";
import { useGameStore } from "@/game/store";
import type { ContactSourceType } from "@/game/types";

/** Название груза — капсулы с выжившими */
const SURVIVOR_CAPSULE_NAME = "Капсула с выжившими";

/** Награда по умолчанию за доставку капсулы с выжившими (кредиты) */
const DEFAULT_CAPSULE_REWARD = 150;

/**
 * Обрабатывает доставку капсулы с выжившими на станцию или планету.
 *
 * При наличии капсулы в грузовом отсеке:
 * - Удаляет капсулу из груза
 * - Начисляет награду (кредиты)
 * - Выдаёт опыт экипажу
 * - Добавляет запись в лог игры
 *
 * @param locationType - Тип места доставки (станция или планета)
 */
export const handleSurvivorCapsuleDelivery = (
    locationType: ContactSourceType,
) => {
    const state = useGameStore.getState();
    const survivorCapsuleIndex = state.ship.cargo.findIndex(
        (c) => c.item === SURVIVOR_CAPSULE_NAME,
    );

    if (survivorCapsuleIndex !== -1) {
        const capsule = state.ship.cargo[survivorCapsuleIndex];
        const reward = capsule.rewardValue ?? DEFAULT_CAPSULE_REWARD;

        useGameStore.setState((s) => ({
            credits: s.credits + reward,
            ship: {
                ...s.ship,
                cargo: s.ship.cargo.filter(
                    (_, idx) => idx !== survivorCapsuleIndex,
                ),
            },
        }));

        const expReward = CONTRACT_REWARDS.rescueSurvivors.baseExp;
        giveCrewExperience(expReward, `Экипаж получил опыт: +${expReward} ед.`);

        const locationName = locationType === "station" ? "станцию" : "планету";
        state.addLog(
            `🚀 Выжившие доставлены на ${locationName}! Награда: +${reward}₢`,
            "info",
        );
    }
};
