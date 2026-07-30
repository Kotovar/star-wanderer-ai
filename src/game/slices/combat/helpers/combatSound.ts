import { playSound, type SoundId } from "@/sounds";

/**
 * Бой резолвится синхронно, а кинематика проигрывает те же события заметно
 * позже — из-за этого весь залп звучал разом ещё до анимации. Пока идёт резолв
 * с таймлайном, звук глушится: его отыграет сцена по событиям.
 *
 * ponytail: один флаг вместо проброса timeline через десяток функций резолва
 * (applyDamageToEnemy и соседи его не принимают). Резолв синхронный и
 * однопоточный, поэтому флаг не может протечь между ходами.
 */
let deferred = false;

export function deferCombatSound<T>(run: () => T): T {
    deferred = true;
    try {
        return run();
    } finally {
        deferred = false;
    }
}

/** Звук боя, который умеет отыграть кинематика. Молчит во время резолва. */
export function playCombatSound(id: SoundId): void {
    if (!deferred) playSound(id);
}
