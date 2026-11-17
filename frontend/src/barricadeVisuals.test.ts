import assert from "node:assert/strict";
import { test } from "node:test";
import { getBarricadeSegment, isBarricadePresented } from "./barricadeVisuals.js";

test("rendered barricade endpoints follow the replicated angle and road-width length", () => {
  assert.deepEqual(getBarricadeSegment({ x: 100, y: 200, angle: Math.PI / 2, length: 150 }), {
    start: { x: 100 - 75 * Math.cos(Math.PI / 2), y: 125 },
    end: { x: 100 + 75 * Math.cos(Math.PI / 2), y: 275 }
  });
});

test("allied barricades are always presented and enemy barricades require vision", () => {
  const barricade = { team: "red", x: 100, y: 200 };
  const hidden = { canSee: () => false };
  const visible = { canSee: () => true };
  assert.equal(isBarricadePresented(barricade, "red", hidden), true);
  assert.equal(isBarricadePresented(barricade, "blue", hidden), false);
  assert.equal(isBarricadePresented(barricade, "blue", visible), true);
});
