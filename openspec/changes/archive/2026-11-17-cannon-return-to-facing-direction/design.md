# Design

## Context

See proposal.md - Why. Player tank turret rotation is currently updated in the frontend render loop using the replicated target position. The shared heading helper preserves the previous angle when no target position is available.

## Goals / Non-Goals

**Goals:**
- Keep cannon orientation synchronized with the tank's current target focus and facing direction.
- Make the change in frontend presentation without altering combat targeting or network state.

**Non-Goals:**
- Change target selection, movement, firing, or chassis orientation behavior.
- Add a new replicated field or persistent cannon-angle state.

## Decisions

- Use the tank's current chassis rotation as the fallback heading when no valid target position is available. Continue using the existing target-position heading calculation while a valid target is available.
- Keep this behavior in the existing client-side tank rendering update loop; this avoids changing server combat semantics or the replicated state contract.

## Risks / Trade-offs

- If target visibility or validity changes between state updates, the cannon may turn back on the next render update; this is consistent with the currently available target data and avoids retaining an angle aimed at a stale or unavailable unit.
