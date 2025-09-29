use dyn_clone::clone_box;

use super::{DragState, DragStep, Error, NormalState};
use crate::belts::BeltTier;
use crate::smart_belt::Action;
use crate::{Direction, Ray, TileHistory, TilePosition, World, WorldReader};

/**
 * Handles line dragging; includes mutable methods
 */
#[derive(Debug)]
pub struct LineDrag<'a> {
    pub(super) world: &'a mut World,
    pub(super) ray: Ray,
    pub(super) tier: BeltTier,
    pub(super) last_state: DragState,
    pub(super) last_position: i32,
    // Some tiles we just placed may change other belt's curvature; however we
    // want the logic to be independent of what we've placed. As such, we track
    // the history of tiles we've replaced. It suffices only to keep track of
    // one tile (the last placed output belt).
    pub(super) tile_history: Option<TileHistory>,
    // for testing
    pub(super) errors: Vec<(TilePosition, Error)>,
}

impl<'a> LineDrag<'a> {
    pub fn start_drag(
        world: &'a mut World,
        tier: BeltTier,
        start_pos: TilePosition,
        belt_direction: Direction,
    ) -> LineDrag<'a> {
        let mut errors = Vec::new();
        let (last_state, tile_history) = if world.can_place_belt_on_tile(start_pos) {
            let tile_history = Self::get_tile_history(start_pos, world);
            world.place_belt(start_pos, belt_direction, tier);
            (NormalState::BeltPlaced, Some(tile_history))
        } else {
            errors.push((start_pos, Error::EntityInTheWay));
            (
                NormalState::ErrorState {
                    over_impassable: false,
                },
                None,
            )
        };

        LineDrag {
            world,
            ray: Ray::new(start_pos, belt_direction),
            tier,
            last_state: last_state.into(),
            last_position: 0,
            tile_history,
            errors,
        }
    }

    pub fn get_errors(self) -> Vec<(TilePosition, Error)> {
        self.errors
    }

    pub(super) fn get_tile_history(position: TilePosition, world: &World) -> TileHistory {
        let entity = world.get_belt_dyn(position).map(clone_box);
        (position, entity)
    }

    pub(super) fn record_tile_history(&mut self, position: i32) {
        let world_position = self.ray.get_position(position);
        self.tile_history = Some(Self::get_tile_history(world_position, self.world));
    }

    pub(super) fn next_position(&self, is_forward: bool) -> i32 {
        self.last_position + if is_forward { 1 } else { -1 }
    }

    fn step(&mut self, is_forward: bool) -> DragStep {
        let pos = self.next_position(is_forward);
        let world_pos = self.ray.get_position(pos);
        eprintln!("STEP: forward: {}, pos: {:?}", is_forward, world_pos);
        let next_entity = self.world.get(world_pos);
        eprintln!("Entity: {next_entity:?}");
        match &self.last_state {
            DragState::Normal(state) => self.normal_state_step(state, is_forward),
            &DragState::PassThrough { output_pos } => {
                let next_state = if self.next_position(is_forward) == output_pos {
                    NormalState::IntegratedOutput.into()
                } else {
                    self.last_state.clone()
                };
                DragStep(Action::None, None, next_state)
            }
        }
    }

    /// the only mutable functions are here!
    pub fn interpolate_to(&mut self, new_position: TilePosition) {
        let target_pos = self.ray.ray_position(new_position);
        while self.last_position < target_pos {
            let step = self.step(true);
            self.apply_step(step, true);
        }
        while self.last_position > target_pos {
            let step = self.step(false);
            self.apply_step(step, false);
        }
    }

    fn has_impassable_error(&self) -> bool {
        matches!(
            &self.last_state,
            DragState::Normal(NormalState::ErrorState {
                over_impassable: true,
            })
        )
    }

    fn apply_step(&mut self, step: DragStep, is_forward: bool) {
        let DragStep(action, error, next_state) = step;
        eprintln!("action: {:?}", action);
        self.apply_action(action, is_forward);

        if self.has_impassable_error() {
            self.add_error(Error::CannotTraversePastEntity, is_forward);
        }
        if let Some(error) = error {
            self.add_error(error, is_forward);
        }

        eprintln!("Next state: {:?}\n", next_state);
        self.last_state = next_state;
        self.last_position = self.next_position(is_forward);
    }

    fn add_error(&mut self, error: Error, is_forward: bool) {
        eprintln!("error: {:?}", error);
        self.errors
            .push((self.ray.get_position(self.next_position(is_forward)), error));
    }
}
