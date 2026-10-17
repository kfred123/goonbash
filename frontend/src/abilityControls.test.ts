import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getAbilityHudStatus,
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
