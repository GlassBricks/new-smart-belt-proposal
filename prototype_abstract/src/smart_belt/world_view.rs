use crate::{
    Belt, BeltConnectableEnum, Direction, Entity, Ray, UndergroundBelt, World,
    smart_belt::belt_curving::{BeltCurveView, TileHistory, TileHistoryView},
};

use super::drag::DragDirection;

/**
World view for TileClassifier.

Handles geometric transformations, and belt shapes.
*/
#[derive(Debug)]
pub(super) struct DragWorldView<'a> {
    world_reader: TileHistoryView<'a>,
    ray: Ray,
    pub(crate) direction: DragDirection,
}

impl<'a> DragWorldView<'a> {
    pub fn new(
        world: &'a World,
        ray: Ray,
        tile_history: Option<&'a TileHistory>,
        direction: DragDirection,
    ) -> Self {
        Self {
            world_reader: TileHistoryView::new(world, tile_history),
            ray,
            direction,
        }
    }

    pub fn belt_direction(&self) -> Direction {
        self.ray.direction
    }
    pub fn drag_direction(&self) -> Direction {
        if self.direction == DragDirection::Forward {
            self.ray.direction
        } else {
            self.ray.direction.opposite()
        }
    }

    // World interaction methods - stubbed for implementation
    pub fn get_entity(&self, position: i32) -> Option<&dyn Entity> {
        self.world_reader
            .get_entity(self.ray.get_position(position))
    }

    pub fn get_belt_entity(&self, position: i32) -> Option<BeltConnectableEnum<'_>> {
        self.get_entity(position)
            .and_then(|entity| entity.as_belt_connectable())
    }

    pub fn belt_was_curved(&self, position: i32, belt: &Belt) -> bool {
        let position = self.ray.get_position(position);
        self.world_reader.belt_is_curved_at(position, belt)
    }

    /// If this entity belt-connects to the previous entity, forming part of the same belt segment.
    pub fn is_belt_connected_to_previous_tile(&self, next_pos: i32) -> bool {
        let (last_pos, cur_pos) = if self.direction == DragDirection::Forward {
            (
                self.ray.get_position(next_pos - 1),
                self.ray.get_position(next_pos),
            )
        } else {
            (
                self.ray.get_position(next_pos),
                self.ray.get_position(next_pos + 1),
            )
        };

        let connects_forward = self.world_reader.output_direction_at(last_pos)
            == Some(self.belt_direction())
            && self.world_reader.input_direction_at(cur_pos) == Some(self.belt_direction());
        if connects_forward {
            return true;
        }
        let opposite_direction = self.belt_direction().opposite();
        self.world_reader.input_direction_at(last_pos) == Some(opposite_direction)
            && self.world_reader.output_direction_at(cur_pos) == Some(opposite_direction)
    }

    pub fn get_ug_pair_pos(&self, index: i32, ug: &UndergroundBelt) -> Option<i32> {
        let world_position = self.ray.get_position(index);
        self.world_reader
            .get_ug_pair_pos(world_position, ug)
            .map(|pair_pos| self.ray.ray_position(pair_pos))
    }
}
