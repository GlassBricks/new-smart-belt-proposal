Smart Belt Specification

# Introduction, goals, and examples

## Sources

Inspiration and sources for this spec include:

- Many smart belt bug reports, which indicate a desire for different behavior. Some highlights:
  - https://forums.factorio.com/viewtopic.php?t=126645
  - https://forums.factorio.com/128742
  - https://forums.factorio.com/128715
  - https://forums.factorio.com/viewtopic.php?t=128845
  - https://forums.factorio.com/viewtopic.php?p=672248
  - https://forums.factorio.com/viewtopic.php?p=675773
- Several discussions with players (especially Factorio Speedrunners), about what should happen in specific situations
- A good think about what makes a smart belt "smart"

## Goals

Enable players to drag belts over obstacles with intuitive, reliable behavior.

### Basic Requirements

- Belt drags in a straight line and automatically places underground belts over obstacles.
- Player is notified when belt lines cannot be completed for any reason.
- Supports dragging belt in forwards and reverse directions.
- Supports rotation of the current drag.
- Incorporates existing compatible belts, splitters, and underground belts going in the same direction as the drag if possible; flipping, rotating, and upgrading them as needed.
  - This allows flipping and existing belt.
- All behavior should be easily understood.

### Desired Properties

Tries to pinpoint what it means for smart belt to be "correct". Try comparing these with the above bug reports:

- **Continuity**: In the absence of "errors", belt lines are continuous and unbroken; the start of a drag will always be belt-connected to the end of the drag.
- **Complete**: Creates a valid belt line if possible (from below rules). Always notifies the player with an error if not.
- **Non-interference**: ALL non-integrated entities and belts should be untouched. This means not changing the rotation of another belt.


### Desired capabilities

- Supports belt weaving (underground belts of different tiers don't interfere).
- Support "naturally" continuing existing belt lines.

#### Unpaired underground belts

New underground belts are always placed as a pair; no lonely underground belts.

However, for existing unpaired underground belts, we currently just always fast-replace them and treat it like belt.
This might break existing side-loads.
Supporting the former (preserving side loads) would be more complicated, and not too much of a value add.
We relegate this to a potential future extension/modification.

## Motivating examples

These show some particular examples that motivate many of the decisions in this spec.

All examples are when dragging left to right.

Images generated using [Factorio-Sat](https://github.com/R-O-C-K-E-T/Factorio-SAT), which is licensed under GNU GPL.
Made simple modifications to get it to work with 2.0.

### Simple cases

#### Non-obstacles

These should be integrated into the belt line.

```fac-img

 _ _ l _ r
 _ _ l r r l

_ l l l l l
_ r r r r r

_ r ri _ ro r
_ l lo _ li l
_ l ri _ ro l


_ _ r rs r r


ri _ ro rs ri _ ro


_ _ _ rs rs
```

#### Obstacles

These should be under grounded over.

```fac-img

_ X _ _

_ l

_ r u l

_ u l _ _

_ _ u _ _ u
_ r u _ r u _
_ u _ _ u

_ d l l l _

_ d l l l _
_ r r r u _

_ _ _ ls



_ _r r rs
_ _u


_ _ rs r r d


_ _ rs X
```

For this red belt can underground over it, allowing belt-weaving.

```fac-img
_ _ _ _  _ _ _ _  d _
_ d l lo _ _ _ li l
_ d

```

#### Impassable obstacle

These are _not possible_ to underground over;
the player will be notified with an error (X is in the way) if they try to drag a belt pass them.

```fac-img

_ l lo _ li X _

_ _ _  _  d
_ d lo li l
_ d

_ ri _ ro rs X

```

#### Random other examples

```fac-img

_ _  u r _

r ri u ro r r


_ _ rs X _ _


r ri rs X ro r

_ _ r u l _ _

r r ri u ro r r _



_ _ lo _ li l _

r r ri _ ro r r

```

### Tricky cases

#### Curved belt?

When we run into an existing belt (or underground belt) in the same direction as the drag, we _always_ attempt to integrate it.
(More motivation for this rule comes later)

However, if we then run into a curve, trying to underground over it, or straighten the curved belt, may break an existing belt line.
As such, if we try to traverse past the curved belt, we give up and give an error.

```fac-img
_ _ _ _ r _
_ _ r r u

_ _ _ _ r
r r r r u

```

However, in other cases we sometimes want to jump over belt segments given the choice.

#### Running into a splitter

We would like to underground over side balancers, when running over the unused input:

```fac-img
_ _ _  _ r d _
r r r  _ u r r
_ _ _ rs r u _

_ _ _  _  r d
r r r  _  u r r
_ r ri rs r u ro r
```

But if we can use the output (it's all straight), we should integrate instead of underground over:

```fac-img
_ r _  d
_ _ rs r r r _

_ r _  d
r r rs r r r r
```

However, if input is actually _used_ (has some belt input), it's less clear if we should integrate or underground over it.
The compromise chosen is to always not underground, even if the splitter later runs into a dead end.

````

```fac-img
_ _ _  _ r d _
r r r  _ u r r
_ _ r rs r u _

_ _ _  _ r d
r r r  _ u r r
r r r rs r u _ _
````

This motivates treating belt segments starting with a splitter differently:

- When running into _forwards_ belt or an entrance underground, we _always_ integrate it.
- However, if it _starts_ with a splitter, we lookahead to see if we want to integrate or underground over it.

In the first example, it's possible to override this behavior, as to not underground over the splitter:

- you can end a drag right when you reach the splitter, then start a new drag.

#### Running into a _backwards_ belt
... and NOT a ug belt.

For backwards belt, we also want to lookahead to decide if we underground it, or overbuild it (rotating it):

```fac-img
_ _ l l l _ _

r r r r r r r

_ _ _ _ d _ _
_ _ l l l _ _


_ _ _ _ d _ _
r ri l l l ro r

```

HOWEVER, we still don't want infinite lookahead, else this leads to possibly unexpected behavior.

With infinite lookahead, dragging ghost belt to upgrade this will stop at the splitter, and eventually say "underground too long", even if you don't end up dragging to the curved belt:

```fac-img

_ _ rs r r r r r r u


r r rs r r r r r r

```

As such, we only lookahead as far as it might be possible to place an underground:

- If we can underground the whole thing, then do it
- If it's longer than that, default to integrating it.

This might not satisfy everyone in every single situation, but seems a decent compromise.
And, it's possible to tell at a glance what behavior you'll get, so you can override the default behavior in those rare cases.

# THE SPEC

Starting to make things formal, handling all cases shown earlier.

## Obstacle/tile classification

Some definitions:

- **Belt-like entity**: a belt, ug belt, or splitter (including 1x1)
- **Belt segment**: is a series of directly connected belts, underground belts, and splitters; only considering entities in the path of the current belt drag.
  Side-loading does not count towards belt segment connectivity.

### Informally

For every tile:

If you can't place belt on it, it's an obstacle or impassable obstacle, depending on if possible to underground past it.

Tricky cases are with existing belt-like entities.
We want to treat these an entire **belt segment** at a time.

- Perpendicular belts-like entities, and backwards splitters are obstacles.
- Curved belts are also obstacles.

For any belt segment, that we run into:
- Curved or perpendicular belt-like entities are obstacles.
- If the belt drag connect _directly_ into it belt segment facing the same direction, starting with a belt or input underground, we _always_ integrate it.
  - Even if it later leads to a dead end.
- If we can't connect into a belt segment (input blocked spitter), it's an obstacle.
- In remaining cases, we have belt segments that begin with a backwards belt, or a forwards splitter. We have a choice: if it's possible to integrate the _entire belt segment_ (all straight, no curved belt, no backwards splitter), we use it.
  Otherwise, it's an obstacle and we try undergrounding over it.

Only consider belt segments for a limited number of blocks ahead of the current position, to avoid infinite lookahead and potentially unintuitive behavior.

All these create impassable obstacles:

- The tile doesn't allow under-grounding through
- If we are dragging over an existing belt segment that is integrated, and the belt segment curves
- If we encounter a underground belt of the _same_ tier and axis, that we aren't integrating (are trying to underground ove it). This is an impassable obstacle as it would break any underground we try to build over it.
- Trying to upgrade an underground, if it would:
  - make it too short
 -  break belt weaving (will pair with something else instead)

**Variations**:
Some things we're not 100% sure about, and might consider:

- Forwards belt should not _always_ be force integrated, in some cases?
- Forwards splitters should not be given special treatment

### Tile Types

Getting in to the gritty details.

Every tile is classified as exactly one of:

- **Usable**: All tiles where belt can be placed or fast-replaced. May end up being either a belt or a newly placed underground.
- **IntegratedOutput**: Existing splitter, or output underground belt, that must be used. Can't be replaced with underground belt.
- **Obstacle**: Can underground over
- **PassThrough**: An integrated input underground, or tiles inbetween an integrated underground pair. We ignore what's on it until we reach the exit underground.
- **Impassable**: Can't underground over. Can be an un-undergroundable tile (lava), or a curved belt. It's ok to "hover over" the obstacle, though.
- **UnusableUnderground**: An underground we encounter but can't use.

The very first belt successfully placed is always considered **Usable**

### Belt segments

For the cases we need to look-forward, to decide if we want to integrate or jump over a belt segment.

```python

def belt_segment_connects(a, b): ...

def check_belt_segment_enter():
    # Consider the whole belt segment, up to the furthest tile the next underground may be placed.
    if any part of the segment contains a curved belt -> False // not integrable
    else if it ends with a splitter, but the output is blocked -> False
    else -> True
```

### Main obstacle classification

Tiles are classified one at a time, as we encounter them.
This will also depend on the last tile's classification.

The first belt placed is always declared **Usable**.

If the last tile was...

- **Usable**
- **Integrated output**
- **Obstacle**

Here comes a giant match statement

```python
last_tile_was_output = last_type in (Usable, IntegratedOutput)
is_same_segment = belt_segment_connects(last_tile, current_tile)

match next_tile_type:
  case belt:
    match belt.direction:
      case perpendicular:
        if is_same_segment -> Impassable # this is the running into a curved belt case!
        else -> Obstacle
      case same direction:
        if belt_was_curved() -> Obstacle # curved belts are obstacles.
        else if last_tile_was_output -> Usable # if belt runs into another belt, _always_ use it.
        else -> try_enter_belt_segment()
      else -> # opposite direction
        try_enter_belt_segment()
  case underground_belt:
    if belt.is_unpaired
      if belt.direction perpendicular -> Obstacle
      else -> Usable # Fast replace un-paired undergrounds. Insert logic here if we want to do something different
    else: match belt.shape_direction:
      case perpendicular -> Obstacle
      case inputting ->
        if last_tile_was_output -> try_integrate_underground()
        else -> try_skip_underground()
      case outputting -> # running into the back of the underground
        try_skip_underground()
  case splitter: # including 1x1 splitters
    if splitter.direction != drag_direction -> Obstacle
    else if not last_tile_was_output -> Obstacle # can't enter
    else: # same direction. Note: currently don't treat "directly running into a splitter" the same way as belt
        try_enter_belt_segment_splitter()
  case loader, linked belt, ...:
    if belt connects into it -> Impassable # Join to it, but don't underground it
    else -> Obstacle
  else: # not a belt like entity
    if belt can be placed -> Usable
    else if not an undergroundable tile -> Impassable
    else -> Obstacle

def try_enter_belt_segment():
  if check_belt_segment_enter() -> Usable
  else -> Obstacle

def try_enter_belt_segment_splitter():
  if check_belt_segment_enter() -> IntegratedOutput
  else -> Obstacle

# these are for undergrounds in the same direction as the current belt line
def try_integrate_underground():
  if is same tier -> PassThrough
  else:
    if upgrading would make underground too short -> UnusableUnderground
    if any tiles in between the underground are same-axis undergrounds of the same tier -> UnusableUnderground
    else -> PassThrough

def try_skip_underground():
  if same-tier underground -> Impassable # We can't underground over the same
  else -> Obstacle # this case allows belt weaving
```

#### A note on belt curvature

Belt curvature is considered **ignoring** newly placed belts from the current drag.
See this example:
![Double-curve](../images/Double-curve.png)

In the middle, a partial underground is placed, which temporarily straightens a belt. However, the straightened belt should still be considered inaccessible.

### Integrating existing undergrounds

When last tile is **PassThrough**:

- if the next tile is the corresponding output underground -> IntegratedOutput
  else -> PassThrough

## Straight-Line Dragging

After we have classified obstacles, we need to actually place underground belts.
This goes into detail about how belts are placed.

### Informally

Integrate compatible belts, splitters, and pass-through undergrounds.
Place underground belts over obstacles; Keep track of the last valid input underground position.
When encountering a new obstacle, always place a new underground belt if its possible to do so; else, extend the last underground if possible.
If encountering an impassable obstacle, or underground belt would be too long, give up, and notify the user.

Never affect non-integrated entities.

### Normal action handling
The action taken is also handled one tile at a time,
and depends on the last tile classification.

Given last tile classification, and current tile classification (from above):

- **Usable**
- **IntegratedOutput**
- **Obstacle**

```python

last_tile_was_output = last_tile_type in (Usable, IntegratedOutput)

match new_tile_type:
    case Usable:
        if last_tile_was_output -> place_belt()
        else: place_or_extend_underground()
    case IntegratedOutput:
        integrate_entity()
    case PassThrough:
        assert last_tile_was_output
        assert current tile is input underground
        integrate_entity()
    case Obstacle:
      if last_tile_type is IntegratedOutput:
        # output must be followed by a usable space
        error("entity in the way")
      else if underground_would_be_too_long():
        error("underground too long")
      else: pass
    case Impassable:
        pass # do nothing, but only error when we try to traverse past it later

def place_or_extend_underground():
  assert underground is long enough
  if no existing input, place input underground at last valid position
  revert previous output underground if it exists
  place output underground at current tile
```

### Pass through
When last tile type is **PassThrough**:

```python
assert new_tile_type in (PassThrough, IntegratedOutput)
pass
# output underground would have already been upgraded/rotated at this point
# do nothing
```
### Impassable
When last tile type is **Impassable**, give an appropriate error right after.

### Error recovery

If error was due to:
- Underground too long
- Stuff in the way
- Impassable tile/curved belt

Then, we pretend the last tile type is now **Usable** instead of whatever it used to be.
This results in placing or integrating a belt on the next available tile.

- Impassable underground (lonely, or paired)
- Unusable underground

In the case of an impassable or unusable underground:
- if it is a paired underground, don't do anything until going past the other end of the pair.
  - Implementation TBD. Probably needs a new tile type, e.g. **PassThroughError**; or a modification of the existing PassThrough state
- afterwards, pretend the last tile type is now **Usable**, like the first 3 cases.

### Placing entities

Final notes on placing entities.

- Placing a belt may fast replace or rotate an existing belt.
- Integrating an entity: means, upgrading and rotating a underground belt/splitter as necessary.

## Full drag operation

For starting, backtracking, and rotating a drag.

### Starting a Drag

A drag starts when the player places and holds down a belt.
A drag is created in the same line as the belt.
Dragging forwards or backwards determines the belt orientation.
Un-dragging backwards changes the belt orientation.

### Fast Replace on the First Entity

The very first click is special: it may fast replace something (such as replace a splitter with a belt, or remove an underground).
This behavior is independent from any other rules here; This allows the user to override any behavior by simply clicking another time.
If a fast replace is done, this may also create a separate undo/redo item; allows recovering from "accidental" dragging.

### Rotation

When pressing rotate in the middle of a drag, determine the direction (left/right) by where the cursor is.
The belt direction (forwards/backwards) will match what it was previously.

If the "pivot tile" is a belt: first rotate it to the correct direction if needed, whatever the previous orientation was!
- or follow fast replace rules: if it can be fast replaced with a belt in the correct direction, do it.


If it is not a belt, classify the tile as if the "previous" tile was empty (even though the "previous" belt is empty).
This allows running into a underground belt sideways, then continuing over it.

Otherwise, it's the same as starting a new drag at the pivot point.

## Other Feature Interactions

### Undo/Redo Stack

These should separate undo items:

- The very first belt's fast replace if applicable.
- Each "segment" of a a drag; rotation ends the current segment and starts a new one

### Ghosts and ghost building

- **Real belt dragging**: Ghosts completely ignored.
  - Future enhancement: Interactions with ghosts?
- **Ghost belt dragging**: Both ghosts and real entities considered.

This is considered one entity at a time, at the time when you placed the belt.

TODO: exceptions

### Force building

This always results in ghost placement.

Force is only different from normal ghost placement, in that rocks and trees are no longer considered obstacles.

### SUPER force building

If using super force, any potential obstacles, belt or otherwise, are either deleted (if not a belt) or force-integrated
(if it happens to be the correct type);
then treated as integrable belt for the rest of this spec.

If you release super-force, future encountered entities are treated normally again.

TODO: formalize this

### Entities Marked for Deconstruction

For deconstructed entities:

- **Real entity dragging**:
  - if it is possible to fast-replace with a straight belt, this is done; and the belt is un-deconstructed
  - otherwise, treated _normal_ obstacles. Underground belt interactions are ignored
- **Ghost dragging**: Deconstructed entities completely ignored.

TODO: formalize this

### Player Interactions

- **Material shortage**: running out of real belts ends the drag.
- **Insufficient underground belts**: Creates ghosts instead (with error notification). This will also mine the input underground belt position to prevent accidental sideloads.
- **Upgrades**: Either places upgraded materials or marks for bot upgrade, depending on whether ghost dragging is active and whether the player has enough materials.
