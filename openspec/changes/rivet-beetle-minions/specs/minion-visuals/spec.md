# Spec Delta

## Purpose

Defines the appearance and movement-driven walking animation of the existing automatic minions, keeping them distinct from player tanks.

## ADDED Requirements

### Requirement: Mechanical beetle appearance
The frontend SHALL render each minion as a compact mechanical beetle with four articulated legs, a hexagonal team-colored hull, light visor, rivets and a short cannon. Blue and red team paint SHALL match the player tank palette. The nominal minion size and existing health bar SHALL be preserved, without surrounding circles or gameplay changes.

#### Scenario: A minion spawns
- **WHEN** a blue or red minion appears
- **THEN** its beetle model uses the corresponding team paint and has four legs, a visor and cannon at the existing small minion scale
- **AND** its existing health bar remains visible above it

### Requirement: Movement-driven walking
The frontend SHALL animate alternating diagonal leg pairs while a minion visibly travels. Walking speed SHALL follow travelled distance, and legs SHALL stop at rest when movement ends. The body SHALL face travel direction while the cannon independently faces the current combat target.

#### Scenario: Minion travels between state updates
- **WHEN** a minion moves along its lane
- **THEN** its rendered motion and alternating leg movement continue smoothly between replicated position updates

#### Scenario: Minion slows down
- **WHEN** a minion covers less distance in the same time
- **THEN** its walking cycle advances proportionally less

#### Scenario: Minion stops to fight
- **WHEN** a minion reaches its rendered destination and remains stationary
- **THEN** its legs remain in the resting pose without walking in place
- **AND** its cannon can aim independently without turning the body

### Requirement: Minion visual lifecycle
The frontend SHALL remove the complete minion model and its health bar when the minion is removed or the arena presentation is cleared.

#### Scenario: Minion removal
- **WHEN** a minion is removed from the match
- **THEN** its body, cannon, legs, shadow and health bar are destroyed without lingering animation

#### Scenario: Leaving the arena
- **WHEN** arena presentation is cleared
- **THEN** no beetle objects or movement state remain
