import { type } from "@colyseus/schema";
import { Entity } from "./Entity";
import { MINION_COLLISION_RADIUS } from "../collision";

export class Minion extends Entity {
  @type("number") hp: number = 50;
  @type("number") maxHp: number = 50;
  @type("number") waypointX: number = 0;
  @type("number") waypointY: number = 0;
  @type("number") speed: number = 50;
  @type("string") targetId: string = "";
  @type("number") fireRange: number = 100;
  @type("number") sightRange: number = 130;
  @type("number") fireCooldown: number = 0;
  @type("number") fireCooldownMax: number = 1000;
  @type("number") fireDamage: number = 5;

  constructor() {
    super();
    this.radius = MINION_COLLISION_RADIUS;
  }
}
