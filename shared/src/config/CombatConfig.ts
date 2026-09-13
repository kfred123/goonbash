/**
 * Central place for all tunable numeric values driving tower/lane combat.
 * Change these values to re-balance the game without touching game logic.
 */
export const CombatConfig = {
  /** Milliseconds between each wave of mob spawns (one mob per lane per team). */
  spawnIntervalMs: 15000,
  mob: {
    speed: 60,
    hp: 60,
    maxHp: 60,
    damage: 10,
    attackRange: 40
  },
  tower: {
    hp: 1000,
    maxHp: 1000,
    /** 0 disables the tower attacking back; mobs still attack the tower. */
    damage: 0,
    attackRange: 0
  }
} as const;
