use std::collections::HashMap;

use crate::{BoundingBox, Entity, Position, PositionIteratorExt as _};

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct World {
    pub entities: HashMap<Position, Entity>,
}

impl World {
    pub fn new() -> Self {
        World {
            entities: HashMap::new(),
        }
    }

    pub fn get(&self, position: Position) -> Option<&Entity> {
        self.entities.get(&position)
    }

    pub fn set(&mut self, position: Position, entity: Entity) {
        self.entities.insert(position, entity);
    }

    pub fn bounds(&self) -> Option<BoundingBox> {
        self.entities.keys().copied().bounds()
    }
}
