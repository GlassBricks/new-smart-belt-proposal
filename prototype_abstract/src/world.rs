use std::{any::Any, collections::HashMap};

use euclid::vec2;

use crate::{Belt, BeltConnectable, BoundingBox, Direction, Entity, Position};

#[derive(Debug, Default, PartialEq, Clone)]
pub struct World {
    pub entities: HashMap<Position, Box<dyn Entity>>,
}

#[derive(Debug)]
pub struct BeltOutputOverride {
    pub position: Position,
    pub direction: Direction,
    pub has_output: bool,
}

impl World {
    pub fn new() -> Self {
        World {
            entities: HashMap::new(),
        }
    }

    pub fn get(&self, position: Position) -> Option<&dyn Entity> {
        self.entities.get(&position).map(|e| e.as_ref())
    }

    pub fn set(&mut self, position: Position, entity: Box<dyn Entity>) {
        self.entities.insert(position, entity);
    }

    pub fn remove(&mut self, position: Position) {
        self.entities.remove(&position);
    }

    pub fn bounds(&self) -> BoundingBox {
        let basic_bb = BoundingBox::from_points(self.entities.keys());
        BoundingBox::new(basic_bb.min, basic_bb.max + vec2(1, 1))
    }
    pub fn belt_input_direction(&self, position: Position, belt_direction: Direction) -> Direction {
        self.belt_input_direction_with_override(position, belt_direction, None)
    }

    pub fn belt_input_direction_with_override(
        &self,
        position: Position,
        belt_direction: Direction,
        override_direction: Option<&BeltOutputOverride>,
    ) -> Direction {
        let has_input_in = |direction: Direction| {
            let query_pos = position - direction.to_vector();

            if let Some(BeltOutputOverride {
                position: ov_position,
                direction: output_direction,
                has_output: override_has_output,
            }) = override_direction
                && *ov_position == query_pos
                && *output_direction == direction
            {
                return *override_has_output;
            }

            self.get(query_pos)
                .and_then(|e| e.as_belt_connectable_dyn())
                .and_then(|b| b.output_direction())
                .is_some_and(|f| f == direction)
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

    pub fn effective_input_direction(
        &self,
        position: Position,
        connectable: &dyn BeltConnectable,
        output_override: Option<&BeltOutputOverride>,
    ) -> Option<Direction> {
        if let Some(belt) = (connectable as &dyn Any).downcast_ref::<Belt>() {
            Some(self.belt_input_direction_with_override(position, belt.direction, output_override))
        } else {
            connectable.primary_input_direction()
        }
    }

    pub fn effective_output_direction(
        &self,
        connectable: &dyn BeltConnectable,
    ) -> Option<Direction> {
        connectable.output_direction()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::belts::{Belt, YELLOW_BELT};
    use crate::{Direction::*, pos};

    #[test]
    fn test_belt_input_direction_no_relative_belt() {
        let world = World::new();
        let position = pos(1, 1);
        let belt_direction = East;

        let input_direction = world.belt_input_direction(position, belt_direction);

        assert_eq!(
            input_direction, East,
            "Should return belt direction when no inputs"
        );
    }

    #[test]
    fn test_belt_input_direction_input_left() {
        let mut world = World::new();
        let position = pos(1, 1);
        let belt_direction = East;

        world.set(pos(1, 0), Belt::new(South, YELLOW_BELT));

        let input_direction = world.belt_input_direction(position, belt_direction);

        assert_eq!(
            input_direction, South,
            "Should return direction from left input"
        );
    }

    #[test]
    fn test_belt_input_direction_input_right() {
        let mut world = World::new();
        let position = pos(1, 1);
        let belt_direction = East;

        world.set(pos(1, 2), Belt::new(North, YELLOW_BELT));

        let input_direction = world.belt_input_direction(position, belt_direction);

        assert_eq!(
            input_direction, North,
            "Should return direction from right input"
        );
    }

    #[test]
    fn test_belt_input_direction_input_left_and_backwards() {
        let mut world = World::new();
        let position = pos(1, 1);
        let belt_direction = East;

        world.set(pos(1, 0), Belt::new(South, YELLOW_BELT)); // left input
        world.set(pos(0, 1), Belt::new(East, YELLOW_BELT)); // backwards input

        let input_direction = world.belt_input_direction(position, belt_direction);

        assert_eq!(
            input_direction, East,
            "Should prioritize backwards input over left"
        );
    }

    #[test]
    fn test_belt_input_direction_input_left_and_right() {
        let mut world = World::new();
        let position = pos(1, 1);
        let belt_direction = East;

        // Place belts to both left (north) and right (south)
        world.set(pos(1, 0), Belt::new(South, YELLOW_BELT)); // left input
        world.set(pos(1, 2), Belt::new(North, YELLOW_BELT)); // right input

        let input_direction = world.belt_input_direction(position, belt_direction);

        assert_eq!(
            input_direction, East,
            "Should return belt direction when both left and right inputs"
        );
    }

    #[test]
    fn test_belt_input_direction_different_orientations() {
        let mut world = World::new();

        // Test with North-facing belt
        let position = pos(1, 1);
        world.set(pos(2, 1), Belt::new(West, YELLOW_BELT)); // right of north-facing belt

        let input_direction = world.belt_input_direction(position, North);
        assert_eq!(
            input_direction, West,
            "Should work with north-facing belt and right input"
        );

        // Test with South-facing belt
        world.remove(pos(2, 1));
        world.set(pos(0, 1), Belt::new(East, YELLOW_BELT)); // right of south-facing belt

        let input_direction = world.belt_input_direction(position, South);
        assert_eq!(
            input_direction, East,
            "Should work with south-facing belt and right input"
        );

        // Test with West-facing belt
        world.remove(pos(0, 1));
        world.set(pos(1, 2), Belt::new(North, YELLOW_BELT)); // right of west-facing belt

        let input_direction = world.belt_input_direction(position, West);
        assert_eq!(
            input_direction, North,
            "Should work with west-facing belt and right input"
        );
    }

    #[test]
    fn test_belt_input_direction_non_matching_outputs() {
        let mut world = World::new();
        let position = pos(1, 1);
        let belt_direction = East;

        world.set(pos(1, 0), Belt::new(North, YELLOW_BELT)); // outputs north, not south

        let input_direction = world.belt_input_direction(position, belt_direction);

        assert_eq!(
            input_direction, East,
            "Should ignore belts that don't output toward position"
        );
    }

    #[test]
    fn test_belt_input_direction_with_override_true() {
        let mut world = World::new();
        let position = pos(1, 1);
        let belt_direction = East;

        // Place a belt that normally wouldn't output to our position
        world.set(pos(1, 0), Belt::new(North, YELLOW_BELT));

        // Override to make it appear as if it outputs south
        let override_direction = BeltOutputOverride {
            position: pos(1, 0),
            direction: South,
            has_output: true,
        };

        let input_direction = world.belt_input_direction_with_override(
            position,
            belt_direction,
            Some(&override_direction),
        );

        assert_eq!(
            input_direction, South,
            "Should use override to treat belt as outputting south"
        );
    }

    #[test]
    fn test_belt_input_direction_with_override_false() {
        let mut world = World::new();
        let position = pos(1, 1);
        let belt_direction = East;

        // Place a belt that normally would output to our position
        world.set(pos(1, 0), Belt::new(South, YELLOW_BELT));

        // Override to make it appear as if it doesn't output
        let override_direction = BeltOutputOverride {
            position: pos(1, 0),
            direction: South,
            has_output: false,
        };

        let input_direction = world.belt_input_direction_with_override(
            position,
            belt_direction,
            Some(&override_direction),
        );

        assert_eq!(
            input_direction, East,
            "Should use override to ignore belt that would normally provide input"
        );
    }
}
