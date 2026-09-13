import { Schema, type, MapSchema } from "@colyseus/schema";
import { Tank } from "./Tank";
import { Minion } from "./Minion";
import { Tower } from "./Tower";
import type { MatchPhase } from "../lobby";

export class GameState extends Schema {
  @type("string") phase: MatchPhase = "waiting";
  @type("string") lobbyName: string = "New Game";
  @type("string") hostSessionId: string = "";
  @type({ map: Tank }) tanks = new MapSchema<Tank>();
  @type({ map: Minion }) minions = new MapSchema<Minion>();
  @type({ map: Tower }) towers = new MapSchema<Tower>();
}
