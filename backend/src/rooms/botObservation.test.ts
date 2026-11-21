import assert from "node:assert/strict";
import { test } from "node:test";
import { GameState, Tank } from "shared";
import { observeBot } from "./botObservation.js";
import { decideBot } from "./botPolicy.js";

test("bot observations omit concealed enemies and do not change with their hidden state", () => {
  const state = new GameState();
  const bot = Object.assign(new Tank(), {
    id: "bot", team: "blue", x: 1000, y: 900, controllerType: "bot" as const, botDifficulty: "easy" as const
  });
  const enemy = Object.assign(new Tank(), { id: "enemy", team: "red", x: 2000, y: 900 });
  state.tanks.set(bot.id, bot);
  state.tanks.set(enemy.id, enemy);
  const before = observeBot(state, bot);
  enemy.x = 1900;
  enemy.hp = 5;
  assert.deepEqual(observeBot(state, bot), before);
  assert.deepEqual(decideBot(observeBot(state, bot), 0), decideBot(before, 0));
  assert.equal(before.enemies.length, 0);

  const ally = Object.assign(new Tank(), { id: "ally", team: "blue", x: 1900, y: 900 });
  state.tanks.set(ally.id, ally);
  const after = observeBot(state, bot);
  assert.equal(after.enemies[0]?.id, enemy.id);
  assert.equal(after.enemies[0]?.hp, 5);
  assert.equal(after.allies.some(entity => entity.id === ally.id), true);
});

test("difficulty changes target priorities without changing observation or stats", () => {
  const state = new GameState();
  const bot = Object.assign(new Tank(), {
    id: "bot", team: "blue", x: 1000, y: 900, controllerType: "bot" as const, botDifficulty: "easy" as const
  });
  state.tanks.set(bot.id, bot);
  const observation = observeBot(state, bot);
  observation.enemies = [
    { id: "nearest", kind: "minion", x: 1050, y: 900, hp: 100, maxHp: 100 },
    { id: "tower", kind: "tower", x: 1100, y: 900, hp: 100, maxHp: 100 }
  ];
  assert.deepEqual(decideBot(observation, 0).command, { targetId: "nearest" });
  observation.self.difficulty = "medium";
  assert.deepEqual(decideBot(observation, 0).command, { targetId: "tower" });
  observation.enemies.push({ id: "player", kind: "tank", x: 1080, y: 900, hp: 100, maxHp: 100 });
  observation.self.difficulty = "hard";
  assert.deepEqual(decideBot(observation, 0).command, { targetId: "player" });
});

test("bots use learned role abilities only when useful and off cooldown", () => {
  const state = new GameState();
  const bot = Object.assign(new Tank(), {
    id: "bot", team: "blue", x: 1000, y: 900, controllerType: "bot" as const, botDifficulty: "medium" as const
  });
  state.tanks.set(bot.id, bot);
  const observation = observeBot(state, bot);
  const enemy = { id: "enemy", kind: "tank" as const, x: 1050, y: 900, hp: 100, maxHp: 100 };
  observation.enemies.push(enemy);
  observation.self.skillPoints = 1;
  for (const [role, ability] of [
    ["healer", "healer-aura"], ["tank", "tank-shield"],
    ["damagedealer", "damagedealer-rapidfire"], ["scout", "scout-weitsicht"]
  ] as const) {
    observation.self.role = role;
    observation.self.hp = 50;
    observation.allies[0].hp = 50;
    assert.equal(decideBot(observation, 1000).upgrade, ability);
    assert.equal(decideBot(observation, 1000).ability, undefined);
    observation.self.abilities[ability] = { level: 1, cooldownEndsAt: 0 };
    assert.equal(decideBot(observation, 1000).ability, ability);
    observation.self.abilities[ability] = { level: 1, cooldownEndsAt: 2000 };
    assert.equal(decideBot(observation, 1000).ability, undefined);
    observation.self.abilities[ability] = { level: 10, cooldownEndsAt: 2000 };
    assert.equal(decideBot(observation, 1000).upgrade, undefined);
  }
});
