import { MapSchema, type } from "@colyseus/schema";
import { ABILITY_IDS, AbilityId } from "../abilities";
import { Entity } from "./Entity";
import { AbilityState } from "./AbilityState";
import { PLAYER_COLLISION_RADIUS } from "../collision";

export class Tank extends Entity {
  @type("string") name: string = "Player";
  @type("number") hp: number = 100;
  @type("number") maxHp: number = 100;
  @type("string") role: string = "tank";
  @type("number") rotation: number = 0;
  @type("number") moveTargetX: number = 0;
  @type("number") moveTargetY: number = 0;
  @type("boolean") hasMoveTarget: boolean = false;
  @type("string") lockedTargetId: string = "";
  @type("string") state: "alive" | "dead" = "alive";
  @type("number") respawnAt: number = 0;
  @type("string") targetId: string = "";
  @type("number") fireRange: number = 150;
  @type("number") sightRange: number = 390;
  @type("number") fireCooldown: number = 0;
  @type("number") fireCooldownMax: number = 800;
  @type("number") fireDamage: number = 8;
  @type("number") moveSpeed: number = 90;
  @type({ map: AbilityState }) abilities = new MapSchema<AbilityState>();
  @type("number") level: number = 1;
  @type("number") xp: number = 0;
  @type("number") skillPoints: number = 0;

  constructor() {
    super();
    this.radius = PLAYER_COLLISION_RADIUS;
    for (const abilityId of ABILITY_IDS) {
      this.abilities.set(abilityId satisfies AbilityId, new AbilityState());
    }
  }
}
