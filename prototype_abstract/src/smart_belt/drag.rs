use super::{Error, RaySense, SmartBeltWorldView};
use super::drag_state::{DragStepResult, LastBuiltEntity, step};
use crate::belts::BeltTier;
use crate::world::WorldImpl;
use crate::{BeltConnectable, BeltConnections, TilePosition};
use crate::{Direction, Ray};
use log::debug;

/// Handles dragging in a straight line (no rotations).
pub struct LineDrag<'a> {
    pub(super) world: &'a mut WorldImpl,
    pub(super) ray: Ray,
    pub(super) tier: BeltTier,
    last_position: i32,
    // Some tiles we just placed may change other belt's curvature; however we
    // want the logic to be independent of what we've placed. As such, we track
    // the history of tiles we've replaced. It suffices only to keep track of
    // one tile (the last placed output belt).
    // See world_view.rs for more info
    tile_history: Option<BeltConnections>,
    // After rotation, we also may want the last placed belt of the previous rotation in tile history.
    last_end_tile_history: Option<(TilePosition, BeltConnections)>,

    pub(super) forward_placement: i32,
    pub(super) backward_placement: i32,
    pub(super) furthest_placement_direction: RaySense,

    pub(super) forward_pos: i32,
    pub(super) backward_pos: i32,
    pub(super) rotation_pivot_direction: RaySense,

    pub(super) last_built_entity: Option<LastBuiltEntity>,
    pub(super) over_impassable: Option<RaySense>,
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

        let ray = Ray::new(start_pos, belt_direction);
        let start_coord = ray.ray_position(start_pos);

        let last_built_entity = if can_place {
            let entity = world.place_belt(start_pos, first_belt_direction, tier);
            let connectable = BeltConnectable::try_from(entity).unwrap();
            Some(LastBuiltEntity::from_build(connectable, start_coord))
        } else {
            error_handler(start_pos, Error::EntityInTheWay);
            None
        };

        LineDrag {
            world,
            ray,
            tier,
            last_position: start_coord,
            tile_history,
            last_end_tile_history: None,
            forward_placement: start_coord,
            backward_placement: start_coord,
            furthest_placement_direction: RaySense::Forward,
            forward_pos: start_coord,
            backward_pos: start_coord,
            rotation_pivot_direction: RaySense::Forward,
            last_built_entity,
            over_impassable: None,
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

        let last_tile_history = if !backward
            && let Some(connections) = self.tile_history
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
        while self.ray.is_before(self.last_position, target_pos) {
            let view = self.create_world_view(RaySense::Forward);
            let result = step(self.last_built_entity.as_ref(), self.over_impassable, &view);
            self.apply_step(error_handler, result, RaySense::Forward);
        }
        while self.ray.is_before(target_pos, self.last_position) {
            let view = self.create_world_view(RaySense::Backward);
            let result = step(self.last_built_entity.as_ref(), self.over_impassable, &view);
            self.apply_step(error_handler, result, RaySense::Backward);
        }
        self.update_furthest_position(target_pos);
    }

    fn apply_step(
        &mut self,
        error_handler: &mut dyn FnMut(TilePosition, Error),
        result: DragStepResult,
        ray_sense: RaySense,
    ) {
        let DragStepResult(action, error) = result;
        debug!("action: {:?}", action);
        let next_position = self.last_position
            + self.ray.direction.axis_sign() * ray_sense.direction_multiplier();
        if action.is_placement() {
            self.update_furthest_placement(next_position, ray_sense)
        }
        self.apply_action(error_handler, action, next_position, ray_sense);

        if let Some(error) = error {
            let world_pos = self.ray.get_position(next_position);
            debug!("error: {:?}", error);
            error_handler(world_pos, error);
        }

        self.last_position = next_position;
    }

    fn store_tile_history(&mut self, position: i32) {
        let world_pos = self.ray.get_position(position);
        let tile_history = self.world.belt_connections_at(world_pos);
        self.tile_history = Some(tile_history);
        debug!("New tile history: {:?}", self.tile_history);
    }

    fn update_furthest_placement(&mut self, position: i32, ray_sense: RaySense) {
        match ray_sense {
            RaySense::Forward => {
                if self.ray.is_before(self.forward_placement, position) {
                    self.forward_placement = position;
                    self.store_tile_history(position);
                    self.furthest_placement_direction = RaySense::Forward;
                }
            }
            RaySense::Backward => {
                if self.ray.is_before(position, self.backward_placement) {
                    self.backward_placement = position;
                    self.store_tile_history(position);
                    self.furthest_placement_direction = RaySense::Backward;
                }
            }
        };
    }

    fn update_furthest_position(&mut self, target_pos: i32) {
        if self.ray.is_before(self.forward_pos, target_pos) {
            self.forward_pos = target_pos;
            self.rotation_pivot_direction = RaySense::Forward;
        }
        if self.ray.is_before(target_pos, self.backward_pos) {
            self.backward_pos = target_pos;
            self.rotation_pivot_direction = RaySense::Backward;
        }
    }

    pub(super) fn get_rotation_pivot(&self) -> (TilePosition, bool) {
        let furthest_pos = match self.rotation_pivot_direction {
            RaySense::Forward => self.forward_pos,
            RaySense::Backward => self.backward_pos,
        };
        (
            self.ray.get_position(furthest_pos),
            self.rotation_pivot_direction == RaySense::Backward,
        )
    }

    pub fn furthest_placement_pos(&self) -> i32 {
        match self.furthest_placement_direction {
            RaySense::Forward => self.forward_placement,
            RaySense::Backward => self.backward_placement,
        }
    }

    #[inline]
    pub(super) fn create_world_view(&self, ray_sense: RaySense) -> SmartBeltWorldView<'_> {
        let tile_history = self
            .tile_history
            .map(|h| (self.ray.get_position(self.furthest_placement_pos()), h))
            .into_iter()
            .chain(self.last_end_tile_history)
            .collect::<Vec<_>>();
        SmartBeltWorldView {
            world: self.world,
            ray: self.ray,
            tier: self.tier,
            last_position: self.last_position,
            tile_history,
            ray_sense,
        }
    }

    pub(super) fn report_error(
        error_handler: &mut dyn FnMut(TilePosition, Error),
        error: Error,
        world_pos: TilePosition,
    ) {
        debug!("error: {:?}", error);
        error_handler(world_pos, error);
    }
}
