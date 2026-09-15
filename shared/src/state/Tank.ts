import { type } from "@colyseus/schema";
import { Entity } from "./Entity";

export class Tank extends Entity {
  @type("string") name: string = "Player";
  @type("number") hp: number = 100;
  @type("number") maxHp: number = 100;
  @type("string") role: string = "grunt";
  @type("number") rotation: number = 0;
  @type("number") inputX: number = 0;
  @type("number") inputY: number = 0;
  @type("string") state: "alive" | "dead" = "alive";
  @type("number") respawnAt: number = 0;
  @type("string") targetId: string = "";
  @type("number") fireRange: number = 150;
  @type("number") fireCooldown: number = 0;
  @type("number") fireCooldownMax: number = 800;
  @type("number") fireDamage: number = 8;
}
