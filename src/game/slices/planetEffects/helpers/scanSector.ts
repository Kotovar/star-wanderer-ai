import { PLANET_SPECIALIZATIONS } from "@/game/constants";
import {
    getArchiveHintLocations,
    getRandomUndiscoveredArtifact,
} from "@/game/artifacts/utils";
import type { Artifact, GameStore, SetState } from "@/game/types";
import { store as i18nStore } from "@/lib/useTranslation";
import { playSound } from "@/sounds";

/**
 * Сканирует сектор и открывает все локации (эффект архивов синтетиков)
 * Также добавляет в лог подсказки о ближайших боссах и аномалиях с артефактами
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

    const artifactHintEffect = PLANET_SPECIALIZATIONS.synthetic.effects.find(
        (effect) => effect.type === "artifact_hints",
    );
    const artifactHintCount =
        typeof artifactHintEffect?.value === "number"
            ? artifactHintEffect.value
            : 0;
    const hintLocations = getArchiveHintLocations(
        state.galaxy.sectors,
        state.currentSector?.id,
    );
    const bossHint = hintLocations.find(
        (location) => location.locationType === "boss",
    );
    const anomalyHint = hintLocations.find(
        (location) => location.locationType === "anomaly",
    );

    let hintCandidates = state.artifacts.filter(
        (artifact) => !artifact.discovered && !artifact.hinted,
    );
    const hintedArtifactIds = new Set<string>();
    const hintedArtifactLocations = new Map<
        string,
        NonNullable<Artifact["hintedAt"]>
    >();

    while (
        hintedArtifactIds.size < artifactHintCount &&
        hintCandidates.length > 0
    ) {
        const artifact = getRandomUndiscoveredArtifact(hintCandidates);
        if (!artifact) break;

        const hintLocation =
            hintLocations.length > 0
                ? hintLocations[hintedArtifactIds.size % hintLocations.length]
                : undefined;
        hintedArtifactIds.add(artifact.id);
        if (hintLocation) {
            hintedArtifactLocations.set(artifact.id, hintLocation);
        }
        hintCandidates = hintCandidates.filter(
            (candidate) => candidate.id !== artifact.id,
        );
    }

    // Открываем все локации в текущем секторе и сохраняем в galaxy.sectors
    set((s) => ({
        credits: s.credits - cost,
        artifacts: s.artifacts.map((artifact) =>
            hintedArtifactIds.has(artifact.id)
                ? {
                      ...artifact,
                      hinted: true,
                      hintSource: "archives",
                      ...(hintedArtifactLocations.has(artifact.id)
                          ? {
                                hintedAt: hintedArtifactLocations.get(
                                    artifact.id,
                                ),
                            }
                          : {}),
                  }
                : artifact,
        ),
        currentSector: s.currentSector
            ? {
                  ...s.currentSector,
                  locations: s.currentSector.locations.map((loc) => ({
                      ...loc,
                      signalRevealed: true,
                  })),
              }
            : null,
        galaxy: s.currentSector
            ? {
                  ...s.galaxy,
                  sectors: s.galaxy.sectors.map((sec) =>
                      sec.id === s.currentSector?.id
                          ? {
                                ...sec,
                                locations: sec.locations.map((loc) => ({
                                    ...loc,
                                    signalRevealed: true,
                                })),
                            }
                          : sec,
                  ),
              }
            : s.galaxy,
    }));

    get().addLog(
        `📚 Архивы синтетиков: все локации в секторе отсканированы!`,
        "info",
    );

    if (hintedArtifactIds.size > 0) {
        get().addLog(
            `📡 ${i18nStore.t("planet_effects.effects.artifact_hints", { value: hintedArtifactIds.size })}`,
            "info",
        );
    }

    if (bossHint) {
        get().addLog(
            `🔍 Разведданные: в секторе "${bossHint.sectorName}" обнаружен мощный сигнал (${bossHint.locationName}) — возможно наличие ценных артефактов`,
            "warning",
        );
    }

    if (anomalyHint) {
        get().addLog(
            `🔍 Разведданные: в секторе "${anomalyHint.sectorName}" зафиксированы аномальные сигналы — рекомендуется исследование`,
            "warning",
        );
    }

    if (!bossHint && !anomalyHint) {
        get().addLog(
            `🔍 Разведданные: необычных сигналов в близлежащих секторах не обнаружено`,
            "info",
        );
    }

    playSound("success");
    return true;
};
