export type GalaxyTierBase = 1 | 2 | 3;
export type GalaxyTierAll = GalaxyTierBase | 4;

export interface Nebula {
  id: string;
  x: number;
  y: number;
  radius: number;
}
