use crate::{Belt, BeltTier, Direction, Entity, Ray, UndergroundBelt, World};

/**
 * World view for LineDragLogic.
 *
 * Handles geometric transformations, belt shapes, and abstracting over forwards/backwards logic.
 */
#[derive(Debug)]
pub struct DragWorldView<'a> {
    world: &'a World,
    ray: Ray,
}

impl<'a> DragWorldView<'a> {
    pub fn new(world: &'a World, ray: Ray) -> Self {
        Self { world, ray }
    }
}

impl<'a> DragWorldView<'a> {
    pub fn relative_direction(&self, direction: Direction) -> Direction {
        self.drag_direction().direction_to(direction)
    }

    pub fn drag_direction(&self) -> Direction {
        self.ray.direction
    }

    pub fn belt_direction(&self) -> Direction {
        // TODO: backwards dragging
        self.ray.direction
    }

    // World interaction methods - stubbed for implementation
    pub fn get_entity_at_position(&self, index: i32) -> Option<&Entity> {
        self.world.get(self.ray.get_position(index))
    }

    pub fn belt_was_curved(&self, _belt: &Belt /* todo: more param */) -> bool {
        todo!()
    }

    pub fn belt_is_curved(&self, _belt: &Belt) -> bool {
        todo!()
    }

    pub fn belt_directly_connects_into_next(&self, _position: i32) -> bool {
        todo!()
    }

    pub fn can_place_belt_on_tile(&self, _index: i32) -> bool {
        // todo
        true
    }

    pub fn is_undergroundable_tile(&self, _index: i32) -> bool {
        // todo
        true
    }

    pub fn can_upgrade_underground(&self, _ug: &UndergroundBelt, _new_tier: &BeltTier) -> bool {
        todo!()
    }

    pub fn get_ug_pair(&self, _ug: &UndergroundBelt) -> Option<UndergroundBelt> {
        todo!()
    }

    pub fn is_ug_paired(&self, ug: &UndergroundBelt) -> bool {
        self.get_ug_pair(ug).is_some()
    }
}
