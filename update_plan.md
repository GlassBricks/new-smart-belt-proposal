# Refactoring Plan: prototype_abstract → prototype_mod improvements

## Overview
This document outlines the plan for updating `prototype_abstract` (Rust) to incorporate structural improvements and API changes from `prototype_mod` (TypeScript), while respecting language differences between Rust and TypeScript.

## Guiding Principles

### What to Port
- **API improvements**: Better method names, clearer interfaces
- **Separation of concerns**: Better module organization where it makes sense in Rust
- **World abstraction improvements**: Merge BeltCurveView functionality into World trait
- **Error handling improvements**: Real-time error callbacks vs accumulation
- **Immutability**: Where it simplifies reasoning
- **Feature additions**: Rotation support, better abstractions

### What NOT to Port (Language-Specific)
- **WorldOps helper classes**: In Rust, use `impl` blocks directly on `World`
- **Class-based inheritance**: Rust doesn't have this; continue using trait system
- **DragContext as interface**: In Rust, direct struct references work better
- **Pure functions for belt curving**: Rust traits with default implementations are better

---

## Phase 1: World Abstraction Refactoring

### 1.1 Create World Trait to Replace/Merge BeltCurveView
**Current**: `BeltCurveView` trait separate from World struct
**Target**: Create a unified `World` trait that includes all world query operations

**Rationale**: TypeScript created `ReadonlyWorld` and `World` interfaces that unified entity queries and belt curvature logic. This is a better abstraction that makes the world interface more cohesive.

**Changes**:
```rust
// world.rs or new world_trait.rs
pub trait ReadonlyWorld {
    // Entity queries
    fn get(&self, position: TilePosition) -> Option<&dyn Entity>;
    fn get_belt(&self, position: TilePosition) -> Option<BeltConnectableEnum<'_>>;
    fn get_ug_pair(&self, position: TilePosition, underground: &UndergroundBelt)
        -> Option<(TilePosition, &UndergroundBelt)>;

    // Belt curvature queries (from BeltCurveView)
    fn output_direction_at(&self, position: TilePosition) -> Option<Direction>;
    fn input_direction_at(&self, position: TilePosition) -> Option<Direction>;

    // Derived queries with default implementations
    fn belt_connections_at(&self, position: TilePosition) -> BeltConnections {
        BeltConnections {
            input: self.input_direction_at(position),
            output: self.output_direction_at(position),
        }
    }

    fn belt_curved_input_direction(&self, position: TilePosition, belt_direction: Direction) -> Direction {
        let has_input_in = |direction: Direction| {
            let query_pos = position - direction.to_vector();
            self.output_direction_at(query_pos) == Some(direction)
        };

        if has_input_in(belt_direction) {
            return belt_direction;
        }
        match (
            has_input_in(belt_direction.rotate_cw()),
            has_input_in(belt_direction.rotate_ccw()),
        ) {
            (true, false) => belt_direction.rotate_cw(),
            (false, true) => belt_direction.rotate_ccw(),
            _ => belt_direction,
        }
    }

    fn belt_is_curved_at(&self, position: TilePosition, belt: &Belt) -> bool {
        self.input_direction_at(position)
            .is_some_and(|d| d.axis() != belt.direction.axis())
    }
}

pub trait World: ReadonlyWorld {
    fn set(&mut self, position: TilePosition, entity: Box<dyn Entity>);
    fn remove(&mut self, position: TilePosition) -> Option<Box<dyn Entity>>;
    fn flip_ug(&mut self, position: TilePosition) -> bool;
    fn upgrade_ug_checked(&mut self, position: TilePosition, new_tier: BeltTier);
}
```

**Impact**:
- Deprecate `BeltCurveView` trait
- Implement `ReadonlyWorld` and `World` traits for `WorldImpl` (concrete struct)
- Update `TileHistoryView` to implement `ReadonlyWorld` trait instead of `BeltCurveView`
- Update all code using `BeltCurveView` to use `ReadonlyWorld`

---

### 1.2 Rename Concrete World Struct
**Current**: `struct World` (concrete implementation)
**Target**: `struct WorldImpl` (or similar name)

**Rationale**: Since we're creating `World` as a trait, rename the concrete implementation to avoid confusion.

**Changes**:
```rust
// world.rs
#[derive(Debug, Default, PartialEq, Clone)]
pub struct WorldImpl {
    pub entities: HashMap<TilePosition, Box<dyn Entity>>,
}

impl ReadonlyWorld for WorldImpl {
    fn get(&self, position: TilePosition) -> Option<&dyn Entity> {
        self.entities.get(&position).map(|e| e.as_ref())
    }

    fn output_direction_at(&self, position: TilePosition) -> Option<Direction> {
        self.get_belt(position)
            .and_then(|e| e.as_dyn().output_direction())
    }

    fn input_direction_at(&self, position: TilePosition) -> Option<Direction> {
        let entity = self.get_belt(position)?;
        if let BeltConnectableEnum::Belt(belt) = entity {
            Some(self.belt_curved_input_direction(position, belt.direction))
        } else {
            entity.as_dyn().primary_input_direction()
        }
    }

    // ... other methods
}

impl World for WorldImpl {
    fn set(&mut self, position: TilePosition, entity: Box<dyn Entity>) {
        // ... existing implementation
    }

    // ... other mutating methods
}
```

**Impact**:
- Update all references to `World` struct → `WorldImpl`
- Add type alias `pub type ConcreteWorld = WorldImpl;` for convenience
- Update `LineDrag` to take `&'a mut dyn World` instead of `&'a mut World`

---

### 1.3 Update TileHistoryView to Use World Trait
**Current**: `TileHistoryView` implements `BeltCurveView`
**Target**: `TileHistoryView` implements `ReadonlyWorld`

**Rationale**: Consistency with new trait design.

**Changes**:
```rust
// tile_history_view.rs
pub struct TileHistoryView<'a> {
    world: &'a dyn ReadonlyWorld,
    tile_history: Option<TileHistory>,
}

impl<'a> TileHistoryView<'a> {
    pub fn new(world: &'a dyn ReadonlyWorld, tile_history: Option<TileHistory>) -> Self {
        Self { world, tile_history }
    }
}

impl<'a> ReadonlyWorld for TileHistoryView<'a> {
    fn get(&self, position: TilePosition) -> Option<&dyn Entity> {
        self.world.get(position)
    }

    fn output_direction_at(&self, position: TilePosition) -> Option<Direction> {
        if let Some((history_position, dirs)) = &self.tile_history
            && *history_position == position
        {
            dirs.output
        } else {
            self.world.output_direction_at(position)
        }
    }

    fn input_direction_at(&self, position: TilePosition) -> Option<Direction> {
        if let Some((history_position, dirs)) = &self.tile_history
            && *history_position == position
        {
            dirs.input
        } else {
            // Use world's implementation which handles curvature
            self.world.input_direction_at(position)
        }
    }

    // get_belt, get_ug_pair delegate to world
}
```

**Impact**: Update `belt_curving.rs` to remove `BeltCurveView` trait implementations

---

## Phase 2: Module Organization & File Structure

### 2.1 Extract DragDirection to Separate Module
**Current**: `DragDirection` is in `drag.rs`
**Target**: Create `src/smart_belt/drag_direction.rs`

**Rationale**: Better separation of concerns; this is a fundamental type used across multiple modules.

**Changes**:
```rust
// src/smart_belt/drag_direction.rs
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DragDirection {
    Forward,
    Backward,
}

impl DragDirection {
    pub fn direction_multiplier(self) -> i32 {
        match self {
            DragDirection::Forward => 1,
            DragDirection::Backward => -1,
        }
    }

    pub fn swap_if_backwards<T>(self, a: T, b: T) -> (T, T) {
        match self {
            DragDirection::Forward => (a, b),
            DragDirection::Backward => (b, a),
        }
    }
}
```

**Impact**: Update imports in `drag.rs`, `drag_state.rs`, `tile_classification.rs`, `world_view.rs`

---

### 2.2 Extract TileHistoryView to Separate Module
**Current**: `TileHistoryView` is in `belt_curving.rs`
**Target**: Create `src/smart_belt/tile_history_view.rs`

**Rationale**: Cleaner separation between curvature logic and history view wrapper.

**Impact**: Update `belt_curving.rs` to remove `TileHistoryView`, update imports in `world_view.rs`

---

## Phase 3: Error Handling Improvements

Phase 3.1: skipped! Omitted here on purpose.

---

### 3.2 Add ErrorHandler Trait (Optional Enhancement)
**Current**: Errors accumulated in `Vec<(TilePosition, Error)>`
**Target**: Add trait-based error handler for flexibility

**Rationale**: Allows pluggable error handling strategies (e.g., real-time notifications in Factorio).

**Changes**:
```rust
// action.rs or new error_handler.rs
pub trait ErrorHandler {
    fn handle_error(&mut self, position: TilePosition, error: ActionError);
}

// Default accumulator implementation
pub struct ErrorAccumulator {
    pub errors: Vec<(TilePosition, ActionError)>,
}

impl ErrorHandler for ErrorAccumulator {
    fn handle_error(&mut self, position: TilePosition, error: ActionError) {
        self.errors.push((position, error));
    }
}

// LineDrag can optionally take a trait object
pub struct LineDrag<'a> {
    // ... existing fields
    error_handler: Box<dyn ErrorHandler + 'a>,
}
```

---

## Phase 4: Action & Drag Improvements

### ✅ 4.1 Remove do_upgrade from IntegrateUndergroundPair
**Current**: `IntegrateUndergroundPair { do_upgrade: bool }`
**Target**: `IntegrateUndergroundPair` (no field)

**Rationale**: Move upgrade decision to action application logic for cleaner separation of concerns.

**Changes**:
```rust
// action.rs
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Action {
    // ...
    IntegrateUndergroundPair,  // Remove do_upgrade field
    // ...
}

// In apply_action (drag.rs)
Action::IntegrateUndergroundPair => {
    let ug = self.world.get(world_pos)
        .and_then(|e| e.as_underground_belt())
        .expect("Expected UndergroundBelt at position");

    let (is_input, tier) = (ug.is_input, ug.tier);

    // Flip if needed
    if is_input != (direction == DragDirection::Forward) {
        self.world.flip_ug(world_pos);
    }

    // Handle upgrade separately
    if tier != self.tier {
        if self.can_upgrade_underground(direction, self.next_position(direction)) {
            self.world.upgrade_ug_checked(world_pos, self.tier);
        } else {
            self.add_error(ActionError::CannotUpgradeUnderground, direction);
        }
    }
}
```

**Impact**: Update `drag_state.rs` to not pass `do_upgrade`

---

### 4.2 Add Rotation Support Infrastructure
**Current**: No rotation support
**Target**: Add position tracking fields to `LineDrag`

**Rationale**: Enable L-shaped drag paths (rotation) in future.

**Changes**:
```rust
// drag.rs
pub struct LineDrag<'a> {
    // ... existing fields
    // New fields for rotation tracking
    max_pos: i32,
    min_pos: i32,
    furthest_pos: i32,
}

impl<'a> LineDrag<'a> {
    pub fn start_drag(/* ... */) -> LineDrag<'a> {
        LineDrag {
            // ... existing fields
            max_pos: 0,
            min_pos: 0,
            furthest_pos: 0,
        }
    }

    pub fn update_furthest_position(&mut self, target_pos: i32) {
        self.max_pos = self.max_pos.max(target_pos);
        self.min_pos = self.min_pos.min(target_pos);

        let dist_from_start = target_pos.abs();
        if dist_from_start > self.furthest_pos.abs() {
            self.furthest_pos = target_pos;
        }
    }

    /// Returns (pivot_position, is_backward)
    pub fn get_rotation_pivot(&self) -> (TilePosition, bool) {
        let pivot_index = if self.last_position > 0 {
            self.max_pos
        } else {
            self.min_pos
        };

        let is_backward = pivot_index != self.furthest_pos;
        (self.ray.get_position(pivot_index), is_backward)
    }
}
```

---

### 4.3 Add FullDrag Wrapper for Rotation (Optional)
**Current**: No multi-segment drag support
**Target**: Add `FullDrag` struct that wraps `LineDrag` to enable rotation

**Rationale**: Enables rotating drag direction mid-drag (L-shaped paths).

**Changes**:
```rust
// drag.rs
pub struct FullDrag<'a> {
    current_drag: LineDrag<'a>,
}

impl<'a> FullDrag<'a> {
    pub fn start_drag(
        world: &'a mut dyn World,
        tier: BeltTier,
        start_pos: TilePosition,
        belt_direction: Direction,
    ) -> FullDrag<'a> {
        FullDrag {
            current_drag: LineDrag::start_drag(world, tier, start_pos, belt_direction),
        }
    }

    pub fn interpolate_to(&mut self, new_position: TilePosition) {
        self.current_drag.interpolate_to(new_position);
        let target_pos = self.current_drag.ray.ray_position(new_position);
        self.current_drag.update_furthest_position(target_pos);
    }

    pub fn rotate(&mut self, new_position: TilePosition) -> bool {
        let (pivot_pos, is_backward) = self.current_drag.get_rotation_pivot();
        let new_direction = self.current_drag.ray.relative_direction(new_position);

        // TODO: Create new LineDrag from pivot with new direction
        // Complex: requires restructuring to handle mutable world reference
        false
    }
}
```

**Note**: Full rotation requires careful lifetime management. Consider complexity vs benefit.

---

## Phase 5: Belt & World API Improvements

### 5.1 Add Immutable flip() for UndergroundBelt
**Current**: `flip_self(&mut self)` mutates in-place
**Target**: Add `flip(&self) -> UndergroundBelt` (immutable version)

**Rationale**: Functional style simplifies reasoning about state.

**Changes**:
```rust
// belts.rs
impl UndergroundBelt {
    pub fn flip_self(&mut self) {
        self.is_input = !self.is_input;
        self.direction = self.direction.opposite();
    }

    // New immutable version
    pub fn flip(&self) -> UndergroundBelt {
        UndergroundBelt {
            direction: self.direction.opposite(),
            is_input: !self.is_input,
            tier: self.tier,
        }
    }
}
```

---

### 5.2 Rename World Methods for Clarity
**Current**: `can_place_belt_on_tile`, `remove`
**Target**: `can_place_or_fast_replace`, `mine`

**Rationale**: Match TypeScript API naming which is more descriptive.

**Changes**:
```rust
// world.rs (or in World trait)
impl World for WorldImpl {
    // Rename for clarity
    fn can_place_or_fast_replace(&self, position: TilePosition) -> bool {
        if let Some(entity) = self.get(position) {
            entity.as_colliding().is_none()
        } else {
            true
        }
    }

    // Add mine() as better-named method
    fn mine(&mut self, position: TilePosition) -> Option<Box<dyn Entity>> {
        self.entities.remove(&position)
    }
}

// Deprecate old names or keep as aliases
impl WorldImpl {
    #[deprecated(since = "0.2.0", note = "Use can_place_or_fast_replace instead")]
    pub fn can_place_belt_on_tile(&self, position: TilePosition) -> bool {
        self.can_place_or_fast_replace(position)
    }
}
```

---

## Phase 6: Geometry Extensions

### 6.1 Add Ray::relative_direction Helper
**Current**: No helper for perpendicular direction calculation
**Target**: Add helper for rotation support

**Changes**:
```rust
// geometry.rs
impl Ray {
    /// Calculate the direction perpendicular to the ray that points toward the target
    /// Used for determining rotation direction
    pub fn relative_direction(&self, position: TilePosition) -> Direction {
        let offset = position - self.start_position;
        let perpendicular_axis = match self.direction.axis() {
            Axis::X => Axis::Y,
            Axis::Y => Axis::X,
        };

        let perpendicular_component = match perpendicular_axis {
            Axis::X => offset.x,
            Axis::Y => offset.y,
        };

        if perpendicular_component > 0 {
            self.direction.rotate_cw()
        } else if perpendicular_component < 0 {
            self.direction.rotate_ccw()
        } else {
            self.direction // No perpendicular component
        }
    }
}
```

**Note**: Only needed if implementing full rotation support (Phase 4.3)

---

## Phase 7: Testing & Validation

### 7.1 Add Tests for New Functionality
- Test `ReadonlyWorld` trait implementation for `WorldImpl` and `TileHistoryView`
- Test rotation infrastructure (if implemented)
- Test immutable `flip()` method
- Test renamed methods work correctly
- Test error handler trait (if implemented)

---

## Implementation Priority

### High Priority (Core Improvements)
1. **Phase 1**: World trait abstraction (merge BeltCurveView into World)
2. **Phase 2.1**: Extract DragDirection module
3. **Phase 3.1**: Rename Error → ActionError
4. **Phase 4.1**: Remove do_upgrade from IntegrateUndergroundPair
5. **Phase 5.1**: Add immutable flip() for UndergroundBelt
6. **Phase 5.2**: Rename methods (can_place_or_fast_replace, mine)

### Medium Priority (Nice to Have)
7. **Phase 2.2**: Extract TileHistoryView module
8. **Phase 4.2**: Add rotation support infrastructure (position tracking)
9. **Phase 3.2**: Add ErrorHandler trait (optional)

### Low Priority (Optional/Future)
10. **Phase 4.3**: Add FullDrag wrapper (complex, requires careful design)
11. **Phase 6.1**: Add Ray::relative_direction (only if rotation support)

---

## Summary of Key Decisions

### ✅ Port These Changes
- **World trait abstraction**: Merge BeltCurveView functionality into unified World trait
- Module organization improvements (DragDirection, TileHistoryView)
- Error type renaming (Error → ActionError)
- Simplified IntegrateUndergroundPair action
- Immutable flip() method
- Better method naming (can_place_or_fast_replace, mine)
- Rotation support infrastructure (position tracking fields)

### ❌ Don't Port These (Language Differences)
- WorldOps helper classes (use impl blocks instead)
- DragContext as interface (direct LineDrag reference is idiomatic)
- Pure functions for belt curving (Rust trait with default implementations is better)
- Entity name tracking in BeltTier (not needed for abstract prototype)

### 🤔 Consider Later
- ErrorHandler trait (add if needed for flexibility)
- FullDrag rotation wrapper (complex, evaluate need vs complexity)

---

## Migration Strategy

1. **Phase 1 first** (World trait): Most impactful change, affects many files
2. **Test thoroughly** after Phase 1 before proceeding
3. **Phases 2-5** can be done incrementally
4. **Finish with a one-line commit** after each successful step

---

## Risk Assessment

### Low Risk
- Module extraction (DragDirection, TileHistoryView)
- Type renaming (ActionError)
- Adding new methods (flip(), helper methods)

### Medium Risk
- World trait refactoring (touches many files, but changes are mechanical)
- Removing do_upgrade field (requires careful refactoring)
- Renaming existing methods (need to update all call sites)

### High Risk
- Adding full rotation support (complex feature, requires careful lifetime management)
- ErrorHandler trait (changes error handling architecture)

---

## Success Criteria

✅ All existing tests pass
✅ World trait provides unified interface for queries
✅ Code is more maintainable and clearer
✅ No performance regression
✅ Better separation of concerns
✅ API is more intuitive
✅ Ready for future rotation feature if needed
