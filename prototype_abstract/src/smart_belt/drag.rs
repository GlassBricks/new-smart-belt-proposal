use crate::{Belt, BeltTier, Direction, Entity, Position, Ray, World};

use super::{Action, DragState, DragWorldView, StepResult};

/**
 * Handles line dragging; includes mutable methods
 */
#[derive(Debug)]
pub struct LineDrag<'a> {
    world: &'a mut World,
    ray: Ray,

    pub(super) tier: BeltTier,
    pub(super) last_state: DragState,
    pub(super) last_position: i32,
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
            last_state: DragState::BeltPlaced,
            last_position: 0,
        }
    }

    pub(super) fn world_view(&self) -> DragWorldView<'_> {
        DragWorldView::new(self.world, self.ray)
    }

    pub(super) fn next_position(&self) -> i32 {
        self.last_position + 1
    }

    pub fn step_forward(&mut self) {
        let StepResult(action, next_state) = self.process_next_tile_forwards();
        self.process_action(action, self.next_position());
        self.last_position += 1;
        self.last_state = next_state;
    }

    pub fn interpolate_to(&mut self, new_position: Position) {
        let dist = self.ray.ray_position(new_position);
        while self.last_position < dist {
            self.step_forward();
        }
    }

    fn process_action(&mut self, action: Action, index: i32) {
        match action {
            Action::PlaceBelt => {
                let position = self.ray.get_position(index);
                self.world
                    .place_belt(position, self.ray.direction, self.tier);
            }
        }
    }
}

impl World {
    fn place_belt(&mut self, position: Position, direction: Direction, tier: BeltTier) {
        self.set(position, Entity::Belt(Belt::new(direction, tier)));
    }
}
