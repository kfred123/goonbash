import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canChangeTeam,
  canManageLobby,
  normalizeLobbyName,
  normalizePlayerName,
  resolveHostAfterLeave,
  selectBalancedTeam
} from "./lobbyControls.js";

test("assigns red on a tie and the smaller team otherwise", () => {
  assert.equal(selectBalancedTeam([]), "red");
  assert.equal(selectBalancedTeam([{ team: "red" }]), "blue");
  assert.equal(selectBalancedTeam([{ team: "red" }, { team: "blue" }]), "red");
});

test("allows only valid team changes during the waiting phase", () => {
  assert.equal(canChangeTeam("waiting", "red"), true);
  assert.equal(canChangeTeam("waiting", "blue"), true);
  assert.equal(canChangeTeam("waiting", "green"), false);
  assert.equal(canChangeTeam("started", "red"), false);
});

test("allows only the waiting-lobby host to manage the lobby", () => {
  assert.equal(canManageLobby("waiting", "host", "host"), true);
  assert.equal(canManageLobby("waiting", "player", "host"), false);
  assert.equal(canManageLobby("started", "host", "host"), false);
});

test("normalizes valid lobby names and rejects invalid ones", () => {
  assert.equal(normalizeLobbyName("  Team battle  "), "Team battle");
  assert.equal(normalizeLobbyName(""), undefined);
  assert.equal(normalizeLobbyName("x".repeat(49)), undefined);
  assert.equal(normalizeLobbyName({}), undefined);
});

test("normalizes player names and falls back to a default when missing", () => {
  assert.equal(normalizePlayerName("  Alice  "), "Alice");
  assert.equal(normalizePlayerName(""), "Player");
  assert.equal(normalizePlayerName("   "), "Player");
  assert.equal(normalizePlayerName(undefined), "Player");
  assert.equal(normalizePlayerName(42), "Player");
  assert.equal(normalizePlayerName("x".repeat(30)), "x".repeat(20));
});

test("reassigns the host to a remaining player when the host leaves", () => {
  assert.equal(resolveHostAfterLeave("host", "host", ["p2", "p3"]), "p2");
  assert.equal(resolveHostAfterLeave("host", "host", []), "");
});

test("leaves the host unchanged when a non-host player leaves", () => {
  assert.equal(resolveHostAfterLeave("player", "host", ["host", "player2"]), "host");
});
