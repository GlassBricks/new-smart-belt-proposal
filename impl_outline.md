# Smart belt implementation

A few components needed, in roughly decreasing order of abstraction:

- Cursor tracking

World abstraction.
Handles:
  - Rotation, flipping, and geometry
  - ghosts deconstructed entities, etc. depending on drag type
  - Belt state/shape queries
  - Applying actions in-world, with undo
  - Sending entire drag main undo/redo stack

Undo stack and undo actions
  - To be able to restore world (and drag handler state!) to previous states

Full drag handler
- Handles starting drags, rotations, and reversing drag direction
- Tracks drag start position and type (valid belt, original rotation)
- Handles rotations

Straight Drag handler
- Main functions: advance, undo
- Incremental obstacle detection and tracking
- Tracks belt segments, including "continuable" segments
