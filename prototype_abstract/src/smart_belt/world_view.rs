use crate::{
    Belt, BeltConnectableEnum, Direction, Entity, Ray, UndergroundBelt,
    smart_belt::belt_curving::{TileHistory, TileHistoryView},
    world::ReadonlyWorld,
};

use super::DragDirection;

/**
World view for TileClassifier.

Handles geometric transformations, and belt shapes.
*/
pub(super) struct DragWorldView<'a> {
    history_view: TileHistoryView<'a>,
    ray: Ray,
    pub(crate) direction: DragDirection,
}

impl<'a> DragWorldView<'a> {
    pub fn new(
        world: &'a dyn ReadonlyWorld,
        ray: Ray,
        tile_history: Option<TileHistory>,
        direction: DragDirection,
    ) -> Self {
        Self {
            history_view: TileHistoryView::new(world, tile_history),
            ray,
            direction,
        }
    }

    /// Direction of the belt.
    pub fn belt_direction(&self) -> Direction {
        self.ray.direction
    }
    /// Direction of the next belt, maybe be opposite in case of backwards drags
    pub fn ray_direction(&self) -> Direction {
        if self.direction == DragDirection::Forward {
            self.ray.direction
        } else {
            self.ray.direction.opposite()
        }
    }

    pub fn get_entity(&self, position: i32) -> Option<&dyn Entity> {
        self.history_view
            .get_entity(self.ray.get_position(position))
    }

    pub fn get_belt_entity(&self, position: i32) -> Option<BeltConnectableEnum<'_>> {
        self.get_entity(position)
            .and_then(|entity| entity.as_belt_connectable())
    }

    pub fn belt_was_curved(&self, position: i32, belt: &Belt) -> bool {
        let position = self.ray.get_position(position);
        self.history_view.belt_is_curved_at(position, belt)
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

        let connects_forward = self.history_view.output_direction_at(last_pos)
            == Some(self.belt_direction())
            && self.history_view.input_direction_at(cur_pos) == Some(self.belt_direction());
        if connects_forward {
            return true;
        }
        let opposite_direction = self.belt_direction().opposite();
        self.history_view.input_direction_at(last_pos) == Some(opposite_direction)
            && self.history_view.output_direction_at(cur_pos) == Some(opposite_direction)
    }

    pub fn get_ug_pair_pos(&self, index: i32, ug: &UndergroundBelt) -> Option<i32> {
        let world_position = self.ray.get_position(index);
        self.history_view
            .get_ug_pair_pos(world_position, ug)
            .map(|pair_pos| self.ray.ray_position(pair_pos))
    }
}
