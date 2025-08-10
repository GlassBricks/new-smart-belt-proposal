# Smart Belt Specification

## 1. Goals

Enable users to drag belts over obstacles with intuitive, reliable behavior.

> **Note:** "Belts" in this document may also refers to transport belts, splitters, and underground belts, if applicable.

### 1.1. Basic Requirements

- Belts automatically underground over obstacles
- Undragging restores entities to their previous state
- Rotation starts a new drag at the cursor position
  - Belt direction can be flipped by dragging left/right during rotation
- Users are notified when belt lines cannot be completed for any reason.
- Intuitive behavior

### 1.2. Other requirements

- **Traverses Obstacle**: Always goes over obstacles when possible
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
- Any belt-connectable entity directly connected to inaccessible belts is also inaccessible
- Side-loaded connections do not propagate inaccessibility

### 2.3. Entity Classification Rules

#### 2.3.1. Transport Belts

- **Perpendicular belts**: Always obstacles
- **Parallel belts**: Compatible if accessible, otherwise obstacle

#### 2.3.2. Splitters

- **Different direction**: Obstacles
- **Incompatible connection**: Obstacles (cannot connect to both entrance/exit)
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

## 3. Straight-Line Dragging Algorithm

### 3.1. Objective

Place valid underground belts over all obstacles, while integrating existing compatible belts and existing pass-through undergrounds.
If impossible, error at the first problematic position without affecting non-integrated belt lines.

### 3.2. The main belt logic algorithm

**Input requirements:**

- First element must be already a belt

Pseudocode, but detailed.
Some notes:

- Tracks when last underground entrance/exit was placed.
- Updates state if underground needs to be placed.
- Handles pass-through for existing undergrounds, the moment the entrance is encountered.
- Creates errors in the appropriate locations if not possible.

Note: This is not the full thing; this only gives the expected outcome.
The full algorithm will also have determine (incrementally!) what things count as obstacles based on earlier rules, and handle errors, and keep track of other state.

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

    match tile_type:
        case 'empty' | 'compatible_belt' | 'compatible_underground':
            if not obstacle_encountered:
                place(index, 'belt')
                last_underground_entrance = index
            elif not is_reachable(last_underground_entrance, index):
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

- **Compatible belts/undergrounds**: Rotated to correct direction and upgrade if needed
- **Splitters**: assert not trying to set to underground, don't touch. TODO: should we try upgrading the splitter too?

### 3.4. On Error

When underground placement or upgrades fail:

- No belt is placed at error position
- Remove the last underground pair that caused the error (if applicable)
  - **Exception**: If the underground entrance is also the drag start, restore to original state instead of mining it

Note: this removal should be undo-able by reverse dragging

## 4. Drag Operations

Starting the drag.
Uses straight-line drags as a subroutine

### 4.1. Undragging

Undragging always undoes actions performed by the current drag via maintained undo stack.

**Supported undo actions:** Rotate, place/mine, upgrade. Everything else might be ignored.
**Not supported:** Restoring settings, restoring ghosts from deleted undergrounds.

**Some consequences of this behavior:**

- Only placed belts can be mined
- Only rotated belts can be rotated
- Undergrounds may shorten when dragged backward to early exit

**Consistency check**: If world state is inconsistent (other players, explosions, biters), undo action is ignored entirely

### 4.2. Starting a Drag

The very first click is special, in that it may fast_replace something else first before placing a belt.
(That may also be considered as a separate player undo item).

**Valid starting positions:**

- Placeable tile
- Fast-replaceable entity
- Existing same-direction belt

If the start position is not valid:
- an error SOUND plays.
- Continuing to drag in on edirection, will start a drag at first placeable position afterwards.

**After start**:
- Undragging and flipping direction, changes belt line direction (forward/backward).
- A valid first belt can never be removed by dragging, only updated.
- An invalid first belt (started elsewhere): _must_ be removed by backward dragging

### 4.3. Drag rotation

Rotation happens when in the middle of another drag.

Similar to starting a drag, with the following differences:

- Undragging and flipping direction changes belt line direction (left/right), not belt direction (forward/backward).

**Pivot validity:**
A drag can only be started if the cursor position's entity is valid.
^ TO BE DEBATED

The pivot is valid if
1. it is a belt, and
2. Either of the following:
  - Is empty, compatible, or fast-replaceable underground
  - Is an inaccessable belt segment, BUT where all encountered parts are same-direction belts (the belt drag encounters same direction belt, that eventually curves).
Note: we don't care about the rotation of the pivot belt. This allows "continuing" a belt segment, at the end, that would otherwise be inaccessible.

**On starting a drag**:
- Continues belt in given direction.
- Undragging to pivot restores the pivot's **initial** state (may differ from the direction of the previous drag!!).

## 5. Feature Interactions

### Undo redo stack

- Undragging manages a "mini" undo stack, but we also have the MAIN undo/redo stack.
These should be main (ctrl-z) undoable:
- The very first belt's fast replace, if applicable.
- All belts placed in the last straight-line drag.
   - Rotating ends the current straight-line drag, so multiple rotations creates multiple undo items.

### 5.1. Ghosts

- **Real belt dragging**: Ghosts completely ignored
- **Ghost belt dragging**: Both ghosts and real entities considered

### 5.2. Entities Marked for Deconstruction

- **Ghost dragging**: Deconstructed entities completely ignored
- **Real entity dragging**: Deconstructed entities treated as obstacles

### 5.3. User Interactions

- **Material shortage**: Running out of real belts cancels drag
- **Insufficient undergrounds**: Creates ghosts instead (with error notification), possibly mining an existing belt
- **Upgrades**: Either actually places upgraded, or marks for bot upgrade, depending on type and if the player has enough materials.
