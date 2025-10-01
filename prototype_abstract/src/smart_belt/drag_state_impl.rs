use crate::smart_belt::{
    DragState, DragStepResult, LineDrag, TileClassifier, TileType,
    action::{Action, Error},
    drag::DragDirection,
};

/// The state of the drag we store. Needs to work in both directions.
#[derive(Debug, Clone)]
pub enum DragStateImpl {
    /// We were hovering over a belt.
    OverBelt,
    /// We were hovering over a splitter.
    OverSplitter,
    /// We are or have passed over an obstacle, extending in the given direction.
    /// output_pos is given if we've already placed an underground.
    BuildingUnderground {
        input_pos: i32,
        output_pos: Option<i32>,
        direction: DragDirection,
    },
    /// An underground belt we will integrate (and not extend).
    PassThrough {
        // input_pos < right_pos, always, no matter the direction
        left_pos: i32,
        right_pos: i32,
    },
    /// We are hovering over an impassable obstacle, if we continue in the given direction.
    OverImpassable { direction: DragDirection },
    /// After error (breaking the belt line). We will enter the next belt we see.
    ErrorRecovery,
}

/// The view of the end of the belt line, after factoring in direction.
enum DragEndShape {
    /// A belt that may become an underground belt.
    Belt,
    /// A belt entity we may _not_ replace with an underground belt.
    IntegratedOutput,
    /// An output_underground, that we should extend if there's an obstacle in front.
    ExtendableUnderground { input_pos: i32 },
    /// An obstacle; the last placed belt is at input_pos behind this tile.
    /// output_pos is not none if we've created a belt already.
    TraversingObstacle {
        input_pos: i32,
        output_pos: Option<i32>,
    },
    /// Error. We will enter any belt we see.
    Error,
}

impl DragStateImpl {
    /// Resolve the belt end shape, after taking into account the direction.
    /// If returns None, that means that we should do nothing (going in-between an underground).
    fn get_drag_end(&self, last_position: i32, direction: DragDirection) -> Option<DragEndShape> {
        match *self {
            DragStateImpl::OverBelt => Some(DragEndShape::Belt),
            DragStateImpl::OverSplitter => Some(DragEndShape::IntegratedOutput),
            DragStateImpl::OverImpassable { .. } | DragStateImpl::ErrorRecovery => {
                Some(DragEndShape::Error)
            }
            DragStateImpl::BuildingUnderground {
                input_pos,
                output_pos,
                direction: last_dir,
            } => {
                if direction != last_dir {
                    // Direction doesn't match, we are "un" dragging
                    if last_position != input_pos {
                        // We haven't touched the input underground yet
                        None
                    } else if output_pos.is_none() {
                        // The input underground position is a belt
                        Some(DragEndShape::Belt)
                    } else {
                        // We placed an output belt, the input underground position is an underground
                        Some(DragEndShape::IntegratedOutput)
                    }
                } else if output_pos == Some(last_position) {
                    // We just placed an underground belt.
                    Some(DragEndShape::ExtendableUnderground { input_pos })
                } else {
                    // We placed an underground belt some time before, and are now over an obstacle.
                    Some(DragEndShape::TraversingObstacle {
                        input_pos,
                        output_pos,
                    })
                }
            }
            DragStateImpl::PassThrough {
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
}

impl DragState for DragStateImpl {
    fn initial_state(successful_placement: bool) -> Self {
        if successful_placement {
            DragStateImpl::OverBelt
        } else {
            DragStateImpl::ErrorRecovery
        }
    }

    fn step(
        &self,
        ctx: &LineDrag<DragStateImpl>,
        direction: DragDirection,
    ) -> DragStepResult<DragStateImpl> {
        print_debug_info(ctx, direction);
        let Some(belt_shape) = self.get_drag_end(ctx.last_position, direction) else {
            eprintln!("Do nothing");
            return DragStepResult(Action::None, None, self.clone());
        };
        let next_tile = TileClassifier::new(
            ctx.drag_world_view(direction),
            ctx.last_position,
            belt_shape.can_enter_next_tile(),
            belt_shape.underground_input_pos(ctx.last_position),
            ctx.tier,
        )
        .classify_next_tile();
        eprintln!("Tile type: {:?}", next_tile);
        match next_tile {
            TileType::Usable => belt_shape.place_belt_or_underground(ctx, direction),
            TileType::Obstacle => belt_shape.handle_obstacle(ctx, direction),
            TileType::IntegratedSplitter => {
                DragStepResult(Action::IntegrateSplitter, None, DragStateImpl::OverSplitter)
            }
            TileType::ImpassableObstacle => belt_shape.handle_impassable_obstacle(direction),
            TileType::IntegratedUnderground { output_pos } => {
                integrate_underground_pair(ctx, direction, output_pos)
            }
        }
    }

    fn deferred_error(&self, direction: DragDirection) -> Option<Error> {
        match *self {
            DragStateImpl::OverImpassable {
                direction: last_dir,
            } if last_dir == direction => Some(Error::CannotTraversePastEntity),
            _ => None,
        }
    }
}

impl DragEndShape {
    fn place_belt_or_underground(
        &self,
        ctx: &LineDrag<DragStateImpl>,
        direction: DragDirection,
    ) -> DragStepResult<DragStateImpl> {
        match *self {
            DragEndShape::TraversingObstacle {
                input_pos,
                output_pos,
            } => place_underground(ctx, direction, input_pos, output_pos),
            _ => DragStepResult(Action::PlaceBelt, None, DragStateImpl::OverBelt),
        }
    }

    fn handle_obstacle(
        &self,
        ctx: &LineDrag<DragStateImpl>,
        direction: DragDirection,
    ) -> DragStepResult<DragStateImpl> {
        let new_state = match *self {
            DragEndShape::Belt => DragStateImpl::BuildingUnderground {
                input_pos: ctx.last_position,
                direction,
                output_pos: None,
            },
            DragEndShape::ExtendableUnderground { input_pos } => {
                DragStateImpl::BuildingUnderground {
                    input_pos,
                    direction,
                    output_pos: Some(ctx.last_position),
                }
            }
            DragEndShape::TraversingObstacle {
                input_pos,
                output_pos,
            } => DragStateImpl::BuildingUnderground {
                input_pos,
                direction,
                output_pos,
            },
            DragEndShape::Error | DragEndShape::IntegratedOutput => DragStateImpl::ErrorRecovery,
        };
        let error = match *self {
            DragEndShape::IntegratedOutput => Some(Error::EntityInTheWay),
            _ => None,
        };
        DragStepResult(Action::None, error, new_state)
    }

    fn handle_impassable_obstacle(
        &self,
        direction: DragDirection,
    ) -> DragStepResult<DragStateImpl> {
        let next_state = match *self {
            DragEndShape::Error => DragStateImpl::ErrorRecovery,
            _ => DragStateImpl::OverImpassable { direction },
        };
        DragStepResult(Action::None, None, next_state)
    }
}

fn print_debug_info(ctx: &LineDrag<DragStateImpl>, direction: DragDirection) {
    let pos = ctx.next_position(direction);
    let world_pos = ctx.ray.get_position(pos);
    eprintln!("STEP: {:?}, pos: {:?}", direction, world_pos);
    let next_entity = ctx.world.get(world_pos);
    eprintln!("Entity: {next_entity:?}");
}

fn place_underground(
    ctx: &LineDrag<'_>,
    direction: DragDirection,
    input_pos: i32,
    last_output_pos: Option<i32>,
) -> DragStepResult<DragStateImpl> {
    let next_position = ctx.next_position(direction);
    let is_extension = last_output_pos.is_some();
    if let Err(error) = ctx.can_build_underground(input_pos, direction, is_extension) {
        DragStepResult(Action::PlaceBelt, Some(error), DragStateImpl::OverBelt)
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
            None,
            DragStateImpl::BuildingUnderground {
                input_pos,
                direction,
                output_pos: Some(next_position),
            },
        )
    }
}

fn integrate_underground_pair(
    ctx: &LineDrag<DragStateImpl>,
    direction: DragDirection,
    output_pos: i32,
) -> DragStepResult<DragStateImpl> {
    let can_upgrade = ctx.can_upgrade_underground(direction, output_pos);
    let action = Action::IntegrateUndergroundPair {
        do_upgrade: can_upgrade,
    };
    // This error can maybe be moved to the action itself
    let error = if !can_upgrade {
        Some(Error::CannotUpgradeUnderground)
    } else {
        None
    };
    let (input_pos, output_pos) =
        direction.swap_if_backwards(ctx.next_position(direction), output_pos);
    DragStepResult(
        action,
        error,
        DragStateImpl::PassThrough {
            left_pos: input_pos,
            right_pos: output_pos,
        },
    )
}
