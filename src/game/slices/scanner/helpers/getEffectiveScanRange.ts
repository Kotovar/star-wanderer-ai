import { ARTIFACT_TYPES } from "@/game/constants";
import { getRelayScanBonus } from "@/game/slices/outposts/helpers/baseServices";
import { findActiveArtifact, getArtifactEffectValue } from "@/game/artifacts";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";
import { getStarTypeEffect } from "@/game/constants/starEffects";
import { getSectorRule } from "@/game/galaxy/sectorRules";
import { getRegularScannerRange } from "./getRegularScannerRange";
import type { GameState } from "@/game/types";

/**
 * Вычисляет эффективный диапазон сканирования корабля
 *
 * Возвращает числовое значение диапазона сканирования со всеми бонусами
 * Учитывает:
 * - Модули сканеров (должны быть активны и не повреждены)
 * - Артефакт "quantum_scan" - даёт +5 к range (требует модуль сканера)
 * - Технологии на scan_range
 * - Расовый бонус "resonance" (кристаллический резонанс) - увеличивает artifact effects
 *
 * @param state - Текущее состояние игры
 * @returns Эффективный диапазон сканирования (0 если нет сканеров)
 */
export const getEffectiveScanRange = (state: GameState) => {
    if (getSectorRule(state.currentSector?.ruleId)?.restrictions?.noScan) {
        return 0;
    }

    const isActive = (m: { health: number; disabled?: boolean; manualDisabled?: boolean }) =>
        m.health > 0 && !m.disabled && !m.manualDisabled;

    const regularScanners = state.ship.modules.filter(
        (m) => m.type === "scanner" && isActive(m),
    );
    const surveyScanners = state.ship.modules.filter(
        (m) => m.type === "deep_survey_array" && isActive(m),
    );
    const surveyBonus = surveyScanners.reduce((sum, m) => sum + (m.scanRange ?? 0), 0);
    const eyeOfSingularity = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.EYE_OF_SINGULARITY,
    );
    const eyeRange = eyeOfSingularity?.scanRange ?? 0;

    if (regularScanners.length === 0 && surveyBonus === 0) {
        return eyeRange;
    }

    // Око Сингулярности заменяет сканер диапазона 8, не становясь отдельным бонусом.
    const scannerRange = getRegularScannerRange(
        regularScanners,
        state.research,
    );
    const baseRange = Math.max(eyeRange, scannerRange);
    let maxRange = baseRange + surveyBonus;
    const quantumScanner = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.QUANTUM_SCANNER,
    );

    // Кристаллический резонанс (+15% к эффектам артефактов) уже сидит внутри
    // getArtifactEffectValue — отдельного слагаемого здесь быть не должно,
    // раньше оно накидывало бонус второй раз поверх уже усиленного значения
    if (quantumScanner) {
        maxRange += getArtifactEffectValue(quantumScanner, state);
    }

    // Бонус от сращивания ксеноморфа с scanner — плоское добавление клеток
    // (scanRange в игре измеряется целыми клетками: пороги 3/5/8/15)
    const mergeBonus = getMergeEffectsBonus(state.crew, state.ship.modules);
    if (mergeBonus.scanRange) {
        maxRange += mergeBonus.scanRange;
    }

    // Бонус/колебание от типа звезды текущего сектора (белый карлик,
    // переменная звезда). Колебание детерминировано по номеру хода, а не
    // Math.random() — эта функция читается многократно за один ход из
    // разных мест (UI, проверки обнаружения), и все вызовы должны видеть
    // одно и то же значение в пределах хода.
    if (state.currentSector) {
        const starEffect = getStarTypeEffect(state.currentSector.star.type);
        if (starEffect.scanRangeBonus) {
            maxRange += starEffect.scanRangeBonus;
        }
        if (starEffect.scanRangeJitter) {
            maxRange += Math.round(Math.sin(state.turn) * starEffect.scanRangeJitter);
        }
    }

    // Ретранслятор на базе работает откуда угодно: в этом и смысл — он
    // расширяет вашу картину галактики, пока вы летаете где-то ещё
    maxRange += getRelayScanBonus(state.outposts ?? []);

    return maxRange;
};
