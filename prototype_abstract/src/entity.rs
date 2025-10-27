use dyn_clone::DynClone;
use dyn_eq::DynEq;
use std::{any::Any, fmt::Debug};

pub trait BeltCollidable: Any + Debug + DynEq + DynClone + Send + Sync {}
dyn_eq::eq_trait_object!(BeltCollidable);
dyn_clone::clone_trait_object!(BeltCollidable);

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CollidingEntityOrTile;
impl CollidingEntityOrTile {
    pub fn new() -> Box<Self> {
        Box::new(CollidingEntityOrTile)
    }
}
impl BeltCollidable for CollidingEntityOrTile {}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ImpassableTile;
impl ImpassableTile {
    pub fn new() -> Box<Self> {
        Box::new(ImpassableTile)
    }
}
impl BeltCollidable for ImpassableTile {}

impl dyn BeltCollidable {
    pub fn as_colliding(&self) -> Option<&CollidingEntityOrTile> {
        self.as_any().downcast_ref::<CollidingEntityOrTile>()
    }
}
