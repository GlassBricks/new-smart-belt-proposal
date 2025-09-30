use std::{any::Any, collections::HashMap, ops::DerefMut as _};

use dyn_clone::clone_box;
use euclid::vec2;

use crate::{
    Belt, BeltConnectable, BeltConnectableEnum, BeltTier, BoundingBox, Entity, LoaderLike,
    Splitter, TilePosition, Transform, UndergroundBelt, smart_belt::belt_curving::BeltCurveView,
};

#[derive(Debug, Default, PartialEq, Clone)]
pub struct World {
    pub entities: HashMap<TilePosition, Box<dyn Entity>>,
}

impl World {
    pub fn new() -> Self {
        World {
            entities: HashMap::new(),
        }
    }

    pub fn get(&self, position: TilePosition) -> Option<&dyn Entity> {
        self.entities.get(&position).map(|e| e.as_ref())
    }
    pub fn get_mut(&mut self, position: TilePosition) -> Option<&mut dyn Entity> {
        self.entities.get_mut(&position).map(|e| e.as_mut())
    }

    pub fn set(&mut self, position: TilePosition, mut entity: Box<dyn Entity>) {
        if let Some(ug) = (entity.deref_mut() as &mut dyn Any).downcast_mut::<UndergroundBelt>() {
            self.handle_underground_belt(position, ug);
        }
        self.entities.insert(position, entity);
    }
    fn handle_underground_belt(&mut self, position: TilePosition, ug: &mut UndergroundBelt) {
        let Some((pair_pos, pair_ug)) = self.get_ug_pair(position, ug) else {
            return;
        };
        if let Some((pair_pair_pos, pair_pair_ug)) = self.get_ug_pair(pair_pos, pair_ug)
            && pair_pair_pos != position
            && pair_pair_ug != ug
        {
            panic!(
                "Placing this belt at {:?} would break an existing belt pair between {:?} and {:?}",
                position, pair_pos, pair_pair_pos
            )
        }
        if pair_ug.is_input == ug.is_input {
            ug.flip_self();
        }
        {
            let (new_pair_pos, new_pair_ug) =
                self.get_ug_pair(position, ug).expect("Expected pair");
            assert!(
                pair_pos == new_pair_pos && pair_ug == new_pair_ug,
                "Underground belt pair should not have changed due to flip"
            );
        }
    }

    fn get_ug_pair_both_mut(
        &mut self,
        position: TilePosition,
    ) -> Option<(TilePosition, &mut UndergroundBelt, &mut UndergroundBelt)> {
        // First, find the pair position without mutable borrows
        let entity = self.entities.get(&position)?;
        let ug = entity.as_underground_belt()?;
        let (pair_pos, _) = self.get_ug_pair(position, ug)?;

        let [Some(entity), Some(pair_entity)] =
            self.entities.get_disjoint_mut([&position, &pair_pos])
        else {
            return None;
        };
        let ug = (entity.deref_mut() as &mut dyn Any).downcast_mut::<UndergroundBelt>()?;
        let pair_ug =
            (pair_entity.deref_mut() as &mut dyn Any).downcast_mut::<UndergroundBelt>()?;
        Some((pair_pos, ug, pair_ug))
    }

    pub fn flip_ug(&mut self, position: TilePosition) -> bool {
        if let Some((_, ug, pair_ug)) = self.get_ug_pair_both_mut(position) {
            ug.flip_self();
            pair_ug.flip_self();
            true
        } else {
            false
        }
    }

    pub fn upgrade_ug_checked(&mut self, position: TilePosition, new_tier: BeltTier) {
        let (pair_ug, other_pos) = {
            let Some((other_pos, ug, pair_ug)) = self.get_ug_pair_both_mut(position) else {
                return;
            };
            ug.tier = new_tier;
            pair_ug.tier = new_tier;
            (pair_ug.clone(), other_pos)
        };

        // check ug pair still matches
        let (new_pos, _) = self
            .get_ug_pair(other_pos, &pair_ug)
            .expect("upgrading removed ug pair");
        assert_eq!(new_pos, position, "Upgrading changed ug pair position");
    }

    pub fn remove(&mut self, position: TilePosition) {
        self.entities.remove(&position);
    }

    pub fn bounds(&self) -> BoundingBox {
        let basic_bb = BoundingBox::from_points(self.entities.keys());
        BoundingBox::new(basic_bb.min, basic_bb.max + vec2(1, 1))
    }

    pub fn get_belt_dyn(&self, position: TilePosition) -> Option<&dyn BeltConnectable> {
        self.get(position).and_then(|e| e.as_belt_connectable_dyn())
    }

    pub fn get_belt(&self, position: TilePosition) -> Option<BeltConnectableEnum<'_>> {
        self.get(position).and_then(|e| e.as_belt_connectable())
    }

    pub fn get_ug_pair(
        &self,
        position: TilePosition,
        underground: &UndergroundBelt,
    ) -> Option<(TilePosition, &UndergroundBelt)> {
        let query_direction = underground.shape_direction().opposite();
        for i in 1..=underground.tier.underground_distance {
            let query_pos = position + query_direction.to_vector() * i as i32;
            if let Some(entity) = self.get(query_pos)
                && let Some(other_ug) = entity.as_underground_belt()
                && other_ug.tier == underground.tier
            {
                if other_ug.shape_direction() == query_direction {
                    return Some((query_pos, other_ug));
                } else if other_ug.shape_direction() == underground.shape_direction() {
                    // Found another underground of same tier and same shape direction
                    // This would interfere with pairing, so return None
                    return None;
                }
            }
        }
        None
    }

    pub fn can_place_belt_on_tile(&self, position: TilePosition) -> bool {
        if let Some(entity) = self.get(position) {
            entity.as_colliding().is_none()
        } else {
            true
        }
    }
}

impl Transform {
    pub fn transform_entity(&self, entity: &dyn crate::Entity) -> Box<dyn crate::Entity> {
        if let Some(belt) = entity.as_belt() {
            Belt::new(self.transform_direction(belt.direction), belt.tier)
        } else if let Some(ug) = entity.as_underground_belt() {
            UndergroundBelt::new(self.transform_direction(ug.direction), ug.is_input, ug.tier)
        } else if let Some(splitter) = entity.as_splitter() {
            Splitter::new(self.transform_direction(splitter.direction), splitter.tier)
        } else if let Some(loader) = entity.as_loader_like() {
            LoaderLike::new(
                self.transform_direction(loader.direction),
                loader.is_input,
                loader.tier,
            )
        } else {
            clone_box(entity)
        }
    }
}

impl World {
    pub fn transform_world(&self, transform: &Transform) -> Self {
        let mut new_world = World::new();

        for (&pos, entity) in &self.entities {
            let new_pos = transform.transform_position(pos);
            let new_entity = transform.transform_entity(entity.as_ref());
            new_world.entities.insert(new_pos, new_entity);
        }

        new_world
    }

    pub fn flip_all_entities(&self) -> Self {
        let mut new_world = World::new();

        for (&pos, entity) in &self.entities {
            let entity: &dyn crate::Entity = entity.as_ref();
            let new_entity = if let Some(belt) = entity.as_belt() {
                let input_direction = self.belt_curved_input_direction(pos, belt.direction);
                Belt::new(input_direction.opposite(), belt.tier)
            } else if let Some(ug) = entity.as_underground_belt() {
                UndergroundBelt::new(ug.direction.opposite(), !ug.is_input, ug.tier)
            } else if let Some(splitter) = entity.as_splitter() {
                Splitter::new(splitter.direction.opposite(), splitter.tier)
            } else if let Some(loader) = entity.as_loader_like() {
                LoaderLike::new(loader.direction.opposite(), !loader.is_input, loader.tier)
            } else {
                clone_box(entity)
            };
            new_world.entities.insert(pos, new_entity);
        }

        new_world
    }

    pub fn check_flipped_entities(&self, other: &Self) -> anyhow::Result<()> {
        for (&pos, entity) in &self.entities {
            if entity.as_belt().is_none() {
                continue;
            };
            let (this_in, this_out) = (
                self.input_direction_at(pos).unwrap(),
                self.output_direction_at(pos).unwrap(),
            );
            let (new_in, new_out) = (
                other.input_direction_at(pos).unwrap(),
                other.output_direction_at(pos).unwrap(),
            );

            anyhow::ensure!(
                this_in == new_out.opposite() && this_out == new_in.opposite(),
                "Belt at {pos:?} did not flip successfully. Before:\n\t{this_in:?} -> {this_out:?}\n\t{new_in:?} -> {new_out:?}",
            );
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::belts::{BLUE_BELT, Belt, BeltTier, RED_BELT, UndergroundBelt, YELLOW_BELT};
    use crate::{
        Direction::{self, *},
        pos,
    };

    #[test]
    fn test_belt_input_direction_no_relative_belt() {
        World::new().assert_belt_input_direction(pos(1, 1), East, East);
    }

    #[test]
    fn test_belt_input_direction_input_left() {
        World::new()
            .belt_at(pos(1, 0), South, YELLOW_BELT)
            .assert_belt_input_direction(pos(1, 1), East, South);
    }

    #[test]
    fn test_belt_input_direction_input_right() {
        World::new()
            .belt_at(pos(1, 2), North, YELLOW_BELT)
            .assert_belt_input_direction(pos(1, 1), East, North);
    }

    #[test]
    fn test_belt_input_direction_input_left_and_backwards() {
        World::new()
            .belt_at(pos(1, 0), South, YELLOW_BELT) // left input
            .belt_at(pos(0, 1), East, YELLOW_BELT) // backwards input
            .assert_belt_input_direction(pos(1, 1), East, East);
    }

    #[test]
    fn test_belt_input_direction_input_left_and_right() {
        World::new()
            .belt_at(pos(1, 0), South, YELLOW_BELT) // left input
            .belt_at(pos(1, 2), North, YELLOW_BELT) // right input
            .assert_belt_input_direction(pos(1, 1), East, East);
    }

    #[test]
    fn test_belt_input_direction_different_orientations() {
        // Test with North-facing belt
        World::new()
            .belt_at(pos(2, 1), West, YELLOW_BELT) // right of north-facing belt
            .assert_belt_input_direction(pos(1, 1), North, West);

        // Test with South-facing belt
        World::new()
            .belt_at(pos(0, 1), East, YELLOW_BELT) // right of south-facing belt
            .assert_belt_input_direction(pos(1, 1), South, East);

        // Test with West-facing belt
        World::new()
            .belt_at(pos(1, 2), North, YELLOW_BELT) // right of west-facing belt
            .assert_belt_input_direction(pos(1, 1), West, North);
    }

    #[test]
    fn test_belt_input_direction_non_matching_outputs() {
        World::new()
            .belt_at(pos(1, 0), North, YELLOW_BELT) // outputs north, not south
            .assert_belt_input_direction(pos(1, 1), East, East);
    }

    impl World {
        fn belt_at(mut self, pos: TilePosition, direction: Direction, tier: BeltTier) -> Self {
            self.set(pos, Belt::new(direction, tier));
            self
        }

        fn input_underground_at(
            mut self,
            pos: TilePosition,
            direction: Direction,
            tier: BeltTier,
        ) -> Self {
            self.set(pos, UndergroundBelt::new(direction, true, tier));
            self
        }

        fn output_underground_at(
            mut self,
            pos: TilePosition,
            direction: Direction,
            tier: BeltTier,
        ) -> Self {
            self.set(pos, UndergroundBelt::new(direction, false, tier));
            self
        }

        // Assertion methods for different scenarios
        fn assert_belt_input_direction(
            self,
            pos: TilePosition,
            belt_direction: Direction,
            expected: Direction,
        ) -> Self {
            let actual = self.belt_curved_input_direction(pos, belt_direction);
            assert_eq!(
                actual, expected,
                "Expected belt input direction {:?}, got {:?} at position {:?}",
                expected, actual, pos
            );
            self
        }

        fn assert_entity_at<F>(self, pos: TilePosition, check: F) -> Self
        where
            F: FnOnce(Option<&dyn Entity>),
        {
            let entity = self.get(pos);
            check(entity);
            self
        }

        fn assert_no_entity_at(self, pos: TilePosition) -> Self {
            let entity = self.get(pos);
            assert!(
                entity.is_none(),
                "Expected no entity at {:?} but found one",
                pos
            );
            self
        }

        fn with_world<F>(mut self, func: F) -> Self
        where
            F: FnOnce(&mut World),
        {
            func(&mut self);
            self
        }
    }

    impl World {
        /// Assert that an underground belt at search_pos finds its pair at expected_pair_pos
        fn expect_underground_pair_from_pos(
            self,
            search_pos: TilePosition,
            expected_pair_pos: TilePosition,
            first_is_input: bool,
        ) -> Self {
            let entity = self.get(search_pos).expect("No entity at search position");
            let underground = (entity as &dyn std::any::Any)
                .downcast_ref::<UndergroundBelt>()
                .expect("Entity is not an underground belt");

            assert_eq!(
                underground.is_input, first_is_input,
                "First underground belt's is_input ({}) does not match expected ({})",
                underground.is_input, first_is_input
            );

            let result = self.get_ug_pair(search_pos, underground);
            assert!(
                result.is_some(),
                "Expected to find underground pair at {:?} from {:?}",
                expected_pair_pos,
                search_pos
            );
            let (found_pos, found_ug) = result.unwrap();
            assert_eq!(
                found_pos, expected_pair_pos,
                "Found underground pair at wrong position"
            );

            // assert this and pair's is_input don't match
            assert!(
                underground.is_input != found_ug.is_input,
                "Found underground pair's pair has same is_input as self"
            );

            // assert pair's pair is also self
            let (pair_pair_pos, pair_pair_ug) = self
                .get_ug_pair(found_pos, found_ug)
                .expect("Did not find underground pair's pair");
            assert_eq!(
                pair_pair_pos, search_pos,
                "Found underground pair's pair at wrong position"
            );
            assert_eq!(
                pair_pair_ug, underground,
                "Found underground pair's pair is not self"
            );

            self
        }

        /// Assert that an underground belt at search_pos has no valid pair
        fn expect_no_underground_pair_from_pos(self, search_pos: TilePosition) -> Self {
            let entity = self.get(search_pos).expect("No entity at search position");
            let underground = (entity as &dyn std::any::Any)
                .downcast_ref::<UndergroundBelt>()
                .expect("Entity is not an underground belt");

            let result = self.get_ug_pair(search_pos, underground);
            assert!(
                result.is_none(),
                "Expected no underground pair from {:?} but found one",
                search_pos
            );
            self
        }
    }

    /// Helper function for parameterized testing of multiple scenarios
    ///
    /// Allows testing multiple similar cases in a single test function with
    /// table-driven test data. Each test case is described by a tuple of parameters
    /// that gets executed in sequence with descriptive error messages.
    fn underground_pair_test(
        test_cases: &[(
            TilePosition,
            Direction,
            TilePosition,
            Direction,
            BeltTier,
            bool,
        )],
    ) {
        for (input_pos, input_dir, output_pos, output_dir, tier, should_find) in test_cases {
            let builder = World::new()
                .input_underground_at(*input_pos, *input_dir, *tier)
                .output_underground_at(*output_pos, *output_dir, *tier);

            if *should_find {
                builder.expect_underground_pair_from_pos(*input_pos, *output_pos, true);
            } else {
                builder.expect_no_underground_pair_from_pos(*input_pos);
            }
        }
    }

    #[test]
    fn test_parameterized_directions() {
        underground_pair_test(&[
            (pos(1, 1), East, pos(3, 1), East, YELLOW_BELT, true),
            (pos(3, 1), West, pos(1, 1), West, YELLOW_BELT, true),
            (pos(1, 3), North, pos(1, 1), North, YELLOW_BELT, true),
            (pos(1, 1), South, pos(1, 3), South, YELLOW_BELT, true),
            (pos(1, 1), East, pos(3, 1), West, YELLOW_BELT, false),
        ]);
    }
    #[test]
    fn test_get_paired_underground_basic_pair() {
        World::new()
            .input_underground_at(pos(1, 1), East, YELLOW_BELT)
            .output_underground_at(pos(3, 1), East, YELLOW_BELT)
            .expect_underground_pair_from_pos(pos(1, 1), pos(3, 1), true);
    }

    #[test]
    fn test_get_paired_underground_no_pair() {
        World::new()
            .input_underground_at(pos(1, 1), East, YELLOW_BELT)
            .expect_no_underground_pair_from_pos(pos(1, 1));
    }

    #[test]
    fn test_get_paired_underground_wrong_tier() {
        World::new()
            .input_underground_at(pos(1, 1), East, YELLOW_BELT)
            .output_underground_at(pos(3, 1), East, RED_BELT)
            .expect_no_underground_pair_from_pos(pos(1, 1));
    }

    #[test]
    fn test_get_paired_underground_wrong_direction() {
        World::new()
            .input_underground_at(pos(1, 1), East, YELLOW_BELT)
            .output_underground_at(pos(3, 1), West, YELLOW_BELT)
            .expect_no_underground_pair_from_pos(pos(1, 1));
    }

    #[test]
    fn test_get_paired_underground_max_distance() {
        let max_distance = YELLOW_BELT.underground_distance as i32;
        World::new()
            .input_underground_at(pos(1, 1), East, YELLOW_BELT)
            .output_underground_at(pos(1 + max_distance, 1), East, YELLOW_BELT)
            .expect_underground_pair_from_pos(pos(1, 1), pos(1 + max_distance, 1), true);
    }

    #[test]
    fn test_get_paired_underground_exceeds_max_distance() {
        let max_distance = YELLOW_BELT.underground_distance as i32;
        World::new()
            .input_underground_at(pos(1, 1), East, YELLOW_BELT)
            .output_underground_at(pos(1 + max_distance + 1, 1), East, YELLOW_BELT)
            .expect_no_underground_pair_from_pos(pos(1, 1));
    }

    #[test]
    fn test_placing_paired_underground_may_flip() {
        World::new()
            .input_underground_at(pos(1, 1), East, YELLOW_BELT)
            .input_underground_at(pos(3, 1), West, YELLOW_BELT)
            .expect_underground_pair_from_pos(pos(1, 1), pos(3, 1), true);
    }

    #[test]
    fn test_get_paired_underground_blocked_by_same_direction() {
        World::new()
            .input_underground_at(pos(1, 1), East, YELLOW_BELT)
            .input_underground_at(pos(3, 1), East, YELLOW_BELT)
            .output_underground_at(pos(5, 1), East, YELLOW_BELT)
            .expect_no_underground_pair_from_pos(pos(1, 1));
    }

    #[test]
    fn test_get_paired_underground_blocked_by_same_direction_with_valid_pair_after() {
        World::new()
            .input_underground_at(pos(1, 1), East, YELLOW_BELT)
            .input_underground_at(pos(2, 1), East, YELLOW_BELT)
            .output_underground_at(pos(4, 1), East, YELLOW_BELT)
            .expect_no_underground_pair_from_pos(pos(1, 1));
    }

    #[test]
    fn test_get_paired_underground_blocked_by_same_direction_different_tier() {
        World::new()
            .input_underground_at(pos(1, 1), East, YELLOW_BELT)
            .input_underground_at(pos(3, 1), East, RED_BELT)
            .output_underground_at(pos(5, 1), East, YELLOW_BELT)
            .expect_underground_pair_from_pos(pos(1, 1), pos(5, 1), true);
    }

    #[test]
    fn test_get_paired_underground_different_directions() {
        World::new()
            .input_underground_at(pos(1, 1), South, YELLOW_BELT)
            .output_underground_at(pos(1, 3), South, YELLOW_BELT)
            .expect_underground_pair_from_pos(pos(1, 1), pos(1, 3), true);
    }

    #[test]
    fn test_get_paired_underground_output_to_input() {
        World::new()
            .output_underground_at(pos(3, 1), East, YELLOW_BELT)
            .input_underground_at(pos(1, 1), East, YELLOW_BELT)
            .with_world(|world| {
                let entity = world.get(pos(3, 1)).unwrap();
                let output_ug = (entity as &dyn std::any::Any)
                    .downcast_ref::<UndergroundBelt>()
                    .unwrap();
                let result = world.get_ug_pair(pos(3, 1), output_ug);
                assert!(result.is_some());
                let (found_pos, found_ug) = result.unwrap();
                assert_eq!(found_pos, pos(1, 1));
                assert!(found_ug.is_input);
            });
    }

    #[test]
    fn test_get_paired_underground_finds_closest() {
        World::new()
            .input_underground_at(pos(1, 1), East, YELLOW_BELT)
            .output_underground_at(pos(3, 1), East, YELLOW_BELT)
            .output_underground_at(pos(5, 1), East, YELLOW_BELT)
            .expect_underground_pair_from_pos(pos(1, 1), pos(3, 1), true);
    }

    #[test]
    fn test_get_paired_underground_different_belt_tiers() {
        let red_distance = RED_BELT.underground_distance as i32;
        World::new()
            .input_underground_at(pos(1, 1), East, RED_BELT)
            .output_underground_at(pos(1 + red_distance, 1), East, RED_BELT)
            .expect_underground_pair_from_pos(pos(1, 1), pos(1 + red_distance, 1), true);

        let blue_distance = BLUE_BELT.underground_distance as i32;
        World::new()
            .input_underground_at(pos(10, 1), East, BLUE_BELT)
            .output_underground_at(pos(10 + blue_distance, 1), East, BLUE_BELT)
            .expect_underground_pair_from_pos(pos(10, 1), pos(10 + blue_distance, 1), true);
    }

    #[test]
    fn test_get_paired_underground_blocked_by_entity() {
        World::new()
            .input_underground_at(pos(1, 1), East, YELLOW_BELT)
            .belt_at(pos(2, 1), East, YELLOW_BELT)
            .output_underground_at(pos(4, 1), East, YELLOW_BELT)
            .expect_underground_pair_from_pos(pos(1, 1), pos(4, 1), true);
    }

    #[test]
    fn test_get_paired_underground_various_orientations() {
        // West-facing pair
        World::new()
            .input_underground_at(pos(3, 1), West, YELLOW_BELT)
            .output_underground_at(pos(1, 1), West, YELLOW_BELT)
            .expect_underground_pair_from_pos(pos(3, 1), pos(1, 1), true);

        // North-facing pair
        World::new()
            .input_underground_at(pos(1, 3), North, YELLOW_BELT)
            .output_underground_at(pos(1, 1), North, YELLOW_BELT)
            .expect_underground_pair_from_pos(pos(1, 3), pos(1, 1), true);
    }

    #[test]
    fn test_get_paired_underground_minimum_distance() {
        World::new()
            .input_underground_at(pos(1, 1), East, YELLOW_BELT)
            .output_underground_at(pos(2, 1), East, YELLOW_BELT)
            .expect_underground_pair_from_pos(pos(1, 1), pos(2, 1), true);
    }

    #[test]
    fn test_get_paired_underground_no_entity_at_position() {
        World::new()
            .input_underground_at(pos(1, 1), East, YELLOW_BELT)
            .belt_at(pos(2, 1), East, YELLOW_BELT)
            .expect_no_underground_pair_from_pos(pos(1, 1));
    }

    #[test]
    fn test_complex_belt_network() {
        World::new()
            .belt_at(pos(0, 0), East, YELLOW_BELT)
            .belt_at(pos(1, 0), East, YELLOW_BELT)
            .input_underground_at(pos(2, 0), East, YELLOW_BELT)
            .output_underground_at(pos(5, 0), East, YELLOW_BELT)
            .belt_at(pos(6, 0), East, YELLOW_BELT)
            .assert_entity_at(pos(2, 0), |entity| {
                assert!(entity.is_some());
                let ug = (entity.unwrap() as &dyn std::any::Any)
                    .downcast_ref::<UndergroundBelt>()
                    .unwrap();
                assert!(ug.is_input);
            })
            .assert_entity_at(pos(5, 0), |entity| {
                assert!(entity.is_some());
                let ug = (entity.unwrap() as &dyn std::any::Any)
                    .downcast_ref::<UndergroundBelt>()
                    .unwrap();
                assert!(!ug.is_input);
            })
            .assert_no_entity_at(pos(3, 0))
            .assert_no_entity_at(pos(4, 0));
    }

    #[test]
    fn test_flip_ug() {
        World::new()
            .input_underground_at(pos(1, 1), East, YELLOW_BELT)
            .output_underground_at(pos(3, 1), East, YELLOW_BELT)
            .expect_underground_pair_from_pos(pos(1, 1), pos(3, 1), true)
            .with_world(|world| {
                world.flip_ug(pos(1, 1));
            })
            .expect_underground_pair_from_pos(pos(1, 1), pos(3, 1), false)
            .with_world(|world| {
                world.flip_ug(pos(1, 1));
            })
            .expect_underground_pair_from_pos(pos(1, 1), pos(3, 1), true);
    }
}
