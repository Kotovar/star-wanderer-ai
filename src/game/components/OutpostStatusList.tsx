"use client";

import { useGameStore } from "@/game/store";
import { useTranslation } from "@/lib/useTranslation";
import { getLocationName } from "@/lib/translationHelpers";
import {
    BASE_BUNKER_CAP,
    BASE_MODULES,
} from "@/game/constants/baseModules";
import { GAS_COLLECTOR_BUNKER_CAP } from "@/game/constants/outposts";
import { getOutpostCrew } from "@/game/crew/stationed";
import {
    describeHaulResource,
    getCrewSlots,
    isBunkerFull,
} from "@/game/slices/outposts/helpers";
import type { OutpostResource } from "@/game/types/outposts";

/**
 * Сводка по постройкам — единственное место, где их видно, не прилетая.
 *
 * Строить и перестраивать по-прежнему можно только на месте: смысл системы в
 * том, чтобы за добычей возвращались. Но знать, полон ли бункер и не захвачен
 * ли аванпост, игрок должен из любой точки — иначе маршрут не спланировать,
 * и приходится летать наугад.
 */
export function OutpostStatusList() {
    const { t } = useTranslation();
    const outposts = useGameStore((s) => s.outposts);
    const sectors = useGameStore((s) => s.galaxy.sectors);
    const crew = useGameStore((s) => s.crew);

    if (outposts.length === 0) return null;

    return (
        <div className="space-y-2">
            {outposts.map((outpost) => {
                const sector = sectors.find((s) => s.id === outpost.sectorId);
                const location = sector?.locations.find(
                    (l) => l.id === outpost.locationId,
                );
                const captured = outpost.capturedAtTurn !== undefined;
                const isBase = outpost.kind === "base";
                const cap = isBase ? BASE_BUNKER_CAP : GAS_COLLECTOR_BUNKER_CAP;
                const haul = (
                    Object.entries(outpost.bunker) as [OutpostResource, number][]
                ).filter(([, amount]) => amount > 0);
                const full = isBunkerFull(outpost);
                const accent = captured
                    ? "#ff667f"
                    : isBase
                      ? "#ffb000"
                      : "#00d4ff";

                return (
                    <div
                        key={outpost.id}
                        className="border p-2 text-[11px]"
                        style={{
                            borderColor: `${accent}55`,
                            background: `${accent}0d`,
                        }}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span style={{ color: accent }}>
                                {isBase ? "🏗" : "🛰"}{" "}
                                {t(`outposts.${outpost.kind}`)}
                            </span>
                            <span className="truncate text-[10px] text-[#8a9ba3]">
                                {[
                                    getLocationName(location?.name ?? "", t),
                                    getLocationName(sector?.name ?? "", t),
                                ]
                                    .filter(Boolean)
                                    .join(", ")}
                            </span>
                        </div>

                        {captured ? (
                            <div className="mt-1 text-[10px] text-[#ff667f]">
                                ⚠ {t("outposts.captured")}
                            </div>
                        ) : (
                            <>
                                <div className="mt-1 text-[10px] text-[#b9c6cc]">
                                    {haul.length === 0
                                        ? t("outposts.bunker_empty")
                                        : haul
                                              .map(
                                                  ([resource, amount]) =>
                                                      `${describeHaulResource(resource, t)} ${amount}/${cap}`,
                                              )
                                              .join(", ")}
                                </div>
                                {full && (
                                    <div className="mt-0.5 text-[10px] text-[#ffb000]">
                                        ⚠ {t("outposts.bunker_full")}
                                    </div>
                                )}
                                <div className="mt-0.5 text-[10px] text-[#8a9ba3]">
                                    {t("outposts.garrison")}:{" "}
                                    {getOutpostCrew(crew, outpost.id).length}/
                                    {getCrewSlots(outpost)}
                                    {isBase &&
                                        (outpost.modules ?? []).length > 0 &&
                                        ` · ${(outpost.modules ?? [])
                                            .map((id) => BASE_MODULES[id].icon)
                                            .join(" ")}`}
                                </div>
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
