import { type } from "@colyseus/schema";
import { Entity } from "./Entity";

export class Projectile extends Entity {
  @type("string") ownerId: string = "";
  @type("string") targetId: string = "";
  @type("number") damage: number = 0;
  @type("number") speed: number = 400;
}
