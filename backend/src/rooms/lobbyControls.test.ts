import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canChangeRole,
  canChangeTeam,
  canJoinRoom,
  canManageLobby,
  canUseGameplayActions,
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
  assert.equal(canChangeTeam("waiting", "red", false), true);
  assert.equal(canChangeTeam("waiting", "blue", false), true);
  assert.equal(canChangeTeam("waiting", "green", false), false);
  assert.equal(canChangeTeam("waiting", "red", true), false);
  assert.equal(canChangeTeam("countdown", "red", false), false);
  assert.equal(canChangeTeam("started", "red", false), false);
  assert.equal(canChangeTeam("ended", "red", false), false);
});

test("allows only the waiting-lobby host to manage the lobby", () => {
  assert.equal(canManageLobby("waiting", "host", "host"), true);
  assert.equal(canManageLobby("waiting", "player", "host"), false);
  assert.equal(canManageLobby("started", "host", "host"), false);
  assert.equal(canManageLobby("ended", "host", "host"), false);
});

test("allows only valid role changes during the waiting phase", () => {
  assert.equal(canChangeRole("waiting", "healer", false), true);
  assert.equal(canChangeRole("waiting", "tank", false), true);
  assert.equal(canChangeRole("waiting", "damagedealer", false), true);
  assert.equal(canChangeRole("waiting", "grunt", false), false);
  assert.equal(canChangeRole("waiting", undefined, false), false);
  assert.equal(canChangeRole("waiting", "healer", true), false);
  assert.equal(canChangeRole("countdown", "healer", false), false);
  assert.equal(canChangeRole("started", "healer", false), false);
  assert.equal(canChangeRole("ended", "healer", false), false);
});

test("allows gameplay actions only while the match is started", () => {
  assert.equal(canUseGameplayActions("waiting"), false);
  assert.equal(canUseGameplayActions("countdown"), false);
  assert.equal(canUseGameplayActions("started"), true);
  assert.equal(canUseGameplayActions("ended"), false);
});

test("rejects joins after the match has ended", () => {
  assert.equal(canJoinRoom("waiting"), true);
  assert.equal(canJoinRoom("countdown"), false);
  assert.equal(canJoinRoom("started"), true);
  assert.equal(canJoinRoom("ended"), false);
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
