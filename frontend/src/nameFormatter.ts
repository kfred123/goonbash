/**
 * Formats a player's above-tank name tag with their level.
 * Example: "Alex", 2, false -> "Alex (Lvl 2)"
 * Example: "Alex", 2, true -> "Alex (Lvl 2) (You)"
 */
export function formatPlayerNameTag(displayName: string, level: number, isLocalPlayer: boolean): string {
  const safeName = displayName || 'Player';
  const safeLevel = Math.max(1, Math.floor(level || 1));
  const levelPart = `(Lvl ${safeLevel})`;
  return isLocalPlayer ? `${safeName} ${levelPart} (You)` : `${safeName} ${levelPart}`;
}
