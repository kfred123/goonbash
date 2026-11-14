import { type } from "@colyseus/schema";
import { Entity } from "./Entity";
import { MINION_COLLISION_RADIUS } from "../collision";
import { MINION_SIGHT_RANGE } from "../roles";

export class Minion extends Entity {
  @type("number") hp: number = 75;
  @type("number") maxHp: number = 75;
  @type("number") waypointX: number = 0;
  @type("number") waypointY: number = 0;
  @type("number") speed: number = 50;
  @type("string") targetId: string = "";
  @type("number") fireRange: number = 100;
  @type("number") sightRange: number = MINION_SIGHT_RANGE;
  @type("number") fireCooldown: number = 0;
  @type("number") fireCooldownMax: number = 1000;
  @type("number") fireDamage: number = 5;

  constructor() {
    super();
    this.radius = MINION_COLLISION_RADIUS;
  }
}
