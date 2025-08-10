# Smart Belt Specification

## 1. Goals

Enable users to drag belts over obstacles with intuitive, reliable behavior.

### 1.1. Basic Requirements

- Belts automatically underground over obstacles
- Un-dragging restores entities to their previous state
- Rotation starts a new drag at the cursor position
  - Belt direction can be flipped by dragging left/right during rotation
- Users are notified when belt lines cannot be completed for any reason.
- Intuitive behavior

### 1.2. Other requirements

- **Traverses Obstacles**: Always goes over obstacles when possible
- **Continuity**: Dragged belt lines are always valid and continuous. An error occurs if the line cannot be completed for any reason.
- **Error notification**: Operations stop and notify users when belt lines cannot be completed.
- **Integrating existing belts**: Incorporates existing compatible belts, splitters, and undergrounds
- **Non-interference**: Does not affect non-integrated existing belts. This includes even after an error state.
- **Non-destructive**: Forward dragging never deletes existing entities (but may modify them)
- **Clean undo**: Backward dragging restores all entities to a previous state
- **Bidirectional consistency**: Dragging the same path backward yields the same result as forward dragging

### 1.3. Additional details

An error state is any condition in which an underground belt cannot be successfully placed.
New underground pairs are only placed when both entrance and exit can be placed.
Non-interference rules apply EVEN after an error state.

### 1.4. Currently not handled

**Respecting existing un-paired underground belt.**
Currently, these are all treated like belts and can be over-written.
This might break existing side-loads.
However, this replace-behavior allows quickly fixing broken underground belts.
Supporting the former (preserving side loads) would be more complicated; and the value of quickly fixing broken underground belts may be higher.

## 2. Obstacle classification

This goes into more detail about what counts as an "obstacle".

### 2.1. Tile Types

When dragging over tiles, each tile is classified as exactly one of the following:

- **Empty**: Available for belt placement
- **Compatible belt**: Existing belt that can be integrated
- **Compatible splitter**: Existing splitter that can be integrated
- **Obstacle**: Blocks belt placement
- **Impassable obstacle**: Cannot be undergrounded past (i.e. an inaccessible underground belts in the same axis)
- **Pass-through underground**: Existing paired underground belt where contents between pairs are ignored
- **Fast-replaceable underground**: Lonely underground belt replaced with normal belt

### 2.2. Belt Segment Accessibility

A belt segment is accessible if the current drag can integrate it without affecting perpendicular transport lines.
This will affect later rules

**Classification rules**:

- All considerations, such as curvature, are done **ignoring** any newly placed belts from current drag
- Curved belts are inaccessible
- Backwards splitters are inaccessible
- Any belt-connectable entity directly connected to inaccessible belt-connectable entity is also inaccessible
- Side-loaded connections do not propagate inaccessibility

### 2.3. Entity Classification Rules

#### 2.3.1. Transport Belts

- **Perpendicular belts**: Always obstacles
- **Parallel belts**: Compatible if accessible, otherwise obstacle

#### 2.3.2. Splitters (including 1x1 splitters)

- **Different direction**: Obstacles
- **Cannot connect both side**: Obstacle, if the drag cannot connect to both entrance/exit
- **Correct direction**: Compatible if accessible, otherwise obstacle

#### 2.3.3. Underground Belts

- **Perpendicular undergrounds**: Always obstacles
- **Accessible undergrounds**:
  - Lonely same-axis underground: Fast-replaceable (replaced with straight belt)
  - Paired same-axis underground: Pass-through
- **Inaccessible undergrounds**:
  - Different tier: Obstacle (enables belt weaving)
  - Same tier: Impassable obstacle

#### 2.3.4. Other

- **Loaders and all other entities**: Obstacles

## 3. Straight-Line Dragging

### 3.1. Objective

Place valid underground belts over all obstacles, while integrating existing compatible belts and existing pass-through undergrounds.
If impossible, error at the first problematic position without affecting non-integrated belt lines.

### 3.2. The main belt logic algorithm

The jist:

- Drags belt.
- If going pass an obstacle, creates an underground (if possible).
- Extend previous undergrounds if not enough room for new input underground.
- If going through a pass-through underground:
  - Checks for incompatible upgrade
  - If valid, ignores everything until going pass the exit underground.
- Creates errors if:
  - Underground too long
  - Impassable object.
  - Output of pass-through underground is blocked.

NOTE:

- The exceptional cases of the very first belt segment is not handled here. See section 4.1.3.

Note: This is not the full thing; this only gives the expected outcome.
The full algorithm will also have to determine (incrementally!) what things count as obstacles, and handle errors, and keep track of other state.

**Input requirements:**

- First element must be already a belt

```python
require(tiles[0] == 'belt')

last_underground_entrance: int = 0
obstacle_encountered: bool = False
last_underground_exit: int | None = None
pass_through = None

def advance(index: int, tile_type: TileType):
    # ignore everything if is pass_through_underground
    if pass_through is not None:
        if index <= pass_through:
            return
        pass_through = None
        last_underground_entrance = None

    match tile_type:
        case 'empty' | 'compatible_belt' | 'compatible_underground':
            if not obstacle_encountered:
                place(index, 'belt')
                last_underground_entrance = index
            elif last_underground_entrance is None:
                error("Entity in the way", index)
            not is_reachable(last_underground_entrance, index):
                error('too long to connect', last_underground_entrance)
            else:
                if last_underground_exit is None:
                    place(last_underground_entrance, 'underground')
                else:
                    restore(last_underground_exit)
                place(index, 'underground')
                last_underground_exit = index
                obstacle_encountered = False
        case 'obstacle':
            obstacle_encountered = True
            pass
        case 'impassable_obstacle':
            error("can't pass", last_underground_entrance or index)
        case 'pass_through_underground':
            #scan entire underground for impassable_obstacles
            if needs_upgrade(index):
                if any impassable_obstacle in between the undergrounds:
                    error("Cannot upgrade underground")
                if not try_upgrade(index):
                    error("Cannot upgrade underground")
            # otherwise, ok
            pass_through = exit_of(index)
```

### 3.3. Placing entities

When the above alg places entities:

- **Empty space**: create the entity.
- **Compatible belts/undergrounds**: Rotated to correct direction. and upgrade if needed
- **Compatible splitters**: Assert not being replaced with underground. TODO: should we try upgrading the splitter if needed to? I vote yes

### 3.4. On Error

When underground placement or upgrades fail:

- If error is due to underground too long or impassable obstacle:
  - The underground pair is removed, if present
  - The would-be underground entrance is removed, if present
    - **Exception**: If the underground entrance is also the drag start, restore to straight belt, instead of deleting it
- If the error is due to an un-upgradable underground:
  - Do not upgrade; stop right before the entrance.
- If the error is due to an entity in the way:
  - Stop right before the obstacle.

Note: removal due to error should be undo-able by reverse dragging

## 4. Drag Operations

Logic for starting and rotating a drag.
Inputs: a series of valid cursor positions, and times when rotate was pressed.

### 4.1. Starting a Drag

The very first click is special, in that it may fast_replace something else first before placing a belt.
(That may also be considered as a separate player undo item).

#### 4.1.1. Valid starting positions:

- Placeable tile
- Fast-replaceable entity
- Existing same-direction belt

If the start position is not valid:

- an error SOUND plays.
- Continuing to drag in on direction, will start a drag at first placeable position afterwards.

#### 4.1.2. After start:

- Cursor locks to the belt line's direction.
- Undragging and flipping direction, changes belt line direction (forward/backward).

- A valid first belt can never be removed by dragging, only updated.
- An invalid first belt (started elsewhere): _must_ be removed by backward dragging

#### 4.1.3. First belt segment:

If the cursor STARTS on an existing belt segment whose first belts are in the same direction as the drag, the drag will do it's best to integrate the belt, even if it's otherwise incompatible:

- On encountering a curved belt, straightens it out (and ends the belt segment)
- On encountering a splitter, either integrates it, or errors if it's not possible to continue the splitter

### 4.2. Drag rotation

Rotation happens when in the middle of another drag.

Similar to starting a drag, with the following differences:

- Undragging and flipping direction changes belt line direction (left/right), not belt direction (forward/backward).
- A rotate _cannot_ be started at an invalid pivot. This creates an error and preserves the current drag.

#### 4.2.1. Pivot validity:

The pivot is valid if

1. it is a belt, and
2. Either of the following:

- Is empty, compatible belt, or fast-replaceable underground
- Is an inaccessable belt segment, BUT where all encountered parts are same-direction belts (the belt drag encounters same direction belt, that eventually curves).
  Note: we don't care about the rotation of the pivot belt. This allows "continuing" a belt segment that ends in a curved belt, at the curve.

#### 4.2.2. After start:

- The pivot belt is straightened if it is not already on the correct axis.
- Belt line started at perpendicular axis.
- Undragging to pivot restores the pivot belt to the **same direction as the previous drag**. This may mean rotating the pivot belt.

#### 4.2.3. Possible enhancement?

- Starting a rotate straightens out the pivot belt, if it is not already straight.
- Hitting rotate twice on the pivot belt continues the PREVIOUS drag

This allows going to a compatible curved belt pivot, rotating it to be straight again, then continuing; all in one drag.

### 4.3. Undragging

Undragging always undoes actions performed by the current drag via maintained undo stack.

**Supported undo actions:** Rotate, place/mine, upgrade. Everything else might be ignored.
**Not supported:** Restoring settings, restoring ghosts from deleted undergrounds.

**Some consequences of this behavior:**

- Only placed belts can be mined
- Only rotated belts can be rotated
- Undergrounds may shorten when dragged backward to early exit

**Consistency check**: If world state is inconsistent (other players, explosions, biters), undo action is ignored entirely

## 5. Feature Interactions

### 5.1. Undo redo stack

- Undragging manages a "mini" undo stack, but we also have the MAIN undo/redo stack.

These should be ctrl-z undoable:

- The very first belt's fast replace, if applicable.
- All belts placed in the last straight-line drag.
  - Rotating ends the current straight-line drag, so rotations create multiple undo items.

### 5.2. Ghosts

- **Real belt dragging**: Ghosts completely ignored
- **Ghost belt dragging**: Both ghosts and real entities considered

### 5.3. Entities Marked for Deconstruction

- **Ghost dragging**: Deconstructed entities completely ignored
- **Real entity dragging**: Deconstructed entities treated as obstacles (if it collides with belt).

### 5.4. User Interactions

- **Material shortage**: Running out of real belts cancels drag
- **Insufficient undergrounds**: Creates ghosts instead (with error notification), possibly mining an existing belt
- **Upgrades**: Either actually places upgraded, or marks for bot upgrade, depending on type and if the player has enough materials.
