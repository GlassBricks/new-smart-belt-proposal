use std::any::Any;

use serde::Deserialize;

use super::{DragDirection, LineDrag};
use crate::belts::{Belt, BeltTier, UndergroundBelt};
use crate::smart_belt::belt_curving::TileHistory;
use crate::world::{ReadonlyWorld, World, WorldImpl};
use crate::{BeltConnectable, Direction, TilePosition};

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
    pub fn apply_action(&mut self, action: Action, direction: DragDirection) {
        let position = self.next_position(direction);
        let world_pos = self.ray.get_position(position);
        match action {
            Action::None => {}
            Action::PlaceBelt => {
                if let Some(tile_history) =
                    self.world
                        .place_belt(world_pos, self.ray.direction, self.tier)
                {
                    self.set_tile_history(Some(tile_history));
                }
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

                if let Some(tile_history) = self.world.place_underground_belt(
                    output_world_pos,
                    self.ray.direction,
                    direction == DragDirection::Backward,
                    self.tier,
                    true,
                ) {
                    self.set_tile_history(Some(tile_history));
                }
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

                if let Some(tile_history) = self.world.place_underground_belt(
                    new_output_world_pos,
                    self.ray.direction,
                    direction == DragDirection::Backward,
                    self.tier,
                    false,
                ) {
                    self.set_tile_history(Some(tile_history));
                }
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

                    if self.can_upgrade_underground(direction, output_pos) {
                        self.world.upgrade_ug(world_pos, self.tier);
                    } else {
                        self.add_error(Error::CannotUpgradeUnderground, direction);
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
    fn set_if_not_eq<T: BeltConnectable + PartialEq>(
        &mut self,
        position: TilePosition,
        entity: Box<T>,
    ) -> Option<TileHistory> {
        if let Some(old_entity) = self.get(position)
            && let Some(as_t) = old_entity.as_any().downcast_ref::<T>()
            && *as_t == *entity
        {
            None
        } else {
            let connections = self.belt_connections_at(position);
            self.set(position, entity);
            Some((position, connections))
        }
    }

    pub fn place_belt(
        &mut self,
        position: TilePosition,
        direction: Direction,
        tier: BeltTier,
    ) -> Option<TileHistory> {
        self.set_if_not_eq(position, Belt::new(direction, tier))
    }

    pub fn place_underground_belt(
        &mut self,
        position: TilePosition,
        direction: Direction,
        is_input: bool,
        tier: BeltTier,
        verify_direction: bool,
    ) -> Option<TileHistory> {
        let result = self.set_if_not_eq(position, UndergroundBelt::new(direction, is_input, tier));
        if verify_direction
            && let Some(get) = self.get(position)
            && let Some(ug) = get.as_underground_belt()
            && ug.direction != direction
        {
            self.flip_ug(position);
        }
        result
    }
}
