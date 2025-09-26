use std::any::Any;
use std::cmp::max;

use crate::Impassable;
use crate::belts::{BELT_TIERS, Belt, BeltTier, LoaderLike, Splitter, UndergroundBelt};
use crate::{
    Colliding, Direction, Entity, TilePosition, World, pos,
    smart_belt::{LineDrag, action, action::Error},
};
use anyhow::{Context, Result, bail};
use itertools::Itertools;
use serde::{Deserialize, Deserializer};

#[derive(Debug, Clone)]
pub struct DragTestCase {
    pub name: String,
    pub before: World,
    pub after: World,
    pub start_pos: TilePosition,
    pub tier: BeltTier,
    pub expected_errors: Vec<(TilePosition, action::Error)>,
    pub skip: bool,
}

pub fn check_test_case(test: &DragTestCase) -> anyhow::Result<()> {
    if test.skip {
        eprintln!("SKIPPING! {}", test.name);
        return Ok(());
    }

    let max_x = max(test.before.max_x(), test.after.max_x());
    let (result, actual_errors) = run_test_case(&test.before, test.tier, test.start_pos, max_x);

    let expected_world = &test.after;

    let expected_errors = &test.expected_errors;

    if result != *expected_world || actual_errors != *expected_errors {
        eprintln!(
            r#"
Expected:

{}

Got:

{}

"#,
            print_world(
                expected_world,
                &expected_errors
                    .iter()
                    .map(|f| f.0)
                    .collect::<Vec<TilePosition>>()
            ),
            print_world(
                &result,
                &actual_errors
                    .iter()
                    .map(|f| f.0)
                    .collect::<Vec<TilePosition>>()
            )
        );
        if actual_errors != *expected_errors {
            eprintln!(
                r#"
Expected errors:
{:?}
Got errors:
{:?}
"#,
                expected_errors, actual_errors
            );
        }

        bail!("Test Failed");
    }

    Ok(())
}

fn run_test_case(
    world: &World,
    tier: BeltTier,
    start_pos: TilePosition,
    max_x: i32,
) -> (World, Vec<(TilePosition, Error)>) {
    let mut world = world.clone();
    let end_pos = pos(max_x, start_pos.y);
    let mut drag = LineDrag::start_drag(&mut world, tier, start_pos, Direction::East);
    drag.interpolate_to(end_pos);
    let errors = drag.get_errors();
    (world, errors)
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
    #[serde(default)]
    skip: bool,
    #[serde(default)]
    expected_errors: Vec<action::Error>,
}

impl<'de> Deserialize<'de> for DragTestCase {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        use serde::de::Error;

        let serde_case = TestCaseSerde::deserialize(deserializer)?;

        let (before, before_markers) = parse_world(&serde_case.before)
            .map_err(|e| Error::custom(format!("Failed to parse 'before' entities: {}", e)))?;

        let (after, after_markers) = parse_world(&serde_case.after)
            .map_err(|e| Error::custom(format!("Failed to parse 'after' entities: {}", e)))?;

        let serde_expected_errors = serde_case.expected_errors;

        if after_markers.len() != serde_expected_errors.len() {
            return Err(Error::custom(
                "Expected number of markers to match number of expected errors",
            ));
        }

        let expected_errors = after_markers
            .into_iter()
            .zip(serde_expected_errors)
            .collect_vec();

        let start_pos = if !before_markers.is_empty() {
            if before_markers.len() > 1 {
                return Err(Error::custom(
                    "Expected exactly one marker for drag start position",
                ));
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

        let skip = serde_case.skip;
        let name = serde_case.name.unwrap_or("Unnamed".to_string());

        Ok(DragTestCase {
            name,
            before,
            after,
            tier,
            start_pos,
            expected_errors,
            skip,
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

fn print_world(world: &World, markers: &[TilePosition]) -> String {
    let bounds = world.bounds();

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

        assert_eq!(test_case.start_pos, pos(0, 0));
        assert_eq!(test_case.tier, BELT_TIERS[1]);

        // Check that entities were parsed correctly
        assert!(test_case.before.get(pos(0, 0)).is_some());
        assert!(test_case.before.get(pos(1, 0)).is_some());
        assert!(test_case.after.get(pos(0, 0)).is_some());
        assert!(test_case.after.get(pos(1, 0)).is_some());
        assert!(test_case.after.get(pos(2, 0)).is_some());

        // Check specific entity types and properties
        if let Some(entity) = test_case.before.get(pos(0, 0)) {
            if let Some(belt) = (entity as &dyn Any).downcast_ref::<Belt>() {
                assert_eq!(belt.direction, Direction::East);
                assert_eq!(belt.tier, BELT_TIERS[0]);
            } else {
                panic!("Expected Belt entity at (0,0)");
            }
        } else {
            panic!("Expected Belt entity at (0,0)");
        }

        if let Some(entity) = test_case.before.get(pos(1, 0)) {
            if let Some(belt) = (entity as &dyn Any).downcast_ref::<Belt>() {
                assert_eq!(belt.direction, Direction::North);
                assert_eq!(belt.tier, BELT_TIERS[1]);
            } else {
                panic!("Expected Belt entity at (1,0)");
            }
        } else {
            panic!("Expected Belt entity at (1,0)");
        }

        if let Some(entity) = test_case.after.get(pos(2, 0)) {
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
    fn test_test_case_deserialization_defaults() {
        use serde_yaml;

        let yaml = r#"
before: ">"
after: ">"
"#;

        let test_case: DragTestCase = serde_yaml::from_str(yaml).expect("Failed to deserialize");
        assert_eq!(test_case.start_pos, pos(0, 0)); // Default drag_row
        assert_eq!(test_case.tier, BELT_TIERS[0]); // Default belt_tier (yellow)
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

        let output = print_world(&world, &[]);
        let expected = r#"
>    2^i  _
<s   _    X"#
            .trim_start();
        assert_eq!(output, expected);
        let (back_to_world, _) = parse_world(&output).expect("Failed to parse world");
        assert_eq!(back_to_world, world);
    }
}
