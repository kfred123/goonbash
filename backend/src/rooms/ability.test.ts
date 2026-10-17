import assert from "node:assert/strict";
import { test } from "node:test";
import { Base, Minion, Tank, Tower } from "shared";
import {
  activateAbility,
  applyDamageReduction,
  canActivateAbility,
  effectiveMoveSpeed,
  effectiveFireCooldown,
  canActivateRoleAbility,
  healOverTick,
  homingRocketDamage,
  isValidRocketTarget,
  isMovementLocked,
  isAbilityActive,
  strongestReduction
} from "./ability.js";

test("an ability is activatable once the cooldown timestamp has passed", () => {
  assert.equal(canActivateAbility(1000, { level: 1, cooldownEndsAt: 1000, activeUntil: 0 }), true);
  assert.equal(canActivateAbility(999, { level: 1, cooldownEndsAt: 1000, activeUntil: 0 }), false);
  assert.equal(canActivateAbility(0, { level: 1, cooldownEndsAt: 0, activeUntil: 0 }), true);
  assert.equal(canActivateAbility(1000, { level: 0, cooldownEndsAt: 0, activeUntil: 0 }), false);
});

test("role ability activation requires an ability belonging to the role and its own learned cooldown state", () => {
  const ready = { level: 1, cooldownEndsAt: 1000, activeUntil: 0 };
  for (const [role, abilityId] of [
    ["healer", "healer-aura"], ["healer", "healer-speed"],
    ["tank", "tank-shield"], ["tank", "tank-entrench"],
    ["damagedealer", "damagedealer-rapidfire"], ["damagedealer", "damagedealer-homing-rocket"]
  ] as const) {
    assert.equal(canActivateRoleAbility(1000, role, abilityId, ready), true);
  }
  assert.equal(canActivateRoleAbility(1000, "tank", "healer-speed", ready), false);
  assert.equal(canActivateRoleAbility(1000, "healer", "healer-speed", undefined), false);
  assert.equal(canActivateRoleAbility(999, "healer", "healer-speed", ready), false);
  assert.equal(canActivateRoleAbility(1000, "healer", "healer-speed", { ...ready, level: 0 }), false);
});

test("activating an ability uses its own duration and cooldown", () => {
  const timing = activateAbility(1000, { cooldownMs: 18000, durationMs: 4000, magnitude: 1.15 });
  assert.deepEqual(timing, { cooldownEndsAt: 19000, cooldownMax: 18000, activeUntil: 5000 });
});

test("an ability's timed effect is active only until its active-until timestamp", () => {
  const ability = { level: 1, cooldownEndsAt: 0, activeUntil: 1000 };
  assert.equal(isAbilityActive(500, ability), true);
  assert.equal(isAbilityActive(1000, ability), false);
  assert.equal(isAbilityActive(1500, ability), false);
});

test("the strongest active defensive reduction is applied without stacking", () => {
  const reduction = strongestReduction(0.5, 0.85);
  assert.equal(reduction, 0.85);
  assert.ok(Math.abs(applyDamageReduction(100, reduction) - 15) < 1e-9);
  assert.equal(applyDamageReduction(100, 0), 100);
});

test("rapid fire shortens the effective fire cooldown only while active", () => {
  assert.equal(effectiveFireCooldown(700, true, 2), 350);
  assert.equal(effectiveFireCooldown(700, false, 2), 700);
});

test("Healer Speed changes movement only while active", () => {
  assert.ok(Math.abs(effectiveMoveSpeed(95, true, 1.15) - 109.25) < 1e-9);
  assert.equal(effectiveMoveSpeed(95, false, 1.6), 95);
});

test("Entrench locks movement only for an active Tank ability", () => {
  assert.equal(isMovementLocked("tank", true), true);
  assert.equal(isMovementLocked("tank", false), false);
  assert.equal(isMovementLocked("healer", true), false);
});

test("rocket target validation accepts living enemies in range and rejects invalid targets", () => {
  const shooter = { team: "blue", x: 0, y: 0 };
  assert.equal(isValidRocketTarget(shooter, { team: "red", x: 900, y: 0, hp: 1 }, 900), true);
  assert.equal(isValidRocketTarget(shooter, { team: "blue", x: 10, y: 0, hp: 10 }, 900), false);
  assert.equal(isValidRocketTarget(shooter, { team: "red", x: 901, y: 0, hp: 10 }, 900), false);
  assert.equal(isValidRocketTarget(shooter, { team: "red", x: 10, y: 0, hp: 0 }, 900), false);
  assert.equal(isValidRocketTarget(shooter, { team: "red", x: 10, y: 0, hp: 10, state: "dead" }, 900), false);
  assert.equal(isValidRocketTarget(shooter, undefined, 900), false);
});

test("rocket target validation accepts every supported living enemy entity type", () => {
  const shooter = { team: "blue", x: 0, y: 0 };
  const targets = [new Tank(), new Minion(), new Tower(), new Base()];
  targets.forEach((target, index) => {
    target.id = `enemy-${index}`;
    target.team = "red";
    target.x = 900;
    target.y = 0;
    target.hp = 100;
  });
  assert.ok(targets.every((target) => isValidRocketTarget(shooter, target, 900)));
});

test("homing rocket damage snapshots progression-adjusted fire damage and ability scaling", () => {
  assert.equal(homingRocketDamage(12, 1), 36);
  assert.equal(homingRocketDamage(12, 10), 63);
});

test("heal-over-tick increases HP by the per-second rate scaled by elapsed time, capped at max HP", () => {
  assert.equal(healOverTick(50, 100, 8, 1), 58);
  assert.equal(healOverTick(50, 100, 8, 0.5), 54);
  assert.equal(healOverTick(97, 100, 8, 1), 100);
});
