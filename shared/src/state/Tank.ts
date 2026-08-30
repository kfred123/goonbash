import { type } from "@colyseus/schema";
import { Entity } from "./Entity";

export class Tank extends Entity {
  @type("number") hp: number = 100;
  @type("number") maxHp: number = 100;
  @type("string") role: string = "grunt";
  @type("number") rotation: number = 0;
  @type("number") inputX: number = 0;
  @type("number") inputY: number = 0;
}
