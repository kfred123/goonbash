import { Schema, type } from "@colyseus/schema";

export class AbilityState extends Schema {
  @type("number") level: number = 0;
  @type("number") cooldownEndsAt: number = 0;
  @type("number") cooldownMax: number = 0;
  @type("number") activeUntil: number = 0;
}
