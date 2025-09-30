use crate::smart_belt::{
    DragState, DragStepResult, DragWorldView, LineDrag, TileClassifier, TileType,
    action::{Action, Error},
};

/// FP style implementation of DragState
#[derive(Debug, Clone)]
#[non_exhaustive]
pub enum DragStateImpl {
    Normal(NormalState),
    PassThrough { output_pos: i32 },
}

#[derive(Debug, Clone)]
#[non_exhaustive]
pub enum NormalState {
    BeltPlaced,
    ErrorState { over_impassable: bool },
    Traversing { input_pos: i32 },
    OutputUgPlaced { input_pos: i32 },
    TraversingAfterOutput { input_pos: i32, output_pos: i32 },
    IntegratedOutput,
}

impl From<NormalState> for DragStateImpl {
    fn from(val: NormalState) -> Self {
        DragStateImpl::Normal(val)
    }
}

impl NormalState {
    fn can_enter_next_tile(&self) -> bool {
        match self {
            NormalState::Traversing { .. } | NormalState::TraversingAfterOutput { .. } => false,
            NormalState::BeltPlaced
            | NormalState::OutputUgPlaced { .. }
            | NormalState::IntegratedOutput
            | NormalState::ErrorState { .. } => true,
        }
    }
    fn underground_input_pos(&self, last_position: i32) -> Option<i32> {
        match *self {
            NormalState::BeltPlaced => Some(last_position),
            NormalState::Traversing { input_pos, .. }
            | NormalState::OutputUgPlaced { input_pos, .. }
            | NormalState::TraversingAfterOutput { input_pos, .. } => Some(input_pos),
            _ => None,
        }
    }

    fn normal_state_step(
        &self,
        ctx: &LineDrag<DragStateImpl>,
        is_forward: bool,
    ) -> DragStepResult<DragStateImpl> {
        let next_tile = TileClassifier::new(
            DragWorldView::new(ctx.world, ctx.ray, ctx.tile_history.as_ref(), is_forward),
            ctx.tier,
            self.can_enter_next_tile(),
            self.underground_input_pos(ctx.last_position),
            ctx.last_position,
        )
        .classify_next_tile();
        eprintln!("Tile type: {:?}", next_tile);
        match next_tile {
            TileType::Usable => self.place_belt_or_underground(ctx, is_forward),
            TileType::Obstacle => self.handle_obstacle(ctx),
            TileType::IntegratedSplitter => DragStepResult(
                Action::IntegrateSplitter,
                None,
                NormalState::IntegratedOutput.into(),
            ),
            TileType::ImpassableObstacle => self.handle_impassable_obstacle(),
            TileType::IntegratedUnderground { output_pos } => {
                integrate_underground_pair(ctx, is_forward, output_pos)
            }
        }
    }

    fn place_belt_or_underground(
        &self,
        ctx: &LineDrag<DragStateImpl>,
        is_forward: bool,
    ) -> DragStepResult<DragStateImpl> {
        match self {
            NormalState::BeltPlaced
            | NormalState::OutputUgPlaced { .. }
            | NormalState::ErrorState { .. }
            | NormalState::IntegratedOutput => {
                DragStepResult(Action::PlaceBelt, None, NormalState::BeltPlaced.into())
            }
            &NormalState::Traversing { input_pos, .. } => {
                if let Err(error) = ctx.can_build_underground(input_pos, is_forward, false) {
                    DragStepResult(
                        Action::PlaceBelt,
                        Some(error),
                        NormalState::BeltPlaced.into(),
                    )
                } else {
                    DragStepResult(
                        Action::CreateUnderground {
                            input_pos,
                            output_pos: ctx.next_position(is_forward),
                        },
                        None,
                        NormalState::OutputUgPlaced { input_pos }.into(),
                    )
                }
            }
            &NormalState::TraversingAfterOutput {
                input_pos,
                output_pos,
            } => {
                if let Err(error) = ctx.can_build_underground(input_pos, is_forward, true) {
                    DragStepResult(
                        Action::PlaceBelt,
                        Some(error),
                        NormalState::BeltPlaced.into(),
                    )
                } else {
                    DragStepResult(
                        Action::ExtendUnderground {
                            previous_output_pos: output_pos,
                            new_output_pos: ctx.next_position(is_forward),
                        },
                        None,
                        NormalState::OutputUgPlaced { input_pos }.into(),
                    )
                }
            }
        }
    }

    fn handle_obstacle(&self, ctx: &LineDrag<DragStateImpl>) -> DragStepResult<DragStateImpl> {
        let new_state = match self {
            NormalState::BeltPlaced => NormalState::Traversing {
                input_pos: ctx.last_position,
            },
            NormalState::Traversing { .. } | NormalState::TraversingAfterOutput { .. } => {
                self.clone()
            }
            NormalState::ErrorState { .. } => NormalState::ErrorState {
                over_impassable: false,
            },
            &NormalState::OutputUgPlaced {
                input_pos: entrance_position,
            } => NormalState::TraversingAfterOutput {
                input_pos: entrance_position,
                output_pos: ctx.last_position,
            },

            NormalState::IntegratedOutput => {
                return DragStepResult(
                    Action::None,
                    Some(Error::EntityInTheWay),
                    NormalState::ErrorState {
                        over_impassable: false,
                    }
                    .into(),
                );
            }
        };
        DragStepResult(Action::None, None, new_state.into())
    }

    fn handle_impassable_obstacle(&self) -> DragStepResult<DragStateImpl> {
        let next_state = match self {
            NormalState::ErrorState { .. } => NormalState::ErrorState {
                over_impassable: false,
            },
            _ => NormalState::ErrorState {
                over_impassable: true,
            },
        };
        DragStepResult(Action::None, None, next_state.into())
    }
}

fn pass_through_step(
    ctx: &LineDrag<DragStateImpl>,
    is_forward: bool,
    output_pos: i32,
    current_state: &DragStateImpl,
) -> DragStepResult<DragStateImpl> {
    let next_state = if ctx.next_position(is_forward) == output_pos {
        NormalState::IntegratedOutput.into()
    } else {
        current_state.clone()
    };
    DragStepResult(Action::None, None, next_state)
}

fn integrate_underground_pair(
    ctx: &LineDrag<DragStateImpl>,
    is_forward: bool,
    output_pos: i32,
) -> DragStepResult<DragStateImpl> {
    let can_upgrade = ctx.can_upgrade_underground(is_forward, output_pos);
    let action = Action::IntegrateUndergroundPair {
        do_upgrade: can_upgrade,
    };
    let error = if !can_upgrade {
        Some(Error::CannotUpgradeUnderground)
    } else {
        None
    };
    DragStepResult(action, error, DragStateImpl::PassThrough { output_pos })
}

impl DragState for DragStateImpl {
    fn initial_state(successful_placement: bool) -> Self {
        if successful_placement {
            NormalState::BeltPlaced.into()
        } else {
            NormalState::ErrorState {
                over_impassable: false,
            }
            .into()
        }
    }

    fn step(
        &self,
        ctx: &LineDrag<DragStateImpl>,
        is_forward: bool,
    ) -> DragStepResult<DragStateImpl> {
        {
            let pos = ctx.next_position(is_forward);
            let world_pos = ctx.ray.get_position(pos);
            eprintln!("STEP: forward: {}, pos: {:?}", is_forward, world_pos);
            let next_entity = ctx.world.get(world_pos);
            eprintln!("Entity: {next_entity:?}");
        }
        match self {
            DragStateImpl::Normal(state) => state.normal_state_step(ctx, is_forward),
            &DragStateImpl::PassThrough { output_pos } => {
                pass_through_step(ctx, is_forward, output_pos, self)
            }
        }
    }

    fn deferred_error(&self) -> Option<Error> {
        match self {
            DragStateImpl::Normal(NormalState::ErrorState {
                over_impassable: true,
            }) => Some(Error::CannotTraversePastEntity),
            _ => None,
        }
    }
}
