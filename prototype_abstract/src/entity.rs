use dyn_clone::DynClone;
use dyn_eq::DynEq;
use std::{any::Any, fmt::Debug};

pub trait Entity: Any + Debug + DynEq + DynClone + Send {}
dyn_eq::eq_trait_object!(Entity);
dyn_clone::clone_trait_object!(Entity);

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Colliding;
impl Colliding {
    pub fn new() -> Box<Self> {
        Box::new(Colliding)
    }
}
impl Entity for Colliding {}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Impassable;
impl Impassable {
    pub fn new() -> Box<Self> {
        Box::new(Impassable)
    }
}
impl Entity for Impassable {}

impl dyn Entity {
    pub fn as_colliding(&self) -> Option<&Colliding> {
        self.as_any().downcast_ref::<Colliding>()
    }
}
