use dyn_clone::clone_box;

use super::{DragStateImpl, Error};
use crate::TilePosition;
use crate::belts::BeltTier;
use crate::smart_belt::DragState;
use crate::smart_belt::belt_curving::TileHistory;
use crate::{Direction, Ray, World, smart_belt::Action};

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
}

/**
 * Handles line dragging; includes mutable methods
 */
#[derive(Debug)]
pub struct LineDrag<'a, S: DragState = DragStateImpl> {
    pub(super) world: &'a mut World,
    pub(super) ray: Ray,
    pub(super) tier: BeltTier,
    pub(super) last_state: S,
    pub(super) last_position: i32,
    // Some tiles we just placed may change other belt's curvature; however we
    // want the logic to be independent of what we've placed. As such, we track
    // the history of tiles we've replaced. It suffices only to keep track of
    // one tile (the last placed output belt).
    pub(super) tile_history: Option<TileHistory>,
    // for testing
    pub(super) errors: Vec<(TilePosition, Error)>,
}

pub struct DragStepResult<S: DragState>(pub Action, pub Option<Error>, pub S);

impl<'a, S: DragState> LineDrag<'a, S> {
    pub fn start_drag(
        world: &'a mut World,
        tier: BeltTier,
        start_pos: TilePosition,
        belt_direction: Direction,
    ) -> LineDrag<'a, S> {
        let mut errors = Vec::new();
        let can_place = world.can_place_belt_on_tile(start_pos);
        let tile_history = can_place.then(|| Self::get_tile_history(start_pos, world));

        if can_place {
            world.place_belt(start_pos, belt_direction, tier);
        } else {
            errors.push((start_pos, Error::EntityInTheWay));
        }

        let initial_state = S::initial_state(can_place);

        LineDrag {
            world,
            ray: Ray::new(start_pos, belt_direction),
            tier,
            last_state: initial_state,
            last_position: 0,
            tile_history,
            errors,
        }
    }

    pub fn get_errors(self) -> Vec<(TilePosition, Error)> {
        self.errors
    }

    fn get_tile_history(position: TilePosition, world: &World) -> TileHistory {
        let entity = world.get_belt_dyn(position).map(clone_box);
        (position, entity)
    }

    pub(super) fn record_tile_history(&mut self, position: i32) {
        let world_position = self.ray.get_position(position);
        self.tile_history = Some(Self::get_tile_history(world_position, self.world));
    }

    pub(super) fn next_position(&self, direction: DragDirection) -> i32 {
        self.last_position + direction.direction_multiplier()
    }

    /// the only mutable functions are here!
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
    }

    fn apply_step(&mut self, step: DragStepResult<S>, direction: DragDirection) {
        let DragStepResult(action, error, next_state) = step;
        eprintln!("action: {:?}", action);
        self.apply_action(action, direction);

        if let Some(error) = self.last_state.deferred_error() {
            self.add_error(error, direction);
        }
        if let Some(error) = error {
            self.add_error(error, direction);
        }

        eprintln!("Next state: {:?}\n", next_state);
        self.last_state = next_state;
        self.last_position = self.next_position(direction);
    }

    fn add_error(&mut self, error: Error, direction: DragDirection) {
        eprintln!("error: {:?}", error);
        self.errors
            .push((self.ray.get_position(self.next_position(direction)), error));
    }
}
