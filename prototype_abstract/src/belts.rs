use crate::{BeltCollidable, Direction};
use enum_dispatch::enum_dispatch;
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

#[enum_dispatch]
pub trait BeltConnectableTrait {
    fn direction(&self) -> Direction;
    fn tier(&self) -> BeltTier;
    fn has_output(&self) -> bool;
    fn has_backwards_input(&self) -> bool;
}

#[derive(Debug, Clone, PartialEq, Eq)]
#[enum_dispatch(BeltConnectableTrait)]
pub enum BeltConnectable {
    Belt(Belt),
    UndergroundBelt(UndergroundBelt),
    Splitter(Splitter),
    LoaderLike(LoaderLike),
}

impl BeltConnectable {
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

    pub fn as_belt(&self) -> Option<&Belt> {
        match self {
            BeltConnectable::Belt(b) => Some(b),
            _ => None,
        }
    }

    pub fn as_underground_belt(&self) -> Option<&UndergroundBelt> {
        match self {
            BeltConnectable::UndergroundBelt(ub) => Some(ub),
            _ => None,
        }
    }

    pub fn as_splitter(&self) -> Option<&Splitter> {
        match self {
            BeltConnectable::Splitter(s) => Some(s),
            _ => None,
        }
    }

    pub fn as_loader_like(&self) -> Option<&LoaderLike> {
        match self {
            BeltConnectable::LoaderLike(l) => Some(l),
            _ => None,
        }
    }
}

// Conversion: BeltConnectable -> BeltCollidable (infallible)
impl From<BeltConnectable> for BeltCollidable {
    fn from(bc: BeltConnectable) -> Self {
        match bc {
            BeltConnectable::Belt(b) => BeltCollidable::Belt(b),
            BeltConnectable::UndergroundBelt(ub) => BeltCollidable::UndergroundBelt(ub),
            BeltConnectable::Splitter(s) => BeltCollidable::Splitter(s),
            BeltConnectable::LoaderLike(l) => BeltCollidable::LoaderLike(l),
        }
    }
}

impl TryFrom<BeltCollidable> for BeltConnectable {
    type Error = BeltCollidable;

    fn try_from(bc: BeltCollidable) -> Result<Self, Self::Error> {
        match bc {
            BeltCollidable::Belt(b) => Ok(BeltConnectable::Belt(b)),
            BeltCollidable::UndergroundBelt(ub) => Ok(BeltConnectable::UndergroundBelt(ub)),
            BeltCollidable::Splitter(s) => Ok(BeltConnectable::Splitter(s)),
            BeltCollidable::LoaderLike(l) => Ok(BeltConnectable::LoaderLike(l)),
            other => Err(other),
        }
    }
}

impl TryFrom<&BeltCollidable> for BeltConnectable {
    type Error = ();

    fn try_from(bc: &BeltCollidable) -> Result<Self, Self::Error> {
        match bc {
            BeltCollidable::Belt(b) => Ok(BeltConnectable::Belt(b.clone())),
            BeltCollidable::UndergroundBelt(ub) => Ok(BeltConnectable::UndergroundBelt(ub.clone())),
            BeltCollidable::Splitter(s) => Ok(BeltConnectable::Splitter(s.clone())),
            BeltCollidable::LoaderLike(l) => Ok(BeltConnectable::LoaderLike(l.clone())),
            _ => Err(()),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Belt {
    pub direction: Direction,
    pub tier: BeltTier,
}

impl Belt {
    pub fn new(direction: Direction, tier: BeltTier) -> Self {
        Belt { direction, tier }
    }
}

impl From<Belt> for BeltCollidable {
    fn from(belt: Belt) -> Self {
        BeltCollidable::Belt(belt)
    }
}

impl BeltConnectableTrait for Belt {
    fn direction(&self) -> Direction {
        self.direction
    }
    fn tier(&self) -> BeltTier {
        self.tier
    }
    fn has_output(&self) -> bool {
        true
    }
    fn has_backwards_input(&self) -> bool {
        true
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UndergroundBelt {
    pub direction: Direction,
    pub tier: BeltTier,
    pub is_input: bool,
}

impl UndergroundBelt {
    pub fn new(direction: Direction, is_input: bool, tier: BeltTier) -> Self {
        UndergroundBelt {
            direction,
            tier,
            is_input,
        }
    }

    pub fn flip_self(&mut self) {
        self.is_input = !self.is_input;
        self.direction = self.direction.opposite();
    }

    pub fn shape_direction(&self) -> Direction {
        if self.is_input {
            self.direction.opposite()
        } else {
            self.direction
        }
    }
}

impl From<UndergroundBelt> for BeltCollidable {
    fn from(ub: UndergroundBelt) -> Self {
        BeltCollidable::UndergroundBelt(ub)
    }
}

impl BeltConnectableTrait for UndergroundBelt {
    fn direction(&self) -> Direction {
        self.direction
    }
    fn tier(&self) -> BeltTier {
        self.tier
    }
    fn has_output(&self) -> bool {
        !self.is_input
    }
    fn has_backwards_input(&self) -> bool {
        self.is_input
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LoaderLike {
    pub direction: Direction,
    pub tier: BeltTier,
    pub is_input: bool,
}

impl LoaderLike {
    pub fn new(direction: Direction, is_input: bool, tier: BeltTier) -> Self {
        LoaderLike {
            direction,
            tier,
            is_input,
        }
    }

    pub fn shape_direction(&self) -> Direction {
        if self.is_input {
            self.direction.opposite()
        } else {
            self.direction
        }
    }
}

impl From<LoaderLike> for BeltCollidable {
    fn from(loader: LoaderLike) -> Self {
        BeltCollidable::LoaderLike(loader)
    }
}

impl BeltConnectableTrait for LoaderLike {
    fn direction(&self) -> Direction {
        self.direction
    }
    fn tier(&self) -> BeltTier {
        self.tier
    }
    fn has_output(&self) -> bool {
        !self.is_input
    }
    fn has_backwards_input(&self) -> bool {
        self.is_input
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Splitter {
    pub direction: Direction,
    pub tier: BeltTier,
}

impl Splitter {
    pub fn new(direction: Direction, tier: BeltTier) -> Self {
        Splitter { direction, tier }
    }
}

impl From<Splitter> for BeltCollidable {
    fn from(splitter: Splitter) -> Self {
        BeltCollidable::Splitter(splitter)
    }
}

impl BeltConnectableTrait for Splitter {
    fn direction(&self) -> Direction {
        self.direction
    }
    fn tier(&self) -> BeltTier {
        self.tier
    }
    fn has_output(&self) -> bool {
        true
    }
    fn has_backwards_input(&self) -> bool {
        true
    }
}

#[cfg(test)]
mod tests {
    use crate::BeltConnectable;
    use crate::belts::{BLUE_BELT, Belt, RED_BELT, UndergroundBelt, YELLOW_BELT};
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
        let belt_connectable = BeltConnectable::Belt(belt);
        assert_eq!(belt_connectable.output_direction(), Some(South));

        let underground_input = UndergroundBelt {
            direction: North,
            tier: YELLOW_BELT,
            is_input: true,
        };
        let belt_connectable = BeltConnectable::UndergroundBelt(underground_input);
        assert_eq!(belt_connectable.output_direction(), None);

        let underground_output = UndergroundBelt {
            direction: North,
            tier: YELLOW_BELT,
            is_input: false,
        };
        let belt_connectable = BeltConnectable::UndergroundBelt(underground_output);
        assert_eq!(belt_connectable.output_direction(), Some(North));
    }
}
