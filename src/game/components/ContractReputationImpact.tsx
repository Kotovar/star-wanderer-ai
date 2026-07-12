import type { Contract } from "@/game/types";
import { RACES } from "@/game/constants/races";
import { getContractReputationImpact } from "@/game/reputation/utils";
import { useTranslation } from "@/lib/useTranslation";

export function ContractReputationImpact({ contract }: { contract: Contract }) {
  const { t } = useTranslation();
  const impact = getContractReputationImpact(contract);

  if (impact.length <= 1) return null;

  return (
    <div className="mt-2 border border-[#ffb00055] bg-[rgba(255,176,0,0.06)] px-2 py-1.5 text-[10px]">
      <div className="mb-1 uppercase tracking-wider text-[#ffb000]">
        {t("contracts.reputation_impact")}
      </div>
      <div className="flex flex-wrap gap-x-2 gap-y-1">
        {impact.map(({ raceId, change }) => (
          <span
            key={raceId}
            style={{ color: change > 0 ? RACES[raceId].color : "#ff6677" }}
          >
            {t(`races.${raceId}.plural`)} {change > 0 ? "+" : ""}
            {change}
          </span>
        ))}
      </div>
    </div>
  );
}
