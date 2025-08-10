# Implementation notes

## Outline

A few components needed, in roughly decreasing order of abstraction/chain of responsibility:

- Cursor tracking

World abstraction.
Handles:
  - Rotation, flipping, and geometry
  - Ghosts deconstructed entities, etc. depending on drag type
  - Entity, belt state/shape queries
  - Applying actions in-world
  - Undo redo stack

Undo stack and undo actions
  - To be able to restore world (and drag handler state!) to previous states
  - Maybe just hijack existing undo redo stack

Full drag handler
- Handles starting drags, rotations, and reversing drag direction
- Tracks drag start position and type (valid belt, original rotation)

Straight Drag handler
- Main functions: advance, undo
- Incremental obstacle detection and tracking
- Tracks belt segments, including "continuable" segments

## Drag handler

### On belt accessibility

We treat the definition of an inaccessible belt segment as the "ground truth" for behavior.
However, we do not need to pre-compute all connected belt segments at once.
This can be done incrementally as we advance the drag.

Expect a state machine diagram here soon

### Naive straight-line drag handler

Does not handle all cases (yet).
Actual implementation will be slightly different (incremental obstacle tracking)
Handles:
- obstacles
- simple undergrounds
- Pass-through underground
- simple belt weaving

Not supported yet:
- Undo
- Incremental belt segment tracking
- All rotations & upgrades
- First belt segment special casing

```python
# in: tiles, advance fn
# out: function calls

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
