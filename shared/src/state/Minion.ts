import { type } from "@colyseus/schema";
import { Entity } from "./Entity";

export class Minion extends Entity {
  @type("number") hp: number = 50;
  @type("number") maxHp: number = 50;
  @type("number") speed: number = 50;
  @type("number") damage: number = 10;
  @type("number") attackRange: number = 40;
  /** Which lane this mob was spawned on: "top" | "mid" | "bottom". */
  @type("string") lane: string = "mid";
  /** Index into the lane's waypoint list this mob is currently walking toward. */
  @type("number") waypointIndex: number = 0;
  /** Id of the enemy unit (mob, tower, or tank) currently under attack, or "" if none. */
  @type("string") targetId: string = "";
}
