use serde::Deserialize;

use super::LineDrag;
use crate::belts::{Belt, BeltTier, UndergroundBelt};
use crate::{Direction, Position, World};

#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) enum Action {
    PlaceBelt,
    CreateUnderground {
        input_pos: i32,
        output_pos: i32,
    },
    ExtendUnderground {
        previous_output_pos: i32,
        new_output_pos: i32,
    },
    // ReplaceUnderground { last_output_position: i32 },
    // IntegrateEntity,
    None,
    // errors
    // EntityInTheWay,
    // ImpassableObstacle,
    // TooLongToReach,
    // CannotUpgradeUnderground,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Error {
    TooFarToConnect,
    CurvedBeltInTheWay,
}

impl<'a> LineDrag<'a> {
    pub(super) fn apply_action(&mut self, action: Action) {
        let ray_position = self.next_position();
        let position = self.ray.get_position(ray_position);
        match action {
            Action::None => {}
            Action::PlaceBelt => {
                self.world
                    .place_belt(position, self.ray.direction, self.tier);
            }
            Action::CreateUnderground {
                input_pos,
                output_pos,
            } => {
                let (input_pos, output_pos) = (
                    self.ray.get_position(input_pos),
                    self.ray.get_position(output_pos),
                );

                self.world
                    .place_underground_belt(input_pos, self.ray.direction, true, self.tier);
                self.world
                    .place_underground_belt(output_pos, self.ray.direction, false, self.tier);
            }
            Action::ExtendUnderground {
                previous_output_pos,
                new_output_pos,
            } => {
                let (previous_output_pos, new_output_pos) = (
                    self.ray.get_position(previous_output_pos),
                    self.ray.get_position(new_output_pos),
                );

                self.world.remove(previous_output_pos);
                self.world.place_underground_belt(
                    new_output_pos,
                    self.ray.direction,
                    false,
                    self.tier,
                );
            }
        }
    }
}
impl World {
    pub(super) fn place_belt(&mut self, position: Position, direction: Direction, tier: BeltTier) {
        self.set(position, Belt::new(direction, tier));
    }

    pub(super) fn place_underground_belt(
        &mut self,
        position: Position,
        direction: Direction,
        is_input: bool,
        tier: BeltTier,
    ) {
        self.set(position, UndergroundBelt::new(direction, is_input, tier));
    }
}
