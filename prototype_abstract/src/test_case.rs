use std::cmp::max;
use std::collections::HashSet;

use crate::belts::{BELT_TIERS, Belt, BeltTier, LoaderLike, Splitter, UndergroundBelt};
use crate::geometry::Ray;
use crate::world::{ReadonlyWorld, World};
use crate::{
    BeltCollidable, BeltConnectable, BeltConnectableTrait, Direction,
    TilePosition, Transform, WorldImpl, pos,
    smart_belt::{LineDrag, action, action::Error},
};
use crate::BoundingBox;
use anyhow::{Context, Result, bail};
use itertools::Itertools;
use serde::{Deserialize, Deserializer};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TestVariant {
    Normal,
    Wiggle,
    MegaWiggle,
    ForwardBack,
}

#[derive(Debug, Clone)]
pub struct DragTestCase {
    pub name: String,
    pub entities: TestCaseEntities,
    pub after_for_reverse: Option<WorldImpl>,
    pub not_reversible: bool,
    pub forward_back: bool,
}

#[derive(Debug, Clone)]
pub struct TestCaseEntities {
    pub before: WorldImpl,
    pub after: WorldImpl,
    pub leftmost_pos: TilePosition,
    pub start_pos: TilePosition,
    pub belt_direction: Direction,
    pub end_pos: TilePosition,
    pub tier: BeltTier,
    pub expected_errors: HashSet<(TilePosition, action::Error)>,
}

impl TestCaseEntities {
    fn bounds(&self) -> BoundingBox {
        self.before.bounds().union(&self.after.bounds())
    }
}

fn check_test_case(
    test: &TestCaseEntities,
    reverse: bool,
    test_variant: TestVariant,
) -> anyhow::Result<()> {
    let test = if reverse {
        flip_test_case(test, None)?
    } else {
        test.clone()
    };

    let (result, actual_errors) = run_test_case(&test, test_variant);

    let expected_world = &test.after;
    let expected_errors = &test.expected_errors;

    let non_empty_subset_only =
        matches!(test_variant, TestVariant::Wiggle | TestVariant::MegaWiggle);

    let errors_match = if non_empty_subset_only {
        if expected_errors.is_empty() {
            actual_errors.is_empty()
        } else {
            expected_errors.is_subset(&actual_errors)
        }
    } else {
        actual_errors == *expected_errors
    };

    if result != *expected_world || !errors_match {
        let bounds = test.bounds();
        let mut error_message = format!(
            r#"
Before:

{}

Expected:

{}

Got:

{}

"#,
            print_world(&test.before, bounds, &[]),
            print_world(
                expected_world,
                bounds,
                &expected_errors
                    .iter()
                    .map(|f| f.0)
                    .collect::<Vec<TilePosition>>()
            ),
            print_world(
                &result,
                bounds,
                &actual_errors
                    .iter()
                    .map(|f| f.0)
                    .collect::<Vec<TilePosition>>()
            )
        );
        if actual_errors != *expected_errors {
            error_message.push_str(&format!(
                r#"
Expected errors:
{:?}
Got errors:
{:?}
"#,
                expected_errors, actual_errors
            ));
        }

        bail!(error_message);
    }

    Ok(())
}

pub fn check_test_case_all_transforms(
    test: &DragTestCase,
    reverse: bool,
    test_variant: TestVariant,
) -> Result<()> {
    for (i, transform) in Transform::all_unique_transforms().iter().enumerate() {
        let transformed_test = transform_test_case(&test.entities, transform);

        let test_to_check = if reverse {
            let transformed_for_reverse = test
                .after_for_reverse
                .as_ref()
                .map(|s| s.transform_world(transform));
            flip_test_case(&transformed_test, transformed_for_reverse.as_ref())?
        } else {
            transformed_test
        };

        let test_name = match (reverse, test_variant) {
            (true, TestVariant::Wiggle) => format!("[transform {}] [flip] [wiggle]", i),
            (true, TestVariant::MegaWiggle) => {
                format!("[transform {}] [flip] [mega_wiggle]", i)
            }
            (true, TestVariant::ForwardBack) => format!("[transform {}] [flip] [forward_back]", i),
            (true, TestVariant::Normal) => format!("[transform {}] [flip]", i),
            (false, TestVariant::Wiggle) => format!("[transform {}] [wiggle]", i),
            (false, TestVariant::MegaWiggle) => format!("[transform {}] [mega_wiggle]", i),
            (false, TestVariant::ForwardBack) => format!("[transform {}] [forward_back]", i),
            (false, TestVariant::Normal) => format!("[transform {}]", i),
        };
        check_test_case(&test_to_check, false, test_variant).with_context(|| test_name)?;
    }

    Ok(())
}

fn transform_test_case(test: &TestCaseEntities, transform: &Transform) -> TestCaseEntities {
    TestCaseEntities {
        before: test.before.transform_world(transform),
        after: test.after.transform_world(transform),
        leftmost_pos: transform.transform_position(test.leftmost_pos),
        start_pos: transform.transform_position(test.start_pos),
        end_pos: transform.transform_position(test.end_pos),
        belt_direction: transform.transform_direction(test.belt_direction),
        tier: test.tier,
        expected_errors: test
            .expected_errors
            .iter()
            .map(|(pos, error)| (transform.transform_position(*pos), error.clone()))
            .collect(),
    }
}

fn flip_test_case_unchecked(
    test: &TestCaseEntities,
    after_for_reverse: Option<&WorldImpl>,
) -> TestCaseEntities {
    TestCaseEntities {
        before: test.before.flip_all_entities(),
        after: (after_for_reverse.unwrap_or(&test.after)).flip_all_entities(),
        belt_direction: test.belt_direction.opposite(),
        expected_errors: test.expected_errors.clone(),
        ..*test
    }
}

fn flip_test_case(
    test: &TestCaseEntities,
    after_for_reverse: Option<&WorldImpl>,
) -> Result<TestCaseEntities> {
    let flipped = flip_test_case_unchecked(test, after_for_reverse);
    let bounds = test.bounds();
    test.before
        .check_flipped_entities(&flipped.before)
        .with_context(|| {
            format!(
                "Failed to flip.\nBefore entities:\n{}\nAfter entities:\n{}",
                print_world(&test.before, bounds, &[]),
                print_world(&flipped.before, bounds, &[])
            )
        })?;
    Ok(flipped)
}
fn run_test_case(
    test: &TestCaseEntities,
    test_variant: TestVariant,
) -> (WorldImpl, HashSet<(TilePosition, Error)>) {
    eprintln!("Starting test case\n");

    let TestCaseEntities {
        leftmost_pos,
        start_pos,
        belt_direction,
        end_pos,
        tier,
        ..
    } = *test;

    let ray = Ray::new(start_pos, belt_direction);
    let end_pos_ray = ray.ray_position(end_pos);
    assert_eq!(
        ray.snap(end_pos),
        end_pos,
        "end_pos must be on the same line as start_pos in drag_direction"
    );

    let mut result = test.before.clone();
    let mut errors = Vec::new();
    {
        let mut error_handler = |pos, err| {
            errors.push((pos, err));
        };
        let mut drag = LineDrag::start_drag(
            &mut result,
            &mut error_handler,
            tier,
            start_pos,
            belt_direction,
        );

        match test_variant {
            TestVariant::Normal => {
                drag.interpolate_to(&mut error_handler, end_pos);
            }
            TestVariant::ForwardBack => {
                run_forward_back(&mut drag, &mut error_handler, leftmost_pos, end_pos);
            }
            TestVariant::Wiggle => {
                run_wiggle(
                    &mut drag,
                    &mut error_handler,
                    start_pos,
                    end_pos,
                    belt_direction,
                    &ray,
                    end_pos_ray,
                );
            }
            TestVariant::MegaWiggle => {
                run_mega_wiggle(
                    &mut drag,
                    &mut error_handler,
                    start_pos,
                    end_pos,
                    belt_direction,
                    end_pos_ray,
                );
            }
        }
    }

    eprintln!();
    (result, errors.into_iter().collect())
}

fn run_wiggle(
    drag: &mut LineDrag<'_>,
    error_handler: &mut dyn FnMut(TilePosition, Error),
    start_pos: TilePosition,
    end_pos: TilePosition,
    drag_direction: Direction,
    ray: &Ray,
    end_pos_ray: i32,
) {
    let dir_vec = drag_direction.to_vector();
    let mut current_pos = start_pos;

    while ray.ray_position(current_pos) + 2 < end_pos_ray {
        let forward_2 = current_pos + dir_vec * 2;
        drag.interpolate_to(error_handler, forward_2);
        let back_1 = current_pos + dir_vec;
        drag.interpolate_to(error_handler, back_1);
        current_pos = back_1
    }
    if ray.ray_position(current_pos) != end_pos_ray {
        drag.interpolate_to(error_handler, end_pos);
    }
}

fn run_mega_wiggle(
    drag: &mut LineDrag<'_>,
    error_handler: &mut dyn FnMut(TilePosition, Error),
    start_pos: TilePosition,
    end_pos: TilePosition,
    drag_direction: Direction,
    end_pos_ray: i32,
) {
    let dir_vec = drag_direction.to_vector();

    let mut n = 1;
    while n < end_pos_ray {
        let forward_n = start_pos + dir_vec * n;
        drag.interpolate_to(error_handler, forward_n);
        drag.interpolate_to(error_handler, start_pos);
        n += 1;
    }
    drag.interpolate_to(error_handler, end_pos);
}

fn run_forward_back(
    drag: &mut LineDrag<'_>,
    error_handler: &mut dyn FnMut(TilePosition, Error),
    leftmost_pos: TilePosition,
    end_pos: TilePosition,
) {
    drag.interpolate_to(error_handler, end_pos);
    drag.interpolate_to(error_handler, leftmost_pos);
}

impl WorldImpl {
    fn max_x(&self) -> i32 {
        self.entities.keys().map(|pos| pos.x).max().unwrap_or(0)
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
#[serde(deny_unknown_fields)]
struct TestCaseSerde {
    name: Option<String>,
    before: String,
    after: String,
    after_for_reverse: Option<String>,
    #[serde(default)]
    expected_errors: Vec<action::Error>,
    #[serde(default)]
    not_reversible: bool,
    #[serde(default)]
    forward_back: bool,
}
fn get_entities(serde_case: &TestCaseSerde) -> Result<TestCaseEntities, String> {
    let (before, before_markers) = parse_world(&serde_case.before)
        .map_err(|e| format!("Failed to parse 'before' entities: {}", e))?;

    let (after, after_markers) = parse_world(&serde_case.after)
        .map_err(|e| format!("Failed to parse 'after' entities: {}", e))?;

    let serde_expected_errors = serde_case.expected_errors.clone();

    if after_markers.len() != serde_expected_errors.len() {
        return Err("Expected number of markers to match number of expected errors".to_string());
    }

    let expected_errors = after_markers
        .into_iter()
        .zip(serde_expected_errors)
        .collect();

    let start_pos = if !before_markers.is_empty() {
        if before_markers.len() > 1 {
            return Err("Expected exactly one marker for drag start position".to_string());
        }
        before_markers[0]
    } else {
        *after
            .entities
            .keys()
            .find(|p| p.x == 0)
            .expect("No first position found")
    };

    let first_ent = after
        .entities
        .iter()
        .filter(|(p, _)| p.y == start_pos.y && p.x >= start_pos.x)
        .sorted_by_key(|(p, _)| p.x)
        .find_map(|(_, ent)| BeltConnectable::try_from(ent).ok())
        .expect("No belt found in drag row");
    let tier = first_ent.tier();

    let max_x = max(before.max_x(), after.max_x());
    let end_pos = pos(max_x, start_pos.y);

    let leftmost_pos = pos(0, start_pos.y);

    let direction = first_ent.direction();

    Ok(TestCaseEntities {
        before,
        after,
        tier,
        leftmost_pos,
        start_pos,
        end_pos,
        belt_direction: direction,
        expected_errors,
    })
}

impl<'de> Deserialize<'de> for DragTestCase {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let serde_case = TestCaseSerde::deserialize(deserializer)?;

        let name = serde_case.name.as_deref().unwrap_or("Unnamed").to_string();
        let not_reversible = serde_case.not_reversible;
        let forward_back = serde_case.forward_back;

        let entities = get_entities(&serde_case).map_err(serde::de::Error::custom)?;
        let after_for_reverse = serde_case
            .after_for_reverse
            .map(|s| {
                let (world, _) = parse_world(s.as_str())?;
                Ok(world)
            })
            .transpose()
            .map_err(|e: anyhow::Error| serde::de::Error::custom(e.to_string()))?;

        Ok(DragTestCase {
            name,
            entities,
            after_for_reverse,
            not_reversible,
            forward_back,
        })
    }
}

/**
Format: [tier][direction][type]
- tier: 1-indexed belt tier (default 1)
- direction: l, r, u, d (required)
- type: i -> input ug, o -> output ug, s -> splitter, b, (omitted) -> belt

Other cases:
- (empty string) -> None
- X -> OtherColliding
*/
fn parse_word(input: &str) -> Result<Option<BeltCollidable>> {
    use crate::entity::*;

    let mut chars = input.chars().peekable();

    match chars.peek() {
        Some('X') => return Ok(Some(CollidingEntityOrTile.into())),
        Some('#') => return Ok(Some(ImpassableTile.into())),
        None | Some('_') => return Ok(None),
        _ => (),
    }

    let tier_int = if let Some(&tier) = chars.peek() {
        tier.to_digit(10)
    } else {
        None
    }
    .inspect(|_| {
        chars.next();
    })
    .unwrap_or(1) as usize;

    let tier = *tier_int
        .checked_sub(1)
        .and_then(|i| BELT_TIERS.get(i))
        .context("")?;

    let direction = match chars.next() {
        Some('<') => Direction::West,
        Some('>') => Direction::East,
        Some('^') => Direction::North,
        Some('v') => Direction::South,
        c => bail!("Invalid direction: {:?}", c),
    };
    Ok(Some(match chars.next() {
        Some('b') | None => Belt::new(direction, tier).into(),
        Some('i') => UndergroundBelt::new(direction, true, tier).into(),
        Some('o') => UndergroundBelt::new(direction, false, tier).into(),
        Some('s') => Splitter::new(direction, tier).into(),
        Some('I') => LoaderLike::new(direction, true, tier).into(),
        Some('O') => LoaderLike::new(direction, false, tier).into(),
        _ => bail!("Invalid entity type"),
    }))
}

pub type WorldParse = (WorldImpl, Vec<TilePosition>);

pub fn parse_world(input: &str) -> Result<WorldParse> {
    let mut world = WorldImpl::new();
    let mut markers = Vec::new();
    for (y, line) in input.lines().enumerate() {
        let words = line.split_whitespace();
        for (x, mut word) in words.enumerate() {
            let pos = TilePosition::new(x as i32, y as i32);
            while word.starts_with('*') {
                markers.push(pos);
                word = &word[1..];
            }

            if let Some(entity) = parse_word(word)? {
                world.build(pos, entity);
            }
        }
    }
    Ok((world, markers))
}

fn get_dir_char(direction: Direction) -> char {
    match direction {
        Direction::East => '>',
        Direction::West => '<',
        Direction::North => '^',
        Direction::South => 'v',
    }
}

fn print_entity(entity: &BeltCollidable) -> String {
    match entity {
        BeltCollidable::Belt(Belt { direction, tier }) => {
            let tier_num = tier.tier_index() + 1;
            let dir_char = get_dir_char(*direction);
            if tier_num == 1 {
                format!("{}", dir_char)
            } else {
                format!("{}{}", tier_num, dir_char)
            }
        }
        BeltCollidable::UndergroundBelt(UndergroundBelt {
            direction,
            tier,
            is_input,
        }) => {
            let tier_num = tier.tier_index() + 1;
            let dir_char = get_dir_char(*direction);
            let type_char = if *is_input { 'i' } else { 'o' };
            if tier_num == 1 {
                format!("{}{}", dir_char, type_char)
            } else {
                format!("{}{}{}", tier_num, dir_char, type_char)
            }
        }
        BeltCollidable::Splitter(Splitter { direction, tier }) => {
            let tier_num = tier.tier_index() + 1;
            let dir_char = get_dir_char(*direction);
            if tier_num == 1 {
                format!("{}s", dir_char)
            } else {
                format!("{}{}s", tier_num, dir_char)
            }
        }
        BeltCollidable::LoaderLike(LoaderLike {
            direction,
            tier,
            is_input,
        }) => {
            let tier_num = tier.tier_index() + 1;
            let type_char = if *is_input { 'I' } else { 'O' };
            let dir_char = get_dir_char(*direction);
            if tier_num == 1 {
                format!("{}{}", dir_char, type_char)
            } else {
                format!("{}{}{}", tier_num, dir_char, type_char)
            }
        }
        BeltCollidable::CollidingEntityOrTile(_) => "X".to_string(),
        BeltCollidable::ImpassableTile(_) => "#".to_string(),
    }
}

pub fn print_world(world: &WorldImpl, bounds: BoundingBox, markers: &[TilePosition]) -> String {
    if bounds.is_empty() {
        return "<Empty>".to_string();
    }

    let mut result = String::new();
    for y in bounds.min.y..bounds.max.y {
        if y > bounds.min.y {
            result.push('\n');
        }
        for x in bounds.min.x..bounds.max.x {
            if x > bounds.min.x {
                result.push(' ');
            }
            let pos = pos(x, y);
            if let Some(entity) = world.get(pos) {
                let mut entity_str = print_entity(entity);
                if markers.contains(&pos) {
                    entity_str.insert(0, '*');
                }
                result.push_str(&format!("{:<4}", entity_str));
            } else {
                result.push_str("_   ");
            }
        }
        // Trim trailing whitespace from the line
        while result.ends_with(' ') {
            result.pop();
        }
    }

    result
}
#[cfg(test)]
mod tests {
    use super::*;

    use crate::entity::*;

    #[test]
    fn test_parse() {
        assert!(parse_word("").unwrap().is_none());
        let result = parse_word("X").unwrap().unwrap();
        assert!(matches!(result, BeltCollidable::CollidingEntityOrTile(_)));

        // Test direction only - defaults to tier 1 and belt type
        if let Some(BeltCollidable::Belt(belt)) = parse_word(">").unwrap() {
            assert_eq!(belt.direction, Direction::East);
            assert_eq!(belt.tier, BELT_TIERS[0]); // Default to yellow
        } else {
            panic!("Expected Some(Belt) with defaults");
        }

        if let Some(BeltCollidable::Belt(belt)) = parse_word("1>").unwrap() {
            assert_eq!(belt.direction, Direction::East);
            assert_eq!(belt.tier, BELT_TIERS[0]); // Yellow
        } else {
            panic!("Expected Some(Belt)");
        }

        if let Some(BeltCollidable::Belt(belt)) = parse_word("2^").unwrap() {
            assert_eq!(belt.direction, Direction::North);
            assert_eq!(belt.tier, BELT_TIERS[1]); // Red
        } else {
            panic!("Expected Some(Belt) with default type");
        }

        if let Some(BeltCollidable::Splitter(splitter)) = parse_word(">s").unwrap() {
            assert_eq!(splitter.direction, Direction::East);
            assert_eq!(splitter.tier, BELT_TIERS[0]); // Default to yellow
        } else {
            panic!("Expected Some(Splitter) with default tier");
        }

        if let Some(BeltCollidable::UndergroundBelt(ub)) = parse_word("1<i").unwrap() {
            assert_eq!(ub.direction, Direction::West);
            assert_eq!(ub.tier, BELT_TIERS[0]);
            assert!(ub.is_input);
        } else {
            panic!("Expected Some(UndergroundBelt) input");
        }
        if let Some(BeltCollidable::UndergroundBelt(ub)) = parse_word("2>o").unwrap() {
            assert_eq!(ub.direction, Direction::East);
            assert_eq!(ub.tier, BELT_TIERS[1]);
            assert!(!ub.is_input);
        } else {
            panic!("Expected Some(UndergroundBelt) output");
        }

        if let Some(BeltCollidable::Splitter(splitter)) = parse_word("3^s").unwrap() {
            assert_eq!(splitter.direction, Direction::North);
            assert_eq!(splitter.tier, BELT_TIERS[2]);
        } else {
            panic!("Expected Some(Splitter)");
        }
    }

    #[test]
    fn test_parse_word_invalid_cases() {
        assert!(parse_word("0>").is_err());
        assert!(parse_word("4>").is_err());
        assert!(parse_word("1x").is_err());
        assert!(parse_word("1>x").is_err());
        assert!(parse_word("a>").is_err());
    }

    #[test]
    fn test_test_case_deserialization() {
        use serde_yaml;

        let yaml = r#"
before: ">\t2^"
after: "2>\t^\tX"
"#;

        let test_case: DragTestCase = serde_yaml::from_str(yaml).expect("Failed to deserialize");
        let entities = &test_case.entities;

        assert_eq!(entities.start_pos, pos(0, 0));
        assert_eq!(entities.tier, BELT_TIERS[1]);

        // Check that entities were parsed correctly
        assert!(entities.before.get(pos(0, 0)).is_some());
        assert!(entities.before.get(pos(1, 0)).is_some());
        assert!(entities.after.get(pos(0, 0)).is_some());
        assert!(entities.after.get(pos(1, 0)).is_some());
        assert!(entities.after.get(pos(2, 0)).is_some());

        // Check specific entity types and properties
        if let Some(BeltCollidable::Belt(belt)) = entities.before.get(pos(0, 0)) {
            assert_eq!(belt.direction, Direction::East);
            assert_eq!(belt.tier, BELT_TIERS[0]);
        } else {
            panic!("Expected Belt entity at (0,0)");
        }

        if let Some(BeltCollidable::Belt(belt)) = entities.before.get(pos(1, 0)) {
            assert_eq!(belt.direction, Direction::North);
            assert_eq!(belt.tier, BELT_TIERS[1]);
        } else {
            panic!("Expected Belt entity at (1,0)");
        }

        if let Some(BeltCollidable::CollidingEntityOrTile(_)) = entities.after.get(pos(2, 0)) {
            // Correct - X should parse to Colliding
        } else {
            panic!("Expected Colliding entity at (2,0)");
        }
    }

    #[test]
    fn test_parse_world_with_marker() {
        let input = "> *2^\n<s _ X";
        let (world, markers) = parse_world(input).expect("Failed to parse world");

        // Check that we have one marker at position (1, 0)
        assert_eq!(markers.len(), 1);
        assert_eq!(markers[0], pos(1, 0));

        // Check that entities were parsed correctly
        if let Some(BeltCollidable::Belt(belt)) = world.get(pos(0, 0)) {
            assert_eq!(belt.direction, Direction::East);
        } else {
            panic!("Expected entity at (0, 0)");
        }

        if let Some(BeltCollidable::Belt(belt)) = world.get(pos(1, 0)) {
            assert_eq!(belt.direction, Direction::North);
        } else {
            panic!("Expected entity at (1, 0)");
        }

        if let Some(BeltCollidable::Splitter(splitter)) = world.get(pos(0, 1)) {
            assert_eq!(splitter.direction, Direction::West);
        } else {
            panic!("Expected entity at (0, 1)");
        }

        if let Some(BeltCollidable::CollidingEntityOrTile(_)) = world.get(pos(2, 1)) {
            // Correct
        } else {
            panic!("Expected entity at (2, 1)");
        }
    }

    #[test]
    fn test_print_world() {
        let mut world = WorldImpl::new();
        world.build(pos(0, 0), Belt::new(Direction::East, BELT_TIERS[0]).into());
        world.build(
            pos(1, 0),
            UndergroundBelt::new(Direction::North, true, BELT_TIERS[1]).into(),
        );
        world.build(pos(0, 1), Splitter::new(Direction::West, BELT_TIERS[0]).into());
        world.build(pos(2, 1), CollidingEntityOrTile.into());

        let output = print_world(&world, world.bounds(), &[]);
        let expected = r#"
>    2^i  _
<s   _    X"#
            .trim_start();
        assert_eq!(output, expected);
        let (back_to_world, _) = parse_world(&output).expect("Failed to parse world");
        assert_eq!(back_to_world, world);
    }
}
