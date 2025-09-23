use dyn_clone::clone_box;

use super::{DragState, DragWorldView, Error, StepResult};
use crate::belts::BeltTier;
use crate::{Direction, Position, Ray, TileHistory, World, WorldReader};

/**
 * Handles line dragging; includes mutable methods
 */
#[derive(Debug)]
pub struct LineDrag<'a> {
    pub(super) world: &'a mut World,
    pub(super) ray: Ray,
    pub(super) tier: BeltTier,
    pub(super) last_state: DragState,
    pub(super) last_position: i32,
    // Some tiles we just placed may change other belt's curvature; however we
    // want the logic to be independent of what we've placed. As such, we track
    // the history of tiles we've replaced. It suffices only to keep track of
    // one tile (the last placed output belt).
    pub(super) tile_history: Option<TileHistory>,
    // for testing
    pub(super) errors: Vec<(Position, Error)>,
}

impl<'a> LineDrag<'a> {
    pub fn start_drag(
        world: &'a mut World,
        tier: BeltTier,
        start_pos: Position,
        direction: Direction,
    ) -> LineDrag<'a> {
        let mut errors = Vec::new();
        let (last_state, tile_history) = if world.can_place_belt_on_tile(start_pos) {
            let tile_history = Self::get_tile_history(start_pos, world);
            world.place_belt(start_pos, direction, tier);
            (DragState::BeltPlaced, Some(tile_history))
        } else {
            errors.push((start_pos, Error::EntityInTheWay));
            (DragState::ErrorRecovery, None)
        };

        LineDrag {
            world,
            ray: Ray::new(start_pos, direction),
            tier,
            last_state,
            last_position: 0,
            tile_history,
            errors,
        }
    }

    #[inline]
    pub(super) fn world_view(&self) -> DragWorldView<'_> {
        DragWorldView::new(self.world, self.ray, self.tile_history.as_ref())
    }

    pub(super) fn next_position(&self) -> i32 {
        self.last_position + 1
    }

    pub(crate) fn get_errors(self) -> Vec<(Position, Error)> {
        self.errors
    }

    pub(crate) fn get_tile_history(position: Position, world: &World) -> TileHistory {
        let entity = world
            .get(position)
            .and_then(|e| e.as_belt_connectable_dyn())
            .map(clone_box);
        (position, entity)
    }

    pub(crate) fn record_tile_history(&mut self, position: i32) {
        let world_position = self.ray.get_position(position);
        self.tile_history = Some(Self::get_tile_history(world_position, self.world));
    }

    fn step_forward(&mut self) {
        let StepResult(action, error, next_state) = self.process_next_tile_forwards();
        self.apply_action(action);
        if let Some(error) = error {
            self.errors
                .push((self.ray.get_position(self.next_position()), error));
        }
        self.last_position += 1;
        self.last_state = next_state;
    }

    pub fn interpolate_to(&mut self, new_position: Position) {
        let dist = self.ray.ray_position(new_position);
        while self.last_position < dist {
            self.step_forward();
        }
    }
}
