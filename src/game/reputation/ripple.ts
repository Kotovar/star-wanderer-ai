export function calculateReputationRippleEffects<T extends string>(
  relations: Partial<Record<T, number>> | undefined,
  primaryId: T,
  amount: number,
): Array<{ id: T; change: number }> {
  if (!relations) return [];

  return Object.entries(relations).flatMap(([id, relation]) => {
    if (id === primaryId || typeof relation !== "number") return [];
    const change = Math.round((amount * relation) / 50);
    return change === 0 ? [] : [{ id: id as T, change }];
  });
}
