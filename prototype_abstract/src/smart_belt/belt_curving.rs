use crate::world::{BeltConnections, ReadonlyWorld};
use crate::{BeltCollidable, BeltConnectable, Direction, TilePosition, UndergroundBelt};

pub type TileHistory = (TilePosition, BeltConnections);

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
    fn get(&self, position: TilePosition) -> Option<&BeltCollidable> {
        self.world.get(position)
    }

    fn get_belt(&self, position: TilePosition) -> Option<BeltConnectable> {
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
                .and_then(|entity| BeltConnectable::try_from(entity).ok())?;
            if let BeltConnectable::Belt(belt) = &entity {
                Some(self.belt_curved_input_direction(position, belt.direction))
            } else {
                entity.primary_input_direction()
            }
        }
    }
}
