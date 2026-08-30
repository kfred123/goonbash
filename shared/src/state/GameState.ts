import { Schema, type, MapSchema } from "@colyseus/schema";
import { Tank } from "./Tank";
import { Minion } from "./Minion";
import { Base } from "./Base";

export class GameState extends Schema {
  @type({ map: Tank }) tanks = new MapSchema<Tank>();
  @type({ map: Minion }) minions = new MapSchema<Minion>();
  @type({ map: Base }) bases = new MapSchema<Base>();
}
