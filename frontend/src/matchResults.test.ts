import assert from "node:assert/strict";
import { test } from "node:test";
import { nextMatchResultsSort, sortMatchResults } from "./matchResults.js";

const players = [
  { name: "Alice", kills: 2, level: 1, damageDealt: 120 },
  { name: "Charlie", kills: 0, level: 1, damageDealt: 250 },
  { name: "Bob", kills: 2, level: 1, damageDealt: 80 }
];

test("defaults to kills descending and uses names to make ties deterministic", () => {
  assert.deepEqual(
    sortMatchResults(players, { stat: "kills", direction: "desc" }).map((player) => player.name),
    ["Alice", "Bob", "Charlie"]
  );
});

test("sorts by damage in either direction without mutating the original rows", () => {
  assert.deepEqual(
    sortMatchResults(players, { stat: "damageDealt", direction: "asc" }).map((player) => player.name),
    ["Bob", "Alice", "Charlie"]
  );
  assert.deepEqual(
    sortMatchResults(players, { stat: "damageDealt", direction: "desc" }).map((player) => player.name),
    ["Charlie", "Alice", "Bob"]
  );
  assert.equal(players[0].name, "Alice");
});

test("supports ascending and descending level sorting", () => {
  const differentLevels = [
    { name: "Level One", kills: 0, level: 1, damageDealt: 10 },
    { name: "Level Three", kills: 0, level: 3, damageDealt: 10 },
    { name: "Level Two", kills: 0, level: 2, damageDealt: 10 }
  ];

  assert.deepEqual(
    sortMatchResults(differentLevels, { stat: "level", direction: "asc" }).map((player) => player.name),
    ["Level One", "Level Two", "Level Three"]
  );
  assert.deepEqual(
    sortMatchResults(differentLevels, { stat: "level", direction: "desc" }).map((player) => player.name),
    ["Level Three", "Level Two", "Level One"]
  );
});

test("choosing a new column sorts descending and choosing it again reverses direction", () => {
  assert.deepEqual(nextMatchResultsSort({ stat: "kills", direction: "desc" }, "level"), {
    stat: "level",
    direction: "desc"
  });
  assert.deepEqual(nextMatchResultsSort({ stat: "kills", direction: "desc" }, "kills"), {
    stat: "kills",
    direction: "asc"
  });
});
