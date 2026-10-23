import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getAbilityHudStatus,
  ABILITY_KEYS,
  getAbilitySlotDesignX,
  nextWeaponSelection,
  getRoleAbilityAtIndex,
  isRocketTargetClickValid,
  resolveArenaClick,
  shouldCancelRocketTargetSelection,
  shouldHandleAbilityKeydown
} from "./abilityControls.js";

test("each role maps Space and E to its independent abilities", () => {
  assert.deepEqual(
    ["healer", "tank", "damagedealer"].map((role) => [
      getRoleAbilityAtIndex(role, 0),
      getRoleAbilityAtIndex(role, 1)
    ]),
    [
      ["healer-aura", "healer-speed"],
      ["tank-shield", "tank-entrench"],
      ["damagedealer-rapidfire", "damagedealer-homing-rocket"]
    ]
  );
  assert.equal(getRoleAbilityAtIndex("unknown", 0), null);
});

test("Damagedealer has a third R slot without changing other roles or crowding layout", () => {
  assert.deepEqual(ABILITY_KEYS, ["SPACE", "E", "R"]);
  assert.equal(getRoleAbilityAtIndex("damagedealer", 2), "damagedealer-mortar");
  assert.equal(getRoleAbilityAtIndex("tank", 2), null);
  assert.equal(getRoleAbilityAtIndex("healer", 2), null);
  for (const count of [2, 3]) {
    const centers = Array.from({ length: count }, (_, index) => getAbilitySlotDesignX(index, count));
    assert.ok(centers[0] - 71 > 250, "slots do not overlap the progression panel");
    assert.ok(centers.at(-1)! + 67 < 800);
    for (let index = 1; index < centers.length; index++) assert.ok(centers[index] - centers[index - 1] > 140);
  }
});

test("weapon selection toggles or switches exclusively", () => {
  assert.equal(nextWeaponSelection(null, "rocket"), "rocket");
  assert.equal(nextWeaponSelection("rocket", "rocket"), null);
  assert.equal(nextWeaponSelection("rocket", "mortar"), "mortar");
  assert.equal(nextWeaponSelection("mortar", "rocket"), "rocket");
  assert.equal(nextWeaponSelection("mortar", "mortar"), null);
});

test("Mortar consumes valid ground clicks regardless of occupants but never leaks movement on invalid points", () => {
  const shooter = { team: "blue", x: 1000, y: 600 };
  const friendly = { id: "ally", team: "blue", x: 1500, y: 600 };
  for (const target of [friendly, null, { ...friendly, team: "red" }]) {
    assert.deepEqual(resolveArenaClick("mortar", shooter, target, { x: 1500, y: 600 }, 900),
      { type: "mortar", x: 1500, y: 600 });
  }
  assert.deepEqual(resolveArenaClick("mortar", shooter, null, { x: 1900, y: 600 }, 900),
    { type: "mortar", x: 1900, y: 600 });
  for (const point of [{ x: 1900.01, y: 600 }, { x: -1, y: 600 }, { x: NaN, y: 600 }]) {
    assert.deepEqual(resolveArenaClick("mortar", shooter, null, point, 900), { type: "ignore" });
  }
});

test("rocket selection accepts only valid living enemies within firing range", () => {
  const shooter = { team: "blue", x: 0, y: 0 };
  assert.equal(isRocketTargetClickValid(shooter, { team: "red", x: 900, y: 0, hp: 1 }, 900), true);
  assert.equal(isRocketTargetClickValid(shooter, { team: "blue", x: 10, y: 0, hp: 1 }, 900), false);
  assert.equal(isRocketTargetClickValid(shooter, { team: "red", x: 901, y: 0, hp: 1 }, 900), false);
  assert.equal(isRocketTargetClickValid(shooter, { team: "red", x: 10, y: 0, hp: 0 }, 900), false);
  assert.equal(isRocketTargetClickValid(shooter, null, 900), false);
});

test("rocket target selection cancels on Escape or right click only", () => {
  assert.equal(shouldCancelRocketTargetSelection(2), true);
  assert.equal(shouldCancelRocketTargetSelection(0, "Escape"), true);
  assert.equal(shouldCancelRocketTargetSelection(0, "Enter"), false);
});

test("ability shortcuts ignore repeated keydown events", () => {
  assert.equal(shouldHandleAbilityKeydown({ repeat: false }), true);
  assert.equal(shouldHandleAbilityKeydown({ repeat: true }), false);
});

test("each ability HUD state is derived independently", () => {
  const now = 10_000;
  const first = getAbilityHudStatus({ level: 1, cooldownEndsAt: 20_000, cooldownMax: 10_000, activeUntil: 0 }, now);
  const second = getAbilityHudStatus({ level: 2, cooldownEndsAt: 0, cooldownMax: 10_000, activeUntil: 15_000 }, now);
  const locked = getAbilityHudStatus({ level: 0, cooldownEndsAt: 0, cooldownMax: 0, activeUntil: 0 }, now);
  assert.deepEqual(first, { state: "cooldown", remainingMs: 10_000, cooldownFraction: 1 });
  assert.deepEqual(second, { state: "active", remainingMs: 0, cooldownFraction: 0 });
  assert.deepEqual(locked, { state: "locked", remainingMs: 0, cooldownFraction: 0 });
});

test("rocket target clicks never turn into ordinary move or attack commands", () => {
  const shooter = { team: "blue", x: 0, y: 0 };
  const enemy = { id: "enemy", team: "red", x: 100, y: 0, hp: 10 };
  const friendly = { id: "friendly", team: "blue", x: 10, y: 0, hp: 10 };

  assert.deepEqual(resolveArenaClick(true, shooter, enemy, { x: 500, y: 500 }, 900), {
    type: "rocket",
    targetId: "enemy"
  });
  assert.deepEqual(resolveArenaClick(true, shooter, friendly, { x: 500, y: 500 }, 900), { type: "ignore" });
  assert.deepEqual(resolveArenaClick(true, shooter, null, { x: 500, y: 500 }, 900), { type: "ignore" });
  assert.deepEqual(resolveArenaClick(true, shooter, { ...enemy, x: 901 }, { x: 500, y: 500 }, 900), { type: "ignore" });
  assert.deepEqual(resolveArenaClick(false, shooter, enemy, { x: 500, y: 500 }, 900), {
    type: "attack",
    targetId: "enemy",
    x: 100,
    y: 0
  });
  assert.deepEqual(resolveArenaClick(false, shooter, null, { x: 500, y: 500 }, 900), {
    type: "move",
    x: 500,
    y: 500
  });
});
