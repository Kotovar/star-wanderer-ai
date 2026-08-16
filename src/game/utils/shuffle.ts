/**
 * Перестановка Фишера — Йетса.
 *
 * `sort(() => Math.random() - 0.5)` даёт не равномерную перестановку, а ещё и
 * непоследовательный компаратор — порядок в таком случае не определён
 * спецификацией и зависит от реализации сортировки.
 *
 * `rng` — источник случайности: по умолчанию Math.random, для детерминированных
 * данных (ассортимент станции по её seed) передаётся свой генератор.
 */
export const shuffle = <T>(
    values: readonly T[],
    rng: () => number = Math.random,
): T[] => {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(rng() * (index + 1));
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
};
