//! Smart belt!
//! Modules:
//!   drag: The main thing that puts things together. Handles starting and rotating a drag.
//!   drag_direction: Fundamental type for ray sense (forward/backward)
//!   tile_classification: determines what is an obstacle, what should be integrated, etc.
//!   drag_state: "State machine" for the drag. Defines all possible states and transitions
//!   action: defines all actions that might be performed when dragging; including error notifications.
//!   world_view: World view with geometric transformations, belt shapes, and tile history.

pub mod action;
pub mod drag;
pub mod drag_direction;
pub mod drag_state;
pub mod tile_classification;
pub mod world_view;

use action::*;
pub use drag::LineDrag;
pub use drag_direction::RaySense;
pub use drag_state::DragState;
use tile_classification::*;
use world_view::*;
