"use client";

import { useGameStore } from "@/game/store";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";
import {
    GAS_BY_ATMOSPHERE,
    GAS_COLLECTOR_BUNKER_CAP,
    GAS_COLLECTOR_COST,
    GAS_COLLECTOR_FILL_TURNS,
    GAS_COLLECTOR_RATE,
    OUTPOST_LIMITS,
} from "@/game/constants/outposts";
import { RESEARCH_RESOURCES } from "@/game/constants";
import {
    getBunkerEntries,
    getGasCollectorBlocker,
    isBunkerFull,
} from "@/game/slices/outposts/helpers";
import type { Location } from "@/game/types";
import { OutpostGarrison } from "./OutpostGarrison";

interface Props {
    location: Location;
}

/**
 * Газосборник на гиганте: постройка либо вывоз накопленного.
 * Вынесен из GasGiantPanel — та и без него на 700 строк.
 */
export function GasCollectorSection({ location }: Props) {
    const { t } = useTranslation();
    const outposts = useGameStore((s) => s.outposts);
    const credits = useGameStore((s) => s.credits);
    const research = useGameStore((s) => s.research);
    const buildGasCollector = useGameStore((s) => s.buildGasCollector);
    const collectOutpost = useGameStore((s) => s.collectOutpost);
    const assaultOutpost = useGameStore((s) => s.assaultOutpost);

    const outpost = outposts.find((o) => o.locationId === location.id);
    const gas = location.gasGiantAtmosphere
        ? GAS_BY_ATMOSPHERE[location.gasGiantAtmosphere]
        : undefined;
    if (!gas) return null;

    // ── Сборщик уже стоит: показываем бункер ───────────────────────────────
    if (outpost?.capturedAtTurn !== undefined && outpost) {
        return (
            <div className="mt-2 border border-[#ff004455] bg-[rgba(255,0,64,0.06)] p-2 sm:p-3">
                <div className="text-[11px] uppercase tracking-wider text-[#ff667f] sm:text-xs">
                    ⚠ {t("outposts.captured")}
                </div>
                <div className="mt-1 text-[10px] leading-snug text-[#b9c6cc] sm:text-xs">
                    {t("outposts.captured_hint", {
                        threat: outpost.raiderThreat ?? 1,
                    })}
                </div>
                <Button
                    onClick={() => assaultOutpost(outpost.id)}
                    className="mt-2 min-h-9 w-full cursor-pointer border-2 border-[#ff0040] bg-transparent px-2 text-[10px] uppercase tracking-wider text-[#ff667f] hover:bg-[rgba(255,0,64,0.15)] sm:text-xs"
                >
                    ⚔ {t("outposts.assault")}
                </Button>
            </div>
        );
    }

    if (outpost) {
        const haul = getBunkerEntries(outpost);
        const full = isBunkerFull(outpost);
        const stored = outpost.bunker[gas] ?? 0;

        return (
            <div className="mt-2 border border-[#00d4ff33] bg-[rgba(0,212,255,0.04)] p-2 sm:p-3">
                <div className="text-[11px] uppercase tracking-wider text-[#00d4ff] sm:text-xs">
                    🛰️ {t("outposts.gas_collector")}
                </div>

                <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full border border-[#00d4ff33] bg-[#0b1218]">
                        <div
                            className="h-full rounded-full bg-[#00d4ff] transition-all duration-300"
                            style={{
                                width: `${(stored / GAS_COLLECTOR_BUNKER_CAP) * 100}%`,
                            }}
                        />
                    </div>
                    <span className="font-mono text-[10px] text-[#b9c6cc] sm:text-xs">
                        {stored}/{GAS_COLLECTOR_BUNKER_CAP}
                    </span>
                </div>

                <div className="mt-1 text-[10px] text-[#b9c6cc] sm:text-xs">
                    {t(`gases.${gas}.name`)} · {t(`gases.${gas}.use`)}
                </div>

                {full && (
                    <div className="mt-1.5 text-[10px] text-[#ffb000] sm:text-xs">
                        ⚠ {t("outposts.bunker_full")}
                    </div>
                )}

                <OutpostGarrison outpost={outpost} accent="#00d4ff" />

                <Button
                    onClick={() => collectOutpost(outpost.id)}
                    disabled={haul.length === 0}
                    className="mt-2 min-h-9 w-full cursor-pointer border-2 border-[#00d4ff] bg-transparent px-2 text-[10px] uppercase tracking-wider text-[#00d4ff] hover:bg-[#00d4ff] hover:text-[#050810] disabled:cursor-default disabled:opacity-40 sm:text-xs"
                >
                    📦 {t("outposts.collect")}
                </Button>
            </div>
        );
    }

    // ── Сборщика нет: показываем постройку или причину отказа ──────────────
    const blocker = getGasCollectorBlocker(
        { credits, outposts, research },
        location,
    );
    const built = outposts.filter((o) => o.kind === "gas_collector").length;

    return (
        <div className="mt-2 border border-[#3c4b52] bg-[rgba(255,255,255,0.02)] p-2 sm:p-3">
            <div className="text-[11px] uppercase tracking-wider text-[#b9c6cc] sm:text-xs">
                🛰️ {t("outposts.build_gas_collector")}
            </div>

            <div className="mt-1 text-[10px] leading-snug text-[#8a9ba3] sm:text-xs">
                {t("outposts.gas_collector_hint", {
                    gas: t(`gases.${gas}.name`),
                    rate: GAS_COLLECTOR_RATE,
                    cap: GAS_COLLECTOR_BUNKER_CAP,
                    turns: GAS_COLLECTOR_FILL_TURNS,
                })}
            </div>

            <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] sm:text-xs">
                <span
                    className={
                        credits >= GAS_COLLECTOR_COST.credits
                            ? "text-[#b9c6cc]"
                            : "text-[#ff667f]"
                    }
                >
                    {GAS_COLLECTOR_COST.credits}₢
                </span>
                {Object.entries(GAS_COLLECTOR_COST.resources).map(
                    ([resource, amount]) => {
                        const held =
                            research.resources[
                                resource as keyof typeof research.resources
                            ] ?? 0;
                        const info =
                            RESEARCH_RESOURCES[
                                resource as keyof typeof RESEARCH_RESOURCES
                            ];
                        return (
                            <span
                                key={resource}
                                className={
                                    held >= amount
                                        ? "text-[#b9c6cc]"
                                        : "text-[#ff667f]"
                                }
                            >
                                {info?.icon ?? ""} {amount}
                            </span>
                        );
                    },
                )}
                <span className="text-[#8a9ba3]">
                    {t("outposts.limit", {
                        built,
                        limit: OUTPOST_LIMITS.gas_collector,
                    })}
                </span>
            </div>

            {blocker && (
                <div className="mt-1.5 text-[10px] text-[#ffb000] sm:text-xs">
                    {t(`outposts.blocked_${blocker}`)}
                </div>
            )}

            <Button
                onClick={() => buildGasCollector(location.id)}
                disabled={blocker !== null}
                className="mt-2 min-h-9 w-full cursor-pointer border-2 border-[#00d4ff] bg-transparent px-2 text-[10px] uppercase tracking-wider text-[#00d4ff] hover:bg-[#00d4ff] hover:text-[#050810] disabled:cursor-default disabled:opacity-40 sm:text-xs"
            >
                🛠 {t("outposts.build")}
            </Button>
        </div>
    );
}
