use crate::BeltCollidable;
use crate::BeltConnectable;
use log::debug;

use super::{Action, RaySense, SmartBeltWorldView, TileClassifier, TileType, action::Error};

#[derive(Debug, Clone)]
pub struct LastBuiltEntity {
    pub entity: BeltConnectable,
    pub position: i32,
    pub was_overbuild: bool,
}

impl LastBuiltEntity {
    pub fn from_build(entity: BeltConnectable, position: i32) -> Self {
        Self {
            entity,
            position,
            was_overbuild: false,
        }
    }
    pub fn from_overbuild(entity: BeltConnectable, position: i32) -> Self {
        Self {
            entity,
            position,
            was_overbuild: true,
        }
    }
}

pub(super) struct DragStepResult(pub(super) Action, pub(super) Option<Error>);

/// The shape of the furthermost stop end of the current belt line, after factoring in direction.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) enum DragEndShape {
    /// Ends with a belt.
    Belt,
    /// Ends with a belt entity, that we may _not_ replace with an underground belt.
    IntegratedOutput,
    /// An output underground belt. We should extend this if there's an obstacle in front.
    ExtendableUnderground { input_pos: i32 },
    /// An obstacle; we did _not_ just place or integrate a belt.
    /// input_pos is the last available entrance position.
    /// output_pos is not none if we've created an underground already.
    TraversingObstacle {
        input_pos: i32,
        output_pos: Option<i32>,
    },
    /// We are over an obstacle, which we've determined we can not go past. Error if trying to enter any new belt
    OverImpassableObstacle { ray_sense: RaySense },
    /// Error. We will enter any belt we see.
    Error,
}

pub(super) fn get_drag_end_shape(
    last_built_entity: Option<&LastBuiltEntity>,
    over_impassable: Option<RaySense>,
    view: &SmartBeltWorldView,
) -> Option<DragEndShape> {
    if let Some(sense) = over_impassable {
        return Some(DragEndShape::OverImpassableObstacle { ray_sense: sense });
    }
    let Some(lbe) = last_built_entity else {
        return Some(DragEndShape::Error);
    };
    match &lbe.entity {
        BeltConnectable::Splitter(_) | BeltConnectable::LoaderLike(_) => {
            Some(DragEndShape::IntegratedOutput)
        }
        BeltConnectable::Belt(_) => get_belt_end_shape(lbe.position, view),
        BeltConnectable::UndergroundBelt(ug) => {
            let pair_pos = view.get_ug_pair_pos(lbe.position, ug);
            let pos = lbe.position;
            // let maybe_integrated = pos != view.sense_furthest_pos;
            // if maybe_integrated != lbe.was_overbuild {
            //     debug!(
            //         "==== MISMATCH ==== pos={} sense_furthest_pos={} was_overbuild={}",
            //         pos, view.sense_furthest_pos, lbe.was_overbuild
            //     );
            // }
            if lbe.was_overbuild {
                get_end_shape_integrated_underground(pos, pair_pos, view)
            } else {
                get_end_shape_built_underground(pos, pair_pos, view)
            }
        }
    }
}

fn get_belt_end_shape(lbe_position: i32, view: &SmartBeltWorldView) -> Option<DragEndShape> {
    debug!(
        "Get belt end shape: lbe_position={} last_position={}",
        lbe_position,
        view.last_position()
    );
    if lbe_position == view.last_position() {
        return Some(DragEndShape::Belt);
    }
    let diff = (view.last_position() - lbe_position) * view.step_sign();
    if diff > 0 {
        Some(DragEndShape::TraversingObstacle {
            input_pos: lbe_position,
            output_pos: None,
        })
    } else {
        None
    }
}

fn get_end_shape_integrated_underground(
    output_pos: i32,
    pair_pos: Option<i32>,
    view: &SmartBeltWorldView,
) -> Option<DragEndShape> {
    let Some(input_pos) = pair_pos else {
        return Some(DragEndShape::Error);
    };
    let (min, max) = if input_pos < output_pos {
        (input_pos, output_pos)
    } else {
        (output_pos, input_pos)
    };

    if view.step_sign() > 0 && view.last_position() == max
        || view.step_sign() < 0 && view.last_position() == min
    {
        Some(DragEndShape::IntegratedOutput)
    } else if (min..=max).contains(&view.last_position()) {
        None
    } else {
        Some(DragEndShape::Error)
    }
}

fn get_end_shape_built_underground(
    output_pos: i32,
    pair_pos: Option<i32>,
    view: &SmartBeltWorldView,
) -> Option<DragEndShape> {
    let Some(input_pos) = pair_pos else {
        return Some(DragEndShape::Error);
    };

    let original_sense = if view.ray.is_before(input_pos, output_pos) {
        RaySense::Forward
    } else {
        RaySense::Backward
    };

    if view.ray_sense == original_sense {
        if output_pos == view.last_position() {
            Some(DragEndShape::ExtendableUnderground { input_pos })
        } else {
            Some(DragEndShape::TraversingObstacle {
                input_pos,
                output_pos: Some(output_pos),
            })
        }
    } else if view.last_position() == input_pos {
        Some(DragEndShape::IntegratedOutput)
    } else {
        None
    }
}

pub(super) fn step(
    last_built_entity: Option<&LastBuiltEntity>,
    over_impassable: Option<RaySense>,
    view: &SmartBeltWorldView,
) -> DragStepResult {
    let Some(drag_end) = get_drag_end_shape(last_built_entity, over_impassable, view) else {
        debug!("Do nothing");
        return DragStepResult(Action::None, None);
    };
    debug!("drag_end: {drag_end:?}");
    let next_tile = TileClassifier::new(
        view,
        drag_end.can_enter_next_tile(),
        drag_end.underground_input_pos(view.last_position()),
        drag_end.is_error_state(),
    )
    .classify_next_tile();
    debug!("Tile type: {:?}", next_tile);
    match next_tile {
        TileType::Usable => drag_end.place_belt_or_underground(view),
        TileType::IntegratedSplitter => DragStepResult(
            Action::IntegrateSplitter,
            drag_end.error_on_impassable_exit(view),
        ),
        TileType::IntegratedUnderground { output_pos } => {
            drag_end.integrate_underground_pair(view, output_pos)
        }
        TileType::Obstacle => drag_end.handle_obstacle(view),
        TileType::ImpassableObstacle => drag_end.handle_impassable_obstacle(view),
    }
}

impl DragEndShape {
    fn can_enter_next_tile(&self) -> bool {
        !matches!(*self, DragEndShape::TraversingObstacle { .. })
    }
    fn underground_input_pos(&self, last_position: i32) -> Option<i32> {
        match *self {
            DragEndShape::Belt => Some(last_position),
            DragEndShape::ExtendableUnderground { input_pos } => Some(input_pos),
            DragEndShape::TraversingObstacle { input_pos, .. } => Some(input_pos),
            _ => None,
        }
    }
    fn is_error_state(&self) -> bool {
        matches!(
            *self,
            DragEndShape::Error | DragEndShape::OverImpassableObstacle { .. }
        )
    }

    fn place_belt_or_underground(&self, view: &SmartBeltWorldView) -> DragStepResult {
        if let Some(err) = self.error_on_impassable_exit(view) {
            DragStepResult(Action::PlaceBelt, Some(err))
        } else {
            match *self {
                DragEndShape::TraversingObstacle {
                    input_pos,
                    output_pos,
                } => Self::place_underground(view, input_pos, output_pos),
                _ => DragStepResult(Action::PlaceBelt, None),
            }
        }
    }

    fn place_underground(
        view: &SmartBeltWorldView,
        input_pos: i32,
        last_output_pos: Option<i32>,
    ) -> DragStepResult {
        let next_position = view.next_position();
        if let Err(error) = can_build_underground(view, input_pos, last_output_pos) {
            DragStepResult(Action::PlaceBelt, Some(error))
        } else {
            let action = if let Some(last_output_pos) = last_output_pos {
                Action::ExtendUnderground {
                    last_output_pos,
                    new_output_pos: next_position,
                }
            } else {
                Action::CreateUnderground {
                    input_pos,
                    output_pos: next_position,
                }
            };
            DragStepResult(action, None)
        }
    }

    fn integrate_underground_pair(
        &self,
        view: &SmartBeltWorldView,
        output_pos: i32,
    ) -> DragStepResult {
        let err = self.error_on_impassable_exit(view);
        DragStepResult(Action::IntegrateUndergroundPair { output_pos }, err)
    }

    fn handle_obstacle(&self, _view: &SmartBeltWorldView) -> DragStepResult {
        let (action, error) = match *self {
            DragEndShape::Belt
            | DragEndShape::ExtendableUnderground { .. }
            | DragEndShape::TraversingObstacle { .. } => (Action::None, None),
            DragEndShape::IntegratedOutput => (Action::ClearEntity, Some(Error::EntityInTheWay)),
            DragEndShape::Error => (Action::ClearEntity, None),
            DragEndShape::OverImpassableObstacle { ray_sense } => {
                (Action::SetImpassable(ray_sense), None)
            }
        };
        DragStepResult(action, error)
    }

    fn handle_impassable_obstacle(&self, view: &SmartBeltWorldView) -> DragStepResult {
        let ray_sense = match *self {
            DragEndShape::OverImpassableObstacle { ray_sense } => ray_sense,
            _ => view.ray_sense,
        };
        DragStepResult(Action::SetImpassable(ray_sense), None)
    }

    fn error_on_impassable_exit(&self, view: &SmartBeltWorldView) -> Option<Error> {
        match *self {
            DragEndShape::OverImpassableObstacle { ray_sense } if ray_sense == view.ray_sense => {
                Some(Error::BeltLineBroken)
            }
            _ => None,
        }
    }
}

/// Checks if creating an underground belt connection will be valid between
/// input and output positions.
fn check_underground_path(
    view: &SmartBeltWorldView,
    input_pos: i32,
    output_pos: i32,
    check_from_pos: i32,
) -> Result<(), Error> {
    // Check distance limit
    let distance = output_pos.abs_diff(input_pos);
    if distance > view.tier.underground_distance.into() {
        return Err(Error::TooFarToConnect);
    }

    let (start, end) = (
        check_from_pos.min(output_pos) + 1,
        check_from_pos.max(output_pos) - 1,
    );

    for pos in start..=end {
        let entity = view.world.get(view.ray.get_position(pos));
        if let Some(entity) = entity {
            // Check for impassable obstacles
            if entity.is_impassable_tile() {
                return Err(Error::BeltLineBroken);
            }
            // Check for intercepting underground belts
            if let BeltCollidable::UndergroundBelt(ug) = entity
                && ug.direction.axis() == view.ray.direction.axis()
                && ug.tier == view.tier
            {
                return Err(Error::BeltLineBroken);
            }
        }
    }

    Ok(())
}

/// Checks there are no problems with building this underground.
pub(super) fn can_build_underground(
    view: &SmartBeltWorldView,
    input_pos: i32,
    last_output_pos: Option<i32>,
) -> Result<(), Error> {
    let output_pos = view.next_position();
    let check_from_pos = last_output_pos.unwrap_or(input_pos);

    check_underground_path(view, input_pos, output_pos, check_from_pos)
}

/// Checks if an existing underground can be upgraded/integrated.
pub(super) fn can_upgrade_underground(view: &SmartBeltWorldView, output_pos: i32) -> bool {
    let input_pos = view.next_position();

    check_underground_path(view, input_pos, output_pos, input_pos).is_ok()
}
