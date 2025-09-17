use std::ops::Deref;

use crate::geometry::{Direction, Position};

#[derive(Debug)]
pub struct BeltTierData {
    pub name: String,
    pub underground_length: u8,
}

#[derive(Debug, Clone, Copy)]
pub struct BeltTier(pub &'static BeltTierData);

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

#[derive(Debug, Clone)]
pub struct Belt {
    pub direction: Direction,
    pub tier: BeltTier,
}

#[derive(Debug, Clone)]
pub struct UndergroundBelt {
    pub direction: Direction,
    pub is_input: bool,
    pub belt_tier: BeltTier,
}

impl UndergroundBelt {
    pub fn is_output(&self) -> bool {
        !self.is_input
    }

    pub fn get_shape_direction(&self) -> Direction {
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
    pub position: Position,
}

#[derive(Debug, Clone)]
pub struct LoaderLike {
    pub direction: Direction,
    pub position: Position,
    pub is_input: bool,
}

#[derive(Debug, Clone)]
pub enum Entity {
    Belt(Belt),
    UndergroundBelt(UndergroundBelt),
    Splitter(Splitter),
    LoaderLike(LoaderLike),
}
