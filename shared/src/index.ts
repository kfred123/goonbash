export { Entity } from "./state/Entity";
export { PLAYER_COLLISION_RADIUS, MINION_COLLISION_RADIUS, BASE_COLLISION_RADIUS } from "./collision";
export { Tank } from "./state/Tank";
export { Minion } from "./state/Minion";
export { Base } from "./state/Base";
export { BASE_CANNON_MUZZLE_DISTANCE, getBaseCannonAimAngle, getBaseCannonMuzzlePosition } from "./baseCannon";
export type { BaseCannonPoint } from "./baseCannon";
export { TOWER_CANNON_MUZZLE_DISTANCE } from "./towerCannon";
export { TOWER_COLLISION_RADIUS, TOWER_FOOTPRINT_RADIUS } from "./towerGeometry";
export { Projectile } from "./state/Projectile";
export { Tower } from "./state/Tower";
export { GameState } from "./state/GameState";
export { MatchPlayerStats } from "./state/MatchPlayerStats";
export { AbilityState } from "./state/AbilityState";
export { LANE_EDGE_Y, LANE_ROAD_WIDTH, LANE_TURN_X, buildLanePath, getLaneWaypoints, isPointOnLane, pointAlongPath, samplePathWithTangent } from "./lanes";
export type { LanePoint } from "./lanes";
export { WORLD_WIDTH, WORLD_HEIGHT, BLUE_BASE_POSITION, RED_BASE_POSITION, LANE_BORDER_WIDTH, ARENA_LANES } from "./arena";
export { WORLD_SCALE, WORLD_BASELINE, WORLD_DIMENSIONS, deriveWorldDimensions } from "./worldScale";
export type { WorldScaleFactors } from "./worldScale";
export { VisionTerrain, ARENA_VISION_TERRAIN, TeamVision, getVisionEntities, INVALID_TARGET_MESSAGE } from "./vision";
export type { VisionEntity, VisionWorld, VisionObserver, InvalidTargetMessage } from "./vision";
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
export { mortarPointRejection, MORTAR_IMPACT_MESSAGE } from "./mortar";
export type { AbilityActivationRequest, MortarRejectionReason, MortarImpactMessage } from "./mortar";
export type {
	LobbyStatus,
	LobbyTeam,
	MatchPhase,
	LobbyInfo,
	LobbyListResponse,
	CreateLobbyResponse,
	LobbyErrorResponse
} from "./lobby";
