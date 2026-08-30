import { type } from "@colyseus/schema";
import { Entity } from "./Entity";

export class Base extends Entity {
  @type("number") hp: number = 1000;
  @type("number") maxHp: number = 1000;
}
