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

test("the ability catalog defines independent role abilities including three Healer and Scout skills", () => {
  assert.equal(new Set(ABILITY_IDS).size, 11);
  assert.deepEqual(ROLE_ABILITY_IDS.healer, ["healer-aura", "healer-speed", "healer-rescue-impulse"]);
  assert.deepEqual(ROLE_ABILITY_IDS.tank, ["tank-shield", "tank-entrench"]);
  assert.deepEqual(ROLE_ABILITY_IDS.damagedealer, ["damagedealer-rapidfire", "damagedealer-homing-rocket", "damagedealer-mortar"]);
  assert.deepEqual(ROLE_ABILITY_IDS.scout, ["scout-weitsicht", "scout-offroad", "scout-shockshot"]);
  for (const abilityId of ABILITY_IDS) {
    assert.equal(ABILITY_DEFINITIONS[abilityId].id, abilityId);
  }
});

test("Rescue Impulse scales instant healing and cooldown while preserving its target range", () => {
  const first = computeAbilityConfigForLevel("healer-rescue-impulse", 1);
  assert.deepEqual(first, { cooldownMs: 20000, durationMs: 0, magnitude: 18, range: 250 });
  for (let level = 1; level <= MAX_ABILITY_LEVEL; level++) {
    assert.deepEqual(computeAbilityConfigForLevel("healer-rescue-impulse", level), {
      ...first,
      magnitude: 18 + 3 * (level - 1),
      cooldownMs: Math.round(20000 * (1 - 0.03 * (level - 1)))
    });
  }
  assert.equal(computeAbilityConfigForLevel("healer-rescue-impulse", 10).magnitude, 45);
  assert.equal(computeAbilityConfigForLevel("healer-rescue-impulse", 10).cooldownMs, 14600);
  assert.deepEqual(computeAbilityConfigForLevel("healer-rescue-impulse", 11),
    computeAbilityConfigForLevel("healer-rescue-impulse", 10));
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

test("Scout abilities scale sight, grass speed and immobilization duration independently", () => {
  const sightFirst = computeAbilityConfigForLevel("scout-weitsicht", 1);
  const sightLast = computeAbilityConfigForLevel("scout-weitsicht", 10);
  assert.equal(sightFirst.magnitude, 150);
  assert.equal(sightLast.magnitude, 600);
  assert.equal(sightFirst.durationMs, 4000);
  assert.equal(sightLast.durationMs, 8500);

  assert.equal(computeAbilityConfigForLevel("scout-offroad", 1).magnitude, 1.2);
  assert.equal(computeAbilityConfigForLevel("scout-offroad", 10).magnitude, 1.65);

  assert.equal(computeAbilityConfigForLevel("scout-shockshot", 1).durationMs, 2000);
  assert.equal(computeAbilityConfigForLevel("scout-shockshot", 10).durationMs, 6500);
});

test("computeAbilityConfigForLevel clamps levels above maximum", () => {
  assert.deepEqual(
    computeAbilityConfigForLevel("damagedealer-rapidfire", 11),
    computeAbilityConfigForLevel("damagedealer-rapidfire", 10)
  );
});
