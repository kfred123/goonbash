import { type } from "@colyseus/schema";
import { Entity } from "./Entity";

export class Projectile extends Entity {
  @type("string") ownerId: string = "";
  @type("string") targetId: string = "";
  @type("number") damage: number = 0;
  @type("number") speed: number = 400;
  @type("boolean") isHomingRocket: boolean = false;
  @type("boolean") isMortar: boolean = false;
  @type("number") landingX: number = 0;
  @type("number") landingY: number = 0;
  @type("number") flightProgress: number = 0;
  @type("number") blastRadius: number = 0;
}
