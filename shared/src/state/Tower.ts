import { type } from "@colyseus/schema";
import { Entity } from "./Entity";

export class Tower extends Entity {
  @type("number") hp: number = 300;
  @type("number") maxHp: number = 300;
  @type("number") fireRange: number = 250;
  @type("number") fireCooldown: number = 0;
  @type("number") fireCooldownMax: number = 1200;
  @type("number") fireDamage: number = 12;
  @type("string") targetId: string = "";
}
