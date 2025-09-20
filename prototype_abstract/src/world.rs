use std::collections::HashMap;

use crate::{Entity, Position};

#[derive(Debug, Clone, Default)]
pub struct Entities {
    entities: HashMap<Position, Entity>,
}

impl Entities {
    pub fn new() -> Self {
        Entities {
            entities: HashMap::new(),
        }
    }

    pub fn entity_at(&self, position: Position) -> Option<&Entity> {
        self.entities.get(&position)
    }

    pub fn add_entity(&mut self, position: Position, entity: Entity) {
        self.entities.insert(position, entity);
    }
}
