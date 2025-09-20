use lazy_static::lazy_static;
use std::{any::Any, ops::Deref};

use crate::geometry::Direction;

#[derive(Debug)]
pub struct BeltTierData {
    pub name: &'static str,
    pub underground_distance: u8,
}

#[derive(Debug, Clone, Copy)]
pub struct BeltTier(&'static BeltTierData);

impl PartialEq for BeltTier {
    fn eq(&self, other: &Self) -> bool {
        std::ptr::eq(self.0, other.0)
    }
}

impl Eq for BeltTier {}
impl Deref for BeltTier {
    type Target = BeltTierData;

    fn deref(&self) -> &Self::Target {
        self.0
    }
}

pub trait BeltConnectable: Any {
    fn belt_direction(&self) -> Direction;
    fn tier(&self) -> &BeltTier;

    fn has_output(&self) -> bool;
    fn has_backwards_input(&self) -> bool;

    /// Does not include underground side-loading
    fn accepts_sideways_input(&self) -> bool {
        false
    }

    fn belt_output(&self) -> Option<Direction> {
        self.has_output().then_some(self.belt_direction())
    }
}

#[derive(Debug, Clone)]
pub struct Belt {
    pub direction: Direction,
    pub tier: BeltTier,
}
impl BeltConnectable for Belt {
    fn belt_direction(&self) -> Direction {
        self.direction
    }
    fn tier(&self) -> &BeltTier {
        &self.tier
    }
    fn has_output(&self) -> bool {
        true
    }
    fn has_backwards_input(&self) -> bool {
        true
    }
    fn accepts_sideways_input(&self) -> bool {
        true
    }
}

#[derive(Debug, Clone)]
pub struct UndergroundBelt {
    pub direction: Direction,
    pub tier: BeltTier,
    pub is_input: bool,
}
impl BeltConnectable for UndergroundBelt {
    fn belt_direction(&self) -> Direction {
        self.direction
    }
    fn tier(&self) -> &BeltTier {
        &self.tier
    }
    fn has_output(&self) -> bool {
        !self.is_input
    }
    fn has_backwards_input(&self) -> bool {
        self.is_input
    }
}

#[derive(Debug, Clone)]
pub struct LoaderLike {
    pub direction: Direction,
    pub tier: BeltTier,
    pub is_input: bool,
}
impl BeltConnectable for LoaderLike {
    fn belt_direction(&self) -> Direction {
        self.direction
    }
    fn tier(&self) -> &BeltTier {
        &self.tier
    }
    fn has_output(&self) -> bool {
        !self.is_input
    }
    fn has_backwards_input(&self) -> bool {
        self.is_input
    }
}

impl UndergroundBelt {
    pub fn shape_direction(&self) -> Direction {
        if self.is_input {
            self.direction.opposite()
        } else {
            self.direction
        }
    }
}

#[derive(Debug, Clone)]
pub struct Splitter {
    pub direction: Direction,
    pub tier: BeltTier,
}

impl BeltConnectable for Splitter {
    fn belt_direction(&self) -> Direction {
        self.direction
    }
    fn tier(&self) -> &BeltTier {
        &self.tier
    }
    fn has_output(&self) -> bool {
        true
    }
    fn has_backwards_input(&self) -> bool {
        true
    }
}

impl dyn BeltConnectable {
    pub fn as_belt(&self) -> Option<&Belt> {
        (self as &dyn Any).downcast_ref::<Belt>()
    }
    pub fn as_underground_belt(&self) -> Option<&UndergroundBelt> {
        (self as &dyn Any).downcast_ref::<UndergroundBelt>()
    }
    pub fn as_splitter(&self) -> Option<&Splitter> {
        (self as &dyn Any).downcast_ref::<Splitter>()
    }
}

// eh.
#[derive(Debug, Clone)]
pub enum Entity {
    Belt(Belt),
    UndergroundBelt(UndergroundBelt),
    Splitter(Splitter),
    LoaderLike(LoaderLike),
    OtherColliding,
}

impl Entity {
    pub fn as_belt_like(&self) -> Option<&dyn BeltConnectable> {
        match self {
            Entity::Belt(ent) => Some(ent),
            Entity::UndergroundBelt(ent) => Some(ent),
            Entity::Splitter(ent) => Some(ent),
            Entity::LoaderLike(ent) => Some(ent),
            Entity::OtherColliding => None,
        }
    }
}

impl dyn BeltConnectable {
    // the entity's relative placement should be approach_direction.opposite
    pub fn accepts_input_going(&self, entering_direction: Direction) -> bool {
        match entering_direction.direction_to(self.belt_direction()) {
            Direction::North => self.has_backwards_input(),
            Direction::East | Direction::West => self.accepts_sideways_input(),
            Direction::South => false,
        }
    }

    pub fn output_direction(&self) -> Option<Direction> {
        self.has_output().then_some(self.belt_direction())
    }

    pub fn connects_to_from_directional(
        &self,
        approach_direction: Direction,
        backwards: bool,
    ) -> bool {
        if !backwards {
            self.accepts_input_going(approach_direction)
        } else {
            self.output_direction() == Some(approach_direction.opposite())
        }
    }
}

pub static YELLOW_BELT: BeltTier = BeltTier(&BeltTierData {
    name: "Yellow",
    underground_distance: 5,
});

pub static RED_BELT: BeltTier = BeltTier(&BeltTierData {
    name: "Red",
    underground_distance: 7,
});

pub static BLUE_BELT: BeltTier = BeltTier(&BeltTierData {
    name: "Blue",
    underground_distance: 9,
});

pub static BELT_TIERS: [BeltTier; 3] = [YELLOW_BELT, RED_BELT, BLUE_BELT];

lazy_static! {}
#[cfg(test)]
mod tests {
    use super::*;
    use crate::geometry::Direction::*;

    #[test]
    fn test_underground_belt_shape_direction() {
        let belt = UndergroundBelt {
            direction: North,
            tier: YELLOW_BELT,
            is_input: true,
        };

        assert_eq!(belt.shape_direction(), South);

        let belt = UndergroundBelt {
            direction: South,
            tier: YELLOW_BELT,
            is_input: true,
        };

        assert_eq!(belt.shape_direction(), North);
    }

    #[test]
    fn test_belt_accepts_input_going() {
        let belt = Belt {
            direction: North,
            tier: YELLOW_BELT,
        };
        let belt_connectable: &dyn BeltConnectable = &belt;

        // accepts all sides except backwards
        assert!(belt_connectable.accepts_input_going(North));
        assert!(belt_connectable.accepts_input_going(East));
        assert!(belt_connectable.accepts_input_going(West));

        assert!(!belt_connectable.accepts_input_going(South));
    }

    #[test]
    fn test_underground_belt_input_accepts_input_going() {
        let underground = UndergroundBelt {
            direction: East,
            tier: YELLOW_BELT,
            is_input: true,
        };
        let belt_connectable: &dyn BeltConnectable = &underground;

        // accepts input
        assert!(belt_connectable.accepts_input_going(East));
        // no other inputs
        assert!(!belt_connectable.accepts_input_going(West));

        assert!(!belt_connectable.accepts_input_going(North));
        assert!(!belt_connectable.accepts_input_going(South));
    }

    #[test]
    fn test_underground_belt_output_accepts_input_going() {
        let underground = UndergroundBelt {
            direction: East,
            tier: YELLOW_BELT,
            is_input: false,
        };
        let belt_connectable: &dyn BeltConnectable = &underground;

        // Output underground belt has output but no backwards input
        assert!(!belt_connectable.accepts_input_going(East));
        assert!(!belt_connectable.accepts_input_going(West));
        assert!(!belt_connectable.accepts_input_going(North));
        assert!(!belt_connectable.accepts_input_going(South));
    }
    #[test]
    fn test_splitter_accepts_input_going() {
        let splitter = Splitter {
            direction: East,
            tier: YELLOW_BELT,
        };
        let belt_connectable: &dyn BeltConnectable = &splitter;

        // Accepts input only in one direction
        assert!(belt_connectable.accepts_input_going(East));
        assert!(!belt_connectable.accepts_input_going(West));
        assert!(!belt_connectable.accepts_input_going(North));
        assert!(!belt_connectable.accepts_input_going(South));
    }

    #[test]
    fn test_belt_output_direction() {
        let belt = Belt {
            direction: South,
            tier: YELLOW_BELT,
        };
        let belt_connectable: &dyn BeltConnectable = &belt;
        assert_eq!(belt_connectable.output_direction(), Some(South));

        let underground_input = UndergroundBelt {
            direction: North,
            tier: YELLOW_BELT,
            is_input: true,
        };
        let belt_connectable: &dyn BeltConnectable = &underground_input;
        assert_eq!(belt_connectable.output_direction(), None);

        let underground_output = UndergroundBelt {
            direction: North,
            tier: YELLOW_BELT,
            is_input: false,
        };
        let belt_connectable: &dyn BeltConnectable = &underground_output;
        assert_eq!(belt_connectable.output_direction(), Some(North));
    }

    #[test]
    fn test_belt_connects_to_from_directional() {
        let belt = Belt {
            direction: East,
            tier: YELLOW_BELT,
        };
        let belt_connectable: &dyn BeltConnectable = &belt;

        // Test forward connections
        assert!(belt_connectable.connects_to_from_directional(East, false)); // backwards input
        assert!(belt_connectable.connects_to_from_directional(North, false)); // sideways
        assert!(belt_connectable.connects_to_from_directional(South, false)); // sideways
        assert!(!belt_connectable.connects_to_from_directional(West, false)); // front

        // Test backward connections
        assert!(!belt_connectable.connects_to_from_directional(East, true));
        assert!(!belt_connectable.connects_to_from_directional(North, true));
        assert!(!belt_connectable.connects_to_from_directional(South, true));
        assert!(belt_connectable.connects_to_from_directional(West, true)); // output direction
    }

    #[test]
    fn test_splitter_connects_to_from_directional() {
        let splitter = Splitter {
            direction: West,
            tier: BLUE_BELT,
        };
        let belt_connectable: &dyn BeltConnectable = &splitter;

        // Splitter has both input and output, but no sideways input
        assert!(belt_connectable.connects_to_from_directional(West, false)); // backwards input
        assert!(!belt_connectable.connects_to_from_directional(North, false)); // no sideways
        assert!(!belt_connectable.connects_to_from_directional(South, false)); // no sideways
        assert!(!belt_connectable.connects_to_from_directional(East, false)); // front

        // Backward connection
        assert!(belt_connectable.connects_to_from_directional(East, true)); // output direction
    }
}
