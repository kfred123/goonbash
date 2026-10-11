import { Schema, type } from "@colyseus/schema";
import type { LobbyTeam } from "../lobby";

export class MatchPlayerStats extends Schema {
  @type("string") name: string = "Player";
  @type("string") team: LobbyTeam = "red";
  @type("number") kills: number = 0;
  @type("number") level: number = 1;
  @type("number") damageDealt: number = 0;
}
