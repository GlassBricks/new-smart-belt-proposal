use serde::Deserialize;

use super::drag_state::LastBuiltEntity;
use super::{LineDrag, RaySense};
use crate::belts::{Belt, BeltTier, UndergroundBelt};
use crate::world::WorldImpl;
use crate::{BeltCollidable, BeltConnectable, Direction, TilePosition};

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
    IntegrateUndergroundPair {
        output_pos: i32,
    },
    IntegrateSplitter,
    SetImpassable(RaySense),
    ClearEntity,
    None,
}

impl Action {
    pub fn is_placement(&self) -> bool {
        matches!(
            self,
            Action::PlaceBelt
                | Action::CreateUnderground { .. }
                | Action::ExtendUnderground { .. }
                | Action::IntegrateUndergroundPair { .. }
                | Action::IntegrateSplitter
        )
    }
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
        next_position: i32,
        ray_sense: RaySense,
    ) {
        let world_pos = self.ray.get_position(next_position);
        match action {
            Action::None => {}
            Action::PlaceBelt => {
                self.before_entity_placed(next_position);
                let entity = self
                    .world
                    .place_belt(world_pos, self.ray.direction, self.tier);
                let connectable = BeltConnectable::try_from(entity).unwrap();
                self.set_last_built_entity(LastBuiltEntity::from_build(connectable, next_position));
            }
            Action::CreateUnderground {
                input_pos,
                output_pos,
            } => {
                let input_world_pos = self.ray.get_position(input_pos);
                let output_world_pos = self.ray.get_position(output_pos);

                self.world.place_underground_belt(
                    input_world_pos,
                    self.ray.direction,
                    ray_sense == RaySense::Forward,
                    self.tier,
                    false,
                );

                self.before_entity_placed(output_pos);
                let entity = self.world.place_underground_belt(
                    output_world_pos,
                    self.ray.direction,
                    ray_sense == RaySense::Backward,
                    self.tier,
                    true,
                );
                let connectable = BeltConnectable::try_from(entity).unwrap();
                self.set_last_built_entity(LastBuiltEntity::from_build(connectable, output_pos));
            }
            Action::ExtendUnderground {
                last_output_pos: previous_output_pos,
                new_output_pos,
            } => {
                let previous_output_world_pos = self.ray.get_position(previous_output_pos);
                let new_output_world_pos = self.ray.get_position(new_output_pos);

                self.world.mine(previous_output_world_pos);

                self.before_entity_placed(new_output_pos);
                let entity = self.world.place_underground_belt(
                    new_output_world_pos,
                    self.ray.direction,
                    ray_sense == RaySense::Backward,
                    self.tier,
                    false,
                );
                let connectable = BeltConnectable::try_from(entity).unwrap();
                self.set_last_built_entity(LastBuiltEntity::from_build(
                    connectable,
                    new_output_pos,
                ));
            }
            Action::IntegrateUndergroundPair { output_pos } => {
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

                let view = self.create_world_view(next_position, ray_sense);
                let sense_furthest = view.sense_furthest_pos;
                if tier != self.tier {
                    if super::drag_state::can_upgrade_underground(&view, output_pos) {
                        self.world.upgrade_ug(world_pos, self.tier);
                    } else {
                        Self::report_error(
                            error_handler,
                            Error::CannotUpgradeUnderground,
                            world_pos,
                        );
                    }
                }

                let output_world_pos = self.ray.get_position(output_pos);
                let Some(entity) = self.world.get_belt(output_world_pos) else {
                    return;
                };

                // DON'T self.pre_entity_placement since we aren't creating any new entities
                if output_pos == sense_furthest {
                    self.set_last_built_entity(LastBuiltEntity::from_build(entity, output_pos));
                } else {
                    self.set_last_built_entity(LastBuiltEntity::from_overbuild(entity, output_pos));
                }
            }
            Action::IntegrateSplitter => {
                let entity = self.world.upgrade_splitter(world_pos, self.tier);
                let connectable = BeltConnectable::try_from(entity).unwrap();
                self.set_last_built_entity(LastBuiltEntity::from_overbuild(
                    connectable,
                    next_position,
                ));
            }
            Action::SetImpassable(sense) => {
                self.over_impassable = Some(sense);
            }
            Action::ClearEntity => {
                self.last_built_entity = None;
                self.over_impassable = None;
            }
        }
    }

    fn before_entity_placed(&mut self, position: i32) {
        self.update_furthest_placement(position);
    }

    fn set_last_built_entity(&mut self, entity: LastBuiltEntity) {
        self.last_built_entity = Some(entity);
        self.over_impassable = None;
    }
}
impl WorldImpl {
    pub fn place_belt(
        &mut self,
        position: TilePosition,
        direction: Direction,
        tier: BeltTier,
    ) -> &BeltCollidable {
        self.build(position, Belt::new(direction, tier).into())
    }

    pub fn place_underground_belt(
        &mut self,
        position: TilePosition,
        direction: Direction,
        is_input: bool,
        tier: BeltTier,
        verify_direction: bool,
    ) -> &BeltCollidable {
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
        self.get(position).unwrap()
    }

    pub fn upgrade_splitter(&mut self, position: TilePosition, tier: BeltTier) -> &BeltCollidable {
        if let Some(BeltCollidable::Splitter(splitter)) = self.get_mut(position) {
            splitter.tier = tier;
        }
        self.get(position).unwrap()
    }
}
