use std::any::Any;

use serde::Deserialize;

use super::LineDrag;
use crate::belts::{Belt, BeltTier, UndergroundBelt};
use crate::{Direction, TilePosition, World, not_yet_impl};

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
    IntegrateUndergroundPair,
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
    EntityInTheWay,
}

impl<'a> LineDrag<'a> {
    pub(super) fn apply_action(&mut self, action: Action) {
        let position = self.next_position();
        let world_pos = self.ray.get_position(position);
        match action {
            Action::None => {}
            Action::PlaceBelt => {
                self.record_tile_history(position);
                self.world
                    .place_belt(world_pos, self.ray.direction, self.tier);
            }
            Action::CreateUnderground {
                input_pos,
                output_pos,
            } => {
                let (input_world_pos, output_world_pos) = (
                    self.ray.get_position(input_pos),
                    self.ray.get_position(output_pos),
                );

                self.record_tile_history(output_pos);

                self.world.place_underground_belt(
                    input_world_pos,
                    self.ray.direction,
                    true,
                    self.tier,
                );
                self.world.place_underground_belt(
                    output_world_pos,
                    self.ray.direction,
                    false,
                    self.tier,
                );
            }
            Action::ExtendUnderground {
                previous_output_pos,
                new_output_pos,
            } => {
                let (previous_output_world_pos, new_output_world_pos) = (
                    self.ray.get_position(previous_output_pos),
                    self.ray.get_position(new_output_pos),
                );

                self.world.remove(previous_output_world_pos);

                self.record_tile_history(new_output_pos);
                self.world.place_underground_belt(
                    new_output_world_pos,
                    self.ray.direction,
                    false,
                    self.tier,
                );
            }
            Action::IntegrateUndergroundPair => {
                let ug = self
                    .world
                    .get(world_pos)
                    .and_then(|e| (e as &dyn Any).downcast_ref::<UndergroundBelt>())
                    .expect("Expected UndergroundBelt at position");
                assert!(ug.shape_direction() == self.ray.direction.opposite());
                not_yet_impl!("Backwards drag");
                let (is_input, tier) = (ug.is_input, ug.tier);
                if !is_input {
                    self.world.flip_ug(world_pos);
                }
                if tier != self.tier {
                    self.world.upgrade_ug_checked(world_pos, self.tier);
                }
            }
        }
    }
}
impl World {
    pub(super) fn place_belt(
        &mut self,
        position: TilePosition,
        direction: Direction,
        tier: BeltTier,
    ) {
        self.set_exactly(position, Belt::new(direction, tier));
    }

    pub(super) fn place_underground_belt(
        &mut self,
        position: TilePosition,
        direction: Direction,
        is_input: bool,
        tier: BeltTier,
    ) {
        self.set_exactly(position, UndergroundBelt::new(direction, is_input, tier));
    }
}
