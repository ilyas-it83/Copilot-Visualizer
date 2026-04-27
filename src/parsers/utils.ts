/**
 * Utility functions for parsers.
 * Provides a simple ID generator (no external UUID dependency).
 */

let counter = 0;

/** Generate a unique-enough ID without requiring a uuid package */
export function v4Fallback(): string {
  counter++;
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${time}-${random}-${counter}`;
}
