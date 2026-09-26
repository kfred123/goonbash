import assert from "node:assert/strict";
import { test } from "node:test";
import {
  activateRoleAbility,
  applyShieldReduction,
  canActivateAbility,
  effectiveFireCooldown,
  healOverTick,
  isAbilityActive
} from "./ability.js";

test("an ability is activatable once the cooldown timestamp has passed", () => {
  assert.equal(canActivateAbility(1000, 1000), true);
  assert.equal(canActivateAbility(999, 1000), false);
  assert.equal(canActivateAbility(0, 0), true);
});

test("activating a role's ability sets cooldown and active-until timestamps from its config", () => {
  const healerTiming = activateRoleAbility("healer", 1000);
  assert.equal(healerTiming.abilityCooldownEndsAt, 1000 + 15000);
  assert.equal(healerTiming.abilityCooldownMax, 15000);
  assert.equal(healerTiming.abilityActiveUntil, 1000 + 6000);

  const tankTiming = activateRoleAbility("tank", 500);
  assert.equal(tankTiming.abilityCooldownEndsAt, 500 + 18000);
  assert.equal(tankTiming.abilityActiveUntil, 500 + 5000);

  const dpsTiming = activateRoleAbility("damagedealer", 0);
  assert.equal(dpsTiming.abilityCooldownEndsAt, 12000);
  assert.equal(dpsTiming.abilityActiveUntil, 5000);
});

test("an ability's timed effect is active only until its active-until timestamp", () => {
  assert.equal(isAbilityActive(500, 1000), true);
  assert.equal(isAbilityActive(1000, 1000), false);
  assert.equal(isAbilityActive(1500, 1000), false);
});

test("shield reduction only lowers damage while active", () => {
  assert.equal(applyShieldReduction(100, true, 0.5), 50);
  assert.equal(applyShieldReduction(100, false, 0.5), 100);
  assert.equal(applyShieldReduction(100, true, 1), 0);
});

test("rapid fire shortens the effective fire cooldown only while active", () => {
  assert.equal(effectiveFireCooldown(700, true, 2), 350);
  assert.equal(effectiveFireCooldown(700, false, 2), 700);
});

test("heal-over-tick increases HP by the per-second rate scaled by elapsed time, capped at max HP", () => {
  assert.equal(healOverTick(50, 100, 8, 1), 58);
  assert.equal(healOverTick(50, 100, 8, 0.5), 54);
  assert.equal(healOverTick(97, 100, 8, 1), 100);
});
