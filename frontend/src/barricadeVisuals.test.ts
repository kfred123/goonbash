import assert from "node:assert/strict";
import { test } from "node:test";
import { drawBarricade, isBarricadePresented } from "./barricadeVisuals.js";

test("barricade draws a row of crossed steel obstacles spanning its team-marked length", () => {
  const lines: number[][] = [];
  const rivets: number[][] = [];
  const colors: number[] = [];
  drawBarricade({
    lineStyle: (_width, color) => { if (color !== undefined) colors.push(color); },
    lineBetween: (...args) => { lines.push(args); },
    fillStyle: () => {},
    fillCircle: (...args) => { rivets.push(args); }
  }, 154, 0x4d8dff);

  assert.deepEqual(lines[0], [-77, 8.5, 77, 8.5]);
  assert.equal(rivets.length, 7);
  assert.deepEqual(rivets.map(([x]) => x), [-66, -44, -22, 0, 22, 44, 66]);
  assert.deepEqual(lines.slice(1, 3), [[-73, -7, -59, 7], [-59, -7, -73, 7]]);
  assert.ok(colors.includes(0x4d8dff));
});

test("allied barricades are always presented and enemy barricades require vision", () => {
  const barricade = { team: "red", x: 100, y: 200 };
  const hidden = { canSee: () => false };
  const visible = { canSee: () => true };
  assert.equal(isBarricadePresented(barricade, "red", hidden), true);
  assert.equal(isBarricadePresented(barricade, "blue", hidden), false);
  assert.equal(isBarricadePresented(barricade, "blue", visible), true);
});
