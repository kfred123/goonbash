import assert from "node:assert/strict";
import { test } from "node:test";
import { getDeploymentInfo } from "./deploymentInfo.js";

test("returns deployment metadata from environment variables", () => {
  const info = getDeploymentInfo({
    COMMIT_SHA: "abc123def456",
    COMMIT_SHORT_SHA: "abc123d",
    SOURCE_BRANCH: "main",
    DEPLOYED_AT: "2026-09-12T20:04:00Z"
  });

  assert.deepEqual(info, {
    commitSha: "abc123def456",
    commitShortSha: "abc123d",
    branch: "main",
    deployedAt: "2026-09-12T20:04:00Z"
  });
});

test("falls back to placeholder values when unset (local development)", () => {
  const info = getDeploymentInfo({});

  assert.deepEqual(info, {
    commitSha: "local",
    commitShortSha: "local",
    branch: "local",
    deployedAt: "unknown"
  });
});
