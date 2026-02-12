/**
 * Random utility functions for Incremental Cultivation: The Grand Dao
 */

/**
 * Weighted random selection from an array of items with probability fields.
 * Probabilities should sum to ~1.0.
 * @param items Array of objects with a `probability` number field
 * @returns The selected item
 */
export function weightedRandom<T extends { probability: number }>(items: T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.probability, 0);
  let roll = Math.random() * totalWeight;
  for (const item of items) {
    roll -= item.probability;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

/**
 * Weighted random selection using explicit weight values (not probabilities).
 * @param items Array of items
 * @param weights Corresponding weights for each item
 * @returns The selected item
 */
export function weightedRandomByWeights<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Roll Luck value using a power curve distribution.
 * Most values cluster near 0.1 (low luck), with rare high values.
 * Math.pow(Math.random(), 2.5) gives heavy skew toward 0.
 * Clamped to [0.1, 1.0].
 * @returns A float between 0.1 and 1.0
 */
export function rollLuck(): number {
  const raw = Math.pow(Math.random(), 2.5);
  return Math.max(0.1, Math.min(1.0, raw));
}

/**
 * Random integer between min (inclusive) and max (inclusive).
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Random float between min and max.
 */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Percent chance check. Returns true if random roll is under the given percentage.
 * @param percent 0-100 (e.g., 30 = 30% chance)
 */
export function percentChance(percent: number): boolean {
  return Math.random() * 100 < percent;
}

/**
 * Rate chance check. Returns true if random roll is under the given rate.
 * @param rate 0.0-1.0 (e.g., 0.05 = 5% chance)
 */
export function rateChance(rate: number): boolean {
  return Math.random() < rate;
}

/**
 * Pick a random element from an array.
 */
export function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Shuffle an array (Fisher-Yates). Returns a new array.
 */
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generate a rarity-weighted loot roll.
 * Higher luck increases chance of rarer items.
 * @param luck Player luck value (0.1 - 1.0)
 * @returns A rarity tier string
 */
export function rollRarity(luck: number): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic' {
  const roll = Math.random();
  const luckMod = luck * 0.5; // Luck adds up to 50% boost to rarity thresholds

  // Mythic: base 0.01%, legendary: 0.1%, epic: 1%, rare: 5%, uncommon: 20%
  if (roll < 0.0001 * (1 + luckMod * 10)) return 'mythic';
  if (roll < 0.001 * (1 + luckMod * 5)) return 'legendary';
  if (roll < 0.01 * (1 + luckMod * 3)) return 'epic';
  if (roll < 0.05 * (1 + luckMod * 2)) return 'rare';
  if (roll < 0.20 * (1 + luckMod)) return 'uncommon';
  return 'common';
}
