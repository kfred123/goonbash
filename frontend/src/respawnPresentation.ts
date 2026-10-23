import type { LanePoint, TeamVision, VisionEntity } from 'shared';
import { isEntityPresented } from './visionPresentation.js';

export function getTankPresentation(
  tank: Pick<VisionEntity, 'x' | 'y' | 'team' | 'hp' | 'state'>,
  vision: TeamVision,
  rendered: LanePoint = tank
) {
  const preview = tank.state === 'dead' && !!vision.team && tank.team === vision.team;
  const combatVisible = isEntityPresented(tank, vision, rendered);
  return { visible: preview || combatVisible, combatVisible, alpha: preview ? 0.5 : 1 };
}

export function getRespawnCountdown(
  tank: { state: string; respawnAt: number } | undefined,
  own: boolean,
  phase: string,
  now: number
): string | null {
  if (!own || phase !== 'started' || tank?.state !== 'dead') return null;
  return `${Math.max(0, Math.ceil((tank.respawnAt - now) / 1000))}s`;
}
