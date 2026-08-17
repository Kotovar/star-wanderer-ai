import type { CargoItem } from "@/game/types";

export const takeCargoItem = (
    cargo: CargoItem[],
    index: number,
    quantity: number = 1,
): CargoItem[] =>
    cargo.flatMap((item, itemIndex) =>
        itemIndex !== index
            ? [item]
            : item.quantity > quantity
              ? [{ ...item, quantity: item.quantity - quantity }]
              : [],
    );
