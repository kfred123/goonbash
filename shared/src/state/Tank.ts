import { type } from "@colyseus/schema";
import { Entity } from "./Entity";

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
  @type("number") fireCooldown: number = 0;
  @type("number") fireCooldownMax: number = 800;
  @type("number") fireDamage: number = 8;
  @type("number") moveSpeed: number = 180;
  /** Timestamp (ms) at/after which the role's special ability can be activated again. */
  @type("number") abilityCooldownEndsAt: number = 0;
  /** Length (ms) of the ability's cooldown, for HUD progress display. */
  @type("number") abilityCooldownMax: number = 0;
  /** Timestamp (ms) until which the role's special ability effect is active. */
  @type("number") abilityActiveUntil: number = 0;
}
