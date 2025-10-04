use super::{DragDirection, DragState, Error};
use crate::belts::BeltTier;
use crate::smart_belt::DragWorldView;
use crate::world::{ReadonlyWorld, WorldImpl};
use crate::{BeltConnections, TilePosition};
use crate::{Direction, Ray, smart_belt::Action};

pub struct DragStepResult(pub Action, pub Option<Error>, pub DragState);

/// Handles dragging in a straight line (no rotations).
pub struct LineDrag<'a> {
    pub(super) world: &'a mut WorldImpl,
    pub(super) ray: Ray,
    pub(super) tier: BeltTier,
    pub(super) last_state: DragState,
    pub(super) last_position: i32,
    // Some tiles we just placed may change other belt's curvature; however we
    // want the logic to be independent of what we've placed. As such, we track
    // the history of tiles we've replaced. It suffices only to keep track of
    // one tile (the last placed output belt).
    // See belt_curving.rs for more info
    tile_history: Option<BeltConnections>,

    // Last entity built tracking, for "resuming" underground belt
    pub(super) max_placement: i32,
    pub(super) min_placement: i32,
    pub(super) furthest_placement_direction: DragDirection,

    // Position tracking for rotation: how far have we dragged?
    pub(super) max_pos: i32,
    pub(super) min_pos: i32,
    pub(super) rotation_pivot_direction: DragDirection,

    pub(super) error_handler: Box<dyn FnMut(TilePosition, Error) + 'a>,
}

impl<'a> LineDrag<'a> {
    /// Starts a drag.
    /// Note: the very first click may fast-replace something, forcing something to be overwritten.
    pub fn start_drag(
        world: &'a mut WorldImpl,
        tier: BeltTier,
        start_pos: TilePosition,
        belt_direction: Direction,
        first_belt_direction: Direction,
        mut error_handler: impl FnMut(TilePosition, Error) + 'a,
    ) -> LineDrag<'a> {
        let can_place = world.can_place_or_fast_replace_belt(start_pos);
        let tile_history = can_place.then(|| world.belt_connections_at(start_pos));

        if can_place {
            world.place_belt(start_pos, first_belt_direction, tier);
        } else {
            error_handler(start_pos, Error::EntityInTheWay);
        }

        let initial_state = DragState::initial_state(can_place);

        LineDrag {
            world,
            ray: Ray::new(start_pos, belt_direction),
            tier,
            last_state: initial_state,
            last_position: 0,
            tile_history,
            max_placement: 0,
            min_placement: 0,
            furthest_placement_direction: DragDirection::Forward,
            max_pos: 0,
            min_pos: 0,
            rotation_pivot_direction: DragDirection::Forward,
            error_handler: Box::new(error_handler),
        }
    }

    pub fn next_position(&self, direction: DragDirection) -> i32 {
        self.last_position + direction.direction_multiplier()
    }

    /// Main entry point for the drag operation.
    pub fn interpolate_to(&mut self, new_position: TilePosition) {
        let target_pos = self.ray.ray_position(new_position);
        while self.last_position < target_pos {
            let result = self.last_state.step(self, DragDirection::Forward);
            self.apply_step(result, DragDirection::Forward);
        }
        while self.last_position > target_pos {
            let result = self.last_state.step(self, DragDirection::Backward);
            self.apply_step(result, DragDirection::Backward);
        }
        self.update_furthest_position(target_pos);
    }

    fn apply_step(&mut self, step: DragStepResult, direction: DragDirection) {
        let DragStepResult(action, error, next_state) = step;
        eprintln!("action: {:?}", action);
        let next_position = self.next_position(direction);
        if action != Action::None {
            self.update_furthest_placement(next_position, direction)
        }
        self.apply_action(action, direction);

        if let Some(error) = self.last_state.deferred_error(direction) {
            self.add_error(error, direction);
        }
        if let Some(error) = error {
            self.add_error(error, direction);
        }

        eprintln!("Next state: {:?}\n", next_state);
        self.last_state = next_state;
        self.last_position = next_position;
    }

    fn store_tile_history(&mut self, position: i32) {
        let world_pos = self.ray.get_position(position);
        let tile_history = self.world.belt_connections_at(world_pos);
        self.tile_history = Some(tile_history);
        eprintln!("New tile history: {:?}", self.tile_history);
    }

    fn update_furthest_placement(&mut self, position: i32, direction: DragDirection) {
        match direction {
            DragDirection::Forward => {
                if position > self.max_placement {
                    self.max_placement = position;
                    self.store_tile_history(position);
                    self.furthest_placement_direction = DragDirection::Forward;
                }
            }
            DragDirection::Backward => {
                if position < self.min_placement {
                    self.min_placement = position;
                    self.store_tile_history(position);
                    self.furthest_placement_direction = DragDirection::Backward;
                }
            }
        };
    }

    fn update_furthest_position(&mut self, target_pos: i32) {
        if target_pos > self.max_pos {
            self.max_pos = target_pos;
            self.rotation_pivot_direction = DragDirection::Forward;
        }
        if target_pos < self.min_pos {
            self.min_pos = target_pos;
            self.rotation_pivot_direction = DragDirection::Backward;
        }
    }

    pub fn get_furthest_placement(&self) -> i32 {
        match self.furthest_placement_direction {
            DragDirection::Forward => self.max_placement,
            DragDirection::Backward => self.min_placement,
        }
    }

    pub fn get_rotation_pivot(&self) -> (TilePosition, bool) {
        let furthest_pos = match self.rotation_pivot_direction {
            DragDirection::Forward => self.max_pos,
            DragDirection::Backward => self.min_pos,
        };
        (
            self.ray.get_position(furthest_pos),
            self.rotation_pivot_direction == DragDirection::Backward,
        )
    }

    pub(super) fn drag_world_view(&self, direction: DragDirection) -> DragWorldView<'_> {
        let tile_history = self
            .tile_history
            .map(|h| (self.ray.get_position(self.get_furthest_placement()), h));
        DragWorldView::new(self.world, self.ray, tile_history, direction)
    }

    pub(super) fn add_error(&mut self, error: Error, direction: DragDirection) {
        eprintln!("error: {:?}", error);
        let position = self.ray.get_position(self.next_position(direction));
        (self.error_handler)(position, error);
    }
}

pub struct FullDrag<'a> {
    line_drag: Option<LineDrag<'a>>,
}

impl<'a> FullDrag<'a> {
    pub fn start_drag(
        &mut self,
        world: &'a mut WorldImpl,
        tier: BeltTier,
        start_pos: TilePosition,
        belt_direction: Direction,
        error_handler: impl FnMut(TilePosition, Error) + 'a,
    ) -> Self {
        Self {
            line_drag: Some(LineDrag::start_drag(
                world,
                tier,
                start_pos,
                belt_direction,
                belt_direction,
                error_handler,
            )),
        }
    }

    pub fn interpolate_to(&mut self, new_position: TilePosition) {
        if let Some(line_drag) = &mut self.line_drag {
            line_drag.interpolate_to(new_position);
        }
    }

    pub fn rotate(&mut self, position: TilePosition) -> bool {
        let line_drag = self.line_drag.as_ref().unwrap();

        let ray = line_drag.ray;
        let turn_direction = match ray.relative_direction(position) {
            Some(dir) => dir,
            None => {
                return false;
            }
        };

        let (pivot, backward) = line_drag.get_rotation_pivot();
        let old_direction = ray.direction;
        let (new_belt_direction, first_belt_direction) = if backward {
            (turn_direction.opposite(), old_direction)
        } else {
            (turn_direction, turn_direction)
        };

        let line_drag = self.line_drag.take().unwrap();
        let tier = line_drag.tier;
        let mut new_line_drag = LineDrag::start_drag(
            line_drag.world,
            tier,
            pivot,
            new_belt_direction,
            first_belt_direction,
            line_drag.error_handler,
        );
        new_line_drag.interpolate_to(position);

        self.line_drag = Some(new_line_drag);
        true
    }
}
