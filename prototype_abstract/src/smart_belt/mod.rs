//! Smart belt!
//! Modules:
//!   drag: The main thing that puts things together. Handles starting and rotating a drag.
//!   drag_direction: Fundamental type for drag direction (forward/backward)
//!   tile_classification: determines what is an obstacle, what should be integrated, etc.
//!   drag_state: "State machine" for the drag. Defines all possible states and transitions
//!   action: defines all actions that might be performed when dragging; including error notifications.
//!   belt_curving: Logic for belt curvature. Includes keeping track of tile history
//!   world_view: Utilities for queries on entities, used by tile_classification.

pub mod action;
pub mod belt_curving;
pub mod drag;
pub mod drag_direction;
pub mod drag_state;
pub mod tile_classification;
pub mod world_view;

use action::*;
pub use drag::{FullDrag, LineDrag};
pub use drag_direction::DragDirection;
pub use drag_state::DragState;
use tile_classification::*;
use world_view::*;
