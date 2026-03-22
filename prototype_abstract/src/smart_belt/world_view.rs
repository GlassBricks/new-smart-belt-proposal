use crate::{
    Belt, BeltCollidable, BeltConnectable, Direction, Ray, UndergroundBelt,
    smart_belt::belt_curving::{TileHistory, TileHistoryView},
    world::ReadonlyWorld,
};

use super::RaySense;

/**
World view for TileClassifier.

Handles geometric transformations, and belt shapes.
*/
pub(super) struct DragWorldView<'a> {
    world: TileHistoryView<'a>,
    ray: Ray,
    ray_sense: RaySense,
}

impl<'a> DragWorldView<'a> {
    pub fn new(
        world: &'a dyn ReadonlyWorld,
        ray: Ray,
        tile_history: &'a [TileHistory],
        ray_sense: RaySense,
    ) -> Self {
        Self {
            world: TileHistoryView::new(world, tile_history),
            ray,
            ray_sense,
        }
    }

    pub fn ray_sense(&self) -> RaySense {
        self.ray_sense
    }

    pub fn step_sign(&self) -> i32 {
        self.ray.direction.axis_sign() * self.ray_sense.direction_multiplier()
    }

    /// Direction of the belt.
    pub fn belt_direction(&self) -> Direction {
        self.ray.direction
    }
    /// Direction of the next belt, maybe be opposite in case of backwards drags
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
        let position = self.ray.get_position(position);
        self.world.belt_is_curved_at(position, belt)
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
        self.world.output_direction_at(last_pos) == Some(self.belt_direction())
            && self.world.input_direction_at(cur_pos) == Some(self.belt_direction())
            || self.world.input_direction_at(last_pos) == Some(opposite_direction)
                && self.world.output_direction_at(cur_pos) == Some(opposite_direction)
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
        self.world
            .input_dependencies_at(last_world_pos)
            .contains(&self.ray_direction().opposite())
    }

    pub fn get_ug_pair_pos(&self, index: i32, ug: &UndergroundBelt) -> Option<i32> {
        let world_position = self.ray.get_position(index);
        self.world
            .get_ug_pair(world_position, ug)
            .map(|(pair_pos, _)| self.ray.ray_position(pair_pos))
    }
}
