use std::any::Any;

use serde::Deserialize;

use super::{DragDirection, LineDrag};
use crate::belts::{Belt, BeltTier, UndergroundBelt};
use crate::world::{ReadonlyWorld, World, WorldImpl};
use crate::{Direction, TilePosition};

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
    CannotTraversePastEntity,
    CannotTraversePastTile,
}

impl<'a> LineDrag<'a> {
    pub fn apply_action(
        &mut self,
        action: Action,
        direction: DragDirection,
        error_handler: &mut dyn FnMut(TilePosition, Error),
    ) {
        let position = self.create_context(direction).next_position();
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
                    direction == DragDirection::Forward,
                    self.tier,
                    false,
                );

                self.world.place_underground_belt(
                    output_world_pos,
                    self.ray.direction,
                    direction == DragDirection::Backward,
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
                    direction == DragDirection::Backward,
                    self.tier,
                    false,
                );
            }
            Action::IntegrateUndergroundPair => {
                let (is_input, tier) = {
                    let ug = self
                        .world
                        .get(world_pos)
                        .and_then(|e| (e as &dyn Any).downcast_ref::<UndergroundBelt>())
                        .expect("Expected UndergroundBelt at position");
                    (ug.is_input, ug.tier)
                };

                if is_input != (direction == DragDirection::Forward) {
                    self.world.flip_ug(world_pos);
                }

                if tier != self.tier {
                    let output_world_pos = {
                        let ug = self
                            .world
                            .get(world_pos)
                            .and_then(|e| (e as &dyn Any).downcast_ref::<UndergroundBelt>())
                            .expect("Expected UndergroundBelt at position");
                        self.world
                            .get_ug_pair(world_pos, ug)
                            .expect("Expected underground pair")
                            .0
                    };
                    let output_pos = self.ray.ray_position(output_world_pos);

                    let ctx = self.create_context(direction);
                    if super::drag_state::can_upgrade_underground(&ctx, output_pos) {
                        self.world.upgrade_ug(world_pos, self.tier);
                    } else {
                        self.add_error(Error::CannotUpgradeUnderground, direction, error_handler);
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
        self.build(position, Belt::new(direction, tier))
    }

    pub fn place_underground_belt(
        &mut self,
        position: TilePosition,
        direction: Direction,
        is_input: bool,
        tier: BeltTier,
        verify_direction: bool,
    ) {
        self.build(position, UndergroundBelt::new(direction, is_input, tier));
        if verify_direction
            && let Some(get) = self.get(position)
            && let Some(ug) = get.as_underground_belt()
            && ug.direction != direction
        {
            self.flip_ug(position);
        }
    }
}
