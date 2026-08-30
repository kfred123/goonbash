import { Schema, type } from "@colyseus/schema";

export class Entity extends Schema {
  @type("string") id: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") radius: number = 0;
  @type("string") team: string = "neutral";
}
