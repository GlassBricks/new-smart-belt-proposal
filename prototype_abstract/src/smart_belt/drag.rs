use super::{DragState, DragWorldView, Error, StepResult};
use crate::belts::BeltTier;
use crate::{Direction, Position, Ray, World};

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
    // for testing
    pub(super) errors: Vec<(Position, Error)>,
}

impl<'a> LineDrag<'a> {
    pub fn start(
        world: &'a mut World,
        tier: BeltTier,
        start_pos: Position,
        direction: Direction,
    ) -> LineDrag<'a> {
        // todo: actual fast replace logic?
        world.place_belt(start_pos, direction, tier);

        LineDrag {
            world,
            ray: Ray::new(start_pos, direction),
            tier,
            last_state: DragState::BeltPlaced { was_output: true },
            last_position: 0,
            errors: Vec::new(),
        }
    }

    #[inline]
    pub(super) fn world_view(&self) -> DragWorldView<'_> {
        DragWorldView::new(self.world, self.ray)
    }

    pub(super) fn next_position(&self) -> i32 {
        self.last_position + 1
    }

    pub(crate) fn get_errors(self) -> Vec<(Position, Error)> {
        self.errors
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
