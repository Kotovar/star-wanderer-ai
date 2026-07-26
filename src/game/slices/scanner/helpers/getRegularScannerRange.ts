import { getTechBonusSum } from "@/game/research";
import type { ResearchData } from "@/game/types/research";

export const getRegularScannerRange = (
    scanners: Array<{ scanRange?: number }>,
    research: Pick<ResearchData, "researchedTechs">,
): number =>
    scanners.length > 0
        ? Math.max(...scanners.map((scanner) => scanner.scanRange ?? 0)) +
          getTechBonusSum(research, "scan_range")
        : 0;
