use crate::geometry::RelativeDirection;
use crate::{
    Belt, BeltTier, Direction, Entity, Ray, TileHistory, TileHistoryView, UndergroundBelt, World,
    WorldReader,
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

    pub fn relative_direction(&self, direction: Direction) -> RelativeDirection {
        self.drag_direction().direction_to(direction)
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

    // World interaction methods - stubbed for implementation
    pub fn get_entity_at_position(&self, position: i32) -> Option<&dyn Entity> {
        self.world_reader.get(self.ray.get_position(position))
    }

    pub fn belt_was_curved(&self, position: i32, belt: &Belt) -> bool {
        let position = self.ray.get_position(position);
        self.world_reader.belt_was_curved(position, belt)
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

        let Some(last_entity) = self
            .world_reader
            .get(last_pos)
            .and_then(|f| f.as_belt_connectable_dyn())
        else {
            return false;
        };

        let Some(cur_entity) = self
            .world_reader
            .get(cur_pos)
            .and_then(|f| f.as_belt_connectable_dyn())
        else {
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

    pub(crate) fn can_upgrade_underground(
        &self,
        _ug: &UndergroundBelt,
        ug_pos: i32,
        pair_pos: i32,
        tier: BeltTier,
    ) -> bool {
        let distance = pair_pos.abs_diff(ug_pos);
        // Can't upgrade if if upgrading would make the pair too short
        if distance > tier.underground_distance as u32 {
            return false;
        }
        // can't upgrade if there's an intercepting belt in the middle
        for in_btwn_pos in (ug_pos + 1)..pair_pos {
            let world_pos = self.ray.get_position(in_btwn_pos);
            if self
                .world_reader
                .get(world_pos)
                .and_then(|e| e.as_underground_belt())
                .is_some_and(|e| {
                    e.tier == tier && e.direction.axis() == self.belt_direction().axis()
                })
            {
                return false;
            }
        }

        true
    }
}
