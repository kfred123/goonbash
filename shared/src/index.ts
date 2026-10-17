export { Entity } from "./state/Entity";
export { Tank } from "./state/Tank";
export { Minion } from "./state/Minion";
export { Base } from "./state/Base";
export { Projectile } from "./state/Projectile";
export { Tower } from "./state/Tower";
export { GameState } from "./state/GameState";
export { MatchPlayerStats } from "./state/MatchPlayerStats";
export { AbilityState } from "./state/AbilityState";
export { LANE_EDGE_Y, LANE_TURN_X, buildLanePath, getLaneWaypoints, pointAlongPath } from "./lanes";
export type { LanePoint } from "./lanes";
export type { Role, RoleStats, RoleAbilityConfig, RoleVisual } from "./roles";
export { isRole, ROLE_STATS, ROLE_ABILITY_CONFIG, ROLE_VISUALS, resolveRoleStats, resolveRoleAbilityConfig } from "./roles";
export {
  KILL_XP_MINION,
  KILL_XP_PLAYER,
  KILL_XP_RADIUS,
  HP_PER_LEVEL,
  DAMAGE_PER_LEVEL,
  getRequiredXpForNextLevel,
  addExperience,
  computeProgressionStats
} from "./progression";
export type { LevelProgress } from "./progression";
export {
  ABILITY_IDS,
  ABILITY_DEFINITIONS,
  ROLE_ABILITY_IDS,
  isAbilityId,
  getAbilityDefinition,
  MAX_ABILITY_LEVEL,
  canUpgradeAbility,
  computeAbilityConfigForLevel
} from "./abilities";
export type { AbilityDefinition, AbilityConfig, AbilityId } from "./abilities";
export type {
	LobbyStatus,
	LobbyTeam,
	MatchPhase,
	LobbyInfo,
	LobbyListResponse,
	CreateLobbyResponse,
	LobbyErrorResponse
} from "./lobby";
