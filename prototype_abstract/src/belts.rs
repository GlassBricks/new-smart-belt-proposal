use crate::{Direction, Entity};
use std::fmt::Debug;
use std::ops::Deref;

#[derive(Debug)]
pub struct BeltTierData {
    pub name: &'static str,
    pub underground_distance: u8,
}

#[derive(Clone, Copy)]
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

impl Debug for BeltTier {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_tuple("BeltTier").field(&self.name).finish()
    }
}

impl BeltTier {
    /// Returns the zero-based index of this tier in the BELT_TIERS array.
    /// - 0 = Yellow (YELLOW_BELT)
    /// - 1 = Red (RED_BELT)
    /// - 2 = Blue (BLUE_BELT)
    pub fn tier_index(&self) -> usize {
        BELT_TIERS.iter().position(|&t| t == *self).unwrap_or(0)
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
}
dyn_clone::clone_trait_object!(BeltConnectable);

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

    pub fn flip_self(&mut self) {
        self.is_input = !self.is_input;
        self.direction = self.direction.opposite();
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
    pub fn new(direction: Direction, is_input: bool, tier: BeltTier) -> Box<Self> {
        Box::new(LoaderLike {
            direction,
            tier,
            is_input,
        })
    }

    pub fn shape_direction(&self) -> Direction {
        if self.is_input {
            self.direction.opposite()
        } else {
            self.direction
        }
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
    pub fn output_direction(&self) -> Option<Direction> {
        self.has_output().then_some(self.direction())
    }

    pub fn has_output_going(&self, exiting_direction: Direction) -> bool {
        self.output_direction() == Some(exiting_direction)
    }

    /// Does not take into account belt curvature.
    pub fn primary_input_direction(&self) -> Option<Direction> {
        self.has_backwards_input().then_some(self.direction())
    }

    pub fn has_input_going(&self, entering_direction: Direction) -> bool {
        self.primary_input_direction() == Some(entering_direction)
    }
}

impl dyn Entity {
    pub fn as_belt(&self) -> Option<&Belt> {
        self.as_any().downcast_ref::<Belt>()
    }
    pub fn as_underground_belt(&self) -> Option<&UndergroundBelt> {
        self.as_any().downcast_ref::<UndergroundBelt>()
    }
    pub fn as_splitter(&self) -> Option<&Splitter> {
        self.as_any().downcast_ref::<Splitter>()
    }
    pub fn as_loader_like(&self) -> Option<&LoaderLike> {
        self.as_any().downcast_ref::<LoaderLike>()
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BeltConnectableEnum<'a> {
    Belt(&'a Belt),
    UndergroundBelt(&'a UndergroundBelt),
    Splitter(&'a Splitter),
    LoaderLike(&'a LoaderLike),
}

impl<'a> BeltConnectableEnum<'a> {
    pub fn as_dyn(self) -> &'a dyn BeltConnectable {
        match self {
            BeltConnectableEnum::Belt(belt) => belt,
            BeltConnectableEnum::UndergroundBelt(underground) => underground,
            BeltConnectableEnum::Splitter(splitter) => splitter,
            BeltConnectableEnum::LoaderLike(loader) => loader,
        }
    }
}

impl dyn Entity {
    pub fn as_belt_connectable(&self) -> Option<BeltConnectableEnum<'_>> {
        #[expect(clippy::manual_map)]
        if let Some(belt) = self.as_belt() {
            Some(BeltConnectableEnum::Belt(belt))
        } else if let Some(underground) = self.as_underground_belt() {
            Some(BeltConnectableEnum::UndergroundBelt(underground))
        } else if let Some(splitter) = self.as_splitter() {
            Some(BeltConnectableEnum::Splitter(splitter))
        } else if let Some(loader) = self.as_loader_like() {
            Some(BeltConnectableEnum::LoaderLike(loader))
        } else {
            None
        }
    }
    pub fn as_belt_connectable_dyn(&self) -> Option<&dyn BeltConnectable> {
        self.as_belt_connectable().map(|belt| belt.as_dyn())
    }
}

#[cfg(test)]
mod tests {
    use crate::belts::{BLUE_BELT, Belt, BeltConnectable, RED_BELT, UndergroundBelt, YELLOW_BELT};
    use crate::geometry::Direction::*;

    #[test]
    fn test_tier_index() {
        assert_eq!(YELLOW_BELT.tier_index(), 0);
        assert_eq!(RED_BELT.tier_index(), 1);
        assert_eq!(BLUE_BELT.tier_index(), 2);
    }

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
}
