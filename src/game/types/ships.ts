// Ship merge traits (from xenosymbiont symbiosis)

type ShipMergeTraitEffects = {
    moduleEfficiency: number;
    moduleHealthBonus: number;
};

export interface ShipMergeTrait {
    id: string;
    name: string;
    description: string;
    effects: ShipMergeTraitEffects;
}
