# Smart belt implementation

A few components needed, in roughly decreasing order of abstraction:

- Cursor tracking

World abstraction.
Handles:
  - Rotation and geometry
  - ghosts
  - deconstructed entities
  - redo/undo actions
  - interacting with MAIN undo redo stack
  - Able to query belt state BEFORE any added belts contribute to it

Drag handler
  - Tracking start position and type (valid belt, original rotation), and when drag starts/end
  - Some obstacle logic
- Undo stack, restoring obstacle handler state

Obstacle handler
- Incremental obstacle detection and tracking
  - Tracks belt segments, including "continuable" segments

Undo actions
- (various)

And the abstraction is not pretty, of course
