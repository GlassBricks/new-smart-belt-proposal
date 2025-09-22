use crate::geometry::RelativeDirection;
use crate::{Belt, BeltConnectable, BeltOutputOverride, Direction, Entity, Ray, World};

/**
World view for LineDragLogic.

Handles geometric transformations, belt shapes, and abstracting over forwards/backwards logic.
*/
#[derive(Debug)]
pub(super) struct DragWorldView<'a> {
    world: &'a World,
    ray: Ray,
}

impl<'a> DragWorldView<'a> {
    pub fn new(world: &'a World, ray: Ray) -> Self {
        Self { world, ray }
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

    pub fn belt_is_output(&self, belt: &dyn BeltConnectable) -> bool {
        belt.output_direction() == Some(self.drag_direction())
    }

    pub fn belt_was_curved(
        &self,
        position: i32,
        belt: &Belt,
        lookup_override: Option<(i32, bool)>,
    ) -> bool {
        let position = self.ray.get_position(position);
        self.world.belt_input_direction_with_override(
            position,
            belt.direction,
            self.translate_override(lookup_override).as_ref(),
        ) != belt.direction
    }

    pub fn belt_is_curved(&self, position: i32, belt: &Belt) -> bool {
        self.belt_was_curved(position, belt, None)
    }

    pub fn belt_directly_connects_to_previous(
        &self,
        position: i32,
        output_override: Option<(i32, bool)>,
    ) -> bool {
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
        let output_override = self.translate_override(output_override);

        let connects_forward = self.world.effective_output_direction(last_entity)
            == Some(self.drag_direction())
            && self
                .world
                .effective_input_direction(cur_pos, cur_entity, output_override.as_ref())
                == Some(self.drag_direction());
        if connects_forward {
            return true;
        }
        self.world
            .effective_input_direction(last_pos, last_entity, output_override.as_ref())
            == Some(self.drag_direction().opposite())
            && self.world.effective_output_direction(cur_entity)
                == Some(self.drag_direction().opposite())
    }

    fn translate_override(&self, ov: Option<(i32, bool)>) -> Option<BeltOutputOverride> {
        ov.map(|(index, was_output)| BeltOutputOverride {
            position: self.ray.get_position(index),
            direction: self.drag_direction(),
            has_output: was_output,
        })
    }

    // pub fn belt_directly_connects_into_next(&self, _position: i32) -> bool {
    //     todo!()
    // }

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
