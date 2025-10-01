use crate::{Belt, BeltConnectable, Direction, Entity, TilePosition, UndergroundBelt, World};

pub trait BeltCurveView {
    fn output_direction_at(&self, position: TilePosition) -> Option<Direction>;

    fn input_direction_at(&self, position: TilePosition) -> Option<Direction>;

    /// Computes what direction a belt should be inputting from. Decides belt curvature.
    fn belt_curved_input_direction(
        &self,
        position: TilePosition,
        belt_direction: Direction,
    ) -> Direction {
        let has_input_in = |direction: Direction| {
            let query_pos = position - direction.to_vector();
            self.output_direction_at(query_pos) == Some(direction)
        };

        if has_input_in(belt_direction) {
            return belt_direction;
        }
        match (
            has_input_in(belt_direction.rotate_cw()),
            has_input_in(belt_direction.rotate_ccw()),
        ) {
            (true, false) => belt_direction.rotate_cw(),
            (false, true) => belt_direction.rotate_ccw(),
            _ => belt_direction,
        }
    }

    fn belt_is_curved_at(&self, position: TilePosition, belt: &Belt) -> bool {
        self.input_direction_at(position)
            .is_some_and(|d| d != belt.direction)
    }
}

impl BeltCurveView for World {
    fn output_direction_at(&self, position: TilePosition) -> Option<Direction> {
        self.get_belt_dyn(position)
            .and_then(|e| e.output_direction())
    }

    fn input_direction_at(&self, position: TilePosition) -> Option<Direction> {
        let entity = self.get_belt_dyn(position)?;
        if let Some(belt) = (entity as &dyn Entity).as_belt() {
            Some(self.belt_curved_input_direction(position, belt.direction))
        } else {
            entity.primary_input_direction()
        }
    }
}

pub type TileHistory = (TilePosition, Option<Box<dyn BeltConnectable>>);

#[derive(Debug)]
pub struct TileHistoryView<'a> {
    world: &'a World,
    tile_history: Option<&'a TileHistory>,
}

impl<'a> TileHistoryView<'a> {
    pub fn new(world: &'a World, tile_history: Option<&'a TileHistory>) -> Self {
        Self {
            world,
            tile_history,
        }
    }

    pub fn get_entity(&self, position: TilePosition) -> Option<&dyn Entity> {
        self.world.get(position)
    }

    pub fn get_ug_pair_pos(
        &self,
        position: TilePosition,
        underground: &UndergroundBelt,
    ) -> Option<TilePosition> {
        self.world.get_ug_pair(position, underground).map(|e| e.0)
    }
}

impl<'a> BeltCurveView for TileHistoryView<'a> {
    fn output_direction_at(&self, position: TilePosition) -> Option<Direction> {
        if let Some((history_position, entity_opt)) = self.tile_history
            && *history_position == position
        {
            entity_opt.as_ref().and_then(|b| b.output_direction())
        } else {
            self.world.output_direction_at(position)
        }
    }

    fn input_direction_at(&self, position: TilePosition) -> Option<Direction> {
        if let Some((history_position, entity_opt)) = self.tile_history
            && *history_position == position
        {
            entity_opt.as_ref().map(|b| b.direction())
        } else {
            let entity = self
                .get_entity(position)
                .and_then(|entity| entity.as_belt_connectable_dyn())?;
            if let Some(belt) = (entity as &dyn Entity).as_belt() {
                Some(self.belt_curved_input_direction(position, belt.direction))
            } else {
                entity.primary_input_direction()
            }
        }
    }
}
