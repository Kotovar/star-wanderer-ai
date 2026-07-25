/** Объединяет два массива id без дублей. Персистится как массив, не Set — JSON.stringify(Set) не сериализуется. */
export function mergeUnique(a: string[], b: string[]): string[] {
  return Array.from(new Set([...a, ...b]));
}
