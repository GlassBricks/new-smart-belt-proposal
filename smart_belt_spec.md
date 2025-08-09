# Smart Belt Specs

## 1. Goals

- User can drag belt over stuff, and it works.
Note: "belts" in this doc sometimes refers to all of belts, splitters, and undergrounds.

### 1.1. Basic specs


- Belt will underground over "obstacles".
- Undragging will restore entities to a previous state.
- Rotate will start a new drag at the cursor. Can be dragged left/right flip rotation direction.
- If the belt line is broken for any reason, the user will be notified.
- Intuitive behavior.

### 1.2. Expectations

- **Goes over obstacles if possible**.
- **Always continuous**: If there are no errors (or explicit exceptional cases), the dragged belt line will _always_ be valid and continuous. If anything prevents the belt from being continuous, the user will be notified.
- **Always stops and notifies on error**: If the belt line cannot be dragged for any reason, the user will be notified.
- **Can integrate existing belts, splitters, and undergrounds**: Dragging will integrate already placed belt connectable items if they are "compatible" with the current drag.
- **Does not affect non-integrated belts**: Any existing belts that that are not integrated should not be affected, includes changing a belt's curvature. This should also be true AFTER an error.
- **Does not delete existing entities**: Dragging forwards will never _delete_ existing entities. They may only possibly be modified.
- **Clean undo**: Dragging backwards will always return any entities to their previous state. This includes dragged belts, and previously existing belts.
- **Same in both directions**: Dragging the same path backwards should yield the same path as dragging forwards in most reasonable cases.

## 2. Obstacles

This definition of obstacles tries to encapsulate expectations above; it also classifies belts/entities as compatible or non-compatible.

### 2.1. Rules

When dragging over tiles, all tiles are exactly one of the following:

- Empty
- Compatible belt
- Compatible splitter
- Obstacles
- Un-passable obstacle (inaccessible existing undergrounds)
- Pass-through underground belt (everything in between is ignored)
- Fast-replaced underground belt (replaced with normal belt, possibly back to underground belt if needed)

### 2.2. Entity classification

#### 2.2.1. Belts:

- Perpendicular belts are always obstacles.
- Otherwise, it's either an obstacle or compatible belt, depending on belt segment accessibility.

#### 2.2.2. Splitters (and 1x1 splitters):

- A splitter not in the same direction as the drag is an obstacle.
- A splitter which the current drag can not connect to the entrance/exit of is an obstacle.
- Otherwise, it's either an obstacle or compatible splitter, depending on belt segment accessibility.

#### 2.2.3. Underground belts:

- All perpendicular underground belts are obstacles.
- If the underground belt is accessible:
  - A same-direction lonely underground, will be replaced with a straight belt if dragged past, then all other rules apply.
    - ^ TO BE DEBATED
  - A same-axis paired underground belt is a pass-through underground belt.
- If the underground belt is NOT accessible:
  - If it is a different tier, it is an obstacle. (This handles belt weaving.)
  - If it is the same tier, it is an UNPASSABLE obstacle.

#### 2.2.4. Loaders and anything else

- These are obstacles.

### 2.3. Accessible belt segments

Loosely speaking, an belt segment is "accessible" if the current drag can integrate it without affecting any transport lines that go perpendicular to the current drag.
All inaccessible belt segments count as obstacles.

- Belt segments are classified, ignoring any belts **newly added** by the current drag.

- Any curved belt is inaccessible.
- Any (belts, splitters, 1x1 splitters, undergrounds) that connects to an inaccessible belt is also inaccessible.
- A belt that connects to an inaccessible belt through side-loading only is _not_ part of the same segment.

## 3. Expected outcome

A valid underground placement going over all obstacles and integrating existing belt, if it exists.
Else, a break at the first position where an underground is not possible, with an error, then treating the rest of the belt separately.

### 3.1. Algorithmically (expected outcome, not direct implementation)

Simplify the tile types in previous section to:

- Place-able (empty, compatible belt, lonely underground).
- Obstacle
- Unpassable obstacle.
- Pass through underground belt (with belt tier info)

Important note: since a splitter is only accessible if it's possible to output to both sides, a splitter is never surrounded by obstacles.

Input:
Assume the very first element is place-able.
- First array element must be place-able

Expected, going down:
- Ignore obstacles at the very end of the array.
- If an unpassable obstacle is encountered, an error occurs right after it.
- If an placeable tile is surrounded by obstacles on both sides, it is also an obstacle.
- Going left to right, if any series of obstacles exceeds the underground length, an error occurs there.
- If a pass-through underground contains an inpassable obstacle inside it AND is not the same belt tier, then an error occurs before the obstacle.

Any 2 consecutive empty tiles creates a "reset" point where we can break the array in 2, run the same algorithm on each half, and get the same result.

- Otherwise, undergrounds before and after each obstacle block, respect pass-through undergrounds, and place belts on other empty tiles.

### 3.2. Upgrading and fast-replacing belt

- For overlapping a compatible belt or underground belt, it will be rotated and possibly upgraded.
- Splitters: also upgrade? (Currently, ignored)

- If a pass-through underground belt is _downgraded_ such that it is no longer long enough to pair, the underground is not updated, and this creates an error at the entrance underground.
- If upgrading the underground would change what it's paired with, it's also untouched and gives an error. Unsure if this case needs to be explicitly handled, given the below exception

### 3.3. Incremental dragging

At all points during dragging a drag, the placed belts should look like the spec above.
Exception, for a pass-through underground belt, if it is upgraded:
  - Check the entire extent in-between for un-passable obstacles. Give error if any are found.
  - Otherwise, ignore everything in between the pass-through underground belt.

### 3.4. Error handling

If an underground cannot be placed, or an upgrade fails:
- No belt is placed at the error point
- If applicable, the entity (belt or underground) at the last valid underground start position is removed.
  - Exception: the previous belt is a **starting** belt. In that case, it's restored to it's original state.
- This removal can be undone by reverse dragging.

## 4. Starting, rotating, un-dragging

### 4.1. Un-dragging belt

Un-dragging belt in ALL CASES shall be the same as undoing actions this drag performed.
This means maintaining an undo stack while dragging, for as long as the drag lasts.

Undo actions supported: rotate, place/mine, upgrade.
- Restoring belt settings or ghosts from deleted belt is not considered.
  - ^ TO BE DEBATED.
Consequences:
- Only placed belts can be mined, only rotated belts can be rotated.
- An underground may get shorter if you drag it backwards to an early exit spot

If the world is not consistent with the undo action, due to e.g. multiplayer or biters, the undo action is ignored:
- Un-placing a belt works as long as it is the same belt type
- Shortening an underground belt does not depend on the start underground
- Un-placing a underground belt works as long as there was an underground there

### 4.2. Starting a drag

The first position is considered "valid" if:
- it is a place-able tile. Belt is placed and the drag starts there
- it an existing belt in the same direction. Drag starts there.
- It is fast-replace-able to a belt. In this case, that is done, _before any other logic is applied_, then is treated as a belt. This effectively makes the very the first click special.

If a position is not valid, an error is given (something is in the way).
Otherwise, an error is given, and the drag starts at the next place-able position.

If the first belt placed is valid, it is un-removable by dragging.
Otherwise, any other belts placed by dragging forwards then backwards _are_ removable by dragging.

Regardless of validity:
Dragging forwards/backwards from this belt creates a drag, with the belt going in that direction.

### 4.3. Rotating

When rotating while holding down drag, a new perpendicular drag is started.
The start position is always at the cursor; called the "pivot".
A position is "valid" pivot if:
  - It is a belt, and
  - It is a "place-able", based on rules above
  - It is an "inaccessible" belt segment, but the drag joins the belt segment, which is going in the same direction as the drag, for all belts up to that point.
"valid" does _not_ depend on the rotation of the pivot, if it follows the rules above.

If the current position is _not_ a valid pivot, an error occurs, and the item at the current position _does not change_, even if it is a belt.

Rotating starts a new drag, in the same belt direction.
Going left or right:
- If the pivot is valid, it is rotated to match the drag direction.
- Un-dragging back to the pivot returns it to _it's initial state_, which may not be straight from the previous drag.
- A valid pivot can not be removed by dragging.

## 5. Other feature interactions

### 5.1. Ghosts

- When dragging real belt, ghosts are **completely ignored**.
  - (???) What happens if a ghost contributes to belt curvature? For now, also ignore
- When dragging ghost belt, both ghosts and real entities are considered.

### 5.2. Entities ordered for deconstruction

- When dragging with ghosts, deconstructed entities are **completely ignored**.
- When dragging with real entities, deconstructed entities are **considered obstacles** and are not affected.
  - currently you can "fast-delete" a belt this way. Do we want to actually allow this?

### 5.3. User interactions
- If using real belt, running out of belt is same as cancelling the drag.
- If using real belt, and there are not enough underground materials, ghosts will be created instead (with an error)
  - Ghosts are still undo-able
- If using real belt, upgrades are done if possible (or in editor mode), and bot upgrade-ordered if not.
