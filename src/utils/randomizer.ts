import { PresetItem } from "../types/index.js";

export function selectRandomItems(
  items: PresetItem[],
  count: number
): PresetItem[] {
  if (count > items.length) {
    throw new Error(
      `Cannot select ${count} items from array of ${items.length}`
    );
  }

  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
