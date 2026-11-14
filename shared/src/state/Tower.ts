import { type } from "@colyseus/schema";
import { Entity } from "./Entity";
import { TOWER_COLLISION_RADIUS } from "../collision";
import { PLAYER_TOWER_FIRE_RANGE, STANDARD_SIGHT_RANGE } from "../roles";

export class Tower extends Entity {
  @type("number") hp: number = 300;
  @type("number") maxHp: number = 300;
  @type("number") fireRange: number = PLAYER_TOWER_FIRE_RANGE;
  @type("number") sightRange: number = STANDARD_SIGHT_RANGE;
  @type("number") fireCooldown: number = 0;
  @type("number") fireCooldownMax: number = 1200;
  @type("number") fireDamage: number = 12;
  @type("string") targetId: string = "";
  @type("number") shotCount: number = 0;
  @type("number") shotAngle: number = 0;

  constructor() {
    super();
    this.radius = TOWER_COLLISION_RADIUS;
  }
}
