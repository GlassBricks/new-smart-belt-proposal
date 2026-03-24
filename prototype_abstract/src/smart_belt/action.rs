use serde::Deserialize;

use super::{LineDrag, RaySense};
use crate::belts::{Belt, BeltTier, UndergroundBelt};
use crate::world::WorldImpl;
use crate::{BeltCollidable, Direction, TilePosition};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Action {
    PlaceBelt,
    CreateUnderground {
        input_pos: i32,
        output_pos: i32,
    },
    ExtendUnderground {
        last_output_pos: i32,
        new_output_pos: i32,
    },
    IntegrateUndergroundPair,
    IntegrateSplitter,
    None,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Hash)]
#[serde(rename_all = "snake_case")]
pub enum Error {
    TooFarToConnect,
    EntityInTheWay,
    CannotUpgradeUnderground,
    BeltLineBroken,
}

impl<'a> LineDrag<'a> {
    pub fn apply_action(
        &mut self,
        error_handler: &mut dyn FnMut(TilePosition, Error),
        action: Action,
        ray_sense: RaySense,
    ) {
        let position = self.create_world_view(ray_sense).next_position();
        let world_pos = self.ray.get_position(position);
        match action {
            Action::None => {}
            Action::PlaceBelt => {
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

                self.world.place_underground_belt(
                    input_world_pos,
                    self.ray.direction,
                    ray_sense == RaySense::Forward,
                    self.tier,
                    false,
                );

                self.world.place_underground_belt(
                    output_world_pos,
                    self.ray.direction,
                    ray_sense == RaySense::Backward,
                    self.tier,
                    true,
                );
            }
            Action::ExtendUnderground {
                last_output_pos: previous_output_pos,
                new_output_pos,
            } => {
                let (previous_output_world_pos, new_output_world_pos) = (
                    self.ray.get_position(previous_output_pos),
                    self.ray.get_position(new_output_pos),
                );

                self.world.mine(previous_output_world_pos);

                self.world.place_underground_belt(
                    new_output_world_pos,
                    self.ray.direction,
                    ray_sense == RaySense::Backward,
                    self.tier,
                    false,
                );
            }
            Action::IntegrateUndergroundPair => {
                let (is_input, tier) = {
                    let Some(BeltCollidable::UndergroundBelt(ug)) = self.world.get(world_pos)
                    else {
                        panic!("Expected UndergroundBelt at position");
                    };
                    (ug.is_input, ug.tier)
                };

                if is_input != (ray_sense == RaySense::Forward) {
                    self.world.flip_ug(world_pos);
                }

                if tier != self.tier {
                    let output_world_pos = {
                        let Some(BeltCollidable::UndergroundBelt(ug)) = self.world.get(world_pos)
                        else {
                            panic!("Expected UndergroundBelt at position");
                        };
                        self.world
                            .get_ug_pair(world_pos, ug)
                            .expect("Expected underground pair")
                            .0
                    };
                    let output_pos = self.ray.ray_position(output_world_pos);

                    let view = self.create_world_view(ray_sense);
                    if super::drag_state::can_upgrade_underground(&view, output_pos) {
                        self.world.upgrade_ug(world_pos, self.tier);
                    } else {
                        self.add_error(error_handler, Error::CannotUpgradeUnderground, ray_sense);
                    }
                }
            }
            Action::IntegrateSplitter => {
                self.world.upgrade_splitter(world_pos, self.tier);
            }
        }
    }
}
impl WorldImpl {
    pub fn place_belt(&mut self, position: TilePosition, direction: Direction, tier: BeltTier) {
        self.build(position, Belt::new(direction, tier).into())
    }

    pub fn place_underground_belt(
        &mut self,
        position: TilePosition,
        direction: Direction,
        is_input: bool,
        tier: BeltTier,
        verify_direction: bool,
    ) {
        self.build_unchecked(
            position,
            UndergroundBelt::new(direction, is_input, tier).into(),
        );
        if verify_direction
            && let Some(BeltCollidable::UndergroundBelt(ug)) = self.get(position)
            && ug.direction != direction
        {
            self.flip_ug(position);
        }
    }
}
