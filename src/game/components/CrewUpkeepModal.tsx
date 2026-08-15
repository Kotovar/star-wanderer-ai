"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useGameStore } from "@/game/store";
import { useTranslation } from "@/lib/useTranslation";
import { GameDialogContent } from "./GameDialog";
import { useCombatCinematicUiStore } from "./combatCinematicUiStore";

/** Строка отчёта: подпись слева, значение справа */
function ReportRow({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone: "neutral" | "good" | "bad";
}) {
    const color =
        tone === "good"
            ? "#00ff41"
            : tone === "bad"
              ? "#ff4d6d"
              : "#b8d9e8";

    return (
        <div className="flex items-baseline justify-between border border-[#365062] bg-[rgba(0,0,0,0.28)] px-3 py-2 text-sm">
            <span className="text-[#7893a2]">{label}</span>
            <span className="font-bold tabular-nums" style={{ color }}>
                {value}
            </span>
        </div>
    );
}

/**
 * Итог расчётного периода. Отдельное окно, а не тост: здесь видно и трату,
 * и то, чем экипаж на неё ответил.
 */
export function CrewUpkeepModal() {
    const report = useGameStore((s) => s.pendingUpkeepReport);
    const dismissUpkeepReport = useGameStore((s) => s.dismissUpkeepReport);
    // Не перекрываем боевую кинематику: очередь дождётся конца сцены
    const cinematicPlaying = useCombatCinematicUiStore((s) =>
        Boolean(s.timeline),
    );
    const { t } = useTranslation();

    if (!report || cinematicPlaying) return null;

    const shortfall = report.due - report.paid;
    const fullyPaid = shortfall <= 0;

    return (
        <Dialog open onOpenChange={(open) => !open && dismissUpkeepReport()}>
            <GameDialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-['Orbitron'] text-[#00ff41]">
                        {t("crew_upkeep.title", { turn: report.turn })}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-[#aaa]">
                        {t("crew_upkeep.description")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-1.5">
                    <ReportRow
                        label={t("crew_upkeep.due")}
                        value={`₢${report.due}`}
                        tone="neutral"
                    />
                    <ReportRow
                        label={t("crew_upkeep.paid")}
                        value={`-₢${report.paid}`}
                        tone={fullyPaid ? "neutral" : "bad"}
                    />
                    {!fullyPaid && (
                        <ReportRow
                            label={t("crew_upkeep.shortfall")}
                            value={`₢${shortfall}`}
                            tone="bad"
                        />
                    )}
                    <ReportRow
                        label={t("crew_upkeep.credits_left")}
                        value={`₢${report.creditsLeft}`}
                        tone="neutral"
                    />

                    {report.organicCount > 0 && (
                        <ReportRow
                            label={t("crew_upkeep.morale", {
                                count: report.organicCount,
                            })}
                            value={
                                fullyPaid
                                    ? `+${report.happinessChange}`
                                    : `${report.happinessChange}`
                            }
                            tone={fullyPaid ? "good" : "bad"}
                        />
                    )}
                    {report.syntheticCount > 0 && (
                        <ReportRow
                            label={t("crew_upkeep.synthetics", {
                                count: report.syntheticCount,
                            })}
                            value={
                                fullyPaid
                                    ? t("crew_upkeep.parts_bought")
                                    : `-${report.hardwareDamage} HP`
                            }
                            tone={fullyPaid ? "good" : "bad"}
                        />
                    )}
                </div>

                {!fullyPaid && (
                    <div className="border border-[#ff4d6d55] bg-[rgba(255,77,109,0.06)] px-3 py-2 text-sm text-[#ff9db1]">
                        {t("crew_upkeep.debt_warning")}
                    </div>
                )}

                <Button
                    onClick={dismissUpkeepReport}
                    className="cursor-pointer bg-transparent border-2 border-[#00ff41] text-[#00ff41] uppercase tracking-wider hover:bg-[#00ff41] hover:text-[#050810]"
                >
                    {t("crew_upkeep.confirm")}
                </Button>
            </GameDialogContent>
        </Dialog>
    );
}
