use std::collections::HashMap;

use crate::{Entity, Position};

#[derive(Debug)]
pub struct World {
    entities: HashMap<Position, Entity>,
}

impl World {
    pub fn entity_at(&self, position: Position) -> Option<&Entity> {
        self.entities.get(&position)
    }

    pub fn set(&mut self, position: Position, entity: Entity) {
        self.entities.insert(position, entity);
    }
}
