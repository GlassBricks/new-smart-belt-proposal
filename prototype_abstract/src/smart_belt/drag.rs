use crate::{Belt, BeltTier, Direction, Entity, Position, Ray, World};

use super::{Action, LineDragLogic, LineDragState, StepResult};

/**
 * Handles line dragging; includes mutable methods
 */
#[derive(Debug)]
pub struct LineDrag<'a> {
    world: &'a mut World,
    ray: Ray,
    tier: BeltTier,
    last_state: LineDragState,
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
            tier,
            ray: Ray::new(start_pos, direction),
            last_state: LineDragState::initial(true),
        }
    }

    pub fn step_forward(&mut self) {
        let logic = LineDragLogic::new(self.world, self.ray, self.tier);
        let StepResult {
            action,
            next_tile_type,
        } = logic.process_next_tile(&self.last_state);
        self.process_action(action, self.last_state.next_position());
        let new_state = LineDragState {
            last_position: self.last_state.next_position(),
            last_tile_type: next_tile_type,
            ..self.last_state
        };
        self.last_state = new_state;
    }

    pub fn interpolate_to(&mut self, new_position: Position) {
        let dist = self.ray.ray_position(new_position);
        while self.last_state.last_position < dist {
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
            Action::PlaceNewUnderground { .. } => todo!(),
            Action::ReplaceUnderground { .. } => todo!(),
            Action::IntegrateEntity => todo!(),
            Action::None => todo!(),
            Action::EntityInTheWay => todo!(),
            Action::ImpassableObstacle => todo!(),
            Action::TooLongToReach => todo!(),
            Action::CannotUpgradeUnderground => todo!(),
        }
    }
}

impl World {
    fn place_belt(&mut self, position: Position, direction: Direction, tier: BeltTier) {
        self.set(position, Entity::Belt(Belt::new(direction, tier)));
    }
}
