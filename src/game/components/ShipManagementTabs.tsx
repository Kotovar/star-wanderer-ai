"use client";

import dynamic from "next/dynamic";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTranslation } from "@/lib/useTranslation";

const ShipGrid = dynamic(
  () => import("@/game/components/ShipGrid").then((m) => m.ShipGrid),
  { ssr: false },
);
const ModuleList = dynamic(
  () => import("@/game/components/ModuleList").then((m) => m.ModuleList),
  { ssr: false },
);
const ShipStats = dynamic(
  () => import("@/game/components/ShipStats").then((m) => m.ShipStats),
  { ssr: false },
);
const CargoDisplay = dynamic(
  () => import("@/game/components/CargoDisplay").then((m) => m.CargoDisplay),
  { ssr: false },
);

export function ShipManagementTabs({ value, onValueChange }: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <Tabs value={value} onValueChange={onValueChange} className="h-full flex flex-col">
      <TabsList className="grid grid-cols-4 bg-[rgba(0,255,65,0.05)] border border-[#00ff41] h-8 shrink-0">
        <TabsTrigger value="layout" className="text-[10px] data-[state=active]:bg-[rgba(0,255,65,0.15)] data-[state=active]:text-accent text-muted-foreground uppercase font-bold tracking-wider">{t("ship.subtab_layout")}</TabsTrigger>
        <TabsTrigger value="stats" className="text-[10px] data-[state=active]:bg-[rgba(0,255,65,0.15)] data-[state=active]:text-accent text-muted-foreground uppercase font-bold tracking-wider">{t("ship.subtab_stats")}</TabsTrigger>
        <TabsTrigger value="modules" className="text-[10px] data-[state=active]:bg-[rgba(0,255,65,0.15)] data-[state=active]:text-accent text-muted-foreground uppercase font-bold tracking-wider">{t("ship.subtab_modules")}</TabsTrigger>
        <TabsTrigger value="cargo" className="text-[10px] data-[state=active]:bg-[rgba(0,255,65,0.15)] data-[state=active]:text-accent text-muted-foreground uppercase font-bold tracking-wider">{t("ship.subtab_cargo")}</TabsTrigger>
      </TabsList>
      <TabsContent value="layout" className="mt-2 flex-1 min-h-0 overflow-y-auto tab-transition"><ShipGrid /></TabsContent>
      <TabsContent value="stats" className="mt-2 flex-1 min-h-0 overflow-y-auto pr-2 tab-transition"><ShipStats /></TabsContent>
      <TabsContent value="modules" className="mt-2 flex-1 min-h-0 overflow-y-auto pr-2 tab-transition"><ModuleList /></TabsContent>
      <TabsContent value="cargo" className="mt-2 flex-1 min-h-0 overflow-y-auto pr-2 tab-transition"><CargoDisplay /></TabsContent>
    </Tabs>
  );
}
