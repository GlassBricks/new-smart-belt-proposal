use crate::entity::BELT_TIERS;
use crate::smart_belt::action;
use crate::{BeltTier, Direction, Entity, Position, World, pos};
use anyhow::{Context, Result, bail};
use serde::{Deserialize, Deserializer};

#[derive(Debug, Clone)]
pub struct DragTestCase {
    pub name: Option<String>,
    pub before: World,
    pub after: World,
    pub drag_row: i32,
    pub belt_tier: BeltTier,
    pub expected_error: Option<(Position, action::Error)>,
}

fn deserialize_belt_tier(tier_int: i32) -> Result<BeltTier, String> {
    BELT_TIERS.get(tier_int as usize).copied().ok_or_else(|| {
        format!(
            "Invalid belt tier: {}. Must be <= {}",
            tier_int,
            BELT_TIERS.len()
        )
    })
}

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
struct TestCaseSerde {
    name: Option<String>,
    before: String,
    after: String,
    #[serde(default)]
    drag_row: i32,
    #[serde(default)]
    belt_tier: i32,
    expected_error: Option<action::Error>,
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

        if !before_markers.is_empty() {
            return Err(Error::custom("Before markers should be empty"));
        }

        let belt_tier =
            deserialize_belt_tier(serde_case.belt_tier).map_err(serde::de::Error::custom)?;

        let expected_error = if let Some(expected_error) = serde_case.expected_error {
            if after_markers.len() != 1 {
                return Err(Error::custom(
                    "Expected exactly one after marker for error location",
                ));
            }
            let position = after_markers[0];
            Some((position, expected_error))
        } else {
            None
        };

        Ok(DragTestCase {
            name: serde_case.name,
            before,
            after,
            drag_row: serde_case.drag_row,
            belt_tier,
            expected_error,
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
pub fn parse_word(input: &str) -> Result<Option<Entity>> {
    use crate::entity::*;

    let mut chars = input.chars().peekable();

    match chars.peek() {
        Some('X') => return Ok(Some(Entity::OtherColliding)),
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
        .context("Invalid belt tier")?;

    let direction = match chars.next() {
        Some('l') => Direction::West,
        Some('r') => Direction::East,
        Some('u') => Direction::North,
        Some('d') => Direction::South,
        c => bail!("Invalid direction: {:?}", c),
    };
    Ok(Some(match chars.next() {
        Some('b') | None => Entity::Belt(Belt { direction, tier }),
        Some('i') => Entity::UndergroundBelt(UndergroundBelt {
            direction,
            tier,
            is_input: true,
        }),
        Some('o') => Entity::UndergroundBelt(UndergroundBelt {
            direction,
            tier,
            is_input: false,
        }),
        Some('s') => Entity::Splitter(Splitter { direction, tier }),
        _ => bail!("Invalid entity type"),
    }))
}

pub type WorldParse = (World, Vec<Position>);

pub fn parse_world(input: &str) -> Result<WorldParse> {
    let mut world = World::new();
    let mut markers = Vec::new();
    for (y, line) in input.lines().enumerate() {
        let words = line.split_whitespace();
        for (x, mut word) in words.enumerate() {
            let pos = Position::new(x as i32, y as i32);
            if word.starts_with('*') {
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
pub fn print_entity(entity: &Entity) -> String {
    use crate::entity::*;

    match entity {
        Entity::Belt(Belt { direction, tier }) => {
            let tier_num = BELT_TIERS.iter().position(|&t| t == *tier).unwrap_or(0) + 1;
            let dir_char = match direction {
                Direction::East => 'r',
                Direction::West => 'l',
                Direction::North => 'u',
                Direction::South => 'd',
            };
            if tier_num == 1 {
                format!("{}", dir_char)
            } else {
                format!("{}{}", tier_num, dir_char)
            }
        }
        Entity::UndergroundBelt(UndergroundBelt {
            direction,
            tier,
            is_input,
        }) => {
            let tier_num = BELT_TIERS.iter().position(|&t| t == *tier).unwrap_or(0) + 1;
            let dir_char = match direction {
                Direction::East => 'r',
                Direction::West => 'l',
                Direction::North => 'u',
                Direction::South => 'd',
            };
            let type_char = if *is_input { 'i' } else { 'o' };
            if tier_num == 1 {
                format!("{}{}", dir_char, type_char)
            } else {
                format!("{}{}{}", tier_num, dir_char, type_char)
            }
        }
        Entity::Splitter(Splitter { direction, tier }) => {
            let tier_num = BELT_TIERS.iter().position(|&t| t == *tier).unwrap_or(0) + 1;
            let dir_char = match direction {
                Direction::East => 'r',
                Direction::West => 'l',
                Direction::North => 'u',
                Direction::South => 'd',
            };
            if tier_num == 1 {
                format!("{}s", dir_char)
            } else {
                format!("{}{}s", tier_num, dir_char)
            }
        }
        Entity::LoaderLike(_) => "l".to_string(), // not yet done
        Entity::OtherColliding => "X".to_string(),
    }
}

pub fn print_world(world: &World) -> String {
    let bounds = world.bounds();

    if bounds.is_none_or(|bounds| bounds.is_empty()) {
        return "<Empty>".to_string();
    }
    let bounds = bounds.unwrap();

    let mut result = String::new();
    for y in bounds.min_y()..=bounds.max_y() {
        for x in bounds.min_x()..=bounds.max_x() {
            if x > bounds.min_x() {
                result.push(' ');
            }
            let pos = pos(x, y);
            if let Some(entity) = world.get(pos) {
                result.push_str(&format!("{:<4}", print_entity(entity)));
            } else {
                result.push_str("_   ");
            }
        }
        // Trim trailing whitespace from the line
        while result.ends_with(' ') {
            result.pop();
        }
        if y < bounds.max_y() {
            result.push('\n');
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
        assert!(matches!(
            parse_word("X").unwrap(),
            Some(Entity::OtherColliding)
        ));

        // Test direction only - defaults to tier 1 and belt type
        match parse_word("r").unwrap() {
            Some(Entity::Belt(belt)) => {
                assert_eq!(belt.direction, Direction::East);
                assert_eq!(belt.tier, BELT_TIERS[0]); // Default to yellow
            }
            _ => panic!("Expected Some(Belt) with defaults"),
        }

        match parse_word("1r").unwrap() {
            Some(Entity::Belt(belt)) => {
                assert_eq!(belt.direction, Direction::East);
                assert_eq!(belt.tier, BELT_TIERS[0]); // Yellow
            }
            _ => panic!("Expected Some(Belt)"),
        }

        match parse_word("2u").unwrap() {
            Some(Entity::Belt(belt)) => {
                assert_eq!(belt.direction, Direction::North);
                assert_eq!(belt.tier, BELT_TIERS[1]); // Red
            }
            _ => panic!("Expected Some(Belt) with default type"),
        }

        match parse_word("rs").unwrap() {
            Some(Entity::Splitter(splitter)) => {
                assert_eq!(splitter.direction, Direction::East);
                assert_eq!(splitter.tier, BELT_TIERS[0]); // Default to yellow
            }
            _ => panic!("Expected Some(Splitter) with default tier"),
        }

        match parse_word("1li").unwrap() {
            Some(Entity::UndergroundBelt(ub)) => {
                assert_eq!(ub.direction, Direction::West);
                assert_eq!(ub.tier, BELT_TIERS[0]);
                assert!(ub.is_input);
            }
            _ => panic!("Expected Some(UndergroundBelt) input"),
        }
        match parse_word("2ro").unwrap() {
            Some(Entity::UndergroundBelt(ub)) => {
                assert_eq!(ub.direction, Direction::East);
                assert_eq!(ub.tier, BELT_TIERS[1]);
                assert!(!ub.is_input);
            }
            _ => panic!("Expected Some(UndergroundBelt) output"),
        }

        match parse_word("3us").unwrap() {
            Some(Entity::Splitter(splitter)) => {
                assert_eq!(splitter.direction, Direction::North);
                assert_eq!(splitter.tier, BELT_TIERS[2]);
            }
            _ => panic!("Expected Some(Splitter)"),
        }
    }

    #[test]
    fn test_parse_word_invalid_cases() {
        assert!(parse_word("0r").is_err());
        assert!(parse_word("4r").is_err());
        assert!(parse_word("1x").is_err());
        assert!(parse_word("1rx").is_err());
        assert!(parse_word("ar").is_err());
    }

    #[test]
    fn test_deserialize_belt_tier() {
        assert_eq!(deserialize_belt_tier(0).unwrap(), BELT_TIERS[0]);
        assert_eq!(deserialize_belt_tier(1).unwrap(), BELT_TIERS[1]);
        assert_eq!(deserialize_belt_tier(2).unwrap(), BELT_TIERS[2]);
        assert!(deserialize_belt_tier(10).is_err()); // Invalid
        assert!(deserialize_belt_tier(-1).is_err()); // Invalid
    }

    #[test]
    fn test_test_case_deserialization() {
        use serde_yaml;

        let yaml = r#"
before: "r\t2u"
after: "r\t2u\tX"
drag_row: 0
belt_tier: 2
"#;

        let test_case: DragTestCase = serde_yaml::from_str(yaml).expect("Failed to deserialize");

        assert_eq!(test_case.drag_row, 0);
        assert_eq!(test_case.belt_tier, BELT_TIERS[2]);

        // Check that entities were parsed correctly
        assert!(test_case.before.get(pos(0, 0)).is_some());
        assert!(test_case.before.get(pos(1, 0)).is_some());
        assert!(test_case.after.get(pos(0, 0)).is_some());
        assert!(test_case.after.get(pos(1, 0)).is_some());
        assert!(test_case.after.get(pos(2, 0)).is_some());

        // Check specific entity types and properties
        if let Some(Entity::Belt(belt)) = test_case.before.get(pos(0, 0)) {
            assert_eq!(belt.direction, Direction::East);
            assert_eq!(belt.tier, BELT_TIERS[0]); // Default tier 1 (yellow)
        } else {
            panic!("Expected Belt entity at (0,0)");
        }

        if let Some(Entity::Belt(belt)) = test_case.before.get(pos(1, 0)) {
            assert_eq!(belt.direction, Direction::North);
            assert_eq!(belt.tier, BELT_TIERS[1]); // Tier 2 (red)
        } else {
            panic!("Expected Belt entity at (1,0)");
        }

        if let Some(Entity::OtherColliding) = test_case.after.get(pos(2, 0)) {
            // Correct - X should parse to OtherColliding
        } else {
            panic!("Expected OtherColliding entity at (2,0)");
        }
    }
    #[test]
    fn test_test_case_deserialization_defaults() {
        use serde_yaml;

        let yaml = r#"
before: "r"
after: "r"
"#;

        let test_case: DragTestCase = serde_yaml::from_str(yaml).expect("Failed to deserialize");
        assert_eq!(test_case.drag_row, 0); // Default drag_row
        assert_eq!(test_case.belt_tier, BELT_TIERS[0]); // Default belt_tier (yellow)
    }
    #[test]
    fn test_parse_world_with_marker() {
        let input = "r *2u\nls _ X";
        let (world, markers) = parse_world(input).expect("Failed to parse world");

        // Check that we have one marker at position (1, 0)
        assert_eq!(markers.len(), 1);
        assert_eq!(markers[0], pos(1, 0));

        // Check that entities were parsed correctly
        assert!(matches!(
            world.get(pos(0, 0)),
            Some(Entity::Belt(Belt {
                direction: Direction::East,
                ..
            }))
        ));
        assert!(matches!(
            world.get(pos(1, 0)),
            Some(Entity::Belt(Belt {
                direction: Direction::North,
                ..
            }))
        ));
        assert!(matches!(
            world.get(pos(0, 1)),
            Some(Entity::Splitter(Splitter {
                direction: Direction::West,
                ..
            }))
        ));
        assert!(matches!(world.get(pos(2, 1)), Some(Entity::OtherColliding)));
    }

    #[test]
    fn test_print_world() {
        let mut world = World::new();
        world.set(
            pos(0, 0),
            Entity::Belt(Belt {
                direction: Direction::East,
                tier: BELT_TIERS[0],
            }),
        );
        world.set(
            pos(1, 0),
            Entity::UndergroundBelt(UndergroundBelt {
                direction: Direction::North,
                tier: BELT_TIERS[1],
                is_input: true,
            }),
        );
        world.set(
            pos(0, 1),
            Entity::Splitter(Splitter {
                direction: Direction::West,
                tier: BELT_TIERS[0],
            }),
        );
        world.set(pos(2, 1), Entity::OtherColliding);

        let output = print_world(&world);
        let expected = r#"
r    2ui  _
ls   _    X"#
            .trim_start();
        assert_eq!(output, expected);
        let (back_to_world, _) = parse_world(&output).expect("Failed to parse world");
        assert_eq!(back_to_world, world);
    }
}
