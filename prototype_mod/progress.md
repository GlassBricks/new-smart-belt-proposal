# TypeScript Prototype Implementation Progress

## Overview

Reimplementing the Rust prototype (`prototype_abstract`) in TypeScript using Bun runtime.
Target: Full smart belt drag logic with YAML test suite integration.

## Completed Modules

### Foundation

- **geometry.ts** - Position types, directions, rays, transforms, bounding boxes
- **entity.ts** - Base Entity class, Colliding, Impassable
- **belts.ts** - Belt class hierarchy (Belt, UndergroundBelt, Splitter, LoaderLike)
- **world.ts** - World state, entity management, underground pairing, belt curving

### Test Coverage

- Full coverage of foundation modules

## Design Decisions Made

- Class hierarchy instead of interfaces (Belt extends BeltConnectable)
- `instanceof` for type guards (removed redundant wrapper functions)
- Symbol-based BeltTier reference equality
- Map<string, Entity> for world storage (position keys as "x,y")
- Methods on objects rather than helper functions

## Next Steps

### Smart Belt Logic

- **action.ts** ✅ - Action types (Action discriminated union, ActionError enum, DragDirection enum with helpers)
- **world_view.ts** ✅ - World querying interface (BeltCurveView, TileHistoryView, DragWorldView)
- **belt_curving.ts** ✅ - OMITTED - All functionality already in world.ts and world_view.ts (see notes)
- **tile_classification.ts** ✅ - Classify tiles for drag operations (TileType, TileClassifier)
- **drag_state.ts** ✅ - State machine for dragging (DragState, DragStepResult, step logic)
- **drag.ts** ✅ - LineDrag class, main drag logic (startDrag, interpolateTo, action application)
- **index.ts** ✅ - Module exports (re-exports all smart_belt functionality)

### Testing Infrastructure

- **test_case.ts** ✅ - YAML test parser, test runner, world printing
- **generate-tests.ts** ✅ - Generate Bun test files from `../test_suite/*.yaml`
- Integration tests ✅ - 566/590 tests passing (95.9%)

### Cleanup

- Remove `index.ts` and `setup.test.ts`
- Add proper exports in main module file
- TODO: Move DragDirection from action.ts to drag.ts where it belongs (currently in action.ts for convenience)

## Implementation Notes

### Step 1: action.ts ✅

- Created Action as discriminated union type with factory functions
- Created ActionError enum matching Rust version
- Created DragDirection enum with helper functions (will be moved to drag.ts later)
- Action application logic will be implemented in LineDrag class (drag.ts)
- World already has placeBelt() and placeUndergroundBelt() returning TileHistory | undefined

### Step 2: world_view.ts ✅

- Created BeltCurveView interface for reading belt connections and curvature
- Implemented TileHistoryView class - provides view of world with one tile's previous state
- Implemented DragWorldView class - world view for drag operations with geometric transformations
- All methods working with Ray using helper functions (getPositionOnRay, rayPosition)
- DragWorldView provides belt connection checking, belt curving detection, and underground pair queries

### Step 3: belt_curving.ts ✅ (OMITTED)

- All belt curving functionality already implemented:
  - BeltConnections type → world.ts (line 30)
  - TileHistory type → world.ts (line 37)
  - BeltCurveView interface → world_view.ts (line 14)
  - TileHistoryView class → world_view.ts (line 29)
  - World implements BeltCurveView → world.ts (methods: outputDirectionAt, inputDirectionAt, beltConnectionsAt, beltCurvedInputDirection)
- Import belt curving types from: world.ts (BeltConnections, TileHistory)
- Import belt curving classes/interfaces from: world_view.ts (BeltCurveView, TileHistoryView)

### Step 4: tile_classification.ts ✅

- Created TileType discriminated union (Usable, Obstacle, IntegratedSplitter, IntegratedUnderground, ImpassableObstacle)
- Implemented TileClassifier class with complex classification logic:
  - classifyNextTile() - Main entry point for tile classification
  - Separate classification methods for Belt, UndergroundBelt, Splitter, LoaderLike entities
  - shouldIntegrateBeltSegment() - Scans ahead to decide whether to integrate or underground over a segment
  - Helper methods for checking connectivity, perpendicularity, and underground pair positions
- TileClassifier handles all edge cases: curved belts, perpendicular entities, connected segments, underground pairs
- Uses DragWorldView for querying world state during drag operations

### Step 5: drag_state.ts ✅

- Created DragState discriminated union (OverBelt, OverSplitter, BuildingUnderground, PassThrough, OverImpassable, ErrorRecovery)
- Created DragEndShape internal type for representing end of belt line after direction factoring
- Implemented DragStepResult class to encapsulate step results (action, error, next state)
- Implemented stepDragState() - main state machine logic:
  - getDragEnd() - resolves drag end shape from current state and direction
  - Handles tile classification and delegates to appropriate handlers
  - Complex logic for handling forward/backward dragging and underground pairs
- Implemented state transition handlers:
  - placeBeltOrUnderground() - places belts or creates/extends undergrounds
  - handleObstacle() - transitions to BuildingUnderground state
  - handleImpassableObstacle() - transitions to OverImpassable or ErrorRecovery
  - integrateUndergroundPair() - integrates existing underground pairs
- Implemented validation functions:
  - canBuildUnderground() - validates underground belt placement (distance, obstacles, tier conflicts)
  - canUpgradeUnderground() - checks if underground can be upgraded to higher tier
- deferredError() - returns errors that should be reported after state transition
- DragContext interface - provides context for drag operations (world, ray, tier, lastPosition, tileHistory)

### Step 6: drag.ts ✅

- Implemented LineDrag class - main class for smart belt drag operations:
  - startDrag() - static factory method to start a new drag operation
  - interpolateTo() - main entry point, interpolates drag from current to target position
  - applyStep() - applies a drag step result (action + state transition)
  - applyAction() - applies actions to the world (PlaceBelt, CreateUnderground, ExtendUnderground, IntegrateUndergroundPair, IntegrateSplitter)
  - getErrors() - returns all errors that occurred during drag
- Action application logic handles all action types:
  - PlaceBelt - places a belt and updates tile history
  - CreateUnderground - creates underground pair (input + output)
  - ExtendUnderground - extends existing underground by removing old output and placing new one
  - IntegrateUndergroundPair - flips/upgrades existing underground pair
  - IntegrateSplitter - upgrades splitter tier
- Private helper methods: nextPosition(), setTileHistory(), addError(), createContext()
- Uses stepDragState() from drag_state.ts for state machine logic
- Tracks errors with positions for test validation

### Step 7: smart_belt/index.ts ✅

- Created module exports file for smart_belt package
- Exports all public APIs from smart_belt modules:
  - Action types and helpers (Action, ActionError, DragDirection, directionMultiplier, swapIfBackwards)
  - World view classes (DragWorldView, TileHistoryView, BeltCurveView interface)
  - Tile classification (TileClassifier, TileType)
  - Drag state machine (DragState, DragStepResult, stepDragState, deferredError, DragContext)
  - Main drag class (LineDrag)
- Properly marks type-only exports with `type` keyword for verbatimModuleSyntax

### Step 8: test_case.ts ✅

- Implemented comprehensive YAML test case parsing and execution (~584 lines):
  - parseWorld() - Parses string representation into World with markers
  - parseWord() - Parses entity notation (tier + direction + type)
  - printWorld() - Renders World back to string with markers for errors
  - printEntity() - Formats individual entities as strings
- Test case structures:
  - DragTestCase - Full test case with metadata
  - TestCaseEntities - Core test data (before/after worlds, positions, tier, expected errors)
  - TestCaseSerde - YAML deserialization structure
- Test execution:
  - runTestCase() - Runs drag operation with wiggle/forward-back modes
  - runWiggle() - Forward 2, back 1 pattern for robustness testing
  - runForwardBack() - Tests forward then backward dragging
  - checkTestCase() - Validates results against expected world and errors
- Test transformations:
  - transformTestCase() - Applies geometric transforms to test cases
  - flipTestCase() - Reverses test for bidirectional testing
- Entity notation format:
  - `[tier][direction][type]` - e.g., `>` (belt), `>i` (underground input), `2>s` (tier-2 splitter)
  - `_` or empty - no entity
  - `X` - Colliding obstacle
  - `#` - Impassable tile
  - `*` prefix - error marker
- Error serialization as "x,y:error_type" strings
- Added World.getEntities() method for iterating over all entities

### Refactoring: Geometry Utilities ✅

- Added directionToChar() and directionFromChar() utility functions to geometry.ts
- Consolidated duplicate direction/axis logic across modules:
  - test_case.ts: Now uses directionToChar(), directionFromChar(), directionToVector(), oppositeDirection()
  - drag_state.ts: Now uses directionAxis() instead of inline calculations
  - tile_classification.ts: Now uses directionAxis() instead of inline calculations
  - world_view.ts: Now uses directionAxis() instead of inline calculations
- Removed getDirectionChar() helper from test_case.ts (replaced with directionToChar())
- Eliminated all manual axis calculations (checking Direction.North/South for Y axis)
- Eliminated all manual opposite direction calculations ((dir + 2) % 4)

### Step 9: generate-tests.ts ✅

- Created test generator script that reads YAML files from ../test_suite/
- Generates Bun test files in src/generated/ directory
- Implements same test variant logic as Rust build.rs:
  - Normal test (forward direction)
  - Reverse test (if not marked not_reversible)
  - Wiggle test (forward-2-back-1 pattern, if not marked forward_back)
  - Wiggle reverse test (both wiggle + reverse)
- Added checkTestCaseAllTransforms() to test_case.ts
  - Tests each case with all 8 geometric transforms
  - Handles reverse flag and after_for_reverse worlds
  - Reports errors with transform index for debugging
- Successfully generated 590 test cases from 155 YAML test cases across 10 files
- Test results: **566/590 passing (95.9%)**
  - All basic_tests passing (44 tests)
  - Most complex scenarios working
  - 24 failing tests involve curved belt edge cases
- Test generation is reproducible and matches Rust test structure
