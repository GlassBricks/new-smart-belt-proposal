use super::{DragDirection, DragState, Error};
use crate::TilePosition;
use crate::belts::BeltTier;
use crate::smart_belt::DragWorldView;
use crate::smart_belt::belt_curving::TileHistory;
use crate::world::{ReadonlyWorld, WorldImpl};
use crate::{Direction, Ray, smart_belt::Action};

pub struct DragStepResult(pub Action, pub Option<Error>, pub DragState);

/// Handles dragging in a straight line (no rotations).
#[derive(Debug)]
pub struct LineDrag<'a> {
    pub(super) world: &'a mut WorldImpl,
    pub(super) ray: Ray,
    pub(super) tier: BeltTier,
    pub(super) last_state: DragState,
    pub(super) last_position: i32,
    // Some tiles we just placed may change other belt's curvature; however we
    // want the logic to be independent of what we've placed. As such, we track
    // the history of tiles we've replaced. It suffices only to keep track of
    // one tile (the last placed output belt).
    // See belt_curving.rs for more info
    tile_history: Option<TileHistory>,
    pub(super) errors: Vec<(TilePosition, Error)>,
    // Position tracking for rotation support
    max_pos: i32,
    min_pos: i32,
    furthest_pos: i32,
}

impl<'a> LineDrag<'a> {
    /// Starts a drag.
    /// Note: the very first click may fast-replace something, forcing something to be overwritten.
    pub fn start_drag(
        world: &'a mut WorldImpl,
        tier: BeltTier,
        start_pos: TilePosition,
        belt_direction: Direction,
    ) -> LineDrag<'a> {
        let mut errors = Vec::new();
        let can_place = world.can_place_belt_on_tile(start_pos);
        let tile_history = can_place.then(|| (start_pos, world.belt_connections_at(start_pos)));

        if can_place {
            world.place_belt(start_pos, belt_direction, tier);
        } else {
            errors.push((start_pos, Error::EntityInTheWay));
        }

        let initial_state = DragState::initial_state(can_place);

        LineDrag {
            world,
            ray: Ray::new(start_pos, belt_direction),
            tier,
            last_state: initial_state,
            last_position: 0,
            tile_history,
            errors,
            max_pos: 0,
            min_pos: 0,
            furthest_pos: 0,
        }
    }

    pub fn get_errors(self) -> Vec<(TilePosition, Error)> {
        self.errors
    }

    pub fn next_position(&self, direction: DragDirection) -> i32 {
        self.last_position + direction.direction_multiplier()
    }

    /// Main entry point for the drag operation.
    pub fn interpolate_to(&mut self, new_position: TilePosition) {
        let target_pos = self.ray.ray_position(new_position);
        while self.last_position < target_pos {
            let result = self.last_state.step(self, DragDirection::Forward);
            self.apply_step(result, DragDirection::Forward);
        }
        while self.last_position > target_pos {
            let result = self.last_state.step(self, DragDirection::Backward);
            self.apply_step(result, DragDirection::Backward);
        }
        self.update_furthest_position(target_pos);
    }

    fn apply_step(&mut self, step: DragStepResult, direction: DragDirection) {
        let DragStepResult(action, error, next_state) = step;
        eprintln!("action: {:?}", action);
        self.apply_action(action, direction);

        if let Some(error) = self.last_state.deferred_error(direction) {
            self.add_error(error, direction);
        }
        if let Some(error) = error {
            self.add_error(error, direction);
        }

        eprintln!("Next state: {:?}\n", next_state);
        self.last_state = next_state;
        self.last_position = self.next_position(direction);
    }

    pub(super) fn set_tile_history(&mut self, tile_history: Option<TileHistory>) {
        eprintln!("New tile history: {:?}", tile_history);
        self.tile_history = tile_history;
    }

    pub(super) fn drag_world_view(&self, direction: DragDirection) -> DragWorldView<'_> {
        DragWorldView::new(self.world, self.ray, self.tile_history, direction)
    }

    pub(super) fn add_error(&mut self, error: Error, direction: DragDirection) {
        eprintln!("error: {:?}", error);
        self.errors
            .push((self.ray.get_position(self.next_position(direction)), error));
    }

    pub fn update_furthest_position(&mut self, target_pos: i32) {
        if target_pos > self.max_pos {
            self.max_pos = target_pos;
            self.furthest_pos = target_pos;
        }
        if target_pos < self.min_pos {
            self.min_pos = target_pos;
            self.furthest_pos = target_pos;
        }
    }

    /// Returns (pivot_position, is_backward)
    pub fn get_rotation_pivot(&self) -> (TilePosition, bool) {
        let is_backward = self.max_pos != 0 && self.min_pos == self.furthest_pos;
        (self.ray.get_position(self.furthest_pos), is_backward)
    }
}
