# Tasks

## 1. Shared Ability Contract

- [x] 1.1 Add `tank-protection-dome` to the shared ability IDs, Tank ability catalog, and tuning (5-second duration, 180-unit radius, 35% rank-1 reduction increasing by 1 percentage point per rank to 44%, 30-second base cooldown); verify role ordering and rank 1/rank 10 configuration in shared tests.

## 2. Authoritative Dome Lifecycle and Replication

- [x] 2.1 Add a synchronized transient dome entity with owner/team, fixed center, radius, and expiration; create it only for valid learned Tank activations during a started match and remove it on expiration; verify activation rejection, placement, and expiration in backend tests.
- [x] 2.2 Project allied domes to their team and enemy domes only while visible, and add client-side state replication coverage; verify friendly/enemy visibility and hidden dome removal in serializer tests.

## 3. Dome Damage Protection

- [x] 3.1 Apply dome protection to living allied tanks and minions within the radius, including exact-boundary targets; verify same-team, unit-type, range, and expired-dome cases in backend combat tests.
- [x] 3.2 Combine dome protection with Tank Shield and Entrench by applying only the strongest active reduction across personal and overlapping dome effects; verify reductions are not stacked and normal damage resumes after protection expires.

## 4. Tank HUD and Dome Presentation

- [x] 4.1 Add the dome as the Tank's independent third HUD ability, bind R to it, and show its learned, active, and cooldown states; verify activation requests do not trigger Shield or Entrench using frontend ability-control tests.
- [x] 4.2 Render a stationary translucent ground-area indicator from visible replicated dome state and document the new Tank ability and controls in the player guide; verify the visual remains at its placed center after the Tank moves and documentation matches the HUD.

## 5. Integration Verification

- [x] 5.1 Run the relevant shared, backend, and frontend test suites and verify the full placement-to-expiration flow, allied damage reduction, vision-scoped replication, and independent ability progression.
