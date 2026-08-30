import { Schema, MapSchema } from "@colyseus/schema";
import { Tank } from "./Tank";
import { Minion } from "./Minion";
import { Base } from "./Base";
export declare class GameState extends Schema {
    tanks: MapSchema<Tank, string>;
    minions: MapSchema<Minion, string>;
    bases: MapSchema<Base, string>;
}
