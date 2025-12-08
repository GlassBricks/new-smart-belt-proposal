use crate::{Belt, LoaderLike, Splitter, UndergroundBelt};

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct CollidingEntityOrTile;

impl From<CollidingEntityOrTile> for BeltCollidable {
    fn from(c: CollidingEntityOrTile) -> Self {
        BeltCollidable::CollidingEntityOrTile(c)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct ImpassableTile;

impl From<ImpassableTile> for BeltCollidable {
    fn from(i: ImpassableTile) -> Self {
        BeltCollidable::ImpassableTile(i)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BeltCollidable {
    CollidingEntityOrTile(CollidingEntityOrTile),
    ImpassableTile(ImpassableTile),
    Belt(Belt),
    UndergroundBelt(UndergroundBelt),
    Splitter(Splitter),
    LoaderLike(LoaderLike),
}

impl BeltCollidable {
    pub fn is_impassable_tile(&self) -> bool {
        matches!(self, BeltCollidable::ImpassableTile(_))
    }
}
