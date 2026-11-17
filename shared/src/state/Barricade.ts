import { type } from "@colyseus/schema";
import { Entity } from "./Entity";
import { BARRICADE_LENGTH, BARRICADE_THICKNESS } from "../barricade";

export class Barricade extends Entity {
  @type("string") ownerId: string = "";
  @type("number") angle: number = 0;
  @type("number") length: number = 0;
  @type("number") hp: number = 150;
  @type("number") maxHp: number = 150;
  @type("number") expiresAt: number = 0;

  constructor() {
    super();
    this.length = BARRICADE_LENGTH;
    this.radius = BARRICADE_THICKNESS / 2;
  }
}
