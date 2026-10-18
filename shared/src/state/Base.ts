import { type } from "@colyseus/schema";
import { Entity } from "./Entity";

export class Base extends Entity {
  @type("number") hp: number = 1000;
  @type("number") maxHp: number = 1000;
  @type("number") fireRange: number = 250;
  @type("number") fireCooldown: number = 0;
  @type("number") fireCooldownMax: number = 1200;
  @type("number") fireDamage: number = 24;
  @type("string") targetId: string = "";
  @type("number") shotCount: number = 0;
  @type("number") shotAngle: number = 0;
}
