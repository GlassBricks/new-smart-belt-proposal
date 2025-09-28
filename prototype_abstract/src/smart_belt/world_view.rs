use crate::geometry::RelativeDirection;
use crate::{
    Belt, BeltConnectable, BeltConnectableEnum, Direction, Entity, Ray, TileHistory,
    TileHistoryView, UndergroundBelt, World, WorldReader,
};

/**
World view for LineDragLogic.

Handles geometric transformations, belt shapes, and abstracting over forwards/backwards logic.
*/
#[derive(Debug)]
pub(super) struct DragWorldView<'a> {
    world_reader: TileHistoryView<'a>,
    ray: Ray,
    pub(crate) is_forward: bool,
}

impl<'a> DragWorldView<'a> {
    pub fn new(
        world: &'a World,
        ray: Ray,
        tile_history: Option<&'a TileHistory>,
        is_forward: bool,
    ) -> Self {
        Self {
            world_reader: TileHistoryView::new(world, tile_history),
            ray,
            is_forward,
        }
    }

    pub fn belt_direction(&self) -> Direction {
        self.ray.direction
    }
    pub fn drag_direction(&self) -> Direction {
        if self.is_forward {
            self.ray.direction
        } else {
            self.ray.direction.opposite()
        }
    }

    pub fn direction_multiplier(&self) -> i32 {
        if self.is_forward { 1 } else { -1 }
    }

    // World interaction methods - stubbed for implementation
    pub fn get_entity(&self, position: i32) -> Option<&dyn Entity> {
        self.world_reader.get(self.ray.get_position(position))
    }

    pub fn get_belt(&self, position: i32) -> Option<BeltConnectableEnum<'_>> {
        self.world_reader.get_belt(self.ray.get_position(position))
    }
    pub fn et_belt_dyn(&self, position: i32) -> Option<&dyn BeltConnectable> {
        self.world_reader
            .get_belt_dyn(self.ray.get_position(position))
    }

    pub fn belt_was_curved(&self, position: i32, belt: &Belt) -> bool {
        let position = self.ray.get_position(position);
        self.world_reader.belt_was_curved(position, belt)
    }

    pub fn belt_input_direction(&self, position: i32, belt: &Belt) -> Direction {
        let position = self.ray.get_position(position);
        self.world_reader
            .belt_input_direction(position, belt.direction)
    }

    pub fn belt_directly_connects_to_next(&self, last_pos: i32) -> bool {
        let (last_pos, cur_pos) = if self.is_forward {
            (
                self.ray.get_position(last_pos),
                self.ray.get_position(last_pos + 1),
            )
        } else {
            (
                self.ray.get_position(last_pos - 1),
                self.ray.get_position(last_pos),
            )
        };

        let Some(last_entity) = self.world_reader.get_belt_dyn(last_pos) else {
            return false;
        };

        let Some(cur_entity) = self.world_reader.get_belt_dyn(cur_pos) else {
            return false;
        };

        let connects_forward = self.world_reader.effective_output_direction(last_entity)
            == Some(self.belt_direction())
            && self
                .world_reader
                .effective_input_direction(cur_pos, cur_entity)
                == Some(self.belt_direction());
        if connects_forward {
            return true;
        }
        let opposite_direction = self.belt_direction().opposite();
        self.world_reader
            .effective_input_direction(last_pos, last_entity)
            == Some(opposite_direction)
            && self.world_reader.effective_output_direction(cur_entity) == Some(opposite_direction)
    }

    pub(crate) fn get_ug_pair(
        &self,
        index: i32,
        ug: &UndergroundBelt,
    ) -> Option<(i32, &UndergroundBelt)> {
        let world_position = self.ray.get_position(index);
        self.world_reader
            .get_ug_pair(world_position, ug)
            .map(|(other_pos, other)| {
                let other_ray_pos = self.ray.ray_position(other_pos);
                (other_ray_pos, other)
            })
    }
}
