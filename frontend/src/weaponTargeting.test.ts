import assert from "node:assert/strict";
import { test } from "node:test";
import { getWeaponCursor, mortarShellHeight, MORTAR_REJECTION_TEXT } from "./weaponTargeting";

test("Rocket red crosshair and Mortar bomb replace pointers with explicit aiming hotspots", () => {
  const rocket = getWeaponCursor("rocket")!;
  const bomb = getWeaponCursor("mortar")!;
  assert.match(rocket, /16 16, crosshair$/);
  assert.match(bomb, /15 19, crosshair$/);
  assert.ok(decodeURIComponent(rocket).includes("#e82030"));
  assert.ok(decodeURIComponent(bomb).includes('cx="15" cy="19" r="11"'));
  assert.notEqual(rocket, bomb);
  assert.equal(getWeaponCursor(null), null);
});

test("Mortar arc has fixed ground endpoints, a large midpoint height and bounded progress", () => {
  assert.equal(mortarShellHeight(0), 0);
  assert.equal(mortarShellHeight(0.5), 100);
  assert.equal(mortarShellHeight(1), 0);
  assert.equal(mortarShellHeight(-1), 0);
  assert.equal(mortarShellHeight(2), 0);
});

test("all authoritative Mortar rejection reasons have actionable feedback", () => {
  assert.equal(Object.keys(MORTAR_REJECTION_TEXT).length, 6);
  assert.ok(Object.values(MORTAR_REJECTION_TEXT).every((text) => text.length > 10));
});
