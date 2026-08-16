export const WANTED_CHECKPOINT_HEAT = 50;
export const WANTED_PURSUIT_HEAT = 75;
export const WANTED_HEAT_AFTER_PURSUIT = 25;

/**
 * Розыск за контрабанду считается по тоннажу, а не за нажатие кнопки: 4 за
 * стандартную партию в 5т. Раньше он был фиксированным за сделку, и 30т одной
 * покупкой стоили столько же, сколько одна тонна.
 */
export const CONTRABAND_HEAT_PER_5T = 4;

/**
 * Досмотр снимает подозрение, но не обнуляет его. Раньше он сбрасывал розыск
 * в 45 при любом исходном значении, и одна тонна контрабанды превращала
 * розыск 100 в 45 бесплатно — верхняя половина шкалы не существовала.
 */
export const WANTED_CHECKPOINT_RELIEF = 20;

/** Уход от охотников не бесплатен: погоня попадает в сводки. */
export const WANTED_HEAT_ON_PURSUIT_ESCAPE = 10;

/** Трофей с чужого корабля везёт на себе чужие серийники. */
export const TROPHY_PURCHASE_HEAT = 5;

export const clampWantedHeat = (heat: number): number =>
    Math.max(0, Math.min(100, Math.round(heat)));

export const getContrabandHeat = (quantity: number): number =>
    Math.max(1, Math.round((quantity / 5) * CONTRABAND_HEAT_PER_5T));

/**
 * Розыск после досмотра: фиксированное послабление плюс — если груз сброшен —
 * ровно тот след, который эта контрабанда оставила бы при сделке. Сбрасывать
 * полный трюм выгоднее, чем одну тонну для галочки.
 */
export const getHeatAfterCheckpoint = (
    heat: number,
    dumpedTons = 0,
): number =>
    clampWantedHeat(
        heat -
            WANTED_CHECKPOINT_RELIEF -
            (dumpedTons > 0 ? getContrabandHeat(dumpedTons) : 0),
    );

export const isWantedCheckpointRequired = (heat: number): boolean =>
    heat >= WANTED_CHECKPOINT_HEAT;

export const canFightWantedPursuit = (heat: number): boolean =>
    heat >= WANTED_PURSUIT_HEAT;

export const getWantedBribeCost = (heat: number): number =>
    200 + Math.max(0, heat - (WANTED_CHECKPOINT_HEAT - 1)) * 15;
