var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Schema, type, MapSchema } from "@colyseus/schema";
import { Tank } from "./Tank";
import { Minion } from "./Minion";
import { Base } from "./Base";
export class GameState extends Schema {
    tanks = new MapSchema();
    minions = new MapSchema();
    bases = new MapSchema();
}
__decorate([
    type({ map: Tank }),
    __metadata("design:type", Object)
], GameState.prototype, "tanks", void 0);
__decorate([
    type({ map: Minion }),
    __metadata("design:type", Object)
], GameState.prototype, "minions", void 0);
__decorate([
    type({ map: Base }),
    __metadata("design:type", Object)
], GameState.prototype, "bases", void 0);
