use crate::smart_belt::{
    DragState, DragStepResult, DragWorldView, LineDrag, TileClassifier, TileType,
    action::{Action, Error},
    drag::DragDirection,
};

/// FP style implementation of DragState
#[derive(Debug, Clone)]
#[non_exhaustive]
pub enum DragStateImpl {
    Normal(NormalState),
    PassThrough { input_pos: i32, output_pos: i32 },
}

#[derive(Debug, Clone)]
#[non_exhaustive]
pub enum NormalState {
    OverBelt {
        can_replace: bool,
    },
    ErrorState {
        over_impassable: bool,
    },
    Traversing {
        input_pos: i32,
        direction: DragDirection,
    },
    UgPlaced {
        input_pos: i32,
        output_pos: i32,
    },
}

impl From<NormalState> for DragStateImpl {
    fn from(val: NormalState) -> Self {
        DragStateImpl::Normal(val)
    }
}

impl NormalState {
    fn can_enter_next_tile(&self, last_position: i32) -> bool {
        match self {
            NormalState::Traversing { .. } => false,
            &NormalState::UgPlaced { output_pos, .. } => output_pos == last_position,
            NormalState::OverBelt { .. } | NormalState::ErrorState { .. } => true,
        }
    }
    fn underground_input_pos(&self, last_position: i32) -> Option<i32> {
        match *self {
            NormalState::OverBelt { can_replace: true } => Some(last_position),
            NormalState::Traversing { input_pos, .. } | NormalState::UgPlaced { input_pos, .. } => {
                Some(input_pos)
            }
            _ => None,
        }
    }

    fn normal_state_step(
        &self,
        ctx: &LineDrag<DragStateImpl>,
        direction: DragDirection,
    ) -> DragStepResult<DragStateImpl> {
        let next_tile = TileClassifier::new(
            DragWorldView::new(ctx.world, ctx.ray, ctx.tile_history.as_ref(), direction),
            ctx.tier,
            self.can_enter_next_tile(ctx.last_position),
            self.underground_input_pos(ctx.last_position),
            ctx.last_position,
        )
        .classify_next_tile();
        eprintln!("Tile type: {:?}", next_tile);
        match next_tile {
            TileType::Usable => self.place_belt_or_underground(ctx, direction),
            TileType::Obstacle => self.handle_obstacle(ctx, direction),
            TileType::IntegratedSplitter => DragStepResult(
                Action::IntegrateSplitter,
                None,
                NormalState::OverBelt { can_replace: false }.into(),
            ),
            TileType::ImpassableObstacle => self.handle_impassable_obstacle(),
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
        match self {
            NormalState::OverBelt { .. } | NormalState::ErrorState { .. } => DragStepResult(
                Action::PlaceBelt,
                None,
                NormalState::OverBelt { can_replace: true }.into(),
            ),
            &NormalState::UgPlaced { output_pos, .. } if output_pos == ctx.last_position => {
                DragStepResult(
                    Action::PlaceBelt,
                    None,
                    NormalState::OverBelt { can_replace: true }.into(),
                )
            }
            &NormalState::Traversing {
                input_pos,
                direction: traversing_direction,
            } => {
                if let Err(error) =
                    ctx.can_build_underground(input_pos, traversing_direction, false)
                {
                    DragStepResult(
                        Action::PlaceBelt,
                        Some(error),
                        NormalState::OverBelt { can_replace: true }.into(),
                    )
                } else {
                    DragStepResult(
                        Action::CreateUnderground {
                            input_pos,
                            output_pos: ctx.next_position(direction),
                        },
                        None,
                        NormalState::UgPlaced {
                            input_pos,
                            output_pos: ctx.next_position(direction),
                        }
                        .into(),
                    )
                }
            }
            &NormalState::UgPlaced {
                input_pos,
                output_pos,
            } => {
                if let Err(error) = ctx.can_build_underground(input_pos, direction, true) {
                    DragStepResult(
                        Action::PlaceBelt,
                        Some(error),
                        NormalState::OverBelt { can_replace: true }.into(),
                    )
                } else {
                    DragStepResult(
                        Action::ExtendUnderground {
                            previous_output_pos: output_pos,
                            new_output_pos: ctx.next_position(direction),
                        },
                        None,
                        NormalState::UgPlaced {
                            input_pos,
                            output_pos: ctx.next_position(direction),
                        }
                        .into(),
                    )
                }
            }
        }
    }

    fn handle_obstacle(
        &self,
        ctx: &LineDrag<DragStateImpl>,
        direction: DragDirection,
    ) -> DragStepResult<DragStateImpl> {
        let new_state = match self {
            NormalState::OverBelt { can_replace: true } => NormalState::Traversing {
                input_pos: ctx.last_position,
                direction,
            },
            NormalState::Traversing { .. } | NormalState::UgPlaced { .. } => self.clone(),
            NormalState::ErrorState { .. } => NormalState::ErrorState {
                over_impassable: false,
            },

            NormalState::OverBelt { can_replace: false } => {
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
    direction: DragDirection,
    _input_pos: i32,
    output_pos: i32,
    current_state: &DragStateImpl,
) -> DragStepResult<DragStateImpl> {
    let next_state = if ctx.next_position(direction) == output_pos {
        NormalState::OverBelt { can_replace: false }.into()
    } else {
        current_state.clone()
    };
    DragStepResult(Action::None, None, next_state)
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
    DragStepResult(
        action,
        error,
        DragStateImpl::PassThrough {
            input_pos: ctx.next_position(direction),
            output_pos,
        },
    )
}

impl DragState for DragStateImpl {
    fn initial_state(successful_placement: bool) -> Self {
        if successful_placement {
            NormalState::OverBelt { can_replace: true }.into()
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
        direction: DragDirection,
    ) -> DragStepResult<DragStateImpl> {
        {
            let pos = ctx.next_position(direction);
            let world_pos = ctx.ray.get_position(pos);
            eprintln!("STEP: forward: {:?}, pos: {:?}", direction, world_pos);
            let next_entity = ctx.world.get(world_pos);
            eprintln!("Entity: {next_entity:?}");
        }
        match self {
            DragStateImpl::Normal(state) => state.normal_state_step(ctx, direction),
            &DragStateImpl::PassThrough {
                input_pos,
                output_pos,
            } => pass_through_step(ctx, direction, input_pos, output_pos, self),
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
