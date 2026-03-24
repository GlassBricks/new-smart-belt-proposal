use crate::BeltCollidable;
use crate::Ray;
use crate::smart_belt::drag::DragStepResult;
use log::debug;

use super::{Action, RaySense, SmartBeltWorldView, TileClassifier, TileType, action::Error};

/// The state of the current drag we store. Needs to work in both directions.
#[derive(Debug, Clone)]
pub enum DragState {
    /// We were hovering over a belt.
    OverBelt,
    /// We were hovering over a splitter.
    OverSplitter,
    /// We are hovering over, or have passed an obstacle, going in the given direction.
    /// output_pos is given if we've already placed an underground.
    BuildingUnderground {
        input_pos: i32,
        output_pos: Option<i32>,
        ray_sense: RaySense,
    },
    /// An underground belt we will integrate (and not extend); just "passing-through" it.
    /// near_pos = Forward-entry side, far_pos = Forward-exit side.
    PassThrough { near_pos: i32, far_pos: i32 },
    /// We are hovering over or have hovered over an impassable obstacle. Will error if we continue in the given direction.
    OverImpassable { ray_sense: RaySense },
    /// After any error (breaking the belt line). We will enter/place the next belt we see.
    ErrorRecovery,
}

/// The shape of the furthermost stop end of the current belt line, after factoring in direction.
#[derive(Debug, Clone)]
enum DragEndShape {
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

impl DragState {
    pub fn initial_state(successful_placement: bool) -> Self {
        if successful_placement {
            DragState::OverBelt
        } else {
            DragState::ErrorRecovery
        }
    }

    pub(super) fn step(&self, view: &SmartBeltWorldView) -> DragStepResult {
        print_debug_info(view);
        let Some(drag_end) = self.get_drag_end(view.last_position, view.ray_sense, &view.ray)
        else {
            debug!("Do nothing");
            return DragStepResult(Action::None, self.clone(), None);
        };
        debug!("drag_end: {drag_end:?}");
        let next_tile = TileClassifier::new(
            view,
            drag_end.can_enter_next_tile(),
            drag_end.underground_input_pos(view.last_position),
            drag_end.is_error_state(),
        )
        .classify_next_tile();
        debug!("Tile type: {:?}", next_tile);
        match next_tile {
            TileType::Usable => drag_end.place_belt_or_underground(view),
            TileType::IntegratedSplitter => DragStepResult(
                Action::IntegrateSplitter,
                DragState::OverSplitter,
                drag_end.error_on_impassable_exit(view),
            ),
            TileType::IntegratedUnderground { output_pos } => {
                drag_end.integrate_underground_pair(view, output_pos)
            }
            TileType::Obstacle => drag_end.handle_obstacle(view),
            TileType::ImpassableObstacle => drag_end.handle_impassable_obstacle(view),
        }
    }
}

impl DragState {
    /// Resolve the belt end shape, after taking into account the direction.
    /// If this returns None, that means that we should do nothing!
    fn get_drag_end(
        &self,
        last_position: i32,
        ray_sense: RaySense,
        ray: &Ray,
    ) -> Option<DragEndShape> {
        match *self {
            DragState::OverBelt => Some(DragEndShape::Belt),
            DragState::OverSplitter => Some(DragEndShape::IntegratedOutput),
            DragState::OverImpassable { ray_sense } => {
                Some(DragEndShape::OverImpassableObstacle { ray_sense })
            }
            DragState::ErrorRecovery => Some(DragEndShape::Error),
            DragState::BuildingUnderground {
                input_pos,
                output_pos,
                ray_sense: last_sense,
            } => {
                if ray_sense != last_sense {
                    if output_pos.is_some() {
                        (last_position == input_pos).then_some(DragEndShape::IntegratedOutput)
                    } else {
                        let next_position = last_position
                            + ray.direction.axis_sign() * ray_sense.direction_multiplier();

                        (next_position == input_pos).then_some(DragEndShape::Belt)
                    }
                } else if output_pos == Some(last_position) {
                    Some(DragEndShape::ExtendableUnderground { input_pos })
                } else {
                    Some(DragEndShape::TraversingObstacle {
                        input_pos,
                        output_pos,
                    })
                }
            }
            DragState::PassThrough { near_pos, far_pos } => {
                if match ray_sense {
                    RaySense::Forward => ray.is_before(last_position, far_pos),
                    RaySense::Backward => ray.is_before(near_pos, last_position),
                } {
                    None
                } else {
                    Some(DragEndShape::IntegratedOutput)
                }
            }
        }
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
            DragStepResult(Action::PlaceBelt, DragState::OverBelt, Some(err))
        } else {
            match *self {
                DragEndShape::TraversingObstacle {
                    input_pos,
                    output_pos,
                } => Self::place_underground(view, input_pos, output_pos),
                // For anything else, place a belt
                _ => DragStepResult(Action::PlaceBelt, DragState::OverBelt, None),
            }
        }
    }

    fn place_underground(
        view: &SmartBeltWorldView,
        input_pos: i32,
        last_output_pos: Option<i32>,
    ) -> DragStepResult {
        let next_position = view.next_position();
        let is_extension = last_output_pos.is_some();
        if let Err(error) = can_build_underground(view, input_pos, is_extension) {
            DragStepResult(Action::PlaceBelt, DragState::OverBelt, Some(error))
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
            DragStepResult(
                action,
                DragState::BuildingUnderground {
                    input_pos,
                    ray_sense: view.ray_sense,
                    output_pos: Some(next_position),
                },
                None,
            )
        }
    }

    fn integrate_underground_pair(
        &self,
        view: &SmartBeltWorldView,
        output_pos: i32,
    ) -> DragStepResult {
        let input_pos = view.next_position();
        let (near_pos, far_pos) = view.ray_sense.swap_if_backwards(input_pos, output_pos);
        let next_state = if output_pos == view.furthest_placement_pos {
            DragState::BuildingUnderground {
                input_pos,
                output_pos: Some(output_pos),
                ray_sense: view.ray_sense,
            }
        } else {
            DragState::PassThrough { near_pos, far_pos }
        };
        let err = self.error_on_impassable_exit(view);
        DragStepResult(Action::IntegrateUndergroundPair, next_state, err)
    }

    fn handle_obstacle(&self, view: &SmartBeltWorldView) -> DragStepResult {
        let new_state = match *self {
            DragEndShape::Belt => DragState::BuildingUnderground {
                input_pos: view.last_position,
                ray_sense: view.ray_sense,
                output_pos: None,
            },
            DragEndShape::ExtendableUnderground { input_pos } => DragState::BuildingUnderground {
                input_pos,
                ray_sense: view.ray_sense,
                output_pos: Some(view.last_position),
            },
            DragEndShape::TraversingObstacle {
                input_pos,
                output_pos,
            } => DragState::BuildingUnderground {
                input_pos,
                ray_sense: view.ray_sense,
                output_pos,
            },
            DragEndShape::Error | DragEndShape::IntegratedOutput => DragState::ErrorRecovery,
            DragEndShape::OverImpassableObstacle { ray_sense } => {
                DragState::OverImpassable { ray_sense }
            }
        };
        let error = match *self {
            DragEndShape::IntegratedOutput => Some(Error::EntityInTheWay),
            _ => None,
        };
        DragStepResult(Action::None, new_state, error)
    }

    fn handle_impassable_obstacle(&self, view: &SmartBeltWorldView) -> DragStepResult {
        let ray_sense = match *self {
            DragEndShape::OverImpassableObstacle { ray_sense } => ray_sense,
            _ => view.ray_sense,
        };
        DragStepResult(Action::None, DragState::OverImpassable { ray_sense }, None)
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

fn print_debug_info(view: &SmartBeltWorldView) {
    let pos = view.next_position();
    let world_pos = view.ray.get_position(pos);
    debug!("STEP: {:?}, pos: {:?}", view.ray_sense, world_pos);
    let next_entity = view.world.get(world_pos);
    debug!("Entity: {next_entity:?}");
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
    is_extension: bool,
) -> Result<(), Error> {
    let output_pos = view.next_position();
    let check_from_pos = if is_extension {
        view.last_position
    } else {
        input_pos
    };

    check_underground_path(view, input_pos, output_pos, check_from_pos)
}

/// Checks if an existing underground can be upgraded/integrated.
pub(super) fn can_upgrade_underground(view: &SmartBeltWorldView, output_pos: i32) -> bool {
    let input_pos = view.next_position();

    check_underground_path(view, input_pos, output_pos, input_pos).is_ok()
}
