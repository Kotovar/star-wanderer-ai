"use client";

import { useGameStore } from "@/game/store";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";
import { OUTPOST_ROLE } from "@/game/constants/outposts";
import { getOutpostCrew } from "@/game/crew/stationed";
import {
    getCrewSlots,
    getOutpostOutputMultiplier,
} from "@/game/slices/outposts/helpers";
import type { CrewMember } from "@/game/types";
import type { Outpost } from "@/game/types/outposts";

interface Props {
    outpost: Outpost;
    /** Цвет постройки: у базы янтарный, у сборщика голубой */
    accent: string;
}

/**
 * Гарнизон постройки: кто на ней стоит, что это даёт и кого можно отправить.
 *
 * Общий компонент, а не копия в каждой панели. Первая версия жила только у
 * газосборника, и база показывала «Гарнизон: 0/1» без единой кнопки — то
 * есть её множитель навсегда оставался ×0.7, казарма давала места, которые
 * нечем заполнить, а стрелок, снижающий риск захвата, был недостижим.
 */
export function OutpostGarrison({ outpost, accent }: Props) {
    const { t } = useTranslation();
    const crew = useGameStore((s) => s.crew);
    const stationCrew = useGameStore((s) => s.stationCrew);
    const recallCrew = useGameStore((s) => s.recallCrew);

    const stationed = getOutpostCrew(crew, outpost.id);
    const slots = getCrewSlots(outpost);
    const role = OUTPOST_ROLE[outpost.kind];
    const multiplier = getOutpostOutputMultiplier(outpost, crew);
    // Профильные первыми: игрок почти всегда хочет именно их
    const candidates = crew
        .filter((member) => !member.outpostId)
        .sort((a, b) =>
            a.profession === role ? -1 : b.profession === role ? 1 : 0,
        );
    /**
     * Каким станет множитель, если отправить этого человека.
     *
     * Считаем настоящей функцией на подменённом экипаже, а не своей формулой:
     * иначе кнопка обещала бы одно, а накопление за ход давало другое. Разница
     * между «инженер» и «медик» в цифрах — это и есть весь выбор кого отдать.
     */
    const previewMultiplier = (member: CrewMember) =>
        getOutpostOutputMultiplier(
            outpost,
            crew.map((c) =>
                c.id === member.id ? { ...c, outpostId: outpost.id } : c,
            ),
        );

    return (
        <div
            className="mt-2 border-t pt-2"
            style={{ borderColor: `${accent}22` }}
        >
            <div className="flex items-center justify-between text-[10px] sm:text-xs">
                {/* «×0.70» само по себе не говорит, что именно умножается и
                    откуда взялось: число видно, а причина — только в коде */}
                <span className="text-[#8a9ba3]">
                    {t("outposts.garrison")} ·{" "}
                    {t("outposts.summary_output", {
                        value: multiplier.toFixed(2),
                    })}
                </span>
                <span className="text-[#8a9ba3]">
                    {stationed.length}/{slots}
                </span>
            </div>

            {stationed.map((member) => (
                <div
                    key={member.id}
                    className="mt-1 flex items-center justify-between gap-2"
                >
                    <span className="truncate text-[11px] text-white sm:text-xs">
                        {member.name} · {t(`professions.${member.profession}`)}{" "}
                        {t("effects.level_short")}
                        {member.level}
                    </span>
                    <Button
                        onClick={() => recallCrew(member.id)}
                        className="min-h-7 cursor-pointer border border-[#555] bg-transparent px-2 text-[10px] uppercase text-[#b9c6cc]"
                        style={{ borderColor: "#555" }}
                    >
                        {t("outposts.recall")}
                    </Button>
                </div>
            ))}

            {stationed.length < slots && (
                <>
                    <div className="mt-1 text-[10px] text-[#ffb000]">
                        {t("outposts.garrison_empty", {
                            role: t(`professions.${role}`),
                        })}
                    </div>
                    {candidates.length === 0 ? (
                        <div className="mt-1 text-[10px] text-[#8a9ba3]">
                            {t("outposts.no_candidates")}
                        </div>
                    ) : (
                        <div className="mt-1 flex flex-wrap gap-1">
                            {candidates.map((member) => (
                                <Button
                                    key={member.id}
                                    onClick={() =>
                                        stationCrew(member.id, outpost.id)
                                    }
                                    title={t("outposts.station_hint")}
                                    className="min-h-7 cursor-pointer border bg-transparent px-2 text-[10px]"
                                    style={
                                        member.profession === role
                                            ? { borderColor: accent, color: accent }
                                            : { borderColor: "#555", color: "#b9c6cc" }
                                    }
                                >
                                    {member.name} ·{" "}
                                    {t(`professions.${member.profession}`)}{" "}
                                    {t("effects.level_short")}
                                    {member.level} → ×
                                    {previewMultiplier(member).toFixed(2)}
                                </Button>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
