use std::collections::HashMap;

use crate::{BoundingBox, Entity, Position, PositionIteratorExt as _};

#[derive(Debug, Default, PartialEq, Clone)]
pub struct World {
    pub entities: HashMap<Position, Box<dyn Entity>>,
}

impl World {
    pub fn new() -> Self {
        World {
            entities: HashMap::new(),
        }
    }

    pub fn get(&self, position: Position) -> Option<&dyn Entity> {
        self.entities.get(&position).map(|e| e.as_ref())
    }

    pub fn set(&mut self, position: Position, entity: Box<dyn Entity>) {
        self.entities.insert(position, entity);
    }

    pub fn remove(&mut self, position: Position) {
        self.entities.remove(&position);
    }

    pub fn bounds(&self) -> Option<BoundingBox> {
        self.entities.keys().copied().bounds()
    }
}
