import type { Module } from "@/game/types";

export type ShipHullRect = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export function getShipHullRects(
  modules: Module[],
  cellSize: number,
): ShipHullRect[] {
  return modules.flatMap((module) => {
    if (module.type === "weaponShed") return [];

    return [
      {
        id: module.id,
        x: module.x * cellSize,
        y: module.y * cellSize,
        width: module.width * cellSize,
        height: module.height * cellSize,
      },
    ];
  });
}
