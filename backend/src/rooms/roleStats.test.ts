import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveRoleAbilityConfig, resolveRoleStats, ROLE_ABILITY_CONFIG, ROLE_STATS } from "shared";

test("resolves the matching stats block for each valid role", () => {
  assert.deepEqual(resolveRoleStats("healer"), ROLE_STATS.healer);
  assert.deepEqual(resolveRoleStats("tank"), ROLE_STATS.tank);
  assert.deepEqual(resolveRoleStats("damagedealer"), ROLE_STATS.damagedealer);
});

test("defaults to the Tank stats for an unset or invalid role", () => {
  assert.deepEqual(resolveRoleStats("grunt"), ROLE_STATS.tank);
  assert.deepEqual(resolveRoleStats(undefined), ROLE_STATS.tank);
});

test("resolves the matching ability config for each valid role", () => {
  assert.deepEqual(resolveRoleAbilityConfig("healer"), ROLE_ABILITY_CONFIG.healer);
  assert.deepEqual(resolveRoleAbilityConfig("tank"), ROLE_ABILITY_CONFIG.tank);
  assert.deepEqual(resolveRoleAbilityConfig("damagedealer"), ROLE_ABILITY_CONFIG.damagedealer);
});

test("defaults to the Tank ability config for an unset or invalid role", () => {
  assert.deepEqual(resolveRoleAbilityConfig("grunt"), ROLE_ABILITY_CONFIG.tank);
  assert.deepEqual(resolveRoleAbilityConfig(undefined), ROLE_ABILITY_CONFIG.tank);
});
