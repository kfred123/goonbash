export interface DeploymentInfo {
  commitSha: string;
  commitShortSha: string;
  branch: string;
  deployedAt: string;
}

/**
 * Reads commit/deploy metadata set as environment variables by the CI
 * deployment workflow. Falls back to placeholder values when unset, e.g.
 * during local development where no deploy has taken place.
 */
export function getDeploymentInfo(env: NodeJS.ProcessEnv = process.env): DeploymentInfo {
  return {
    commitSha: env.COMMIT_SHA || "local",
    commitShortSha: env.COMMIT_SHORT_SHA || "local",
    branch: env.SOURCE_BRANCH || "local",
    deployedAt: env.DEPLOYED_AT || "unknown"
  };
}
