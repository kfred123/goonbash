import {
  barricadePointRejection, canUpgradeAbility, computeAbilityConfigForLevel, isRole, PLAYER_COLLISION_RADIUS, ROLE_ABILITY_IDS,
  type AbilityActivationRequest, type AbilityId
} from "shared";
import { isMobileUnit, type BotEntity, type BotObservation } from "./botObservation.js";
import { isWithinRange } from "./combat.js";
import { terrainMovementMultiplier } from "./terrain.js";

export function chooseBotUpgrade(self: BotObservation["self"]): AbilityId | undefined {
  if (!isRole(self.role) || self.skillPoints <= 0) return;
  let lowestRank = Infinity;
  let choice: AbilityId | undefined;
  for (const id of ROLE_ABILITY_IDS[self.role]) {
    const skill = self.abilities[id];
    if (skill && skill.level < lowestRank && canUpgradeAbility(self.skillPoints, skill.level)) {
      lowestRank = skill.level;
      choice = id;
    }
  }
  return choice;
}

export function chooseBotAbility(
  { self, allies }: BotObservation, targets: readonly BotEntity[], moving: boolean, now: number
): AbilityActivationRequest | undefined {
  const ready = (id: AbilityId) => {
    const skill = self.abilities[id];
    return skill && skill.level > 0 && skill.cooldownEndsAt <= now ? computeAbilityConfigForLevel(id, skill.level) : undefined;
  };
  const pressure = targets.some(e => e.fireRange > 0 && isWithinRange(self, e, e.fireRange + 60));
  const easy = self.difficulty === "easy";
  switch (self.role) {
    case "healer": {
      const patients = allies.filter(ally => isMobileUnit(ally) && ally.hp < ally.maxHp * (easy ? 0.65 : 0.85));
      const rescue = ready("healer-rescue-impulse");
      if (rescue) {
        const patient = patients.filter(ally => isWithinRange(self, ally, rescue.range!))
          .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.id.localeCompare(b.id))[0];
        if (patient) return { abilityId: "healer-rescue-impulse", targetId: patient.id };
      }
      const aura = ready("healer-aura");
      if (aura && patients.some(ally => isWithinRange(self, ally, aura.radius!))) return { abilityId: "healer-aura" };
      if (moving && pressure && ready("healer-speed")) return { abilityId: "healer-speed" };
      break;
    }
    case "tank": {
      if (!pressure) break;
      const dome = ready("tank-protection-dome");
      if (dome && allies.some(ally => ally.id !== self.id && isMobileUnit(ally) && isWithinRange(self, ally, dome.radius!))) {
        return { abilityId: "tank-protection-dome" };
      }
      if (self.hp < self.maxHp * (easy ? 0.65 : 0.8) && ready("tank-shield")) return { abilityId: "tank-shield" };
      if (dome && self.hp < self.maxHp / 2) return { abilityId: "tank-protection-dome" };
      const barricade = ready("tank-barricade");
      // A wall also blocks friendly movement. Screen wounded units, not a healthy push.
      if (barricade && allies.some(a => isMobileUnit(a) && a.hp < a.maxHp * 0.8 && isWithinRange(self, a, self.fireRange))
        && !allies.some(a => a.kind === "barricade" && isWithinRange(self, a, barricade.placementRange!))) {
        for (const enemy of targets) {
          if (!isMobileUnit(enemy) || !isWithinRange(self, enemy, barricade.placementRange! * 2)) continue;
          const x = (self.x + enemy.x) / 2, y = (self.y + enemy.y) / 2;
          if (!isWithinRange(self, { x, y }, 2 * PLAYER_COLLISION_RADIUS) && !barricadePointRejection(self, x, y, barricade.placementRange!)) {
            return { abilityId: "tank-barricade", targetX: x, targetY: y };
          }
        }
      }
      break;
    }
    case "damagedealer": {
      const mortar = ready("damagedealer-mortar");
      const mortarTargets = mortar ? targets.filter(e => e.kind !== "barricade" && isWithinRange(self, e, mortar.range!)) : [];
      const structure = mortarTargets.find(e => e.kind === "base" || e.kind === "tower");
      if (structure) return { abilityId: "damagedealer-mortar", targetX: structure.x, targetY: structure.y };
      const rocket = ready("damagedealer-homing-rocket");
      const target = rocket && targets.find(e => isWithinRange(self, e, rocket.range!));
      if (target) return { abilityId: "damagedealer-homing-rocket", targetId: target.id };
      if (ready("damagedealer-rapidfire") && targets.some(e => isWithinRange(self, e, self.fireRange))) {
        return { abilityId: "damagedealer-rapidfire" };
      }
      const aim = mortarTargets[0];
      if (aim) return { abilityId: "damagedealer-mortar", targetX: aim.x, targetY: aim.y };
      break;
    }
    case "scout": {
      const shock = ready("scout-shockshot");
      const target = shock && targets.find(e => isMobileUnit(e) && isWithinRange(self, e, shock.range!));
      if (target) return { abilityId: "scout-shockshot", targetId: target.id };
      if (moving && ready("scout-offroad") && terrainMovementMultiplier(self) < 1) return { abilityId: "scout-offroad" };
      if (ready("scout-weitsicht") && (pressure || !easy)) return { abilityId: "scout-weitsicht" };
      break;
    }
  }
}
