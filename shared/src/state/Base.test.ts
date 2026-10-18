import assert from "node:assert/strict";
import { test } from "node:test";
import { Base } from "./Base.js";

test("main bases have the agreed defensive cannon defaults", () => {
  const base = new Base();

  assert.equal(base.fireRange, 250);
  assert.equal(base.fireCooldown, 0);
  assert.equal(base.fireCooldownMax, 1200);
  assert.equal(base.fireDamage, 24);
  assert.equal(base.targetId, "");
});
