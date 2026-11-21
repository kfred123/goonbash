import assert from "node:assert/strict";
import { test } from "node:test";
import { GameState, ROLE_ABILITY_IDS, Tank, type AbilityActivationRequest, type Role } from "shared";
import { observeBot } from "./botObservation.js";
import { decideBot } from "./botPolicy.js";

test("bot observations omit concealed enemies and do not change with their hidden state", () => {
  const state = new GameState();
  const bot = Object.assign(new Tank(), {
    id: "bot", team: "blue", role: "damagedealer", hp: 30, x: 1000, y: 900, controllerType: "bot", botDifficulty: "hard"
  });
  bot.abilities.get("damagedealer-mortar")!.level = 1;
  const enemy = Object.assign(new Tank(), { id: "enemy", team: "red", x: 2000, y: 900 });
  state.tanks.set(bot.id, bot);
  state.tanks.set(enemy.id, enemy);
  const before = observeBot(state, bot);
  enemy.x = 1900;
  enemy.hp = 5;
  enemy.fireRange *= 2;
  assert.deepEqual(observeBot(state, bot), before);
  assert.deepEqual(decideBot(observeBot(state, bot), 0), decideBot(before, 0));
  assert.equal(decideBot(before, 0).ability, undefined);
  assert.equal(before.enemies.length, 0);

  const ally = Object.assign(new Tank(), { id: "ally", team: "blue", x: 1900, y: 900 });
  state.tanks.set(ally.id, ally);
  const after = observeBot(state, bot);
  assert.equal(after.enemies[0]?.id, enemy.id);
  assert.equal(after.enemies[0]?.hp, 5);
  assert.equal(after.allies.some(entity => entity.id === ally.id), true);
});

test("without cover a wounded medium or hard bot opens a gap, holds it and re-engages on recovery", () => {
  const state = new GameState();
  const bot = Object.assign(new Tank(), { id: "bot", team: "red", hp: 40, x: 1100, y: 900, controllerType: "bot", botDifficulty: "easy" });
  const enemy = Object.assign(new Tank(), { id: "enemy", team: "blue", x: 1000, y: 900 });
  for (const unit of [bot, enemy]) state.tanks.set(unit.id, unit);
  const command = () => decideBot(observeBot(state, bot), 0).command;
  assert.deepEqual(command(), { targetId: enemy.id });
  for (const difficulty of ["medium", "hard"] as const) {
    Object.assign(bot, { botDifficulty: difficulty, hp: 40, x: 1100 });
    const retreat = command();
    assert.ok("x" in retreat && retreat.x > enemy.x + enemy.fireRange);
    Object.assign(bot, retreat);
    assert.deepEqual(command(), retreat);
    bot.hp = bot.maxHp;
    assert.deepEqual(command(), { targetId: enemy.id });
  }
  Object.assign(bot, { x: 1100, hp: 60, botDifficulty: "medium" });
  assert.deepEqual(command(), { targetId: enemy.id });
  bot.botDifficulty = "hard";
  assert.ok("x" in command());
});

test("difficulty changes target priorities without changing observation or stats", () => {
  const state = new GameState();
  const bot = Object.assign(new Tank(), {
    id: "bot", team: "blue", x: 1000, y: 900, controllerType: "bot" as const, botDifficulty: "easy" as const
  });
  state.tanks.set(bot.id, bot);
  const observation = observeBot(state, bot);
  observation.enemies = [
    { id: "nearest", kind: "minion", x: 1050, y: 900, hp: 100, maxHp: 100, fireRange: 100 },
    { id: "tower", kind: "tower", x: 1100, y: 900, hp: 100, maxHp: 100, fireRange: 187.5 }
  ];
  assert.deepEqual(decideBot(observation, 0).command, { targetId: "nearest" });
  observation.self.difficulty = "medium";
  assert.deepEqual(decideBot(observation, 0).command, { targetId: "tower" });
  observation.enemies.push({ id: "player", kind: "tank", x: 1080, y: 900, hp: 100, maxHp: 100, fireRange: 187.5 });
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
  const enemy = { id: "enemy", kind: "tank" as const, x: 1050, y: 900, hp: 100, maxHp: 100, fireRange: 187.5 };
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
    assert.deepEqual(decideBot(observation, 1000).ability, { abilityId: ability });
    observation.self.abilities[ability] = { level: 1, cooldownEndsAt: 2000 };
    assert.equal(decideBot(observation, 1000).ability, undefined);
    observation.self.abilities[ability] = { level: 10, cooldownEndsAt: 2000 };
    assert.equal(decideBot(observation, 1000).upgrade, ROLE_ABILITY_IDS[role][1]);
  }
});

test("learned specials select an eligible ally, enemy or lane point; stale or distant targets do not qualify", () => {
  const state = new GameState();
  const bot = Object.assign(new Tank(), { id: "bot", team: "blue", x: 1000, y: 900, controllerType: "bot", botDifficulty: "medium" });
  const enemy = Object.assign(new Tank(), { id: "enemy", team: "red", x: 1140, y: 900 });
  const ally = Object.assign(new Tank(), { id: "ally", team: "blue", x: 960, y: 900, hp: 30 });
  for (const unit of [bot, enemy, ally]) state.tanks.set(unit.id, unit);
  for (const [role, request] of [
    ["healer", { abilityId: "healer-rescue-impulse", targetId: ally.id }],
    ["scout", { abilityId: "scout-shockshot", targetId: enemy.id }],
    ["damagedealer", { abilityId: "damagedealer-homing-rocket", targetId: enemy.id }],
    ["damagedealer", { abilityId: "damagedealer-mortar", targetX: enemy.x, targetY: enemy.y }],
    ["tank", { abilityId: "tank-barricade", targetX: (bot.x + enemy.x) / 2, targetY: bot.y }],
    ["tank", { abilityId: "tank-protection-dome" }]
  ] satisfies [Role, AbilityActivationRequest][]) {
    bot.role = role;
    const skill = bot.abilities.get(request.abilityId)!;
    skill.level = 1;
    const observation = observeBot(state, bot);
    assert.deepEqual(decideBot(observation, 1000).ability, request);
    for (const unit of [...observation.enemies, ...observation.allies]) unit.x += 1200;
    assert.equal(decideBot(observation, 1000).ability, undefined);
    skill.level = 0;
  }
});
