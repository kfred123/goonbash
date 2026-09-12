## Why

The current waiting lobby shows only a player count, so players cannot organize into teams or control when a match begins. Adding explicit team selection and host controls makes the lobby usable for coordinated matches.

## What Changes

- Assign joining players to the smaller of the red and blue teams.
- Let lobby participants switch between the red and blue teams while the match is waiting.
- Designate the lobby creator as host and allow only that player to rename the game and start it.
- Synchronize lobby roster, team assignments, game name, and started state to every connected player.
- Start the gameplay state for all connected players when the host starts the game.

## Capabilities

### New Capabilities
- `lobby-team-management`: Team balancing, voluntary team changes, host permissions, lobby renaming, and synchronized match start.

### Modified Capabilities
- `client-lobby-menu`: The waiting-lobby UI must show player teams and host-controlled pre-game actions.

## Impact

- Shared lobby and room-state contracts.
- Colyseus room lifecycle, message handling, and authorization.
- Phaser waiting-lobby UI and transition into gameplay.
