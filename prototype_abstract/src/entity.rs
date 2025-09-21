use dyn_clone::DynClone;
use dyn_eq::DynEq;
use std::{any::Any, fmt::Debug};

pub trait Entity: Any + Debug + DynEq + DynClone {}
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
