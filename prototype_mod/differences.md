# Differences Between prototype_abstract and prototype_mod

This document outlines the structural, semantic, and feature changes made when porting `prototype_abstract` (Rust) to `prototype_mod` (TypeScript/TypescriptToLua).

---

## File Structure & Organization

### prototype_abstract (Rust)
- `src/smart_belt/mod.rs` - Module index
- `src/smart_belt/action.rs`
- `src/smart_belt/drag.rs`
- `src/smart_belt/drag_state.rs`
- `src/smart_belt/tile_classification.rs`
- `src/smart_belt/world_view.rs`
- `src/smart_belt/belt_curving.rs`

### prototype_mod (TypeScript)
- `common/smart_belt/index.ts` - Module exports
- `common/smart_belt/action.ts`
- `common/smart_belt/drag.ts`
- `common/smart_belt/drag_state.ts`
- `common/smart_belt/tile_classification.ts`
- `common/smart_belt/world_view.ts`
- `common/smart_belt/DragDirection.ts` - **NEW: Extracted to separate file**
- `common/smart_belt/tile_history_view.ts` - **NEW: Extracted from belt_curving**

### Organizational Changes
1. **DragDirection extraction**: `DragDirection` enum and utility functions (`directionMultiplier`, `swapIfBackwards`) moved from `drag.rs` into dedicated `DragDirection.ts` file
2. **TileHistoryView extraction**: `TileHistoryView` and `TileHistory` type separated from `belt_curving.rs` into dedicated `tile_history_view.ts` file
3. **belt_curving split**: Belt curving functionality divided between:
   - `belt_curving.ts` - Pure functions for curvature logic
   - `tile_history_view.ts` - View/wrapper implementation

---

## Semantic & Structural Changes

### action.ts / action.rs

#### Error Type Renamed
- **Rust**: `Error` enum
- **TypeScript**: `ActionError` enum
- **Reason**: Avoid naming conflict with JavaScript's built-in `Error`

#### IntegrateUndergroundPair Signature Change
**Rust**:
```rust
IntegrateUndergroundPair { do_upgrade: bool }
```

**TypeScript**:
```typescript
{ type: "IntegrateUndergroundPair" }  // no do_upgrade field
```

**Change**: Removed `do_upgrade` parameter. Upgrade decision logic moved inline to `applyAction()` method in `drag.ts`, where it checks `canUpgradeUnderground()` and handles the error case.

---

### drag.ts / drag.rs

#### Rotation Support - New Fields
**TypeScript only**:
- `maxPos: number` - Maximum position reached during drag
- `minPos: number` - Minimum position reached during drag
- `furthestPos: number` - Furthest extent from starting position

These track the drag extent for determining rotation pivot points.

#### Rotation Support - New Methods
**TypeScript only**:
- `updateFurthestPosition(targetPos: number)` - Updates extent tracking
- `getRotationPivot(): [TilePosition, boolean]` - Returns pivot point and backward flag for rotation

#### DragContext Creation
**TypeScript only**:
- `createContext(world: World): DragContext` - Encapsulates dependencies for state machine

**Purpose**: Separates concerns - `LineDrag` manages state, `DragContext` provides data access.

#### Error Handling Strategy Change
**Rust**: Accumulates errors in `Vec<(TilePosition, Error)>`, returned via `get_errors()`
**TypeScript**: Callbacks via `ErrorHandler` interface, errors reported immediately

```typescript
interface ErrorHandler {
  handleError(position: TilePosition, error: ActionError): void
}
```

**Benefit**: Enables integration with Factorio's notification system in real-time.

#### FullDrag Class (NEW)
**TypeScript only**: Wrapper around `LineDrag` providing rotation capability:
```typescript
class FullDrag {
  interpolateTo(world, errorHandler, pos) // delegates to LineDrag
  rotate(world, errorHandler, pos): boolean // creates new LineDrag with perpendicular direction
}
```

**Purpose**: Implements multi-segment dragging with direction changes (e.g., L-shaped drags).

---

### drag_state.ts / drag_state.rs

#### State Machine Function Extraction
**Rust**: Method on `DragState`
```rust
impl DragState {
    pub fn step(&self, ctx: &LineDrag, direction: DragDirection) -> DragStepResult
}
```

**TypeScript**: Standalone function
```typescript
export function takeStep(
  state: DragState,
  ctx: DragContext,
  direction: DragDirection
): DragStepResult
```

#### DragContext Abstraction (NEW)
**TypeScript only**: Explicit interface separating state machine dependencies:
```typescript
export interface DragContext {
  world: World
  ray: Ray
  tier: BeltTier
  lastPosition: number
  tileHistory: TileHistory | undefined
}
```

**Rust equivalent**: State machine directly accessed `LineDrag` fields via `&LineDrag` reference.

**Benefit**:
- Clearer dependency contract
- Easier testing (mock just the context)
- Decouples state logic from drag implementation

#### Underground Checking Reorganization
**Rust**: Three methods on `LineDrag`:
- `check_underground_path()` - Core validation
- `can_build_underground()` - Build validation
- `can_upgrade_underground()` - Upgrade validation

**TypeScript**:
- `canBuildUnderground()` - Standalone function in `drag_state.ts`
- Upgrade checking moved to `drag.ts` in `applyAction()`

**Change**: Split responsibilities - state machine validates builds, action application handles upgrades.

---

### tile_classification.ts / tile_classification.rs

#### IntegratedUnderground Data Change
**Rust**:
```rust
IntegratedUnderground { output_pos: i32 }
```

**TypeScript**:
```typescript
"IntegratedUnderground"  // no output_pos
```

**Change**: `output_pos` no longer embedded in classification result. Instead, fetched separately in `drag_state.ts` when needed:
```typescript
const outputPos = worldView.getUgPairPos(nextPosition, entity)
```

**Benefit**: Simpler classification interface, data fetched only when used.

#### Constructor Dependencies
**Rust**: Takes `DragWorldView` directly
**TypeScript**: Takes `DragContext`, creates `DragWorldView` internally

**Change**: Classifier now self-contained, doesn't require caller to construct view.

---

### world_view.ts / world_view.rs

#### Dependency Import Location
**Rust**: Imports `TileHistoryView` from `belt_curving` module
**TypeScript**: Imports from separate `tile_history_view.ts` file

**Change**: Reflects file structure reorganization (TileHistoryView extracted).

---

### tile_history_view.ts (NEW)

**Extracted from belt_curving.rs**.

#### Interface Implementation Change
**Rust**: Implements `BeltCurveView` trait
**TypeScript**: Implements `ReadonlyWorld` interface

**Change**: Different abstraction - TypeScript version conforms to full world interface rather than specialized trait.

---

## Core Module Changes

### belts.ts / belts.rs

#### BeltTier Structure
**Rust**: Pointer to static data
```rust
pub struct BeltTierData {
    pub name: &'static str,
    pub underground_distance: u8,
}
pub struct BeltTier(&'static BeltTierData);
pub static YELLOW_BELT: BeltTier = BeltTier(&BeltTierData { ... });
```

**TypeScript**: Runtime interface
```typescript
export interface BeltTier {
  readonly beltName: string
  readonly undergroundName: string
  readonly splitterName?: string  // NEW
  readonly undergroundDistance: number
}
```

**Changes**:
1. **Entity name tracking**: Split `name` into `beltName`, `undergroundName`, `splitterName`
2. **Optional splitters**: `splitterName` can be undefined for tiers without splitters
3. **Runtime data**: No static constants, tiers defined at runtime (see `belt_tiers.ts`)

**Purpose**: Support Factorio mod integration - need actual entity names for spawning.

#### Entity Type System
**Rust**: Trait-based with downcasting
```rust
trait Entity { fn as_any(&self) -> &dyn Any; }
trait BeltConnectable: Entity { ... }
entity.as_any().downcast_ref::<Belt>()
```

**TypeScript**: Class-based inheritance
```typescript
abstract class BeltConnectable extends BeltCollider { ... }
class Belt extends BeltConnectable { ... }
entity instanceof Belt
```

#### New Entity Types (TypeScript only)
- `BeltCollider` - Base interface for all tile entities
- `CollidingEntity` - Obstacles that block placement
- `ImpassableTile` - Obstacles that block underground tunnels

**Purpose**: Distinguish between different obstacle types for smarter logic.

#### Belt Equality & Immutability
**TypeScript only**:
- `equals(other: BeltConnectable): boolean` - Semantic equality check
- `flip()` on `UndergroundBelt` - Returns new instance (immutable)

**Rust equivalent**: Used `PartialEq` derive, `flip_self()` mutated in-place.

**Benefit**: Immutability simplifies reasoning about state changes.

#### BeltConnectableEnum Removed
**Rust**: Used enum wrapper for type-safe pattern matching
```rust
enum BeltConnectableEnum<'a> {
    Belt(&'a Belt),
    UndergroundBelt(&'a UndergroundBelt),
    ...
}
```

**TypeScript**: Direct `instanceof` checks
```typescript
if (entity instanceof Belt) { ... }
else if (entity instanceof UndergroundBelt) { ... }
```

**Change**: TypeScript's structural typing makes enum wrapper unnecessary.

---

#### Ray Operations
**Rust**: Methods on `Ray` struct
```rust
ray.ray_position(position)
ray.get_position(index)
ray.snap(position)
```

**TypeScript**: Factory + standalone functions
```typescript
createRay(position, direction)  // factory
rayDistance(ray, position)
getRayPosition(ray, index)
// snap removed - not used
```

**New in TypeScript**:
- `rayRelativeDirection(ray, position)` - Computes perpendicular direction from ray to position
- **Purpose**: Supports rotation feature - determines new drag direction

#### Transform Removed
**Rust**: Full `Transform` struct with flip/rotation operations for world transformations and test generation

**TypeScript**: Not present

**Change**: Transform system unused by smart_belt logic, removed to reduce complexity.

---

### world.ts / world.rs

#### World Design Philosophy
**Rust**: Concrete implementation
```rust
pub struct World {
    pub entities: HashMap<TilePosition, Box<dyn Entity>>,
}
impl World { ... }
```

**TypeScript**: Interface-based abstraction
```typescript
interface ReadonlyWorld { ... }
interface World extends ReadonlyWorld { ... }
```

**Change**: TypeScript version is protocol-oriented - smart_belt logic operates on interfaces, not concrete types.

#### World Operation Helpers (NEW)
**TypeScript only**:
```typescript
class ReadonlyWorldOps {
  constructor(world: ReadonlyWorld)
  getUgPair(position, underground): [TilePosition, UndergroundBelt] | undefined
  getBelt(position): BeltConnectable | undefined
  beltConnectionsAt(position): BeltConnections
}

class WorldOps extends ReadonlyWorldOps {
  placeBelt(position, direction, tier, isFirst?): TileHistory | undefined
  placeUndergroundBelt(...): TileHistory | undefined
}
```

**Purpose**:
- Encapsulate common world queries
- Provide reusable operations for both smart_belt and test code
- Separate read-only vs mutating operations

**Rust equivalent**: Direct methods on `World` struct or free functions.

#### API Changes

| Rust | TypeScript | Change |
|------|------------|--------|
| `can_place_belt_on_tile()` | `canPlaceOrFastReplace()` | Renamed to reflect fast-replace semantics |
| `place_belt()` returns `Option<TileHistory>` | Split: `tryBuild()` returns `bool`, `WorldOps.placeBelt()` returns `Option<TileHistory>` | Separated concerns |
| `set()` | `tryBuild()` | Different API contract - returns success boolean |
| `remove()` | `mine()` | Renamed to match Factorio terminology |
| `upgrade_ug_checked()` | `upgradeUg()` | Simplified name, assumes validation done |
| `get_ug_pair()` | `ReadonlyWorldOps.getUgPair()` | Moved to helper class |

---

### belt_curving.ts / belt_curving.rs

#### Module Split
**Rust**: Single `belt_curving.rs` file with trait + implementation
**TypeScript**: Split into:
- `belt_curving.ts` - Pure curvature computation functions
- `tile_history_view.ts` - View wrapper that implements world interface

#### BeltCurveView Trait → Functions
**Rust**: Trait with default implementations
```rust
pub trait BeltCurveView {
    fn output_direction_at(&self, position: TilePosition) -> Option<Direction>;
    fn input_direction_at(&self, position: TilePosition) -> Option<Direction>;
    fn belt_curved_input_direction(&self, position: TilePosition, belt_direction: Direction) -> Direction { ... }
    fn belt_is_curved_at(&self, position: TilePosition, belt: &Belt) -> bool { ... }
}
impl BeltCurveView for World { ... }
impl BeltCurveView for TileHistoryView<'_> { ... }
```

**TypeScript**: Standalone functions
```typescript
export function beltCurvedInputDirection(
  world: ReadonlyWorld,
  position: TilePosition,
  beltDirection: Direction,
): Direction

export function beltIsCurvedAt(
  world: ReadonlyWorld,
  position: TilePosition,
  belt: Belt,
): boolean
```

**Change**: No trait system in TypeScript - use functions that accept `ReadonlyWorld` interface.

**Removed**:
- `belt_connections_at()` - Moved to `ReadonlyWorldOps`
- Trait implementations - Not applicable

---

## New Features in prototype_mod

### 1. Rotation Support
Full infrastructure for rotating drag direction mid-drag:
- **`FullDrag` class**: Wraps `LineDrag`, handles creating new line segments at pivot points
- **`getRotationPivot()`**: Determines where rotation should occur based on drag extents
- **`rayRelativeDirection()`**: Computes perpendicular direction for new drag segment
- **Position tracking**: `maxPos`, `minPos`, `furthestPos` track drag extent

**Use case**: User drags north, then moves mouse east → creates L-shaped belt path.

### 2. Error Handler Interface
Pluggable error reporting via callback:
```typescript
interface ErrorHandler {
  handleError(position: TilePosition, error: ActionError): void
}
```

**Rust equivalent**: Accumulated errors in vector, returned at end.

**Benefit**:
- Real-time error notifications in Factorio
- More flexible error handling strategies
- Better integration with game's UI systems

### 3. DragContext Abstraction
Explicit interface for state machine dependencies:
```typescript
interface DragContext {
  world: World
  ray: Ray
  tier: BeltTier
  lastPosition: number
  tileHistory: TileHistory | undefined
}
```

**Benefits**:
- Clear dependency contract
- Easier to mock for testing
- Decouples state logic from `LineDrag` implementation

### 4. Immutable Underground Flip
```typescript
flip(): UndergroundBelt  // returns new instance
```

**Rust equivalent**: `flip_self()` mutated in-place.

**Benefit**: Easier reasoning about state, fewer mutation bugs.

### 5. Splitter Name Tracking
- `splitterName?: string` in `BeltTier`
- `upgradeSplitter(position, newName)` in World interface

**Purpose**: Support upgrading splitters to different tiers (e.g., yellow → blue splitter).

### 6. World Interface Abstraction
- `ReadonlyWorld` / `World` interfaces
- `ReadonlyWorldOps` / `WorldOps` helper classes

**Benefits**:
- Protocol-oriented design
- Can implement different world representations (real Factorio world vs test mock)
- Clear read-only vs mutating operations

---

## What's Unchanged

### Algorithm Logic
All core algorithms preserved identically:
- Drag state machine transitions
- Tile classification priority rules
- Underground distance validation
- Belt segment scanning lookahead
- Curvature detection
- Tile history mechanism

### Core Concepts
Same fundamental design:
- Ray-based position indexing
- Bidirectional dragging (Forward/Backward)
- State variants: OverBelt, OverSplitter, BuildingUnderground, PassThrough, OverImpassable, ErrorRecovery
- Tile classifications: Usable, Obstacle, IntegratedSplitter, IntegratedUnderground, ImpassableObstacle
- Action types: PlaceBelt, CreateUnderground, ExtendUnderground, IntegrateUndergroundPair, IntegrateSplitter

### Architecture
Same separation of concerns:
- `drag` - Main controller, manages drag lifecycle
- `drag_state` - State machine logic, pure transitions
- `tile_classification` - Tile analysis and categorization
- `world_view` - Abstracted world queries for classification
- `action` - Entity placement operations
- `belt_curving` - Curvature detection logic

---

## Summary of Major Changes

1. **Module organization**: Extracted DragDirection and TileHistoryView to separate files for better modularity

2. **Error handling strategy**: Accumulated errors → Real-time callback interface

3. **World abstraction**: Concrete struct → Interface + helper classes for flexibility

4. **Belt tier system**: Static references → Runtime configuration with entity names

5. **Rotation support**: Added FullDrag wrapper + infrastructure for L-shaped drags

6. **DragContext pattern**: Explicit dependency interface for state machine

7. **IntegrateUndergroundPair**: Removed `do_upgrade` field, logic moved to action application

8. **Entity type system**: Trait-based with downcasting → Class-based inheritance with instanceof

10. **TileType data**: IntegratedUnderground carries output_pos → Fetched separately when needed

11. **Immutability**: Added immutable `flip()` method, `equals()` checker

12. **World methods**: Added interface-based design with ReadonlyWorldOps/WorldOps helpers
