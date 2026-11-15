import { type } from "@colyseus/schema";
import { Entity } from "./Entity";

export class ProtectionDome extends Entity {
  @type("string") ownerId: string = "";
  @type("number") expiresAt: number = 0;
  @type("number") damageReduction: number = 0;
}
