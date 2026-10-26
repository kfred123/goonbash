import { Schema, type, MapSchema } from "@colyseus/schema";
import { Tank } from "./Tank";
import { Minion } from "./Minion";
import { Base } from "./Base";
import { Projectile } from "./Projectile";
import { Tower } from "./Tower";
import { MatchPlayerStats } from "./MatchPlayerStats";
import type { LobbyTeam, MatchPhase } from "../lobby";

export class GameState extends Schema {
  @type("string") phase: MatchPhase = "waiting";
  @type("number") countdownSeconds: number = 0;
  @type("string") countdownCancelReason: "" | "player_left" = "";
  @type("string") lobbyName: string = "New Game";
  @type("string") hostSessionId: string = "";
  @type("string") winnerTeam: LobbyTeam | "" = "";
  @type({ map: Tank }) tanks = new MapSchema<Tank>();
  @type({ map: Minion }) minions = new MapSchema<Minion>();
  @type({ map: Base }) bases = new MapSchema<Base>();
  @type({ map: Tower }) towers = new MapSchema<Tower>();
  @type({ map: Projectile }) projectiles = new MapSchema<Projectile>();
  @type({ map: MatchPlayerStats }) playerStats = new MapSchema<MatchPlayerStats>();
}
