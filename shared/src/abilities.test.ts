import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canUpgradeAbility,
  computeAbilityConfigForLevel,
  MAX_ABILITY_LEVEL
} from "./abilities.js";
import { ROLE_ABILITY_CONFIG } from "./roles.js";

test("canUpgradeAbility permits upgrade only when having at least 1 point and below max level", () => {
  assert.equal(canUpgradeAbility(1, 0), true); // can learn
  assert.equal(canUpgradeAbility(1, 1), true); // can upgrade to lvl 2
  assert.equal(canUpgradeAbility(1, 9), true); // can upgrade to lvl 10
  assert.equal(canUpgradeAbility(1, 10), false); // capped at 10
  assert.equal(canUpgradeAbility(0, 0), false); // no skill points
  assert.equal(canUpgradeAbility(0, 5), false);
  assert.equal(canUpgradeAbility(2, 11), false); // exceeds max
});

test("computeAbilityConfigForLevel returns base config for level 0 or 1", () => {
  const baseTank = ROLE_ABILITY_CONFIG.tank;
  const unlearned = computeAbilityConfigForLevel("tank", 0);
  assert.equal(unlearned.cooldownMs, baseTank.cooldownMs);
  assert.equal(unlearned.magnitude, baseTank.magnitude);

  const lvl1 = computeAbilityConfigForLevel("tank", 1);
  assert.equal(lvl1.cooldownMs, baseTank.cooldownMs);
  assert.equal(lvl1.magnitude, baseTank.magnitude);
});

test("computeAbilityConfigForLevel scales magnitude and shortens cooldown across ranks", () => {
  const baseDps = ROLE_ABILITY_CONFIG.damagedealer;
  const lvl5 = computeAbilityConfigForLevel("damagedealer", 5);
  assert.ok(lvl5.cooldownMs < baseDps.cooldownMs, "cooldown decreases");
  assert.ok(lvl5.magnitude > baseDps.magnitude, "magnitude increases");

  const lvl10 = computeAbilityConfigForLevel("damagedealer", 10);
  assert.ok(lvl10.cooldownMs < lvl5.cooldownMs);
  assert.ok(lvl10.magnitude > lvl5.magnitude);

  // Beyond level 10 clamps to level 10
  const lvl11 = computeAbilityConfigForLevel("damagedealer", 11);
  assert.deepEqual(lvl11, lvl10);
});

test("computeAbilityConfigForLevel handles healer and tank scaling up to max level", () => {
  const healerLvl10 = computeAbilityConfigForLevel("healer", MAX_ABILITY_LEVEL);
  assert.ok(healerLvl10.magnitude > ROLE_ABILITY_CONFIG.healer.magnitude);
  assert.equal(healerLvl10.radius, ROLE_ABILITY_CONFIG.healer.radius);

  const tankLvl10 = computeAbilityConfigForLevel("tank", MAX_ABILITY_LEVEL);
  assert.ok(tankLvl10.magnitude > ROLE_ABILITY_CONFIG.tank.magnitude);
  assert.ok(tankLvl10.magnitude <= 0.8, "shield reduction ratio capped safely");
});
