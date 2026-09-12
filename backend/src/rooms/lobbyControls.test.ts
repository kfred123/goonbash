import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canChangeTeam,
  canManageLobby,
  normalizeLobbyName,
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
