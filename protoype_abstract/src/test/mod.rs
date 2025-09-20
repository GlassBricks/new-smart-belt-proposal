use crate::{BeltTier, Direction, Entities, Entity, pos};
use anyhow::{Context, Result, bail};
use serde::Deserialize;

#[derive(Debug, Clone)]
pub struct TestCase {
    pub before: Entities,
    pub after: Entities,
    pub drag_row: i32,
    pub tier: BeltTier,
}

/**
Input is trimmed before parsing.

Format: [tier][direction][type]
- tier: 1-indexed number into BELT_TIERS (optional, defaults to 1)
- direction: l, r, u, d (required)
- type: i -> input ug, o -> output ug, s -> splitter (optional, defaults to belt)

Special cases:
- (empty string) -> None
- X* -> OtherColliding
*/
pub fn parse_word(input: &str) -> Result<Option<Entity>> {
    use crate::entity::*;

    if input.is_empty() {
        return Ok(None);
    };

    let mut chars = input.chars().peekable();

    if let Some('X') = chars.peek() {
        return Ok(Some(Entity::OtherColliding));
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

/**
 * Parses line of entities separated by \t
 */
pub fn parse_entities(input: &str) -> Result<Entities> {
    let mut world = Entities::new();
    for (y, line) in input.lines().enumerate() {
        let words = line.split('\t');
        for (x, word) in words.enumerate() {
            if let Some(entity) = parse_word(word)? {
                world.add_entity(pos(x as i32, y as i32), entity);
            }
        }
    }
    Ok(world)
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
        assert!(parse_word("toolong").is_err());
    }
}
