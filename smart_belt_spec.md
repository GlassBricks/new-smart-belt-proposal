# Smart Belt Specification

## 1. Goals

Enable players to drag belts over obstacles with intuitive, reliable behavior.

### 1.1. Basic Requirements

- Belt drags in a straight line and automatically places underground belts over obstacles.
- Player is notified when belt lines cannot be completed for any reason.
- Supports dragging forwards and backwards.
- Supports rotation.
- Supports undoing actions by "un-dragging" belt in the reverse direction.
- Incorporates existing compatible belts, splitters, and underground belts going in the same direction as the drag if possible; flipping, rotating, and upgrading them as needed.

### 1.2. Desired Properties

- **Intuitive**: All behavior should be easily understood.
- **Continuity**: Valid belt lines are always valid and continuous; the start position will always be belt-connected to the end position.
- **Complete**: Always creates a valid belt line if possible, and gives an error if not.
- **Non-interference**: For ALL non-integrated entities and belts, they should remain completely untouched. This includes changing the rotation of a belt, and includes behavior after an error state.
- **Non-destructive**: Forward dragging never deletes existing entities (but may modify them if incorporated).
- **Clean undo**: Backward dragging restores all entities to exactly their previous state.

### 1.3. More Details

- Supports belt weaving (underground belts of different tiers don't interfere).
- An error state is any condition in which the belt line cannot be successfully placed.
- New underground belts are always placed as a pair.
- In an error state due to an unplaceable underground belt, the entrance underground belt should be removed.
- Support naturally continuing existing belt lines.
- Support fixing broken underground belts.

#### 1.3.1. Unpaired Underground Belts

Currently, these are all treated like belts and can be overwritten.
This might break existing side-loads.
However, this replace behavior allows quickly fixing broken underground belts.
Supporting the former (preserving side loads) would be more complicated, and the value of quickly fixing broken underground belts may be higher.

### 1.4. Nice to Have (Future Extensions?)

- Support un-rotating by pressing rotate twice on the original pivot point.
- Support interactions with ghost belts.

## 2. Obstacle Classification and Integrated Belts

This section goes into more detail about what counts as an "obstacle".
This is important since the conditions in which a belt line is an obstacle can be quite complicated.

### 2.1. Tile Types

When dragging over tiles, each tile is classified as exactly one of the following:

- **Empty**
- **Compatible belt**: Existing belt that should be integrated.
- **Compatible splitter**: Existing splitter that should be integrated.
- **Obstacle**: Blocks belt placement.
- **Fast-replaceable underground belt**: Lonely (unpaired) underground belt that may be replaced with a normal belt.
- **Pass-through underground belt**: Existing paired underground belt that the drag will use. Tiles in between are mostly ignored.
- **Impassable obstacle**: Cannot be traversed past (an inaccessible underground belt in the same axis, which would break a new underground belt pair).

### 2.2. Inaccessible Belt Segments

From experimentation, we found the most desirable behavior requires analyzing entire belt segments together.

A **belt segment** is a series of connected belts, underground belts, and splitters. A side-loading belt does not create belt segment connectivity.

An **inaccessible belt segment**, loosely speaking, is a belt segment that cannot be integrated into the current belt drag without affecting existing belt lines that go elsewhere.
Accessible belt segments can be entirely overlapped by the drag.

#### 2.2.1. Belt Accessibility Rules

- All curved belts are inaccessible.
- Splitters that do not go in the direction of the drag are inaccessible.
- Any belt, underground belt, or splitter that directly connects to an inaccessible entity is part of the same inaccessible belt segment.
- Side-loaded connections do not propagate inaccessibility.
- Otherwise, all other belt components (belts, splitters, and underground belts) parallel to the current drag are accessible.

#### 2.2.2. Last Belt Segment

If there is a belt segment which:
at the point in which the current drag meets the segment, the segment has belts in the same direction as the drag.
As long as the belt segment continues to consist of only same-direction belts, it is not considered inaccessible UNTIL attempting to pass the first entity that is not a same-direction belt.

This basically means you're allowed to end a drag at a straight-then-curved belt.

#### 2.2.3. Further Details

Belts outside of the current row/column of the current drag are not considered.

All belt accessibility considerations, such as curvature, are done **ignoring** any newly placed belts from the current drag. Example: An existing belt is curved. However, a partially completed underground belt runs right before this belt, causing it to become straight. The belt will still be considered inaccessible.

These are more easily explained visually.

### 2.3. Entity Classification Rules

Now that we have a definition of accessibility, we can classify all entities to one of the tile types in Section 2.1.

#### 2.3.1. Transport Belts

- **Perpendicular belts**: Always obstacles.
- **Parallel belts**: Compatible if in an accessible belt segment. Obstacle otherwise.

#### 2.3.2. Splitters (Including 1x1 Splitters)

- **Different direction**: Obstacle.
- **Part of inaccessible belt segment**: Obstacle.
- **Correct direction**: If the current belt line can connect to _both_ sides of the splitter (can both enter and exit the splitter), it is compatible. Otherwise, it is an obstacle.

#### 2.3.3. Underground Belts

- **Perpendicular underground belts**: Always obstacles.
- **Part of accessible belt segment**:
  - Unpaired underground belt: Fast-replaceable (may be replaced with straight belt).
  - Paired underground belt: Pass-through underground belt (dragging belt will mostly ignore tiles in between).
- **Part of inaccessible belt segment**:
  - Different tier of underground belt: Obstacle. This enables belt weaving!
  - Same tier of underground belt: _Impassable_ obstacle.

#### 2.3.4. Other

- **Loaders and all other entities**: Obstacles.

## 3. Straight-Line Dragging

### 3.1. Objective

Place valid underground belts over all obstacles, while integrating existing compatible belts and pass-through underground belts.
If impossible, error at the first problematic position.
Never affect non-integrated entities.

### 3.2. The Main Belt Logic

- Places belt.
- If going past an obstacle, creates an underground belt at the last valid underground belt entrance position (if possible).
- Removes and extends previous output underground belts if there is not enough room for a new input underground belt.
- If going through a pass-through underground belt:
  - If the underground belt would be upgraded, checks that there are no impassable underground belts in-between the upgraded underground belts! This ensures that you don't break belt weaving by upgrading.
  - Otherwise, ignores everything until passing the exit underground belt.

NOTE: See Section 4.1.5 for special casing for the very first belt segment.

### 3.3. Error Handling

Generally:
All errors notify the player with an appropriate message.
Any actions caused by an error should be undoable by reverse dragging.

(TODO: Debate the following)
If an error occurs, NO ENTITIES WILL BE PLACED if continuing to drag forwards. This prevents the player from dragging an invalid belt and notifies the player of errors as soon as they occur.

- Note: The player can override this by simply releasing the current drag and starting a new one.

Underground belt is too long:

- If a previous underground belt was placed, remove the input and exit underground belts.
- Otherwise, remove the belt that would have been the entrance underground belt.
  - This ensures ending the drag does not interfere with an existing belt.

Impassable underground belt:

- If due to trying to place an underground belt, remove the underground belt entrance.
- If due to a pass-through underground belt upgrade, do not upgrade the underground belt.

Output blocked:

- Simply notify the player something is in the way.

### 3.4. Placing Entities

When the above behavior places entities:

- **Empty space**: Create the entity.
- **Compatible belts/underground belts**: Rotate, upgrade, or fast-replace as needed.
- **Compatible splitters**: Rotation should not be necessary. TODO: Should we also upgrade the splitter if needed? I vote yes.

## 4. Full Drag Operations

Logic for starting, undoing, and rotating a drag.

### 4.1. Starting a Drag

A drag starts when the player places and holds down a belt.
A drag is created in the same line as the belt.
Dragging forwards or backwards determines the belt orientation.

#### 4.1.1. Fast Replace on the First Entity

On starting the drag, the very first click is special in that it may fast replace something (such as replace a splitter with a belt). This overrides other fast-replace rules here.
A change due to _fast-replace_ will be a separate undo/redo item from the drag.

#### 4.1.2. Valid Starting Position

Behavior may differ depending on whether the start position is valid or not.

The start position is valid if it contains a belt in the same direction as the drag.
Namely, this occurs when the start position is:
- A placeable tile
- A fast-replaced entity
- Existing same-direction belt

If the start position is not valid, an error sound plays.
However, continuing to hold and drag will start a drag at the first placeable position afterwards.

#### 4.1.3. Flipping Direction

- Flipping direction changes belt line direction (forward/backward).
- Flipping direction should NOT create underground belts if starting at an invalid position.

#### 4.1.4. Un-dragging

Following the principle of clean undo:

- A valid first belt can never be removed by dragging, only maybe replaced with an underground belt.
- An invalid first belt (started elsewhere) _must_ be removed by backward dragging.

#### 4.1.5. Special Handling for First Belt Segment

If the first belt cleanly connects to a belt segment that would otherwise be inaccessible, that belt segment is treated specially:

Integrate all belts if possible.
At the first non-belt/underground belt that does not go in the same direction, we have only 2 possible cases if it's part of the same segment:
- If it's a curved belt, rotate that belt! This ends the belt segment.
- If it's a splitter, if the output is not blocked, continue integrating belts.
  - Otherwise, if the splitter output is blocked, this is an ERROR (something is in the way).

Justification: We want the first belt segment that the player clicks on to always be considered part of the current drag, not an obstacle. This may mean straightening out a belt (ending the segment). If encountering a splitter we cannot exit, there is no way to continue the belt segment, so we give an error.

### 4.2. Rotation

Rotation happens when pressing rotate in the middle of a drag.

This is very similar to starting a drag, with the following differences:

- Un-dragging and flipping direction changes belt line direction (left/right), not belt direction (forward/backward).
- A rotation _cannot_ be started at an invalid position.

This creates an error and does not initiate a rotation.
TODO: Debate the above.

#### 4.2.1. Rotation Position Validity

The start position of a rotation is valid if it is a belt and is accessible.

Note: If dragging forwards further would make the current belt segment we're overlapping inaccessible, as long as we have not actually tried to place an underground belt over the segment, it is still considered valid/accessible. See also Section 2.2.3.
This may mean the rotation point is actually a curved belt!

This is better explained visually.

#### 4.2.2. Starting a Rotation

- The pivot belt is straightened to the previous drag direction, if needed.
- Belt line is created on a perpendicular line.
- Dragging left or right creates a new drag in the same belt orientation as the previous drag.
- Un-dragging to the pivot restores the pivot to be straight compared to the previous drag.

#### 4.2.3. Possible Enhancements?

- Hitting rotate twice on the pivot belt continues the PREVIOUS drag. This would allow saying, "Oops, I didn't want to rotate here."

This could also involve going to a compatible curved belt pivot, rotating it to be straight again, then continuing—all in one drag.

### 4.3. Un-dragging

Un-dragging always undoes actions performed by the current drag.

TO DECIDE: How rich of an undo support we want to provide. Allow restoring settings/ghosts?

**Consistency check**: If world state is inconsistent (other players, explosions, biters), the undo action is ignored.

There is no redo; un-dragging may reevaluate tiles ahead of the current drag, which may have different conditions if entities have been changed.

Some consequences:

- Only placed belts can be mined.
- Only rotated belts can be rotated.
- Un-dragging may _place_ entities (underground belts previously deleted).

## 5. Feature Interactions

Such as ghost vs real entity dragging.

### 5.1. Undo/Redo Stack

- Un-dragging may need to manage a "mini" undo stack, but we also have the MAIN undo/redo stack.

These should be Ctrl+Z undoable:
- The very first belt's fast replace, if applicable.
- All belts placed in the last straight-line drag.
- Rotating ends the current straight-line drag and starts a new one, creating a new undo action.

### 5.2. Ghosts

- **Real belt dragging**: Ghosts completely ignored.
  - Future enhancement: Interactions with ghosts (a.k.a. a séance).
- **Ghost belt dragging**: Both ghosts and real entities considered.

### 5.3. Entities Marked for Deconstruction

- **Real entity dragging**: Deconstructed entities _always_ treated as obstacles (if there is collision), even if they would otherwise be integrated.
- **Ghost dragging**: Deconstructed entities completely ignored.

### 5.4. Player Interactions

- **Material shortage**: Running out of real belts cancels the drag. This does mean you can't undo anymore, but dealing with this could be complicated, so we just have this for now.
- **Insufficient underground belts**: Creates ghosts instead (with error notification). This will mine the input underground belt position.
- **Upgrades**: Either places upgraded materials or marks for bot upgrade, depending on whether ghost dragging is active and whether the player has enough materials.