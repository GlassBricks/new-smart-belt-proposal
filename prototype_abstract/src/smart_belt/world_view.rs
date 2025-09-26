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
}

impl<'a> DragWorldView<'a> {
    pub fn new(world: &'a World, ray: Ray, tile_history: Option<&'a TileHistory>) -> Self {
        Self {
            world_reader: TileHistoryView::new(world, tile_history),
            ray,
        }
    }

    pub fn relative_direction(&self, direction: Direction) -> RelativeDirection {
        self.drag_direction().direction_to(direction)
    }

    pub fn drag_direction(&self) -> Direction {
        self.ray.direction
    }

    // World interaction methods - stubbed for implementation
    pub fn get_entity_at_position(&self, position: i32) -> Option<&dyn Entity> {
        self.world_reader.get(self.ray.get_position(position))
    }

    pub fn belt_was_curved(&self, position: i32, belt: &Belt) -> bool {
        let position = self.ray.get_position(position);
        self.world_reader.effective_input_direction(position, belt) != Some(belt.direction)
    }

    pub fn belt_is_curved(&self, position: i32, belt: &Belt) -> bool {
        let position = self.ray.get_position(position);
        self.world_reader.effective_input_direction(position, belt) != Some(belt.direction)
    }

    pub fn belt_was_directly_connected_to_previous(&self, position: i32) -> bool {
        let (last_pos, cur_pos) = (
            self.ray.get_position(position - 1),
            self.ray.get_position(position),
        );

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
            == Some(self.drag_direction())
            && self
                .world_reader
                .effective_input_direction(cur_pos, cur_entity)
                == Some(self.drag_direction());
        if connects_forward {
            return true;
        }
        let opposite_direction = self.drag_direction().opposite();
        self.world_reader
            .effective_input_direction(last_pos, last_entity)
            == Some(opposite_direction)
            && self.world_reader.effective_output_direction(cur_entity) == Some(opposite_direction)
    }

    pub fn can_place_belt_on_tile(&self, index: i32) -> bool {
        let position = self.ray.get_position(index);
        self.world_reader.can_place_belt_on_tile(position)
    }

    pub fn is_undergroundable_tile(&self, _index: i32) -> bool {
        // todo
        true
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
        // can't upgrade if there's an intercepting belt in the middl
        for in_btwn_pos in (ug_pos + 1)..pair_pos {
            let world_pos = self.ray.get_position(in_btwn_pos);
            if self
                .world_reader
                .get(world_pos)
                .and_then(|e| e.as_underground_belt())
                .is_some_and(|e| {
                    e.tier == tier && e.direction.axis() == self.drag_direction().axis()
                })
            {
                return false;
            }
        }

        true
    }
}
