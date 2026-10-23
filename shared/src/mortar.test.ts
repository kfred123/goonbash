import assert from "node:assert/strict";
import { test } from "node:test";
import { Projectile } from "./state/Projectile";
import { Tank } from "./state/Tank";
import { mortarPointRejection } from "./mortar";
import { WORLD_HEIGHT, WORLD_WIDTH } from "./arena";

test("ground-point validation uses inclusive range and arena bounds without requiring vision", () => {
  const shooter = { x: 0, y: 0 };
  assert.equal(mortarPointRejection(shooter, 900, 0, 900), null);
  assert.equal(mortarPointRejection(shooter, 900.01, 0, 900), "out_of_range");
  assert.equal(mortarPointRejection(shooter, 0, 0, 900), null);
  assert.equal(mortarPointRejection({ x: WORLD_WIDTH, y: WORLD_HEIGHT }, WORLD_WIDTH, WORLD_HEIGHT, 900), null);
  for (const [x, y] of [[-1, 0], [0, -1], [WORLD_WIDTH + 1, 0], [0, WORLD_HEIGHT + 1],
    [NaN, 0], [Infinity, 0], [0, -Infinity], [undefined, 0], ["0", 0], [null, 0]]) {
    assert.equal(mortarPointRejection(shooter, x, y, 900), "invalid_point");
  }
});

test("Mortar schema round trip preserves fields and default projectiles remain ordinary", () => {
  const ordinary = new Projectile();
  assert.equal(ordinary.isMortar, false);
  assert.equal(ordinary.flightProgress, 0);
  const source = Object.assign(new Projectile(), {
    isMortar: true, landingX: 123, landingY: 456, flightProgress: 0.5, blastRadius: 120
  });
  const decoded = new Projectile();
  decoded.decode(source.encodeAll());
  for (const field of ["isMortar", "landingX", "landingY", "flightProgress", "blastRadius"] as const) {
    assert.equal(decoded[field], source[field]);
  }
  const first = new Tank();
  const second = new Tank();
  assert.equal(first.abilities.get("damagedealer-mortar")!.level, 0);
  first.abilities.get("damagedealer-mortar")!.level = 1;
  assert.equal(first.abilities.get("damagedealer-homing-rocket")!.level, 0);
  assert.equal(second.abilities.get("damagedealer-mortar")!.level, 0);
});
