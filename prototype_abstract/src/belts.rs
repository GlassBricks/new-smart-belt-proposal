use crate::{Direction, Entity, RelativeDirection};
use std::any::Any;
use std::ops::Deref;

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

pub trait BeltConnectable: Entity {
    fn direction(&self) -> Direction;
    fn tier(&self) -> &BeltTier;

    fn has_output(&self) -> bool;
    fn has_backwards_input(&self) -> bool;

    /// Does not include underground side-loading
    fn accepts_sideways_input(&self) -> bool {
        false
    }

    fn belt_output(&self) -> Option<Direction> {
        self.has_output().then_some(self.direction())
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Belt {
    pub direction: Direction,
    pub tier: BeltTier,
}

impl Belt {
    pub fn new(direction: Direction, tier: BeltTier) -> Box<Self> {
        Box::new(Belt { direction, tier })
    }
}

impl BeltConnectable for Belt {
    fn direction(&self) -> Direction {
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
impl Entity for Belt {}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UndergroundBelt {
    pub direction: Direction,
    pub tier: BeltTier,
    pub is_input: bool,
}

impl UndergroundBelt {
    pub fn new(direction: Direction, is_input: bool, tier: BeltTier) -> Box<Self> {
        Box::new(UndergroundBelt {
            direction,
            tier,
            is_input,
        })
    }
}

impl BeltConnectable for UndergroundBelt {
    fn direction(&self) -> Direction {
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
impl Entity for UndergroundBelt {}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LoaderLike {
    pub direction: Direction,
    pub tier: BeltTier,
    pub is_input: bool,
}

impl LoaderLike {
    pub fn new(direction: Direction, tier: BeltTier, is_input: bool) -> Box<Self> {
        Box::new(LoaderLike {
            direction,
            tier,
            is_input,
        })
    }
}

impl BeltConnectable for LoaderLike {
    fn direction(&self) -> Direction {
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
impl Entity for LoaderLike {}

impl UndergroundBelt {
    pub fn shape_direction(&self) -> Direction {
        if self.is_input {
            self.direction.opposite()
        } else {
            self.direction
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Splitter {
    pub direction: Direction,
    pub tier: BeltTier,
}

impl Splitter {
    pub fn new(direction: Direction, tier: BeltTier) -> Box<Self> {
        Box::new(Splitter { direction, tier })
    }
}

impl BeltConnectable for Splitter {
    fn direction(&self) -> Direction {
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
impl Entity for Splitter {}

impl dyn BeltConnectable {
    // the entity's relative placement should be entering_direction.opposite()
    pub fn accepts_input_going(&self, entering_direction: Direction) -> bool {
        match entering_direction.direction_to(self.direction()) {
            RelativeDirection::Forward => self.has_backwards_input(),
            RelativeDirection::Left | RelativeDirection::Right => self.accepts_sideways_input(),
            RelativeDirection::Backward => false,
        }
    }

    pub fn output_direction(&self) -> Option<Direction> {
        self.has_output().then_some(self.direction())
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

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BeltConnectableEnum<'a> {
    Belt(&'a Belt),
    UndergroundBelt(&'a UndergroundBelt),
    Splitter(&'a Splitter),
    LoaderLike(&'a LoaderLike),
}

impl dyn Entity {
    pub fn as_transport_belt_connectable(&self) -> Option<BeltConnectableEnum<'_>> {
        let self_any = self as &dyn Any;
        #[expect(clippy::manual_map)]
        if let Some(belt) = self_any.downcast_ref::<Belt>() {
            Some(BeltConnectableEnum::Belt(belt))
        } else if let Some(underground) = self_any.downcast_ref::<UndergroundBelt>() {
            Some(BeltConnectableEnum::UndergroundBelt(underground))
        } else if let Some(splitter) = self_any.downcast_ref::<Splitter>() {
            Some(BeltConnectableEnum::Splitter(splitter))
        } else if let Some(loader) = self_any.downcast_ref::<LoaderLike>() {
            Some(BeltConnectableEnum::LoaderLike(loader))
        } else {
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::belts::{BLUE_BELT, Belt, BeltConnectable, Splitter, UndergroundBelt, YELLOW_BELT};
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
