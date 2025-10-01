use crate::smart_belt::{
    DragState, DragStepResult, DragWorldView, LineDrag, TileClassifier, TileType,
    action::{Action, Error},
    drag::DragDirection,
};

#[derive(Debug, Clone)]
#[non_exhaustive]
pub enum DragStateImpl {
    OverBelt,
    OverSplitter,
    OverImpassable {
        direction: DragDirection,
    },
    ErrorRecovery,
    BuildingUnderground {
        input_pos: i32,
        output_pos: Option<i32>,
        direction: DragDirection,
    },
    PassThrough {
        // input_pos < right_pos, always, no matter the direction
        left_pos: i32,
        right_pos: i32,
    },
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
        Self::print_debug_info(ctx, direction);
        if self.should_do_nothing(ctx, direction) {
            eprintln!("Do nothing");
            DragStepResult(Action::None, None, self.clone())
        } else {
            self.normal_step(ctx, direction)
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

impl DragStateImpl {
    fn print_debug_info(ctx: &LineDrag<DragStateImpl>, direction: DragDirection) {
        let pos = ctx.next_position(direction);
        let world_pos = ctx.ray.get_position(pos);
        eprintln!("STEP: {:?}, pos: {:?}", direction, world_pos);
        let next_entity = ctx.world.get(world_pos);
        eprintln!("Entity: {next_entity:?}");
    }

    fn can_enter_next_tile(&self, last_position: i32, direction: DragDirection) -> bool {
        !matches!(*self, DragStateImpl::BuildingUnderground { output_pos, direction: last_dir, .. }
            if direction == last_dir && output_pos != Some(last_position)
        )
    }
    fn underground_input_pos(&self, last_position: i32, direction: DragDirection) -> Option<i32> {
        match *self {
            DragStateImpl::OverBelt => Some(last_position),
            DragStateImpl::BuildingUnderground {
                input_pos,
                output_pos,
                direction: last_dir,
            } if direction == last_dir || output_pos.is_none() => Some(input_pos),
            _ => None,
        }
    }
    fn normal_step(
        &self,
        ctx: &LineDrag<DragStateImpl>,
        direction: DragDirection,
    ) -> DragStepResult<DragStateImpl> {
        let can_enter = self.can_enter_next_tile(ctx.last_position, direction);
        let underground_input = self.underground_input_pos(ctx.last_position, direction);
        eprintln!("can_enter: {can_enter}, underground_input: {underground_input:?}");
        let next_tile = TileClassifier::new(
            DragWorldView::new(ctx.world, ctx.ray, ctx.tile_history, direction),
            ctx.tier,
            can_enter,
            underground_input,
            ctx.last_position,
        )
        .classify_next_tile();
        eprintln!("Tile type: {:?}", next_tile);
        match next_tile {
            TileType::Usable => self.place_belt_or_underground(ctx, direction),
            TileType::Obstacle => self.handle_obstacle(ctx, direction),
            TileType::IntegratedSplitter => {
                DragStepResult(Action::IntegrateSplitter, None, DragStateImpl::OverSplitter)
            }
            TileType::ImpassableObstacle => self.handle_impassable_obstacle(direction),
            TileType::IntegratedUnderground { output_pos } => {
                integrate_underground_pair(ctx, direction, output_pos)
            }
        }
    }

    fn place_belt_or_underground(
        &self,
        ctx: &LineDrag<DragStateImpl>,
        direction: DragDirection,
    ) -> DragStepResult<DragStateImpl> {
        match *self {
            DragStateImpl::BuildingUnderground {
                input_pos,
                direction: last_dir,
                output_pos,
            } if direction == last_dir && output_pos != Some(ctx.last_position) => {
                place_underground(ctx, direction, input_pos, output_pos)
            }
            _ => DragStepResult(Action::PlaceBelt, None, DragStateImpl::OverBelt),
        }
    }

    fn handle_obstacle(
        &self,
        ctx: &LineDrag<DragStateImpl>,
        direction: DragDirection,
    ) -> DragStepResult<DragStateImpl> {
        let (error, new_state) = match *self {
            DragStateImpl::OverBelt => (
                None,
                DragStateImpl::BuildingUnderground {
                    input_pos: ctx.last_position,
                    direction,
                    output_pos: None,
                },
            ),
            DragStateImpl::BuildingUnderground {
                direction: last_dir,
                output_pos,
                ..
            } if direction == last_dir || output_pos.is_none() => (None, self.clone()),
            DragStateImpl::ErrorRecovery | DragStateImpl::OverImpassable { .. } => {
                (None, DragStateImpl::ErrorRecovery)
            }
            DragStateImpl::OverSplitter
            | DragStateImpl::PassThrough { .. }
            | DragStateImpl::BuildingUnderground { .. } => {
                (Some(Error::EntityInTheWay), DragStateImpl::ErrorRecovery)
            }
        };
        DragStepResult(Action::None, error, new_state)
    }

    fn handle_impassable_obstacle(
        &self,
        direction: DragDirection,
    ) -> DragStepResult<DragStateImpl> {
        let next_state = match self {
            DragStateImpl::ErrorRecovery | DragStateImpl::OverImpassable { .. } => {
                DragStateImpl::ErrorRecovery
            }
            _ => DragStateImpl::OverImpassable { direction },
        };
        DragStepResult(Action::None, None, next_state)
    }

    fn should_do_nothing(&self, ctx: &LineDrag<DragStateImpl>, direction: DragDirection) -> bool {
        let next_position = ctx.next_position(direction);
        match *self {
            DragStateImpl::PassThrough {
                left_pos: input_pos,
                right_pos: output_pos,
            } => match direction {
                DragDirection::Forward => ctx.last_position < output_pos,
                DragDirection::Backward => ctx.last_position > input_pos,
            },
            DragStateImpl::BuildingUnderground {
                input_pos,
                direction: last_dir,
                ..
            } => direction != last_dir && next_position > input_pos,
            _ => false,
        }
    }
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
        let action = if let Some(previous_output_pos) = last_output_pos {
            Action::ExtendUnderground {
                previous_output_pos,
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
