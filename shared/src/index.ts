export { Entity } from "./state/Entity";
export { Tank } from "./state/Tank";
export { Minion } from "./state/Minion";
export { Base } from "./state/Base";
export { Projectile } from "./state/Projectile";
export { GameState } from "./state/GameState";
export type { Role, RoleStats, RoleAbilityConfig, RoleVisual } from "./roles";
export { isRole, ROLE_STATS, ROLE_ABILITY_CONFIG, ROLE_VISUALS, resolveRoleStats, resolveRoleAbilityConfig } from "./roles";
export type {
	LobbyStatus,
	LobbyTeam,
	MatchPhase,
	LobbyInfo,
	LobbyListResponse,
	CreateLobbyResponse,
	LobbyErrorResponse
} from "./lobby";
