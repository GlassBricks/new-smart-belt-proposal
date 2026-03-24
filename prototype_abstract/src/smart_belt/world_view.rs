use arrayvec::ArrayVec;

use crate::belts::BeltTier;
use crate::world::{BeltConnections, WorldImpl};
use crate::{Belt, BeltCollidable, BeltConnectable, Direction, Ray, TilePosition, UndergroundBelt};

use super::RaySense;

pub type TileHistory = (TilePosition, BeltConnections);

/// World view for drag operations. Handles geometric transformations, belt shapes,
/// and history-aware curvature queries.
pub(super) struct SmartBeltWorldView<'a> {
    pub(super) world: &'a WorldImpl,
    pub(super) tile_history: Vec<TileHistory>,
    pub(super) ray: Ray,
    pub(super) ray_sense: RaySense,
    pub(super) tier: BeltTier,
    pub(super) last_position: i32,
    pub(super) furthest_placement_pos: i32,
}

impl<'a> SmartBeltWorldView<'a> {
    pub fn next_position(&self) -> i32 {
        self.last_position + self.step_sign()
    }

    /// Combined step sign: positive when stepping increases the absolute coordinate.
    pub fn step_sign(&self) -> i32 {
        self.ray.direction.axis_sign() * self.ray_sense.direction_multiplier()
    }

    pub fn ray_sense(&self) -> RaySense {
        self.ray_sense
    }

    /// Direction of the belt.
    pub fn belt_direction(&self) -> Direction {
        self.ray.direction
    }

    /// Direction of the next belt, may be opposite in case of backwards drags.
    pub fn ray_direction(&self) -> Direction {
        if self.ray_sense == RaySense::Forward {
            self.ray.direction
        } else {
            self.ray.direction.opposite()
        }
    }

    pub fn get_entity(&self, position: i32) -> Option<&BeltCollidable> {
        self.world.get(self.ray.get_position(position))
    }

    pub fn get_belt_connectable(&self, position: i32) -> Option<BeltConnectable> {
        self.get_entity(position)
            .and_then(|entity| BeltConnectable::try_from(entity).ok())
    }

    pub fn belt_was_curved(&self, position: i32, belt: &Belt) -> bool {
        let world_pos = self.ray.get_position(position);
        self.input_direction_at(world_pos)
            .is_some_and(|d| d.axis() != belt.direction.axis())
    }

    /// If this entity belt-connects to the previous entity, forming part of the same belt segment.
    pub fn is_belt_connected_to_previous_tile(&self, next_pos: i32) -> bool {
        let fwd = self.ray.direction.axis_sign();

        let (last_pos, cur_pos) = if self.ray_sense == RaySense::Forward {
            (
                self.ray.get_position(next_pos - fwd),
                self.ray.get_position(next_pos),
            )
        } else {
            (
                self.ray.get_position(next_pos),
                self.ray.get_position(next_pos + fwd),
            )
        };

        let opposite_direction = self.belt_direction().opposite();
        self.output_direction_at(last_pos) == Some(self.belt_direction())
            && self.input_direction_at(cur_pos) == Some(self.belt_direction())
            || self.input_direction_at(last_pos) == Some(opposite_direction)
                && self.output_direction_at(cur_pos) == Some(opposite_direction)
    }

    pub fn removing_belt_will_change_previous_belt_curvature(
        &self,
        next_pos: i32,
        input_ug_pos: Option<i32>,
    ) -> bool {
        let drag_step = self.step_sign();

        if input_ug_pos == Some(next_pos - 2 * drag_step) {
            return false;
        }
        let last_world_pos = self.ray.get_position(next_pos - drag_step);
        self.input_dependencies_at(last_world_pos)
            .contains(&self.ray_direction().opposite())
    }

    pub fn get_ug_pair_pos(&self, index: i32, ug: &UndergroundBelt) -> Option<i32> {
        let world_position = self.ray.get_position(index);
        self.world
            .get_ug_pair(world_position, ug)
            .map(|(pair_pos, _)| self.ray.ray_position(pair_pos))
    }

    // History-aware world queries: check tile_history before falling back to world

    fn find_in_history(&self, position: TilePosition) -> Option<&BeltConnections> {
        self.tile_history
            .iter()
            .find(|(p, _)| *p == position)
            .map(|(_, connections)| connections)
    }

    fn output_direction_at(&self, position: TilePosition) -> Option<Direction> {
        if let Some(connections) = self.find_in_history(position) {
            return connections.output;
        }
        self.world.output_direction_at(position)
    }

    fn input_direction_at(&self, position: TilePosition) -> Option<Direction> {
        if let Some(connections) = self.find_in_history(position) {
            return connections.input;
        }
        let entity = self
            .world
            .get(position)
            .and_then(|entity| BeltConnectable::try_from(entity).ok())?;
        if let BeltConnectable::Belt(belt) = &entity {
            Some(self.belt_curved_input_direction(position, belt.direction))
        } else {
            entity.primary_input_direction()
        }
    }

    fn belt_curved_input_direction(
        &self,
        position: TilePosition,
        belt_direction: Direction,
    ) -> Direction {
        let has_input_in = |direction: Direction| {
            let query_pos = position - direction.to_vector();
            self.output_direction_at(query_pos) == Some(direction)
        };

        if has_input_in(belt_direction) {
            return belt_direction;
        }
        match (
            has_input_in(belt_direction.rotate_cw()),
            has_input_in(belt_direction.rotate_ccw()),
        ) {
            (true, false) => belt_direction.rotate_cw(),
            (false, true) => belt_direction.rotate_ccw(),
            _ => belt_direction,
        }
    }

    fn input_dependencies_at(&self, position: TilePosition) -> ArrayVec<Direction, 3> {
        let entity = self.world.get(position);
        if let Some(BeltCollidable::Belt(belt)) = entity {
            self.belt_curve_dependencies(position, belt.direction)
        } else {
            ArrayVec::new()
        }
    }

    fn belt_curve_dependencies(
        &self,
        position: TilePosition,
        belt_direction: Direction,
    ) -> ArrayVec<Direction, 3> {
        let has_input_in = |direction: Direction| {
            let query_pos = position - direction.to_vector();
            self.output_direction_at(query_pos) == Some(direction)
        };

        if has_input_in(belt_direction) {
            [belt_direction].into_iter().collect()
        } else {
            let cw = Some(belt_direction.rotate_cw()).take_if(|d| has_input_in(*d));
            let ccw = Some(belt_direction.rotate_ccw()).take_if(|d| has_input_in(*d));
            [cw, ccw].into_iter().flatten().collect()
        }
    }
}
