use crate::world::{BeltConnections, ReadonlyWorld};
use crate::{Belt, BeltConnectableEnum, Direction, Entity, TilePosition, UndergroundBelt};

pub type TileHistory = (TilePosition, BeltConnections);

pub trait BeltCurveView {
    fn output_direction_at(&self, position: TilePosition) -> Option<Direction>;
    fn input_direction_at(&self, position: TilePosition) -> Option<Direction>;

    fn belt_connections_at(&self, position: TilePosition) -> BeltConnections {
        BeltConnections {
            input: self.input_direction_at(position),
            output: self.output_direction_at(position),
        }
    }

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
            .is_some_and(|d| d.axis() != belt.direction.axis())
    }
}

pub struct TileHistoryView<'a> {
    world: &'a dyn ReadonlyWorld,
    tile_history: &'a [TileHistory],
}

impl<'a> TileHistoryView<'a> {
    pub fn new(world: &'a dyn ReadonlyWorld, tile_history: &'a [TileHistory]) -> Self {
        Self {
            world,
            tile_history,
        }
    }
}

impl<'a> ReadonlyWorld for TileHistoryView<'a> {
    fn get(&self, position: TilePosition) -> Option<&dyn Entity> {
        self.world.get(position)
    }

    fn get_belt(&self, position: TilePosition) -> Option<BeltConnectableEnum<'_>> {
        self.world.get_belt(position)
    }

    fn get_ug_pair(
        &self,
        position: TilePosition,
        underground: &UndergroundBelt,
    ) -> Option<(TilePosition, &UndergroundBelt)> {
        self.world.get_ug_pair(position, underground)
    }
    fn output_direction_at(&self, position: TilePosition) -> Option<Direction> {
        self.tile_history
            .iter()
            .find(|(history_position, _)| *history_position == position)
            .map(|(_, dirs)| dirs.output)
            .unwrap_or_else(|| self.world.output_direction_at(position))
    }

    fn input_direction_at(&self, position: TilePosition) -> Option<Direction> {
        if let Some((_, dirs)) = self
            .tile_history
            .iter()
            .find(|(history_position, _)| *history_position == position)
        {
            dirs.input
        } else {
            let entity = self
                .get(position)
                .and_then(|entity| entity.as_belt_connectable_dyn())?;
            if let Some(belt) = (entity as &dyn Entity).as_belt() {
                Some(self.belt_curved_input_direction(position, belt.direction))
            } else {
                entity.primary_input_direction()
            }
        }
    }
    
}
