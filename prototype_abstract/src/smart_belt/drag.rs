use super::{DragDirection, DragState, Error};
use crate::belts::BeltTier;
use crate::smart_belt::{DragWorldView, belt_curving::TileHistory};
use crate::world::{ReadonlyWorld, WorldImpl};
use crate::{BeltConnections, TilePosition};
use crate::{Direction, Ray, smart_belt::Action};
use log::debug;

pub struct DragStepResult(pub Action, pub DragState, pub Option<Error>);

/// Context for drag operations, containing all read-only state needed for decision-making.
pub struct DragContext<'a> {
    pub world: &'a dyn ReadonlyWorld,
    pub ray: Ray,
    pub tier: BeltTier,
    pub last_position: i32,
    pub tile_history: Vec<TileHistory>,
    pub furthest_placement_pos: i32,
    pub direction: DragDirection,
}

impl<'a> DragContext<'a> {
    pub fn next_position(&self) -> i32 {
        self.last_position + self.direction.direction_multiplier()
    }

    pub fn direction_multiplier(&self) -> i32 {
        self.direction.direction_multiplier()
    }

    pub(super) fn drag_world_view(&self) -> DragWorldView<'_> {
        DragWorldView::new(self.world, self.ray, &self.tile_history, self.direction)
    }
}

/// Handles dragging in a straight line (no rotations).
pub struct LineDrag<'a> {
    pub(super) world: &'a mut WorldImpl,
    pub(super) ray: Ray,
    pub(super) tier: BeltTier,
    last_state: DragState,
    last_position: i32,
    // Some tiles we just placed may change other belt's curvature; however we
    // want the logic to be independent of what we've placed. As such, we track
    // the history of tiles we've replaced. It suffices only to keep track of
    // one tile (the last placed output belt).
    // See belt_curving.rs for more info
    tile_history: Option<BeltConnections>,
    // After rotation, we also may want the last placed belt of the previous rotation in tile history.
    last_end_tile_history: Option<(TilePosition, BeltConnections)>,

    // Last entity built, for "resuming" underground belt and tile history
    pub(super) max_placement: i32,
    pub(super) min_placement: i32,
    pub(super) furthest_placement_direction: DragDirection,

    // Position tracking for rotation: how far have we dragged?
    pub(super) max_pos: i32,
    pub(super) min_pos: i32,
    pub(super) rotation_pivot_direction: DragDirection,
}

impl<'a> LineDrag<'a> {
    /// Starts a drag.
    /// The very first click may fast-replace something, forcing something to be overwritten.
    fn new_drag(
        world: &'a mut WorldImpl,
        error_handler: &mut dyn FnMut(TilePosition, Error),
        tier: BeltTier,
        start_pos: TilePosition,
        belt_direction: Direction,
        first_belt_direction: Direction,
        allow_fast_replace: bool,
    ) -> LineDrag<'a> {
        let can_place =
            world.can_place_or_fast_replace_belt(start_pos, belt_direction, allow_fast_replace);
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
            last_end_tile_history: None,
            max_placement: 0,
            min_placement: 0,
            furthest_placement_direction: DragDirection::Forward,
            max_pos: 0,
            min_pos: 0,
            rotation_pivot_direction: DragDirection::Forward,
        }
    }

    /// Starts a drag.
    /// The very first click may fast-replace something, forcing something to be overwritten.
    pub fn start_drag(
        world: &'a mut WorldImpl,
        error_handler: &mut dyn FnMut(TilePosition, Error),
        tier: BeltTier,
        start_pos: TilePosition,
        belt_direction: Direction,
    ) -> LineDrag<'a> {
        Self::new_drag(
            world,
            error_handler,
            tier,
            start_pos,
            belt_direction,
            belt_direction,
            true,
        )
    }

    pub fn rotate(
        self,
        error_handler: &mut dyn FnMut(TilePosition, Error),
        cursor_pos: TilePosition,
    ) -> (Self, bool) {
        let turn_direction = match self.ray.relative_direction(cursor_pos) {
            Some(dir) => dir,
            None => {
                return (self, false);
            }
        };

        let (pivot, backward) = self.get_rotation_pivot();
        let old_direction = self.ray.direction;
        let (new_belt_direction, first_belt_direction) = if backward {
            (turn_direction.opposite(), old_direction)
        } else {
            (turn_direction, turn_direction)
        };

        let last_tile_history = if let Some(connections) = self.tile_history
            && self.furthest_placement_pos() == self.last_position
        {
            let world_pos = self.ray.get_position(self.last_position);
            Some((world_pos, connections))
        } else {
            None
        };

        let mut new_line_drag = LineDrag::new_drag(
            self.world,
            error_handler,
            self.tier,
            pivot,
            new_belt_direction,
            first_belt_direction,
            false,
        );
        new_line_drag.last_end_tile_history = last_tile_history;
        new_line_drag.interpolate_to(error_handler, cursor_pos);

        (new_line_drag, true)
    }

    /// Main entry point for the drag operation.
    pub fn interpolate_to(
        &mut self,
        error_handler: &mut dyn FnMut(TilePosition, Error),
        new_position: TilePosition,
    ) {
        let target_pos = self.ray.ray_position(new_position);
        while self.last_position < target_pos {
            let ctx = self.create_context(DragDirection::Forward);
            let result = self.last_state.step(&ctx);
            self.apply_step(error_handler, result, DragDirection::Forward);
        }
        while self.last_position > target_pos {
            let ctx = self.create_context(DragDirection::Backward);
            let result = self.last_state.step(&ctx);
            self.apply_step(error_handler, result, DragDirection::Backward);
        }
        self.update_furthest_position(target_pos);
    }

    fn apply_step(
        &mut self,
        error_handler: &mut dyn FnMut(TilePosition, Error),
        step: DragStepResult,
        direction: DragDirection,
    ) {
        let DragStepResult(action, next_state, error) = step;
        debug!("action: {:?}", action);
        let next_position = self.create_context(direction).next_position();
        if action != Action::None {
            self.update_furthest_placement(next_position, direction)
        }
        self.apply_action(error_handler, action, direction);

        if let Some(error) = error {
            self.add_error(error_handler, error, direction);
        }

        debug!("Next state: {:?}\n", next_state);
        self.last_state = next_state;
        self.last_position = next_position;
    }

    fn store_tile_history(&mut self, position: i32) {
        let world_pos = self.ray.get_position(position);
        let tile_history = self.world.belt_connections_at(world_pos);
        self.tile_history = Some(tile_history);
        debug!("New tile history: {:?}", self.tile_history);
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

    pub(super) fn get_rotation_pivot(&self) -> (TilePosition, bool) {
        let furthest_pos = match self.rotation_pivot_direction {
            DragDirection::Forward => self.max_pos,
            DragDirection::Backward => self.min_pos,
        };
        (
            self.ray.get_position(furthest_pos),
            self.rotation_pivot_direction == DragDirection::Backward,
        )
    }

    /// Used for tile history.
    pub fn furthest_placement_pos(&self) -> i32 {
        match self.furthest_placement_direction {
            DragDirection::Forward => self.max_placement,
            DragDirection::Backward => self.min_placement,
        }
    }

    #[inline]
    pub(super) fn create_context(&self, direction: DragDirection) -> DragContext<'_> {
        let tile_history = self
            .tile_history
            .map(|h| (self.ray.get_position(self.furthest_placement_pos()), h))
            .into_iter()
            .chain(self.last_end_tile_history)
            .collect::<Vec<_>>();
        DragContext {
            world: self.world as &dyn ReadonlyWorld,
            ray: self.ray,
            tier: self.tier,
            last_position: self.last_position,
            tile_history,
            furthest_placement_pos: match direction {
                DragDirection::Forward => self.max_placement,
                DragDirection::Backward => self.min_placement,
            },
            direction,
        }
    }

    pub(super) fn add_error(
        &mut self,
        error_handler: &mut dyn FnMut(TilePosition, Error),
        error: Error,
        direction: DragDirection,
    ) {
        debug!("error: {:?}", error);
        let position = self
            .ray
            .get_position(self.create_context(direction).next_position());
        error_handler(position, error);
    }
}
