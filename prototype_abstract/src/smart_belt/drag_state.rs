use crate::ImpassableTile;
use crate::smart_belt::drag::DragStepResult;
use log::debug;

use super::{Action, DragDirection, TileClassifier, TileType, action::Error};

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
        direction: DragDirection,
    },
    /// An underground belt we will integrate (and not extend); just "passing-through" it.
    PassThrough {
        // input_pos < right_pos, always, no matter the direction
        left_pos: i32,
        right_pos: i32,
    },
    /// We are hovering over or have hovered over an impassable obstacle. Will error if we continue in the given direction.
    OverImpassable { direction: DragDirection },
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
    OverImpassableObstacle { direction: DragDirection },
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

    pub fn step(&self, ctx: &super::DragContext) -> DragStepResult {
        print_debug_info(ctx);
        let Some(drag_end) = self.get_drag_end(ctx.last_position, ctx.direction) else {
            debug!("Do nothing");
            return DragStepResult(Action::None, self.clone(), None);
        };
        debug!("drag_end: {drag_end:?}");
        let next_tile = TileClassifier::new(
            ctx,
            drag_end.can_enter_next_tile(),
            drag_end.underground_input_pos(ctx.last_position),
            drag_end.is_error_state(),
        )
        .classify_next_tile();
        debug!("Tile type: {:?}", next_tile);
        match next_tile {
            TileType::Usable => drag_end.place_belt_or_underground(ctx),
            TileType::IntegratedSplitter => DragStepResult(
                Action::IntegrateSplitter,
                DragState::OverSplitter,
                drag_end.error_on_impassable_exit(ctx),
            ),
            TileType::IntegratedUnderground { output_pos } => {
                drag_end.integrate_underground_pair(ctx, output_pos)
            }
            TileType::Obstacle => drag_end.handle_obstacle(ctx),
            TileType::ImpassableObstacle => drag_end.handle_impassable_obstacle(ctx),
        }
    }

    /// Resolve the belt end shape, after taking into account the direction.
    /// If this returns None, that means that we should do nothing!
    fn get_drag_end(&self, last_position: i32, direction: DragDirection) -> Option<DragEndShape> {
        match *self {
            DragState::OverBelt => Some(DragEndShape::Belt),
            DragState::OverSplitter => Some(DragEndShape::IntegratedOutput),
            DragState::OverImpassable { direction } => {
                Some(DragEndShape::OverImpassableObstacle { direction })
            }
            DragState::ErrorRecovery => Some(DragEndShape::Error),
            DragState::BuildingUnderground {
                input_pos,
                output_pos,
                direction: last_dir,
            } => {
                if direction != last_dir {
                    // Direction doesn't match, we are "un" dragging (hovering backwards over tiles we already passed)
                    if output_pos.is_some() {
                        // The input underground position is a underground. Check if we are on that input underground.
                        (last_position == input_pos).then_some(DragEndShape::IntegratedOutput)
                    } else {
                        // The input underground position is a belt; check if we are overlapping it
                        let next_position = last_position + direction.direction_multiplier();
                        (next_position == input_pos).then_some(DragEndShape::Belt)
                    }
                } else if output_pos == Some(last_position) {
                    // We just placed an underground belt.
                    Some(DragEndShape::ExtendableUnderground { input_pos })
                } else {
                    // We either have not placed an output underground belt, or
                    // have placed it earlier, and are now hovering over an
                    // obstacle.
                    Some(DragEndShape::TraversingObstacle {
                        input_pos,
                        output_pos,
                    })
                }
            }
            DragState::PassThrough {
                left_pos,
                right_pos,
            } => {
                // If we are in-between the undergrounds, do nothing
                // If we are at an underground end, it's an integrated output.
                if match direction {
                    DragDirection::Forward => last_position < right_pos,
                    DragDirection::Backward => last_position > left_pos,
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

    fn place_belt_or_underground(&self, ctx: &super::DragContext) -> DragStepResult {
        if let Some(err) = self.error_on_impassable_exit(ctx) {
            DragStepResult(Action::PlaceBelt, DragState::OverBelt, Some(err))
        } else {
            match *self {
                DragEndShape::TraversingObstacle {
                    input_pos,
                    output_pos,
                } => Self::place_underground(ctx, input_pos, output_pos),
                // For anything else, place a belt
                _ => DragStepResult(Action::PlaceBelt, DragState::OverBelt, None),
            }
        }
    }

    fn place_underground(
        ctx: &super::DragContext,
        input_pos: i32,
        last_output_pos: Option<i32>,
    ) -> DragStepResult {
        let next_position = ctx.next_position();
        let is_extension = last_output_pos.is_some();
        if let Err(error) = can_build_underground(ctx, input_pos, is_extension) {
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
                    direction: ctx.direction,
                    output_pos: Some(next_position),
                },
                None,
            )
        }
    }

    fn integrate_underground_pair(
        &self,
        ctx: &super::DragContext,
        output_pos: i32,
    ) -> DragStepResult {
        let input_pos = ctx.next_position();
        let (left_pos, right_pos) = ctx.direction.swap_if_backwards(input_pos, output_pos);
        let next_state = if output_pos == ctx.furthest_placement_pos {
            // This is an ug we placed. Extend instead of integrate.
            DragState::BuildingUnderground {
                input_pos,
                output_pos: Some(output_pos),
                direction: ctx.direction,
            }
        } else {
            DragState::PassThrough {
                left_pos,
                right_pos,
            }
        };
        let err = self.error_on_impassable_exit(ctx);
        DragStepResult(Action::IntegrateUndergroundPair, next_state, err)
    }

    fn handle_obstacle(&self, ctx: &super::DragContext) -> DragStepResult {
        let new_state = match *self {
            DragEndShape::Belt => DragState::BuildingUnderground {
                input_pos: ctx.last_position,
                direction: ctx.direction,
                output_pos: None,
            },
            DragEndShape::ExtendableUnderground { input_pos } => DragState::BuildingUnderground {
                input_pos,
                direction: ctx.direction,
                output_pos: Some(ctx.last_position),
            },
            DragEndShape::TraversingObstacle {
                input_pos,
                output_pos,
            } => DragState::BuildingUnderground {
                input_pos,
                direction: ctx.direction,
                output_pos,
            },
            DragEndShape::Error | DragEndShape::IntegratedOutput => DragState::ErrorRecovery,
            DragEndShape::OverImpassableObstacle { direction } => {
                DragState::OverImpassable { direction }
            }
        };
        let error = match *self {
            DragEndShape::IntegratedOutput => Some(Error::EntityInTheWay),
            _ => None,
        };
        DragStepResult(Action::None, new_state, error)
    }

    fn handle_impassable_obstacle(&self, ctx: &super::DragContext) -> DragStepResult {
        let direction = match *self {
            DragEndShape::OverImpassableObstacle { direction } => direction,
            _ => ctx.direction,
        };
        DragStepResult(Action::None, DragState::OverImpassable { direction }, None)
    }

    fn error_on_impassable_exit(&self, ctx: &super::DragContext) -> Option<Error> {
        match *self {
            DragEndShape::OverImpassableObstacle { direction } if direction == ctx.direction => {
                Some(Error::CannotTraversePastEntity)
            }
            _ => None,
        }
    }
}

fn print_debug_info(ctx: &super::DragContext) {
    let pos = ctx.next_position();
    let world_pos = ctx.ray.get_position(pos);
    debug!("STEP: {:?}, pos: {:?}", ctx.direction, world_pos);
    let next_entity = ctx.world.get(world_pos);
    debug!("Entity: {next_entity:?}");
}

/// Checks if creating an underground belt connection will be valid between
/// input and output positions.
fn check_underground_path(
    ctx: &super::DragContext,
    input_pos: i32,
    output_pos: i32,
    check_from_pos: i32,
) -> Result<(), Error> {
    // 1. Check distance limit
    let distance = output_pos.abs_diff(input_pos);
    if distance > ctx.tier.underground_distance.into() {
        return Err(Error::TooFarToConnect);
    }

    // 2. Check for intercepting entities between check_from_pos and output_pos
    let (start, end) = if check_from_pos < output_pos {
        (check_from_pos + 1, output_pos - 1)
    } else {
        (output_pos + 1, check_from_pos - 1)
    };

    for pos in start..=end {
        let entity = ctx.world.get(ctx.ray.get_position(pos));
        if let Some(entity) = entity {
            // Check for impassable obstacles
            if entity.as_any().is::<ImpassableTile>() {
                return Err(Error::CannotTraversePastTile);
            }
            // Check for intercepting underground belts
            if let Some(ug) = entity.as_underground_belt()
                && ug.direction.axis() == ctx.ray.direction.axis()
                && ug.tier == ctx.tier
            {
                return Err(Error::CannotTraversePastEntity);
            }
        }
    }

    Ok(())
}

/// Checks there are no problems with building this underground.
pub(super) fn can_build_underground(
    ctx: &super::DragContext,
    input_pos: i32,
    is_extension: bool,
) -> Result<(), Error> {
    let output_pos = ctx.next_position();
    let check_from_pos = if is_extension {
        ctx.last_position
    } else {
        input_pos
    };

    check_underground_path(ctx, input_pos, output_pos, check_from_pos)
}

/// Checks if an existing underground can be upgraded/integrated.
pub(super) fn can_upgrade_underground(ctx: &super::DragContext, output_pos: i32) -> bool {
    let input_pos = ctx.next_position();

    check_underground_path(ctx, input_pos, output_pos, input_pos).is_ok()
}
