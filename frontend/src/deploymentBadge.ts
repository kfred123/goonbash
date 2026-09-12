interface DeploymentInfo {
  commitSha: string;
  commitShortSha: string;
  branch: string;
  deployedAt: string;
}

const BACKEND_HTTP_URL =
  (import.meta as any).env?.VITE_BACKEND_HTTP_URL ||
  `${window.location.protocol}//${window.location.hostname}:2567`;

function formatTimestamp(deployedAt: string): string {
  if (deployedAt === 'unknown') return 'unknown';
  const date = new Date(deployedAt);
  if (Number.isNaN(date.getTime())) return deployedAt;
  return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

/**
 * Renders a small, unobtrusive badge showing which commit and deploy time is
 * currently running, so testers can confirm they're looking at the expected
 * version of the shared test environment.
 */
export function initDeploymentBadge(): void {
  const badge = document.createElement('div');
  badge.id = 'deployment-badge';
  badge.textContent = 'commit: …';
  Object.assign(badge.style, {
    position: 'fixed',
    right: '6px',
    bottom: '6px',
    padding: '2px 6px',
    fontFamily: 'monospace',
    fontSize: '11px',
    color: '#cccccc',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: '4px',
    pointerEvents: 'none',
    zIndex: '1000'
  } as CSSStyleDeclaration);
  document.body.appendChild(badge);

  fetch(`${BACKEND_HTTP_URL}/deployment-info`)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<DeploymentInfo>;
    })
    .then((info) => {
      badge.textContent = `${info.commitShortSha} · ${formatTimestamp(info.deployedAt)}`;
    })
    .catch(() => {
      badge.textContent = 'commit: unknown';
    });
}
