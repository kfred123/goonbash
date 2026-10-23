import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ABILITY_DEFINITIONS,
  ABILITY_IDS,
  ROLE_ABILITY_IDS,
  canUpgradeAbility,
  computeAbilityConfigForLevel,
  MAX_ABILITY_LEVEL
} from "./abilities.js";

test("canUpgradeAbility permits upgrade only when having at least 1 point and below max level", () => {
  assert.equal(canUpgradeAbility(1, 0), true); // can learn
  assert.equal(canUpgradeAbility(1, 1), true); // can upgrade to lvl 2
  assert.equal(canUpgradeAbility(1, 9), true); // can upgrade to lvl 10
  assert.equal(canUpgradeAbility(1, 10), false); // capped at 10
  assert.equal(canUpgradeAbility(0, 0), false); // no skill points
  assert.equal(canUpgradeAbility(0, 5), false);
  assert.equal(canUpgradeAbility(2, 11), false); // exceeds max
});

test("the ability catalog defines independent role abilities including a third Damagedealer skill", () => {
  assert.equal(new Set(ABILITY_IDS).size, 7);
  assert.deepEqual(ROLE_ABILITY_IDS.healer, ["healer-aura", "healer-speed"]);
  assert.deepEqual(ROLE_ABILITY_IDS.tank, ["tank-shield", "tank-entrench"]);
  assert.deepEqual(ROLE_ABILITY_IDS.damagedealer, ["damagedealer-rapidfire", "damagedealer-homing-rocket", "damagedealer-mortar"]);
  for (const abilityId of ABILITY_IDS) {
    assert.equal(ABILITY_DEFINITIONS[abilityId].id, abilityId);
  }
});

test("Mortar rank endpoints preserve range, blast size, flight time and siege bonus", () => {
  const first = computeAbilityConfigForLevel("damagedealer-mortar", 1);
  const last = computeAbilityConfigForLevel("damagedealer-mortar", 10);
  assert.deepEqual(first, {
    cooldownMs: 24000, durationMs: 0, magnitude: 2, range: 900, radius: 120,
    flightDurationMs: 1500, buildingMultiplier: 3
  });
  assert.deepEqual(last, { ...first, cooldownMs: 17520, magnitude: 3.8 });
});

test("ability level scales cooldown and ability-specific magnitudes", () => {
  const speedLvl1 = computeAbilityConfigForLevel("healer-speed", 1);
  const speedLvl10 = computeAbilityConfigForLevel("healer-speed", MAX_ABILITY_LEVEL);
  assert.equal(speedLvl1.magnitude, 1.15);
  assert.equal(speedLvl10.magnitude, 1.6);
  assert.equal(speedLvl10.cooldownMs, Math.round(18000 * 0.73));

  const rocketLvl1 = computeAbilityConfigForLevel("damagedealer-homing-rocket", 1);
  const rocketLvl10 = computeAbilityConfigForLevel("damagedealer-homing-rocket", MAX_ABILITY_LEVEL);
  assert.equal(rocketLvl1.magnitude, 3);
  assert.equal(rocketLvl10.magnitude, 5.25);
  assert.equal(rocketLvl10.range, rocketLvl1.range);
  assert.equal(rocketLvl10.projectileSpeed, 450);
});

test("tank damage reduction and cooldown scaling remain bounded at level 10", () => {
  const shield = computeAbilityConfigForLevel("tank-shield", MAX_ABILITY_LEVEL);
  const entrench = computeAbilityConfigForLevel("tank-entrench", MAX_ABILITY_LEVEL);
  assert.equal(shield.magnitude, 0.68);
  assert.equal(entrench.magnitude, 0.94);
  assert.ok(entrench.cooldownMs >= 12000, "cooldown does not fall below half its base");
});

test("computeAbilityConfigForLevel clamps levels above maximum", () => {
  assert.deepEqual(
    computeAbilityConfigForLevel("damagedealer-rapidfire", 11),
    computeAbilityConfigForLevel("damagedealer-rapidfire", 10)
  );
});
