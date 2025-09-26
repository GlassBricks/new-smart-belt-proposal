use itertools::Itertools;

use super::{Action, LineDrag, TileClassifier, TileType, action::Error};

#[derive(Debug, Clone)]
#[non_exhaustive]
pub(super) enum DragState {
    Normal(NormalState),
    PassThrough { output_pos: i32 },
}

/// Most states here.
#[derive(Debug, Clone)]
#[non_exhaustive]
pub(super) enum NormalState {
    /// After placing a belt. This belt may become an underground
    BeltPlaced,
    /// We haven't placed a belt yet, and are looking for the next tile we can.
    ErrorRecovery,
    // Passing a splitter or output underground belt. This means we can't create an underground here.
    // IntegratedOutput,
    /// We hovered over an obstacle.
    Traversing {
        /// Last position we may place an underground belt.
        input_pos: i32,
    },
    /// After we have placed our _own_ output underground belt. This output underground may be moved later.
    OutputUgPlaced {
        input_pos: i32,
        // output_pos is last_pos.
    },
    /// We hovered over an obstacle after placing an output underground belt.
    TraversingAfterOutput {
        /// Last position we may place an underground belt.
        input_pos: i32,
        /// Last position we placed an underground belt.
        output_pos: i32,
    },
    /// When we are hovering over the exit of an integrated output belt.
    IntegratedOutputUnderground,
    IntegratedSplitter,
    /// We have just encountered an impassable obstacle. However, we don't error until the user tries to _pass_ the obstacle.
    OverImpassableCurvedBelt,
}

impl From<NormalState> for DragState {
    fn from(val: NormalState) -> Self {
        DragState::Normal(val)
    }
}

impl NormalState {
    pub(super) fn is_outputting_belt(&self) -> bool {
        match self {
            NormalState::BeltPlaced
            | NormalState::OutputUgPlaced { .. }
            | NormalState::IntegratedOutputUnderground
            | NormalState::IntegratedSplitter => true,
            NormalState::Traversing { .. }
            | NormalState::TraversingAfterOutput { .. }
            | NormalState::OverImpassableCurvedBelt
            | NormalState::ErrorRecovery => false,
        }
    }

    pub(super) fn is_traversing_obstacle(&self) -> bool {
        match self {
            NormalState::Traversing { .. } | NormalState::TraversingAfterOutput { .. } => true,
            NormalState::BeltPlaced
            | NormalState::OutputUgPlaced { .. }
            | NormalState::OverImpassableCurvedBelt
            | NormalState::ErrorRecovery
            | NormalState::IntegratedOutputUnderground
            | NormalState::IntegratedSplitter => false,
        }
    }
}

pub(super) struct DragStep(pub Action, pub Vec<Error>, pub DragState);

/**
 * Purely functional logic for straight line dragging.
 */
impl<'a> LineDrag<'a> {
    // fn process_pass_through(&self) -> StepResult {
    //     todo!()
    // let entity = self.world_view.get_entity_at_position(position);
    // let next_tile_type = match entity {
    //     Some(Entity::UndergroundBelt(ug))
    //         if ug.tier == tier && ug.shape_direction() == self.world_view.drag_direction() =>
    //     {
    //         TileType::IntegratedOutput
    //     }
    //     _ => TileType::PassThroughUnderground(tier),
    // };
    // StepResult {
    //     action: Action::None,
    //     next_tile_type,
    // }
    // }

    pub(super) fn normal_state_step(&self, last_state: &NormalState) -> DragStep {
        let classifier =
            TileClassifier::new(self.world_view(), self.tier, last_state, self.last_position);
        match classifier.classify_next_tile() {
            TileType::Usable => self.place_belt_or_underground(last_state),
            TileType::Obstacle => self.handle_obstacle(last_state),
            TileType::IntegratedSplitter => {
                self.normal_result(Action::IntegrateSplitter, NormalState::IntegratedSplitter)
            }
            TileType::ImpassableCurvedBelt => DragStep(
                Action::None,
                vec![],
                NormalState::OverImpassableCurvedBelt.into(),
            ),
            TileType::ImpassableUnderground => self.handle_impassable_underground(last_state),
            TileType::PassThroughUnderground {
                output_pos,
                upgrade_failure,
            } => self.integrate_underground_pair(output_pos, upgrade_failure),
            // TileType::Obstacle => {
            // if matches!(prev_state, TileType::IntegratedOutput) {
            //     Action::EntityInTheWay
            // } else if self.underground_would_be_too_long(prev_state, position + 1) {
            //     Action::TooLongToReach
            // alternative: report too long to reach the moment it becomes too long, not after passing all obstacles
            // } else {
            //     Action::None
            // }
            // }
        }
    }

    fn place_belt_or_underground(&self, last_state: &NormalState) -> DragStep {
        match last_state {
            NormalState::BeltPlaced
            | NormalState::OutputUgPlaced { .. }
            | NormalState::OverImpassableCurvedBelt
            | NormalState::ErrorRecovery
            | NormalState::IntegratedOutputUnderground
            | NormalState::IntegratedSplitter => {
                self.normal_result(Action::PlaceBelt, NormalState::BeltPlaced)
            }
            NormalState::Traversing { input_pos, .. }
            | NormalState::TraversingAfterOutput { input_pos, .. }
                if self.next_position() - input_pos > self.tier.underground_distance.into() =>
            {
                DragStep(
                    Action::PlaceBelt,
                    vec![Error::TooFarToConnect],
                    NormalState::BeltPlaced.into(),
                )
            }
            &NormalState::Traversing { input_pos, .. } => self.normal_result(
                Action::CreateUnderground {
                    input_pos,
                    output_pos: self.next_position(),
                },
                NormalState::OutputUgPlaced { input_pos },
            ),
            &NormalState::TraversingAfterOutput {
                input_pos,
                output_pos,
                ..
            } => self.normal_result(
                Action::ExtendUnderground {
                    previous_output_pos: output_pos,
                    new_output_pos: self.next_position(),
                },
                NormalState::OutputUgPlaced { input_pos },
            ),
        }
    }

    fn handle_obstacle(&self, last_state: &NormalState) -> DragStep {
        let new_state = match last_state {
            NormalState::BeltPlaced => NormalState::Traversing {
                input_pos: self.last_position,
            },
            NormalState::Traversing { .. } | NormalState::TraversingAfterOutput { .. } => {
                last_state.clone()
            }
            NormalState::ErrorRecovery => NormalState::ErrorRecovery,
            &NormalState::OutputUgPlaced {
                input_pos: entrance_position,
            } => NormalState::TraversingAfterOutput {
                input_pos: entrance_position,
                output_pos: self.last_position,
            },
            NormalState::OverImpassableCurvedBelt => NormalState::BeltPlaced,
            NormalState::IntegratedOutputUnderground | NormalState::IntegratedSplitter => {
                return DragStep(
                    Action::None,
                    vec![Error::EntityInTheWay],
                    NormalState::ErrorRecovery.into(),
                );
            }
        };
        self.normal_result(Action::None, new_state)
    }

    fn integrate_underground_pair(&self, output_pos: i32, upgrade_failure: bool) -> DragStep {
        {
            let action = Action::IntegrateUndergroundPair {
                do_upgrade: !upgrade_failure,
            };
            let mut errors = self.deferred_error().into_iter().collect_vec();
            if upgrade_failure {
                errors.push(Error::CannotUpgradeUnderground);
            }
            DragStep(action, errors, DragState::PassThrough { output_pos })
        }
    }

    fn handle_impassable_underground(&self, last_state: &NormalState) -> DragStep {
        let errors = match last_state {
            NormalState::ErrorRecovery => vec![], // if already in error recovery state, don't give new errors
            _ => vec![Error::EntityInTheWay],
        };
        DragStep(Action::None, errors, NormalState::ErrorRecovery.into())
    }

    /// Returns an result with no errors.
    /// However, if the last state has a deferred error, it will be returned here.
    fn normal_result(&self, action: Action, new_state: impl Into<DragState>) -> DragStep {
        DragStep(
            action,
            self.deferred_error().into_iter().collect(),
            new_state.into(),
        )
    }

    /// When traversing an impassable obstacle, we give an error only when you pass it.
    fn deferred_error(&self) -> Option<Error> {
        match self.last_state {
            DragState::Normal(NormalState::OverImpassableCurvedBelt) => {
                Some(Error::CurvedBeltInTheWay)
            }
            _ => None,
        }
    }
}
