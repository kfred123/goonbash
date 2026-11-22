# Design

## Context

See `proposal.md` for motivation. `GameScene.showWaitingLobby` draws two 350-pixel-wide team panels in a scaled 800-by-600 reference viewport. Rows currently use 18-pixel spacing, include name, role, and readiness, and expose an interactive `X` for host bot removal. `showBotSetup` destroys the lobby menu and renders a separate role/difficulty/team-selection screen.

`canManageBots` already permits only a human host in the waiting phase, independently of readiness. The room validates `add_bot` and `remove_bot`, tracks occupied bot seats through `LobbyRegistry`, and keeps team information in both tanks and match statistics. Human `change_team` operates only on the sending client's tank and cannot move a bot. The implemented `add-team-ai-players` change is still unarchived; this proposal extends that behavior rather than replacing its specifications.

## Goals / Non-Goals

**Goals:** Keep transient popup state separate from authoritative roster state; reuse Phaser menu primitives and viewport scaling; make row actions readable without breaking full-roster layouts; reuse existing server authorization and error delivery.

**Non-Goals:** No AI-policy changes, schema migrations, new UI framework, bot role/difficulty editing after creation, or expanded permissions for human team changes.

## Decisions

### 1. Team-scoped popup instead of a new navigation screen

Replace the boolean bot-setup flag with an optional popup draft containing the originating team, role, and difficulty. Opening either team's add button initializes medium difficulty and Damagedealer role. Display the selected team as context, not as another editable choice. Preserve role selection as a compact selector using the existing supported role list.

Render the lobby normally, then draw the popup and an input-blocking backdrop above it using existing Phaser primitives. Popup elements and the Escape listener have an explicit lifetime and are disposed on cancellation, confirmation, phase change, authority loss, leaving, or scene teardown. The backdrop prevents pointer events reaching covered roster, readiness, start, and leave controls; closing the popup restores normal access.

The existing full-screen setup is rejected because it hides the roster and requires a redundant team choice. A browser-native prompt is rejected because it cannot provide the existing role/difficulty choices consistently with the scaled game UI.

### 2. Explicit row buttons and bounded roster layout

Place `Team wechseln` and `Entfernen` after the bot details rather than using the existing isolated `X` or an unlabeled icon menu. Use a two-line bot row if needed: name/role/difficulty/readiness followed by the two labeled actions. Reserve an add-button area within each team panel, including empty teams.

Use bounded roster scrolling when rows exceed the available panel area. Clip both rendering and hit targets, so off-screen rows cannot intercept clicks, and keep the add action outside the scrolling content. Preserve readable labels, name truncation, team distinction, and viewport scaling. Validate a ten-participant single-team roster as well as mixed and empty rosters; reducing the font until everything fits is not an acceptable alternative.

### 3. Dedicated authoritative bot team-change request

Add `change_bot_team` with `{ botId, team }`, where `team` is the requested red or blue destination. The client derives the opposite team from the latest synchronized bot row. The server validates the unknown payload, current human host, waiting phase, target bot, and destination before mutation. Reuse the room's existing lobby rejection channel for failures.

Update the bot's tank team and match-statistics team in the same synchronous handler. Retain the tank object, ID, name, role, difficulty, readiness, and registry seat counts. A valid request to the current team is a harmless no-op. Gameplay initialization continues to use the resulting team through the existing match-start lifecycle.

Do not reuse human `change_team`: its readiness lock and client-owned target are intentionally different. Do not remove/recreate the bot: that would change identity and occupancy and could lose metadata.

### 4. Revalidate transient controls against live state

Include popup state and roster scroll state in render invalidation, and derive bot controls through the existing presentation helper using the current room state. State refreshes must preserve draft choices while authorized, disable add confirmation if the lobby fills, and discard the draft immediately when waiting authority ends.

Actions send requests without locally editing the roster or seat counts. Clear previous lobby errors before a new request; display server rejection through the existing error UI. Closing the popup after sending an add request returns the user to the roster, where acceptance or failure is visible. Button callbacks must recheck current permission and target membership rather than trusting captured render-time values.

Optimistic roster changes are rejected because races with countdown, host succession, removal, and capacity would temporarily present unaccepted state.

## Risks / Trade-offs

- [Labeled buttons need more space than `X`] -> Use multi-line rows and bounded scrolling with non-overlapping hit targets rather than shrinking labels.
- [Menu redraws can erase drafts or leak listeners] -> Give popup state an explicit lifecycle and dispose visual/input objects during redraw and scene teardown.
- [Host, phase, capacity, or bot membership changes between rendering and clicking] -> Recheck live state in callbacks and validate every request on the server.
- [The bot baseline is not yet archived] -> Keep new UI requirements additive and the bot team-change requirement distinct; archive the baseline first when consolidating specifications.
- [Old clients cannot switch bots] -> Keep existing creation/removal message contracts unchanged; the new server message is additive.

## Migration Plan

Deploy the backend handler before or together with the frontend controls. No persistent data migration is needed. If the frontend reaches an older backend, the existing unknown-action rejection remains visible rather than reporting success. Rollback can restore the old frontend without removing server support for legacy add/remove requests.

During specification consolidation, archive `add-team-ai-players` before this change so its existing bot-management requirements are retained alongside this extension.
