use crate::geometry::RelativeDirection;
use crate::{Belt, Direction, Entity, Ray, TileHistory, World};

/**
World view for LineDragLogic.

Handles geometric transformations, belt shapes, and abstracting over forwards/backwards logic.
*/
#[derive(Debug)]
pub(super) struct DragWorldView<'a> {
    world: &'a World,
    ray: Ray,
    tile_history: Option<&'a TileHistory>,
}

impl<'a> DragWorldView<'a> {
    pub fn new(world: &'a World, ray: Ray, tile_history: Option<&'a TileHistory>) -> Self {
        Self {
            world,
            ray,
            tile_history,
        }
    }

    pub fn relative_direction(&self, direction: Direction) -> RelativeDirection {
        self.drag_direction().direction_to(direction)
    }

    pub fn drag_direction(&self) -> Direction {
        self.ray.direction
    }

    // World interaction methods - stubbed for implementation
    pub fn get_entity_at_position(&self, position: i32) -> Option<&'a dyn Entity> {
        self.world.get(self.ray.get_position(position))
    }

    pub fn belt_was_curved(&self, position: i32, belt: &Belt) -> bool {
        let position = self.ray.get_position(position);
        self.world
            .belt_input_direction_with_override(position, belt.direction, self.tile_history)
            != belt.direction
    }

    pub fn belt_is_curved(&self, position: i32, belt: &Belt) -> bool {
        let position = self.ray.get_position(position);
        self.world
            .belt_input_direction_with_override(position, belt.direction, None)
            != belt.direction
    }

    pub fn belt_was_directly_connected_to_previous(&self, position: i32) -> bool {
        let (last_pos, cur_pos) = (
            self.ray.get_position(position - 1),
            self.ray.get_position(position),
        );

        let Some(last_entity) = self
            .world
            .get(last_pos)
            .and_then(|f| f.as_belt_connectable_dyn())
        else {
            return false;
        };

        let Some(cur_entity) = self
            .world
            .get(cur_pos)
            .and_then(|f| f.as_belt_connectable_dyn())
        else {
            return false;
        };
        let connects_forward = self.world.effective_output_direction(last_entity)
            == Some(self.drag_direction())
            && self
                .world
                .effective_input_direction(cur_pos, cur_entity, self.tile_history)
                == Some(self.drag_direction());
        if connects_forward {
            return true;
        }
        self.world
            .effective_input_direction(last_pos, last_entity, self.tile_history)
            == Some(self.drag_direction().opposite())
            && self.world.effective_output_direction(cur_entity)
                == Some(self.drag_direction().opposite())
    }

    pub fn can_place_belt_on_tile(&self, _index: i32) -> bool {
        // todo
        true
    }

    pub fn is_undergroundable_tile(&self, _index: i32) -> bool {
        // todo
        true
    }

    // pub fn can_upgrade_underground(&self, _ug: &UndergroundBelt, _new_tier: &BeltTier) -> bool {
    //     todo!()
    // }

    // pub fn get_ug_pair(&self, _ug: &UndergroundBelt) -> Option<UndergroundBelt> {
    //     todo!()
    // }

    // pub fn is_ug_paired(&self, ug: &UndergroundBelt) -> bool {
    //     self.get_ug_pair(ug).is_some()
    // }
}
