use std::any::Any;
use std::cmp::max;
use std::collections::HashSet;

use crate::belts::{BELT_TIERS, Belt, BeltTier, LoaderLike, Splitter, UndergroundBelt};
use crate::geometry::Ray;
use crate::{BoundingBox, Impassable};
use crate::{
    Colliding, Direction, Entity, TilePosition, Transform, World, pos,
    smart_belt::{LineDrag, action, action::Error},
};
use anyhow::{Context, Result, bail};
use itertools::Itertools;
use serde::{Deserialize, Deserializer};

#[derive(Debug, Clone)]
pub struct DragTestCase {
    pub name: String,
    pub entities: TestCaseEntities,
    pub after_for_reverse: Option<World>,
    pub not_reversible: bool,
    pub forward_back: bool,
}

#[derive(Debug, Clone)]
pub struct TestCaseEntities {
    pub before: World,
    pub after: World,
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
    wiggle: bool,
    forward_back: bool,
) -> anyhow::Result<()> {
    let test = if reverse {
        flip_test_case(test, None)?
    } else {
        test.clone()
    };

    let (result, actual_errors) = run_test_case(&test, wiggle, forward_back);

    let expected_world = &test.after;
    let expected_errors = &test.expected_errors;

    let non_empty_subset_only = wiggle;

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
    wiggle: bool,
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

        let test_name = match (reverse, wiggle, test.forward_back) {
            (true, true, _) => format!("[transform {}] [flip] [wiggle]", i),
            (true, false, _) => format!("[transform {}] [flip]", i),
            (false, true, false) => format!("[transform {}] [wiggle]", i),
            (false, false, true) => format!("[transform {}] [forward_back]", i),
            (false, false, false) => format!("[transform {}]", i),
            _ => unreachable!(),
        };
        check_test_case(&test_to_check, false, wiggle, test.forward_back)
            .with_context(|| test_name)?;
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
    after_for_reverse: Option<&World>,
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
    after_for_reverse: Option<&World>,
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
    wiggle: bool,
    forward_back: bool,
) -> (World, HashSet<(TilePosition, Error)>) {
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
    let mut drag = LineDrag::start_drag(&mut result, tier, start_pos, belt_direction);

    if wiggle {
        run_wiggle(
            &mut drag,
            start_pos,
            end_pos,
            belt_direction,
            &ray,
            end_pos_ray,
        );
    } else if forward_back {
        run_forward_back(&mut drag, leftmost_pos, end_pos);
    } else {
        drag.interpolate_to(end_pos);
    }

    let errors = drag.get_errors().iter().cloned().collect();
    eprintln!();
    (result, errors)
}

fn run_wiggle(
    drag: &mut LineDrag,
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
        drag.interpolate_to(forward_2);
        let back_1 = current_pos + dir_vec;
        drag.interpolate_to(back_1);
        current_pos = back_1
    }
    if ray.ray_position(current_pos) != end_pos_ray {
        drag.interpolate_to(end_pos);
    }
}

fn run_forward_back(drag: &mut LineDrag, leftmost_pos: TilePosition, end_pos: TilePosition) {
    drag.interpolate_to(end_pos);
    drag.interpolate_to(leftmost_pos);
}

impl World {
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
        .find_map(|(_, ent)| ent.as_belt_connectable_dyn())
        .expect("No belt found in drag row");
    let tier = *first_ent.tier();

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
fn parse_word(input: &str) -> Result<Option<Box<dyn Entity>>> {
    use crate::entity::*;

    let mut chars = input.chars().peekable();

    match chars.peek() {
        Some('X') => return Ok(Some(Colliding::new())),
        Some('#') => return Ok(Some(Impassable::new())),
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
        Some('b') | None => Belt::new(direction, tier),
        Some('i') => UndergroundBelt::new(direction, true, tier),
        Some('o') => UndergroundBelt::new(direction, false, tier),
        Some('s') => Splitter::new(direction, tier),
        Some('I') => LoaderLike::new(direction, true, tier),
        Some('O') => LoaderLike::new(direction, false, tier),
        _ => bail!("Invalid entity type"),
    }))
}

pub type WorldParse = (World, Vec<TilePosition>);

pub fn parse_world(input: &str) -> Result<WorldParse> {
    let mut world = World::new();
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
                world.set(pos, entity);
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

fn print_entity(entity: &dyn Entity) -> String {
    use crate::belts::BELT_TIERS;

    if let Some(Belt { direction, tier }) = entity.as_belt() {
        let tier_num = BELT_TIERS.iter().position(|&t| t == *tier).unwrap_or(0) + 1;
        let dir_char = get_dir_char(*direction);
        if tier_num == 1 {
            format!("{}", dir_char)
        } else {
            format!("{}{}", tier_num, dir_char)
        }
    } else if let Some(UndergroundBelt {
        direction,
        tier,
        is_input,
    }) = entity.as_underground_belt()
    {
        let tier_num = BELT_TIERS.iter().position(|&t| t == *tier).unwrap_or(0) + 1;
        let dir_char = get_dir_char(*direction);
        let type_char = if *is_input { 'i' } else { 'o' };
        if tier_num == 1 {
            format!("{}{}", dir_char, type_char)
        } else {
            format!("{}{}{}", tier_num, dir_char, type_char)
        }
    } else if let Some(Splitter { direction, tier }) = entity.as_splitter() {
        let tier_num = BELT_TIERS.iter().position(|&t| t == *tier).unwrap_or(0) + 1;
        let dir_char = get_dir_char(*direction);
        if tier_num == 1 {
            format!("{}s", dir_char)
        } else {
            format!("{}{}s", tier_num, dir_char)
        }
    } else if let Some(LoaderLike {
        direction,
        tier,
        is_input,
    }) = entity.as_loader_like()
    {
        let tier_num = BELT_TIERS.iter().position(|&t| t == *tier).unwrap_or(0) + 1;
        let type_char = if *is_input { 'I' } else { 'O' };
        let dir_char = get_dir_char(*direction);
        if tier_num == 1 {
            format!("{}{}", dir_char, type_char)
        } else {
            format!("{}{}{}", tier_num, dir_char, type_char)
        }
    } else if (entity as &dyn Any).is::<Colliding>() {
        "X".to_string()
    } else if (entity as &dyn Any).is::<Impassable>() {
        "#".to_string()
    } else {
        "?".to_string()
    }
}

fn print_world(world: &World, bounds: BoundingBox, markers: &[TilePosition]) -> String {
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
    use std::any::Any;

    use super::*;

    use crate::entity::*;

    #[test]
    fn test_parse() {
        assert!(parse_word("").unwrap().is_none());
        let result = parse_word("X").unwrap().unwrap();
        assert!((result.as_ref() as &dyn std::any::Any).is::<Colliding>());

        // Test direction only - defaults to tier 1 and belt type
        if let Some(entity) = parse_word(">").unwrap() {
            if let Some(belt) = (entity.as_ref() as &dyn Any).downcast_ref::<Belt>() {
                assert_eq!(belt.direction, Direction::East);
                assert_eq!(belt.tier, BELT_TIERS[0]); // Default to yellow
            } else {
                panic!("Expected Some(Belt) with defaults");
            }
        } else {
            panic!("Expected Some(Belt) with defaults");
        }

        if let Some(entity) = parse_word("1>").unwrap() {
            if let Some(belt) = (entity.as_ref() as &dyn Any).downcast_ref::<Belt>() {
                assert_eq!(belt.direction, Direction::East);
                assert_eq!(belt.tier, BELT_TIERS[0]); // Yellow
            } else {
                panic!("Expected Some(Belt)");
            }
        } else {
            panic!("Expected Some(Belt)");
        }

        if let Some(entity) = parse_word("2^").unwrap() {
            if let Some(belt) = (entity.as_ref() as &dyn Any).downcast_ref::<Belt>() {
                assert_eq!(belt.direction, Direction::North);
                assert_eq!(belt.tier, BELT_TIERS[1]); // Red
            } else {
                panic!("Expected Some(Belt) with default type");
            }
        } else {
            panic!("Expected Some(Belt) with default type");
        }

        if let Some(entity) = parse_word(">s").unwrap() {
            if let Some(splitter) = (entity.as_ref() as &dyn Any).downcast_ref::<Splitter>() {
                assert_eq!(splitter.direction, Direction::East);
                assert_eq!(splitter.tier, BELT_TIERS[0]); // Default to yellow
            } else {
                panic!("Expected Some(Splitter) with default tier");
            }
        } else {
            panic!("Expected Some(Splitter) with default tier");
        }

        if let Some(entity) = parse_word("1<i").unwrap() {
            if let Some(ub) = (entity.as_ref() as &dyn Any).downcast_ref::<UndergroundBelt>() {
                assert_eq!(ub.direction, Direction::West);
                assert_eq!(ub.tier, BELT_TIERS[0]);
                assert!(ub.is_input);
            } else {
                panic!("Expected Some(UndergroundBelt) input");
            }
        } else {
            panic!("Expected Some(UndergroundBelt) input");
        }
        if let Some(entity) = parse_word("2>o").unwrap() {
            if let Some(ub) = (entity.as_ref() as &dyn Any).downcast_ref::<UndergroundBelt>() {
                assert_eq!(ub.direction, Direction::East);
                assert_eq!(ub.tier, BELT_TIERS[1]);
                assert!(!ub.is_input);
            } else {
                panic!("Expected Some(UndergroundBelt) output");
            }
        } else {
            panic!("Expected Some(UndergroundBelt) output");
        }

        if let Some(entity) = parse_word("3^s").unwrap() {
            if let Some(splitter) = (entity.as_ref() as &dyn Any).downcast_ref::<Splitter>() {
                assert_eq!(splitter.direction, Direction::North);
                assert_eq!(splitter.tier, BELT_TIERS[2]);
            } else {
                panic!("Expected Some(Splitter)");
            }
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
        if let Some(entity) = entities.before.get(pos(0, 0)) {
            if let Some(belt) = (entity as &dyn Any).downcast_ref::<Belt>() {
                assert_eq!(belt.direction, Direction::East);
                assert_eq!(belt.tier, BELT_TIERS[0]);
            } else {
                panic!("Expected Belt entity at (0,0)");
            }
        } else {
            panic!("Expected Belt entity at (0,0)");
        }

        if let Some(entity) = entities.before.get(pos(1, 0)) {
            if let Some(belt) = (entity as &dyn Any).downcast_ref::<Belt>() {
                assert_eq!(belt.direction, Direction::North);
                assert_eq!(belt.tier, BELT_TIERS[1]);
            } else {
                panic!("Expected Belt entity at (1,0)");
            }
        } else {
            panic!("Expected Belt entity at (1,0)");
        }

        if let Some(entity) = entities.after.get(pos(2, 0)) {
            if (entity as &dyn Any).is::<Colliding>() {
                // Correct - X should parse to Colliding
            } else {
                panic!("Expected Colliding entity at (2,0)");
            }
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
        if let Some(entity) = world.get(pos(0, 0)) {
            assert!(matches!(
                (entity as &dyn std::any::Any).downcast_ref(),
                Some(Belt {
                    direction: Direction::East,
                    ..
                })
            ));
        } else {
            panic!("Expected entity at (0, 0)");
        }

        if let Some(entity) = world.get(pos(1, 0)) {
            assert!(matches!(
                (entity as &dyn std::any::Any).downcast_ref(),
                Some(Belt {
                    direction: Direction::North,
                    ..
                })
            ));
        } else {
            panic!("Expected entity at (1, 0)");
        }

        if let Some(entity) = world.get(pos(0, 1)) {
            assert!(matches!(
                (entity as &dyn std::any::Any).downcast_ref(),
                Some(Splitter {
                    direction: Direction::West,
                    ..
                })
            ));
        } else {
            panic!("Expected entity at (0, 1)");
        }

        if let Some(entity) = world.get(pos(2, 1)) {
            assert!((entity as &dyn std::any::Any).is::<Colliding>());
        } else {
            panic!("Expected entity at (2, 1)");
        }
    }

    #[test]
    fn test_print_world() {
        let mut world = World::new();
        world.set(pos(0, 0), Belt::new(Direction::East, BELT_TIERS[0]));
        world.set(
            pos(1, 0),
            UndergroundBelt::new(Direction::North, true, BELT_TIERS[1]),
        );
        world.set(pos(0, 1), Splitter::new(Direction::West, BELT_TIERS[0]));
        world.set(pos(2, 1), Colliding::new());

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
